const fs = require('fs');
let code = fs.readFileSync('src/components/modals/FcMobileModal.tsx', 'utf8');

// replace the old hook
const oldHookRegex = /\/\/ Keyboard Shortcuts for Power Users[\s\S]*?\}, \[phase, handleConfirmBet, onClose\]\);\n/g;

const newHook = `
  // Keyboard Shortcuts for Power Users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isMatchActive && betChoice !== '') {
          handleStartMatch(betChoice as 'BLUE' | 'RED');
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        if (!isMatchActive) {
          setBetAmount('');
          setBetChoice('');
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMatchActive, betChoice, handleStartMatch, onClose, setBetAmount, setBetChoice]);
`;

code = code.replace(oldHookRegex, newHook);
fs.writeFileSync('src/components/modals/FcMobileModal.tsx', code);
console.log('Fixed shortcuts');
