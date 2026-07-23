const fs = require('fs');
let code = fs.readFileSync('src/components/LiveStreamPanel.tsx', 'utf8');

const hook = `
  // AI User Chat Simulation
  useEffect(() => {
    const chatTemplates = [
      "Ván này vào cửa nào anh em?",
      "Vãi, bẻ cầu rồi",
      "All in anh em ơi!",
      "Nhà cái nay dễ bắt bài",
      "Ván sau x2 lên",
      "Thôi nghỉ thôi",
      "Vừa ăn to xong haha",
      "Sao lag thế nhỉ",
      "Game mượt ghê",
      "Thằng kia đánh láo thật",
      "Cửa này sáng này",
      "Sợ thật, hên quá",
      "Lại về bờ rồi",
      "Mới nạp thêm 50k",
      "Chốt lời nào"
    ];

    const chatInterval = setInterval(() => {
      if (Math.random() < 0.6) {
        const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        const msg = chatTemplates[Math.floor(Math.random() * chatTemplates.length)];
        const now = new Date();
        const time = \`\${now.getHours()}:\${now.getMinutes().toString().padStart(2, '0')}\`;
        
        setChatMessages(prev => {
          const newMsg = { sender: bot, message: msg, time, isBot: true };
          const updated = [...prev, newMsg];
          return updated.slice(-10); // Strictly limit to last 10
        });
      }
    }, 3000);

    return () => clearInterval(chatInterval);
  }, []);
`;

// Insert after `// Track Picture-in-Picture mode` block
const targetStr = `  // Track Picture-in-Picture mode\n  const [isPipActive, setIsPipActive] = useState<boolean>(() => {\n    return localStorage.getItem('s88_live_pip_active') === 'true';\n  });`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, targetStr + "\n" + hook);
  fs.writeFileSync('src/components/LiveStreamPanel.tsx', code);
  console.log('Chat simulation added');
} else {
  console.log('Target not found');
}
