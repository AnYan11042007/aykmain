/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { User } from '../types';
import { Trophy, Award, Crown, Sparkles, User as UserIcon, PartyPopper, Search, Globe, Shield, Zap, Medal, Star, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { AvatarFrameContainer } from './AvatarFrameContainer';

interface RankingsPortalProps {
  uid: string;
  user: User | null;
}

interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  class: string;
  pp: number;
  stats?: number[];
  title?: string;
  goldAmount?: number;
  activeFrame?: string;
  powerScore?: number;
  cardPoints?: number;
  cardWins?: number;
  cardLosses?: number;
}

export default function RankingsPortal({ uid, user }: RankingsPortalProps) {
  const [activeTab, setActiveTab] = useState<'pp' | 'gold' | 'card'>('card');
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isShaking, setIsShaking] = useState(false);
  const [milestoneBanner, setMilestoneBanner] = useState<string | null>(null);
  const [showRewardsModal, setShowRewardsModal] = useState(false);

  // Real-time Card Rank Rewards Config from Admin
  const [cardRewards, setCardRewards] = useState({
    top1PP: 50000,
    top1Title: 'VUA THẺ BÀI',
    top2PP: 30000,
    top3PP: 15000,
    top4To10PP: 5000,
    maxTopRewarded: 10,
    notice: '📌 Lưu ý: Mọi thắc mắc hoặc cập nhật danh mục giải thưởng vui lòng liên hệ Ban Quản Trị Admin qua mục Quản Lý Admin.'
  });

  useEffect(() => {
    const rewardsRef = ref(db, 'settings/card_rank_rewards');
    const unsub = onValue(rewardsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setCardRewards({
          top1PP: val.top1PP ?? 50000,
          top1Title: val.top1Title || 'VUA THẺ BÀI',
          top2PP: val.top2PP ?? 30000,
          top3PP: val.top3PP ?? 15000,
          top4To10PP: val.top4To10PP ?? 5000,
          maxTopRewarded: val.maxTopRewarded ?? 10,
          notice: val.notice || '📌 Lưu ý: Mọi thắc mắc hoặc cập nhật danh mục giải thưởng vui lòng liên hệ Ban Quản Trị Admin qua mục Quản Lý Admin.'
        });
      }
    });
    return () => unsub();
  }, []);

  // 7-Day Cycle Countdown Hook for Card Battle Leaderboard
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 6,
    hours: 23,
    minutes: 59,
    seconds: 59
  });

  useEffect(() => {
    const calculateResetTime = () => {
      const now = new Date();
      // Reset cycle every Sunday at midnight
      const day = now.getDay(); // 0 is Sunday
      const daysUntilSunday = day === 0 ? 7 : 7 - day;
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 0, 0, 0);
      const diff = Math.max(0, target.getTime() - now.getTime());

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
    };

    calculateResetTime();
    const timer = setInterval(calculateResetTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const prevRankRef = useRef<number | null>(null);

  const triggerCelebration = (bannerMsg?: string) => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } });
      }, 150);
    } catch (e) {
      console.error(e);
    }

    if (bannerMsg) {
      setMilestoneBanner(bannerMsg);
      setTimeout(() => setMilestoneBanner(null), 5000);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snap) => {
      const list: LeaderboardUser[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          const val = child.val();
          // Exclude Admin/Teacher accounts from rankings
          if (val.role === 'TEACHER') return;

          const pp = val.pp || 0;
          const goldAmount = val.gold?.amount || 0;
          const stats = val.stats || [50, 50, 50, 50, 50];
          const academicScore = (stats[0] || 0) + (stats[1] || 0) + (stats[2] || 0) + (stats[3] || 0) + (stats[4] || 0);
          const powerScore = pp + (goldAmount * 10) + (academicScore * 20);

          list.push({
            id: child.key!,
            name: val.name || 'Sinh Viên',
            avatar: val.avatar || '',
            class: val.class || 'N/A',
            pp,
            stats,
            title: val.title || '',
            goldAmount,
            activeFrame: val.activeFrame || '',
            powerScore,
            cardPoints: val.cardPoints || 0,
            cardWins: val.cardWins || 0,
            cardLosses: val.cardLosses || 0
          });
        });
      }

      // Sort according to selected tab
      if (activeTab === 'card') {
        list.sort((a, b) => (b.cardPoints || 0) - (a.cardPoints || 0));
      } else if (activeTab === 'pp') {
        list.sort((a, b) => b.pp - a.pp);
      } else if (activeTab === 'gold') {
        list.sort((a, b) => (b.goldAmount || 0) - (a.goldAmount || 0));
      }

      setLeaderboard(list);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab]);

  // Handle rank improvement or milestone check
  useEffect(() => {
    if (leaderboard.length > 0 && uid) {
      const myIndex = leaderboard.findIndex((u) => u.id === uid);
      if (myIndex !== -1) {
        const currentRank = myIndex + 1;
        const prevRank = prevRankRef.current;

        if (prevRank !== null && currentRank < prevRank) {
          let msg = `🎉 THĂNG HẠNG THÀNH CÔNG! Bạn đã vươn từ Hạng #${prevRank} lên Hạng #${currentRank}!`;
          if (currentRank === 1) {
            msg = `👑 QUÁN QUÂN XẾP HẠNG! Bạn đã xuất sắc vươn lên TOP 1 CỦA SERVER!`;
          } else if (currentRank <= 3) {
            msg = `🏆 ĐỘT PHÁ TOP 3! Bạn đã đạt Hạng #${currentRank} Bảng Vàng!`;
          } else if (currentRank <= 10) {
            msg = `🌟 ĐỘT PHÁ TOP 10! Bạn đã thăng hạng lên Vị trí #${currentRank}!`;
          }
          triggerCelebration(msg);
        }

        prevRankRef.current = currentRank;
      }
    }
  }, [leaderboard, uid]);

  const myRank = leaderboard.findIndex((u) => u.id === uid) + 1;
  const myUserObj = leaderboard.find((u) => u.id === uid);

  const filteredLeaderboard = leaderboard.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.title && u.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  const handleManualCelebrate = () => {
    if (myRank > 0) {
      let msg = `✨ CHÚC MỪNG MỐC THÀNH TỰU! Hiện bạn đang đứng Hạng #${myRank} trên Bảng Xếp Hạng!`;
      if (myRank === 1) msg = `👑 ĐỈNH CAO THÀNH TỰU! Bạn đang nắm giữ vị trí TOP 1 SERVER!`;
      else if (myRank <= 3) msg = `🏆 THÀNH TỰU TOP 3! Vinh danh TOP 3 Cao Thủ xuất sắc!`;
      else if (myRank <= 10) msg = `🌟 THÀNH TỰU TOP 10! Vinh danh TOP 10 Sinh Viên Xuất Sắc!`;
      triggerCelebration(msg);
    } else {
      triggerCelebration(`🎉 BẬT MỐC THÀNH TỰU & PHÁO HOA XẾP HẠNG!`);
    }
  };

  return (
    <div className={`space-y-6 transition-transform duration-200 ${isShaking ? 'shake-screen' : ''}`}>
      {/* Milestone Celebration Toast Banner */}
      {milestoneBanner && (
        <div className="p-4 bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 border-2 border-yellow-400/80 rounded-2xl shadow-[0_0_30px_rgba(255,215,0,0.5)] flex items-center justify-between gap-3 text-yellow-300 font-mono text-xs md:text-sm font-black animate-bounce backdrop-blur-md">
          <div className="flex items-center gap-3">
            <PartyPopper className="w-6 h-6 text-yellow-400 animate-spin" />
            <span>{milestoneBanner}</span>
          </div>
          <button
            onClick={() => setMilestoneBanner(null)}
            className="px-2 py-1 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 transition text-[10px]"
          >
            ĐÓNG
          </button>
        </div>
      )}

      {/* Top Header Glass Card */}
      <div className="p-6 border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-black/80 to-purple-950/20 backdrop-blur-xl rounded-2xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-[0_0_30px_rgba(255,215,0,0.1)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-yellow-400 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-black font-sans text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500 tracking-wider uppercase">
              XẾP HẠNG
            </h2>
          </div>
          <p className="text-xs text-slate-300 font-mono uppercase flex flex-wrap items-center gap-2">
            <span>Vinh danh những Trùm Thẻ, Giàu Nhất Server & Trùm Sàn Vàng xuất sắc nhất S-System 88</span>
            {myRank > 0 && (
              <span className="text-yellow-300 font-black bg-yellow-500/20 border border-yellow-400/50 px-2.5 py-0.5 rounded-full text-[11px] shadow-[0_0_10px_rgba(250,204,21,0.3)]">
                🏆 Hạng của bạn: #{myRank} {myUserObj ? `(${activeTab === 'card' ? `${myUserObj.cardPoints || 0} Điểm` : activeTab === 'pp' ? `${myUserObj.pp.toLocaleString()} PP` : `${myUserObj.goldAmount?.toLocaleString()} Lượng`})` : ''}
              </span>
            )}
          </p>
        </div>

        {/* Categories selector & Celebration button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleManualCelebrate}
            className="py-2.5 px-3.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:brightness-125 text-black font-mono font-black text-xs rounded-xl flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,215,0,0.4)] transition cursor-pointer active:scale-95 border border-yellow-200"
            title="Ăn mừng mốc thứ hạng thành tựu hiện tại"
          >
            <Sparkles className="w-4 h-4 text-black animate-spin" />
            <span>ĂN MỪNG THÀNH TỰU</span>
          </button>

          <div className="flex flex-wrap bg-black/60 border border-white/10 rounded-xl p-1 font-mono text-xs backdrop-blur-md">
            <button
              onClick={() => setActiveTab('card')}
              className={`py-2 px-3.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'card' ? 'bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 text-white font-black shadow-[0_0_15px_rgba(168,85,247,0.6)]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-yellow-300" /> TRÙM THẺ
            </button>
            <button
              onClick={() => setActiveTab('pp')}
              className={`py-2 px-3.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'pp' ? 'bg-emerald-400 text-black font-black shadow-[0_0_12px_rgba(52,211,153,0.5)]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> GIÀU NHẤT SERVER
            </button>
            <button
              onClick={() => setActiveTab('gold')}
              className={`py-2 px-3.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'gold' ? 'bg-amber-400 text-black font-black shadow-[0_0_12px_rgba(251,191,36,0.5)]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" /> SÀN VÀNG
            </button>
          </div>
        </div>
      </div>

      {/* 🃏 SPECIAL BANNER & 7-DAY RESET TIMER FOR "TRÙM THẺ" TAB */}
      {activeTab === 'card' && (
        <div className="p-5 border border-purple-500/40 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-black/80 backdrop-blur-xl rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.2)] space-y-3 font-mono">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400 text-purple-300 text-[10px] font-black uppercase tracking-wider">
                  🔥 CHẾ ĐỘ THI ĐẤU THẺ BÀI 7 NGÀY
                </span>
                <span className="text-yellow-300 text-xs font-bold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> Reset Điểm Sau 7 Ngày
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Thứ hạng tính dựa trên kết quả thi đấu Đấu Trường Thẻ 1v1. Bảng xếp hạng sẽ tự động làm mới chu kỳ 7 ngày!
              </p>
            </div>

            {/* Countdown Clock */}
            <div className="bg-black/80 border border-purple-400/50 px-4 py-2 rounded-xl flex items-center gap-3 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Zap className="w-5 h-5 text-yellow-400 animate-bounce" />
              <div className="text-right">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Thời gian làm mới chu kỳ:</span>
                <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-purple-300">
                  {timeLeft.days} ngày {timeLeft.hours}g {timeLeft.minutes}p {timeLeft.seconds}s
                </span>
              </div>
            </div>
          </div>

          {/* Scoring Rules & Admin Reward Notice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-purple-500/20">
            <div className="p-3 bg-black/60 rounded-xl border border-white/10 text-xs text-slate-300 space-y-1">
              <span className="font-bold text-yellow-300 block uppercase text-[11px]">⚡ Quy tắc tính điểm Trùm Thẻ:</span>
              <ul className="space-y-0.5 text-[10.5px]">
                <li>• ⚔️ Thắng Người chơi (PvP): <strong className="text-emerald-400">+3 Điểm</strong></li>
                <li>• 🤖 Thắng AI Bot Tối Thượng: <strong className="text-cyan-300">+1 Điểm</strong></li>
                <li>• ❌ Thua trận / Đầu hàng: <strong className="text-rose-400">-1 Điểm</strong></li>
              </ul>
            </div>

            <div className="p-3 bg-purple-950/50 rounded-xl border border-purple-400/40 text-xs text-purple-200 flex flex-col justify-between gap-2">
              <div>
                <span className="font-bold text-yellow-300 block uppercase text-[11px] flex items-center gap-1">
                  🎁 Phần thưởng TOP Bảng Xếp Hạng:
                </span>
                <p className="text-[10.5px] text-slate-300 mt-0.5">
                  Phần thưởng từng TOP (Top 1, Top 2, Top 3, Top 10) sẽ do <strong className="text-yellow-300">Admin phê duyệt và ban hành trực tiếp</strong> cuối mỗi chu kỳ 7 ngày!
                </p>
              </div>
              <button
                onClick={() => setShowRewardsModal(true)}
                className="py-1.5 px-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-[10px] uppercase rounded-lg shadow-[0_0_10px_rgba(250,204,21,0.4)] hover:brightness-125 transition self-end cursor-pointer"
              >
                📜 XEM BẢNG CƠ CẤU PHẦN THƯỞNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🏆 TOP 3 GLASS PODIUM WIDGET */}
      {!isLoading && leaderboard.length >= 3 && (
        <div className="p-6 border border-white/10 bg-gradient-to-b from-slate-950/80 via-purple-950/20 to-black/90 backdrop-blur-xl rounded-2xl space-y-4 shadow-[0_0_35px_rgba(0,0,0,0.8)] relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 font-mono">
            <span className="text-xs font-black uppercase text-yellow-300 tracking-wider flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400 animate-pulse" /> 🏆 TOP 3 CAO THỦ XUẤT SẮC NHẤT {activeTab === 'card' ? 'TRÙM THẺ' : activeTab === 'pp' ? 'GIÀU NHẤT SERVER' : 'SÀN VÀNG'}
            </span>
            <span className="text-[10px] text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
              Cập nhật trực tiếp từ Firebase
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end pt-4 pb-2">
            
            {/* 🥈 TOP 2 - Á QUÂN (LEFT PODIUM) */}
            {top2 && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="w-full p-4 rounded-2xl border border-slate-300/40 bg-gradient-to-b from-slate-800/60 via-slate-900/80 to-black/90 backdrop-blur-md shadow-[0_0_25px_rgba(203,213,225,0.25)] flex flex-col items-center text-center space-y-2 relative group hover:scale-[1.03] transition-all">
                  {/* Badge 2nd */}
                  <div className="absolute -top-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 text-black font-black text-[10px] uppercase tracking-wider border border-white shadow-[0_0_15px_rgba(203,213,225,0.8)] flex items-center gap-1 z-10">
                    🥈 Á QUÂN
                  </div>

                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-black/60 border-2 border-slate-200 mt-2 shadow-[0_0_15px_rgba(203,213,225,0.4)] relative">
                    {top2.avatar && top2.avatar.trim() ? (
                      <img src={top2.avatar.trim()} alt={top2.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-8 h-8 text-slate-300 m-auto mt-3" />
                    )}
                  </div>

                  <div className="w-full">
                    <strong className="block text-white text-xs sm:text-sm truncate font-bold">{top2.name}</strong>
                    <span className="text-[9px] font-mono text-slate-300 uppercase block font-semibold">{top2.class}</span>
                  </div>

                  <div className="bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-300/30 w-full font-mono text-[10px]">
                    <span className="text-slate-200 font-bold block">
                      {activeTab === 'card' ? `${(top2.cardPoints || 0).toLocaleString()} Điểm Thẻ` : activeTab === 'pp' ? `${top2.pp.toLocaleString()} PP` : `${top2.goldAmount?.toLocaleString()} Lượng`}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 👑 TOP 1 - QUÁN QUÂN (CENTER PODIUM - ELEVATED) */}
            {top1 && (
              <motion.div
                initial={{ y: 40, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center -mt-6 sm:-mt-8 z-20"
              >
                <div className="w-full p-4 sm:p-5 rounded-2xl border-2 border-yellow-400/90 bg-gradient-to-b from-amber-950/60 via-yellow-950/30 to-black/95 backdrop-blur-xl shadow-[0_0_45px_rgba(250,204,21,0.5)] flex flex-col items-center text-center space-y-2.5 relative group hover:scale-[1.04] transition-all">
                  {/* Floating Crown Badge */}
                  <div className="absolute -top-6 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-black font-black text-[11px] uppercase tracking-wider border-2 border-yellow-200 shadow-[0_0_20px_rgba(250,204,21,0.9)] flex items-center gap-1 z-20 animate-bounce">
                    <Crown className="w-3.5 h-3.5 text-black" /> 👑 QUÁN QUÂN
                  </div>

                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-black/80 border-4 border-yellow-400 mt-2 shadow-[0_0_25px_rgba(250,204,21,0.8)] relative">
                    {top1.avatar && top1.avatar.trim() ? (
                      <img src={top1.avatar.trim()} alt={top1.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-10 h-10 text-yellow-300 m-auto mt-3" />
                    )}
                  </div>

                  <div className="w-full">
                    <strong className="block text-yellow-200 text-sm sm:text-base truncate font-black drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
                      {top1.name}
                    </strong>
                    <span className="text-[9.5px] font-mono text-amber-300 uppercase block font-bold">{top1.class}</span>
                  </div>

                  <div className="bg-yellow-950/80 px-3 py-1 rounded-xl border border-yellow-400/60 w-full font-mono text-xs shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                    <span className="text-yellow-300 font-black block">
                      {activeTab === 'card' ? `${(top1.cardPoints || 0).toLocaleString()} Điểm Thẻ` : activeTab === 'pp' ? `${top1.pp.toLocaleString()} PP` : `${top1.goldAmount?.toLocaleString()} Lượng`}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 🥉 TOP 3 - QUÝ QUÂN (RIGHT PODIUM) */}
            {top3 && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="w-full p-4 rounded-2xl border border-amber-600/50 bg-gradient-to-b from-amber-950/50 via-slate-900/80 to-black/90 backdrop-blur-md shadow-[0_0_25px_rgba(217,119,6,0.25)] flex flex-col items-center text-center space-y-2 relative group hover:scale-[1.03] transition-all">
                  {/* Badge 3rd */}
                  <div className="absolute -top-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white font-black text-[10px] uppercase tracking-wider border border-amber-300 shadow-[0_0_15px_rgba(217,119,6,0.8)] flex items-center gap-1 z-10">
                    🥉 QUÝ QUÂN
                  </div>

                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-black/60 border-2 border-amber-500 mt-2 shadow-[0_0_15px_rgba(217,119,6,0.4)] relative">
                    {top3.avatar && top3.avatar.trim() ? (
                      <img src={top3.avatar.trim()} alt={top3.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-8 h-8 text-amber-400 m-auto mt-3" />
                    )}
                  </div>

                  <div className="w-full">
                    <strong className="block text-white text-xs sm:text-sm truncate font-bold">{top3.name}</strong>
                    <span className="text-[9px] font-mono text-amber-300/80 uppercase block font-semibold">{top3.class}</span>
                  </div>

                  <div className="bg-amber-950/80 px-2.5 py-1 rounded-xl border border-amber-600/30 w-full font-mono text-[10px]">
                    <span className="text-amber-300 font-bold block">
                      {activeTab === 'card' ? `${(top3.cardPoints || 0).toLocaleString()} Điểm Thẻ` : activeTab === 'pp' ? `${top3.pp.toLocaleString()} PP` : `${top3.goldAmount?.toLocaleString()} Lượng`}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      )}

      {/* Leaderboard Rows & Search Filter Viewport */}
      <div className="p-5 border border-white/10 bg-black/60 backdrop-blur-xl rounded-2xl font-mono text-xs space-y-4 relative min-h-[350px] shadow-2xl">
        
        {/* Search bar & info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sinh viên, lớp, danh hiệu..."
              className="w-full bg-black/60 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400/80 transition"
            />
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <span>Tổng số sinh viên ghi danh: <strong className="text-cyan-300">{leaderboard.length}</strong></span>
          </div>
        </div>

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl z-20">
            <div className="flex items-center gap-2 text-yellow-300 font-bold uppercase tracking-wider animate-pulse">
              <Sparkles className="w-5 h-5 animate-spin text-yellow-400" /> ĐANG TẢI BẢNG XẾP HẠNG FIREBASE...
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Table Header */}
            <div className="grid grid-cols-12 px-4 text-slate-400 font-bold uppercase text-[9.5px] border-b border-white/10 pb-2">
              <div className="col-span-2 sm:col-span-1 text-center">HẠNG</div>
              <div className="col-span-6 sm:col-span-6 pl-2">SINH VIÊN S-SYSTEM 88</div>
              <div className="col-span-2 text-center hidden sm:block">LỚP</div>
              <div className="col-span-4 sm:col-span-3 text-right">CHỈ SỐ THÀNH TỰU</div>
            </div>

            {filteredLeaderboard.length === 0 ? (
              <p className="text-center italic text-slate-400 py-12">Không tìm thấy sinh viên nào phù hợp.</p>
            ) : (
              filteredLeaderboard.map((u) => {
                const rank = leaderboard.findIndex((item) => item.id === u.id) + 1;
                const isMe = u.id === uid;
                
                // Custom Badges for Top 3 and Top 10
                let rankBadge = (
                  <span className="w-7 h-7 flex items-center justify-center rounded-full text-[11px] font-black border text-slate-400 border-white/10 bg-white/5">
                    #{rank}
                  </span>
                );

                if (rank === 1) {
                  rankBadge = (
                    <span className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-black bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 text-black border-2 border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-pulse">
                      🥇
                    </span>
                  );
                } else if (rank === 2) {
                  rankBadge = (
                    <span className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-black bg-gradient-to-br from-slate-100 via-slate-300 to-slate-500 text-black border-2 border-slate-200 shadow-[0_0_15px_rgba(203,213,225,0.8)]">
                      🥈
                    </span>
                  );
                } else if (rank === 3) {
                  rankBadge = (
                    <span className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-black bg-gradient-to-br from-amber-600 via-orange-600 to-amber-800 text-white border-2 border-amber-300 shadow-[0_0_15px_rgba(217,119,6,0.8)]">
                      🥉
                    </span>
                  );
                } else if (rank <= 10) {
                  rankBadge = (
                    <span className="w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black border border-cyan-400/60 bg-cyan-950/80 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                      #{rank}
                    </span>
                  );
                }

                return (
                  <div
                    key={u.id}
                    className={`grid grid-cols-12 items-center py-3 px-4 rounded-2xl border transition-all ${
                      isMe 
                        ? 'bg-gradient-to-r from-rose-950/40 via-red-950/30 to-black/80 border-rose-500/60 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] ring-1 ring-rose-400' 
                        : rank === 1
                        ? 'bg-gradient-to-r from-amber-950/30 via-yellow-950/10 to-black/70 border-yellow-400/40 text-white hover:border-yellow-300'
                        : 'bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.08]'
                    }`}
                  >
                    {/* Custom Rank Badge */}
                    <div className="col-span-2 sm:col-span-1 flex justify-center">
                      {rankBadge}
                    </div>

                    {/* Name, Avatar & Title */}
                    <div className="col-span-6 sm:col-span-6 pl-2 flex items-center gap-3">
                      <AvatarFrameContainer
                        avatarUrl={u.avatar}
                        frameUrl={u.activeFrame}
                        size="sm"
                        showSparkles={true}
                      />
                      
                      <div className="min-w-0">
                        <strong className="block text-white text-xs sm:text-sm truncate flex items-center gap-1.5 font-bold">
                          {u.name}
                          {isMe && <span className="py-0.5 px-2 bg-rose-500/30 text-rose-300 border border-rose-400/50 text-[8px] rounded-full uppercase font-black font-mono shadow-[0_0_8px_rgba(244,63,94,0.5)]">BẠN</span>}
                        </strong>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-slate-400 font-mono sm:hidden">{u.class} •</span>
                          {u.title ? (
                            <span className="inline-block border border-yellow-400/50 text-yellow-300 bg-yellow-500/10 text-[8px] font-black uppercase px-2 py-0.2 rounded-full">
                              {u.title}
                            </span>
                          ) : (
                            <span className="text-[8px] text-slate-400">Sinh viên S88</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2 text-center text-slate-300 font-bold uppercase hidden sm:block">{u.class}</div>

                    {/* Performance Value */}
                    <div className="col-span-4 sm:col-span-3 text-right font-mono">
                      {activeTab === 'card' && (
                        <div>
                          <strong className="text-purple-300 text-xs sm:text-sm font-black drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] block">
                            {(u.cardPoints || 0).toLocaleString()} <span className="text-[9px] text-purple-200">ĐIỂM</span>
                          </strong>
                          <span className="text-[8.5px] text-slate-400 block font-normal">
                            Thắng {u.cardWins || 0} - Thua {u.cardLosses || 0}
                          </span>
                        </div>
                      )}
                      {activeTab === 'pp' && (
                        <strong className="text-emerald-400 text-xs sm:text-sm font-black drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] block">
                          {u.pp.toLocaleString()} PP
                        </strong>
                      )}
                      {activeTab === 'gold' && (
                        <strong className="text-amber-300 text-xs sm:text-sm font-black block">
                          {u.goldAmount?.toLocaleString()} LƯỢNG
                        </strong>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 📜 ADMIN REWARDS BREAKDOWN MODAL */}
      <AnimatePresence>
        {showRewardsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-950 border-2 border-amber-400/80 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-[0_0_40px_rgba(250,204,21,0.3)] font-mono relative"
            >
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
                <h3 className="text-base font-black text-yellow-300 uppercase tracking-wider flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" /> CƠ CẤU PHẦN THƯỞNG TRÙM THẺ (7 NGÀY)
                </h3>
                <button
                  onClick={() => setShowRewardsModal(false)}
                  className="text-slate-400 hover:text-white font-bold text-sm px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Cuối mỗi chu kỳ 7 ngày, hệ thống tự động tổng kết điểm. <strong className="text-yellow-300">Admin sẽ phê duyệt & ban hành phần thưởng</strong> trực tiếp cho sinh viên thuộc TOP!
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-400/50 rounded-xl flex items-center justify-between">
                  <span className="font-black text-yellow-300 flex items-center gap-1.5">🥇 TOP 1 - QUÁN QUÂN THẺ BÀI:</span>
                  <span className="font-mono text-emerald-400 font-bold">+{cardRewards.top1PP.toLocaleString()} PP {cardRewards.top1Title ? `+ Danh hiệu "${cardRewards.top1Title}"` : ''}</span>
                </div>

                <div className="p-3 bg-gradient-to-r from-slate-400/20 to-slate-500/10 border border-slate-300/40 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">🥈 TOP 2 - Á QUÂN THẺ BÀI:</span>
                  <span className="font-mono text-emerald-400 font-bold">+{cardRewards.top2PP.toLocaleString()} PP</span>
                </div>

                <div className="p-3 bg-gradient-to-r from-amber-700/20 to-amber-800/10 border border-amber-600/40 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">🥉 TOP 3 - QUÝ QUÂN THẺ BÀI:</span>
                  <span className="font-mono text-emerald-400 font-bold">+{cardRewards.top3PP.toLocaleString()} PP</span>
                </div>

                <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-slate-300">
                  <span className="font-semibold flex items-center gap-1.5">🌟 TOP 4 - TOP {cardRewards.maxTopRewarded} CAO THỦ:</span>
                  <span className="font-mono text-emerald-400 font-bold">+{cardRewards.top4To10PP.toLocaleString()} PP</span>
                </div>
              </div>

              <div className="p-3 bg-cyan-950/50 border border-cyan-500/30 rounded-xl text-[11px] text-cyan-200 leading-relaxed">
                {cardRewards.notice}
              </div>

              <button
                onClick={() => setShowRewardsModal(false)}
                className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black uppercase text-xs rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.4)] hover:brightness-125 transition cursor-pointer"
              >
                ĐÃ HIỂU CƠ CẤU THƯỞNG
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

