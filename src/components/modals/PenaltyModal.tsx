/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { get, ref, update, push } from 'firebase/database';
import { db } from '../../firebase';
import { X, Trophy, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { User } from '../../types';
import { incrementMissionProgress } from '../../utils/missions';

interface PenaltyModalProps {
  uid: string;
  user: User | null;
  onClose: () => void;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

export default function PenaltyModal({ uid, user, onClose, onShowResult }: PenaltyModalProps) {
  // Betting states
  const [betAmount, setBetAmount] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShooting, setIsShooting] = useState(false);

  // Admin force outcome
  const [adminForceOutcome, setAdminForceOutcome] = useState<'GOAL' | 'SAVE' | 'MISS' | 'NONE'>('NONE');

  // Match details
  const [shotsLeft, setShotsLeft] = useState(5);
  const [goalsScored, setGoalsScored] = useState(0);
  const [currentShot, setCurrentShot] = useState(1);
  const [commentary, setCommentary] = useState('Nhập số PP cược toàn bộ loạt sút 5 quả!');

  // Visual position state (values are percentages)
  const [ballPos, setBallPos] = useState({ left: 50, top: 85, scale: 1 });
  const [gkPos, setGkPos] = useState({ left: 50, top: 20 });
  const [cursorPos, setCursorPos] = useState(0);

  const powerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cursorDirRef = useRef<number>(4); // Speed multiplier

  useEffect(() => {
    return () => {
      if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);
    };
  }, []);

  const handleStartPenalty = async () => {
    const amt = parseInt(betAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Mức cược Penalty không hợp lệ!');
      return;
    }

    const currentPP = user?.pp || 0;
    if (currentPP < amt) {
      alert(`Bạn không có đủ PP để cược! Tài sản: ${currentPP.toLocaleString()} PP.`);
      return;
    }

    try {
      // Deduct PP initially
      await update(ref(db, `users/${uid}`), { pp: currentPP - amt });

      // Save deduction transaction ledger write immediately
      await push(ref(db, 'transactions'), {
        sender: uid,
        senderName: user?.name || 'Sinh Viên',
        receiver: 'SYSTEM_PENALTY',
        receiverName: 'Đá Luân Lưu S88',
        amount: amt,
        message: `Cược Penalty: Đá luân lưu 5 quả`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      // Initialize match layout
      setIsPlaying(true);
      setShotsLeft(5);
      setGoalsScored(0);
      setCurrentShot(1);
      setCommentary('Canh thanh chạy (RẤT NHANH) và bấm SÚT NGAY!');
      
      resetShotPositions();
      startPowerBarLoop();
    } catch (err) {
      setIsPlaying(false);
      onShowResult(
        'LỖI GIAO DỊCH / BET FAILURE',
        'Giao dịch đặt cược không hợp lệ hoặc bị gián đoạn do độ trễ mạng. Vui lòng thử lại!',
        false
      );
    }
  };

  const startPowerBarLoop = () => {
    if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);

    setCursorPos(0);
    cursorDirRef.current = 4; // Fast movement step

    powerIntervalRef.current = setInterval(() => {
      setCursorPos((prev) => {
        let next = prev + cursorDirRef.current;
        if (next >= 100) {
          next = 100;
          cursorDirRef.current = -4;
        } else if (next <= 0) {
          next = 0;
          cursorDirRef.current = 4;
        }
        return next;
      });
    }, 20);
  };

  const resetShotPositions = () => {
    setIsShooting(false);
    setBallPos({ left: 50, top: 85, scale: 1 });
    setGkPos({ left: 50, top: 20 });
  };

  const handleShoot = () => {
    if (isShooting || !isPlaying) return;
    setIsShooting(true);

    // Stop power shuttle indicator
    if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);

    const power = cursorPos;
    let finalBallX = 50;
    let finalBallY = 15;
    let isCritical = false;

    // Determine shot path based on power value
    if (power < 20) finalBallX = 10;
    else if (power < 40) finalBallX = 30;
    else if (power < 60) finalBallX = 50;
    else if (power < 80) finalBallX = 70;
    else finalBallX = 90;

    // Corner and extreme angles
    if (Math.abs(power - 50) < 6) {
      // Perfect dead-center Panenka shot
      isCritical = true;
      finalBallX = 50;
      finalBallY = 7;
    } else if (power < 15 || power > 85) {
      // Unsaveable corner pockets
      isCritical = true;
      finalBallX = power < 15 ? 5 : 95;
      finalBallY = 5;
    }

    let isMiss = power < 3 || power > 97; // Bắn chim nếu lực quá gắt

    // Goalkeeper AI reactions
    let finalGkX = 50;
    const gkRand = Math.random();

    if (isCritical) {
      // Goalkeeper gets confused on critical pocket shots
      finalGkX = gkRand > 0.5 ? 20 : 80;
    } else {
      // 70% chance goalie dives in the correct direction
      if (gkRand < 0.7) {
        finalGkX = finalBallX;
      } else {
        finalGkX = gkRand < 0.85 ? finalBallX - 20 : finalBallX + 20;
      }
    }

    // Apply Admin Override if set
    if (adminForceOutcome === 'GOAL') {
      isMiss = false;
      isCritical = true;
      finalGkX = finalBallX > 50 ? 15 : 85; // goalie dives away
    } else if (adminForceOutcome === 'SAVE') {
      isMiss = false;
      isCritical = false;
      finalGkX = finalBallX; // goalie dives exactly on ball
    } else if (adminForceOutcome === 'MISS') {
      isMiss = true;
    }

    // Trigger visual kicking animation
    setBallPos({
      left: finalBallX,
      top: isMiss ? -10 : finalBallY,
      scale: 0.6
    });

    // Goalie dives with a 100ms lag
    setTimeout(() => {
      setGkPos({ left: finalGkX, top: 20 });
    }, 100);

    // Evaluate score outcome
    setTimeout(() => {
      let isGoal = false;
      let shotCommentary = '';

      if (isMiss) {
        shotCommentary = '🚀 BẮN CHIM !!! Lực quá căng khiến bóng bay vút lên trời.';
      } else if (isCritical && Math.abs(finalBallX - finalGkX) > 10) {
        shotCommentary = '🔥 SIÊU PHẨM GÓC CHẾT !!! Cú sút quá gắt, thủ môn chịu chết!';
        isGoal = true;
      } else if (Math.abs(finalBallX - finalGkX) < 18 && !isCritical) {
        shotCommentary = '🧱 CẢN PHÁ XUẤT THẦN !!! Thủ môn đổ người cản phá ngoạn mục!';
        // Deflect ball slightly
        setBallPos((prev) => ({
          ...prev,
          left: finalGkX + 5,
          top: 40,
          scale: 0.8
        }));
      } else {
        shotCommentary = '⚽ VÀOOOOO !!! Cú dứt điểm hiểm hóc tung lưới!';
        isGoal = true;
      }

      setCommentary(shotCommentary);
      if (isGoal) {
        setGoalsScored((prev) => prev + 1);
        incrementMissionProgress(uid, 'penalty_goals');
      }

      // Progress round
      const nextShots = shotsLeft - 1;
      setShotsLeft(nextShots);

      if (nextShots > 0) {
        const nextShotNum = currentShot + 1;
        setCurrentShot(nextShotNum);
        // Prepare next shot after 2.5s
        setTimeout(() => {
          resetShotPositions();
          startPowerBarLoop();
        }, 2500);
      } else {
        // Match finished
        setTimeout(() => {
          checkMatchOutcome(isGoal ? goalsScored + 1 : goalsScored);
        }, 2500);
      }
    }, 500);
  };

  const checkMatchOutcome = async (finalGoals: number) => {
    setIsPlaying(false);
    if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);

    const amt = parseInt(betAmount);
    if (finalGoals >= 3) {
      const payout = amt * 2;
      try {
        const uSnap = await get(ref(db, `users/${uid}`));
        const freshPP = uSnap.val()?.pp || 0;
        await update(ref(db, `users/${uid}`), { pp: freshPP + payout });

        await push(ref(db, 'game_logs'), {
          uid,
          name: user?.name || 'Sinh Viên',
          game: 'Penalty',
          bet: amt,
          pnl: payout - amt,
          result: `Thắng (Ghi ${finalGoals}/5 quả)`,
          time: new Date().toLocaleString('vi-VN'),
          timestamp: Date.now()
        });

        onShowResult(
          'CHIẾN THẮNG KÈO ĐẤU!',
          `Ghi bàn thành công: ${finalGoals}/5 quả!\nBạn nhận về: +${payout.toLocaleString()} PP!`,
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
          game: 'Penalty',
          bet: amt,
          pnl: -amt,
          result: `Thua (Ghi ${finalGoals}/5 quả)`,
          time: new Date().toLocaleString('vi-VN'),
          timestamp: Date.now()
        });

        onShowResult(
          'THẤT BẠI KÈO ĐẤU',
          `Bạn chỉ ghi được ${finalGoals}/5 quả bóng.\nBạn bị trừ mất trắng -${amt.toLocaleString()} PP cược.`,
          false
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="overlay z-[5000] p-2 sm:p-4 overflow-y-auto">
      <div className="glass-box login-panel overflow-y-auto max-h-[92vh] w-full max-w-[760px] p-3 sm:p-6 border-[#00ff80] relative flex flex-col my-auto">
        <button onClick={onClose} className="absolute top-3 right-3 text-[#8b949e] hover:text-white cursor-pointer transition z-50">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-[#00ff80] text-glow-green text-xl sm:text-2xl font-black font-mono uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5 text-center">
          <Trophy className="w-5 h-5 shrink-0" /> SÚT PENALTY ĐỈNH CAO
        </h2>
        <p className="text-[10px] font-mono text-[#8b949e] uppercase mb-3 text-center">
          Giải bóng đá S-System siêu cấp 88
        </p>

        {/* Lives & scoring header */}
        <div className="flex justify-between items-center bg-black/50 border border-white/5 rounded-lg p-2.5 text-xs sm:text-sm font-mono font-bold mb-3">
          <span className="text-[#ffd700] text-glow-gold">VÀO: {isPlaying ? goalsScored : 0}/5</span>
          <span className="text-[#ff003c] text-glow-red">LƯỢT SÚT: {isPlaying ? currentShot : 1}/5</span>
        </div>

        {/* Football pitch stage */}
        <div className="relative w-full h-[240px] sm:h-[320px] bg-gradient-to-t from-[#1e5e2f] to-[#13421d] border-2 sm:border-4 border-white rounded-xl overflow-hidden shadow-inner select-none mb-3 perspective-800">
          {/* Penalty box lines */}
          <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 w-48 h-24 border-4 border-white border-b-0 rounded-t-lg opacity-40"></div>

          {/* Goal post structure */}
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-72 h-28 border-4 border-white border-b-0 bg-white/5 opacity-80 grid-pattern">
            {/* Goal net mesh style */}
            <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.15)_2px,transparent_2px),_linear-gradient(90deg,rgba(255,255,255,0.15)_2px,transparent_2px)] bg-[size:16px_16px]"></div>
          </div>

          {/* Goalkeeper Hands representation */}
          <div
            style={{
              left: `${gkPos.left}%`,
              top: `${gkPos.top}%`,
              transform: 'translate(-50%, -50%)',
              transition: isShooting ? 'left 0.25s ease-out, top 0.25s' : 'none'
            }}
            className="absolute z-10 text-white flex flex-col items-center select-none"
          >
            <div className="text-[28px] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] leading-none select-none">🧤</div>
            <div className="bg-red-600/80 border border-red-400 text-[8px] font-mono px-1 rounded select-none">GK PRO</div>
          </div>

          {/* Soccer ball */}
          <div
            style={{
              left: `${ballPos.left}%`,
              top: `${ballPos.top}%`,
              transform: `translate(-50%, -50%) scale(${ballPos.scale})`,
              transition: isShooting ? 'left 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.45s, transform 0.45s' : 'none'
            }}
            className="absolute text-[24px] text-white drop-shadow-[0_8px_12px_rgba(0,0,0,0.85)] z-20"
          >
            ⚽
          </div>

          {/* Timing sliding power bar widget */}
          {isPlaying && !isShooting && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[85%] h-4 bg-black/60 border border-white rounded-full overflow-y-auto max-h-[90vh]">
              {/* Fill ranges (Green center, red margins) */}
              <div className="w-full h-full bg-gradient-to-r from-[#ff003c] via-emerald-400 to-[#ff003c] relative flex items-center justify-center">
                {/* Visual cursor */}
                <div
                  style={{ left: `${cursorPos}%` }}
                  className="absolute w-1.5 h-full bg-white border border-black shadow-[0_0_10px_#fff] transition-[left] duration-[0.03s]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Live coach instructions / results commentary */}
        <div className="bg-black/80 border border-[#444] rounded-lg p-3 min-h-[50px] flex items-center justify-center text-center font-mono text-sm leading-relaxed text-slate-200 mb-4 select-none">
          {commentary}
        </div>

        {/* Action Controls */}
        {!isPlaying ? (
          <div className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-[#8b949e] uppercase font-bold tracking-wider mb-1.5">Số lượng PP đặt cược loạt sút:</label>
              <input
                type="number"
                placeholder="Nhập số PP cược cả loạt sút..."
                className="w-full bg-black/60 border border-[#30363d] focus:border-[#00ff80] rounded-lg p-3 text-center text-sm font-black text-[#ffd700] text-glow-gold"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
              />
            </div>

            <button
              onClick={handleStartPenalty}
              className="w-full py-3.5 bg-emerald-950/20 hover:bg-[#00ff80] hover:text-black border border-[#00ff80] text-[#00ff80] font-black uppercase text-xs tracking-widest cursor-pointer rounded-xl transition-all"
            >
              [ BẮT ĐẦU SÚT PENALTY ]
            </button>
          </div>
        ) : (
          <div className="font-mono">
            <button
              onClick={handleShoot}
              disabled={isShooting}
              className={`w-full py-4 font-black uppercase tracking-widest text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 ${
                isShooting
                  ? 'bg-slate-800 border border-slate-600 text-slate-500 cursor-not-allowed'
                  : 'bg-[#ffd700] hover:bg-yellow-400 border border-[#ffd700] text-black hover:shadow-[0_0_20px_rgba(255,215,0,0.5)] active:scale-95'
              }`}
            >
              <ArrowRight className="w-5 h-5" /> [ ⚽ SÚT BÓNG NGAY ! ]
            </button>
          </div>
        )}

        {/* REQUIREMENT 5: ADMIN MANUAL OVERRIDE */}
        {((user?.role as any) === 'ADMIN' || (user?.role as any) === 'TEACHER') && (
          <div className="mt-6 border-t border-red-500/20 pt-4 space-y-2 font-mono text-left text-xs">
            <span className="text-red-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 animate-pulse" /> ⚙️ ADMIN MANUAL OVERRIDE (CHỈ ADMIN THẤY)
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'NONE', label: '❌ Không can thiệp' },
                { key: 'GOAL', label: '⚽ Ép Sút Vào' },
                { key: 'SAVE', label: '🧤 Ép Thủ Môn Đỡ' },
                { key: 'MISS', label: '🚀 Ép Sút Ra Ngoài' }
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setAdminForceOutcome(opt.key as any)}
                  className={`px-3 py-2 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                    adminForceOutcome === opt.key
                      ? 'border-red-500 text-red-500 bg-red-950/20 scale-105 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                      : 'border-white/5 bg-black/40 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-red-400/80 leading-snug">
              * Chọn một kịch bản can thiệp trước khi nhấn sút để tự động ép đường bay của bóng hoặc phản xạ của thủ môn.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
