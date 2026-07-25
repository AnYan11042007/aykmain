/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ref, update, onValue } from 'firebase/database';
import { db } from '../firebase';
import { User } from '../types';
import { Calendar, Flame, Sparkles, CheckCircle2, Gift, Zap, X, Trophy, ShieldCheck, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

import { getTodayVNString, getYesterdayVNString } from '../utils/date';

interface DailyCheckInProps {
  uid: string;
  user: User | null;
  onShowResult?: (title: string, message: string, isWin: boolean) => void;
}

const STREAK_REWARDS = [
  { day: 1, pp: 500, xp: 20, multiplier: 1.0, title: 'Khởi Đầu Tri Thức', icon: '🌱' },
  { day: 2, pp: 750, xp: 30, multiplier: 1.1, title: 'Chăm Chỉ Học Hành', icon: '📖' },
  { day: 3, pp: 1000, xp: 40, multiplier: 1.2, title: 'Năng Lượng Tích Cực', icon: '⚡' },
  { day: 4, pp: 1500, xp: 50, multiplier: 1.3, title: 'Thói Quên Vàng', icon: '⭐' },
  { day: 5, pp: 2000, xp: 70, multiplier: 1.5, title: 'Học Bá Thần Tốc', icon: '🔥' },
  { day: 6, pp: 3000, xp: 90, multiplier: 1.8, title: 'Siêu Cấp Kiên Trì', icon: '🚀' },
  { day: 7, pp: 5000, xp: 150, multiplier: 2.0, title: 'ĐỈNH CAO BẢNG VÀNG', icon: '👑' },
];

export default function DailyCheckIn({ uid, user, onShowResult }: DailyCheckInProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [lastCheckInDate, setLastCheckInDate] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  const todayStr = getTodayVNString();
  const yesterdayStr = getYesterdayVNString();
  const hasCheckedInToday = lastCheckInDate === todayStr;

  useEffect(() => {
    if (!uid) return;
    const userRef = ref(db, `users/${uid}`);
    const unsubscribe = onValue(userRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setStreak(val.streak || 0);
        setLastCheckInDate(val.lastCheckInDate || '');
      }
    });
    return () => unsubscribe();
  }, [uid]);

  // Current day in 7-day cycle (1 to 7)
  let nextStreakDay = 1;
  if (hasCheckedInToday) {
    nextStreakDay = streak === 0 ? 1 : ((streak - 1) % 7) + 1;
  } else {
    if (lastCheckInDate === yesterdayStr) {
      nextStreakDay = (streak % 7) + 1;
    } else {
      nextStreakDay = 1;
    }
  }

  const currentMultiplier = STREAK_REWARDS[nextStreakDay - 1].multiplier;

  const handleCheckIn = async () => {
    if (hasCheckedInToday || isClaiming || !uid) return;
    setIsClaiming(true);

    try {
      let newStreak = 1;
      if (lastCheckInDate === yesterdayStr) {
        newStreak = streak + 1;
      }

      const cycleDay = ((newStreak - 1) % 7) + 1;
      const rewardConfig = STREAK_REWARDS[cycleDay - 1];

      // Calculate final reward with streak multiplier
      const finalPP = Math.round(rewardConfig.pp * rewardConfig.multiplier);
      const finalXP = Math.round(rewardConfig.xp * rewardConfig.multiplier);

      const userRef = ref(db, `users/${uid}`);
      const currentPP = user?.pp || 0;
      const currentXP = user?.xp || 0;

      await update(userRef, {
        pp: currentPP + finalPP,
        xp: currentXP + finalXP,
        streak: newStreak,
        lastCheckInDate: todayStr,
      });

      // Confetti & Celebration
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
      setTimeout(() => {
        confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0 } });
        confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1 } });
      }, 200);

      const msg = `🎉 ĐIỂM DANH THÀNH CÔNG (Ngày #${newStreak})!\nThở sức chuỗi Streak: +${finalPP.toLocaleString()} PP & +${finalXP} XP (Thưởng Hệ Số x${rewardConfig.multiplier.toFixed(1)})!`;
      if (onShowResult) {
        onShowResult('🔥 ĐIỂM DANH NHẬN BỘI THƯỞNG', msg, true);
      }

      setIsOpen(false);
    } catch (err) {
      console.error('Checkin error:', err);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) on Academic Dashboard */}
      <div className="fixed bottom-6 right-6 z-[6000] flex flex-col items-end gap-2 group">
        {!hasCheckedInToday && (
          <span className="px-3 py-1 bg-yellow-400 text-black font-mono font-black text-[10px] rounded-full uppercase tracking-wider animate-bounce shadow-[0_0_15px_rgba(255,215,0,0.8)] flex items-center gap-1 pointer-events-none">
            <Sparkles className="w-3 h-3 text-black" /> CHƯA ĐIỂM DANH HÔM NAY!
          </span>
        )}

        <button
          onClick={() => setIsOpen(true)}
          className={`px-5 py-3.5 rounded-2xl font-mono font-black text-xs uppercase tracking-wider flex items-center gap-3 shadow-2xl transition-all duration-300 cursor-pointer active:scale-95 ${
            hasCheckedInToday
              ? 'bg-slate-900 border-2 border-emerald-500/50 text-emerald-400 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 text-black hover:brightness-110 shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-pulse'
          }`}
        >
          <div className="relative">
            <Flame className={`w-6 h-6 ${hasCheckedInToday ? 'text-emerald-400' : 'text-black fill-black animate-spin'}`} />
            {streak > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white">
                {streak}
              </span>
            )}
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="leading-none text-[11px] font-black">
              {hasCheckedInToday ? 'ĐÃ ĐIỂM DANH (STREAK 🔥' + streak + ')' : '🔥 ĐIỂM DANH HÀNG NGÀY'}
            </span>
            <span className="text-[9px] opacity-80 leading-tight font-sans">
              Thưởng Chuỗi x{currentMultiplier.toFixed(1)} Multiplier
            </span>
          </div>
        </button>
      </div>

      {/* Daily Check-In Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#0a0f1d] border-2 border-amber-500/60 rounded-3xl p-6 md:p-8 flex flex-col shadow-[0_0_80px_rgba(245,158,11,0.3)] overflow-hidden">
            
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                    🔥 ĐIỂM DANH TÍCH CHUỖI STREAK
                  </h2>
                  <p className="text-slate-400 text-xs font-sans mt-0.5">
                    Điểm danh mỗi ngày để nhận điểm PP, XP & gia tăng **Hệ Số Nhân Multiplier**!
                  </p>
                  <p className="text-amber-300 text-[10px] font-mono mt-1 font-bold flex items-center gap-1">
                    ⏰ Tự động Reset chuỗi điểm danh lúc 00:00 (0h sáng) Giờ Việt Nam (GMT+7)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Streak & Active Multiplier Info Banner */}
            <div className="relative z-10 grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Flame className="w-6 h-6 fill-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] text-amber-400 uppercase font-bold block">Chuỗi Đăng Nhập</span>
                  <strong className="text-xl font-black text-white">{streak} NGÀY LIÊN TỤC</strong>
                </div>
              </div>

              <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Zap className="w-6 h-6 fill-cyan-400" />
                </div>
                <div>
                  <span className="text-[10px] text-cyan-400 uppercase font-bold block">Thưởng Multiplier</span>
                  <strong className="text-xl font-black text-cyan-300">x{currentMultiplier.toFixed(1)} BONUS PP</strong>
                </div>
              </div>
            </div>

            {/* 7-Day Rewards Timeline Grid */}
            <div className="relative z-10 mb-6 space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" /> LỘ TRÌNH THƯỞNG 7 NGÀY CHUỖI STREAK
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {STREAK_REWARDS.map((r) => {
                  const isCurrentTarget = nextStreakDay === r.day && !hasCheckedInToday;
                  const isCompleted = hasCheckedInToday ? ((streak - 1) % 7) + 1 >= r.day : ((streak - 1) % 7) + 1 >= r.day;

                  return (
                    <div
                      key={r.day}
                      className={`p-3 rounded-2xl border text-center flex flex-col justify-between transition-all ${
                        isCurrentTarget
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-105'
                          : isCompleted
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 opacity-80'
                            : 'bg-slate-900/60 border-white/10 text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase mb-1">
                          <span>N.0{r.day}</span>
                          <span className="text-[10px]">{r.icon}</span>
                        </div>
                        <span className="text-[11px] font-black block text-amber-300">
                          +{(r.pp * r.multiplier).toLocaleString()} PP
                        </span>
                        <span className="text-[9px] text-slate-400 block font-sans">
                          +{r.xp} XP
                        </span>
                      </div>

                      <div className="mt-2 pt-1 border-t border-white/5">
                        <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-full inline-block">
                          x{r.multiplier.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Check-In Action Button */}
            <div className="relative z-10 pt-2 border-t border-white/10 flex flex-col items-center gap-3">
              <button
                onClick={handleCheckIn}
                disabled={hasCheckedInToday || isClaiming}
                className={`w-full py-4 rounded-2xl font-mono font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all cursor-pointer ${
                  hasCheckedInToday
                    ? 'bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 cursor-not-allowed opacity-90'
                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 text-black hover:brightness-110 shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-98'
                }`}
              >
                {hasCheckedInToday ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>ĐÃ ĐIỂM DANH HÔM NAY - HẸN GẶP LẠI NGÀY MAI!</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5 text-black animate-bounce" />
                    <span>{isClaiming ? 'ĐANG NHẬN THƯỞNG...' : 'ĐIỂM DANH HÔM NAY (NHẬN THƯỞNG MULTIPLIER)'}</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-400 font-sans text-center">
                💡 Mẹo: Duy trì chuỗi Streak liên tục không đứt quãng để đạt cột mốc Ngày 7 nhận x2.0 Thưởng Multiplier Jackpot!
              </p>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
