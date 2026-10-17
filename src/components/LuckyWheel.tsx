/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { get, ref, update, set, push, onValue } from 'firebase/database';
import { db } from '../firebase';
import { User } from '../types';
import { 
  Sparkles, 
  Compass, 
  Clock, 
  Award, 
  Coins, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Zap, 
  Settings, 
  X, 
  Check 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { incrementMissionProgress } from '../utils/missions';

interface LuckyWheelProps {
  uid: string;
  user: User | null;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

export interface WheelSegment {
  label: string;
  type: 'pp' | 'xp' | 'frame';
  value: string | number;
  color: string;
  text: string;
}

const DEFAULT_SEGMENTS: WheelSegment[] = [
  { label: '+5,000 PP', type: 'pp', value: 5000, color: '#1a1012', text: '#ef4444' },
  { label: '+200 XP BBP', type: 'xp', value: 200, color: '#091a18', text: '#10b981' },
  { label: 'Khung Cầu Vồng Neon', type: 'frame', value: 'neon-ring', color: '#181024', text: '#a855f7' },
  { label: '+15,000 PP', type: 'pp', value: 15000, color: '#1a180c', text: '#eab308' },
  { label: '+500 XP BBP', type: 'xp', value: 500, color: '#0b1624', text: '#06b6d4' },
  { label: 'Khung Cyberpunk', type: 'frame', value: 'cyber-ring', color: '#181024', text: '#ec4899' },
  { label: '+50,000 PP', type: 'pp', value: 50000, color: '#1a180c', text: '#ffd700' },
  { label: 'Khung Hoàng Gia Gold', type: 'frame', value: 'gold-ring', color: '#241a0b', text: '#f97316' },
];

export default function LuckyWheel({ uid, user, onShowResult }: LuckyWheelProps) {
  const [segments, setSegments] = useState<WheelSegment[]>(DEFAULT_SEGMENTS);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState<number>(0);
  const [lastSpinTime, setLastSpinTime] = useState<number>(0);

  // Admin Config State
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editSegments, setEditSegments] = useState<WheelSegment[]>(DEFAULT_SEGMENTS);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'pp' | 'xp' | 'frame'>('pp');
  const [newValue, setNewValue] = useState<string>('10000');
  const [newBgColor, setNewBgColor] = useState('#1a180c');
  const [newTextColor, setNewTextColor] = useState('#ffd700');
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

  const isAdminOrTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  // Realtime Sync Wheel Segments Configuration from DB
  useEffect(() => {
    const segmentsRef = ref(db, 'settings/luckywheel_segments');
    const unsubscribe = onValue(segmentsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (Array.isArray(val) && val.length >= 2) {
          setSegments(val);
          setEditSegments(val);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync and monitor user's last lucky wheel spin timestamp
  useEffect(() => {
    if (!uid) return;
    const lastSpinRef = ref(db, `users/${uid}/lastLuckyWheelSpin`);
    get(lastSpinRef).then((snap) => {
      if (snap.exists()) {
        setLastSpinTime(snap.val() as number);
      }
    });
  }, [uid]);

  // Handle live cooldown countdown
  useEffect(() => {
    if (!lastSpinTime) {
      setCooldownTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const msSinceLast = Date.now() - lastSpinTime;
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      const remaining = twentyFourHoursMs - msSinceLast;

      if (remaining <= 0) {
        setCooldownTimeLeft(0);
        clearInterval(interval);
      } else {
        setCooldownTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSpinTime]);

  const formatCooldown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Reset Cooldown for Admin
  const handleAdminResetCooldown = async () => {
    try {
      await update(ref(db, `users/${uid}`), { lastLuckyWheelSpin: 0 });
      setLastSpinTime(0);
      setCooldownTimeLeft(0);
      onShowResult('ĐÃ XÓA COOLDOWN ⚡', 'Admin/Giáo Viên đã xóa thời gian chờ lượt quay thành công!', true);
    } catch (e) {
      alert('Lỗi xóa cooldown!');
    }
  };

  // Admin Add Segment
  const handleAddSegment = () => {
    if (!newLabel.trim()) {
      alert('Vui lòng nhập nhãn phần thưởng!');
      return;
    }

    const parsedVal = newType === 'frame' ? newValue.trim() : (parseInt(newValue) || 1000);
    const newSeg: WheelSegment = {
      label: newLabel.trim(),
      type: newType,
      value: parsedVal,
      color: newBgColor,
      text: newTextColor
    };

    const updated = [...editSegments, newSeg];
    setEditSegments(updated);
    setNewLabel('');
    setNewValue('10000');
  };

  // Admin Remove Segment
  const handleRemoveSegment = (index: number) => {
    if (editSegments.length <= 2) {
      alert('Vòng quay phải có ít nhất 2 phần thưởng!');
      return;
    }
    const updated = editSegments.filter((_, i) => i !== index);
    setEditSegments(updated);
  };

  // Save Admin Segments Configuration to DB
  const handleSaveWheelConfig = async () => {
    setIsSavingAdmin(true);
    try {
      await set(ref(db, 'settings/luckywheel_segments'), editSegments);
      onShowResult(
        'LƯU CẤU HÌNH VÒNG QUAY SUCCESS 🎉',
        `Cấu hình ${editSegments.length} phần thưởng Vòng Quay May Mắn đã được cập nhật áp dụng toàn trường!`,
        true
      );
      setShowAdminPanel(false);
    } catch (e) {
      alert('Lỗi lưu cấu hình vòng quay!');
    } finally {
      setIsSavingAdmin(false);
    }
  };

  // Reset to Default Segments
  const handleResetToDefaultSegments = () => {
    setEditSegments(DEFAULT_SEGMENTS);
  };

  const handleSpin = async (bypassCooldown = false) => {
    if (isSpinning) return;
    
    if (cooldownTimeLeft > 0 && !bypassCooldown && !isAdminOrTeacher) {
      onShowResult(
        'VÒNG QUAY ĐANG TRONG THỜI GIAN CHỜ',
        `Bạn đã quay hôm nay rồi! Vui lòng quay lại sau ${formatCooldown(cooldownTimeLeft)} nữa nhé.`,
        false
      );
      return;
    }

    setIsSpinning(true);
    incrementMissionProgress(uid, 'wheel_spins');

    const activeSegments = segments.length >= 2 ? segments : DEFAULT_SEGMENTS;
    const winningIndex = Math.floor(Math.random() * activeSegments.length);
    const degreesPerSlice = 360 / activeSegments.length;
    
    const sliceAngle = winningIndex * degreesPerSlice;
    const extraSpins = 360 * 5;
    const finalRotation = extraSpins + (360 - sliceAngle) + (degreesPerSlice / 2);

    setRotation(finalRotation);

    setTimeout(async () => {
      setIsSpinning(false);
      const wonSegment = activeSegments[winningIndex];

      try {
        const userSnap = await get(ref(db, `users/${uid}`));
        const freshUser = userSnap.val() || {};
        const now = Date.now();

        const userUpdates: Record<string, any> = {
          lastLuckyWheelSpin: now
        };

        let resultMessage = '';

        if (wonSegment.type === 'pp') {
          const currentPP = freshUser.pp || 0;
          const currentBBP = freshUser.bbp || freshUser.xp || 0;
          const currentXP = freshUser.xp || 0;
          let currentLevel = freshUser.level || 1;

          const addedPP = typeof wonSegment.value === 'number' ? wonSegment.value : parseInt(String(wonSegment.value)) || 0;
          // Grant 10% PP as bonus BBP (min 100 BBP) when winning valuable PP segment
          const bonusBBP = Math.max(100, Math.floor(addedPP * 0.1));

          const newXP = currentXP + bonusBBP;
          const newBBP = currentBBP + bonusBBP;

          let leveledUp = false;
          let calcLevel = currentLevel;
          let tempXP = newXP;
          while (tempXP >= calcLevel * 100) {
            tempXP -= calcLevel * 100;
            calcLevel += 1;
            leveledUp = true;
          }

          // Credit PP securely via server transaction
          fetch('/api/rewards/award', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid,
              type: 'lucky_wheel',
              amount: addedPP,
              message: 'Vòng Quay May Mắn'
            })
          }).catch((e) => console.error('Reward credit error:', e));

          userUpdates['bbp'] = newBBP;
          userUpdates['xp'] = newXP;
          userUpdates['bpXP'] = newXP;
          userUpdates['battlePassXP'] = newXP;
          userUpdates['level'] = calcLevel;

          resultMessage = `🎉 Chúc mừng bạn! Bạn đã nhận +${addedPP.toLocaleString()} PP và thưởng nóng +${bonusBBP.toLocaleString()} BBP Battle Pass!${
            leveledUp ? `\n🎉 ĐỘT PHÁ CẢNH GIỚI! Thăng cấp thành công lên Level ${calcLevel}!` : ''
          }`;
        } else if (wonSegment.type === 'xp') {
          const currentXP = freshUser.xp || 0;
          const currentBBP = freshUser.bbp || freshUser.xp || 0;
          let currentLevel = freshUser.level || 1;
          const addedXP = typeof wonSegment.value === 'number' ? wonSegment.value : parseInt(String(wonSegment.value)) || 0;
          
          const newXP = currentXP + addedXP;
          const newBBP = currentBBP + addedXP;

          // Level up algorithm
          let leveledUp = false;
          let calcLevel = currentLevel;
          let tempXP = newXP;
          while (tempXP >= calcLevel * 100) {
            tempXP -= calcLevel * 100;
            calcLevel += 1;
            leveledUp = true;
          }

          userUpdates['xp'] = newXP;
          userUpdates['bbp'] = newBBP;
          userUpdates['bpXP'] = newXP;
          userUpdates['battlePassXP'] = newXP;
          userUpdates['level'] = calcLevel;

          resultMessage = `⚡ Sếp đã nhận được +${addedXP.toLocaleString()} XP / BBP Kinh Nghiệm Battle Pass! ${
            leveledUp ? `\n🎉 ĐỘT PHÁ CẢNH GIỚI! Thăng cấp Battle Pass thành công lên Level ${calcLevel}!` : ''
          }`;
        } else if (wonSegment.type === 'frame') {
          const currentInventory = freshUser.inventory || { frames: [], titles: [] };
          const wonFrame = String(wonSegment.value);
          const currentBBP = freshUser.bbp || freshUser.xp || 0;
          const currentXP = freshUser.xp || 0;
          const bonusBBP = 300; // Bonus BBP for winning rare frame item

          const newXP = currentXP + bonusBBP;
          const newBBP = currentBBP + bonusBBP;

          if (!currentInventory.frames) {
            currentInventory.frames = [];
          }

          if (!currentInventory.frames.includes(wonFrame)) {
            currentInventory.frames.push(wonFrame);
          }

          userUpdates['inventory'] = currentInventory;
          userUpdates['activeFrame'] = wonFrame;
          userUpdates['bbp'] = newBBP;
          userUpdates['xp'] = newXP;
          userUpdates['bpXP'] = newXP;
          userUpdates['battlePassXP'] = newXP;

          resultMessage = `👑 ĐỈNH CAO CHÓI LÒ! Sếp đã nhận ngay ${wonSegment.label} độc quyền (+${bonusBBP} BBP) và đã tự động trang bị!`;
        }

        // Apply updates directly to users/${uid} in Realtime Database
        await update(ref(db, `users/${uid}`), userUpdates);

        // Transaction log
        await push(ref(db, 'transactions'), {
          sender: 'SYSTEM_LUCKYWHEEL',
          senderName: 'Vòng Quay AYK',
          receiver: uid,
          receiverName: freshUser.name || freshUser.fullName || 'Sinh Viên',
          amount: wonSegment.type === 'pp' ? wonSegment.value : 0,
          message: `Quay Vòng Quay May Mắn: Trúng ${wonSegment.label}`,
          time: new Date().toLocaleString('vi-VN'),
          timestamp: now
        });

        // Confetti animation
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });

        onShowResult('VÒNG QUAY MAY MẮN - THÀNH CÔNG 🎉', resultMessage, true);
        setLastSpinTime(now);

      } catch (err) {
        console.error('Lucky wheel update failed:', err);
        onShowResult('VÒNG QUAY THẤT BẠI', 'Đã xảy ra sự cố kỹ thuật trong quá trình ghi nhận giải thưởng!', false);
      }
    }, 4500);
  };

  const activeSegments = segments.length >= 2 ? segments : DEFAULT_SEGMENTS;

  return (
    <div className="space-y-6 w-full pb-12 font-mono select-none">
      {/* Top Banner Header */}
      <div className="glass-box p-6 border-[#ffd700]/30 bg-yellow-950/5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3.5 w-3.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffd700] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#ffd700]"></span>
            </span>
            <h2 className="text-2xl font-black font-sans text-white tracking-wide uppercase flex items-center gap-2">
              🔮 VÒNG QUAY MAY MẮN AYK
            </h2>
          </div>
          <p className="text-xs text-[#8b949e] font-mono mt-1.5 uppercase">
            QUAY MIỄN PHÍ NHẬN VÀNG PP, ĐIỂM BBP BATTLE PASS & KHUNG AVATAR VIP ĐỘC QUYỀN
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-black/50 border border-white/5 py-3 px-5 rounded-2xl flex items-center gap-3 font-mono">
            <div className="text-right">
              <span className="block text-[10px] text-[#8b949e] uppercase">Ví PP / BBP XP:</span>
              <span className="text-glow-gold text-[#ffd700] text-sm font-black block">
                {(user?.pp || 0).toLocaleString()} PP | {(user?.xp || 0)} BBP XP
              </span>
            </div>
          </div>

          {/* Admin / Teacher Toolbar Button */}
          {isAdminOrTeacher && (
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="py-3 px-4 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-2xl font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              {showAdminPanel ? 'Ẩn Quản Trị' : 'Cấu Hình Admin'}
            </button>
          )}
        </div>
      </div>

      {/* ADMIN MANAGEMENT PANEL */}
      {isAdminOrTeacher && showAdminPanel && (
        <div className="bg-slate-900/90 border-2 border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h3 className="font-black text-sm text-amber-400 uppercase tracking-wider">
                🛡️ BẢNG QUẢN TRỊ ADMIN: CẤU HÌNH & THÊM PHẦN THƯỞNG VÒNG QUAY
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAdminResetCooldown}
                className="py-1.5 px-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold rounded-lg uppercase transition cursor-pointer flex items-center gap-1"
                title="Bỏ qua thời gian chờ để Admin test vòng quay nhiều lần"
              >
                <Zap className="w-3.5 h-3.5 text-red-400" /> Xóa Cooldown
              </button>

              <button
                onClick={() => setShowAdminPanel(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Form to add segment */}
          <div className="bg-black/40 border border-white/10 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-400" /> THÊM PHẦN THƯỞNG MỚI VÀO VÒNG QUAY
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
              <div className="md:col-span-1">
                <label className="block text-[10px] text-slate-400 mb-1 font-bold">Nhãn Hiển Thị:</label>
                <input
                  type="text"
                  placeholder="VD: +100,000 PP, +1000 XP BBP"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-bold">Loại Phần Thưởng:</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono"
                >
                  <option value="pp">Vàng PP</option>
                  <option value="xp">Kinh Nghiệm XP / BBP</option>
                  <option value="frame">Khung Avatar VIP</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-bold">Giá Trị (Value / Frame ID):</label>
                <input
                  type="text"
                  placeholder="VD: 50000 hoặc gold-ring"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-yellow-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-bold">Màu Nền Ô:</label>
                <input
                  type="color"
                  value={newBgColor}
                  onChange={(e) => setNewBgColor(e.target.value)}
                  className="w-full h-9 bg-slate-950 border border-white/10 rounded-lg p-1 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-bold">Màu Chữ:</label>
                <input
                  type="color"
                  value={newTextColor}
                  onChange={(e) => setNewTextColor(e.target.value)}
                  className="w-full h-9 bg-slate-950 border border-white/10 rounded-lg p-1 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddSegment}
                className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-black" /> Thêm Vào Ô Vòng Quay
              </button>
            </div>
          </div>

          {/* Table of current segments */}
          <div className="bg-black/40 border border-white/10 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase">
                DANH SÁCH {editSegments.length} Ô PHẦN THƯỞNG VÒNG QUAY HIỆN TẠI
              </h4>
              <button
                onClick={handleResetToDefaultSegments}
                className="text-amber-400 hover:underline text-[10px] uppercase font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Đặt Lại Mặc Định
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {editSegments.map((s, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono relative overflow-hidden"
                  style={{ backgroundColor: s.color, borderColor: s.text }}
                >
                  <div>
                    <span className="font-black block" style={{ color: s.text }}>
                      #{idx + 1}. {s.label}
                    </span>
                    <span className="text-[9px] text-slate-300 block font-sans">
                      Loại: {s.type.toUpperCase()} | Trị giá: {s.value}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemoveSegment(idx)}
                    className="p-1 bg-red-500/30 hover:bg-red-500 text-white rounded transition cursor-pointer shrink-0 ml-2"
                    title="Xóa ô này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={handleSaveWheelConfig}
                disabled={isSavingAdmin}
                className="py-2.5 px-6 bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 hover:to-green-300 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-black" />
                {isSavingAdmin ? 'Đang Lưu...' : 'Lưu Cấu Hình Áp Dụng Toàn Trường'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN LUCKY WHEEL DISPLAY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left: The Interactive Wheel Stage (Span 7) */}
        <div className="lg:col-span-7 glass-box border-white/5 p-6 flex flex-col items-center justify-center relative min-h-[460px] overflow-hidden">
          
          {/* Neon background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-red-500/5 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-yellow-500/5 blur-2xl pointer-events-none" />

          {/* Pointer needle */}
          <div className="absolute top-[48px] z-20 flex flex-col items-center">
            <div className="w-6 h-6 bg-gradient-to-b from-[#ffd700] to-yellow-600 border border-yellow-300 rounded-full shadow-[0_0_15px_rgba(255,215,0,0.5)] flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-black rounded-full" />
            </div>
            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[14px] border-l-transparent border-r-transparent border-t-[#ffd700] drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] -mt-1.5" />
          </div>

          {/* Outer Wheel container */}
          <div className="relative w-80 h-80 md:w-96 md:h-96 rounded-full p-2.5 bg-gradient-to-b from-[#302312] to-black border-4 border-yellow-500 shadow-[0_0_35px_rgba(255,215,0,0.25)] flex items-center justify-center">
            
            {/* Golden border dots */}
            {[...Array(24)].map((_, i) => {
              const angle = (i * 360) / 24;
              return (
                <div 
                  key={i}
                  className={`absolute w-1.5 h-1.5 rounded-full ${i % 2 === 0 ? 'bg-yellow-300 shadow-[0_0_8px_#f59e0b]' : 'bg-white'} transition-all`}
                  style={{
                    transform: `rotate(${angle}deg) translateY(-185px)`
                  }}
                />
              );
            })}

            {/* Rotating SVG Wheel */}
            <div 
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 4.5s cubic-bezier(0.15, 0.88, 0.3, 1)' : 'none'
              }}
              className="w-full h-full rounded-full overflow-hidden relative shadow-inner"
            >
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                  {activeSegments.map((seg, idx) => (
                    <radialGradient id={`grad-${idx}`} key={idx} cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={seg.color} />
                      <stop offset="100%" stopColor="#080502" />
                    </radialGradient>
                  ))}
                  <filter id="shadow">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.8"/>
                  </filter>
                </defs>

                {/* Slices */}
                {activeSegments.map((seg, idx) => {
                  const angle = 360 / activeSegments.length;
                  const startAngle = idx * angle;
                  const endAngle = startAngle + angle;
                  
                  const radStart = ((startAngle - 90) * Math.PI) / 180;
                  const radEnd = ((endAngle - 90) * Math.PI) / 180;
                  
                  const x1 = 200 + 200 * Math.cos(radStart);
                  const y1 = 200 + 200 * Math.sin(radStart);
                  const x2 = 200 + 200 * Math.cos(radEnd);
                  const y2 = 200 + 200 * Math.sin(radEnd);

                  const pathData = `M 200 200 L ${x1} ${y1} A 200 200 0 0 1 ${x2} ${y2} Z`;
                  const textAngle = startAngle + angle / 2;

                  return (
                    <g key={idx}>
                      <path 
                        d={pathData} 
                        fill={`url(#grad-${idx})`} 
                        stroke="#2a1f0a" 
                        strokeWidth="1.5"
                      />
                      
                      <g transform={`rotate(${textAngle}, 200, 200)`}>
                        <text
                          x="200"
                          y="65"
                          textAnchor="middle"
                          fill={seg.text}
                          fontWeight="900"
                          fontSize="10"
                          fontFamily="monospace"
                          letterSpacing="0.5"
                          className="font-mono select-none"
                          style={{
                            textShadow: `0 0 12px ${seg.text}40, 1px 1px 1px #000`
                          }}
                        >
                          {seg.label}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Central shining button */}
                <circle cx="200" cy="200" r="32" fill="url(#grad-central)" stroke="#ffd700" strokeWidth="2" filter="url(#shadow)" />
                <radialGradient id="grad-central" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffd700" />
                  <stop offset="100%" stopColor="#9a3412" />
                </radialGradient>
                <circle cx="200" cy="200" r="22" fill="#000000" />
                
                <path 
                  d="M194 195 A6 6 0 1 1 206 195 A6 6 0 1 1 194 195 Z" 
                  fill="#ffd700"
                />
              </svg>
            </div>
            
            <div className="absolute w-12 h-12 rounded-full pointer-events-none flex items-center justify-center text-white text-[10px] font-mono font-black select-none text-glow-gold text-[#ffd700]">
              AYK
            </div>
          </div>

        </div>

        {/* Right: Guidelines & Trigger Controls (Span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-5 justify-between">
          
          <div className="glass-box p-5 border-white/5 space-y-4">
            <h3 className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2.5">
              <Compass className="w-4 h-4 text-yellow-500" /> QUY TẮC & PHẦN THƯỞNG
            </h3>
            
            <p className="text-[11px] text-[#8b949e] font-sans leading-relaxed">
              Mỗi 24 giờ sinh viên được tặng 1 lượt quay miễn phí. Kết quả quay trúng PP, XP BBP hoặc Khung VIP được tự động đồng bộ trực tiếp lên Firebase Realtime Database.
            </p>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex justify-between items-center py-2 px-3 bg-black/40 border border-white/5 rounded-xl">
                <span className="text-[#ffd700] flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" /> Học Bổng PP
                </span>
                <span className="text-[9px] uppercase font-bold text-yellow-400">Tối đa +50,000 PP</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-black/40 border border-white/5 rounded-xl">
                <span className="text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Điểm XP Battle Pass (BBP)
                </span>
                <span className="text-[9px] uppercase font-bold text-cyan-300">Cộng XP & Thăng Cấp</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-black/40 border border-white/5 rounded-xl">
                <span className="text-purple-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" /> Khung Avatar VIP
                </span>
                <span className="text-[9px] uppercase font-bold text-purple-300">Mở Khóa Vĩnh Viễn</span>
              </div>
            </div>
          </div>

          {/* Trigger State Display Panel */}
          <div className="glass-box p-5 border-white/5 bg-black/20 flex flex-col items-center justify-center text-center py-6 space-y-4">
            {cooldownTimeLeft > 0 && !isAdminOrTeacher ? (
              <div className="space-y-4 w-full">
                <div className="w-12 h-12 rounded-full bg-red-950/20 border border-red-500/30 flex items-center justify-center mx-auto text-red-500 animate-pulse">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest">Thời gian chờ lượt quay tiếp theo:</span>
                  <span className="text-2xl font-black font-mono text-glow-red text-red-500 block mt-1">
                    {formatCooldown(cooldownTimeLeft)}
                  </span>
                </div>
                <button
                  disabled
                  className="w-full py-4 bg-slate-800/50 border border-white/5 text-slate-500 font-mono text-xs font-black uppercase tracking-widest rounded-2xl cursor-not-allowed"
                >
                  ⏳ KHÓA QUAY (COOLDOWN 24H)
                </button>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                <div className="w-12 h-12 rounded-full bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest">LƯỢT QUAY MIỄN PHÍ ĐÃ SẴN SÀNG</span>
                  <span className="text-glow-green text-[#00ff80] text-xs font-black font-mono uppercase block mt-1">
                    HÃY THỬ VẬN MAY CỦA BẠN NGAY!
                  </span>
                </div>

                <button
                  disabled={isSpinning}
                  onClick={() => handleSpin(false)}
                  className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-mono text-xs font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Compass className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                  {isSpinning ? 'Đang quay...' : '🔮 QUAY THƯỞNG LẬP TỨC'}
                </button>

                {isAdminOrTeacher && cooldownTimeLeft > 0 && (
                  <button
                    disabled={isSpinning}
                    onClick={() => handleSpin(true)}
                    className="w-full py-2.5 bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-mono text-[10px] font-bold uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    Quay Thử Admin (Bỏ Qua Cooldown)
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
