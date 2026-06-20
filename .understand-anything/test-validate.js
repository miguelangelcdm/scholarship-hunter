const fs = require('fs');
const { validateGraph } = require('./C:/Users/migue/.gemini/antigravity/scratch/Understand-Anything-temp/understand-anything-plugin/packages/core/dist/schema.js');

const p = 'C:\\Users\\migue\\.gemini\\antigravity\\scratch\\Scholarship-hunter\\.understand-anything\\knowledge-graph.json';
const data = JSON.parse(fs.readFileSync(p, 'utf8'));

const result = validateGraph(data);
console.log("Success:", result.success);
if (!result.success) {
  console.log("Errors:", result.errors);
  console.log("Fatal:", result.fatal);
} else {
  console.log("Nodes:", result.data.nodes.length);
  console.log("Edges:", result.data.edges.length);
}
