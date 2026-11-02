# Rubik's Cube 3D Solver

An interactive 3D Rubik's Cube solver built with a **React Three.js** frontend and an **Express.js + C++ IDA*** backend engine.

![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Three.js%20%7C%20Express%20%7C%20C%2B%2B-blue)

---

## Architecture

- **Frontend**: React 19, `@react-three/fiber`, `@react-three/drei`, Three.js, Lucide Icons, Vite.
  - Interactive 3D Rubik's cube simulation with orbit controls and move animation.
  - 2D net editor to customize and paint facelets.
  - Real-time backend connectivity check (`GET /api/health`).
- **Backend**: Node.js & Express.
  - Validates 54-facelet scramble sequences.
  - Invokes high-performance C++ IDA* solver binary.
- **Engine**: C++ IDA* (Iterative Deepening A*) search algorithm for optimal solutions.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MinGW / g++](https://www.mingw-w64.org/) (optional, only needed if modifying C++ solver)

### 1. Installation
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Return to root
cd ..
```

### 2. Run Both Frontend & Backend
From the project root:
```bash
npm run dev
```
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `node dev-runner.js` | Runs both backend and frontend concurrently |
| `npm run backend` | `node backend/server.js` | Runs Express backend API |
| `npm run frontend` | `npm run dev --prefix frontend` | Runs Vite frontend dev server |
| `npm run compile-solver` | `cd backend && g++ -O3 solver.cpp -o solver.exe` | Recompiles C++ solver binary |
