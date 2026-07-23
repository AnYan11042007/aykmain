/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { get, ref, update, push } from 'firebase/database';
import { db } from '../../firebase';
import { X, Sparkles, HelpCircle } from 'lucide-react';
import { User } from '../../types';
import { motion } from 'motion/react';

interface ClawModalProps {
  uid: string;
  user: User | null;
  onClose: () => void;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

interface Prize {
  id: string;
  type: string;
  name: string;
  mult: number;
  x: number;
  dir: number;
  speed: number;
  visible?: boolean;
}

export default function ClawModal({ uid, user, onClose, onShowResult }: ClawModalProps) {
  const [betAmount, setBetAmount] = useState('10000');
  const [isClawActive, setIsClawActive] = useState(false);
  const [isClawDropping, setIsClawDropping] = useState(false);
  const [clawMsg, setClawMsg] = useState('🦄 Kỳ Lân (x10) | 🧸 Gấu / 🐼 Trúc (x3) | 🦊 Cáo / 🐧 Cụt (x2)');

  // Crane & Caught positions
  const [craneTop, setCraneTop] = useState(-10);
  const [craneChar, setCraneChar] = useState('🏗️');
  const [grabbedType, setGrabbedChar] = useState('');
  const [grabbedVisible, setGrabbedVisible] = useState(false);
  const [grabbedTop, setGrabbedTop] = useState(250);

  // Prizes positions state
  const [prizes, setPrizes] = useState<Prize[]>([
    { id: 'prize-1', type: '🦄', name: 'Kỳ Lân Hồng', mult: 10, x: 10, dir: 1, speed: 2.2 },
    { id: 'prize-2', type: '🧸', name: 'Gấu Bông', mult: 3, x: 28, dir: -1, speed: 1.8 },
    { id: 'prize-3', type: '🐼', name: 'Panda', mult: 3, x: 48, dir: 1, speed: 2.0 },
    { id: 'prize-4', type: '🐧', name: 'Chim Cánh Cụt', mult: 2, x: 68, dir: -1, speed: 2.5 },
    { id: 'prize-5', type: '🦊', name: 'Cáo Đỏ', mult: 2, x: 88, dir: 1, speed: 1.6 }
  ]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Run continuous horizontal bouncing plushies movement
    intervalRef.current = setInterval(() => {
      if (isClawDropping) return;

      setPrizes((prev) =>
        prev.map((p) => {
          let nextX = p.x + p.dir * p.speed;
          let nextDir = p.dir;
          if (nextX >= 88) {
            nextX = 88;
            nextDir = -1;
          } else if (nextX <= 5) {
            nextX = 5;
            nextDir = 1;
          }
          return { ...p, x: nextX, dir: nextDir };
        })
      );
    }, 40);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isClawDropping]);

