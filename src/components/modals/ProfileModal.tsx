/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ref, update, onValue } from 'firebase/database';
import { db } from '../../firebase';
import { User } from '../../types';
import { X, Key, User as UserIcon, Camera, Check, Shield, Award, Sparkles, AlertTriangle, History, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface ProfileModalProps {
  uid: string;
  user: User | null;
  onClose: () => void;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=150&h=150',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&h=150',
];

export default function ProfileModal({ uid, user, onClose, onShowResult }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'avatar' | 'password' | 'history'>('history');

  // Unified History Table state (Last 20 entries)
  const [unifiedHistory, setUnifiedHistory] = useState<any[]>([]);

  // Fetch unified logs
  useEffect(() => {
    if (!uid) return;
    const logsRef = ref(db, 'game_logs');
    const unsubscribe = onValue(logsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const logsArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }))
        .filter((item: any) => item.uid === uid)
        .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 20); // Top 20 history
        setUnifiedHistory(logsArray);
      }
    });
    return () => unsubscribe();
  }, [uid]);

  // Avatar state
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || PRESET_AVATARS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passError, setPassError] = useState('');

  // Security Question state
  const PRESET_QUESTIONS = [
    'Tên con vật cưng đầu tiên của bạn là gì?',
    'Tên trường tiểu học đầu tiên của bạn?',
    'Món ăn yêu thích nhất của bạn?',
    'Nơi sinh của mẹ bạn?',
    'Biệt danh lúc nhỏ của bạn là gì?'
  ];

  const [secQuestionSelect, setSecQuestionSelect] = useState(user?.securityQuestion || PRESET_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [secAnswer, setSecAnswer] = useState(user?.securityAnswer || '');
  const [isSavingSec, setIsSavingSec] = useState(false);
  const [secMsg, setSecMsg] = useState('');

  useEffect(() => {
    if (user?.securityQuestion) {
      setSecQuestionSelect(user.securityQuestion);
    }
    if (user?.securityAnswer) {
      setSecAnswer(user.securityAnswer);
    }
  }, [user]);

  const handleSaveSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecMsg('');
    const finalQuestion = secQuestionSelect === 'CUSTOM' ? customQuestion.trim() : secQuestionSelect.trim();
    const finalAnswer = secAnswer.trim();

    if (!finalQuestion || !finalAnswer) {
      setSecMsg('Vui lòng chọn/nhập câu hỏi và câu trả lời bảo mật!');
      return;
    }

    setIsSavingSec(true);
    try {
      await update(ref(db, `users/${uid}`), {
        securityQuestion: finalQuestion,
        securityAnswer: finalAnswer
      });
      onShowResult('THIẾT LẬP BẢO MẬT THÀNH CÔNG 🔒', 'Câu hỏi bảo mật đã lưu! Khi quên mật khẩu, nhập đúng câu trả lời để đổi lại.', true);
    } catch (err) {
      setSecMsg('Lỗi lưu câu hỏi bảo mật trên máy chủ!');
    } finally {
      setIsSavingSec(false);
    }
  };

  const handleSaveAvatar = async (urlToSave: string) => {
    if (!urlToSave.trim()) return;
    setIsSavingAvatar(true);
    try {
      await update(ref(db, `users/${uid}`), {
        avatar: urlToSave.trim()
      });
      setSelectedAvatar(urlToSave.trim());
      onShowResult('ĐỔI AVATAR THÀNH CÔNG 🎉', 'Ảnh đại diện mới của bạn đã được cập nhật!', true);
    } catch (err) {
      onShowResult('THẤT BẠI ❌', 'Không thể cập nhật ảnh đại diện!', false);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassError('Vui lòng nhập đầy đủ thông tin mật khẩu!');
      return;
    }

    if (currentPassword !== user?.pass) {
      setPassError('Mật khẩu hiện tại không đúng!');
      return;
    }

    if (newPassword.length < 3) {
      setPassError('Mật khẩu mới phải có ít nhất 3 ký tự!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Mật khẩu mới và Nhập lại mật khẩu không khớp!');
      return;
    }

    setIsChangingPass(true);
    try {
      await update(ref(db, `users/${uid}`), {
        pass: newPassword.trim()
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onShowResult('ĐỔI MẬT KHẨU THÀNH CÔNG 🎉', 'Mật khẩu của bạn đã được thay đổi an toàn!', true);
    } catch (err) {
      setPassError('Lỗi cập nhật mật khẩu trên máy chủ!');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="overlay z-[5000]">
      <div className="glass-box login-panel overflow-y-auto max-h-[90vh] w-[95vw] md:w-full max-w-[540px] p-6 border-[#00f0ff] relative text-left font-mono">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8b949e] hover:text-white cursor-pointer transition p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* User Card Header */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.4)] bg-black">
              <img
                src={selectedAvatar}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PRESET_AVATARS[0];
                }}
              />
            </div>

            {/* Active Avatar Frame Overlay */}
            {user?.activeFrame === 'gold-ring' && (
              <div className="absolute -inset-1 rounded-full border-2 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] pointer-events-none animate-pulse" />
            )}
            {user?.activeFrame === 'neon-ring' && (
              <div className="absolute -inset-1 rounded-full border-2 border-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.9)] pointer-events-none" />
            )}
            {user?.activeFrame === 'cyber-ring' && (
              <div className="absolute -inset-1 rounded-full border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)] pointer-events-none" />
            )}
            {user?.activeFrame && user.activeFrame.startsWith('http') && (
              <img 
                src={user.activeFrame} 
                alt="Frame" 
                className="absolute -top-3 -left-3 w-[calc(100%+24px)] h-[calc(100%+24px)] pointer-events-none object-contain z-20 max-w-none"
              />
            )}

            <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-black rounded-full z-30" />
          </div>

          <div>
            <h2 className="text-white text-lg font-black uppercase flex items-center gap-1.5">
              {user?.name || 'Sinh Viên'}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-[#00f0ff] font-bold">UID / STK: {uid}</span>
              <span className="text-slate-400">•</span>
              <span className="text-amber-400 font-bold">{user?.class || 'S88'}</span>
            </div>
            <div className="mt-1 text-emerald-400 font-black text-xs">
              Tài sản: {(user?.pp || 0).toLocaleString()} PP
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 border-b border-white/10 mb-5 gap-1 font-mono text-[11px] font-bold">
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-400 bg-amber-400/10 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" /> LỊCH SỬ CƯỢC
          </button>
          <button
            onClick={() => setActiveTab('avatar')}
            className={`py-2.5 uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'avatar'
                ? 'border-[#00f0ff] text-[#00f0ff] bg-[#00f0ff]/10 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" /> AVATAR
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-2.5 uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'password'
                ? 'border-[#00f0ff] text-[#00f0ff] bg-[#00f0ff]/10 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" /> MẬT KHẨU
          </button>
        </div>

        {/* TAB 1: UNIFIED HISTORY TABLE (20 RECENT) */}
        {activeTab === 'history' && (
          <div className="space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs text-amber-400 font-bold uppercase pb-1 border-b border-white/10">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> 20 LẦN ĐẶT CƯỢC / GIAO DỊCH GẦN NHẤT
              </span>
              <span className="text-[10px] text-slate-400">Tự động đồng bộ</span>
            </div>

            {unifiedHistory.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs italic">
                Chưa có dữ liệu đặt cược hoặc giao dịch nào!
              </div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                      <th className="py-2 px-2">GAME</th>
                      <th className="py-2 px-2 text-right">CƯỢC</th>
                      <th className="py-2 px-2 text-right">BIẾN ĐỘNG PP</th>
                      <th className="py-2 px-2 text-right">THỜI GIAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {unifiedHistory.map((item, idx) => {
                      const isWin = item.pnl > 0;
                      return (
                        <tr key={item.id || idx} className="hover:bg-white/5 transition">
                          <td className="py-2.5 px-2 font-bold text-white flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isWin ? 'bg-emerald-400' : 'bg-red-500'}`} />
                            <span className="truncate max-w-[110px]">{item.game}</span>
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-300">
                            {item.bet ? `${item.bet.toLocaleString()} PP` : '-'}
                          </td>
                          <td className={`py-2.5 px-2 text-right font-extrabold ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isWin ? `+${item.pnl?.toLocaleString()} PP` : `${item.pnl?.toLocaleString()} PP`}
                          </td>
                          <td className="py-2.5 px-2 text-right text-[9px] text-slate-400 font-sans">
                            {item.time || new Date(item.timestamp || Date.now()).toLocaleTimeString('vi-VN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: CHANGE AVATAR */}
        {activeTab === 'avatar' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase">
                1. MẪU AVATAR CÓ SẴN (BẤM ĐỂ CHỌN):
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                {PRESET_AVATARS.map((url, idx) => {
                  const isSelected = selectedAvatar === url;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedAvatar(url)}
                      disabled={isSavingAvatar}
                      className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 ${
                        isSelected
                          ? 'border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.8)] scale-105 ring-2 ring-cyan-400'
                          : 'border-white/10 hover:border-white/40 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#00f0ff]/30 flex items-center justify-center">
                          <Check className="w-6 h-6 text-white filter drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Confirm Selected Avatar Action Button */}
              {selectedAvatar !== user?.avatar && (
                <div className="mt-4 p-3 bg-cyan-950/40 border border-cyan-400/60 rounded-xl flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-2">
                    <img src={selectedAvatar} alt="" className="w-10 h-10 rounded-full border border-cyan-400 object-cover" />
                    <div>
                      <div className="text-xs font-bold text-white uppercase">Đã chọn mẫu avatar mới</div>
                      <div className="text-[10px] text-cyan-300">Yêu cầu xác nhận để thay đổi</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSaveAvatar(selectedAvatar)}
                    disabled={isSavingAvatar}
                    className="py-2.5 px-4 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-black text-xs uppercase rounded-xl transition cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.6)]"
                  >
                    {isSavingAvatar ? 'ĐANG LƯU...' : '[ XÁC NHẬN LƯU AVATAR ]'}
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/10">
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase">
                2. HOẶC DÁN LINK ẢNH TÙY CHỌN:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://example.com/avatar.jpg"
                  className="flex-1 bg-black/60 border border-white/20 focus:border-[#00f0ff] rounded-lg p-2.5 text-xs text-white outline-none"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                />
                <button
                  onClick={() => handleSaveAvatar(customAvatarUrl)}
                  disabled={isSavingAvatar || !customAvatarUrl.trim()}
                  className="px-4 bg-[#00f0ff] hover:bg-cyan-400 text-black font-black text-xs uppercase rounded-lg cursor-pointer transition-all disabled:opacity-40"
                >
                  XÁC NHẬN LƯU
                </button>
              </div>
            </div>

            {/* Section 3: Frame equipping from inventory */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#ffd700] uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" /> 3. KHUNG AVATAR ĐÃ SỞ HỮU:
                </label>
                {user?.activeFrame && (
                  <button
                    onClick={async () => {
                      await update(ref(db, `users/${uid}`), { activeFrame: null });
                      onShowResult('ĐÃ GỠ KHUNG', 'Đã gỡ khung avatar thành công!', true);
                    }}
                    className="text-[10px] text-red-400 hover:underline font-bold uppercase"
                  >
                    [ Gỡ Khung Hiện Tại ]
                  </button>
                )}
              </div>

              {(!user?.inventory?.frames || user.inventory.frames.length === 0) ? (
                <div className="p-3 bg-white/5 rounded-xl border border-dashed border-white/10 text-center text-[11px] text-slate-400">
                  Bạn chưa sở hữu khung avatar nào! Hãy ghé <strong className="text-amber-400">Chợ Trời (Marketplace)</strong> để mua khung Rồng Thần, Băng Tuyết...
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2.5 max-h-36 overflow-y-auto pr-1">
                  {user.inventory.frames.map((frameVal, fIdx) => {
                    const isEquipped = user.activeFrame === frameVal;
                    return (
                      <button
                        key={fIdx}
                        onClick={async () => {
                          await update(ref(db, `users/${uid}`), { activeFrame: frameVal });
                          onShowResult('TRANG BỊ THÀNH CÔNG 🎉', 'Đã kích hoạt khung avatar!', true);
                        }}
                        className={`relative aspect-square rounded-xl bg-black/80 border p-1 flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${
                          isEquipped ? 'border-amber-400 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]' : 'border-white/20 hover:border-white/50'
                        }`}
                      >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-800">
                          <img src={user?.avatar || PRESET_AVATARS[0]} className="w-full h-full object-cover" alt="" />
                          {frameVal.startsWith('http') ? (
                            <img src={frameVal} className="absolute -top-1.5 -left-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] object-contain pointer-events-none" alt="" />
                          ) : (
                            <div className={`absolute -inset-0.5 rounded-full border ${frameVal === 'gold-ring' ? 'border-yellow-400' : frameVal === 'neon-ring' ? 'border-pink-500' : 'border-cyan-400'}`} />
                          )}
                        </div>
                        {isEquipped && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-black font-black text-[9px] rounded-full flex items-center justify-center">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CHANGE PASSWORD & SECURITY QUESTION */}
        {activeTab === 'password' && (
          <div className="space-y-6">
            {/* Section A: Change Password */}
            <form onSubmit={handleChangePassword} className="space-y-4 pb-5 border-b border-white/10">
              <h3 className="text-xs font-black text-[#00f0ff] uppercase flex items-center gap-1.5">
                <Key className="w-4 h-4" /> 1. ĐỔI MẬT KHẨU TÀI KHOẢN
              </h3>

              {passError && (
                <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{passError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">
                  MẬT KHẨU HIỆN TẠI:
                </label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu hiện tại..."
                  className="w-full bg-black/60 border border-white/20 focus:border-[#00f0ff] rounded-lg p-2.5 text-xs text-white outline-none font-mono"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isChangingPass}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">
                  MẬT KHẨU MỚI:
                </label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full bg-black/60 border border-white/20 focus:border-[#00f0ff] rounded-lg p-2.5 text-xs text-white outline-none font-mono"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isChangingPass}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">
                  NHẬP LẠI MẬT KHẨU MỚI:
                </label>
                <input
                  type="password"
                  placeholder="Xác nhận mật khẩu mới..."
                  className="w-full bg-black/60 border border-white/20 focus:border-[#00f0ff] rounded-lg p-2.5 text-xs text-white outline-none font-mono"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isChangingPass}
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black font-black text-xs uppercase tracking-widest rounded-xl cursor-pointer transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-98"
              >
                {isChangingPass ? 'ĐANG CẬP NHẬT...' : '[ XÁC NHẬN ĐỔI MẬT KHẨU ]'}
              </button>
            </form>

            {/* Section B: Security Question Configuration */}
            <form onSubmit={handleSaveSecurityQuestion} className="space-y-4">
              <div>
                <h3 className="text-xs font-black text-amber-400 uppercase flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-400" /> 2. CÀI ĐẶT CÂU HỎI BẢO MẬT (QUÊN MẬT KHẨU)
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Thiết lập câu hỏi & câu trả lời bí mật. Khi quên mật khẩu, bạn bắt buộc phải trả lời đúng câu hỏi này để khôi phục tài khoản, chống bị kẻ xấu phá hoại.
                </p>
              </div>

              {secMsg && (
                <div className="p-2.5 bg-red-950/40 border border-red-500/40 rounded-lg text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{secMsg}</span>
                </div>
              )}

              {user?.securityQuestion && (
                <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-[11px] text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold">Đã có bảo mật:</span> {user.securityQuestion}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">
                  CHỌN HOẶC TỰ NHẬP CÂU HỎI BẢO MẬT:
                </label>
                <select
                  value={secQuestionSelect}
                  onChange={(e) => setSecQuestionSelect(e.target.value)}
                  className="w-full bg-black/60 border border-white/20 focus:border-amber-400 rounded-lg p-2.5 text-xs text-white outline-none font-mono"
                  disabled={isSavingSec}
                >
                  {PRESET_QUESTIONS.map((q, idx) => (
                    <option key={idx} value={q} className="bg-slate-900 text-white">
                      {q}
                    </option>
                  ))}
                  <option value="CUSTOM" className="bg-slate-900 text-amber-300 font-bold">
                    ✏️ [Tự nhập câu hỏi riêng...]
                  </option>
                </select>
              </div>

              {secQuestionSelect === 'CUSTOM' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">
                    CÂU HỎI BẢO MẬT CỦA BẠN:
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập câu hỏi bảo mật riêng của bạn..."
                    className="w-full bg-black/60 border border-white/20 focus:border-amber-400 rounded-lg p-2.5 text-xs text-white outline-none font-mono"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    disabled={isSavingSec}
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">
                  CÂU TRẢ LỜI BẢO MẬT CỦA BẠN:
                </label>
                <input
                  type="text"
                  placeholder="Nhập câu trả lời chính xác (Ví dụ: Mèo Béo, Hà Nội...)"
                  className="w-full bg-black/60 border border-white/20 focus:border-amber-400 rounded-lg p-2.5 text-xs text-white outline-none font-mono"
                  value={secAnswer}
                  onChange={(e) => setSecAnswer(e.target.value)}
                  disabled={isSavingSec}
                />
              </div>

              <button
                type="submit"
                disabled={isSavingSec}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-widest rounded-xl cursor-pointer transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-98"
              >
                {isSavingSec ? 'ĐANG LƯU BẢO MẬT...' : '[ LƯU CÂU HỎI BẢO MẬT ]'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
