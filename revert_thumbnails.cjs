const fs = require('fs');
let code = fs.readFileSync('src/components/LiveStreamPanel.tsx', 'utf8');

const oldGrid = `<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">`;
const newGrid = `<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">`;
code = code.replace(oldGrid, newGrid);

// Find the Horse Thumbnail to the end of FC Mobile Thumbnail
const regex = /\{\/\* Horse Thumbnail \*\/\}[\s\S]*?\{\/\* FC Mobile Thumbnail \*\/\}[\s\S]*?<\/motion\.button>/;
code = code.replace(regex, "");

fs.writeFileSync('src/components/LiveStreamPanel.tsx', code);
console.log('Reverted thumbnails');
