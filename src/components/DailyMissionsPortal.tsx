/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../firebase';
import { User } from '../types';
import { 
  Target, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Award, 
  Calendar, 
  Trophy, 
  Flame, 
  MessageSquare, 
  Landmark, 
  ShoppingBag, 
  BookOpen, 
  Compass, 
  HelpCircle,
  Coins,
  ShieldCheck,
  Zap,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getOrInitializeUserMissions, 
  claimMissionReward, 
  UserMission, 
  getTodayString,
  getMissionsPool,
  addMissionToPool,
  deleteMissionFromPool,
  rerandomizeUserMissions,
  Mission
} from '../utils/missions';

interface DailyMissionsPortalProps {
  uid: string;
  user: User | null;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

export default function DailyMissionsPortal({ uid, user, onShowResult }: DailyMissionsPortalProps) {
  const [missions, setMissions] = useState<UserMission[]>([]);
  const [pool, setPool] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'IN_PROGRESS' | 'READY' | 'CLAIMED'>('ALL');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isRerandomizing, setIsRerandomizing] = useState(false);

  // New Mission Form state for Teacher/Admin
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('general_study');
  const [newTarget, setNewTarget] = useState(1);
  const [newReward, setNewReward] = useState(1000);
  const [isCreating, setIsCreating] = useState(false);

  const todayStr = getTodayString();
  const isTeacherOrAdmin = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  // Load user missions and pool
  useEffect(() => {
    if (!uid) return;

    setLoading(true);
    getOrInitializeUserMissions(uid)
      .then((initialList) => {
        setMissions(initialList);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading daily missions:', err);
        setLoading(false);
      });

    // Sync user missions in real-time
    const userMissionsRef = ref(db, `users/${uid}/daily_missions/${todayStr}/missions_list`);
    const unsubscribeUser = onValue(userMissionsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: UserMission[] = Array.isArray(val) ? val : Object.values(val);
        setMissions(list);
      }
    });

    // Load pool
    loadPool();

