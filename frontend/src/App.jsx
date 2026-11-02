import { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float } from '@react-three/drei';
import {
  Camera,
  Grid3x3,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  RotateCcw,
  Sparkles,
  Play
} from 'lucide-react';

// --- CONSTANTS & HELPERS ---
const COLORS = {
  U: '#FFFFFF', // White (Up)
  R: '#B71234', // Red (Right)
  F: '#009B48', // Green (Front)
  D: '#FFD500', // Yellow (Down)
  L: '#FF5800', // Orange (Left)
  B: '#0046AD'  // Blue (Back)
};

const SOLVED_STATE = [
  ...Array(9).fill('U'), ...Array(9).fill('R'), ...Array(9).fill('F'),
  ...Array(9).fill('D'), ...Array(9).fill('L'), ...Array(9).fill('B')
];

// 2-move scramble (U then F) -> Solution will be F' U'
const TEST_SCRAMBLE_STATE = 'UUUUUULLFUBBURRURRFFRFFRFFRRRBDDDDDDFFDLLDLLDLLLBBBBBB'.split('');

const parseSolutionString = (solutionStr) => {
  if (!solutionStr || solutionStr === 'SOLVED' || solutionStr.startsWith('ERR')) return [];
  const moves = [];
  const parts = solutionStr.trim().split(/\s+/);

  parts.forEach(part => {
    if (!part) return;
    const face = part[0];
    let axis, dir = -1;
    if (face === 'U') { axis = 'y'; }
    else if (face === 'D') { axis = 'y'; dir = 1; }
    else if (face === 'R') { axis = 'x'; }
    else if (face === 'L') { axis = 'x'; dir = 1; }
    else if (face === 'F') { axis = 'z'; }
    else if (face === 'B') { axis = 'z'; dir = 1; }
    else return; // Ignore any unrecognized tokens

    if (part.includes("'")) dir *= -1;
    let radians = (Math.PI / 2) * (part.includes("2") ? 2 : 1) * dir;
    moves.push({ face, axis, targetAngle: radians, raw: part });
  });
  return moves;
};

// --- SUB-COMPONENTS ---
function FaceGrid({ offset, cubeState, setCubeState, activeColor }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', background: '#27272a', padding: '3px', borderRadius: '6px' }}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div
          key={i}
          onClick={() => {
            const newState = [...cubeState];
            newState[offset + i] = activeColor;
            setCubeState(newState);
          }}
          title={`Facelet index ${offset + i}`}
          style={{
            width: '28px',
            height: '28px',
            backgroundColor: COLORS[cubeState[offset + i]] || '#555',
            cursor: 'pointer',
            borderRadius: '3px',
            transition: 'transform 0.1s, box-shadow 0.1s',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.35)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />
      ))}
    </div>
  );
}

