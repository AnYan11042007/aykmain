const fs = require('fs');
let code = fs.readFileSync('src/components/modals/HorseModal.tsx', 'utf8');

const hookState = `  const [positions, setPositions] = useState<number[]>([0, 0, 0, 0]);`;
const newHook = `
  const [liveBets, setLiveBets] = useState<Array<{name: string; choice: number; amount: number}>>([]);
  
  useEffect(() => {
    if (isRacing) return;
    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        const botNames = ['Khá Bảnh', 'Huấn', 'Tiến Bịp', 'Dương Tuyền', 'Sơn Tùng', 'Jack', 'Độ Mixi', 'PewPew'];
        setLiveBets(prev => {
          const newBet = {
            name: botNames[Math.floor(Math.random() * botNames.length)],
            choice: Math.floor(Math.random() * 4) + 1,
            amount: (Math.floor(Math.random() * 10) + 1) * 1000
          };
          return [...prev, newBet].slice(-6);
        });
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [isRacing]);
`;
code = code.replace(hookState, hookState + "\n" + newHook);

const uiTarget = `          <div className="bg-black/60 border border-[#d2a679]/20 rounded-xl p-4">`;
const newUI = `          <div className="bg-black/60 border border-[#d2a679]/20 rounded-xl p-4 relative overflow-hidden">
            {/* Live Bots Overlay */}
            <div className="absolute top-2 right-2 text-right pointer-events-none opacity-50 z-0">
              {liveBets.map((b, i) => (
                <div key={i} className="text-[9px] font-mono mb-1 text-white animate-fade-in-up">
                  <span className="text-[#d2a679]">{b.name}</span> cược Ngựa {b.choice} <span className="text-[#ffd700]">+{b.amount/1000}k PP</span>
                </div>
              ))}
            </div>`;
code = code.replace(uiTarget, newUI);

fs.writeFileSync('src/components/modals/HorseModal.tsx', code);
console.log('Horse live bets added');
