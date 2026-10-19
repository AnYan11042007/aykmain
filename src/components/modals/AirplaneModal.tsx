/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { get, ref, update, push, onValue } from 'firebase/database';
import { db } from '../../firebase';
import { X, Navigation, Flame, Trophy, Info, HelpCircle, Volume2, VolumeX, Zap, ShieldAlert, Crosshair, Sparkles } from 'lucide-react';
import { User } from '../../types';
import { incrementMissionProgress } from '../../utils/missions';
import { getTodayVNString } from '../../utils/date';

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

// Deterministic crash point selector for roundId - 0.01x up to 100x
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

// Web Audio API Sound Generator for Adrenaline SFX
const playSoundEffect = (type: 'cashout' | 'crash' | 'bet' | 'click', isMuted: boolean) => {
  if (isMuted) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'click' || type === 'bet') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'bet' ? 880 : 520, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'cashout') {
      // High-pitched victory chime (C5 -> E5 -> G5 -> C6)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'crash') {
      // Instant noise explosion BOOM!
      const bufferSize = ctx.sampleRate * 0.45;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.4);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.42);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    }
  } catch (e) {
    // Audio autoplay restrictions bypass
  }
};

export default function AirplaneModal({ uid, user, onClose, onShowResult }: AirplaneModalProps) {
  const [betAmount, setBetAmount] = useState('');
  const [cycleTime, setCycleTime] = useState(0);
  const [currentRoundId, setCurrentRoundId] = useState(0);
  const [activeBet, setActiveBet] = useState<ActiveBet | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Auto Cash Out states
  const [autoCashOut, setAutoCashOut] = useState<string>('2.00');
  const [autoCashOutEnabled, setAutoCashOutEnabled] = useState<boolean>(false);

  // Lock ref to prevent double cashout race conditions
  const cashOutLockRef = useRef<boolean>(false);
  const crashHandledRef = useRef<number>(-1);

  // Dodge Mechanism & Canvas Particle System States
  const [dodgeAlert, setDodgeAlert] = useState<{ id: number; x: number; y: number } | null>(null);
  const [isDodgeShaking, setIsDodgeShaking] = useState<boolean>(false);
  const lastDodgeCheckRef = useRef<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

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
    }, 40);
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

  // Reset lock when round changes or betting phase begins
  useEffect(() => {
    if (isBettingPhase) {
      cashOutLockRef.current = false;
    }
  }, [isBettingPhase, currentRoundId]);

  // Auto-resolve pending previous round bets left in 'PLAYING'
  useEffect(() => {
    if (activeBet && activeBet.roundId < currentRoundId && activeBet.status === 'PLAYING') {
      const oldRoundId = activeBet.roundId;
      const oldAmount = activeBet.amount;
      const oldCrashPoint = getCrashPointForRound(oldRoundId);
      
      update(ref(db, `users/${uid}/crash_game`), { status: 'CRASHED' });
      
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

      push(ref(db, `transactions/${uid}`), {
        id: `tx_crash_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'EXPENSE',
        title: 'Nổ Phi Thuyền AYK (Vòng cũ)',
        amount: -oldAmount,
        unit: 'PP',
        timestamp: Date.now()
      }).catch(() => {});
    }
  }, [activeBet, currentRoundId, uid]);

  // INSTANT Crash resolution: trigger instant sound & explosion as soon as hasCrashed turns true
  useEffect(() => {
    if (
      hasCrashed &&
      hasBetThisRound &&
      activeBet.status === 'PLAYING' &&
      crashHandledRef.current !== currentRoundId
    ) {
      crashHandledRef.current = currentRoundId;
      playSoundEffect('crash', isMuted);

      // Mark as CRASHED in database
      update(ref(db, `users/${uid}/crash_game`), { status: 'CRASHED' });

      // Write game log & transaction history
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

      push(ref(db, `transactions/${uid}`), {
        id: `tx_crash_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'EXPENSE',
        title: 'Nổ Phi Thuyền AYK',
        amount: -activeBet.amount,
        unit: 'PP',
        timestamp: Date.now()
      }).catch(() => {});

      onShowResult(
        '💥 PHI THUYỀN BỊ BẮN NỔ!',
        `Tiêu diệt ở mốc x${crashPoint.toFixed(2)}!\nTên lửa địch đã bắn hạ phi thuyền AYK! Bạn bị mất -${activeBet.amount.toLocaleString()} PP cược.`,
        false
      );
    }
  }, [hasCrashed, hasBetThisRound, activeBet?.status, currentRoundId]);

  // Handle Cash Out function (Jumping Out)
  const handleCashOut = async () => {
    if (isProcessing || cashOutLockRef.current) return;
    if (!hasBetThisRound || activeBet.status !== 'PLAYING' || hasCrashed) return;

    cashOutLockRef.current = true;
    setIsProcessing(true);
    playSoundEffect('cashout', isMuted);

    const winAmount = Math.floor(activeBet.amount * currentMultiplier);
    const profit = winAmount - activeBet.amount;

    try {
      const uSnap = await get(ref(db, `users/${uid}`));
      const freshPP = uSnap.val()?.pp || 0;

      // Credit winnings and finalize bet state
      await update(ref(db, `users/${uid}`), {
        pp: freshPP + winAmount,
        'crash_game/status': 'CASHED_OUT',
        'crash_game/multiplier': currentMultiplier
      });

      // Write game logs
      await push(ref(db, 'game_logs'), {
        uid,
        name: user?.name || 'Sinh Viên',
        game: 'Crash',
        bet: activeBet.amount,
        pnl: profit,
        result: `Nhảy dù chốt x${currentMultiplier.toFixed(2)} (Thắng)`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      // Write transaction history
      await push(ref(db, `transactions/${uid}`), {
        id: `tx_crash_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'INCOME',
        title: `Nhảy Dù Không Chiến AYK (x${currentMultiplier.toFixed(2)})`,
        amount: winAmount,
        unit: 'PP',
        timestamp: Date.now()
      });

      onShowResult(
        '🪂 NHẢY DÙ THÀNH CÔNG!',
        `Thoát hiểm an toàn ở mốc x${currentMultiplier.toFixed(2)}!\nĐã chốt lợi nhuận +${winAmount.toLocaleString()} PP vào tài khoản!`,
        true
      );
    } catch (err) {
      cashOutLockRef.current = false;
      alert('Giao dịch nhảy dù thất bại. Vui lòng thử lại!');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto Cash Out effect trigger
  useEffect(() => {
    if (
      !isBettingPhase &&
      !hasCrashed &&
      hasBetThisRound &&
      activeBet?.status === 'PLAYING' &&
      autoCashOutEnabled &&
      !cashOutLockRef.current
    ) {
      const targetMulti = parseFloat(autoCashOut);
      if (!isNaN(targetMulti) && targetMulti >= 1.01 && currentMultiplier >= targetMulti) {
        handleCashOut();
      }
    }
  }, [currentMultiplier, isBettingPhase, hasCrashed, hasBetThisRound, activeBet?.status, autoCashOutEnabled, autoCashOut]);

  // Handle Placing bet during Betting Phase
  const handlePlaceBet = async () => {
    if (isProcessing) return;
    if (!isBettingPhase) {
      alert('Đã hết thời gian đặt cược! Vui lòng chờ vòng tiếp theo.');
      return;
    }
    if (hasBetThisRound) {
      alert('Bạn đã đặt cược cho vòng cược này!');
      return;
    }

    const amt = parseInt(betAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Số tiền đặt cược không hợp lệ!');
      return;
    }

    setIsProcessing(true);
    playSoundEffect('bet', isMuted);

    try {
      const uSnap = await get(ref(db, `users/${uid}`));
      if (!uSnap.exists()) {
        alert('Tài khoản không tồn tại!');
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
        const todayStr = getTodayVNString();
        const mRef = ref(db, `users/${uid}/daily_missions/${todayStr}`);
        const mSnap = await get(mRef);
        let currentRides = 0;
        if (mSnap.exists() && typeof mSnap.val() === 'object' && mSnap.val() !== null) {
          currentRides = mSnap.val().crashRides || 0;
        }
        await update(mRef, { crashRides: currentRides + 1 });
        await incrementMissionProgress(uid, 'crash_rides');
      } catch (mErr) {
        console.warn('Daily mission update error:', mErr);
      }

      // Increase Battle Pass XP
      try {
        const freshSnap = await get(ref(db, `users/${uid}`));
        if (freshSnap.exists()) {
          const uVal = freshSnap.val();
          const currentXP = uVal.xp || 0;
          const currentLevel = uVal.level || 1;
          const newXP = currentXP + 25;
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
        console.warn('XP update error:', xpErr);
      }

      setBetAmount('');
    } catch (err) {
      alert('Lỗi đặt cược cất cánh!');
    } finally {
      setIsProcessing(false);
    }
  };

  // Deterministic plane visual positions
  let posL = 12;
  let posB = 18;
  if (!isBettingPhase && !hasCrashed) {
    posL = Math.min(82, 12 + flightTimeS * 3.8);
    posB = Math.min(78, 18 + flightTimeS * 3.0);
  } else if (hasCrashed) {
    // INSTANT position calculation at time of crash
    const crashTimeS = Math.max(0, (crashPoint - 1.00) / 0.12);
    posL = Math.min(82, 12 + crashTimeS * 3.8);
    posB = Math.min(78, 18 + crashTimeS * 3.0);
  }

  // Random 10% Dodge Mechanism during flight phase
  useEffect(() => {
    if (isBettingPhase || hasCrashed) {
      setDodgeAlert(null);
      setIsDodgeShaking(false);
      return;
    }

    const now = Date.now();
    if (now - lastDodgeCheckRef.current > 1600) {
      lastDodgeCheckRef.current = now;
      if (Math.random() < 0.10) { // 10% chance
        setIsDodgeShaking(true);
        setTimeout(() => setIsDodgeShaking(false), 350);
        setDodgeAlert({ id: now, x: posL, y: posB });
        setTimeout(() => setDodgeAlert(null), 1200);
      }
    }
  }, [flightTimeS, isBettingPhase, hasCrashed, posL, posB]);

  // Canvas Particle System Engine for Fiery Red-Orange Crash Explosion
  useEffect(() => {
    if (!hasCrashed || isBettingPhase) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      const cv = canvasRef.current;
      if (cv) {
        const ctx = cv.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, cv.width, cv.height);
      }
      return;
    }

    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const width = (cv.width = cv.parentElement?.clientWidth || 400);
    const height = (cv.height = cv.parentElement?.clientHeight || 260);

    const cx = (posL / 100) * width;
    const cy = height - (posB / 100) * height;

    const colors = ['#ff003c', '#ff3300', '#ff6600', '#ff9900', '#ffd700', '#ffffff', '#e60000', '#ff4500'];
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
    }[] = [];

    for (let i = 0; i < 110; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 2;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 8 + 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: Math.random() * 0.015 + 0.008
      });
    }

    let shockwaveRadius = 6;
    let shockwaveAlpha = 1.0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Expanding Shockwaves
      if (shockwaveAlpha > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, shockwaveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 69, 0, ${shockwaveAlpha})`;
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, shockwaveRadius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${shockwaveAlpha * 0.8})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        shockwaveRadius += 4.5;
        shockwaveAlpha -= 0.02;
      }

      // Fiery particles
      let activeCount = 0;
      particles.forEach((p) => {
        if (p.alpha > 0) {
          activeCount++;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.vy += 0.09;
          p.alpha -= p.decay;

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      if (activeCount > 0 || shockwaveAlpha > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [hasCrashed, isBettingPhase, posL, posB]);

  // Enemy fighter jet pursuing directly behind
  const enemyL = Math.max(5, posL - 22);
  const enemyB = Math.max(8, posB - 14);

  // Generate 8 recent crash points for history bar
  const recentRounds = Array.from({ length: 8 }, (_, i) => {
    const rId = currentRoundId - 8 + i;
    return {
      roundId: rId,
      point: getCrashPointForRound(rId)
    };
  }).reverse();

  return (
    <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md flex items-center justify-center p-0 md:p-4 overflow-hidden font-mono">
      <div className="w-full h-[100dvh] md:h-auto md:max-h-[92vh] max-w-full md:max-w-2xl bg-[#030d1a] border-0 md:border-2 md:border-[#00f0ff]/50 rounded-none md:rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 shrink-0 flex items-center justify-between px-4 py-3 bg-[#061426]/95 border-b border-[#00f0ff]/30 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <Navigation className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
            <div className="truncate">
              <h2 className="text-[#00f0ff] text-base md:text-lg font-black uppercase tracking-wider truncate">
                KHÔNG CHIẾN AYK 🚀
              </h2>
              <span className="text-[10px] text-emerald-400 font-bold block truncate">
                Số dư: {(user?.pp || 0).toLocaleString()} PP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => setShowRules(true)} 
              className="text-[#8b949e] hover:text-white cursor-pointer transition flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-black/40 px-2 py-1 rounded-lg border border-white/10"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              Luật
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              aria-label="Âm thanh"
              className="text-slate-400 hover:text-white p-2 rounded-lg bg-black/40 border border-white/10 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button 
              onClick={onClose} 
              aria-label="Đóng"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-[#8b949e] hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 py-0.5 px-2 rounded uppercase font-bold font-mono animate-pulse">
              LIVE ARENA
            </span>
            <span className="text-[9px] text-slate-400 font-mono">Phiên cược thời gian thực</span>
          </div>

        {/* Recent Rounds Multipliers History Bar */}
        <div className="mb-2 bg-black/50 p-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[8px] font-mono text-slate-400 uppercase font-bold shrink-0 px-1">Lịch sử:</span>
          {recentRounds.map((r) => {
            const pt = r.point;
            let colorClass = "bg-cyan-500/10 text-cyan-300 border-cyan-500/30";
            if (pt < 1.20) colorClass = "bg-red-500/20 text-red-400 border-red-500/40";
            else if (pt >= 5.00) colorClass = "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
            else if (pt >= 2.00) colorClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

            return (
              <span
                key={r.roundId}
                className={`text-[9px] font-mono font-black py-0.5 px-2 rounded-lg border shrink-0 ${colorClass}`}
              >
                x{pt.toFixed(2)}
              </span>
            );
          })}
        </div>

        {/* Dynamic Sky Arena Canvas */}
        <div className={`relative w-full h-[220px] sm:h-[260px] bg-gradient-to-b from-[#000411] via-[#040926] to-[#0a0a2a] border-2 border-[#00f0ff] rounded-2xl overflow-hidden shadow-inner select-none mb-3 shrink-0 ${
          hasCrashed ? 'animate-shake border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : ''
        } ${isDodgeShaking ? 'animate-shake' : ''}`}>
          
          {/* Canvas Particle Explosion System */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-35" />

          {/* Floating Dodge Text 'NÉ THÀNH CÔNG!' */}
          {dodgeAlert && (
            <div
              style={{
                left: `${dodgeAlert.x}%`,
                bottom: `${Math.min(85, dodgeAlert.y + 12)}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute z-40 text-yellow-300 font-mono font-black text-xs sm:text-sm bg-slate-950/90 border-2 border-yellow-400 px-3.5 py-1 rounded-full shadow-[0_0_25px_rgba(234,179,8,0.9)] animate-bounce flex items-center gap-1.5 whitespace-nowrap pointer-events-none"
            >
              <ShieldAlert className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span>NÉ THÀNH CÔNG!</span>
            </div>
          )}

          {/* Synchronized Multiplier display */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl sm:text-6xl font-black tracking-widest font-mono z-0 transition-colors ${
            hasCrashed ? 'text-[#ff003c]/25' : isBettingPhase ? 'text-white/5' : 'text-cyan-400/20'
          }`}>
            {isBettingPhase ? `BETTING` : `X${currentMultiplier.toFixed(2)}`}
          </div>

          {/* Top Right Quick Jump Button on Canvas */}
          {!isBettingPhase && !hasCrashed && hasBetThisRound && activeBet.status === 'PLAYING' && (
            <div className="absolute top-2.5 right-2.5 z-40">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCashOut();
                }}
                disabled={isProcessing}
                className="py-2 px-3 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 hover:brightness-125 text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_20px_rgba(16,185,129,1)] animate-bounce flex items-center gap-1 border-2 border-white active:scale-90"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                🪂 NHẢY DÙ X{currentMultiplier.toFixed(2)}
              </button>
            </div>
          )}

          {/* Flight Info telemetry HUD */}
          <div className="absolute top-2.5 left-2.5 z-30 font-mono text-[9px] text-slate-300 uppercase flex flex-col gap-0.5 bg-black/60 p-2 rounded-xl border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 font-bold">
              <span className={`w-2 h-2 rounded-full ${hasCrashed ? 'bg-red-500' : 'bg-emerald-400 animate-ping'}`} />
              <span className={hasCrashed ? 'text-red-400 font-black' : 'text-emerald-300'}>
                {isBettingPhase ? 'Nhận Cược' : hasCrashed ? '🔥 ĐÃ NỔ BẮN HẠ' : '🚀 ĐANG BAY CAO'}
              </span>
            </div>
            {!isBettingPhase && !hasCrashed && (
              <div className="text-[8px] text-cyan-300 space-y-0.5 mt-0.5">
                <div>Độ cao: <strong className="text-white">{(flightTimeS * 1250).toFixed(0)} m</strong></div>
                <div>Vận tốc: <strong className="text-white">{(720 + flightTimeS * 320).toFixed(0)} km/h</strong></div>
              </div>
            )}
          </div>

          {/* Runway / Hangar visual decoration */}
          <div className="absolute bottom-0 left-0 w-24 h-9 bg-zinc-900 border-r-2 border-t-2 border-zinc-700 rounded-tr-xl z-10 shadow-lg flex items-center justify-center text-[8px] text-zinc-400 font-mono font-black tracking-wider">
            AYK-HANGAR
          </div>

          {/* FLYING ROCKET & ENEMY PURSUER */}
          {!isBettingPhase && !hasCrashed && (
            <>
              {/* ENEMY INTERCEPTOR JET pursuing from behind */}
              <div 
                style={{
                  left: `${enemyL}%`,
                  bottom: `${enemyB}%`,
                  transform: 'translate(-50%, 50%)',
                }}
                className="absolute z-20 flex items-center gap-1 select-none"
              >
                <div className="text-2xl filter drop-shadow-[0_0_10px_rgba(255,0,60,0.9)] animate-pulse">
                  🛩️
                </div>
                <span className="text-[7px] bg-red-600/90 text-white font-mono font-black px-1.5 py-0.5 rounded tracking-widest shadow-md whitespace-nowrap uppercase">
                  ĐỊCH TRUY KÍCH
                </span>
              </div>

              {/* LASER TRACER BEAM fired continuously from Enemy Jet into back of Rocket */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
                <line
                  x1={`${enemyL}%`}
                  y1={`${100 - enemyB}%`}
                  x2={`${posL}%`}
                  y2={`${100 - posB}%`}
                  stroke="#ff003c"
                  strokeWidth="3"
                  strokeDasharray="6,3"
                  className="animate-[dash_0.2s_linear_infinite]"
                />
              </svg>

              {/* MAIN PLAYER ROCKET */}
              <div
                style={{
                  left: `${posL}%`,
                  bottom: `${posB}%`,
                  transform: 'translate(-50%, 50%)',
                }}
                className="absolute z-25 text-[#00f0ff] text-glow-blue drop-shadow-[0_8px_15px_rgba(0,240,255,0.8)] flex items-center gap-1 select-none transition-all duration-75"
              >
                <Flame className="w-6 h-6 text-orange-400 animate-bounce shrink-0 rotate-90" />
                <div className="text-3xl sm:text-4xl animate-pulse filter drop-shadow-[0_0_12px_rgba(0,240,255,0.9)]">🚀</div>

                {/* PROMINENT MOBILE CASH OUT BUTTON DIRECTLY ATTACHED NEXT TO AIRPLANE */}
                {hasBetThisRound && activeBet.status === 'PLAYING' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCashOut();
                    }}
                    disabled={isProcessing}
                    className="absolute -top-14 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-400 via-green-300 to-emerald-500 hover:from-emerald-300 hover:to-green-200 text-black font-black text-xs sm:text-sm uppercase tracking-wider py-2.5 px-4 rounded-full cursor-pointer shadow-[0_0_35px_rgba(16,185,129,1)] animate-bounce flex items-center gap-1.5 whitespace-nowrap active:scale-90 select-none z-40 border-2 border-white ring-4 ring-emerald-400/50 shrink-0"
                  >
                    <Zap className="w-4 h-4 fill-black animate-pulse shrink-0" />
                    <span>🪂 BẤM DỪNG X{currentMultiplier.toFixed(2)}</span>
                  </button>
                )}
              </div>

              {/* STICKY FULL-WIDTH CANVAS JUMP BUTTON FOR MOBILE THUMB ACCESS */}
              {hasBetThisRound && activeBet.status === 'PLAYING' && (
                <div className="absolute bottom-2 left-2 right-2 z-40">
                  <button
                    type="button"
                    onClick={handleCashOut}
                    disabled={isProcessing}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 text-black font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_0_25px_rgba(16,185,129,1)] border-2 border-white cursor-pointer flex items-center justify-center gap-2 active:scale-95 animate-pulse"
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    <span>CHỐT LỜI NGAY X{currentMultiplier.toFixed(2)} (+{Math.floor(activeBet.amount * currentMultiplier).toLocaleString()} PP)</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* INSTANT EXPLOSION WHEN CRASHED */}
          {!isBettingPhase && hasCrashed && (
            <>
              {/* Enemy Jet celebrating firing shot */}
              <div 
                style={{
                  left: `${enemyL}%`,
                  bottom: `${enemyB}%`,
                  transform: 'translate(-50%, 50%)',
                }}
                className="absolute z-20 flex items-center gap-1 select-none"
              >
                <div className="text-3xl filter drop-shadow-[0_0_12px_rgba(255,0,60,1)]">🛩️💥</div>
              </div>

              {/* Laser beam connecting shot to hit point */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
                <line
                  x1={`${enemyL}%`}
                  y1={`${100 - enemyB}%`}
                  x2={`${posL}%`}
                  y2={`${100 - posB}%`}
                  stroke="#ff003c"
                  strokeWidth="5"
                  className="animate-ping"
                />
              </svg>

              {/* Target lock crosshair */}
              <div
                style={{
                  left: `${posL}%`,
                  bottom: `${posB}%`,
                  transform: 'translate(-50%, 50%)',
                }}
                className="absolute z-25 w-20 h-20 border-2 border-red-500 border-dashed rounded-full animate-spin flex items-center justify-center"
              >
                <div className="w-10 h-10 border-2 border-red-500 rounded-full animate-ping" />
              </div>

              {/* INSTANT BIG EXPLOSION CORE */}
              <div
                style={{
                  left: `${posL}%`,
                  bottom: `${posB}%`,
                  transform: 'translate(-50%, 50%) scale(2.5)',
                }}
                className="absolute z-30 text-6xl filter drop-shadow-[0_0_30px_rgba(255,0,60,1)] select-none animate-pulse"
              >
                💥
              </div>

              {/* Secondary Explosion Fire Particle Cloud */}
              <div
                style={{
                  left: `${posL}%`,
                  bottom: `${posB}%`,
                  transform: 'translate(-50%, 50%)',
                }}
                className="absolute z-29 text-3xl animate-ping select-none"
              >
                🔥⚡🚨
              </div>
            </>
          )}

          {/* Betting Phase Countdown Overlay */}
          {isBettingPhase && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 z-20 font-mono text-center px-4 backdrop-blur-xs">
              <Trophy className="w-8 h-8 text-[#ffd700] mb-1 animate-bounce" />
              <span className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">THỜI GIAN ĐẶT CƯỢC CẤT CÁNH</span>
              <span className="text-glow-gold text-[#ffd700] text-3xl sm:text-4xl font-black mt-0.5">CÒN {bettingTimeLeft} GIÂY</span>
              <p className="text-[8px] sm:text-[9px] text-slate-400 max-w-xs mt-1.5 uppercase leading-relaxed font-sans">
                Phi thuyền AYK chuẩn bị rời Hangar! Cất cánh nhận tiền thưởng gấp hàng chục lần!
              </p>
            </div>
          )}
        </div>

        {/* AUTO CASHOUT & ACTION CONTROLS */}
        <div className="mt-auto space-y-2 font-mono">
          
          {/* Auto Cashout setting row */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-2 flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setAutoCashOutEnabled(!autoCashOutEnabled)}>
              <input
                type="checkbox"
                checked={autoCashOutEnabled}
                onChange={(e) => setAutoCashOutEnabled(e.target.checked)}
                className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-300 font-bold uppercase">Tự động nhảy dù:</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-emerald-400 font-bold">x</span>
              <input
                type="number"
                step="0.10"
                min="1.05"
                max="100.00"
                value={autoCashOut}
                onChange={(e) => setAutoCashOut(e.target.value)}
                disabled={!autoCashOutEnabled}
                className="w-16 bg-black/80 border border-white/20 focus:border-emerald-400 rounded-lg p-1 text-center text-xs font-black text-emerald-300 font-mono disabled:opacity-40"
              />
              <div className="flex gap-1">
                {['1.50', '2.00', '5.00'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAutoCashOut(preset);
                      setAutoCashOutEnabled(true);
                    }}
                    className="px-1.5 py-0.5 text-[8px] bg-white/5 hover:bg-white/10 text-cyan-300 rounded border border-cyan-500/30 font-bold"
                  >
                    x{preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Zone: Betting vs Flight Status */}
          {isBettingPhase ? (
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#8b949e] uppercase font-bold text-[10px]">CƯỢC PP CẤT CÁNH:</label>
                  {!hasBetThisRound && (
                    <div className="flex gap-1">
                      {[10000, 50000, 200000, 500000].map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          onClick={() => setBetAmount(quick.toString())}
                          className="px-1.5 py-0.5 text-[9px] bg-white/5 hover:bg-white/10 text-cyan-300 rounded border border-cyan-500/30 font-bold"
                        >
                          +{(quick/1000)}k
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBetAmount((user?.pp || 0).toString())}
                        className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 font-bold uppercase"
                      >
                        TẤT TAY
                      </button>
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
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' 
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-[#00f0ff]'
                }`}
              >
                {hasBetThisRound ? '✅ [ ĐÃ ĐỒNG BỘ CƯỢC THÀNH CÔNG ]' : '🚀 [ XÁC NHẬN CẤT CÁNH PHI THUYỀN ]'}
              </button>
            </div>
          ) : (
            <div>
              {hasBetThisRound && activeBet.status === 'PLAYING' && !hasCrashed ? (
                <button
                  onClick={handleCashOut}
                  disabled={isProcessing}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 text-black border-2 border-[#00ff80] text-glow-green font-black uppercase tracking-widest text-sm rounded-xl cursor-pointer transition-all active:scale-95 shadow-[0_0_25px_rgba(0,255,128,0.5)] flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5 fill-black" />
                  <span>[ 🪂 NHẢY DÙ CHỐT LỜI (ĂN X{currentMultiplier.toFixed(2)}) ]</span>
                </button>
              ) : hasBetThisRound && activeBet.status === 'CASHED_OUT' ? (
                <button
                  disabled
                  className="w-full py-3.5 bg-emerald-950/40 border border-[#00ff80] text-[#00ff80] text-glow-green font-black uppercase tracking-widest text-xs rounded-xl cursor-not-allowed"
                >
                  🎉 ĐÃ NHẢY DÙ AN TOÀN! CHỐT X{activeBet.multiplier?.toFixed(2) || currentMultiplier.toFixed(2)}
                </button>
              ) : hasBetThisRound && activeBet.status === 'CRASHED' ? (
                <button
                  disabled
                  className="w-full py-3.5 bg-red-950/40 border border-[#ff003c] text-[#ff003c] text-glow-red font-black uppercase tracking-widest text-xs rounded-xl cursor-not-allowed"
                >
                  💥 PHI THUYỀN BỊ BẮN NỔ! TỔN THẤT TOÀN BỘ
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
        </div>

        {/* Standalone Airplane Rules Overlay */}
        {showRules && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-[5100] flex flex-col justify-between p-6 font-mono text-xs text-white rounded-2xl">
            <div>
              <h3 className="text-[#00f0ff] text-glow-blue font-black text-sm uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
                <HelpCircle className="w-5 h-5 text-[#00f0ff]" />
                Luật Chơi: KHÔNG CHIẾN AYK
              </h3>

              <div className="space-y-3 leading-relaxed text-slate-300">
                <p>• Phi thuyền AYK cất cánh bay cao, số nhân (multiplier) giải thưởng tăng dần liên tục.</p>
                <p>• Bấm nút <strong className="text-emerald-400">🪂 NHẢY DÙ</strong> ngay cạnh máy bay hoặc ở bất kỳ đâu trên màn hình để rút tiền lời lập tức.</p>
                <p>• <strong className="text-red-400">Luật bắn hạ (CRASH)</strong>: Tên lửa kẻ địch truy kích phía sau sẽ bắn nổ phi thuyền ngẫu nhiên. Nếu nổ trước khi bạn nhảy dù, bạn sẽ mất 100% tiền cược.</p>
                <p>• Bạn có thể bật <strong className="text-emerald-300">Tự động nhảy dù</strong> ở mốc chỉ định (ví dụ x2.00) để tự động chốt lời chính xác!</p>
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
