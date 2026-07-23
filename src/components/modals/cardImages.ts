// SVG Card Illustrations for World Card Battle matching uploaded artwork

export const getCardImageSvg = (cardId: string): string => {
  switch (cardId) {
    case 'c_ss1': // SS Tối Thượng Thần Ma (ULTIMATE SS OVERPOWERED CARD)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_css1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4c0519"/>
              <stop offset="25%" stop-color="#881337"/>
              <stop offset="50%" stop-color="#581c87"/>
              <stop offset="75%" stop-color="#1e1b4b"/>
              <stop offset="100%" stop-color="#020617"/>
            </linearGradient>
            <radialGradient id="ss_gold_glow" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stop-color="#fde047" stop-opacity="1"/>
              <stop offset="30%" stop-color="#f43f5e" stop-opacity="0.8"/>
              <stop offset="70%" stop-color="#a855f7" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="ss_sword_grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="30%" stop-color="#fef08a"/>
              <stop offset="70%" stop-color="#f43f5e"/>
              <stop offset="100%" stop-color="#38bdf8"/>
            </linearGradient>
          </defs>

          <!-- Background & Cosmic Divine Aura -->
          <rect width="400" height="533" fill="url(#bg_css1)"/>
          <circle cx="200" cy="210" r="190" fill="url(#ss_gold_glow)"/>

          <!-- Divine Dragon Wings / Flame Rays -->
          <path d="M200,210 Q80,50 10,160 Q70,230 200,210 Z" fill="#f43f5e" opacity="0.85"/>
          <path d="M200,210 Q320,50 390,160 Q330,230 200,210 Z" fill="#f43f5e" opacity="0.85"/>
          <path d="M200,210 Q100,100 30,230 Q100,270 200,210 Z" fill="#fde047" opacity="0.9"/>
          <path d="M200,210 Q300,100 370,230 Q300,270 200,210 Z" fill="#fde047" opacity="0.9"/>

          <!-- Golden Crown Halo & Orbs -->
          <circle cx="200" cy="180" r="110" fill="none" stroke="#fde047" stroke-width="6" stroke-dasharray="12 8"/>
          <circle cx="200" cy="180" r="125" fill="none" stroke="#a855f7" stroke-width="4"/>
          <polygon points="200,40 215,80 250,80 220,100 235,140 200,115 165,140 180,100 150,80 185,80" fill="#facc15" stroke="#ffffff" stroke-width="3"/>

          <!-- Ultimate Greatsword of Destruction -->
          <polygon points="200,60 215,280 200,320 185,280" fill="url(#ss_sword_grad)" stroke="#ffffff" stroke-width="3"/>
          <line x1="200" y1="60" x2="200" y2="320" stroke="#ffffff" stroke-width="4"/>
          <!-- Sword Crossguard -->
          <path d="M140,280 Q200,260 260,280 Q200,300 140,280 Z" fill="#facc15" stroke="#e11d48" stroke-width="3"/>
          <circle cx="200" cy="280" r="14" fill="#e11d48" stroke="#ffffff" stroke-width="3"/>

          <!-- Floating Energy Runes -->
          <circle cx="90" cy="120" r="16" fill="#f43f5e" opacity="0.9"/>
          <circle cx="310" cy="120" r="16" fill="#06b6d4" opacity="0.9"/>
          <circle cx="70" cy="280" r="20" fill="#a855f7" opacity="0.9"/>
          <circle cx="330" cy="280" r="20" fill="#facc15" opacity="0.9"/>

          <!-- SS Emblem Banner -->
          <rect x="70" y="360" width="260" height="50" rx="12" fill="#090d16" stroke="#facc15" stroke-width="3"/>
          <text x="200" y="394" font-family="sans-serif" font-weight="900" font-size="24" fill="#fde047" text-anchor="middle" letter-spacing="2">SS - TỐI THƯỢNG</text>

          <!-- Bottom Footer Stats Bar -->
          <rect x="15" y="455" width="370" height="65" rx="14" fill="#020617" stroke="#f43f5e" stroke-width="3"/>
          <text x="35" y="495" font-family="sans-serif" font-weight="900" font-size="20" fill="#f43f5e">ATK: 250</text>
          <text x="200" y="495" font-family="sans-serif" font-weight="900" font-size="18" fill="#fde047" text-anchor="middle">CỰC BÁ</text>
          <text x="365" y="495" font-family="sans-serif" font-weight="900" font-size="20" fill="#38bdf8" text-anchor="end">DEF: 250</text>
        </svg>
      `)}`;
    case 'c1': // Chiến Binh Gào Thét (ATTACK)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#991b1b"/>
              <stop offset="50%" stop-color="#dc2626"/>
              <stop offset="100%" stop-color="#450a0a"/>
            </linearGradient>
            <radialGradient id="flame" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="40%" stop-color="#f97316"/>
              <stop offset="100%" stop-color="#b91c1c" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <!-- Background & Fire Aura -->
          <rect width="400" height="533" fill="url(#bg_c1)"/>
          <circle cx="200" cy="220" r="180" fill="url(#flame)"/>
          <path d="M50,300 Q120,100 200,180 Q280,100 350,300 Q200,220 50,300" fill="#f97316" opacity="0.6"/>
          <path d="M80,350 Q150,150 200,210 Q250,150 320,350 Q200,260 80,350" fill="#fef08a" opacity="0.8"/>
          
          <!-- Character Portrait: Screaming Warrior with Glasses -->
          <!-- Hair -->
          <path d="M120,180 C110,120 160,80 210,80 C260,80 290,110 280,170 C290,140 310,190 280,210 C260,190 240,190 210,180" fill="#262626"/>
          <path d="M110,170 C130,110 190,70 240,75 C290,80 300,130 290,180" fill="#171717"/>
          
          <!-- Face -->
          <path d="M140,150 L260,150 C270,220 250,280 200,300 C150,280 130,220 140,150 Z" fill="#fca5a5"/>
          <!-- Neck & Shirt -->
          <path d="M160,280 L240,280 L270,380 L130,380 Z" fill="#fee2e2"/>
          <path d="M130,380 L200,290 L270,380 L290,450 L110,450 Z" fill="#ffffff"/>
          
          <!-- Open Screaming Mouth -->
          <ellipse cx="205" cy="245" rx="30" ry="25" fill="#7f1d1d"/>
          <path d="M185,230 Q205,225 225,230 C220,240 190,240 185,230" fill="#ffffff"/>
          <ellipse cx="205" cy="255" rx="18" ry="8" fill="#f43f5e"/>
          
          <!-- Eyes & Glasses -->
          <!-- Glasses Frame -->
          <rect x="145" y="155" width="48" height="36" rx="8" fill="none" stroke="#e2e8f0" stroke-width="5"/>
          <rect x="207" y="155" width="48" height="36" rx="8" fill="none" stroke="#e2e8f0" stroke-width="5"/>
          <line x1="193" y1="170" x2="207" y2="170" stroke="#e2e8f0" stroke-width="5"/>
          <line x1="125" y1="165" x2="145" y2="168" stroke="#e2e8f0" stroke-width="4"/>
          <line x1="255" y1="168" x2="275" y2="165" stroke="#e2e8f0" stroke-width="4"/>
          <!-- Eyes -->
          <ellipse cx="169" cy="173" rx="10" ry="8" fill="#ffffff"/>
          <circle cx="169" cy="173" r="5" fill="#450a0a"/>
          <ellipse cx="231" cy="173" rx="10" ry="8" fill="#ffffff"/>
          <circle cx="231" cy="173" r="5" fill="#450a0a"/>
          <!-- Eyebrows (Intense) -->
          <path d="M140,150 L190,162" stroke="#171717" stroke-width="6" stroke-linecap="round"/>
          <path d="M260,150 L210,162" stroke="#171717" stroke-width="6" stroke-linecap="round"/>

          <!-- Title Banner Overlay -->
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#7f1d1d" opacity="0.9" stroke="#fca5a5" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="22" fill="#ffffff" text-anchor="middle">CHIẾN BINH GÀO THẾT</text>
          
          <!-- Role Badge -->
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#dc2626" stroke="#fef08a" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: TẤN CÔNG</text>
          
          <!-- Stats Bar -->
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#450a0a" stroke="#f87171" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 80</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 30</text>
        </svg>
      `)}`;

    case 'c2': // Lá Chắn Sốc (DEFENSE)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1e3a8a"/>
              <stop offset="50%" stop-color="#2563eb"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
            <radialGradient id="shield_glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
              <stop offset="70%" stop-color="#0284c7" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="#1e40af" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c2)"/>
          
          <!-- Shield Dome Grid -->
          <circle cx="200" cy="240" r="170" fill="url(#shield_glow)" stroke="#7dd3fc" stroke-width="4" stroke-dasharray="12 6"/>
          <path d="M80,240 C80,120 320,120 320,240 C320,360 80,360 80,240 Z" fill="none" stroke="#38bdf8" stroke-width="3" opacity="0.6"/>
          
          <!-- Character Portrait: Pointing Guy with Glasses -->
          <path d="M130,170 C120,110 180,80 220,80 C260,80 280,120 270,170" fill="#1e1b4b"/>
          <path d="M140,150 L260,150 C270,220 250,270 200,290 C150,270 130,220 140,150 Z" fill="#fde047" opacity="0.9"/>
          <!-- Pointing Arm -->
          <path d="M100,280 Q60,220 40,200 L70,190 Q110,230 140,270 Z" fill="#1d4ed8"/>
          <circle cx="40" cy="195" r="14" fill="#fde047"/>
          
          <!-- Excited Mouth -->
          <ellipse cx="200" cy="235" rx="18" ry="18" fill="#1e1b4b"/>
          <ellipse cx="200" cy="230" rx="14" ry="6" fill="#ffffff"/>

          <!-- Glasses -->
          <rect x="150" y="155" width="42" height="32" rx="6" fill="none" stroke="#ffffff" stroke-width="5"/>
          <rect x="208" y="155" width="42" height="32" rx="6" fill="none" stroke="#ffffff" stroke-width="5"/>
          <line x1="192" y1="168" x2="208" y2="168" stroke="#ffffff" stroke-width="5"/>
          <circle cx="171" cy="171" r="5" fill="#0f172a"/>
          <circle cx="229" cy="171" r="5" fill="#0f172a"/>

          <!-- Title Banner -->
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#1e3a8a" opacity="0.95" stroke="#60a5fa" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">LÁ CHẮN SỐC</text>

          <!-- Role Badge -->
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#2563eb" stroke="#93c5fd" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: PHÒNG THỦ</text>

          <!-- Stats Bar -->
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#0f172a" stroke="#38bdf8" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 10</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 90</text>
        </svg>
      `)}`;

    case 'c3': // Kẻ Trêu Chọc Vô Tận (SPECIAL)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#581c87"/>
              <stop offset="50%" stop-color="#7e22ce"/>
              <stop offset="100%" stop-color="#3b0764"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c3)"/>
          
          <!-- Swirl background -->
          <path d="M50,50 Q200,300 350,50 Q200,500 50,50 Z" fill="#a855f7" opacity="0.3"/>
          <path d="M350,533 Q200,200 50,533 Q200,0 350,533 Z" fill="#eab308" opacity="0.3"/>

          <!-- Mischievous Character -->
          <path d="M130,160 C120,90 190,70 230,80 C270,90 280,130 270,180" fill="#292524"/>
          <path d="M140,150 L260,150 C270,220 250,270 200,290 C150,270 130,220 140,150 Z" fill="#fed7aa"/>
          
          <!-- Sticking Tongue Out -->
          <path d="M180,240 Q200,235 220,240 C215,280 185,280 180,240" fill="#f43f5e"/>
          <line x1="200" y1="240" x2="200" y2="265" stroke="#be123c" stroke-width="2"/>

          <!-- Glasses (Winking one eye) -->
          <rect x="145" y="155" width="44" height="34" rx="6" fill="none" stroke="#fef08a" stroke-width="5"/>
          <rect x="211" y="155" width="44" height="34" rx="6" fill="none" stroke="#fef08a" stroke-width="5"/>
          <line x1="189" y1="172" x2="211" y2="172" stroke="#fef08a" stroke-width="5"/>
          
          <!-- Winking Eye (Left) & Open Eye (Right) -->
          <path d="M155,172 L179,172" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
          <circle cx="233" cy="172" r="6" fill="#1c1917"/>

          <!-- Title Banner -->
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#6b21a8" opacity="0.95" stroke="#fde047" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">KẺ TRÊU CHỌC VÔ TẬN</text>

          <!-- Role Badge -->
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#a855f7" stroke="#fef08a" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: ĐẶC BIỆT</text>

          <!-- Stats Bar -->
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#3b0764" stroke="#c084fc" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#facc15">ATK: 40</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 40</text>
        </svg>
      `)}`;

    case 'c4': // Khiên Phòng Thủ (DEFENSE)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0e7490"/>
              <stop offset="50%" stop-color="#155e75"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c4)"/>
          
          <!-- Cyan Hex Barrier Grid -->
          <polygon points="200,80 280,120 280,200 200,240 120,200 120,120" fill="none" stroke="#22d3ee" stroke-width="4" opacity="0.8"/>
          <polygon points="200,160 320,220 320,340 200,400 80,340 80,220" fill="none" stroke="#06b6d4" stroke-width="3" opacity="0.5"/>

          <!-- Character -->
          <path d="M140,150 L260,150 C270,220 250,270 200,290 C150,270 130,220 140,150 Z" fill="#fecdd3"/>
          <rect x="150" y="155" width="42" height="32" rx="6" fill="none" stroke="#0891b2" stroke-width="5"/>
          <rect x="208" y="155" width="42" height="32" rx="6" fill="none" stroke="#0891b2" stroke-width="5"/>
          <line x1="192" y1="168" x2="208" y2="168" stroke="#0891b2" stroke-width="5"/>
          
          <!-- Title Banner -->
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#155e75" opacity="0.95" stroke="#67e8f9" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="22" fill="#ffffff" text-anchor="middle">KHIÊN PHÒNG THỦ</text>

          <!-- Role Badge -->
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#06b6d4" stroke="#a5f3fc" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: PHÒNG THỦ</text>

          <!-- Stats Bar -->
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#083344" stroke="#22d3ee" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 20</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 90</text>
        </svg>
      `)}`;

    case 'c5': // Thấy Mà Ghe (SPECIAL - Cyber Glitch)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c5" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#b45309"/>
              <stop offset="50%" stop-color="#7e22ce"/>
              <stop offset="100%" stop-color="#065f46"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c5)"/>
          
          <!-- Glitch Lines & Digital Grid -->
          <rect x="40" y="100" width="320" height="12" fill="#f43f5e" opacity="0.7"/>
          <rect x="80" y="220" width="240" height="8" fill="#06b6d4" opacity="0.8"/>
          <rect x="60" y="310" width="280" height="10" fill="#eab308" opacity="0.6"/>

          <!-- Character Glitch Face -->
          <path d="M140,150 L260,150 C270,220 250,270 200,290 C150,270 130,220 140,150 Z" fill="#fed7aa"/>
          <rect x="145" y="155" width="44" height="32" rx="4" fill="none" stroke="#22c55e" stroke-width="5"/>
          <rect x="211" y="155" width="44" height="32" rx="4" fill="none" stroke="#ec4899" stroke-width="5"/>
          
          <!-- Title Banner -->
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#78350f" stroke="#fef08a" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="22" fill="#ffffff" text-anchor="middle">THẤY MÀ GHE</text>

          <!-- Role Badge -->
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#d97706" stroke="#fde047" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: ĐẶC BIỆT</text>

          <!-- Stats Bar -->
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#451a03" stroke="#f59e0b" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 0</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 60</text>
        </svg>
      `)}`;

    case 'c6': // Đấm Phát Chết Luôn (ATTACK)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c6" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0284c7"/>
              <stop offset="50%" stop-color="#2563eb"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c6)"/>
          
          <!-- Energy Spiral Punch FX -->
          <path d="M200,240 Q100,100 300,120 Q350,280 200,240 Z" fill="#38bdf8" opacity="0.5"/>
          <path d="M200,240 Q300,380 100,320 Q50,180 200,240 Z" fill="#60a5fa" opacity="0.6"/>
          
          <!-- Massive Glowing Fist -->
          <circle cx="200" cy="240" r="50" fill="#0ea5e9" stroke="#ffffff" stroke-width="6"/>
          <path d="M170,220 L230,220 L220,260 L180,260 Z" fill="#0284c7"/>

          <!-- Character Portrait Head -->
          <path d="M160,110 L240,110 C250,160 230,200 200,210 C170,200 150,160 160,110 Z" fill="#fca5a5"/>
          <rect x="165" y="125" width="30" height="22" rx="4" fill="none" stroke="#1e293b" stroke-width="4"/>
          <rect x="205" y="125" width="30" height="22" rx="4" fill="none" stroke="#1e293b" stroke-width="4"/>

          <!-- Title Banner -->
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#0369a1" opacity="0.95" stroke="#38bdf8" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">ĐẤM PHÁT CHẾT LUÔN</text>

          <!-- Role Badge -->
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#0284c7" stroke="#7dd3fc" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: TẤN CÔNG</text>

          <!-- Stats Bar -->
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#0c4a6e" stroke="#38bdf8" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 120</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 40</text>
        </svg>
      `)}`;

    case 'c7': // Kiểm Soát Thời Gian (SUPPORT)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c7" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#b45309"/>
              <stop offset="50%" stop-color="#854d0e"/>
              <stop offset="100%" stop-color="#1c1917"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c7)"/>
          
          <!-- Golden Clock Gears -->
          <circle cx="200" cy="220" r="110" fill="none" stroke="#facc15" stroke-width="6" stroke-dasharray="16 8"/>
          <line x1="200" y1="220" x2="200" y2="140" stroke="#fef08a" stroke-width="5" stroke-linecap="round"/>
          <line x1="200" y1="220" x2="250" y2="220" stroke="#fef08a" stroke-width="5" stroke-linecap="round"/>
          
          <!-- Character Portrait -->
          <path d="M140,150 L260,150 C270,220 250,270 200,290 C150,270 130,220 140,150 Z" fill="#fde047" opacity="0.9"/>
          <rect x="150" y="155" width="42" height="32" rx="6" fill="none" stroke="#78350f" stroke-width="5"/>
          <rect x="208" y="155" width="42" height="32" rx="6" fill="none" stroke="#78350f" stroke-width="5"/>

          <!-- Title Banner -->
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#a16207" opacity="0.95" stroke="#fde047" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">KIỂM SOÁT THỜI GIAN</text>

          <!-- Role Badge -->
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#ca8a04" stroke="#fef08a" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: CHỨC NĂNG</text>

          <!-- Stats Bar -->
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#451a03" stroke="#eab308" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 0</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 60</text>
        </svg>
      `)}`;

    case 'c8': // Điều Chỉnh Chỉ Số (SUPPORT)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c8" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1d4ed8"/>
              <stop offset="50%" stop-color="#4f46e5"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c8)"/>
          
          <!-- Hologram Charts -->
          <rect x="100" y="220" width="20" height="60" fill="#38bdf8" opacity="0.8"/>
          <rect x="140" y="180" width="20" height="100" fill="#818cf8" opacity="0.8"/>
          <rect x="240" y="160" width="20" height="120" fill="#34d399" opacity="0.8"/>
          <rect x="280" y="200" width="20" height="80" fill="#f43f5e" opacity="0.8"/>

          <!-- Character Portrait -->
          <path d="M140,140 L260,140 C270,210 250,260 200,280 C150,260 130,210 140,140 Z" fill="#fde047" opacity="0.9"/>
          <rect x="150" y="145" width="42" height="32" rx="6" fill="none" stroke="#1e1b4b" stroke-width="5"/>
          <rect x="208" y="145" width="42" height="32" rx="6" fill="none" stroke="#1e1b4b" stroke-width="5"/>

          <!-- Title Banner -->
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#1e40af" opacity="0.95" stroke="#93c5fd" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">ĐIỀU CHỈNH CHỈ SỐ</text>

          <!-- Role Badge -->
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#3b82f6" stroke="#bfdbfe" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: CHỨC NĂNG</text>

          <!-- Stats Bar -->
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#172554" stroke="#60a5fa" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 0</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 60</text>
        </svg>
      `)}`;

    case 'c10': // Hỏa Long Tế Điện (ATTACK)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c10" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#7f1d1d"/>
              <stop offset="50%" stop-color="#c2410c"/>
              <stop offset="100%" stop-color="#450a0a"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c10)"/>
          <path d="M50,150 Q200,50 350,150 Q200,350 50,150 Z" fill="#ea580c" opacity="0.6"/>
          <circle cx="200" cy="220" r="80" fill="#f97316" opacity="0.8"/>
          <path d="M120,200 L280,200 L200,320 Z" fill="#fef08a"/>
          
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#991b1b" stroke="#fed7aa" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">HỎA LONG TẾ ĐIỆN</text>

          <rect x="110" y="380" width="180" height="32" rx="8" fill="#ea580c" stroke="#fde047" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: TẤN CÔNG</text>

          <rect x="10" y="460" width="380" height="60" rx="12" fill="#450a0a" stroke="#f97316" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 130</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 30</text>
        </svg>
      `)}`;

    case 'c11': // Băng Giáp Vô Cực (DEFENSE)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c11" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0369a1"/>
              <stop offset="50%" stop-color="#0284c7"/>
              <stop offset="100%" stop-color="#082f49"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c11)"/>
          <polygon points="200,60 330,150 330,300 200,390 70,300 70,150" fill="none" stroke="#7dd3fc" stroke-width="6"/>
          <circle cx="200" cy="225" r="70" fill="#0284c7" opacity="0.8"/>
          
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#075985" stroke="#bae6fd" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">BĂNG GIÁP VÔ CỰC</text>

          <rect x="110" y="380" width="180" height="32" rx="8" fill="#0284c7" stroke="#e0f2fe" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: PHÒNG THỦ</text>

          <rect x="10" y="460" width="380" height="60" rx="12" fill="#0c4a6e" stroke="#38bdf8" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 20</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 120</text>
        </svg>
      `)}`;

    case 'c12': // Đạo Sĩ Hồi Sinh (SUPPORT)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c12" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#15803d"/>
              <stop offset="50%" stop-color="#16a34a"/>
              <stop offset="100%" stop-color="#052e16"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c12)"/>
          <circle cx="200" cy="220" r="100" fill="none" stroke="#4ade80" stroke-width="5" stroke-dasharray="10 5"/>
          <path d="M170,220 L230,220 M200,190 L200,250" stroke="#fef08a" stroke-width="12" stroke-linecap="round"/>

          <rect x="20" y="20" width="360" height="48" rx="10" fill="#166534" stroke="#bbf7d0" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">ĐẠO SĨ HỒI SINH</text>

          <rect x="110" y="380" width="180" height="32" rx="8" fill="#16a34a" stroke="#fef08a" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: CHỨC NĂNG</text>

          <rect x="10" y="460" width="380" height="60" rx="12" fill="#14532d" stroke="#4ade80" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 40</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 70</text>
        </svg>
      `)}`;

    case 'c13': // Phù Thủy Thời Gian (SUPPORT)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c13" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#6b21a8"/>
              <stop offset="50%" stop-color="#9333ea"/>
              <stop offset="100%" stop-color="#3b0764"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c13)"/>
          <polygon points="200,100 230,180 310,180 240,230 270,310 200,260 130,310 160,230 90,180 170,180" fill="#eab308" opacity="0.8"/>

          <rect x="20" y="20" width="360" height="48" rx="10" fill="#581c87" stroke="#fef08a" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">PHÙ THỦY THỜI GIAN</text>

          <rect x="110" y="380" width="180" height="32" rx="8" fill="#892432" stroke="#fde047" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: CHỨC NĂNG</text>

          <rect x="10" y="460" width="380" height="60" rx="12" fill="#581c87" stroke="#c084fc" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#facc15">ATK: 50</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 50</text>
        </svg>
      `)}`;

    case 'c14': // Sát Thủ Bóng Đêm (ATTACK)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c14" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#111827"/>
              <stop offset="50%" stop-color="#374151"/>
              <stop offset="100%" stop-color="#000000"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c14)"/>
          <path d="M100,100 L300,300 M300,100 L100,300" stroke="#f43f5e" stroke-width="12" stroke-linecap="round"/>
          
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#1f2937" stroke="#f43f5e" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">SÁT THỦ BÓNG ĐÊM</text>

          <rect x="110" y="380" width="180" height="32" rx="8" fill="#e11d48" stroke="#fda4af" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: TẤN CÔNG</text>

          <rect x="10" y="460" width="380" height="60" rx="12" fill="#111827" stroke="#f43f5e" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 140</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 25</text>
        </svg>
      `)}`;

    case 'c15': // Thiên Thần Hộ Vệ (DEFENSE)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c15" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0284c7"/>
              <stop offset="50%" stop-color="#38bdf8"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c15)"/>
          <path d="M200,100 Q100,180 50,300 Q180,260 200,380 Q220,260 350,300 Q300,180 200,100 Z" fill="#ffffff" opacity="0.85"/>

          <rect x="20" y="20" width="360" height="48" rx="10" fill="#0369a1" stroke="#e0f2fe" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">THIÊN THẦN HỘ VỆ</text>

          <rect x="110" y="380" width="180" height="32" rx="8" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: PHÒNG THỦ</text>

          <rect x="10" y="460" width="380" height="60" rx="12" fill="#0c4a6e" stroke="#7dd3fc" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 15</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 110</text>
        </svg>
      `)}`;

    case 'c16': // Lôi Thần Nộ Phóng (ATTACK)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c16" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#854d0e"/>
              <stop offset="50%" stop-color="#ca8a04"/>
              <stop offset="100%" stop-color="#422006"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c16)"/>
          <polygon points="220,50 120,240 210,240 170,420 300,200 200,200" fill="#fef08a" stroke="#eab308" stroke-width="4"/>

          <rect x="20" y="20" width="360" height="48" rx="10" fill="#713f12" stroke="#fef08a" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">LÔI THẦN NỘ PHÓNG</text>

          <rect x="110" y="380" width="180" height="32" rx="8" fill="#a16207" stroke="#fde047" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: TẤN CÔNG</text>

          <rect x="10" y="460" width="380" height="60" rx="12" fill="#422006" stroke="#facc15" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 150</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 20</text>
        </svg>
      `)}`;

    case 'c17': // Ma Trận Phản Chiếu (DEFENSE)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c17" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#312e81"/>
              <stop offset="50%" stop-color="#4338ca"/>
              <stop offset="100%" stop-color="#1e1b4b"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c17)"/>
          <rect x="80" y="100" width="240" height="240" rx="20" fill="none" stroke="#818cf8" stroke-width="6" transform="rotate(45 200 220)"/>

          <rect x="20" y="20" width="360" height="48" rx="10" fill="#3730a3" stroke="#c7d2fe" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">MA TRẬN PHẢN CHIẾU</text>

          <rect x="110" y="380" width="180" height="32" rx="8" fill="#4f46e5" stroke="#a5b4fc" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: PHÒNG THỦ</text>

          <rect x="10" y="460" width="380" height="60" rx="12" fill="#1e1b4b" stroke="#818cf8" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 30</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 100</text>
        </svg>
      `)}`;

    case 'c18': // Dược Sĩ Hoàng Gia (SUPPORT)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c18" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#047857"/>
              <stop offset="50%" stop-color="#10b981"/>
              <stop offset="100%" stop-color="#064e3b"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c18)"/>
          <path d="M160,150 L240,150 L260,300 C260,340 140,340 140,300 Z" fill="#6ee7b7" opacity="0.8"/>

          <rect x="20" y="20" width="360" height="48" rx="10" fill="#065f46" stroke="#a7f3d0" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">DƯỢC SĨ HOÀNG GIA</text>

          <rect x="110" y="380" width="180" height="32" rx="8" fill="#059669" stroke="#fef08a" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: CHỨC NĂNG</text>

          <rect x="10" y="460" width="380" height="60" rx="12" fill="#064e3b" stroke="#34d399" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#facc15">ATK: 35</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 65</text>
        </svg>
      `)}`;

    case 'c19': // Trảm Hồn Kiếm Thánh (ATTACK)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c19" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#be123c"/>
              <stop offset="50%" stop-color="#e11d48"/>
              <stop offset="100%" stop-color="#4c0519"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c19)"/>
          <path d="M180,60 L220,60 L210,340 L190,340 Z" fill="#fecdd3" stroke="#ffffff" stroke-width="3"/>
          <rect x="150" y="340" width="100" height="20" rx="5" fill="#f59e0b"/>

          <rect x="20" y="20" width="360" height="48" rx="10" fill="#9f1239" stroke="#fecdd3" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">TRẢM HỒN KIẾM THÁNH</text>

          <rect x="110" y="380" width="180" height="32" rx="8" fill="#e11d48" stroke="#fde047" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: TẤN CÔNG</text>

          <rect x="10" y="460" width="380" height="60" rx="12" fill="#4c0519" stroke="#fb7185" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 135</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 35</text>
        </svg>
      `)}`;

    case 'c20': // Pháo Băng Bất Hoại (DEFENSE)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c20" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1e3a8a"/>
              <stop offset="50%" stop-color="#0284c7"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c20)"/>
          <rect x="140" y="100" width="120" height="220" rx="20" fill="#38bdf8" stroke="#ffffff" stroke-width="5"/>

          <rect x="20" y="20" width="360" height="48" rx="10" fill="#1e40af" stroke="#93c5fd" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">PHÁO BĂNG BẤT HOẠI</text>

          <rect x="110" y="380" width="180" height="32" rx="8" fill="#2563eb" stroke="#bfdbfe" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: PHÒNG THỦ</text>

          <rect x="10" y="460" width="380" height="60" rx="12" fill="#172554" stroke="#60a5fa" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 25</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 115</text>
        </svg>
      `)}`;

    case 'c21': // Thần Ma Trảm (ATTACK)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c21" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#881337"/>
              <stop offset="50%" stop-color="#be123c"/>
              <stop offset="100%" stop-color="#4c0519"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c21)"/>
          <path d="M70,80 L330,340 M330,80 L70,340" stroke="#f43f5e" stroke-width="14" stroke-linecap="round"/>
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#9f1239" stroke="#fda4af" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">THẦN MA TRẢM</text>
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#e11d48" stroke="#fde047" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: TẤN CÔNG</text>
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#4c0519" stroke="#fb7185" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 145</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 35</text>
        </svg>
      `)}`;

    case 'c22': // Kim Cang Bộc Phá (DEFENSE)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c22" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1e293b"/>
              <stop offset="50%" stop-color="#0284c7"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c22)"/>
          <polygon points="200,80 320,160 320,310 200,390 80,310 80,160" fill="none" stroke="#00f0ff" stroke-width="8"/>
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#0369a1" stroke="#38bdf8" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">KIM CANG BỘC PHÁ</text>
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#0284c7" stroke="#e0f2fe" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: PHÒNG THỦ</text>
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#0c4a6e" stroke="#38bdf8" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 30</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 125</text>
        </svg>
      `)}`;

    case 'c23': // Thiên Biến Vạn Hóa (SUPPORT)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c23" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#581c87"/>
              <stop offset="50%" stop-color="#a855f7"/>
              <stop offset="100%" stop-color="#3b0764"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c23)"/>
          <circle cx="200" cy="220" r="110" fill="none" stroke="#e9d5ff" stroke-width="6" stroke-dasharray="16 8"/>
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#6b21a8" stroke="#f3e8ff" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">THIÊN BIẾN VẠN HÓA</text>
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#9333ea" stroke="#fde047" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: CHỨC NĂNG</text>
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#3b0764" stroke="#c084fc" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#facc15">ATK: 45</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 65</text>
        </svg>
      `)}`;

    case 'c24': // Độc Ma Xâm Nhập (ATTACK)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c24" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#14532d"/>
              <stop offset="50%" stop-color="#16a34a"/>
              <stop offset="100%" stop-color="#052e16"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c24)"/>
          <path d="M140,100 Q200,20 260,100 Q320,200 200,340 Q80,200 140,100 Z" fill="#4ade80" opacity="0.8"/>
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#166534" stroke="#bbf7d0" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">ĐỘC MA XÂM NHẬP</text>
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#15803d" stroke="#fde047" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: TẤN CÔNG</text>
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#052e16" stroke="#4ade80" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 135</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 40</text>
        </svg>
      `)}`;

    case 'c25': // Bát Quái Trận Đồ (DEFENSE)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c25" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1e1b4b"/>
              <stop offset="50%" stop-color="#4338ca"/>
              <stop offset="100%" stop-color="#020617"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c25)"/>
          <circle cx="200" cy="220" r="120" fill="none" stroke="#a5b4fc" stroke-width="6"/>
          <path d="M200,100 A120,120 0 0,0 200,340 A60,60 0 0,1 200,220 A60,60 0 0,0 200,100" fill="#ffffff"/>
          <circle cx="200" cy="160" r="18" fill="#000000"/>
          <circle cx="200" cy="280" r="18" fill="#ffffff"/>
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#312e81" stroke="#c7d2fe" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">BÁT QUÁI TRẬN ĐỒ</text>
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#3730a3" stroke="#e0e7ff" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: PHÒNG THỦ</text>
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#1e1b4b" stroke="#818cf8" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 25</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 120</text>
        </svg>
      `)}`;

    case 'c26': // Lôi Đình Vô Cực (ATTACK)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c26" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#a16207"/>
              <stop offset="50%" stop-color="#eab308"/>
              <stop offset="100%" stop-color="#451a03"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c26)"/>
          <polygon points="210,40 120,230 220,230 160,420 310,190 200,190" fill="#fef08a" stroke="#ca8a04" stroke-width="5"/>
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#854d0e" stroke="#fef08a" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">LÔI ĐÌNH VÔ CỰC</text>
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#ca8a04" stroke="#fde047" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: TẤN CÔNG</text>
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#451a03" stroke="#facc15" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 155</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 25</text>
        </svg>
      `)}`;

    case 'c27': // Thánh Quang Hộ Thể (SUPPORT)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c27" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0284c7"/>
              <stop offset="50%" stop-color="#38bdf8"/>
              <stop offset="100%" stop-color="#0c4a6e"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c27)"/>
          <circle cx="200" cy="220" r="100" fill="#ffffff" opacity="0.3"/>
          <path d="M170,220 L230,220 M200,190 L200,250" stroke="#ffffff" stroke-width="12" stroke-linecap="round"/>
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#0369a1" stroke="#bae6fd" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">THÁNH QUANG HỘ THỂ</text>
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#0284c7" stroke="#fde047" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: CHỨC NĂNG</text>
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#0c4a6e" stroke="#38bdf8" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#facc15">ATK: 35</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 75</text>
        </svg>
      `)}`;

    case 'c28': // Nhiệt Diệm Hồn (ATTACK)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c28" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#c2410c"/>
              <stop offset="50%" stop-color="#ea580c"/>
              <stop offset="100%" stop-color="#431407"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c28)"/>
          <path d="M100,280 Q200,60 300,280 Q200,220 100,280 Z" fill="#fef08a" opacity="0.9"/>
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#9a3412" stroke="#fed7aa" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">NHIỆT DIỆM HỒN</text>
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#ea580c" stroke="#fde047" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: TẤN CÔNG</text>
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#431407" stroke="#f97316" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 140</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 30</text>
        </svg>
      `)}`;

    case 'c29': // Địa Lô Cuồng Nộ (DEFENSE)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c29" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#3f6212"/>
              <stop offset="50%" stop-color="#65a30d"/>
              <stop offset="100%" stop-color="#1a2e05"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c29)"/>
          <rect x="100" y="100" width="200" height="220" rx="30" fill="#a3e635" stroke="#ffffff" stroke-width="6"/>
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#365314" stroke="#d9f99d" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">ĐỊA LÔ CUỒNG NỘ</text>
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#65a30d" stroke="#ecfccb" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: PHÒNG THỦ</text>
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#1a2e05" stroke="#84cc16" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#ef4444">ATK: 35</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 110</text>
        </svg>
      `)}`;

    case 'c30': // Thần Dược Bất Tử (SUPPORT)
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_c30" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0f766e"/>
              <stop offset="50%" stop-color="#0d9488"/>
              <stop offset="100%" stop-color="#042f2e"/>
            </linearGradient>
          </defs>
          <rect width="400" height="533" fill="url(#bg_c30)"/>
          <circle cx="200" cy="220" r="90" fill="#2dd4bf" opacity="0.8"/>
          <rect x="20" y="20" width="360" height="48" rx="10" fill="#115e59" stroke="#99f6e4" stroke-width="3"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">THẦN DƯỢC BẤT TỬ</text>
          <rect x="110" y="380" width="180" height="32" rx="8" fill="#0d9488" stroke="#fde047" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="16" fill="#ffffff" text-anchor="middle">LOẠI: CHỨC NĂNG</text>
          <rect x="10" y="460" width="380" height="60" rx="12" fill="#042f2e" stroke="#2dd4bf" stroke-width="3"/>
          <text x="30" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#facc15">ATK: 20</text>
          <text x="370" y="498" font-family="sans-serif" font-weight="900" font-size="18" fill="#38bdf8" text-anchor="end">DEF: 80</text>
        </svg>
      `)}`;

    default: {
      const num = parseInt(cardId.replace('c', '')) || 1;
      const hue = (num * 37) % 360;
      const hue2 = (hue + 45) % 360;
      const hue3 = (hue + 180) % 360;

      const isAttack = num % 3 === 1;
      const isDefense = num % 3 === 2;
      const roleText = isAttack ? 'TẤN CÔNG' : isDefense ? 'PHÒNG THỦ' : 'HỖ TRỢ';

      // Shape variation based on num
      const shapeType = num % 5; // 0: Star, 1: Diamond Crest, 2: Shield, 3: Fire Flame, 4: Hexagon Core

      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_${cardId}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="hsl(${hue}, 85%, 25%)"/>
              <stop offset="50%" stop-color="hsl(${hue2}, 90%, 45%)"/>
              <stop offset="100%" stop-color="hsl(${hue3}, 95%, 10%)"/>
            </linearGradient>
            <radialGradient id="glow_${cardId}" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="hsl(${hue2}, 100%, 75%)" stop-opacity="0.9"/>
              <stop offset="60%" stop-color="hsl(${hue}, 80%, 40%)" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
            </radialGradient>
          </defs>
          
          <rect width="400" height="533" rx="16" fill="url(#bg_${cardId})" stroke="hsl(${hue2}, 100%, 70%)" stroke-width="5"/>
          <circle cx="200" cy="220" r="145" fill="url(#glow_${cardId})"/>

          ${
            shapeType === 0
              ? `<polygon points="200,80 235,165 320,165 250,215 275,295 200,245 125,295 150,215 80,165 165,165" fill="hsl(${hue2}, 100%, 65%)" stroke="#ffffff" stroke-width="3"/>`
              : shapeType === 1
              ? `<polygon points="200,80 310,220 200,340 90,220" fill="hsl(${hue2}, 90%, 60%)" stroke="#ffffff" stroke-width="4"/>`
              : shapeType === 2
              ? `<path d="M100,100 L300,100 L320,240 Q200,360 80,240 Z" fill="hsl(${hue2}, 85%, 50%)" stroke="#ffffff" stroke-width="4"/>`
              : shapeType === 3
              ? `<path d="M200,80 Q280,180 250,260 Q200,320 150,260 Q120,180 200,80 Z" fill="hsl(${hue2}, 100%, 60%)" stroke="#fde047" stroke-width="4"/>`
              : `<polygon points="200,90 300,150 300,270 200,330 100,270 100,150" fill="hsl(${hue2}, 95%, 55%)" stroke="#38bdf8" stroke-width="4"/>`
          }

          <!-- Center Emblem Icon -->
          <circle cx="200" cy="210" r="45" fill="#090d16" stroke="hsl(${hue2}, 100%, 80%)" stroke-width="3"/>
          <text x="200" y="222" font-family="sans-serif" font-weight="900" font-size="32" fill="#ffffff" text-anchor="middle">#${num}</text>

          <!-- Top Title Banner -->
          <rect x="20" y="20" width="360" height="48" rx="10" fill="hsl(${hue}, 80%, 20%)" opacity="0.95" stroke="hsl(${hue2}, 100%, 75%)" stroke-width="2"/>
          <text x="200" y="52" font-family="sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">THẺ CHIẾN ĐẤU #${num}</text>

          <!-- Role Badge -->
          <rect x="110" y="380" width="180" height="32" rx="8" fill="hsl(${hue2}, 90%, 40%)" stroke="#ffffff" stroke-width="2"/>
          <text x="200" y="402" font-family="sans-serif" font-weight="800" font-size="15" fill="#ffffff" text-anchor="middle">LOẠI: ${roleText}</text>

          <!-- Bottom Footer Stats Bar -->
          <rect x="15" y="460" width="370" height="58" rx="12" fill="#090d16" stroke="hsl(${hue2}, 80%, 50%)" stroke-width="2"/>
          <text x="35" y="496" font-family="sans-serif" font-weight="900" font-size="17" fill="#facc15">ATK: ${60 + (num % 80)}</text>
          <text x="365" y="496" font-family="sans-serif" font-weight="900" font-size="17" fill="#38bdf8" text-anchor="end">DEF: ${30 + ((num * 3) % 70)}</text>
        </svg>
      `)}`;
    }
  }
};

