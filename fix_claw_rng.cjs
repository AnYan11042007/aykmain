const fs = require('fs');
let code = fs.readFileSync('src/components/modals/ClawModal.tsx', 'utf8');

const targetHitPrize = `        if (hitPrize) {`;
const replaceHitPrize = `
        if (hitPrize) {
          // ADD RNG SLIP CHANCE LIKE REAL CLAW MACHINES TO PREVENT INFLATION
          let slipChance = 0.5; // default 50%
          if (hitPrize.mult === 10) slipChance = 0.90; // 90% slip for Jackpot
          else if (hitPrize.mult === 5) slipChance = 0.70; // 70% slip
          else if (hitPrize.mult === 2) slipChance = 0.40; // 40% slip
          
          if (Math.random() < slipChance) {
             hitPrize = null; // slipped!
          }
        }
        if (hitPrize) {`;

code = code.replace(targetHitPrize, replaceHitPrize);

fs.writeFileSync('src/components/modals/ClawModal.tsx', code);
console.log('Claw RNG added');
