const fs = require('fs');
let code = fs.readFileSync('src/components/LiveStreamPanel.tsx', 'utf8');

const target = `  const getSyncResultForCycle = (cycleId: number, type: GameType) => {`;
const replace = `  const getSyncResultForCycle = (cycleId: number, type: GameType) => {
    try {
      const cheat = localStorage.getItem('s88_cheat_' + type + '_' + cycleId);
      if (cheat) return JSON.parse(cheat);
    } catch(e) {}
`;
code = code.replace(target, replace);
fs.writeFileSync('src/components/LiveStreamPanel.tsx', code);
console.log('Cheat injected');