export const getCardBackSvg = (): string => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
      <defs>
        <linearGradient id="card_back_bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0a16"/>
          <stop offset="40%" stop-color="#1e1b4b"/>
          <stop offset="80%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#020617"/>
        </linearGradient>
        <radialGradient id="card_back_glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.6"/>
          <stop offset="60%" stop-color="#a855f7" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="533" rx="20" fill="url(#card_back_bg)" stroke="#38bdf8" stroke-width="6"/>
      <rect x="15" y="15" width="370" height="503" rx="16" fill="none" stroke="#facc15" stroke-width="3" stroke-dasharray="10 6"/>
      <circle cx="200" cy="266" r="160" fill="url(#card_back_glow)"/>
      <circle cx="200" cy="266" r="115" fill="none" stroke="#00f0ff" stroke-width="5"/>
      <polygon points="200,165 232,236 305,236 245,280 268,350 200,305 132,350 155,280 95,236 168,236" fill="#facc15" opacity="0.95" stroke="#ffffff" stroke-width="3"/>
      <text x="200" y="415" font-family="sans-serif" font-weight="900" font-size="30" fill="#fde047" text-anchor="middle" letter-spacing="4">AYK8686</text>
      <text x="200" y="445" font-family="sans-serif" font-weight="800" font-size="14" fill="#38bdf8" text-anchor="middle" letter-spacing="3">WORLD CARD ARENA</text>
    </svg>
  `)}`;
};