function AnimatedCube({ solutionString, isPlaying, onFinish }) {
  const cubeGroup = useRef();
  const cubiesRef = useRef([]);
  const pivot = useRef(new THREE.Object3D());
  const queue = useRef([]);
  const activeMove = useRef(null);
  const currentAngle = useRef(0);

  useEffect(() => {
    if (!cubeGroup.current) return;
    cubeGroup.current.add(pivot.current);

    const materials = [
      new THREE.MeshStandardMaterial({ color: "#B71234", metalness: 0.15, roughness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: "#FF5800", metalness: 0.15, roughness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: "#FFFFFF", metalness: 0.15, roughness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: "#FFD500", metalness: 0.15, roughness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: "#009B48", metalness: 0.15, roughness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: "#0046AD", metalness: 0.15, roughness: 0.2 })
    ];

    let i = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.96, 0.96), materials);
          mesh.position.set(x * 1.05, y * 1.05, z * 1.05);

          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(mesh.geometry),
            new THREE.LineBasicMaterial({ color: "#00ffcc", linewidth: 1, transparent: true, opacity: 0.35 })
          );
          mesh.add(edges);
          cubeGroup.current.add(mesh);
          cubiesRef.current[i++] = mesh;
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isPlaying && solutionString) {
      queue.current = parseSolutionString(solutionString);
    }
  }, [isPlaying, solutionString]);

  useFrame((_, delta) => {
    if (!activeMove.current && queue.current.length > 0) {
      activeMove.current = queue.current.shift();
      currentAngle.current = 0;
      const face = activeMove.current.face;

      cubiesRef.current.forEach(cubie => {
        const pos = new THREE.Vector3();
        cubie.getWorldPosition(pos);
        cubeGroup.current.worldToLocal(pos);

        let attach = false;
        if (face === 'U' && pos.y > 0.1) attach = true;
        if (face === 'D' && pos.y < -0.1) attach = true;
        if (face === 'R' && pos.x > 0.1) attach = true;
        if (face === 'L' && pos.x < -0.1) attach = true;
        if (face === 'F' && pos.z > 0.1) attach = true;
        if (face === 'B' && pos.z < -0.1) attach = true;
        if (attach) pivot.current.attach(cubie);
      });
    }

    if (activeMove.current) {
      currentAngle.current = THREE.MathUtils.lerp(
        currentAngle.current,
        activeMove.current.targetAngle,
        12 * delta
      );
      pivot.current.rotation[activeMove.current.axis] = currentAngle.current;

      if (Math.abs(activeMove.current.targetAngle - currentAngle.current) < 0.02) {
        pivot.current.rotation[activeMove.current.axis] = activeMove.current.targetAngle;
        pivot.current.updateMatrixWorld();
        for (let j = pivot.current.children.length - 1; j >= 0; j--) {
          cubeGroup.current.attach(pivot.current.children[j]);
        }
        pivot.current.rotation.set(0, 0, 0);
        activeMove.current = null;
        if (queue.current.length === 0 && onFinish) onFinish();
      }
    }
  });

  return <group ref={cubeGroup} />;
}

