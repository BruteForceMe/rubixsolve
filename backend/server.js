const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint so the frontend can verify connectivity
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Rubik Cube Solver Backend is online',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/solve', (req, res) => {
  const { scramble } = req.body;

  if (!scramble || typeof scramble !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "scramble" parameter in request body.' });
  }

  const cleanScramble = scramble.trim().toUpperCase();

  if (cleanScramble.length !== 54) {
    return res.status(400).json({
      error: `Invalid cube state length: expected 54 characters, got ${cleanScramble.length}.`
    });
  }

  if (!/^[URFDLB]{54}$/.test(cleanScramble)) {
    return res.status(400).json({
      error: 'Invalid cube characters. Only U, R, F, D, L, B characters are accepted.'
    });
  }

  const solverExePath = path.join(__dirname, 'solver.exe');
  const command = `"${solverExePath}" "${cleanScramble}"`;

  exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[EXEC ERROR]`, error.message);
      return res.status(500).json({
        error: 'Failed to compute solution. Execution failed.',
        details: stderr || error.message
      });
    }

    const solution = stdout.trim();
    if (solution.startsWith('Error:')) {
      return res.status(400).json({ error: solution });
    }

    console.log(`[SOLVE SUCCESS] Output: ${solution}`);
    return res.json({
      success: true,
      solution: solution,
      isSolved: solution === 'SOLVED'
    });
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`Rubik Solver Backend running at:`);
  console.log(`  Local: http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});