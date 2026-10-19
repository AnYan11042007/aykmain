/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Swords, Play, Trophy, Users, Shield, Sparkles, Layers, Zap, Flame } from 'lucide-react';
import { User } from '../types';

interface GamesPortalProps {
  uid: string;
  user: User | null;
  onOpenGame: (gameKey: string) => void;
  onJoinRps?: (roomId: string) => void;
  onJoinBj?: (roomId: string) => void;
  onJoinTl?: (roomId: string) => void;
  onShowResult?: (title: string, message: string, isWin: boolean) => void;
}

export default function GamesPortal({ uid, user, onOpenGame }: GamesPortalProps) {
  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* PREMIUM CYBER GAMING WEB BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_35px_rgba(168,85,247,0.15)]">
        
        {/* Ambient floating glowing dust particles */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-500/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
        
        {/* Decorative cyber grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />

        {/* Banner Content (Left side) */}
        <div className="relative z-10 space-y-3 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/50 text-[10px] text-purple-300 font-mono uppercase font-black tracking-wider shadow-[0_0_10px_rgba(168,85,247,0.3)]">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" /> CỔNG GAME GIẢI TRÍ ĐỘC QUYỀN AYK
          </div>
          
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black font-sans text-white tracking-wide uppercase leading-tight">
              ĐẤU TRƯỜNG <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-300 text-glow-purple">THẺ BÀI 1VS1</span>
            </h2>
            <p className="text-xs text-purple-200/80 font-medium font-sans">
              Đấu trí thẻ ma thuật thời gian thực Công - Thủ - Kỹ Năng, so tài xếp hạng đỉnh cao và xưng vương S-System!
            </p>
          </div>

          {/* Quick info badges */}
          <div className="flex flex-wrap justify-center md:justify-start gap-2.5 pt-1 text-[10px] font-mono text-purple-300">
            <span className="bg-slate-900/80 border border-purple-500/30 py-1 px-2.5 rounded-md flex items-center gap-1.5 font-bold">
              🃏 <span className="text-yellow-300">100+ Thẻ Bài Ma Thuật</span>
            </span>
            <span className="bg-slate-900/80 border border-purple-500/30 py-1 px-2.5 rounded-md flex items-center gap-1.5 font-bold">
              ⚔️ <span className="text-cyan-300">PVP 1v1 Realtime & AI</span>
            </span>
            <span className="bg-slate-900/80 border border-purple-500/30 py-1 px-2.5 rounded-md flex items-center gap-1.5 font-bold">
              💰 <span className="text-emerald-400">Cược PP Tranh Đỉnh</span>
            </span>
          </div>
        </div>

        {/* Golden Holographic Bank Vault Block (Right side) */}
        <div className="relative z-10 shrink-0 w-full md:w-auto">
          <div className="bg-black/70 border border-amber-500/30 p-5 rounded-2xl flex flex-col items-center md:items-end gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.05)] relative overflow-hidden group">
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
              Mã ví bảo mật: AYK-CORE-SECURE
            </span>
          </div>
        </div>
      </div>

      {/* EXCLUSIVE FEATURED: WORLD CARD BATTLE 1V1 ARENA */}
      <div className="w-full space-y-6">
        <div className="relative overflow-hidden rounded-2xl border-2 border-purple-500/60 bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950 p-6 sm:p-8 shadow-[0_0_45px_rgba(168,85,247,0.4)] space-y-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-5 relative z-10 border-b border-purple-500/20 pb-6">
            <div className="space-y-2.5 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/50 text-xs text-purple-300 font-mono font-black uppercase tracking-wider">
                ⚔️ CỔNG GAME CHÍNH THỨC: 1V1 REAL-TIME CARD BATTLE
              </div>
              <h3 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-wider flex items-center justify-center md:justify-start gap-3">
                <span>🃏 ĐẤU THẺ THẾ GIỚI 1V1</span>
                <span className="text-xs bg-red-600 text-white font-mono px-3 py-1 rounded-full animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.6)]">ARENA LIVE</span>
              </h3>
              <p className="text-xs sm:text-sm text-purple-200/90 max-w-2xl leading-relaxed font-sans">
                Giao tranh thẻ bài Công / Thủ / Đặc biệt đỉnh cao thời gian thực. Tạo phòng thách đấu 1v1, cược PP, thi triển tuyệt kỹ thẻ bài và xưng vương Đấu Trường Hoàng Gia!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0 relative z-10 w-full md:w-auto">
              <button
                onClick={() => onOpenGame('world_card_battle')}
                className="w-full sm:w-auto min-h-[50px] px-8 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-black text-xs sm:text-sm uppercase tracking-widest rounded-2xl transition-all cursor-pointer shadow-[0_0_30px_rgba(168,85,247,0.7)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5"
              >
                <Swords className="w-5 h-5 animate-bounce text-yellow-300" />
                <span>TẠO PHÒNG / THÁCH ĐẤU 1V1</span>
              </button>
            </div>
          </div>

          {/* FEATURED CARDS COLLECTION SHOWCASE */}
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-mono font-black text-purple-300 uppercase tracking-widest flex items-center gap-2">
                <span>🔥 BỘ THẺ BÀI HUYỀN THOẠI TRONG ĐẤU TRƯỜNG</span>
                <span className="text-[10px] text-purple-400/70 font-normal">(Tiêu biểu trong 100+ thẻ)</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* 1. Khiên Phòng Thủ Card */}
              <div className="glass-box p-4 border border-cyan-500/40 bg-gradient-to-b from-cyan-950/40 via-purple-950/20 to-black space-y-2.5 hover:border-cyan-400 transition-all group rounded-xl">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-mono font-black bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 px-2 py-0.5 rounded uppercase">
                    THẺ PHÒNG THỦ
                  </span>
                  <span className="text-xs font-mono font-black text-cyan-400">DEF: 90</span>
                </div>
                <h5 className="text-white font-black text-sm uppercase tracking-wider group-hover:text-cyan-300 transition-colors">
                  🛡️ Khiên Phòng Thủ
                </h5>
                <div className="p-2.5 bg-black/50 border border-cyan-500/20 rounded-lg text-[10px] font-mono text-cyan-200/90 leading-relaxed">
                  <strong>Kỹ năng [Khiên Năng Lượng]:</strong> Giảm 70% sát thương nhận vào trong 2 lượt tiếp theo & Tăng +70 Giáp phản pháo.
                </div>
              </div>

              {/* 2. Thấy Mà Ghe Card */}
              <div className="glass-box p-4 border border-amber-500/40 bg-gradient-to-b from-amber-950/40 via-purple-950/20 to-black space-y-2.5 hover:border-amber-400 transition-all group rounded-xl">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-mono font-black bg-amber-500/20 border border-amber-400/50 text-amber-300 px-2 py-0.5 rounded uppercase">
                    THẺ ĐẶC BIỆT
                  </span>
                  <span className="text-xs font-mono font-black text-amber-400">DEF: 60</span>
                </div>
                <h5 className="text-white font-black text-sm uppercase tracking-wider group-hover:text-amber-300 transition-colors">
                  🎭 Thấy Mà Ghe
                </h5>
                <div className="p-2.5 bg-black/50 border border-amber-500/20 rounded-lg text-[10px] font-mono text-amber-200/90 leading-relaxed">
                  <strong>Kỹ năng [Lập Trình Hỗn Loạn]:</strong> Đổi vai trò Tấn công & Phòng thủ của TẤT CẢ các thẻ trên bàn đấu trong 2 lượt.
                </div>
              </div>

              {/* 3. Đấm Phát Chết Luôn Card */}
              <div className="glass-box p-4 border border-rose-500/40 bg-gradient-to-b from-rose-950/40 via-purple-950/20 to-black space-y-2.5 hover:border-rose-400 transition-all group rounded-xl">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-mono font-black bg-rose-500/20 border border-rose-400/50 text-rose-300 px-2 py-0.5 rounded uppercase">
                    THẺ TẤN CÔNG
                  </span>
                  <span className="text-xs font-mono font-black text-rose-400">ATK: 120</span>
                </div>
                <h5 className="text-white font-black text-sm uppercase tracking-wider group-hover:text-rose-300 transition-colors">
                  🥊 Đấm Phát Chết Luôn
                </h5>
                <div className="p-2.5 bg-black/50 border border-rose-500/20 rounded-lg text-[10px] font-mono text-rose-200/90 leading-relaxed">
                  <strong>Kỹ năng [Cú Đấm Năng Lượng]:</strong> Bộc phá gây 150 sát thương cực lớn lên đối thủ & Tăng 30% ATK đòn tiếp.
                </div>
              </div>

            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => onOpenGame('world_card_battle')}
              className="w-full min-h-[50px] py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:brightness-125 text-white font-mono text-xs sm:text-sm font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer shadow-[0_0_25px_rgba(168,85,247,0.5)] flex items-center justify-center gap-2.5 active:scale-98"
            >
              <Play className="w-5 h-5 fill-current text-yellow-300" />
              <span>VÀO ĐẤU TRƯỜNG THẺ BÀI THẾ GIỚI 1VS1 NGAY</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