  const handleClawAction = async () => {
    if (isClawDropping) return;

    const amt = parseInt(betAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Mức cược Gắp Thú không hợp lệ!');
      return;
    }

    if (!isClawActive) {
      const currentPP = user?.pp || 0;
      if (currentPP < amt) {
        alert(`Bạn không có đủ PP để gắp thú! Tài sản hiện tại: ${currentPP.toLocaleString()} PP.`);
        return;
      }

      // Deduct PP initially
      try {
        (window as any).__s88_last_legit_tx = Date.now();
        await update(ref(db, `users/${uid}`), { pp: currentPP - amt });

        // Save bet transaction ledger
        await push(ref(db, 'transactions'), {
          sender: uid,
          senderName: user?.name || 'Sinh Viên',
          receiver: 'SYSTEM_CLAW',
          receiverName: 'Máy Gắp Thú S88',
          amount: amt,
          message: `Cược Gắp Thú: Gắp thú 1 lượt (${amt.toLocaleString()} PP)`,
          time: new Date().toLocaleString('vi-VN'),
          timestamp: Date.now()
        });

        setIsClawActive(true);
        setClawMsg('🎯 BẮT ĐẦU! Hãy quan sát thú di chuyển và nhấn [ GẮP XUỐNG NGAY ] khi thú đi qua hồng tâm!');
      } catch (err) {
        setIsClawActive(false);
        setIsClawDropping(false);
        onShowResult(
          'LỖI GIAO DỊCH',
          'Giao dịch đặt cược không hợp lệ hoặc bị gián đoạn do độ trễ mạng. Vui lòng thử lại!',
          false
        );
      }
    } else {
      // Release Claw Drop down!
      setIsClawDropping(true);
      setClawMsg('🦾 Đang hạ ngàm gắp kim loại xuống...');
      setCraneTop(210); // Claw moves down to prize lane

      setTimeout(() => {
        // Evaluate catch diff (checking offset near 48% dead center line)
        let hitPrize: Prize | null = null;
        let minDiff = 999;

        prizes.forEach((p) => {
          const diff = Math.abs(p.x - 48);
          if (diff < 8 && diff < minDiff) {
            minDiff = diff;
            hitPrize = p;
          }
        });

        if (hitPrize) {
          // RNG Slip chance logic
          let slipChance = 0.35; // 35% base slip
          if (hitPrize.mult === 10) slipChance = 0.70; // 70% slip for Jackpot Unicorn
          else if (hitPrize.mult === 3) slipChance = 0.40;
          else if (hitPrize.mult === 2) slipChance = 0.25;

          if (Math.random() < slipChance) {
            hitPrize = null; // Slipped!
          }
        }

        if (hitPrize) {
          // Visual caught styling
          setCraneChar('🤏');
          setGrabbedChar(hitPrize.type);
          setGrabbedVisible(true);
          setGrabbedTop(210);
          setClawMsg(`🎉 QUÁ ĐỈNH! Ngàm gắp đã tóm chặt ${hitPrize.name} (${hitPrize.type})! Đang kéo lên...`);

          // Temporarily hide caught prize from lane list
          const caughtId = hitPrize.id;
          setPrizes((prev) => prev.map((p) => p.id === caughtId ? { ...p, visible: false } : p));
        } else {
          setCraneChar('🏗️');
          setClawMsg('💨 Hụt rồi! Thú đã né thoát ngàm gắp. Đang thu ngàm về...');
        }

        // Pull Crane claw back up to top
        setCraneTop(-10);
        setGrabbedTop(30);

        setTimeout(async () => {
          if (hitPrize) {
            const pWin = amt * hitPrize.mult;
            try {
              const uSnap = await get(ref(db, `users/${uid}`));
              const freshPP = uSnap.val()?.pp || 0;

              // Credit payout
              (window as any).__s88_last_legit_tx = Date.now();
              await update(ref(db, `users/${uid}`), { pp: freshPP + pWin });

              await push(ref(db, 'transactions'), {
                sender: 'SYSTEM_CLAW',
                senderName: 'Máy Gắp Thú S88',
                receiver: uid,
                receiverName: user?.name || 'Sinh Viên',
                amount: pWin,
                message: `Thắng Gắp Thú: Gắp trúng ${hitPrize.type} ${hitPrize.name} x${hitPrize.mult}`,
                time: new Date().toLocaleString('vi-VN'),
                timestamp: Date.now()
              });

              await push(ref(db, 'game_logs'), {
                uid,
                name: user?.name || 'Sinh Viên',
                game: 'Gắp Thú',
                bet: amt,
                pnl: pWin - amt,
                result: `Thắng (Gắp trúng ${hitPrize.type} x${hitPrize.mult})`,
                time: new Date().toLocaleString('vi-VN'),
                timestamp: Date.now()
              });

              onShowResult(
                'GẮP TRÚNG THÀNH CÔNG 🎉',
                `Xin chúc mừng! Bạn đã gắp thành công: ${hitPrize.type} ${hitPrize.name}!\nNhận thưởng nhân x${hitPrize.mult} cược: +${pWin.toLocaleString()} PP!`,
                true
              );
            } catch (err) {
              console.error(err);
            }
          } else {
            try {
              await push(ref(db, 'game_logs'), {
                uid,
                name: user?.name || 'Sinh Viên',
                game: 'Gắp Thú',
                bet: amt,
                pnl: -amt,
                result: `Thua (Hụt)`,
                time: new Date().toLocaleString('vi-VN'),
                timestamp: Date.now()
              });

              onShowResult(
                'GẮP HỤT MẤT RỒI 💸',
                `Mũi ngàm chỉ gắp được không khí...\nBạn bị trừ -${amt.toLocaleString()} PP cược. Lần sau canh kỹ hơn nhé!`,
                false
              );
            } catch (err) {
              console.error(err);
            }
          }

          // Restore machine layout
          setIsClawActive(false);
          setIsClawDropping(false);
          setGrabbedVisible(false);
          setGrabbedTop(250);
          setCraneChar('🏗️');
          setClawMsg('🦄 Kỳ Lân (x10) | 🧸 Gấu / 🐼 Trúc (x3) | 🦊 Cáo / 🐧 Cụt (x2)');

          // Re-enable visibility of all prizes in list
          setPrizes((prev) => prev.map((p) => ({ ...p, visible: true })));
        }, 900);

      }, 900);
    }
  };

