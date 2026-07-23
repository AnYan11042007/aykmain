const fs = require('fs');
let code = fs.readFileSync('src/components/LiveStreamPanel.tsx', 'utf8');

// The grid starts with: <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
// And ends at the very end.

// Let's find the sections.
const streamStartIdx = code.indexOf('<div className="lg:col-span-8 flex flex-col gap-4">');
if (streamStartIdx === -1) { console.error('Not found 1'); process.exit(1); }

const streamPlayerStartStr = '{/* Main stream player screen */}\n          <div className="relative aspect-video';
const streamPlayerStartIdx = code.indexOf(streamPlayerStartStr);

const bettingBoardStartStr = '{/* Real-time Betting Board & Total Pools */}';
const bettingBoardStartIdx = code.indexOf(bettingBoardStartStr);

const chatSidebarStartStr = '{/* RIGHT COLUMN: Chat Sidebar';
const chatSidebarStartIdx = code.indexOf(chatSidebarStartStr);

const chatSidebarEndIdx = code.indexOf('</div>\n      </div>\n    </div>\n  );\n}'); // close chat sidebar, close grid, close container
const endContent = code.slice(chatSidebarEndIdx);

// Extract parts
const videoPlayerCode = code.slice(streamPlayerStartIdx, bettingBoardStartIdx).trim();

// The betting board code goes from bettingBoardStartIdx to just before the closing </div> of lg:col-span-8
const bettingBoardEndIdx = code.indexOf('</div>\n\n        {/* RIGHT COLUMN: Chat Sidebar');
const bettingBoardCode = code.slice(bettingBoardStartIdx, bettingBoardEndIdx).trim();

const chatSidebarCode = code.slice(chatSidebarStartIdx, chatSidebarEndIdx).trim() + '\n        </div>';

// Reassemble
const beforeGrid = code.slice(0, streamStartIdx);
const newGrid = `
        {/* Stream Player (Span 8) */}
        ${videoPlayerCode.replace('<div className="relative aspect-video', '<div className="lg:col-span-8 relative aspect-video')}

        ${chatSidebarCode.replace('flex flex-col h-[380px] lg:h-auto min-h-[350px] glass-box border-white/5 overflow-hidden', 'flex flex-col glass-box border-white/5 overflow-hidden')}
      </div>

      {/* Betting Board */}
      <div className="mt-4">
        ${bettingBoardCode}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/LiveStreamPanel.tsx', beforeGrid + newGrid);
console.log('Done');
