/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { User } from '../types';
import { 
  CheckCircle2, 
  Calendar, 
  Target, 
  Award, 
  Sparkles, 
  Flame, 
  Trophy, 
  MessageSquare, 
  Landmark, 
  ShoppingBag, 
  BookOpen, 
  Compass, 
  RefreshCw,
  HelpCircle,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getOrInitializeUserMissions, 
  claimMissionReward, 
  UserMission, 
  getTodayString 
} from '../utils/missions';

interface DailyMissionsProps {
  uid: string;
  user: User | null;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

export default function DailyMissions({ uid, user, onShowResult }: DailyMissionsProps) {
  const [missions, setMissions] = useState<UserMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const todayStr = getTodayString();

  // Load and sync real-time user missions of today
  useEffect(() => {
    if (!uid) return;

    setLoading(true);
    // Initialize missions if needed
    getOrInitializeUserMissions(uid).then((initialList) => {
      setMissions(initialList);
      setLoading(false);
    }).catch((err) => {
      console.error('Error initializing user missions:', err);
      setLoading(false);
    });

    // Sync in real-time
    const userMissionsRef = ref(db, `users/${uid}/daily_missions/${todayStr}/missions_list`);
    const unsubscribe = onValue(userMissionsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: UserMission[] = Array.isArray(val) ? val : Object.values(val);
        setMissions(list);
      }
    });

    return () => unsubscribe();
  }, [uid, todayStr]);

  const handleClaimReward = async (missionId: string, title: string) => {
    if (claimingId) return;
    setClaimingId(missionId);
    try {
      const res = await claimMissionReward(uid, missionId);
      if (res.success) {
        onShowResult(
          'NHẬN THƯỞNG NHIỆM VỤ 🎉',
          `Sếp đã hoàn thành xuất sắc nhiệm vụ:\n"${title}"\nPhần thưởng: +${res.reward.toLocaleString()} PP và +40 XP Battle Pass đã được cộng vào tài khoản!${
            res.levelUp ? '\n\n🏅 CHÚC MỪNG SẾP ĐÃ LÊN CẤP BATTLE PASS MỚI!' : ''
          }`,
          true
        );
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi nhận quà!');
    } finally {
      setClaimingId(null);
    }
  };

  const getMissionIcon = (type: string) => {
    switch (type) {
      case 'check_in':
        return <Calendar className="w-4 h-4 text-cyan-400" />;
      case 'taixiu_wins':
        return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 'crash_rides':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'penalty_goals':
        return <Target className="w-4 h-4 text-emerald-400" />;
      case 'chat_messages':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'wheel_spins':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'bank_deposit':
        return <Landmark className="w-4 h-4 text-amber-500" />;
      case 'marketplace_buy':
        return <ShoppingBag className="w-4 h-4 text-rose-400" />;
      case 'ai_chat':
        return <BookOpen className="w-4 h-4 text-cyan-500" />;
      case 'horse_rides':
        return <Compass className="w-4 h-4 text-red-400" />;
      default:
        return <Award className="w-4 h-4 text-slate-400" />;
    }
  };

  // Compute stats
  const totalCount = missions.length || 10;
  const completedCount = missions.filter(m => m.current >= m.target).length;
  const claimedCount = missions.filter(m => m.claimed).length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  // SVG Progress Ring
  const radius = 34;
  const stroke = 5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div className="glass-box p-4 border-white/5 relative overflow-hidden flex flex-col gap-4 font-mono w-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f0ff]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Progress Section */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-3">
        {/* Circle Progress Ring */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
            <circle
              stroke="rgba(255,255,255,0.04)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <motion.circle
              stroke="#00f0ff"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-white text-xs font-black text-glow-blue leading-none">
              {progressPercentage}%
            </span>
          </div>
        </div>

        {/* Text descriptions */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-black text-xs tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00f0ff] animate-pulse" />
            Nhiệm Vụ Hàng Ngày
          </h4>
          <p className="text-[9px] text-[#8b949e] leading-snug mt-1">
            Cày 20 nhiệm vụ ngẫu nhiên mỗi ngày để nhận PP học bổng miễn phí!
          </p>
        </div>
      </div>

      {/* Stat Bar */}
      <div className="grid grid-cols-2 gap-2 bg-black/40 p-2 rounded-xl text-center border border-white/5 text-[9px] font-bold">
        <div className="border-r border-white/10">
          <span className="block text-slate-500 uppercase">Hoàn Thành:</span>
          <span className="text-emerald-400 text-glow-green text-xs font-black">{completedCount}/{totalCount} OK</span>
        </div>
        <div>
          <span className="block text-slate-500 uppercase">Đã Nhận Thưởng:</span>
          <span className="text-yellow-400 text-glow-gold text-xs font-black">{claimedCount}/{totalCount} VÁN</span>
        </div>
      </div>

      {/* Missions scrollable list */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <div className="w-6 h-6 border-2 border-[#00f0ff]/20 border-t-[#00f0ff] rounded-full animate-spin"></div>
            <span className="text-[8px] text-slate-400 uppercase tracking-widest animate-pulse">Đang nạp 10 nhiệm vụ...</span>
          </div>
        ) : (
          <AnimatePresence>
            {missions.map((m) => {
              const isCompleted = m.current >= m.target;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`p-3 rounded-xl border transition-all text-xs flex flex-col gap-2 relative ${
                    m.claimed
                      ? 'bg-black/25 border-white/5 opacity-50'
                      : isCompleted
                        ? 'bg-emerald-950/15 border-emerald-500/30 hover:border-emerald-500/50'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex gap-2 min-w-0">
                      <div className="shrink-0 p-1.5 bg-white/5 rounded-lg border border-white/5">
                        {getMissionIcon(m.type)}
                      </div>
                      <div className="min-w-0">
                        <span className={`block font-bold text-[10px] leading-tight truncate ${
                          m.claimed ? 'text-slate-400 line-through' : 'text-white'
                        }`}>
                          {m.title}
                        </span>
                        <span className="block text-[8px] text-[#8b949e] leading-snug mt-0.5 font-sans">
                          {m.description}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-yellow-400 shrink-0 text-glow-gold">
                      +{m.reward.toLocaleString()} PP
                    </span>
                  </div>

                  {/* Progress and Claim status */}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
                    {/* Tiny Progress bar */}
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            m.claimed
                              ? 'bg-slate-600'
                              : isCompleted
                                ? 'bg-emerald-400'
                                : 'bg-[#00f0ff]'
                          }`}
                          style={{ width: `${Math.min((m.current / m.target) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-[#8b949e] font-mono shrink-0">
                        {m.current}/{m.target}
                      </span>
                    </div>

                    {/* Claim Button or Label */}
                    <div className="shrink-0">
                      {m.claimed ? (
                        <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-0.5 px-2 rounded-md font-bold uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Đã Nhận
                        </span>
                      ) : isCompleted ? (
                        <button
                          onClick={() => handleClaimReward(m.id, m.title)}
                          disabled={claimingId !== null}
                          className="text-[8px] bg-yellow-400 hover:bg-yellow-300 text-black py-0.5 px-2.5 rounded-md font-black uppercase transition-all cursor-pointer shadow-[0_0_10px_rgba(234,179,8,0.4)] active:scale-95"
                        >
                          {claimingId === m.id ? 'Đang nhận...' : 'Nhận Quà'}
                        </button>
                      ) : (
                        <span className="text-[8px] bg-white/5 border border-white/5 text-slate-500 py-0.5 px-2 rounded-md font-bold uppercase">
                          Chưa Đạt
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Reroll note or info */}
      <div className="text-[8px] text-slate-500 leading-normal flex items-center gap-1 bg-white/5 p-2 rounded-lg border border-white/5 mt-1">
        <HelpCircle className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
        <span>Nhiệm vụ tự động làm mới hàng ngày lúc 00:00. Hãy hoàn thành để gặt hái tài lộc nhé!</span>
      </div>
    </div>
  );
}
