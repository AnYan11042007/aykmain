const fs = require('fs');
let code = fs.readFileSync('src/components/modals/FcMobileModal.tsx', 'utf8');

const target = `const isGoal = Math.random() < 0.35;`;
const replace = `
            // ANTI-INFLATION BIAS: Lower goal probability if the shooter belongs to the user's chosen team
            let goalProb = 0.35;
            if (currentOwner.team === choice) {
              goalProb = 0.22; // User's team struggles to score more
            } else {
              goalProb = 0.40; // Opponent team scores slightly easier
            }
            const isGoal = Math.random() < goalProb;
`;
code = code.replace(target, replace);

fs.writeFileSync('src/components/modals/FcMobileModal.tsx', code);
console.log('FC RNG fixed');