// --- MAIN APP ---
export default function App() {
  const [activeColor, setActiveColor] = useState('U');
  const [solveStep, setSolveStep] = useState(1);
  const [solution, setSolution] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState('manual');
  const [cubeState, setCubeState] = useState(SOLVED_STATE);
  const [backendOnline, setBackendOnline] = useState(null); // null = checking, true = online, false = offline

  // Check backend health (supports dev proxy /api/health and direct fallback)
  const checkHealth = useCallback(async () => {
    try {
      let res;
      try {
        res = await fetch('/api/health');
      } catch {
        res = await fetch('http://localhost:5000/api/health');
      }
      if (res && res.ok) {
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const fetchSolution = async () => {
    setLoading(true);
    setErrorMessage('');
    setSolution('');
    setSolveStep(3);

    const stateString = cubeState.join('');

    try {
      let response;
      // Try proxied endpoint first
      try {
        response = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scramble: stateString })
        });
      } catch (networkErr) {
        // Fallback to direct backend URL
        console.warn('Proxy request failed, trying direct http://localhost:5000/api/solve', networkErr);
        response = await fetch('http://localhost:5000/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scramble: stateString })
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server returned error (${response.status})`);
      }

      setBackendOnline(true);

      if (data.solution === 'SOLVED') {
        setSolution('SOLVED');
      } else {
        setSolution(data.solution);
      }
    } catch (err) {
      console.error('Failed to compute solution:', err);
      setErrorMessage(
        err.message?.includes('Failed to fetch')
          ? 'Cannot reach Backend on http://localhost:5000. Is the server running?'
          : err.message || 'Connection to solver API failed.'
      );
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCubeState(SOLVED_STATE);
    setSolution('');
    setErrorMessage('');
    setSolveStep(1);
  };

  const handleLoadTestScramble = () => {
    setCubeState([...TEST_SCRAMBLE_STATE]);
    setSolution('');
    setErrorMessage('');
    setSolveStep(2);
  };

  const solutionMoves = solution && solution !== 'SOLVED' ? solution.split(' ') : [];

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#09090b', color: '#f4f4f5', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>

      {/* LEFT DASHBOARD PANEL */}
      <div style={{ width: '460px', padding: '1.75rem', overflowY: 'auto', borderRight: '1px solid #27272a', background: '#0e0e13', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <h1 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 40%, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Rubik's Solver
            </h1>

            {/* Live Backend Connection Indicator */}
            <div
              onClick={checkHealth}
              title={backendOnline ? "Backend is connected & online" : "Click to re-check backend connection"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: backendOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: backendOnline ? '#10b981' : '#ef4444',
                border: `1px solid ${backendOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}
            >
              {backendOnline === null ? (
                <span>Checking...</span>
              ) : backendOnline ? (
                <>
                  <Wifi size={13} />
                  <span>API :5000 Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={13} />
                  <span>API Offline</span>
                </>
              )}
            </div>
          </div>
          <p style={{ color: '#71717a', margin: 0, fontSize: '0.85rem' }}>
            Linked React Three.js frontend with Express C++ IDA* solver API.
          </p>
        </div>

        {/* Backend offline warning banner */}
        {backendOnline === false && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.82rem', color: '#fca5a5', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0, color: '#ef4444' }} />
            <div>
              <strong>Backend not connected.</strong> Run <code style={{ background: '#27272a', padding: '2px 5px', borderRadius: '4px', color: '#fff' }}>node backend/server.js</code> or <code style={{ background: '#27272a', padding: '2px 5px', borderRadius: '4px', color: '#fff' }}>npm run dev</code> in terminal.
            </div>
          </div>
        )}

        {/* Input Method Switcher */}
        <div style={{ background: '#16161d', padding: '1.2rem', borderRadius: '12px', border: '1px solid #27272a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a1a1aa' }}>Input Method</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleLoadTestScramble}
                title="Load a 2-move scramble (U F) to quickly test solver"
                style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: '#a5b4fc',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                <Sparkles size={12} /> Test Scramble
              </button>
              <button
                onClick={handleReset}
                title="Reset cube to solved state"
                style={{
                  background: '#27272a',
                  border: '1px solid #3f3f46',
                  color: '#d4d4d8',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={() => setInputMode('manual')}
              style={{
                background: inputMode === 'manual' ? '#27272a' : '#18181b',
                border: `1px solid ${inputMode === 'manual' ? '#6366f1' : '#3f3f46'}`,
                padding: '0.7rem',
                borderRadius: '8px',
                color: inputMode === 'manual' ? '#fff' : '#a1a1aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.15s'
              }}
            >
              <Grid3x3 size={16} /> Manual Grid
            </button>
            <button
              onClick={() => setInputMode('scan')}
              style={{
                background: inputMode === 'scan' ? '#27272a' : '#18181b',
                border: `1px solid ${inputMode === 'scan' ? '#6366f1' : '#3f3f46'}`,
                padding: '0.7rem',
                borderRadius: '8px',
                color: inputMode === 'scan' ? '#fff' : '#a1a1aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.15s'
              }}
            >
              <Camera size={16} /> Camera Scan
            </button>
          </div>
        </div>

        {inputMode === 'manual' ? (
          <>
            {/* Color Palette */}
            <div style={{ background: '#16161d', padding: '1.2rem', borderRadius: '12px', border: '1px solid #27272a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a1a1aa' }}>Brush Palette</span>
                <span style={{ fontSize: '0.75rem', color: '#71717a' }}>Current: <strong style={{ color: COLORS[activeColor] }}>{activeColor}</strong></span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', height: '42px' }}>
                {Object.entries(COLORS).map(([face, hex]) => (
                  <div
                    key={face}
                    onClick={() => setActiveColor(face)}
                    style={{
                      backgroundColor: hex,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: activeColor === face ? '2.5px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                      transform: activeColor === face ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: activeColor === face ? '0 0 10px rgba(99, 102, 241, 0.5)' : 'none',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      color: face === 'U' || face === 'D' ? '#000' : '#fff'
                    }}
                  >
                    {face}
                  </div>
                ))}
              </div>
            </div>

            {/* 2D Net Grid (U, R, F, D, L, B) */}
            <div style={{ background: '#16161d', padding: '1.2rem', borderRadius: '12px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ marginBottom: '1rem', color: '#71717a', fontSize: '0.8rem' }}>
                Click facelets to paint colors matching your Rubik's Cube
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 94px)', gap: '8px' }}>
                <div />
                <FaceGrid offset={0} cubeState={cubeState} setCubeState={setCubeState} activeColor={activeColor} />
                <div /><div />
                <FaceGrid offset={36} cubeState={cubeState} setCubeState={setCubeState} activeColor={activeColor} />
                <FaceGrid offset={18} cubeState={cubeState} setCubeState={setCubeState} activeColor={activeColor} />
                <FaceGrid offset={9} cubeState={cubeState} setCubeState={setCubeState} activeColor={activeColor} />
                <FaceGrid offset={45} cubeState={cubeState} setCubeState={setCubeState} activeColor={activeColor} />
                <div />
                <FaceGrid offset={27} cubeState={cubeState} setCubeState={setCubeState} activeColor={activeColor} />
                <div /><div />
              </div>
            </div>
          </>
        ) : (
          <div style={{ background: '#16161d', padding: '2rem', borderRadius: '12px', border: '1px solid #27272a', textAlign: 'center', color: '#a1a1aa' }}>
            <Camera size={36} style={{ marginBottom: '0.8rem', color: '#6366f1' }} />
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Camera Scanner</h4>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              Point each face to the webcam to auto-detect colors. (Switch to <strong>Manual Grid</strong> above for instant testing).
            </p>
          </div>
        )}

        {/* Solve Action & Results Panel */}
        <div style={{ background: '#16161d', padding: '1.25rem', borderRadius: '12px', border: '1px solid #27272a' }}>

          {/* Stepper */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '14px', left: '16px', right: '16px', height: '2px', background: '#27272a', zIndex: 0 }} />
            {[
              { id: 1, label: 'INPUT' },
              { id: 2, label: 'READY' },
              { id: 3, label: 'SOLVE' }
            ].map(step => (
              <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 1 }}>
                <div style={{
                  background: solveStep >= step.id ? '#6366f1' : '#27272a',
                  color: solveStep >= step.id ? '#fff' : '#71717a',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  transition: 'background 0.2s'
                }}>
                  {step.id}
                </div>
                <span style={{ fontSize: '0.65rem', color: solveStep >= step.id ? '#e4e4e7' : '#71717a', fontWeight: 600 }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={fetchSolution}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.9rem',
              background: loading ? '#3f3f46' : 'linear-gradient(135deg, #ff5c39 0%, #ea580c 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
              transition: 'opacity 0.2s, transform 0.1s'
            }}
          >
            {loading ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>IDA* Computing Solution...</span>
              </>
            ) : (
              <>
                <Play size={16} fill="white" />
                <span>Solve with C++ Engine</span>
              </>
            )}
          </button>

          {/* Error Message */}
          {errorMessage && (
            <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem', display: 'flex', gap: '8px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Solved state notice */}
          {solution === 'SOLVED' && (
            <div style={{ marginTop: '1rem', padding: '0.9rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
              <CheckCircle2 size={18} />
              <div>
                <strong>Already Solved!</strong>
                <div style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>The cube matches the solved state; 0 moves required.</div>
              </div>
            </div>
          )}

          {/* Solution Path with chips */}
          {solution && solution !== 'SOLVED' && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#0e0e13', borderRadius: '8px', border: '1px solid #27272a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 600 }}>OPTIMAL MOVES:</span>
                <span style={{ background: '#27272a', color: '#a1a1aa', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                  {solutionMoves.length} moves
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '0.6rem' }}>
                {solutionMoves.map((m, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: '#1f1f28',
                      border: '1px solid #3f3f46',
                      color: '#00ffcc',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.9rem'
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#71717a' }}>
                Interactive 3D preview is animating the moves on the right.
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RIGHT 3D CANVAS */}
      <div style={{ flex: 1, position: 'relative', background: 'radial-gradient(circle at center, #181824 0%, #09090b 100%)' }}>
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10, background: 'rgba(14, 14, 19, 0.75)', backdropFilter: 'blur(8px)', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', color: '#a1a1aa' }}>
          Drag to rotate cube • Scroll to zoom
        </div>

        <Canvas camera={{ position: [5, 5, 7], fov: 45 }}>
          <Environment preset="city" />
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 10]} intensity={1.2} color="#ffffff" />
          <Float speed={2} rotationIntensity={0.3} floatIntensity={0.6}>
            <AnimatedCube
              solutionString={solution}
              isPlaying={!loading && Boolean(solution) && solution !== 'SOLVED' && !errorMessage}
              onFinish={() => setSolveStep(1)}
            />
          </Float>
          <OrbitControls enableZoom={true} autoRotate={false} />
        </Canvas>
      </div>

    </div>
  );
}