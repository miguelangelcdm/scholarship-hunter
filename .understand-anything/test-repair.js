const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:/Users/migue/.gemini/antigravity/scratch/Scholarship-hunter/.understand-anything/knowledge-graph.json'));

const children = data.nodes.map(n => ({ id: n.id, width: 200, height: 100 }));
const edges = data.edges.map(e => ({ id: e.source+'-'+e.target, sources: [e.source], targets: [e.target] }));

function repairElkInput(input) {
    let dimsAdded = 0;
    input.children.forEach(c => {
        if (c.width == null || c.height == null) dimsAdded++;
    });
    console.log('dimsAdded:', dimsAdded);

    let dupesRemoved = 0;
    const seen = new Set();
    input.children.forEach(c => {
        if (seen.has(c.id)) dupesRemoved++;
        seen.add(c.id);
    });
    console.log('dupesRemoved:', dupesRemoved);

    const allIds = new Set(input.children.map(c => c.id));
    let orphanEdges = 0;
    input.edges.forEach(e => {
        const hasSource = e.sources.every(s => allIds.has(s));
        const hasTarget = e.targets.every(t => allIds.has(t));
        if (!hasSource || !hasTarget) orphanEdges++;
    });
    console.log('orphanEdges:', orphanEdges);

    // containment cycles
    let cyclesRemoved = 0;
    // (ignored for flat graphs)
}

repairElkInput({ children, edges });
