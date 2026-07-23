const fs = require('fs');
let code = fs.readFileSync('src/components/LiveStreamPanel.tsx', 'utf8');

// Undo the cycles addition completely.
// I will just use `git checkout` wait there's no git. I'll just remove the appended stuff.
// Wait, I can just replace "type GameType = 'taixiu' | 'crash' | 'penalty' | 'horse' | 'claw' | 'fcmobile';" back to "type GameType = 'taixiu' | 'crash' | 'penalty';"

code = code.replace("type GameType = 'taixiu' | 'crash' | 'penalty' | 'horse' | 'claw' | 'fcmobile';", "type GameType = 'taixiu' | 'crash' | 'penalty';");

const targetCycle = `
  const horseCycleDuration = 35000;
  const horseBettingSecs = 15;
  const horseRacingSecs = 15;
  const horseCycleId = Math.floor(currentTime / horseCycleDuration);
  const horseTimeElapsed = currentTime % horseCycleDuration;
  const horseSecondsElapsed = horseTimeElapsed / 1000;
  let horsePhase: 'BETTING' | 'RACING' | 'COOLDOWN' = 'BETTING';
  let horseCountdown = 0;
  let horseTimerText = '';
  if (horseSecondsElapsed < horseBettingSecs) {
    horsePhase = 'BETTING';
    horseCountdown = Math.ceil(horseBettingSecs - horseSecondsElapsed);
    horseTimerText = \`Nhận cược: \${horseCountdown}s\`;
  } else if (horseSecondsElapsed < horseBettingSecs + horseRacingSecs) {
    horsePhase = 'RACING';
    horseTimerText = 'Cuộc đua đang diễn ra...';
  } else {
    horsePhase = 'COOLDOWN';
    horseCountdown = Math.ceil(horseCycleDuration / 1000 - horseSecondsElapsed);
    horseTimerText = \`Chờ ván mới: \${horseCountdown}s\`;
  }
`;
code = code.replace(targetCycle, "");

const newResult = `
    } else if (type === 'horse') {
      const winner = Math.floor(r1 * 4) + 1; // 1 to 4
      return winner;
    } else if (type === 'claw') {
      const isWin = r1 > 0.85; // 15% win rate
      return isWin;
    } else if (type === 'fcmobile') {
      const blueScore = Math.floor(r1 * 4);
      const redScore = Math.floor(r2 * 4);
      return { blue: blueScore, red: redScore };
    }`;
code = code.replace(newResult, "");

const newVars = `
  const currentHorseResult = getSyncResultForCycle(horseCycleId, 'horse') as number;
`;
code = code.replace(newVars, "");

fs.writeFileSync('src/components/LiveStreamPanel.tsx', code);
