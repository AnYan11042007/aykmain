/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, fetchWithAuth } from '../../firebase';
import { X, Award, HelpCircle, ShieldCheck } from 'lucide-react';
import { User } from '../../types';
import { motion } from 'motion/react';
import { incrementMissionProgress } from '../../utils/missions';

interface HorseModalProps {
  uid: string;
  user: User | null;
  onClose: () => void;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

export default function HorseModal({ uid, user, onClose, onShowResult }: HorseModalProps) {
  const [betAmount, setBetAmount] = useState('');
  const [isRacing, setIsRacing] = useState(false);
  const [commentary, setCommentary] = useState('Vui lòng chọn ngựa và đặt cược...');
  
  // Admin forced winner override
  const [adminForceWinner, setAdminForceWinner] = useState<number | null>(null);

  // Horse positions as percentages
  const [positions, setPositions] = useState<number[]>([0, 0, 0, 0]);

  const [liveBets, setLiveBets] = useState<Array<{name: string; choice: number; amount: number}>>([]);
  
  useEffect(() => {
    if (isRacing) return;
    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        const botNames = ['Khá Bảnh', 'Huấn', 'Tiến Bịp', 'Dương Tuyền', 'Sơn Tùng', 'Jack', 'Độ Mixi', 'PewPew'];
        setLiveBets(prev => {
          const newBet = {
            name: botNames[Math.floor(Math.random() * botNames.length)],
            choice: Math.floor(Math.random() * 4) + 1,
            amount: (Math.floor(Math.random() * 10) + 1) * 1000
          };
          return [...prev, newBet].slice(-6);
        });
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [isRacing]);

  const raceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
    };
  }, []);

  const handleStartRace = async (choice: number) => {
    if (isRacing) return;

    const amt = parseInt(betAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Mức cược đua ngựa không hợp lệ!');
      return;
    }

    const currentPP = user?.pp || 0;
    if (currentPP < amt) {
      alert(`Bạn không có đủ PP để cược! Tài sản: ${currentPP.toLocaleString()} PP.`);
      return;
    }

    setIsRacing(true);
    setPositions([0, 0, 0, 0]);
    setCommentary(`Đang cược Ngựa số ${choice}... Cố lên!`);

    try {
      const res = await fetchWithAuth('/api/game/horse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice, betAmount: amt })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setIsRacing(false);
        alert(data.error || 'Lỗi khi đặt cược đua ngựa');
        return;
      }

      const winningHorse = data.winningHorse;
      let currentPositions = [0, 0, 0, 0];

      // Run race animation interval
      raceIntervalRef.current = setInterval(() => {
        let finished = false;

        const nextPositions = currentPositions.map((pos, idx) => {
          let step = Math.random() * 0.8 + 0.1;
          // Accelerate the determined winning horse
          if (idx + 1 === winningHorse) {
            step += 0.35;
          } else {
            step = Math.max(0.05, step - 0.1);
          }

          const nextPos = pos + step;
          if (nextPos >= 85 && !finished) {
            finished = true;
          }
          return nextPos;
        });

        currentPositions = nextPositions;
        setPositions(nextPositions);

        if (finished) {
          if (raceIntervalRef.current) {
            clearInterval(raceIntervalRef.current);
            raceIntervalRef.current = null;
          }
          setIsRacing(false);
          setCommentary(`NGỰA SỐ ${winningHorse} ĐÃ VỀ ĐÍCH ĐẦU TIÊN!`);

          setTimeout(() => {
            onClose();
            if (data.isWinner) {
              onShowResult(
                'THẮNG CƯỢC ĐUA NGỰA !',
                `Ngựa số ${winningHorse} bạn chọn đã về nhất xuất sắc!\nBạn giành chiến thắng: +${data.payout.toLocaleString()} PP!`,
                true
              );
            } else {
              onShowResult(
                'THẤT BẠI CƯỢC !',
                `Ngựa số ${winningHorse} đã về nhất.\nLựa chọn của bạn là Ngựa số ${choice} và mất đi -${amt.toLocaleString()} PP cược.`,
                false
              );
            }
          }, 1200);
        }
      }, 50);

    } catch (err) {
      setIsRacing(false);
      onShowResult(
        'LỖI GIAO DỊCH / BET FAILURE',
        'Giao dịch đặt cược không hợp lệ hoặc bị gián đoạn do độ trễ mạng. Vui lòng thử lại!',
        false
      );
    }
  };

  return (
    <div className="game-overlay bg-black/90 backdrop-blur-md">
      <div className="game-shell bg-[#120b05] border-0 md:border-2 md:border-[#d2a679] flex flex-col shadow-2xl font-mono">
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 shrink-0 flex items-center justify-between px-4 py-3 bg-[#1e1208]/95 border-b border-[#d2a679]/40 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <Award className="w-5 h-5 text-[#d2a679] shrink-0" />
            <div className="truncate">
              <h2 className="text-[#d2a679] text-base md:text-lg font-black uppercase tracking-wider truncate">
                TRƯỜNG ĐUA NGỰA HOÀNG GIA
              </h2>
              <span className="text-[10px] text-emerald-400 font-bold block truncate">
                Số dư: {(user?.pp || 0).toLocaleString()} PP
              </span>
            </div>
          </div>
          <button 
            onClick={isRacing ? undefined : onClose} 
            disabled={isRacing}
            aria-label="Đóng"
            className="game-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 space-y-4">
          <p className="text-[10px] text-[#8b949e] uppercase text-center tracking-wider">
            Đặt 1 ăn 3 - Lựa chọn chiến mã tài ba S-System
          </p>

          {/* Horse race track stadium - responsive height */}
          <div className="relative w-full h-[220px] sm:h-[260px] md:h-[280px] bg-[#2e1f11] border-2 md:border-4 border-amber-800/80 rounded-xl overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] select-none">
            
            {/* Finish Line checker board */}
            <div className="absolute top-0 bottom-0 right-[15%] w-2 bg-[repeating-linear-gradient(to_bottom,#fff_0,#fff_10px,#ff003c_10px,#ff003c_20px)] z-0 shadow-lg"></div>

            {/* Horse 1 lane */}
            <motion.div
              animate={{ left: `${positions[0]}%` }}
              transition={{ type: 'spring', stiffness: 45, damping: 11 }}
              className="absolute top-[8%] text-2xl sm:text-3xl z-10 flex items-center font-bold"
            >
              🐎 <span className="text-[9px] bg-white text-black rounded-full w-4 h-4 text-center leading-4 font-mono font-black border border-black shadow">1</span>
            </motion.div>

            {/* Horse 2 lane */}
            <motion.div
              animate={{ left: `${positions[1]}%` }}
              transition={{ type: 'spring', stiffness: 45, damping: 11 }}
              className="absolute top-[32%] text-2xl sm:text-3xl z-10 flex items-center font-bold"
            >
              🐎 <span className="text-[9px] bg-white text-black rounded-full w-4 h-4 text-center leading-4 font-mono font-black border border-black shadow">2</span>
            </motion.div>

            {/* Horse 3 lane */}
            <motion.div
              animate={{ left: `${positions[2]}%` }}
              transition={{ type: 'spring', stiffness: 45, damping: 11 }}
              className="absolute top-[56%] text-2xl sm:text-3xl z-10 flex items-center font-bold"
            >
              🐎 <span className="text-[9px] bg-white text-black rounded-full w-4 h-4 text-center leading-4 font-mono font-black border border-black shadow">3</span>
            </motion.div>

            {/* Horse 4 lane */}
            <motion.div
              animate={{ left: `${positions[3]}%` }}
              transition={{ type: 'spring', stiffness: 45, damping: 11 }}
              className="absolute top-[80%] text-2xl sm:text-3xl z-10 flex items-center font-bold"
            >
              🐎 <span className="text-[9px] bg-white text-black rounded-full w-4 h-4 text-center leading-4 font-mono font-black border border-black shadow">4</span>
            </motion.div>
          </div>

          {/* Live track commentary box */}
          <div className="bg-black/80 border border-[#d2a679]/40 rounded-xl p-3 min-h-[46px] flex items-center justify-center text-center font-mono text-xs sm:text-sm leading-relaxed text-slate-100 select-none shadow-inner">
            {commentary}
          </div>

          {/* Action Controls */}
          <div className="space-y-3 font-mono text-xs">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[#8b949e] uppercase font-bold text-[10px]">Số lượng PP đặt cược đua ngựa:</label>
                <span className="text-emerald-400 font-bold text-[10px]">Tài sản: {(user?.pp || 0).toLocaleString()} PP</span>
              </div>
              <input
                type="number"
                placeholder="Nhập số PP cược..."
                className="w-full min-h-[44px] bg-black/60 border border-[#30363d] focus:border-[#d2a679] rounded-xl p-3 text-center text-sm font-black text-[#ffd700] text-glow-gold outline-none"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isRacing}
              />
              <div className="grid grid-cols-4 gap-1.5">
                {['5000', '10000', '50000', '100000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    disabled={isRacing}
                    onClick={() => setBetAmount(amt)}
                    className={`min-h-[44px] text-xs font-black rounded-lg border transition cursor-pointer flex items-center justify-center ${
                      betAmount === amt
                        ? 'bg-[#d2a679]/20 border-[#d2a679] text-[#ffd700]'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {parseInt(amt) >= 1000 ? `${parseInt(amt) / 1000}K` : amt}
                  </button>
                ))}
              </div>
            </div>

            {!isRacing ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleStartRace(num)}
                    className="min-h-[44px] py-3 bg-zinc-950/40 hover:bg-[#d2a679]/20 border border-[#d2a679] text-[#ffd700] font-black rounded-xl uppercase cursor-pointer active:scale-95 transition flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>🐎</span> Ngựa {num} [x3]
                  </button>
                ))}
              </div>
            ) : (
              <button
                disabled
                className="w-full min-h-[48px] py-3.5 bg-zinc-950/20 border border-[#444] text-[#8b949e] font-black uppercase text-xs tracking-widest cursor-not-allowed rounded-xl flex items-center justify-center"
              >
                🐎 CÁC CHIẾN MÃ ĐANG BỨT TỐC TRÊN ĐƯỜNG ĐUA !
              </button>
            )}

            {/* REQUIREMENT 5: ADMIN MANUAL OVERRIDE */}
            {((user?.role as any) === 'ADMIN' || (user?.role as any) === 'TEACHER') && (
              <div className="mt-4 border-t border-red-500/20 pt-4 space-y-2 text-left">
                <span className="text-red-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 animate-pulse" /> ⚙️ ADMIN MANUAL OVERRIDE (CHỈ ADMIN THẤY)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdminForceWinner(null)}
                    className={`min-h-[44px] px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center ${
                      adminForceWinner === null
                        ? 'border-red-500 text-red-500 bg-red-950/20'
                        : 'border-white/5 bg-black/40 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    ❌ Thả tự do
                  </button>
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAdminForceWinner(num)}
                      className={`min-h-[44px] px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center ${
                        adminForceWinner === num
                          ? 'border-red-500 text-red-500 bg-red-950/20'
                          : 'border-white/5 bg-black/40 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      🐎 Ép Ngựa {num}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
