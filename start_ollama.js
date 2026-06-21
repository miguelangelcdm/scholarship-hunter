const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');

// Forcefully kill any Ollama processes running natively in the Windows background
// This guarantees PM2 takes full control of the port and lifecycle
try {
  if (process.platform === 'win32') {
    execSync('taskkill /F /IM "ollama app.exe" /T', { stdio: 'ignore' });
    execSync('taskkill /F /IM "ollama.exe" /T', { stdio: 'ignore' });
  }
} catch (e) {
  // It's perfectly fine if they aren't running
}

const ollamaPath = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Ollama', 'ollama.exe');

const proc = spawn(ollamaPath, ['serve'], {
  stdio: 'inherit',
  windowsHide: true,
  shell: process.platform === 'win32'
});

proc.on('close', (code) => {
  console.log(`[System] Ollama process exited with code ${code}`);
  process.exit(code || 0);
});

proc.on('error', (err) => {
  console.error(`[System Error] Failed to start Ollama: ${err.message}`);
  process.exit(1);
});
