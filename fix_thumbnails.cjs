const fs = require('fs');
let code = fs.readFileSync('src/components/LiveStreamPanel.tsx', 'utf8');

const oldGrid = `<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">`;
const newGrid = `<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">`;
code = code.replace(oldGrid, newGrid);

const thumbnailsEnd = `      </div>

      {/* Main Broadcast Container */}`;

const moreThumbnails = `
        {/* Horse Thumbnail */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setActiveTab('horse'); setBetChoice(''); }}
          className={\`relative aspect-[16/9] w-full rounded-xl overflow-hidden border font-mono text-[10px] transition-all cursor-pointer flex flex-col justify-between p-3 group \${
            activeTab === 'horse'
              ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
              : 'border-white/5 bg-black/60 hover:border-white/20'
          }\`}
        >
          <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1598284534789-7dc94380907e?auto=format&fit=crop&w=300&q=80')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 z-[1]" />
          <div className="z-10 flex justify-between items-center w-full">
            <span className="py-0.5 px-1.5 bg-red-600 text-white font-black text-[8px] uppercase tracking-wider rounded flex items-center gap-1">LIVE</span>
          </div>
          <div className="z-10 text-left">
            <h4 className="text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1"><span>🐎 ĐUA NGỰA</span></h4>
          </div>
        </motion.button>

        {/* Claw Thumbnail */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setActiveTab('claw'); setBetChoice(''); }}
          className={\`relative aspect-[16/9] w-full rounded-xl overflow-hidden border font-mono text-[10px] transition-all cursor-pointer flex flex-col justify-between p-3 group \${
            activeTab === 'claw'
              ? 'border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.25)]'
              : 'border-white/5 bg-black/60 hover:border-white/20'
          }\`}
        >
          <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1582216666838-89c56475fbcc?auto=format&fit=crop&w=300&q=80')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 z-[1]" />
          <div className="z-10 flex justify-between items-center w-full">
            <span className="py-0.5 px-1.5 bg-red-600 text-white font-black text-[8px] uppercase tracking-wider rounded flex items-center gap-1">LIVE</span>
          </div>
          <div className="z-10 text-left">
            <h4 className="text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1"><span>🧸 GẮP THÚ</span></h4>
          </div>
        </motion.button>

        {/* FC Mobile Thumbnail */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setActiveTab('fcmobile'); setBetChoice(''); }}
          className={\`relative aspect-[16/9] w-full rounded-xl overflow-hidden border font-mono text-[10px] transition-all cursor-pointer flex flex-col justify-between p-3 group \${
            activeTab === 'fcmobile'
              ? 'border-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.25)]'
              : 'border-white/5 bg-black/60 hover:border-white/20'
          }\`}
        >
          <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=300&q=80')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 z-[1]" />
          <div className="z-10 flex justify-between items-center w-full">
            <span className="py-0.5 px-1.5 bg-red-600 text-white font-black text-[8px] uppercase tracking-wider rounded flex items-center gap-1">LIVE</span>
          </div>
          <div className="z-10 text-left">
            <h4 className="text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1"><span>🏟️ FC ARENA</span></h4>
          </div>
        </motion.button>
`;

code = code.replace(thumbnailsEnd, moreThumbnails + "\n" + thumbnailsEnd);
fs.writeFileSync('src/components/LiveStreamPanel.tsx', code);
console.log('Thumbnails added');
