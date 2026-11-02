const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

console.log('====================================================');
console.log('  Starting Rubik\'s Cube Full Stack Application');
console.log('  Backend:  http://localhost:5000');
console.log('  Frontend: http://localhost:5173');
console.log('====================================================\n');

// Detect npm executable on Windows vs Unix
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCmd = process.execPath;

// Start Backend process
const backend = spawn(nodeCmd, ['server.js'], {
  cwd: backendDir,
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe']
});

// Start Frontend process
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: frontendDir,
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

function pipeOutput(child, prefix, colorCode) {
  const color = `\x1b[${colorCode}m`;
  const reset = '\x1b[0m';

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`${color}[${prefix}]${reset} ${line}`);
      }
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        console.error(`${color}[${prefix} ERR]${reset} ${line}`);
      }
    });
  });
}

pipeOutput(backend, 'BACKEND', '36'); // Cyan
pipeOutput(frontend, 'FRONTEND', '32'); // Green

const cleanExit = () => {
  console.log('\nStopping backend and frontend...');
  try {
    backend.kill();
  } catch {}
  try {
    frontend.kill();
  } catch {}
  process.exit(0);
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
});

frontend.on('close', (code) => {
  console.log(`Frontend process exited with code ${code}`);
});
