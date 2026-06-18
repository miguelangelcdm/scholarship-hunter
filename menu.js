#!/usr/bin/env node
const { spawn, exec } = require('child_process');
const path = require('path');
const readline = require('readline');
const fs = require('fs');

const isWin = process.platform === 'win32';
const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

const pythonPath = isWin
  ? path.join(backendDir, 'venv', 'Scripts', 'python.exe')
  : path.join(backendDir, 'venv', 'bin', 'python');

const backendArgs = ['-m', 'uvicorn', 'main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'];

const frontendCmd = isWin ? 'npm.cmd' : 'npm';
const frontendArgs = ['run', 'dev'];

let activeProcesses = [];
let isCleaningUp = false;

function prefixLogs(proc, name, colorCode) {
  if (proc.stdout) {
    const rlOut = readline.createInterface({ input: proc.stdout });
    rlOut.on('line', (line) => {
      console.log(`${colorCode}[${name}]\x1b[0m ${line}`);
    });
  }
  if (proc.stderr) {
    const rlErr = readline.createInterface({ input: proc.stderr });
    rlErr.on('line', (line) => {
      // Many tools (like Uvicorn and Vite) output standard info/warning logs to stderr.
      // We label them under the standard prefix, but can highlight lines with actual error keywords if needed.
      const isActualError = line.toLowerCase().includes('error') || line.toLowerCase().includes('exception');
      const prefix = isActualError ? `${name} ERR` : name;
      const displayColor = isActualError ? '\x1b[31m' : colorCode; // Red for actual errors
      console.log(`${displayColor}[${prefix}]\x1b[0m ${line}`);
    });
  }
}

function cleanupAndExit(exitCode = 0) {
  if (isCleaningUp) return;
  isCleaningUp = true;

  if (activeProcesses.length === 0) {
    process.exit(exitCode);
  }

  console.log('\x1b[33m\n[System] Stopping all spawned processes...\x1b[0m');

  let killCount = 0;
  const targetCount = activeProcesses.length;

  activeProcesses.forEach(proc => {
    if (proc && !proc.killed && proc.pid) {
      if (isWin) {
        exec(`taskkill /pid ${proc.pid} /T /F`, () => {
          killCount++;
          if (killCount === targetCount) {
            process.exit(exitCode);
          }
        });
      } else {
        try {
          proc.kill('SIGTERM');
        } catch (e) {
          // ignore
        }
        killCount++;
        if (killCount === targetCount) {
          process.exit(exitCode);
        }
      }
    } else {
      killCount++;
      if (killCount === targetCount) {
        process.exit(exitCode);
      }
    }
  });

  setTimeout(() => {
    process.exit(exitCode);
  }, 2000);
}

// Register exit handlers
process.on('SIGINT', () => cleanupAndExit(0));
process.on('SIGTERM', () => cleanupAndExit(0));

function startBackend() {
  console.log('\x1b[36m[System] Launching FastAPI Backend...\x1b[0m');
  let execPath = pythonPath;
  let args = backendArgs;

  if (!fs.existsSync(pythonPath)) {
    console.log(`\x1b[33m[System] Virtual environment python not found at: ${pythonPath}\x1b[0m`);
    console.log('\x1b[33m[System] Attempting to run using global "python" command...\x1b[0m');
    execPath = 'python';
  }

  const proc = spawn(execPath, args, { cwd: backendDir, shell: true });

  proc.on('error', (err) => {
    console.error(`\x1b[31m[Backend Error] Failed to start backend process: ${err.message}\x1b[0m`);
  });

  proc.on('close', (code) => {
    console.log(`\x1b[31m[Backend] Process exited with code ${code}\x1b[0m`);
    checkProcessesStatus();
  });

  prefixLogs(proc, 'Backend', '\x1b[36m');
  return proc;
}

