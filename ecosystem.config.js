module.exports = {
  apps: [
    {
      name: "frontend",
      script: "./node_modules/vite/bin/vite.js",
      cwd: "./frontend",
      watch: false,
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "backend",
      script: process.platform === 'win32' ? ".\\venv\\Scripts\\pythonw.exe" : "./venv/bin/python",
      args: "-m uvicorn main:app --host 0.0.0.0 --port 8000",
      cwd: "./backend",
      watch: false,
    }
  ]
};
