/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { get, ref, onValue, update, remove } from 'firebase/database';
import { db } from '../firebase';
import { BookOpen, Landmark, Coins, Trophy, LogOut, Music, Music2, User as UserIcon, ShieldAlert, MessageSquare, ShoppingBag, Award, Shield, Sparkles, X, Target, Newspaper, Crosshair, History, Settings, Volume2, VolumeX, Link as LinkIcon, Play, Pause, Gamepad2, Swords } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  uid: string;
  uname: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: 'STUDENT' | 'TEACHER';
  userClass: string;
  onLogout: () => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  onOpenProfile?: () => void;
  onOpenIdeas?: () => void;
}

export default function Sidebar({
  uid,
  uname,
  activeTab,
  setActiveTab,
  userRole,
  userClass,
  onLogout,
  isMobileOpen = false,
  setIsMobileOpen,
  onOpenProfile,
  onOpenIdeas,
}: SidebarProps) {
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineNames, setOnlineNames] = useState<string[]>([]);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [activeFrame, setActiveFrame] = useState('');

  // Background Music state
  const [musicUrl, setMusicUrl] = useState('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
  const [musicTitle, setMusicTitle] = useState('SoundHelix Classic EDM');
  const [volume, setVolume] = useState(0.5);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [customInputUrl, setCustomInputUrl] = useState('');

  // Audio object initialized lazily
  const [bgAudio] = useState(() => {
    const audio = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
    audio.loop = true;
    audio.volume = 0.5;
    return audio;
  });

  // Track global background music from Firebase
  useEffect(() => {
    const musicRef = ref(db, 'settings/bgMusic');
    const unsubscribe = onValue(musicRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (val.url && val.url !== musicUrl) {
          setMusicUrl(val.url);
          setMusicTitle(val.title || 'Nhạc Nền Server');
          bgAudio.src = val.url;
          if (isMusicPlaying) {
            bgAudio.play().catch((err) => console.log('Audio switch error:', err));
          }
        }
      }
    });
    return () => unsubscribe();
  }, [musicUrl, isMusicPlaying]);

  // Adjust volume
  useEffect(() => {
    bgAudio.volume = volume;
  }, [volume]);

  // Preset music tracks
  const PRESET_TRACKS = [
    { title: 'Cyberpunk Synthwave - SoundHelix #1', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { title: 'Arcade Gaming Beat - SoundHelix #8', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
    { title: 'Epic Symphony - SoundHelix #16', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' },
    { title: 'Chill Chill Lo-Fi Lounge', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' }
  ];

  const handleSelectTrack = async (trackUrl: string, trackName: string) => {
    setMusicUrl(trackUrl);
    setMusicTitle(trackName);
    bgAudio.src = trackUrl;
    if (!isMusicPlaying) {
      bgAudio.play().catch((err) => console.log('Audio error:', err));
      setIsMusicPlaying(true);
    } else {
      bgAudio.play().catch((err) => console.log('Audio error:', err));
    }

    // Save as server music if admin
    if (userRole === 'TEACHER') {
      try {
        await update(ref(db, 'settings/bgMusic'), {
          url: trackUrl,
          title: trackName,
          updatedBy: uname
        });
      } catch (err) {}
    }
  };

  const handleAddCustomMusic = async () => {
    if (!customInputUrl.trim()) return;
    const url = customInputUrl.trim();
    const title = `Nhạc Tùy Chỉnh (${url.substring(url.lastIndexOf('/') + 1) || 'MP3 Direct'})`;
    handleSelectTrack(url, title);
    setCustomInputUrl('');
    alert('Đã cập nhật bài hát mới thành công! 🎶');
  };

  // Track Avatar and activeFrame changes in Realtime Database
  useEffect(() => {
    const userRef = ref(db, `users/${uid}`);
    const unsubscribe = onValue(userRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setAvatarUrl(val.avatar || '');
        setActiveFrame(val.activeFrame || '');
      }
    });
    return () => unsubscribe();
  }, [uid]);

  // Track Online Count in Realtime Database
  useEffect(() => {
    const onlineRef = ref(db, 'online');
    const unsubscribe = onValue(onlineRef, (snap) => {
      const data = snap.val() || {};
      const count = Object.keys(data).length;
      const names = Object.values(data).map((u: any) => u.name || 'Sinh Viên');
      setOnlineCount(count);
      setOnlineNames(names);
    });
    return () => unsubscribe();
  }, []);

  const toggleMusic = () => {
    if (isMusicPlaying) {
      bgAudio.pause();
      setIsMusicPlaying(false);
    } else {
      bgAudio.play().catch((err) => console.log('Audio error:', err));
      setIsMusicPlaying(true);
    }
  };

  const handleChangeAvatar = async () => {
    const current = avatarUrl;
    const link = prompt('Nhập đường dẫn URL ảnh Avatar mới của bạn:', current);
    if (link !== null) {
      try {
        await update(ref(db, `users/${uid}`), { avatar: link });
      } catch (err) {
        alert('Lỗi cập nhật Avatar!');
      }
    }
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[100] transition-opacity duration-300"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      <aside 
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(10, 10, 15, 0.78), rgba(0, 0, 0, 0.88)), url('https://cdn2.fptshop.com.vn/unsafe/hinh_nen_iphone_doc_dep_5_d6122711c8.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        className={`
        glass-box flex flex-col justify-between select-none p-5 border border-amber-500/20 shadow-[0_0_30px_rgba(0,0,0,0.8)]
        /* Desktop Sticky Layout */
        md:sticky md:top-5 md:h-[calc(100vh-40px)] md:w-64 md:translate-x-0 md:opacity-100 md:pointer-events-auto md:z-30
        /* Mobile Slide-over Drawer Layout */
        fixed inset-y-4 left-4 z-[101] w-64 h-[calc(100vh-32px)] transition-all duration-300
        ${isMobileOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-[280px] md:translate-x-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto'}
      `}>
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-none flex flex-col">
          {/* Brand header with mobile close option */}
          <div className="flex items-center justify-between mb-6">
            <div className="brand-glitch small select-none tracking-widest text-[#ff003c] font-black text-center w-full text-sm md:text-base">
              AYK MAIN 8686
            </div>
            {setIsMobileOpen && (
              <button 
                onClick={() => setIsMobileOpen(false)}
                className="md:hidden p-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg cursor-pointer flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Peer Network Connection Status */}
          <div 
            className="border border-[#00ff80]/30 bg-[#00ff80]/5 p-3 rounded-lg text-xs font-mono text-[#00ff80] mb-5 overflow-hidden shadow-[inset_0_0_10px_rgba(0,255,128,0.02)] transition-all"
            title={onlineNames.join(', ')}
          >
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00ff80] animate-ping shrink-0" />
              <span>ONLINE MẠNG ({onlineCount})</span>
            </div>
            <div className="text-[10px] text-white/70 overflow-hidden text-ellipsis whitespace-nowrap leading-relaxed">
              {onlineNames.length > 0 ? onlineNames.join(', ') : 'Không có ai'}
            </div>
          </div>

          {/* User Card */}
          <div className="user-card flex items-center gap-3.5 pb-5 border-b border-[#30363d] mb-6">
            <div 
              onClick={handleChangeAvatar}
              className="relative w-12 h-12 rounded-full cursor-pointer flex items-center justify-center shrink-0 hover:scale-105 active:scale-95"
              title="Nhấp để đổi ảnh đại diện & viền"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-black/50 border border-white/20 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-5 h-5 text-[#ffd700]" />
                )}
              </div>
              {activeFrame && (
                activeFrame.startsWith('http') ? (
                  <img 
                    src={activeFrame} 
                    alt="Frame" 
                    className="absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] object-contain pointer-events-none z-10 filter drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`absolute inset-0 rounded-full pointer-events-none border-2 ${
                    activeFrame === 'gold-ring' ? 'border-[#ffd700] shadow-[0_0_12px_rgba(255,215,0,0.6)]' :
                    activeFrame === 'neon-ring' ? 'border-[#ff003c] shadow-[0_0_12px_rgba(255,0,60,0.6)] animate-pulse' :
                    activeFrame === 'cyber-ring' ? 'border-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.6)]' : ''
                  }`} />
                )
              )}
            </div>
            <div className="overflow-hidden">
              <span className={`badge inline-block py-0.5 px-2.5 border rounded-full text-[9px] font-black uppercase tracking-wider ${
                userRole === 'TEACHER' 
                  ? 'border-[#ff003c] text-[#ff003c] bg-[#ff003c]/10' 
                  : 'border-[#ffd700] text-[#ffd700] bg-[#ffd700]/10'
              }`}>
                {userRole === 'TEACHER' ? 'Faculty Admin' : `LỚP ${userClass}`}
              </span>
              <strong className="block text-white text-sm font-bold truncate mt-1" title={uname}>
                {uname}
              </strong>
              {onOpenProfile && (
                <button
                  onClick={onOpenProfile}
                  className="mt-1 text-[9px] text-[#00f0ff] hover:underline flex items-center gap-1 font-mono font-bold cursor-pointer"
                >
                  ⚙️ Hồ Sơ & Đổi MK
                </button>
              )}
            </div>
          </div>

          {/* Tabs Lists */}
          <nav className="space-y-1 font-mono">
            <button
              onClick={() => handleTabClick('news')}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border border-[#00f0ff]/20 ${
                activeTab === 'news'
                  ? 'bg-[#00f0ff]/15 text-white border-l-4 border-[#00f0ff] pl-3.5'
                  : 'text-cyan-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5 text-cyan-400" /> [ BẢN TIN AYK8686 ]
            </button>

            <button
              onClick={() => handleTabClick('hunting')}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer border border-red-500/30 shadow-[0_0_10px_rgba(255,0,60,0.15)] ${
                activeTab === 'hunting'
                  ? 'bg-red-950/40 text-white border-l-4 border-[#ff003c] pl-3.5'
                  : 'text-red-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5 text-[#ff003c] animate-spin" style={{ animationDuration: '6s' }} /> [ ĐI SĂN THẾ GIỚI ]
            </button>

            <button
              onClick={() => handleTabClick('academic')}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'academic'
                  ? 'bg-[#ff003c]/15 text-white border-l-4 border-[#ff003c] pl-3.5'
                  : 'text-[#8b949e] hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> [ HỌC TẬP & AI ]
            </button>

            <button
              onClick={() => handleTabClick('missions')}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border border-[#00f0ff]/20 ${
                activeTab === 'missions'
                  ? 'bg-[#00f0ff]/15 text-white border-l-4 border-[#00f0ff] pl-3.5'
                  : 'text-cyan-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> [ NHIỆM VỤ HẰNG NGÀY ]
            </button>

            <button
              onClick={() => handleTabClick('luckywheel')}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border border-[#ffd700]/10 ${
                activeTab === 'luckywheel'
                  ? 'bg-[#ffd700]/15 text-white border-l-4 border-[#ffd700] pl-3.5'
                  : 'text-amber-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse animate-duration-1000" /> [ VÒNG QUAY MAY MẮN ]
            </button>

            <button
              onClick={() => handleTabClick('chat')}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-[#ff003c]/15 text-white border-l-4 border-[#ff003c] pl-3.5'
                  : 'text-[#8b949e] hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> [ CHAT TOÀN TRƯỜNG ]
            </button>

            <button
              onClick={() => handleTabClick('marketplace')}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'marketplace'
                  ? 'bg-[#ff003c]/15 text-white border-l-4 border-[#ff003c] pl-3.5'
                  : 'text-[#8b949e] hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> [ CHỢ MUA BÁN ]
            </button>

            <button
              onClick={() => handleTabClick('bank')}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'bank'
                  ? 'bg-[#ff003c]/15 text-white border-l-4 border-[#ff003c] pl-3.5'
                  : 'text-[#8b949e] hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" /> [ NGÂN HÀNG ]
            </button>

            <button
              onClick={() => handleTabClick('gold')}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'gold'
                  ? 'bg-[#ff003c]/15 text-white border-l-4 border-[#ff003c] pl-3.5'
                  : 'text-[#8b949e] hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <Coins className="w-3.5 h-3.5" /> [ SÀN VÀNG ]
            </button>

            <button
              onClick={() => handleTabClick('games')}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer border border-purple-500/30 bg-purple-950/20 text-purple-300 hover:text-white hover:bg-purple-900/40 ${
                activeTab === 'games'
                  ? 'bg-purple-900/50 text-white border-l-4 border-purple-500 pl-3.5 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                  : 'border-l-4 border-transparent'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> [ CỔNG GAME GIẢI TRÍ ]
            </button>

            <button
              onClick={() => handleTabClick('casino')}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'casino'
                  ? 'bg-[#ff003c]/15 text-white border-l-4 border-[#ff003c] pl-3.5'
                  : 'text-[#8b949e] hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" /> [ ĐẤU TRƯỜNG LIVE ]
            </button>

            <button
              onClick={() => handleTabClick('tx_history')}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'tx_history'
                  ? 'bg-[#ff003c]/15 text-white border-l-4 border-[#ff003c] pl-3.5'
                  : 'text-[#8b949e] hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <History className="w-3.5 h-3.5 text-[#00f0ff]" /> [ LỊCH SỬ GIAO DỊCH ]
            </button>

            <button
              onClick={() => handleTabClick('rankings')}
              className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'rankings'
                  ? 'bg-[#ff003c]/15 text-white border-l-4 border-[#ff003c] pl-3.5'
                  : 'text-[#8b949e] hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <Award className="w-3.5 h-3.5" /> [ BẢNG VÀNG ]
            </button>

            {userRole === 'TEACHER' && (
              <button
                onClick={() => handleTabClick('admin')}
                className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border border-[#00f0ff]/30 ${
                  activeTab === 'admin'
                    ? 'bg-[#00f0ff]/15 text-white border-l-4 border-l-[#00f0ff] pl-3.5'
                    : 'text-[#00f0ff] hover:text-white hover:bg-[#00f0ff]/5 border-l-4 border-transparent'
                }`}
              >
                <Shield className="w-3.5 h-3.5 animate-pulse" /> [ ĐIỀU HÀNH VIP ]
              </button>
            )}
          </nav>
        </div>

        {/* Music Toggle & Selector Modal */}
        <div className="space-y-2 mt-auto pt-4 border-t border-[#30363d]/50 font-mono shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMusic}
              className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 text-[11px] font-bold tracking-widest uppercase transition-all border cursor-pointer ${
                isMusicPlaying
                  ? 'border-[#ffd700] text-[#ffd700] bg-[#ffd700]/10 text-glow-gold'
                  : 'border-[#30363d] text-[#8b949e] hover:text-white'
              }`}
            >
              {isMusicPlaying ? (
                <>
                  <Music2 className="w-3.5 h-3.5 animate-bounce" /> [ TẮT NHẠC ]
                </>
              ) : (
                <>
                  <Music className="w-3.5 h-3.5" /> [ BẬT NHẠC ]
                </>
              )}
            </button>

            <button
              onClick={() => setShowMusicModal(true)}
              title="Đổi Bài Hát & Thêm Link Nhạc"
              className="py-2.5 px-2.5 bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-white rounded-lg flex items-center justify-center cursor-pointer transition-all shrink-0"
            >
              <Settings className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '10s' }} />
            </button>
          </div>

          {/* Currently playing track marquee badge */}
          <div className="text-[10px] text-slate-400 text-center truncate px-1 flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
            <span className="truncate">{musicTitle}</span>
          </div>

          {onOpenIdeas && (
            <button
              onClick={onOpenIdeas}
              className="w-full py-2.5 px-3 bg-cyan-950/30 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500 hover:text-black rounded-lg flex items-center justify-center gap-2 text-[11px] font-black tracking-wider uppercase cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> 💡 [ 50 Ý TƯỞNG S88 ]
            </button>
          )}

          {!showLogoutConfirm ? (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full py-2.5 px-3 bg-red-950/10 border border-red-900/30 text-red-400 hover:bg-[#ff003c] hover:text-white hover:border-[#ff003c] rounded-lg flex items-center justify-center gap-2 text-[11px] font-bold tracking-widest uppercase cursor-pointer transition-all hover:shadow-[0_0_10px_rgba(255,0,60,0.3)]"
            >
              <LogOut className="w-3.5 h-3.5" /> [ ĐĂNG XUẤT ]
            </button>
          ) : (
            <div className="space-y-1.5 p-2 bg-red-950/40 border border-red-500/50 rounded-lg text-center animate-fadeIn">
              <p className="text-[10px] text-red-300 font-bold uppercase">Xác nhận thoát tài khoản?</p>
              <div className="flex gap-1.5">
                <button
                  onClick={onLogout}
                  className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] rounded uppercase cursor-pointer transition shadow"
                >
                  XÁC NHẬN
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] rounded uppercase cursor-pointer transition"
                >
                  HỦY
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MUSIC SELECTOR & CUSTOM MP3 URL MODAL */}
        {showMusicModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-950 border-2 border-cyan-500/60 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-[0_0_50px_rgba(0,240,255,0.3)] font-mono text-left relative animate-in fade-in zoom-in-95 duration-200">
              
              <button 
                onClick={() => setShowMusicModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-white/10 pb-3 flex items-center gap-3">
                <Music className="w-7 h-7 text-cyan-400 animate-bounce" />
                <div>
                  <h3 className="text-white text-base font-black uppercase tracking-wider">TRÌNH PHÁT NHẠC NỀN WEB</h3>
                  <p className="text-[11px] text-cyan-400 font-sans">Chọn bài hát có sẵn hoặc dán đường dẫn MP3 bài hát của bạn!</p>
                </div>
              </div>

              {/* Volume Controller */}
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10 flex items-center gap-3">
                <button 
                  onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                  className="text-cyan-400 hover:text-white"
                >
                  {volume === 0 ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
                </button>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-300 uppercase font-bold">
                    <span>ÂM LƯỢNG NHẠC</span>
                    <span>{Math.round(volume * 100)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Add Custom MP3 URL Input */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-amber-500/30 space-y-2">
                <label className="text-xs font-black text-amber-300 uppercase flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-amber-400" /> THÊM NHẠC BẰNG LINK MP3 TỰ CHỌN:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://domain.com/path-to-song.mp3"
                    value={customInputUrl}
                    onChange={(e) => setCustomInputUrl(e.target.value)}
                    className="flex-1 bg-black/60 border border-white/20 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 outline-none"
                  />
                  <button
                    onClick={handleAddCustomMusic}
                    className="bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-2.5 rounded-xl text-xs font-black uppercase shrink-0 cursor-pointer shadow-lg transition-all"
                  >
                    PHÁT
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-sans">
                  * Nhập bất kỳ đường dẫn âm thanh trực tiếp (.mp3, .wav, .m4a) nào để phát trực tiếp trên trang web.
                </p>
              </div>

              {/* Preset Track List */}
              <div className="space-y-2">
                <div className="text-xs font-extrabold text-white uppercase tracking-wider">
                  DANH SÁCH BÀI HÁT GỢI Ý:
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {PRESET_TRACKS.map((track, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectTrack(track.url, track.title)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        musicUrl === track.url
                          ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                          : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {musicUrl === track.url && isMusicPlaying ? (
                          <Pause className="w-4 h-4 text-cyan-400 shrink-0" />
                        ) : (
                          <Play className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="text-xs font-bold truncate">{track.title}</span>
                      </div>
                      {musicUrl === track.url && (
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-black uppercase shrink-0">
                          ĐANG PHÁT
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </aside>
    </>
  );
}
