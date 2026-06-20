const fs = require('fs');
const path = './.understand-anything/knowledge-graph.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const frontendNodes = [];
const backendNodes = [];
const templateNodes = [];
const docsNodes = [];
const infraNodes = [];

data.nodes.forEach(n => {
    const fp = n.filePath || n.id;
    if (fp.startsWith('frontend/')) {
        frontendNodes.push(n.id);
    } else if (fp.startsWith('backend/')) {
        backendNodes.push(n.id);
    } else if (fp.startsWith('orbix-original-template/')) {
        templateNodes.push(n.id);
    } else if (fp.startsWith('docs/') || fp.endsWith('.md')) {
        docsNodes.push(n.id);
    } else {
        infraNodes.push(n.id);
    }
});

data.layers = [];

if (frontendNodes.length > 0) {
    data.layers.push({
        id: "layer:frontend",
        name: "Frontend Application",
        description: "The main user interface built with React and Vite.",
        nodeIds: frontendNodes
    });
}
if (backendNodes.length > 0) {
    data.layers.push({
        id: "layer:backend",
        name: "Backend Service",
        description: "The core backend API and services.",
        nodeIds: backendNodes
    });
}
if (templateNodes.length > 0) {
    data.layers.push({
        id: "layer:orbix-template",
        name: "Orbix Template",
        description: "The original reference UI template.",
        nodeIds: templateNodes
    });
}
if (docsNodes.length > 0) {
    data.layers.push({
        id: "layer:documentation",
        name: "Documentation",
        description: "Project documentation, guidelines, and changelogs.",
        nodeIds: docsNodes
    });
}
if (infraNodes.length > 0) {
    data.layers.push({
        id: "layer:infrastructure",
        name: "Infrastructure & Config",
        description: "Build scripts, configurations, and internal tool metadata.",
        nodeIds: infraNodes
    });
}

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log('Successfully assigned ' + data.nodes.length + ' nodes into ' + data.layers.length + ' layers!');
