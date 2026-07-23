const fs = require('fs');
let code = fs.readFileSync('src/components/LiveStreamPanel.tsx', 'utf8');
code = code.replace(/  \);\n}/, '    </div>\n  );\n}');
fs.writeFileSync('src/components/LiveStreamPanel.tsx', code);
