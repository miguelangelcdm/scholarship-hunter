const fs = require('fs');
const p = 'C:\\Users\\migue\\.gemini\\antigravity\\scratch\\Scholarship-hunter\\.understand-anything\\knowledge-graph.json';
const data = JSON.parse(fs.readFileSync(p, 'utf8'));

data.project = {
  name: "Educational Pathfinder",
  description: "An AI-powered academic program discovery platform.",
  languages: ["python", "typescript", "markdown"],
  frameworks: ["react", "vite", "fastapi"],
  analyzedAt: new Date().toISOString(),
  gitCommitHash: "d4f71dba60d92482d78e018c2fad3fe2b665a251"
};

// Also ensure version is set
if (!data.version) data.version = "1.0.0";

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log("Fixed with full schema!");