function startFrontend() {
  console.log('\x1b[32m[System] Launching React/Vite Frontend...\x1b[0m');
  const proc = spawn(frontendCmd, frontendArgs, { cwd: frontendDir, shell: true });

  proc.on('error', (err) => {
    console.error(`\x1b[31m[Frontend Error] Failed to start frontend process: ${err.message}\x1b[0m`);
  });

  proc.on('close', (code) => {
    console.log(`\x1b[31m[Frontend] Process exited with code ${code}\x1b[0m`);
    checkProcessesStatus();
  });

  prefixLogs(proc, 'Frontend', '\x1b[32m');
  return proc;
}

function checkProcessesStatus() {
  if (isCleaningUp) return;
  setTimeout(() => {
    const anyDead = activeProcesses.some(p => p.killed || p.exitCode !== null);
    if (anyDead && activeProcesses.length > 0) {
      console.log('\x1b[33m[System] Service termination detected. Shutting down...\x1b[0m');
      cleanupAndExit(0);
    }
  }, 1000);
}

function runAll() {
  console.log('\x1b[33m[System] Starting Full Project (Combined Logs mode)...\x1b[0m');
  const backend = startBackend();
  const frontend = startFrontend();

  if (backend) activeProcesses.push(backend);
  if (frontend) activeProcesses.push(frontend);

  console.log('\x1b[32m[System] Concurrency started. Press Ctrl+C to terminate both servers.\x1b[0m\n');
}

function runBackendOnly() {
  console.log('\x1b[33m[System] Starting Backend Only...\x1b[0m');
  const backend = startBackend();
  if (backend) activeProcesses.push(backend);
  console.log('\x1b[32m[System] Backend started. Press Ctrl+C to terminate.\x1b[0m\n');
}

function runFrontendOnly() {
  console.log('\x1b[33m[System] Starting Frontend Only...\x1b[0m');
  const frontend = startFrontend();
  if (frontend) activeProcesses.push(frontend);
  console.log('\x1b[32m[System] Frontend started. Press Ctrl+C to terminate.\x1b[0m\n');
}

function runTests() {
  console.log('\x1b[35m[System] Launching Playwright E2E Tests...\x1b[0m');
  const proc = spawn(frontendCmd, ['run', 'test:e2e'], { cwd: frontendDir, stdio: 'inherit', shell: true });
  proc.on('close', (code) => {
    console.log(`\x1b[35m[System] Playwright tests exited with code ${code}\x1b[0m`);
    process.exit(code);
  });
}

function showMenu() {
  console.clear();
  console.log('\x1b[36m==================================================\x1b[0m');
  console.log('\x1b[1;36m       ★  SCHOLARSHIP HUNTER DEVELOPER MENU  ★    \x1b[0m');
  console.log('\x1b[36m==================================================\x1b[0m');
  console.log('  \x1b[32m[1]\x1b[0m Run Full Project (Frontend + Backend Concurrently)');
  console.log('  \x1b[32m[2]\x1b[0m Run FastAPI Backend Only');
  console.log('  \x1b[32m[3]\x1b[0m Run React Frontend Only');
  console.log('  \x1b[32m[4]\x1b[0m Run Playwright E2E Tests');
  console.log('  \x1b[31m[5]\x1b[0m Exit');
  console.log('\x1b[36m==================================================\x1b[0m');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\x1b[33mSelect an option [1-5]: \x1b[0m', (answer) => {
    rl.close();
    handleOption(answer.trim());
  });
}

function handleOption(option) {
  switch (option) {
    case '1':
      runAll();
      break;
    case '2':
      runBackendOnly();
      break;
    case '3':
      runFrontendOnly();
      break;
    case '4':
      runTests();
      break;
    case '5':
      console.log('\x1b[32mExiting. Have a great coding session!\x1b[0m');
      process.exit(0);
      break;
    default:
      console.log('\x1b[31mInvalid option. Press Enter to try again.\x1b[0m');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.on('line', () => {
        rl.close();
        showMenu();
      });
      break;
  }
}

// Parse args
const args = process.argv.slice(2);
if (args.includes('--run-all')) {
  runAll();
} else if (args.includes('--run-backend')) {
  runBackendOnly();
} else if (args.includes('--run-frontend')) {
  runFrontendOnly();
} else if (args.includes('--run-tests')) {
  runTests();
} else {
  showMenu();
}