    return () => unsubscribeUser();
  }, [uid, todayStr]);

  const loadPool = async () => {
    try {
      const poolList = await getMissionsPool();
      setPool(poolList);
    } catch (err) {
      console.error('Error loading missions pool:', err);
    }
  };

  // Claim single reward
  const handleClaimReward = async (missionId: string, title: string) => {
    if (claimingId) return;
    setClaimingId(missionId);
    try {
      const res = await claimMissionReward(uid, missionId);
      if (res.success) {
        onShowResult(
          'NHẬN THƯỞNG THÀNH CÔNG 🎉',
          `Bạn đã hoàn thành nhiệm vụ:\n"${title}"\nPhần thưởng: +${res.reward.toLocaleString()} PP và +40 XP Battle Pass!${
            res.levelUp ? '\n\n🏅 CHÚC MỪNG BẠN ĐÃ LÊN CẤP BATTLE PASS MỚI!' : ''
          }`,
          true
        );
      }
    } catch (err: any) {
      alert(err.message || 'Không thể nhận phần thưởng!');
    } finally {
      setClaimingId(null);
    }
  };

  // Claim all ready rewards with 1 click
  const handleClaimAll = async () => {
    const readyMissions = missions.filter(m => m.current >= m.target && !m.claimed);
    if (readyMissions.length === 0) {
      alert('Không có nhiệm vụ nào sẵn sàng để nhận thưởng!');
      return;
    }

    let totalEarnedPP = 0;
    let count = 0;

    for (const m of readyMissions) {
      try {
        const res = await claimMissionReward(uid, m.id);
        if (res.success) {
          totalEarnedPP += res.reward;
          count++;
        }
      } catch (e) {
        console.warn('Error claiming mission:', m.id, e);
      }
    }

    if (count > 0) {
      onShowResult(
        'NHẬN TOÀN BỘ PHẦN THƯỞNG 🎉',
        `Bạn đã nhận thành công ${count} phần thưởng nhiệm vụ!\nTổng cộng cộng vào tài khoản: +${totalEarnedPP.toLocaleString()} PP!`,
        true
      );
    }
  };

  // Admin/Teacher: Re-randomize 10 daily missions for current student
  const handleRerandomize = async () => {
    if (isRerandomizing) return;
    setIsRerandomizing(true);
    try {
      const newMissions = await rerandomizeUserMissions(uid);
      setMissions(newMissions);
      onShowResult(
        'ĐÃ LÀM MỚI 10 NHIỆM VỤ 🎯',
        'Đã tạo ngẫu nhiên thành công 10 nhiệm vụ mới cho ngày hôm nay từ Kho Nhiệm Vụ!',
        true
      );
    } catch (err) {
      alert('Lỗi làm mới nhiệm vụ!');
    } finally {
      setIsRerandomizing(false);
    }
  };

  // Admin/Teacher: Create new mission in global pool
  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      alert('Vui lòng điền đầy đủ Tên và Mô tả nhiệm vụ!');
      return;
    }

    setIsCreating(true);
    try {
      await addMissionToPool({
        title: newTitle.trim(),
        description: newDesc.trim(),
        type: newType,
        target: Number(newTarget) || 1,
        reward: Number(newReward) || 1000
      });

      setNewTitle('');
      setNewDesc('');
      setNewTarget(1);
      setNewReward(1000);
      await loadPool();

      onShowResult(
        'TẠO NHIỆM VỤ THÀNH CÔNG ✨',
        `Nhiệm vụ mới "${newTitle}" đã được thêm vào Kho Nhiệm Vụ Hằng Ngày!\nHệ thống sẽ random đưa nhiệm vụ này tới sinh viên mỗi ngày.`,
        true
      );
    } catch (err) {
      alert('Lỗi thêm nhiệm vụ mới!');
    } finally {
      setIsCreating(false);
    }
  };

  // Admin/Teacher: Delete mission from global pool
  const handleDeleteFromPool = async (missionId: string, title: string) => {
    if (!confirm(`Bạn có chắc muốn xóa nhiệm vụ "${title}" khỏi Kho Nhiệm Vụ không?`)) return;
    try {
      await deleteMissionFromPool(missionId);
      await loadPool();
    } catch (err) {
      alert('Lỗi xóa nhiệm vụ!');
    }
  };

  const getMissionIcon = (type: string) => {
    switch (type) {
      case 'check_in':
        return <Calendar className="w-5 h-5 text-cyan-400" />;
      case 'taixiu_wins':
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 'crash_rides':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'penalty_goals':
        return <Target className="w-5 h-5 text-emerald-400" />;
      case 'chat_messages':
        return <MessageSquare className="w-5 h-5 text-blue-400" />;
      case 'wheel_spins':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'bank_deposit':
        return <Landmark className="w-5 h-5 text-amber-500" />;
      case 'marketplace_buy':
        return <ShoppingBag className="w-5 h-5 text-rose-400" />;
      case 'ai_chat':
        return <BookOpen className="w-5 h-5 text-cyan-500" />;
      case 'horse_rides':
        return <Compass className="w-5 h-5 text-red-400" />;
      case 'general_study':
      default:
        return <Award className="w-5 h-5 text-amber-400" />;
    }
  };

  // Computed stats
  const totalCount = missions.length || 10;
  const completedCount = missions.filter((m) => m.current >= m.target).length;
  const claimedCount = missions.filter((m) => m.claimed).length;
  const readyToClaimCount = missions.filter((m) => m.current >= m.target && !m.claimed).length;
  const totalRewardToday = missions.reduce((sum, m) => sum + m.reward, 0);
  const earnedRewardToday = missions.filter((m) => m.claimed).reduce((sum, m) => sum + m.reward, 0);

  // Filtering
  const filteredMissions = missions.filter((m) => {
    if (filter === 'IN_PROGRESS') return m.current < m.target;
    if (filter === 'READY') return m.current >= m.target && !m.claimed;
    if (filter === 'CLAIMED') return m.claimed;
    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 font-mono pb-12">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-amber-950 p-6 md:p-8 border border-cyan-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 py-1 px-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold rounded-full uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              Nhiệm Vụ Mỗi Ngày - Ngẫu Nhiên 20 Thách Thức
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <Target className="w-8 h-8 text-[#00f0ff] animate-bounce" />
              NGÂN HÀNG NHIỆM VỤ S88
            </h1>
            <p className="text-slate-400 text-xs font-sans max-w-xl leading-relaxed">
              Mỗi ngày hệ thống tự động xáo trộn 20 nhiệm vụ ngẫu nhiên. Hoàn thành để tích lũy học bổng Portal Points (PP) và điểm XP nâng cấp Battle Pass!
            </p>
          </div>

          {/* Action buttons on banner */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {readyToClaimCount > 0 && (
              <button
                onClick={handleClaimAll}
                className="py-3 px-5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all cursor-pointer flex items-center gap-2 animate-bounce active:scale-95"
              >
                <Gift className="w-4 h-4 text-black" />
                Nhận Tất Cả ({readyToClaimCount})
              </button>
            )}

            {isTeacherOrAdmin && (
              <button
                onClick={handleRerandomize}
                disabled={isRerandomizing}
                className="py-3 px-4 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2"
                title="Giáo viên / Admin: Tạo lại 20 nhiệm vụ mới cho ngày hôm nay"
              >
                <RefreshCw className={`w-4 h-4 ${isRerandomizing ? 'animate-spin' : ''}`} />
                Random 20 Nhiệm Vụ Mới
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Stats Bar */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10 text-center">
          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase block">Tiến độ hôm nay</span>
            <span className="text-lg font-black text-[#00f0ff] text-glow-blue">
              {completedCount}/{totalCount} OK
            </span>
          </div>

          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase block">Đã nhận thưởng</span>
            <span className="text-lg font-black text-emerald-400 text-glow-green">
              {claimedCount}/{totalCount} ván
            </span>
          </div>

          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase block">PP đã thu hoạch</span>
            <span className="text-lg font-black text-yellow-400 text-glow-gold">
              +{earnedRewardToday.toLocaleString()} PP
            </span>
          </div>

          <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase block">Tổng quỹ thưởng ngày</span>
            <span className="text-lg font-black text-amber-300">
              +{totalRewardToday.toLocaleString()} PP
            </span>
          </div>
        </div>
      </div>

      {/* Teacher / Admin Toolbar / Toggle Section */}
      {isTeacherOrAdmin && (
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span className="font-black text-sm text-amber-400 uppercase tracking-wider">
                BẢNG QUẢN TRỊ GIÁO VIÊN / ADMIN: TẠO & RANDOM NHIỆM VỤ
              </span>
            </div>

            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-lg uppercase transition cursor-pointer flex items-center gap-1.5"
            >
              {showAdminPanel ? 'Ẩn Quản Lý' : 'Mở Tạo Nhiệm Vụ Mới (+)'}
            </button>
          </div>

          <AnimatePresence>
            {showAdminPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 pt-3 border-t border-amber-500/20"
              >
                {/* Form to Create New Mission */}
                <form onSubmit={handleCreateMission} className="bg-black/40 border border-white/10 p-4 rounded-xl space-y-4">
                  <h4 className="text-xs font-black text-amber-400 uppercase flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-amber-400" />
                    TẠO NHIỆM VỤ HẰNG NGÀY MỚI (SẼ VÀO KHO POOL S88)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">Tên Nhiệm Vụ:</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Vua Giải Tích, Điểm Danh Tri Thức..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 focus:border-amber-400 rounded-lg p-2.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">Loại Hoạt Động (Type):</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 focus:border-amber-400 rounded-lg p-2.5 text-white"
                      >
                        <option value="general_study">Nghiên Cứu Bài Học / Khóa Học</option>
                        <option value="ai_chat">Hỏi Đáp AI Gia Sư S88</option>
                        <option value="chat_messages">Thảo Luận Chat Toàn Trường</option>
                        <option value="check_in">Báo Danh Hằng Ngày</option>
                        <option value="taixiu_wins">Thắng Ván Tài Xỉu</option>
                        <option value="crash_rides">Chuyến Bay Không Chiến</option>
                        <option value="penalty_goals">Bàn Thắng Penalty</option>
                        <option value="bank_deposit">Giao Dịch Ngân Hàng</option>
                        <option value="marketplace_buy">Mua Sắm Chợ S88</option>
                        <option value="wheel_spins">Vòng Quay Vàng</option>
                        <option value="horse_rides">Tham Gia Đua Ngựa</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">Mục Tiêu Yêu Cầu (Target Count):</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newTarget}
                        onChange={(e) => setNewTarget(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-950 border border-white/10 focus:border-amber-400 rounded-lg p-2.5 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">Phần Thưởng PP (Portal Points):</label>
                      <input
                        type="number"
                        min="100"
                        step="100"
                        required
                        value={newReward}
                        onChange={(e) => setNewReward(parseInt(e.target.value) || 500)}
                        className="w-full bg-slate-950 border border-white/10 focus:border-amber-400 rounded-lg p-2.5 text-yellow-400 font-mono font-bold"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-400 mb-1 font-bold">Mô Tả Chi Tiết:</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Trả lời 3 câu hỏi ôn tập cùng Giáo Viên AI để nhận quà..."
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 focus:border-amber-400 rounded-lg p-2.5 text-white font-sans"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="py-2.5 px-6 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-lg transition cursor-pointer shadow-md"
                    >
                      {isCreating ? 'Đang Lưu...' : '+ Thêm Nhiệm Vụ Vào Kho Global'}
                    </button>
                  </div>
                </form>

                {/* Pool Items Table */}
                <div className="bg-black/40 border border-white/10 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-black text-slate-300 uppercase flex items-center justify-between">
                    <span>DANH SÁCH KHO NHIỆM VỤ GLOBAL ({pool.length} MỤC)</span>
                    <button
                      onClick={loadPool}
                      className="text-cyan-400 hover:underline text-[10px] uppercase font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Cập nhật
                    </button>
                  </h4>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {pool.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 p-2.5 bg-slate-950 border border-white/5 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0 p-1.5 bg-white/5 rounded">
                            {getMissionIcon(p.type)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate">{p.title}</span>
                            <span className="text-[10px] text-slate-400 font-sans block truncate">{p.description}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-yellow-400 font-bold font-mono text-[11px]">
                            +{p.reward.toLocaleString()} PP (Mục tiêu: {p.target})
                          </span>
                          <button
                            onClick={() => handleDeleteFromPool(p.id, p.title)}
                            className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded transition cursor-pointer"
                            title="Xóa nhiệm vụ này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Main Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`py-1.5 px-3.5 rounded-lg text-xs font-bold uppercase transition cursor-pointer ${
              filter === 'ALL'
                ? 'bg-[#00f0ff] text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            Tất Cả ({missions.length})
          </button>

          <button
            onClick={() => setFilter('READY')}
            className={`py-1.5 px-3.5 rounded-lg text-xs font-bold uppercase transition cursor-pointer ${
              filter === 'READY'
                ? 'bg-yellow-400 text-black shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            Sẵn Sàng Nhận ({readyToClaimCount})
          </button>

          <button
            onClick={() => setFilter('IN_PROGRESS')}
            className={`py-1.5 px-3.5 rounded-lg text-xs font-bold uppercase transition cursor-pointer ${
              filter === 'IN_PROGRESS'
                ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-300'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            Đang Thực Hiện ({missions.length - completedCount})
          </button>

          <button
            onClick={() => setFilter('CLAIMED')}
            className={`py-1.5 px-3.5 rounded-lg text-xs font-bold uppercase transition cursor-pointer ${
              filter === 'CLAIMED'
                ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            Đã Xong ({claimedCount})
          </button>
        </div>

        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span>Hệ thống tự động cập nhật lại nhiệm vụ mỗi ngày vào 00:00</span>
        </div>
      </div>

      {/* Grid of 10 Daily Missions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#00f0ff]/20 border-t-[#00f0ff] rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400 uppercase tracking-widest animate-pulse">
              Đang kết nối cơ sở dữ liệu & lấy 20 nhiệm vụ hôm nay...
            </span>
          </div>
        ) : filteredMissions.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white/5 rounded-2xl border border-white/5 text-slate-400 text-xs uppercase">
            Không có nhiệm vụ nào trong danh mục này!
          </div>
        ) : (
          <AnimatePresence>
            {filteredMissions.map((m) => {
              const isCompleted = m.current >= m.target;
              const progressPct = Math.min((m.current / m.target) * 100, 100);

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between gap-4 ${
                    m.claimed
                      ? 'bg-slate-950/40 border-white/5 opacity-60'
                      : isCompleted
                        ? 'bg-gradient-to-br from-emerald-950/20 to-slate-900 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                        : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="shrink-0 p-2.5 bg-white/5 rounded-xl border border-white/10 shadow-inner">
                        {getMissionIcon(m.type)}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h3 className={`font-black text-sm uppercase leading-tight ${
                          m.claimed ? 'text-slate-400 line-through' : 'text-white'
                        }`}>
                          {m.title}
                        </h3>
                        <p className="text-xs text-slate-400 leading-snug font-sans">
                          {m.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="block text-xs font-black text-yellow-400 text-glow-gold">
                        +{m.reward.toLocaleString()} PP
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase font-mono">+40 XP</span>
                    </div>
                  </div>

                  {/* Progress Bar & Status Action */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 text-[10px] uppercase">
                        {m.claimed ? 'Đã thu hoạch' : isCompleted ? 'Đã đủ điều kiện!' : 'Tiến độ hoàn thành:'}
                      </span>
                      <span className="font-bold text-white">
                        {m.current} / {m.target}
                      </span>
                    </div>

                    <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.6 }}
                        className={`h-full rounded-full ${
                          m.claimed
                            ? 'bg-slate-600'
                            : isCompleted
                              ? 'bg-gradient-to-r from-emerald-400 to-green-300 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                              : 'bg-gradient-to-r from-cyan-500 to-blue-400'
                        }`}
                      />
                    </div>

                    <div className="pt-1 flex items-center justify-end">
                      {m.claimed ? (
                        <span className="py-1 px-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs uppercase rounded-lg flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Đã Nhận Thưởng
                        </span>
                      ) : isCompleted ? (
                        <button
                          onClick={() => handleClaimReward(m.id, m.title)}
                          disabled={claimingId !== null}
                          className="py-2 px-5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.5)] transition-all cursor-pointer animate-pulse active:scale-95 flex items-center gap-1.5"
                        >
                          <Coins className="w-4 h-4 text-black" />
                          {claimingId === m.id ? 'Đang Xử Lý...' : 'Nhận Thưởng Ngay'}
                        </button>
                      ) : (
                        <span className="py-1 px-3 bg-white/5 border border-white/5 text-slate-500 font-bold text-xs uppercase rounded-lg">
                          Chưa Đạt Mục Tiêu
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
    </div>
  );
}
