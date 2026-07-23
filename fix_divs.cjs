const fs = require('fs');
let code = fs.readFileSync('src/components/LiveStreamPanel.tsx', 'utf8');

// Replace any occurrence of two consecutive `    </div>` with one.
// Wait, they are on separate lines.
code = code.replace(/    <\/div>\n    <\/div>/g, '    </div>');

fs.writeFileSync('src/components/LiveStreamPanel.tsx', code);
console.log('Fixed double divs');
