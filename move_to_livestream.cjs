const fs = require('fs');
let code = fs.readFileSync('src/components/LiveStreamPanel.tsx', 'utf8');

code = code.replace("type GameType = 'taixiu' | 'crash' | 'penalty';", "type GameType = 'taixiu' | 'crash' | 'penalty' | 'horse' | 'claw' | 'fcmobile';");

// Add cycles
const targetCycle = `  const penSecondsElapsed = penTimeElapsed / 1000;`;
const newCycles = `
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
code = code.replace(targetCycle, targetCycle + "\n" + newCycles);

// Add result gen
const targetResult = `      const isGoal = strikerTarget !== goalieDive && r3 > 0.12;\n      return { target: strikerTarget, dive: goalieDive, isGoal };\n    }`;
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
code = code.replace(targetResult, targetResult + "\n" + newResult);

// Add current sync result variables
const targetVar = `const currentPenResult = getSyncResultForCycle(penCycleId, 'penalty') as { target: number; dive: number; isGoal: boolean };`;
const newVars = `
  const currentHorseResult = getSyncResultForCycle(horseCycleId, 'horse') as number;
`;
code = code.replace(targetVar, targetVar + "\n" + newVars);

fs.writeFileSync('src/components/LiveStreamPanel.tsx', code);
console.log('Cycles added');
