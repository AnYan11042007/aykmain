/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { get, ref, onValue, push, set, update } from 'firebase/database';
import { db } from '../firebase';
import { Swords, Play, Trophy, Users, Shield, Plus, ArrowRight } from 'lucide-react';
import { User, RpsRoom, BlackjackRoom, TienLenRoom } from '../types';

interface GamesPortalProps {
  uid: string;
  user: User | null;
  onOpenGame: (gameKey: string) => void;
  onJoinRps: (roomId: string) => void;
  onJoinBj: (roomId: string) => void;
  onJoinTl: (roomId: string) => void;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

export default function GamesPortal({ uid, user, onOpenGame, onJoinRps, onJoinBj, onJoinTl, onShowResult }: GamesPortalProps) {
  // Creating multiplayer room values
  const [rpsStake, setRpsStake] = useState('1000');
  const [bjStake, setBjStake] = useState('2000');
  const [tlStake, setTlStake] = useState('5000');

  // Real-time active rooms state list
  const [rpsRooms, setRpsRooms] = useState<RpsRoom[]>([]);
  const [bjRooms, setBlackjackRooms] = useState<BlackjackRoom[]>([]);
  const [tlRooms, setTienLenRooms] = useState<TienLenRoom[]>([]);

  useEffect(() => {
    // 1. Subscribe to RPS rooms list
    const rpsRef = ref(db, 'rps_rooms');
    const unsubRps = onValue(rpsRef, (snap) => {
      const list: RpsRoom[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          list.push({ id: child.key!, ...child.val() });
        });
      }
      setRpsRooms(list);
    });

    // 2. Subscribe to Blackjack rooms list
    const bjRef = ref(db, 'blackjack_rooms');
    const unsubBj = onValue(bjRef, (snap) => {
      const list: BlackjackRoom[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          list.push({ id: child.key!, ...child.val() });
        });
      }
      setBlackjackRooms(list);
    });

    // 3. Subscribe to Tien Len rooms list
    const tlRef = ref(db, 'tienlen_rooms');
    const unsubTl = onValue(tlRef, (snap) => {
      const list: TienLenRoom[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          list.push({ id: child.key!, ...child.val() });
        });
      }
      setTienLenRooms(list);
    });

    return () => {
      unsubRps();
      unsubBj();
      unsubTl();
    };
  }, []);

  // Creation Triggers
  const handleCreateRpsRoom = async () => {
    const stake = parseInt(rpsStake);
    if (isNaN(stake) || stake <= 0) {
      alert('Mức cược Oẳn Tù Tì không hợp lệ!');
      return;
    }
    const myPP = user?.pp || 0;
    if (myPP < stake) {
      alert(`Bạn không đủ ${stake.toLocaleString()} PP để tạo bàn!`);
      return;
    }

    try {
      const roomRef = push(ref(db, 'rps_rooms'));
      const payload: RpsRoom = {
        p1: uid,
        p1Name: user?.name || 'Sinh Viên',
        p1Avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
        bet: stake,
        status: 'WAITING',
        p1Choice: '',
        p2Choice: '',
        p1Rematch: false,
        p2Rematch: false,
        finalMsg: ''
      };
      await set(roomRef, payload);
      onJoinRps(roomRef.key!);
    } catch (err) {
      alert('Lỗi tạo bàn Oẳn Tù Tì!');
    }
  };

  const handleCreateBlackjackRoom = async () => {
    const stake = parseInt(bjStake);
    if (isNaN(stake) || stake <= 0) {
      alert('Mức cược Xì Dách không hợp lệ!');
      return;
    }
    const myPP = user?.pp || 0;
    if (myPP < stake) {
      alert(`Bạn không đủ ${stake.toLocaleString()} PP để tạo bàn!`);
      return;
    }

    try {
      const roomRef = push(ref(db, 'blackjack_rooms'));
      const payload: BlackjackRoom = {
        creator: uid,
        creatorName: user?.name || 'Sinh Viên',
        bet: stake,
        status: 'WAITING',
        players: {
          [uid]: {
            name: user?.name || 'Sinh Viên',
            avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
            status: 'WAITING'
          }
        }
      };
      await set(roomRef, payload);
      onJoinBj(roomRef.key!);
    } catch (err) {
      alert('Lỗi tạo sòng Xì Dách!');
    }
  };

  const handleCreateTienLenRoom = async () => {
    const stake = parseInt(tlStake);
    if (isNaN(stake) || stake <= 0) {
      alert('Mức cược Tiến Lên không hợp lệ!');
      return;
    }
    const myPP = user?.pp || 0;
    if (myPP < stake) {
      alert(`Bạn không đủ ${stake.toLocaleString()} PP để tạo bàn!`);
      return;
    }

    try {
      const roomRef = push(ref(db, 'tienlen_rooms'));
      const payload: TienLenRoom = {
        creator: uid,
        creatorName: user?.name || 'Sinh Viên',
        bet: stake,
        status: 'WAITING',
        players: {
          [uid]: {
            name: user?.name || 'Sinh Viên',
            avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
            isCreator: true,
            status: 'WAITING'
          }
        },
        playerOrder: [uid],
        pot: 0
      };
      await set(roomRef, payload);
      onJoinTl(roomRef.key!);
    } catch (err) {
      alert('Lỗi tạo sòng Tiến Lên!');
    }
  };

  // Join actions
  const handleJoinRpsRoom = async (roomId: string) => {
    const r = rpsRooms.find(x => x.id === roomId);
    if (!r) return;

    if (r.p1 === uid) {
      onJoinRps(roomId);
      return;
    }

    if (r.p2 && r.p2 !== uid) {
      alert('Bàn đấu đã đủ người!');
      return;
    }

    const myPP = user?.pp || 0;
    if (myPP < r.bet) {
      alert(`Bạn không đủ ${r.bet.toLocaleString()} PP để tham gia ván đấu!`);
      return;
    }

    try {
      // Set player 2 details
      await update(ref(db, `rps_rooms/${roomId}`), {
        p2: uid,
        p2Name: user?.name || 'Khách',
        p2Avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150'
      });
      onJoinRps(roomId);
    } catch (err) {
      alert('Lỗi tham gia bàn Oẳn Tù Tì!');
    }
  };

  const handleJoinBlackjackRoom = async (roomId: string) => {
    const r = bjRooms.find(x => x.id === roomId);
    if (!r) return;

    if (r.players && r.players[uid]) {
      onJoinBj(roomId);
      return;
    }

    if (r.status !== 'WAITING') {
      alert('Sòng đang chơi giữa chừng, vui lòng đợi ván mới!');
      return;
    }

    const pCount = Object.keys(r.players || {}).length;
    if (pCount >= 5) {
      alert('Sòng bài đã đủ 5 người chơi!');
      return;
    }

    const myPP = user?.pp || 0;
    if (myPP < r.bet) {
      alert(`Bạn không đủ ${r.bet.toLocaleString()} PP để tham gia sòng!`);
      return;
    }

    try {
      await update(ref(db, `blackjack_rooms/${roomId}/players/${uid}`), {
        name: user?.name || 'Khách',
        avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
        status: 'WAITING'
      });
      onJoinBj(roomId);
    } catch (err) {
      alert('Lỗi vào sòng Xì Dách!');
    }
  };

  const handleJoinTienLenRoom = async (roomId: string) => {
    const r = tlRooms.find(x => x.id === roomId);
    if (!r) return;

    if (r.players && r.players[uid]) {
      onJoinTl(roomId);
      return;
    }

    if (r.status !== 'WAITING') {
      alert('Vòng đấu đang diễn ra!');
      return;
    }

    const pCount = Object.keys(r.players || {}).length;
    if (pCount >= 4) {
      alert('Phòng đấu Tiến Lên đã đủ tối đa 4 người!');
      return;
    }

    const myPP = user?.pp || 0;
    if (myPP < r.bet) {
      alert(`Bạn không đủ ${r.bet.toLocaleString()} PP để tham gia!`);
      return;
    }

    try {
      await update(ref(db, `tienlen_rooms/${roomId}/players/${uid}`), {
        name: user?.name || 'Khách',
        avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
        isCreator: false,
        status: 'WAITING'
      });
      onJoinTl(roomId);
    } catch (err) {
      alert('Lỗi vào phòng Tiến Lên!');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* PREMIUM CYBER GAMING WEB BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(0,240,255,0.05)]">
        
        {/* Ambient floating glowing dust particles */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
        
        {/* Decorative cyber grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />

        {/* Banner Content (Left side) */}
        <div className="relative z-10 space-y-3 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[9px] text-cyan-400 font-mono uppercase font-black tracking-wider shadow-[0_0_10px_rgba(6,182,212,0.15)]">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" /> S88 OFFICIAL ENTERTAINMENT ARENA
          </div>
          
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black font-sans text-white tracking-wide uppercase leading-tight">
              ĐẤU TRƯỜNG <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-[#00f0ff] to-yellow-300 text-glow-blue">GIẢI TRÍ S88</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium font-sans">
              Hệ thống cá cược mô phỏng thời gian thực, cày cuốc nhiệm vụ hàng ngày kiếm PP cực căng và đổi quà cực khủng!
            </p>
          </div>

          {/* Quick info badges */}
          <div className="flex flex-wrap justify-center md:justify-start gap-2.5 pt-1 text-[10px] font-mono text-slate-400">
            <span className="bg-slate-900/80 border border-white/5 py-1 px-2.5 rounded-md flex items-center gap-1.5 font-bold">
              🎲 <span className="text-orange-400">Live Station Active</span>
            </span>
            <span className="bg-slate-900/80 border border-white/5 py-1 px-2.5 rounded-md flex items-center gap-1.5 font-bold">
              💼 <span className="text-yellow-400">10 Daily Missions Pool</span>
            </span>
          </div>
        </div>

        {/* Golden Holographic Bank Vault Block (Right side) */}
        <div className="relative z-10 shrink-0 w-full md:w-auto">
          <div className="bg-black/70 border border-amber-500/30 p-5 rounded-2xl flex flex-col items-center md:items-end gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.05)] relative overflow-hidden group">
            
            {/* Hover border glow effect */}
            <div className="absolute inset-0 border border-amber-500/0 group-hover:border-amber-500/40 transition-all duration-300 rounded-2xl pointer-events-none" />
            
            <span className="text-[9px] font-mono font-black text-amber-500 tracking-widest uppercase block">
              💳 VÍ TÀI SẢN HOÀNG GIA // ROYAL BALANCE
            </span>
            
            <div className="flex items-center gap-2.5">
              <span className="text-2xl animate-pulse">🪙</span>
              <span className="text-glow-gold text-[#ffd700] text-2xl font-black tracking-wide font-mono">
                {(user?.pp || 0).toLocaleString()} <span className="text-sm text-yellow-500">PP</span>
              </span>
            </div>
            
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent mt-1" />
            
            <span className="text-[8px] text-slate-500 font-mono uppercase block text-center md:text-right">
              Mã ví bảo mật: S88-CORE-SECURE
            </span>
          </div>
        </div>
      </div>

      {/* FULL WIDTH GAME LOBBY */}
      <div className="w-full space-y-8">

          {/* EXCLUSIVE FEATURED: WORLD CARD BATTLE 1V1 ARENA */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-purple-500/60 bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950 p-6 shadow-[0_0_35px_rgba(168,85,247,0.35)] space-y-6">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-5 relative z-10 border-b border-purple-500/20 pb-5">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/50 text-xs text-purple-300 font-mono font-black uppercase tracking-wider">
                  ⚔️ CỔNG GAME CHÍNH THỨC: 1V1 REAL-TIME CARD BATTLE
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider flex items-center justify-center md:justify-start gap-3">
                  <span>🃏 ĐẤU THẺ THẾ GIỚI 1V1</span>
                  <span className="text-xs bg-red-600 text-white font-mono px-2.5 py-1 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">ARENA LIVE</span>
                </h3>
                <p className="text-xs text-purple-200/90 max-w-xl leading-relaxed font-sans">
                  Giao tranh thẻ bài Công / Thủ / Đặc biệt đỉnh cao thời gian thực. Tạo phòng thách đấu 1v1, cược PP, thi triển tuyệt kỹ thẻ bài và xưng vương Đấu Trường!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 shrink-0 relative z-10 w-full md:w-auto">
                <button
                  onClick={() => onOpenGame('world_card_battle')}
                  className="px-6 py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-[0_0_25px_rgba(168,85,247,0.6)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Swords className="w-4 h-4 animate-bounce text-yellow-300" /> TẠO PHÒNG / THÁCH ĐẤU 1V1
                </button>
              </div>
            </div>

            {/* FEATURED CARDS COLLECTION SHOWCASE */}
            <div className="space-y-3 relative z-10">
              <h4 className="text-xs font-mono font-black text-purple-300 uppercase tracking-widest flex items-center gap-2">
                <span>🔥 BỘ THẺ BÀI HUYỀN THOẠI TRONG ĐẤU TRƯỜNG</span>
                <span className="text-[10px] text-purple-400/70 font-normal">(3 Thẻ mới cập nhật)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* 1. Khiên Phòng Thủ Card */}
                <div className="glass-box p-4 border border-cyan-500/40 bg-gradient-to-b from-cyan-950/40 via-purple-950/20 to-black space-y-2 hover:border-cyan-400 transition-all group">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono font-black bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 px-2 py-0.5 rounded uppercase">
                      THẺ PHÒNG THỦ
                    </span>
                    <span className="text-xs font-mono font-black text-cyan-400">DEF: 90</span>
                  </div>
                  <h5 className="text-white font-black text-sm uppercase tracking-wider group-hover:text-cyan-300 transition-colors">
                    Khiên Phòng Thủ
                  </h5>
                  <div className="p-2 bg-black/50 border border-cyan-500/20 rounded-lg text-[10px] font-mono text-cyan-200/90 leading-relaxed">
                    <strong>Kỹ năng [Khiên Năng Lượng]:</strong> Giảm 70% sát thương nhận vào trong 2 lượt tiếp theo & Tăng +70 Giáp phản pháo.
                  </div>
                </div>

                {/* 2. Thấy Mà Ghe Card */}
                <div className="glass-box p-4 border border-amber-500/40 bg-gradient-to-b from-amber-950/40 via-purple-950/20 to-black space-y-2 hover:border-amber-400 transition-all group">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono font-black bg-amber-500/20 border border-amber-400/50 text-amber-300 px-2 py-0.5 rounded uppercase">
                      THẺ ĐẶC BIỆT
                    </span>
                    <span className="text-xs font-mono font-black text-amber-400">DEF: 60</span>
                  </div>
                  <h5 className="text-white font-black text-sm uppercase tracking-wider group-hover:text-amber-300 transition-colors">
                    Thấy Mà Ghe
                  </h5>
                  <div className="p-2 bg-black/50 border border-amber-500/20 rounded-lg text-[10px] font-mono text-amber-200/90 leading-relaxed">
                    <strong>Kỹ năng [Lập Trình Hỗn Loạn]:</strong> Đổi vai trò Tấn công & Phòng thủ của TẤT CẢ các thẻ trên bàn đấu trong 2 lượt.
                  </div>
                </div>

                {/* 3. Đấm Phát Chết Luôn Card */}
                <div className="glass-box p-4 border border-rose-500/40 bg-gradient-to-b from-rose-950/40 via-purple-950/20 to-black space-y-2 hover:border-rose-400 transition-all group">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono font-black bg-rose-500/20 border border-rose-400/50 text-rose-300 px-2 py-0.5 rounded uppercase">
                      THẺ TẤN CÔNG
                    </span>
                    <span className="text-xs font-mono font-black text-rose-400">ATK: 120</span>
                  </div>
                  <h5 className="text-white font-black text-sm uppercase tracking-wider group-hover:text-rose-300 transition-colors">
                    Đấm Phát Chết Luôn
                  </h5>
                  <div className="p-2 bg-black/50 border border-rose-500/20 rounded-lg text-[10px] font-mono text-rose-200/90 leading-relaxed">
                    <strong>Kỹ năng [Cú Đấm Năng Lượng]:</strong> Bộc phá gây 150 sát thương cực lớn lên đối thủ & Tăng 30% ATK đòn tiếp.
                  </div>
                </div>

              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => onOpenGame('world_card_battle')}
                className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:brightness-125 text-white font-mono text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current text-yellow-300" /> THAM GIA ĐẤU TRƯỜNG THẺ BÀI THẾ GIỚI NGAY
              </button>
            </div>
          </div>

      </div>
    </div>
  );
}
