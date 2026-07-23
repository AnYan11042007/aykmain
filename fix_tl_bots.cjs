const fs = require('fs');
let code = fs.readFileSync('src/components/modals/TienLenModal.tsx', 'utf8');

const botHook = `
  const handleAddBot = async () => {
    if (!room || room.status !== 'WAITING') return;
    const pCount = Object.keys(room.players || {}).length;
    if (pCount >= 4) return;
    
    const botNames = ['Khá Bảnh', 'Huấn Hoa Hồng', 'Tiến Bịp', 'Dương Minh Tuyền'];
    const botId = 'bot_' + Math.floor(Math.random() * 100000);
    const botName = botNames[Math.floor(Math.random() * botNames.length)] + ' (Bot)';
    
    await update(ref(db, \`tienlen_rooms/\${roomId}/players/\${botId}\`), {
      name: botName,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + botId,
      isCreator: false,
      status: 'WAITING',
      isBot: true
    });
  };
`;

const targetHook = `  const handleLeaveRoom = async () => {`;
code = code.replace(targetHook, botHook + "\n" + targetHook);

const btnTarget = `            {isCreator && room.status === 'WAITING' && (`;
const btnReplace = `            {isCreator && room.status === 'WAITING' && Object.keys(room.players || {}).length < 4 && (
              <button 
                onClick={handleAddBot}
                className="absolute top-1/2 left-[20%] -translate-x-1/2 -translate-y-1/2 py-2 px-4 bg-cyan-950/20 border border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black font-bold uppercase rounded-xl tracking-widest text-xs transition-all cursor-pointer z-40"
              >
                + THÊM BOT
              </button>
            )}
            {isCreator && room.status === 'WAITING' && (`;
code = code.replace(btnTarget, btnReplace);

// Orientation warning overlay
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
        <div className="w-16 h-16 border-4 border-dashed border-[#ffd700] rounded-full animate-spin flex items-center justify-center mb-4"><Zap className="w-6 h-6 text-[#ffd700]" /></div>
        <h2 className="text-xl font-bold mb-2">Vui Lòng Xoay Ngang Điện Thoại</h2>
        <p className="text-sm text-gray-400">Trải nghiệm Tiến Lên cần không gian màn hình ngang để hiển thị đủ 4 góc bài.</p>
        <button onClick={onClose} className="mt-6 px-6 py-2 bg-red-500 rounded text-white font-bold cursor-pointer">Thoát</button>
      </div>
    );
  }
`;
code = code.replace(topOverlayTarget, topOverlayAdd + "\n" + topOverlayTarget);

fs.writeFileSync('src/components/modals/TienLenModal.tsx', code);
console.log('TienLen Bot and Orientation added');
