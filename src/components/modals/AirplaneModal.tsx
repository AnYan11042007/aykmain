/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { get, ref, update, push, onValue } from 'firebase/database';
import { db } from '../../firebase';
import { X, Navigation, Flame, Trophy, Info, Compass, HelpCircle } from 'lucide-react';
import { User } from '../../types';
import { incrementMissionProgress } from '../../utils/missions';

interface AirplaneModalProps {
  uid: string;
  user: User | null;
  onClose: () => void;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

interface ActiveBet {
  roundId: number;
  amount: number;
  status: 'PLAYING' | 'CASHED_OUT' | 'CRASHED';
  multiplier?: number;
}

// 32-bit PRNG generator based on a seed number
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Multiplier growth formula based on flight time elapsed (seconds)
const getMultiplierAtTime = (timeS: number) => {
  if (timeS <= 0) return 1.00;
  // Dynamic climbing curve: 1.00 + 0.08x + 0.015x^2
  return 1.00 + 0.08 * timeS + 0.015 * Math.pow(timeS, 2);
};

// Deterministic crash point selector for roundId - revamped to allow 0.01x up to 100x
const getCrashPointForRound = (rId: number) => {
  const randFunc = mulberry32(rId * 1234567);
  const r = randFunc();
  const r2 = randFunc();
  
  // 6% chance of instant blowup at takeoff (from 0.01x to 1.00x)
  if (r < 0.06) {
    if (r2 < 0.4) return 0.01; // Instant explosion at 0.01x!
    return parseFloat((1.00 + r2 * 0.1).toFixed(2));
  }
  
  // Formula: most crash points are close to 1-3x, rare high multi limits
  let point = 101 / (r * 100 + 1);
  
  // Occasionally (5% chance) let it go up to 100x
  if (r2 > 0.95) {
    point = 10 + r * 90; // 10x to 100x
  } else if (r2 > 0.85) {
    point = 5 + r * 15; // 5x to 20x
  } else {
    point = Math.max(1.00, Math.min(25.00, point)); // cap regular rounds at 25x
  }
  
  return parseFloat(point.toFixed(2));
};

export default function AirplaneModal({ uid, user, onClose, onShowResult }: AirplaneModalProps) {
  const [betAmount, setBetAmount] = useState('');
  const [cycleTime, setCycleTime] = useState(0);
  const [currentRoundId, setCurrentRoundId] = useState(0);
  const [activeBet, setActiveBet] = useState<ActiveBet | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [showRules, setShowRules] = useState(false);

  // Sync server time offset
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, (snap) => {
      if (snap.exists()) {
        setServerTimeOffset(snap.val());
      }
    });
    return () => unsub();
  }, []);

  // Synchronized Clock Ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now() + serverTimeOffset;
      const cTime = now % 30000; // 30-second loop
      const rId = Math.floor(now / 30000); // Unique round index
      setCycleTime(cTime);
      setCurrentRoundId(rId);
    }, 50);
    return () => clearInterval(interval);
  }, [serverTimeOffset]);

  // Sync current user's active bet state
  useEffect(() => {
    if (!uid) return;
    const betRef = ref(db, `users/${uid}/crash_game`);
    const unsub = onValue(betRef, (snap) => {
      if (snap.exists()) {
        setActiveBet(snap.val());
      } else {
        setActiveBet(null);
      }
    });
    return () => unsub();
  }, [uid]);

  const isBettingPhase = cycleTime < 5000;
  const bettingTimeLeft = Math.ceil((5000 - cycleTime) / 1000);
  const flightTimeS = isBettingPhase ? 0 : (cycleTime - 5000) / 1000;

  const crashPoint = getCrashPointForRound(currentRoundId);
  const rawMultiplier = getMultiplierAtTime(flightTimeS);
  const hasCrashed = rawMultiplier >= crashPoint;
  const currentMultiplier = hasCrashed ? crashPoint : rawMultiplier;

  const hasBetThisRound = activeBet && activeBet.roundId === currentRoundId;

  // Auto-resolve pending previous round bets that were left in 'PLAYING' state
  useEffect(() => {
    if (activeBet && activeBet.roundId < currentRoundId && activeBet.status === 'PLAYING') {
      const oldRoundId = activeBet.roundId;
      const oldAmount = activeBet.amount;
      const oldCrashPoint = getCrashPointForRound(oldRoundId);
      
      // Update DB
      update(ref(db, `users/${uid}/crash_game`), { status: 'CRASHED' });
      
      // Log loss
      push(ref(db, 'game_logs'), {
        uid,
        name: user?.name || 'Sinh Viên',
        game: 'Crash',
        bet: oldAmount,
        pnl: -oldAmount,
        result: `Nổ ở x${oldCrashPoint.toFixed(2)} (Thua - Vòng cũ)`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });
    }
  }, [activeBet, currentRoundId, uid]);

  // Auto-resolve crash logic if player was still flying
  useEffect(() => {
    if (hasCrashed && hasBetThisRound && activeBet.status === 'PLAYING') {
      // Mark as CRASHED in database
      update(ref(db, `users/${uid}/crash_game`), { status: 'CRASHED' });

      // Log transaction/play loss
      push(ref(db, 'game_logs'), {
        uid,
        name: user?.name || 'Sinh Viên',
        game: 'Crash',
        bet: activeBet.amount,
        pnl: -activeBet.amount,
        result: `Nổ ở x${crashPoint.toFixed(2)} (Thua)`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      onShowResult(
        'MÁY BAY BỊ TIÊU DIỆT !',
        `Phi thuyền S88 đã phát nổ ở x${crashPoint.toFixed(2)}!\nBạn đã bị trễ nhịp nhảy dù và mất trắng -${activeBet.amount.toLocaleString()} PP cược.`,
        false
      );
    }
  }, [hasCrashed, hasBetThisRound, activeBet?.status]);

  // Handle Placing bet during Betting Phase
  const handlePlaceBet = async () => {
    if (isProcessing) return;
    if (!isBettingPhase) {
      alert('Đã hết thời gian đặt cược! Vui lòng chờ vòng sau.');
      return;
    }
    if (hasBetThisRound) {
      alert('Bạn đã đặt cược cho vòng này rồi!');
      return;
    }

    const amt = parseInt(betAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Số tiền đặt cược không hợp lệ!');
      return;
    }

    setIsProcessing(true);
    try {
      const uSnap = await get(ref(db, `users/${uid}`));
      if (!uSnap.exists()) {
        alert('Tài khoản không khả dụng!');
        setIsProcessing(false);
        return;
      }

      const currentPP = uSnap.val().pp || 0;
      if (currentPP < amt) {
        alert(`Số dư PP không đủ để cất cánh! Hiện có: ${currentPP.toLocaleString()} PP.`);
        setIsProcessing(false);
        return;
      }

      // Deduct PP & Record active bet structure
      await update(ref(db, `users/${uid}`), {
        pp: currentPP - amt,
        crash_game: {
          roundId: currentRoundId,
          amount: amt,
          status: 'PLAYING'
        }
      });

      // Award Daily Missions progress
      try {
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const mRef = ref(db, `users/${uid}/daily_missions/${todayStr}`);
        const mSnap = await get(mRef);
        let currentRides = 0;
        if (mSnap.exists() && typeof mSnap.val() === 'object' && mSnap.val() !== null) {
          currentRides = mSnap.val().crashRides || 0;
        }
        await update(mRef, { crashRides: currentRides + 1 });
        await incrementMissionProgress(uid, 'crash_rides');
      } catch (mErr) {
        console.warn('Daily mission update error in Crash, bypassed:', mErr);
      }

      // Increase Battle Pass XP
      try {
        const freshSnap = await get(ref(db, `users/${uid}`));
        if (freshSnap.exists()) {
          const uVal = freshSnap.val();
          const currentXP = uVal.xp || 0;
          const currentLevel = uVal.level || 1;
          const newXP = currentXP + 25; // Gain 25 XP
          const nextLevelXP = currentLevel * 100;
          if (newXP >= nextLevelXP) {
            await update(ref(db, `users/${uid}`), {
              xp: newXP - nextLevelXP,
              level: currentLevel + 1
            });
          } else {
            await update(ref(db, `users/${uid}`), { xp: newXP });
          }
        }
      } catch (xpErr) {
        console.warn('XP update error in Crash, bypassed:', xpErr);
      }

      setBetAmount('');
    } catch (err) {
      alert('Lỗi đặt cược!');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Jumping Out (Cash Out) during flight
  const handleCashOut = async () => {
    if (isProcessing) return;
    if (!hasBetThisRound || activeBet.status !== 'PLAYING' || hasCrashed) return;

    setIsProcessing(true);
    const winAmount = Math.floor(activeBet.amount * currentMultiplier);

    try {
      const uSnap = await get(ref(db, `users/${uid}`));
      const freshPP = uSnap.val()?.pp || 0;

      // Credit winnings and finalize bet state
      await update(ref(db, `users/${uid}`), {
        pp: freshPP + winAmount,
        'crash_game/status': 'CASHED_OUT',
        'crash_game/multiplier': currentMultiplier
      });

      // Write logs
      await push(ref(db, 'game_logs'), {
        uid,
        name: user?.name || 'Sinh Viên',
        game: 'Crash',
        bet: activeBet.amount,
        pnl: winAmount - activeBet.amount,
        result: `Nhảy dù chốt x${currentMultiplier.toFixed(2)} (Thắng)`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      onShowResult(
        'NHẢY DÙ THÀNH CÔNG !',
        `Chúc mừng chiến hữu! Bạn đã nhảy dù thoát hiểm an toàn ở mốc x${currentMultiplier.toFixed(2)}!\nĐã chốt lợi nhuận khổng lồ: +${winAmount.toLocaleString()} PP!`,
        true
      );
    } catch (err) {
      alert('Giao dịch nhảy dù lỗi. Hãy thử lại!');
    } finally {
      setIsProcessing(false);
    }
  };

  // Deterministic plane visual positions
  let posL = 10;
  let posB = 15;
  if (!isBettingPhase && !hasCrashed) {
    posL = Math.min(80, 10 + flightTimeS * 3.5);
    posB = Math.min(80, 15 + flightTimeS * 2.8);
  } else if (hasCrashed) {
    // Lock animation at moment of explosion
    const crashTimeS = Math.max(0, (crashPoint - 1.00) / 0.12);
    posL = Math.min(80, 10 + crashTimeS * 3.5);
    posB = Math.min(80, 15 + crashTimeS * 2.8);
  }

  return (
    <div className="overlay z-[5000]">
      <div className="glass-box login-panel overflow-y-auto max-h-[92vh] w-[95vw] md:w-full max-w-[520px] p-4 sm:p-6 border-[#00f0ff] relative flex flex-col justify-between max-sm:h-[90vh] max-sm:rounded-3xl">
        <button 
          onClick={() => setShowRules(true)} 
          className="absolute top-4 left-4 text-[#8b949e] hover:text-white cursor-pointer transition flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider bg-black/40 px-2 py-1 rounded border border-white/10"
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          Luật Chơi
        </button>

        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-[#8b949e] hover:text-white cursor-pointer transition z-50"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-[#00f0ff] text-glow-blue text-xl sm:text-2xl font-black font-mono uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5 mt-3 sm:mt-0">
          <Navigation className="w-5 h-5 animate-pulse" /> KHÔNG CHIẾN S88
        </h2>
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-[10px] font-mono text-[#8b949e] uppercase">
            ROUND: #{currentRoundId}
          </span>
          <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 py-0.5 px-1.5 rounded uppercase font-bold font-mono">
            PORTRAIT READY
          </span>
        </div>

        {/* Dynamic sky arena canvas representation */}
        <div className="relative w-full h-[210px] sm:h-[250px] bg-gradient-to-b from-[#000411] to-[#0a0a2a] border-2 border-[#00f0ff] rounded-xl overflow-hidden shadow-inner select-none mb-3 shrink-0">
          
          {/* Synchronized Multiplier display */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl sm:text-5xl font-black tracking-widest font-mono z-0 transition-colors ${
            hasCrashed ? 'text-[#ff003c]/20' : isBettingPhase ? 'text-white/5' : 'text-cyan-400/20'
          }`}>
            {isBettingPhase ? `BETTING` : `X${currentMultiplier.toFixed(2)}`}
          </div>

          {/* Prominent Top Jump Button for Mobile view right near the top of rocket arena */}
          {!isBettingPhase && !hasCrashed && hasBetThisRound && activeBet.status === 'PLAYING' && (
            <div className="absolute top-3 right-3 z-40">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCashOut();
                }}
                disabled={isProcessing}
                className="py-2 px-3 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 hover:from-emerald-300 hover:to-green-200 text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_20px_rgba(16,185,129,1)] animate-bounce flex items-center gap-1 border-2 border-white active:scale-90"
              >
                🪂 NHẢY DÙ DỪNG X{currentMultiplier.toFixed(2)}
              </button>
            </div>
          )}

          {/* Time/Status Overlay */}
          <div className="absolute top-3 left-3 z-30 font-mono text-[9px] text-slate-400 uppercase flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Trạng thái: {isBettingPhase ? 'Nhận Cược' : hasCrashed ? 'Đã Phát Nổ' : 'Đang Bay'}</span>
            </div>
            {!isBettingPhase && (
              <span className="text-red-400 font-bold">Điểm Nổ Bí Ẩn: ❓.❓❓X</span>
            )}
          </div>

          {/* Runway/Hangar visual decoration */}
          <div className="absolute bottom-0 left-0 w-24 h-10 bg-zinc-900 border-r-2 border-t-2 border-zinc-700 rounded-tr-lg z-10 shadow-lg flex items-center justify-center text-[8px] text-zinc-500 font-mono font-black">
            S88-HANGAR
          </div>

          {/* Flying Rocket representation */}
          {!isBettingPhase && !hasCrashed && (
            <>
              <div
                style={{
                  left: `${posL}%`,
                  bottom: `${posB}%`,
                  transform: 'translate(-50%, 50%)',
                }}
                className="absolute z-20 text-[#00f0ff] text-glow-blue drop-shadow-[0_8px_12px_rgba(0,240,255,0.6)] flex items-center gap-1 select-none transition-all duration-100"
              >
                <Flame className="w-6 h-6 text-orange-500 animate-bounce shrink-0 rotate-90" />
                <div className="text-[32px] animate-pulse">🚀</div>
                
                {/* Bouncing, floating jump button directly next to/above the flying rocket */}
                {hasBetThisRound && activeBet.status === 'PLAYING' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCashOut();
                    }}
                    disabled={isProcessing}
                    className="absolute -top-14 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 hover:from-emerald-300 hover:to-green-200 text-black font-black text-xs uppercase tracking-wider py-2 px-4 rounded-full cursor-pointer shadow-[0_0_25px_rgba(16,185,129,1)] animate-bounce flex items-center gap-1.5 whitespace-nowrap active:scale-90 select-none z-30 border-2 border-white"
                  >
                    🪂 NHẢY DÙ X{currentMultiplier.toFixed(2)}
                  </button>
                )}
              </div>

              {/* Floating sticky Jump overlay button inside the sky canvas for mobile & laptop convenience */}
              {hasBetThisRound && activeBet.status === 'PLAYING' && (
                <div className="absolute bottom-2 left-2 right-2 z-40">
                  <button
                    onClick={handleCashOut}
                    disabled={isProcessing}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 hover:to-green-300 text-black font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.9)] animate-pulse border-2 border-white/50 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>🪂 BẤM ĐÂY CHỐT LỜI X{currentMultiplier.toFixed(2)}!</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Enemy Missile Attack & Explosion Effect */}
          {!isBettingPhase && hasCrashed && (
            <>
              {/* Enemy stealth fighter jet coming from behind */}
              <div 
                style={{
                  left: `${Math.max(5, posL - 25)}%`,
                  bottom: `${Math.max(5, posB - 15)}%`,
                  transform: 'translate(-50%, 50%)',
                }}
                className="absolute z-25 flex items-center gap-1 select-none animate-pulse"
              >
                <div className="text-2xl filter drop-shadow-[0_0_8px_rgba(255,0,60,0.8)]">🛩️</div>
                <span className="text-[7px] bg-red-600/90 text-white font-mono font-bold px-1.5 py-0.5 rounded tracking-widest shadow-md whitespace-nowrap">
                  MÁY BAY ĐỊCH TẤN CÔNG
                </span>
              </div>

              {/* Homing enemy missile fired from jet into back of plane */}
              <div
                style={{
                  left: `${posL - 10}%`,
                  bottom: `${posB - 5}%`,
                  transform: 'translate(-50%, 50%) rotate(35deg)',
                }}
                className="absolute z-28 text-xl animate-ping"
              >
                🚀🔥
              </div>

              {/* Laser missile trajectory trailing from behind */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
                <line
                  x1={`${Math.max(5, posL - 25)}%`}
                  y1={`${100 - Math.max(5, posB - 15)}%`}
                  x2={`${posL}%`}
                  y2={`${100 - posB}%`}
                  stroke="#ff003c"
                  strokeWidth="4"
                  strokeDasharray="4,2"
                  className="animate-[dash_0.3s_linear_infinite]"
                />
              </svg>

              {/* Target Lock Crosshair */}
              <div
                style={{
                  left: `${posL}%`,
                  bottom: `${posB}%`,
                  transform: 'translate(-50%, 50%)',
                }}
                className="absolute z-20 w-16 h-16 border-2 border-red-500 border-dashed rounded-full animate-spin flex items-center justify-center"
              >
                <div className="w-8 h-8 border border-red-500 rounded-full animate-ping" />
                <span className="text-[7px] text-red-500 font-bold bg-black/90 px-1 py-0.5 rounded absolute -top-5 whitespace-nowrap border border-red-500/50">
                  🚨 TÊN LỬA ĐỊCH BẮN TRÚNG!
                </span>
              </div>

              {/* Big Explosion Core */}
              <div
                style={{
                  left: `${posL}%`,
                  bottom: `${posB}%`,
                  transform: 'translate(-50%, 50%) scale(2.2)',
                }}
                className="absolute z-30 text-glow-red text-5xl animate-bounce filter select-none"
              >
                💥
              </div>

              {/* Fire particles around explosion */}
              <div
                style={{
                  left: `${posL}%`,
                  bottom: `${posB}%`,
                  transform: 'translate(-50%, 50%)',
                }}
                className="absolute z-29 text-2xl animate-ping"
              >
                🔥⚡
              </div>
            </>
          )}

          {/* Betting Phase Countdown overlay */}
          {isBettingPhase && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 font-mono text-center px-4">
              <Trophy className="w-8 h-8 text-[#ffd700] mb-2 animate-bounce" />
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">THỜI GIAN NHẬN ĐẶT CƯỢC</span>
              <span className="text-glow-gold text-[#ffd700] text-3xl font-black mt-1">CÒN {bettingTimeLeft} GIÂY</span>
              <p className="text-[8px] text-slate-500 max-w-xs mt-1.5 uppercase leading-relaxed font-sans">
                Tất cả người chơi trong phòng sẽ bay cùng phi thuyền, nhận chung số nhân. Càng bay cao, tiền thưởng nhân lên càng khủng!
              </p>
            </div>
          )}
        </div>

        {/* Action controls logic in bottom zone for one-handed thumb access */}
        <div className="mt-auto max-sm:bg-black/90 max-sm:border-t-2 max-sm:border-[#00f0ff]/30 max-sm:-mx-4 max-sm:-mb-4 max-sm:p-4 max-sm:rounded-t-3xl max-sm:shadow-[0_-10px_30px_rgba(0,240,255,0.2)]">
          {isBettingPhase ? (
            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#8b949e] uppercase font-bold text-[10px]">CƯỢC PP CẤT CÁNH:</label>
                  {!hasBetThisRound && (
                    <div className="flex gap-1">
                      {[50000, 200000, 500000].map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          onClick={() => setBetAmount(quick.toString())}
                          className="px-1.5 py-0.5 text-[9px] bg-white/5 hover:bg-white/10 text-cyan-300 rounded border border-cyan-500/30 font-bold"
                        >
                          +{(quick/1000)}k
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  disabled={hasBetThisRound || isProcessing}
                  placeholder={hasBetThisRound ? `ĐÃ ĐẶT CƯỢC ${activeBet.amount.toLocaleString()} PP` : "Nhập số PP cược..."}
                  className="w-full bg-black/80 border border-[#30363d] focus:border-[#00f0ff] rounded-xl p-3 text-center text-sm font-black text-[#ffd700] text-glow-gold font-mono disabled:opacity-50"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                />
              </div>

              <button
                onClick={handlePlaceBet}
                disabled={hasBetThisRound || isProcessing}
                className={`w-full py-3.5 border text-xs font-black uppercase tracking-widest cursor-pointer rounded-xl transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] active:scale-95 ${
                  hasBetThisRound 
                    ? 'bg-emerald-950/20 border-emerald-500 text-emerald-400' 
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-[#00f0ff]'
                }`}
              >
                {hasBetThisRound ? '[ ĐÃ ĐỒNG BỘ CƯỢC THÀNH CÔNG ]' : '[ XÁC NHẬN CẤT CÁNH PHI THUYỀN ]'}
              </button>
            </div>
          ) : (
            <div className="font-mono">
              {hasBetThisRound && activeBet.status === 'PLAYING' && !hasCrashed ? (
                <button
                  onClick={handleCashOut}
                  disabled={isProcessing}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 text-black border-2 border-[#00ff80] text-glow-green font-black uppercase tracking-widest text-sm rounded-xl cursor-pointer transition-all active:scale-95 shadow-[0_0_25px_rgba(0,255,128,0.5)]"
                >
                  [ 🪂 NHẢY DÙ CHỐT LỜI (ĂN X{currentMultiplier.toFixed(2)}) ]
                </button>
              ) : hasBetThisRound && activeBet.status === 'CASHED_OUT' ? (
                <button
                  disabled
                  className="w-full py-4 bg-emerald-950/30 border border-[#00ff80] text-[#00ff80] text-glow-green font-black uppercase tracking-widest text-sm rounded-xl cursor-not-allowed"
                >
                  🎉 ĐÃ NHẢY DÙ AN TOÀN! CHỐT X{activeBet.multiplier?.toFixed(2) || currentMultiplier.toFixed(2)}
                </button>
              ) : hasBetThisRound && activeBet.status === 'CRASHED' ? (
                <button
                  disabled
                  className="w-full py-4 bg-red-950/30 border border-[#ff003c] text-[#ff003c] text-glow-red font-black uppercase tracking-widest text-sm rounded-xl cursor-not-allowed"
                >
                  💥 PHI THUYỀN ĐÃ NỔ! TỔN THẤT TOÀN BỘ
                </button>
              ) : (
                <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5 font-sans text-xs text-slate-400 uppercase leading-relaxed flex items-center justify-center gap-2">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Phi thuyền đang bay! Hãy chờ vòng cược tiếp theo để tham gia.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Standalone Airplane Rules Overlay */}
        {showRules && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-[5100] flex flex-col justify-between p-6 font-mono text-xs text-white">
            <div>
              <h3 className="text-[#00f0ff] text-glow-blue font-black text-sm uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
                <HelpCircle className="w-5 h-5 text-[#00f0ff]" />
                Luật Chơi: KHÔNG CHIẾN S88
              </h3>

              <div className="space-y-3 leading-relaxed text-slate-300">
                <p>• Phi thuyền S88 sẽ cất cánh bay cao và số nhân (multiplier) giải thưởng tăng dần liên tục theo đồ thị leo dốc.</p>
                <p>• Người chơi có thể ấn nút <strong className="text-emerald-400">NHẢY DÙ / CHỐT LỜI</strong> bất cứ lúc nào khi phi thuyền đang bay để rút tiền ngay lập tức.</p>
                <p>• <strong className="text-red-400">Luật tử vong (CRASH)</strong>: Phi thuyền sẽ bị chiến đấu cơ của quân địch bắn nổ ngẫu nhiên. Nếu phi thuyền phát nổ trước khi bạn kịp ấn nhảy dù, bạn sẽ mất trắng 100% số tiền cược.</p>
                <p>• Số nhân nổ bí ẩn dao động từ <strong className="text-yellow-400">x0.01 cực nhanh</strong> cho tới cơ hội nổ ở số nhân cực khủng <strong className="text-[#00f0ff]">x5, x10, x50</strong>!</p>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 flex justify-end">
              <button
                onClick={() => setShowRules(false)}
                className="bg-[#00f0ff] hover:bg-[#59f7ff] text-black px-4 py-1.5 rounded-lg font-bold cursor-pointer transition-all uppercase text-[10px]"
              >
                ĐÃ HIỂU
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