  return (
    <div className="overlay z-[5000]">
      <div className="glass-box login-panel overflow-y-auto max-h-[90vh] w-[95vw] md:w-full max-w-[620px] p-6 border-[#ff69b4] relative font-mono">
        <button 
          onClick={isClawDropping ? undefined : onClose} 
          disabled={isClawDropping}
          className={`absolute top-4 right-4 text-[#8b949e] hover:text-white cursor-pointer transition ${isClawDropping ? 'opacity-20 cursor-not-allowed' : ''}`}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-[#ff69b4] text-glow-pink text-2xl font-black uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
          <Sparkles className="w-5 h-5 animate-pulse text-[#ff69b4]" /> MÁY GẮP THÚ S-88 VIP
        </h2>
        <p className="text-[10px] text-[#8b949e] uppercase mb-4 text-center">
          Thú di chuyển sống động • Ngàm gắp kim loại ma trận
        </p>

        {/* Claw machine visual box */}
        <div className="relative w-full h-[320px] bg-gradient-to-b from-[#1a0b1a] via-[#1f002b] to-[#0a0012] border-4 border-[#ff69b4] rounded-2xl overflow-hidden shadow-[inset_0_0_50px_rgba(255,105,180,0.6)] select-none mb-4">
          
          {/* Middle Targeting laser beam */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-[#ff69b4]/40 border-l border-dashed border-[#ff69b4] z-0 animate-pulse" />
          <div className="absolute left-1/2 top-2 -translate-x-1/2 text-[9px] bg-[#ff69b4] text-black font-black px-2 py-0.5 rounded-full z-20 uppercase tracking-widest shadow-[0_0_10px_rgba(255,105,180,0.8)]">
            🎯 HỒNG TÂM
          </div>
          
          {/* Grid visual overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,105,180,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,105,180,0.08)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
          
          {/* Machine floor turf */}
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-pink-950/80 to-transparent border-t border-pink-500/30 z-0" />

          {/* Vertical claw rope thread */}
          <motion.div 
            animate={{ height: `${Math.max(0, craneTop + 24)}px` }}
            transition={{ type: 'spring', stiffness: 50, damping: 12 }}
            className="absolute left-1/2 -translate-x-1/2 w-2 bg-gradient-to-b from-slate-300 via-slate-100 to-pink-400 z-10 shadow-[0_0_8px_rgba(255,105,180,0.8)]"
          />

          {/* Crane Hook icon */}
          <motion.div
            animate={{ top: `${craneTop}px` }}
            transition={{ type: 'spring', stiffness: 50, damping: 12 }}
            className="absolute left-1/2 -translate-x-1/2 text-5xl z-10 select-none flex items-center justify-center filter drop-shadow-[0_4px_10px_rgba(255,105,180,0.8)]"
          >
            {craneChar}
          </motion.div>

          {/* Floating Walking Plushies list row */}
          <div className="absolute bottom-[16px] left-0 w-full h-14 text-[42px] z-10 select-none">
            {prizes.map((p) => (
              <div
                key={p.id}
                style={{
                  left: `${p.x}%`,
                  display: p.visible !== false ? 'flex' : 'none'
                }}
                className={`absolute flex-col items-center justify-center transition-all duration-[0.04s] ease-linear leading-none ${
                  p.dir > 0 ? 'scale-x-100' : '-scale-x-100'
                }`}
              >
                <span className="animate-bounce inline-block filter drop-shadow-lg">
                  {p.type}
                </span>
                <span className="text-[8px] font-black bg-black/80 text-pink-300 px-1 py-0.2 rounded border border-pink-500/40 uppercase whitespace-nowrap mt-0.5">
                  x{p.mult}
                </span>
              </div>
            ))}
          </div>

          {/* Visual Caught Prize pulling back up */}
          {grabbedVisible && (
            <motion.div
              animate={{ top: `${grabbedTop}px` }}
              transition={{ type: 'spring', stiffness: 50, damping: 12 }}
              className="absolute left-1/2 -translate-x-1/2 text-[44px] z-20 select-none filter drop-shadow-[0_0_15px_rgba(255,215,0,0.9)] animate-pulse"
            >
              {grabbedType}
            </motion.div>
          )}
        </div>

        {/* Claw instructions display */}
        <div className="bg-black/80 border border-[#ff69b4]/50 rounded-xl p-3 min-h-[52px] flex items-center justify-center text-center text-xs leading-relaxed text-pink-200 mb-4 select-none shadow-inner">
          {clawMsg}
        </div>

        {/* Action Controls */}
        <div className="space-y-3.5">
          {!isClawActive && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[#8b949e] uppercase font-bold text-[10px]">SỐ PP ĐẶT CƯỢC 1 LƯỢT:</label>
                <span className="text-emerald-400 font-bold text-[10px]">Số dư: {(user?.pp || 0).toLocaleString()} PP</span>
              </div>
              <input
                type="number"
                placeholder="Nhập số PP cược..."
                className="w-full bg-black/70 border border-[#30363d] focus:border-[#ff69b4] rounded-xl p-3 text-center text-sm font-black text-[#ffd700] outline-none"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isClawDropping}
              />
            </div>
          )}

          <button
            onClick={handleClawAction}
            disabled={isClawDropping}
            className={`w-full py-3.5 font-black rounded-xl uppercase tracking-widest text-xs transition-all cursor-pointer border shadow-lg ${
              isClawDropping
                ? 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'
                : isClawActive
                ? 'bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 hover:to-green-300 text-black border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.6)] animate-pulse'
                : 'bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white border-pink-300 shadow-[0_0_20px_rgba(255,105,180,0.5)]'
            }`}
          >
            {isClawDropping ? (
              <>🦾 ĐANG HẠ NGÀM GẮP THÚ...</>
            ) : isClawActive ? (
              <>[ 🎯 GẮP XUỐNG NGAY ! ]</>
            ) : (
              <>[ CHƠI GẮP THÚ ]</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
