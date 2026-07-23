import React, { useState, useEffect } from 'react';
import { ref, get, update, onValue } from 'firebase/database';
import { db } from '../firebase';
import { User } from '../types';
import { Trophy, Shield, Sparkles, CheckCircle, Lock, Crown, Star, Target, ArrowRight, Zap, Gift } from 'lucide-react';
import { motion } from 'motion/react';

interface BattlePassPortalProps {
  uid: string;
  user: User | null;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

export interface BPTier {
  id: string;
  name: string;
  levelRequired: number;
  missionsRequired: number;
  isMilestone?: boolean;
  standardReward: {
    label: string;
    value: number;
    frame?: string;
  };
  premiumReward: {
    label: string;
    value: number;
    frame?: string;
  };
}

export const BALANCED_BP_TIERS: BPTier[] = [
  {
    id: 'tier_1',
    name: 'CẤP ĐỘ 1 - TÂN BINH S88',
    levelRequired: 1,
    missionsRequired: 1,
    standardReward: { label: '+100,000 PP', value: 100000 },
    premiumReward: { label: '👑 +500,000 PP', value: 500000 }
  },
  {
    id: 'tier_2',
    name: 'CẤP ĐỘ 2 - THỢ SĂN KHÔNG CHUYÊN',
    levelRequired: 2,
    missionsRequired: 2,
    standardReward: { label: '+200,000 PP', value: 200000 },
    premiumReward: { label: '👑 +1,000,000 PP', value: 1000000 }
  },
  {
    id: 'tier_3',
    name: 'CẤP ĐỘ 3 - CHIẾN BINH TRI THỨC',
    levelRequired: 3,
    missionsRequired: 3,
    standardReward: { label: '+300,000 PP', value: 300000 },
    premiumReward: { label: '👑 +2,000,000 PP', value: 2000000 }
  },
  {
    id: 'tier_4',
    name: 'CẤP ĐỘ 4 - ĐỘT PHÁ SIÊU CẤP',
    levelRequired: 4,
    missionsRequired: 4,
    standardReward: { label: '+500,000 PP', value: 500000 },
    premiumReward: { label: '👑 +3,000,000 PP', value: 3000000 }
  },
  {
    id: 'tier_5',
    name: '⭐ CẤP ĐỘ 5 - CAO THỦ THẦN ĐỒNG (MỐC VIP 5)',
    levelRequired: 5,
    missionsRequired: 5,
    isMilestone: true,
    standardReward: { label: '🎓 +1,000,000 PP', value: 1000000 },
    premiumReward: { label: '👑 🖼️ Khung Cầu Vồng Neon VIP + 10,000,000 PP', value: 10000000, frame: 'neon-ring' }
  },
  {
    id: 'tier_6',
    name: 'CẤP ĐỘ 6 - ĐẠI PHÚ Ô',
    levelRequired: 6,
    missionsRequired: 6,
    standardReward: { label: '+1,500,000 PP', value: 1500000 },
    premiumReward: { label: '👑 +12,000,000 PP', value: 12000000 }
  },
  {
    id: 'tier_7',
    name: 'CẤP ĐỘ 7 - BÁ CHỦ ĐẤU TRƯỜNG',
    levelRequired: 7,
    missionsRequired: 7,
    standardReward: { label: '+2,000,000 PP', value: 2000000 },
    premiumReward: { label: '👑 +15,000,000 PP', value: 15000000 }
  },
  {
    id: 'tier_8',
    name: 'CẤP ĐỘ 8 - TRIỆU PHÚ DỒN DÃ',
    levelRequired: 8,
    missionsRequired: 8,
    standardReward: { label: '+2,500,000 PP', value: 2500000 },
    premiumReward: { label: '👑 +20,000,000 PP', value: 20000000 }
  },
  {
    id: 'tier_9',
    name: 'CẤP ĐỘ 9 - THỦ LĨNH BẮN CÁ',
    levelRequired: 9,
    missionsRequired: 9,
    standardReward: { label: '+3,000,000 PP', value: 3000000 },
    premiumReward: { label: '👑 +25,000,000 PP', value: 25000000 }
  },
  {
    id: 'tier_10',
    name: '🏆 CẤP ĐỘ 10 - TỶ PHÚ S88 KHÔNG NGỦ (MỐC VIP 10)',
    levelRequired: 10,
    missionsRequired: 10,
    isMilestone: true,
    standardReward: { label: '💎 +5,000,000 PP', value: 5000000 },
    premiumReward: { label: '🏆 💎 Khung Hoàng Gia Ngọc Bích + 50,000,000 PP', value: 50000000, frame: 'https://png.pngtree.com/png-clipart/20220313/original/pngtree-game-avatar-frame-metal-border-png-image_7434122.png' }
  },
  {
    id: 'tier_11',
    name: 'CẤP ĐỘ 11 - CHIẾN THẦN BẤT BẠI',
    levelRequired: 11,
    missionsRequired: 11,
    standardReward: { label: '+6,000,000 PP', value: 6000000 },
    premiumReward: { label: '👑 +60,000,000 PP', value: 60000000 }
  },
  {
    id: 'tier_12',
    name: 'CẤP ĐỘ 12 - TỔNG TÀI BẮN CÁ',
    levelRequired: 12,
    missionsRequired: 12,
    standardReward: { label: '+7,000,000 PP', value: 7000000 },
    premiumReward: { label: '👑 +70,000,000 PP', value: 70000000 }
  },
  {
    id: 'tier_13',
    name: 'CẤP ĐỘ 13 - CHỦ TỊCH LẮC BÁT',
    levelRequired: 13,
    missionsRequired: 13,
    standardReward: { label: '+8,000,000 PP', value: 8000000 },
    premiumReward: { label: '👑 +80,000,000 PP', value: 80000000 }
  },
  {
    id: 'tier_14',
    name: 'CẤP ĐỘ 14 - THẦN BÀI LAS VEGAS',
    levelRequired: 14,
    missionsRequired: 14,
    standardReward: { label: '+10,000,000 PP', value: 10000000 },
    premiumReward: { label: '👑 +90,000,000 PP', value: 90000000 }
  },
  {
    id: 'tier_15',
    name: '👑 CẤP ĐỘ 15 - SIÊU ĐẠI GIA S88 (MỐC VIP 15)',
    levelRequired: 15,
    missionsRequired: 15,
    isMilestone: true,
    standardReward: { label: '👑 +15,000,000 PP', value: 15000000 },
    premiumReward: { label: '👑 🖼️ Khung Rồng Vương Cổ Đại + 120,000,000 PP', value: 120000000, frame: 'https://png.pngtree.com/png-clipart/20240319/original/pngtree-avatar-frame-dragon-round-animal-template-for-game-cartoon-empty-dragon-png-image_14623495.png' }
  },
  {
    id: 'tier_16',
    name: 'CẤP ĐỘ 16 - VƯƠNG GIẢ THƯỢNG CỔ',
    levelRequired: 16,
    missionsRequired: 16,
    standardReward: { label: '+20,000,000 PP', value: 20000000 },
    premiumReward: { label: '👑 +150,000,000 PP', value: 150000000 }
  },
  {
    id: 'tier_17',
    name: 'CẤP ĐỘ 17 - HUYỀN THOẠI KHÔNG TƯỞNG',
    levelRequired: 17,
    missionsRequired: 17,
    standardReward: { label: '+25,000,000 PP', value: 25000000 },
    premiumReward: { label: '👑 +180,000,000 PP', value: 180000000 }
  },
  {
    id: 'tier_18',
    name: 'CẤP ĐỘ 18 - BÁ CHỦ TÀI SẢN',
    levelRequired: 18,
    missionsRequired: 18,
    standardReward: { label: '+30,000,000 PP', value: 30000000 },
    premiumReward: { label: '👑 +200,000,000 PP', value: 200000000 }
  },
  {
    id: 'tier_19',
    name: 'CẤP ĐỘ 19 - HOÀNG ĐẾ S88 CORE',
    levelRequired: 19,
    missionsRequired: 19,
    standardReward: { label: '👑 +40,000,000 PP', value: 40000000 },
    premiumReward: { label: '👑 +250,000,000 PP', value: 250000000 }
  },
  {
    id: 'tier_20',
    name: '🔥 CẤP ĐỘ 20 - TỐI THƯỢNG RỒNG THẦN CỔ ĐẠI 🐉 (MỐC VIP 20)',
    levelRequired: 20,
    missionsRequired: 20,
    isMilestone: true,
    standardReward: { label: '🏆 👑 +50,000,000 PP', value: 50000000 },
    premiumReward: { label: '🔥 🏆 👑 SIÊU KHUNG RỒNG THẦN THƯỢNG CỔ + 500,000,000 PP', value: 500000000, frame: 'https://png.pngtree.com/png-clipart/20240319/original/pngtree-avatar-frame-dragon-round-animal-template-for-game-cartoon-empty-dragon-png-image_14623493.png' }
  }
];

export default function BattlePassPortal({ uid, user, onShowResult }: BattlePassPortalProps) {
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [claimedRewards, setClaimedRewards] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'MILESTONES'>('ALL');

  const [premiumCost, setPremiumCost] = useState(5000);
  const [resetTime, setResetTime] = useState('2026-08-31T23:59:59');
  const [timeLeft, setTimeLeft] = useState('00N 00:00:00');

  const [activeTiers, setActiveTiers] = useState<BPTier[]>(BALANCED_BP_TIERS);

  // Load config from Realtime DB
  useEffect(() => {
    const bpConfigRef = ref(db, 'settings/battlepass');
    get(bpConfigRef).then((snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (val.price !== undefined) setPremiumCost(val.price);
        if (val.reset_time) setResetTime(val.reset_time);
        if (val.tiers && Array.isArray(val.tiers) && val.tiers.length > 0) {
          setActiveTiers(val.tiers);
        }
      }
    });
  }, []);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(resetTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('ĐÃ HẾT MÙA');
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${days}N ${hours < 10 ? '0' + hours : hours}:${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [resetTime]);

  // Sync Real-Time User Pass State
  useEffect(() => {
    if (!uid) return;
    const userRef = ref(db, `users/${uid}`);
    const unsub = onValue(userRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setLevel(val.level || 1);
        setXp(val.xp || 0);
        setIsPremium(val.isPremiumBattlePass || false);
        setClaimedRewards(val.battlePassRewardsClaimed || {});
      }
    });
    return () => unsub();
  }, [uid]);

  const currentLevelXP = level * 100;
  const levelProgressPercent = Math.min(100, Math.round((xp % 100)));

  const handleBuyPremium = async () => {
    if (isPremium || loading) return;
    setLoading(true);

    try {
      const uSnap = await get(ref(db, `users/${uid}`));
      if (!uSnap.exists()) {
        onShowResult('THẤT BẠI ❌', 'Tài khoản không khả dụng!', false);
        setLoading(false);
        return;
      }
      const freshUser = uSnap.val();
      const currentPP = freshUser.pp || 0;

      if (currentPP < premiumCost) {
        onShowResult(
          'SỐ DƯ KHÔNG ĐỦ ❌',
          `Kích hoạt S-Pass Premium cần ${premiumCost.toLocaleString()} PP. Bạn đang có ${currentPP.toLocaleString()} PP.`,
          false
        );
        setLoading(false);
        return;
      }

      await update(ref(db, `users/${uid}`), {
        pp: currentPP - premiumCost,
        isPremiumBattlePass: true
      });

      onShowResult(
        'KÍCH HOẠT BATTLE PASS PREMIUM 🎉',
        'Chúc mừng bạn đã sở hữu S88 BATTLE PASS PREMIUM! Tất cả phần thưởng VIP cao cấp đã được mở khóa.',
        true
      );
    } catch (err) {
      onShowResult('THẤT BẠI ❌', 'Gặp lỗi khi mua Battle Pass! Vui lòng thử lại.', false);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (tier: BPTier, type: 'standard' | 'premium') => {
    if (loading) return;

    if (level < tier.levelRequired) {
      onShowResult(
        'CHƯA ĐỦ ĐIỀU KIỆN 🔒',
        `Bạn cần đạt Cấp độ ${tier.levelRequired} (tích lũy EXP nhiệm vụ hằng ngày) để mở khóa!`,
        false
      );
      return;
    }

    if (type === 'premium' && !isPremium) {
      onShowResult(
        'YÊU CẦU PREMIUM 👑',
        'Cần mở rộng S-Pass Premium để nhận quà VIP!',
        false
      );
      return;
    }

    const claimKey = `${tier.id}_${type}`;
    if (claimedRewards[claimKey]) {
      onShowResult('ĐÃ NHẬN ✓', 'Bạn đã nhận phần quà này rồi!', false);
      return;
    }

    setLoading(true);
    try {
      const rewardDetail = type === 'standard' ? tier.standardReward : tier.premiumReward;
      const uSnap = await get(ref(db, `users/${uid}`));
      const freshPP = uSnap.val()?.pp || 0;

      const updates: any = {};
      updates[`users/${uid}/pp`] = freshPP + rewardDetail.value;
      updates[`users/${uid}/battlePassRewardsClaimed/${claimKey}`] = true;

      if (rewardDetail.frame) {
        updates[`users/${uid}/activeFrame`] = rewardDetail.frame;
      }

      await update(ref(db), updates);

      onShowResult(
        'NHẬN QUÀ THÀNH CÔNG 🎁',
        `Bạn đã nhận phần thưởng ${rewardDetail.label}!${rewardDetail.frame ? '\nĐã mở khóa & trang bị khung Avatar mới!' : ''}`,
        true
      );
    } catch (err) {
      onShowResult('THẤT BẠI ❌', 'Lỗi kết nối máy chủ!', false);
    } finally {
      setLoading(false);
    }
  };

  const displayedTiers = filterMode === 'MILESTONES'
    ? activeTiers.filter((t) => t.isMilestone)
    : activeTiers;

  return (
    <div className="relative backdrop-blur-xl bg-slate-950/80 border border-amber-500/30 rounded-3xl p-5 md:p-7 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] overflow-hidden font-mono text-xs">
      {/* Background Ambient Glows */}
      <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 mb-6 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl shadow-[0_0_15px_rgba(251,191,36,0.5)]">
              <Trophy className="w-6 h-6 text-black font-black animate-bounce" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-cyan-300">
                S88 BATTLE PASS PORTAL // 20 CẤP ĐỘ
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
                Tích lũy EXP từ nhiệm vụ hằng ngày & đấu trường để nhận vương miện, PP & Khung Avatar độc quyền.
              </p>
            </div>
          </div>
        </div>

        {/* Premium Badge & Purchase Button */}
        <div className="flex items-center gap-3">
          {isPremium ? (
            <div className="px-4 py-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.6)] border border-amber-300">
              <Crown className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} /> PREMIUM PASS ACTIVE
            </div>
          ) : (
            <button
              onClick={handleBuyPremium}
              disabled={loading}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_18px_rgba(245,158,11,0.5)] active:scale-95 flex items-center gap-2 cursor-pointer border border-amber-300"
            >
              <Crown className="w-4 h-4" /> [ MỞ PASS PREMIUM - {premiumCost.toLocaleString()} PP ]
            </button>
          )}
        </div>
      </div>

      {/* EXP Progress & Daily Mission Shortcut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        
        {/* Progress Card (2 cols) */}
        <div className="lg:col-span-2 backdrop-blur-md bg-black/60 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border-2 border-amber-400 text-amber-300 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
              <span className="text-[9px] font-bold text-amber-400 uppercase leading-none">LV</span>
              <span className="text-xl font-black text-white leading-none mt-0.5">{level}</span>
            </div>

            <div className="flex-1 min-w-[180px]">
              <div className="flex justify-between items-center mb-1 text-[11px]">
                <span className="text-slate-300 font-bold uppercase flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Tiến Trình Cấp Độ (Cấp {level}/20)
                </span>
                <span className="text-amber-300 font-black">{xp % 100} / 100 EXP</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 border border-white/10 h-3 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-cyan-400 transition-all duration-500 shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                  style={{ width: `${levelProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="text-right sm:border-l border-white/10 sm:pl-4 w-full sm:w-auto text-[10px] text-slate-300 font-sans leading-relaxed">
            <div>Tích lũy <span className="text-amber-300 font-bold font-mono">+50 EXP</span> mỗi nhiệm vụ hằng ngày.</div>
            <div>Mỗi 100 EXP tự động thăng 1 Cấp Độ Battle Pass!</div>
          </div>
        </div>

        {/* Daily Missions Action & Countdown Box (1 col) */}
        <div className="backdrop-blur-md bg-gradient-to-br from-amber-950/30 to-black/60 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-bold uppercase flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-cyan-400" /> KIẾM EXP TỪ NHIỆM VỤ
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-lg font-bold">
              +50 EXP/NV
            </span>
          </div>

          <a
            href="#daily-missions-section"
            className="mt-3 py-2 px-3 bg-cyan-950/60 hover:bg-cyan-500 text-cyan-300 hover:text-black border border-cyan-500/40 rounded-xl font-bold text-[11px] uppercase flex items-center justify-center gap-1.5 transition-all"
          >
            🎯 ĐẾN PHẦN NHIỆM VỤ HẰNG NGÀY <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Filter Tabs Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-xl font-black text-[11px] uppercase transition-all cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            TẤT CẢ TIER (1 - 20)
          </button>

          <button
            onClick={() => setFilterMode('MILESTONES')}
            className={`px-3 py-1.5 rounded-xl font-black text-[11px] uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'MILESTONES'
                ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'bg-white/5 text-amber-400 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" /> MỐC VIP (5, 10, 15, 20)
          </button>
        </div>

        <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
          ⏳ Thời gian mùa giải còn: <span className="text-amber-300 font-bold font-mono">{timeLeft}</span>
        </div>
      </div>

      {/* Tier List Cards Grid (Glassmorphism design) */}
      <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
        {displayedTiers.map((tier) => {
          const isUnlocked = level >= tier.levelRequired;
          const stdClaimKey = `${tier.id}_standard`;
          const premClaimKey = `${tier.id}_premium`;

          const isStdClaimed = claimedRewards[stdClaimKey] || false;
          const isPremClaimed = claimedRewards[premClaimKey] || false;

          return (
            <div
              key={tier.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row items-center justify-between gap-3.5 backdrop-blur-md ${
                tier.isMilestone
                  ? 'bg-gradient-to-r from-amber-950/50 via-black/80 to-amber-950/50 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                  : isUnlocked
                  ? 'bg-black/50 border-amber-500/20 shadow-[0_2px_10px_rgba(0,0,0,0.3)]'
                  : 'bg-black/70 border-white/5 opacity-70'
              }`}
            >
              {/* Level Info Column */}
              <div className="flex items-center gap-3 w-full md:w-1/3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${
                    tier.isMilestone
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-black shadow-lg animate-pulse'
                      : isUnlocked
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {tier.isMilestone ? <Crown className="w-5 h-5" /> : isUnlocked ? <Sparkles className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>

                <div>
                  <div className={`font-black text-xs ${tier.isMilestone ? 'text-amber-300' : isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                    {tier.name}
                  </div>
                  <div className="text-[10px] text-slate-300 font-sans flex items-center gap-1.5 mt-0.5">
                    <span>Yêu cầu: Level {tier.levelRequired}</span>
                    {tier.isMilestone && (
                      <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 font-mono font-bold text-[8px] rounded border border-amber-400/40 uppercase">
                        ⭐ MỐC QUÀ LỚN VIP
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Standard Reward Column */}
              <div className="w-full md:w-1/3 flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase text-slate-400">Thường (Free)</span>
                  <span className="text-[11px] font-bold text-slate-200">{tier.standardReward?.label}</span>
                </div>

                {isUnlocked ? (
                  isStdClaimed ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-bold text-[10px] uppercase">
                      <CheckCircle className="w-3.5 h-3.5" /> Đã Nhận
                    </span>
                  ) : (
                    <button
                      onClick={() => handleClaimReward(tier, 'standard')}
                      className="py-1 px-3 bg-emerald-950/60 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/50 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer shadow-md"
                    >
                      Nhận Quà
                    </button>
                  )
                ) : (
                  <span className="text-slate-500 flex items-center gap-1 text-[9px] uppercase font-sans">
                    <Lock className="w-3 h-3" /> Chưa Khóa
                  </span>
                )}
              </div>

              {/* Premium Reward Column */}
              <div
                className={`w-full md:w-1/3 flex items-center justify-between p-2.5 rounded-xl border ${
                  isPremium ? 'bg-amber-950/30 border-amber-500/30' : 'bg-black/60 border-dashed border-white/10'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase text-amber-400 flex items-center gap-1 font-bold">
                    <Crown className="w-2.5 h-2.5 text-yellow-400" /> Premium VIP
                  </span>
                  <span className="text-[11px] font-black text-amber-300">{tier.premiumReward?.label}</span>
                </div>

                {isUnlocked ? (
                  !isPremium ? (
                    <span className="text-amber-400/60 font-bold text-[9px] uppercase flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Cần VIP
                    </span>
                  ) : isPremClaimed ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-bold text-[10px] uppercase">
                      <CheckCircle className="w-3.5 h-3.5" /> Đã Nhận
                    </span>
                  ) : (
                    <button
                      onClick={() => handleClaimReward(tier, 'premium')}
                      className="py-1 px-3 bg-amber-500 hover:bg-yellow-400 text-black font-black border border-amber-300 rounded-lg text-[10px] uppercase transition-all cursor-pointer shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                    >
                      Nhận Quà VIP
                    </button>
                  )
                ) : (
                  <span className="text-slate-500 flex items-center gap-1 text-[9px] uppercase font-sans">
                    <Lock className="w-3 h-3" /> Chưa Khóa
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
