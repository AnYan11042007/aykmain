const fs = require('fs');
let code = fs.readFileSync('src/components/LiveStreamPanel.tsx', 'utf8');

// 1. Update GameType
code = code.replace("type GameType = 'taixiu' | 'crash' | 'penalty';", "type GameType = 'taixiu' | 'crash' | 'penalty' | 'horse' | 'claw' | 'fcmobile';");

// 2. Add cycles logic right before `// Broadcast PIP state changes dynamically`
const hookCycles = `  // Broadcast PIP state changes dynamically`;
const newCycles = `
  // --- HORSE RACING ---
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

  // --- CLAW MACHINE ---
  const clawCycleDuration = 25000;
  const clawBettingSecs = 10;
  const clawDroppingSecs = 10;
  const clawCycleId = Math.floor(currentTime / clawCycleDuration);
  const clawTimeElapsed = currentTime % clawCycleDuration;
  const clawSecondsElapsed = clawTimeElapsed / 1000;
  let clawPhase: 'BETTING' | 'DROPPING' | 'COOLDOWN' = 'BETTING';
  let clawCountdown = 0;
  let clawTimerText = '';
  if (clawSecondsElapsed < clawBettingSecs) {
    clawPhase = 'BETTING';
    clawCountdown = Math.ceil(clawBettingSecs - clawSecondsElapsed);
    clawTimerText = \`Nhận cược: \${clawCountdown}s\`;
  } else if (clawSecondsElapsed < clawBettingSecs + clawDroppingSecs) {
    clawPhase = 'DROPPING';
    clawTimerText = 'Máy đang gắp thú...';
  } else {
    clawPhase = 'COOLDOWN';
    clawCountdown = Math.ceil(clawCycleDuration / 1000 - clawSecondsElapsed);
    clawTimerText = \`Chờ lượt tiếp theo: \${clawCountdown}s\`;
  }

  // --- FC MOBILE ---
  const fcCycleDuration = 45000;
  const fcBettingSecs = 15;
  const fcPlayingSecs = 20;
  const fcCycleId = Math.floor(currentTime / fcCycleDuration);
  const fcTimeElapsed = currentTime % fcCycleDuration;
  const fcSecondsElapsed = fcTimeElapsed / 1000;
  let fcPhase: 'BETTING' | 'PLAYING' | 'COOLDOWN' = 'BETTING';
  let fcCountdown = 0;
  let fcTimerText = '';
  if (fcSecondsElapsed < fcBettingSecs) {
    fcPhase = 'BETTING';
    fcCountdown = Math.ceil(fcBettingSecs - fcSecondsElapsed);
    fcTimerText = \`Nhận cược: \${fcCountdown}s\`;
  } else if (fcSecondsElapsed < fcBettingSecs + fcPlayingSecs) {
    fcPhase = 'PLAYING';
    fcTimerText = 'Trận đấu đang diễn ra...';
  } else {
    fcPhase = 'COOLDOWN';
    fcCountdown = Math.ceil(fcCycleDuration / 1000 - fcSecondsElapsed);
    fcTimerText = \`Chờ ván mới: \${fcCountdown}s\`;
  }

  // Broadcast PIP state changes dynamically`;

code = code.replace(hookCycles, newCycles);

// 3. Update getSyncResultForCycle
const targetResult = `      const isGoal = strikerTarget !== goalieDive && r3 > 0.12;\n      return { target: strikerTarget, dive: goalieDive, isGoal };\n    }\n  };`;
const newResult = `      const isGoal = strikerTarget !== goalieDive && r3 > 0.12;\n      return { target: strikerTarget, dive: goalieDive, isGoal };\n    } else if (type === 'horse') {\n      return (Math.floor(r1 * 4) + 1).toString();\n    } else if (type === 'claw') {\n      return r1 > 0.8 ? 'WIN' : 'LOSE';\n    } else {\n      const blueScore = Math.floor(r1 * 4);\n      const redScore = Math.floor(r2 * 4);\n      return { blue: blueScore, red: redScore };\n    }\n  };`;
code = code.replace(targetResult, newResult);

fs.writeFileSync('src/components/LiveStreamPanel.tsx', code);
console.log('Update Livestream Phase 1 Done');
