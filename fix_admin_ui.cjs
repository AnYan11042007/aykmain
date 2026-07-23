const fs = require('fs');
let code = fs.readFileSync('src/components/LiveStreamPanel.tsx', 'utf8');

// Insert the state and effect right after chatMessages
const targetState = `  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; message: string; isUser?: boolean; isSystem?: boolean; time: string }>>([]);`;

const adminState = `
  const [isAdminMode, setIsAdminMode] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyH') {
        setIsAdminMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
`;

code = code.replace(targetState, targetState + "\n" + adminState);

// Now for the Admin UI. We'll append it right before the final `</div>\n  );\n}`
const adminUI = `
      {/* 🔴 ADMIN CHEAT PANEL (SECRET) */}
      {isAdminMode && (
        <div className="fixed bottom-4 left-4 z-50 bg-black/90 border border-red-500 p-4 rounded-xl shadow-[0_0_30px_rgba(255,0,0,0.4)] font-mono text-[10px] w-80 text-red-400">
          <h3 className="font-black text-xs text-white mb-2 flex items-center justify-between">
            <span className="animate-pulse">⚠️ GOD MODE (CTRL+SHIFT+H)</span>
            <button onClick={() => setIsAdminMode(false)} className="text-white/50 hover:text-white"><X className="w-3 h-3" /></button>
          </h3>
          <p className="text-white/60 mb-2">Thao túng kết quả LIVE Stream. Áp dụng cho chu kỳ hiện tại.</p>
          
          {activeTab === 'taixiu' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Chu kỳ TX: {txCycleId}</span>
                <span>Kết quả gốc: {currentTxResult.dices.reduce((a,b)=>a+b,0)} ({currentTxResult.dices.reduce((a,b)=>a+b,0)>=11?'TÀI':'XỈU'})</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { localStorage.setItem('s88_cheat_taixiu_' + txCycleId, JSON.stringify({ dices: [6,6,6] })); window.dispatchEvent(new Event('storage')) }} className="bg-red-500/20 border border-red-500 p-1.5 rounded hover:bg-red-500 hover:text-white">ÉP TÀI (18)</button>
                <button onClick={() => { localStorage.setItem('s88_cheat_taixiu_' + txCycleId, JSON.stringify({ dices: [1,1,1] })); window.dispatchEvent(new Event('storage')) }} className="bg-cyan-500/20 border border-cyan-500 p-1.5 rounded hover:bg-cyan-500 hover:text-white text-cyan-400">ÉP XỈU (3)</button>
              </div>
            </div>
          )}

          {activeTab === 'crash' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Chu kỳ Crash: {crashCycleId}</span>
                <span>Kết quả gốc: x{currentCrashPoint}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { localStorage.setItem('s88_cheat_crash_' + crashCycleId, '1.00'); window.dispatchEvent(new Event('storage')) }} className="bg-red-500/20 border border-red-500 p-1.5 rounded hover:bg-red-500 hover:text-white">KILL SỚM (x1.00)</button>
                <button onClick={() => { localStorage.setItem('s88_cheat_crash_' + crashCycleId, '100.00'); window.dispatchEvent(new Event('storage')) }} className="bg-emerald-500/20 border border-emerald-500 p-1.5 rounded hover:bg-emerald-500 hover:text-white text-emerald-400">NHẢ KÈO (x100)</button>
              </div>
            </div>
          )}

          {activeTab === 'penalty' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Chu kỳ Pen: {penCycleId}</span>
                <span>Kết quả gốc: {currentPenResult.isGoal ? 'VÀO' : 'TRƯỢT'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { localStorage.setItem('s88_cheat_penalty_' + penCycleId, JSON.stringify({ target: 0, dive: 1, isGoal: true })); window.dispatchEvent(new Event('storage')) }} className="bg-emerald-500/20 border border-emerald-500 p-1.5 rounded hover:bg-emerald-500 hover:text-white text-emerald-400">ÉP VÀO</button>
                <button onClick={() => { localStorage.setItem('s88_cheat_penalty_' + penCycleId, JSON.stringify({ target: 0, dive: 0, isGoal: false })); window.dispatchEvent(new Event('storage')) }} className="bg-red-500/20 border border-red-500 p-1.5 rounded hover:bg-red-500 hover:text-white">ÉP THỦ MÔN CẢN</button>
              </div>
            </div>
          )}
          <button onClick={() => {
            localStorage.removeItem('s88_cheat_taixiu_' + txCycleId);
            localStorage.removeItem('s88_cheat_crash_' + crashCycleId);
            localStorage.removeItem('s88_cheat_penalty_' + penCycleId);
          }} className="w-full mt-2 bg-white/10 p-1.5 rounded text-white hover:bg-white/20">CLEAR CHEAT</button>
        </div>
      )}
`;

const endTarget = `    </div>\n  );\n}`;
code = code.replace(endTarget, adminUI + "\n" + endTarget);

fs.writeFileSync('src/components/LiveStreamPanel.tsx', code);
console.log('Admin UI added');
