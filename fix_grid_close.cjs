const fs = require('fs');
let code = fs.readFileSync('src/components/LiveStreamPanel.tsx', 'utf8');

// The lines are:
// 1210:        </div>
// 1211:        </div>
// 1212:      </div>
// 1213:      {/* Betting Board */}

// Replace 1211 and 1212 with just one `</div>`
code = code.replace(/        <\/div>\n      <\/div>\n      {\/\* Betting Board \*\//, '      </div>\n      {/* Betting Board */');

fs.writeFileSync('src/components/LiveStreamPanel.tsx', code);
