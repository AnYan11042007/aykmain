const fs = require('fs');

['src/components/modals/ClawModal.tsx', 'src/components/modals/FcMobileModal.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  
  const headerTarget = `<h2 className="text-xl font-black font-sans tracking-wide uppercase flex items-center gap-2">`;
  const headerReplace = `<div className="flex items-center gap-3">
            <span className="py-0.5 px-2 bg-red-600 text-white font-black text-[10px] uppercase tracking-wider rounded flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
              LIVE
            </span>
            <span className="text-[10px] text-white/70 font-bold bg-black/40 py-0.5 px-2 rounded-md border border-white/5">
              👁 2,1${Math.floor(Math.random()*90)+10} xem
            </span>
          </div>
          <h2 className="text-xl font-black font-sans tracking-wide uppercase flex items-center gap-2 mt-2">`;
  
  if (code.includes(headerTarget)) {
    code = code.replace(headerTarget, headerReplace);
    fs.writeFileSync(file, code);
    console.log(file + ' Live UI added');
  }
});
