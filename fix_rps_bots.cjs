const fs = require('fs');
let code = fs.readFileSync('src/components/modals/RpsModal.tsx', 'utf8');

const botHook = `
  const handleAddBot = async () => {
    if (!room || room.status !== 'WAITING' || room.p2) return;
    
    const botNames = ['Khá Bảnh', 'Huấn Hoa Hồng', 'Tiến Bịp', 'Dương Minh Tuyền'];
    const botId = 'bot_' + Math.floor(Math.random() * 100000);
    const botName = botNames[Math.floor(Math.random() * botNames.length)] + ' (Bot)';
    
    await update(ref(db, \`rps_rooms/\${roomId}\`), {
      p2: botId,
      p2Name: botName,
      p2Avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + botId,
      isBot: true
    });
  };
`;

const targetHook = `  const handleLeaveRoom = async () => {`;
code = code.replace(targetHook, botHook + "\n" + targetHook);

const btnTarget = `            {!room.p2 && (`;
const btnReplace = `            {!room.p2 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
                <button 
                  onClick={handleAddBot}
                  className="py-2 px-6 bg-cyan-950/20 border border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black font-bold uppercase rounded-xl tracking-widest text-xs transition-all cursor-pointer shadow-lg"
                >
                  + THÊM BOT
                </button>
              </div>
            )}
            {!room.p2 && (`;
code = code.replace(btnTarget, btnReplace);

const topOverlayTarget = `  return (\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">`;
const topOverlayAdd = `
  const [isPortrait, setIsPortrait] = useState(false);
  useEffect(() => {
    const checkOrientation = () => setIsPortrait(window.innerHeight > window.innerWidth && window.innerWidth <= 768);
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  if (isPortrait) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-center p-6 text-white font-mono">
        <div className="w-16 h-16 border-4 border-dashed border-[#00ff80] rounded-full animate-spin flex items-center justify-center mb-4"><Swords className="w-6 h-6 text-[#00ff80]" /></div>
        <h2 className="text-xl font-bold mb-2">Vui Lòng Xoay Ngang Điện Thoại</h2>
        <p className="text-sm text-gray-400">Trải nghiệm Oẳn Tù Tì cần không gian màn hình ngang.</p>
        <button onClick={onClose} className="mt-6 px-6 py-2 bg-red-500 rounded text-white font-bold cursor-pointer">Thoát</button>
      </div>
    );
  }
`;
code = code.replace(topOverlayTarget, topOverlayAdd + "\n" + topOverlayTarget);

fs.writeFileSync('src/components/modals/RpsModal.tsx', code);
console.log('Rps Bot and Orientation added');
