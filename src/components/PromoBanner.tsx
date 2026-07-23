/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Megaphone, Clock, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Announcement {
  id: string;
  tag: string;
  title: string;
  description: string;
  badgeColor: string;
  linkText: string;
  eventTime: string;
  bgGradient: string;
}

const PROMOTIONS: Announcement[] = [
  {
    id: 'promo_1',
    tag: 'SỰ KIỆN ĐẤU TRƯỜNG',
    title: 'GIẢI ĐẤU S88 ARENA: CON ĐƯỜNG HUYỀN THOẠI',
    description: 'Tham gia so tài sút Penalty, đua ngựa Thần Tốc và chinh phục phi thuyền không chiến để nhận tổng giải thưởng lên đến 500,000 PP!',
    badgeColor: 'border-red-500/40 text-red-400 bg-red-950/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    linkText: 'THAM GIA NGAY',
    eventTime: 'Hạn chót: 24h00 hôm nay',
    bgGradient: 'from-red-500/10 via-slate-950/80 to-slate-950'
  },
  {
    id: 'promo_2',
    tag: 'CẬP NHẬT HỆ THỐNG',
    title: 'AI GIA SƯ S88: KÍCH HOẠT MÔ HÌNH SUY LUẬN MỚI',
    description: 'Hệ thống AI Gia Sư S88 vừa được tích hợp mô hình suy luận sâu sắc thế hệ mới. Đặt câu hỏi học tập ngay để củng cố chỉ số Trí Tuệ của bạn!',
    badgeColor: 'border-cyan-500/40 text-cyan-400 bg-cyan-950/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]',
    linkText: 'HỎI GIA SƯ',
    eventTime: 'Mới cập nhật',
    bgGradient: 'from-cyan-500/10 via-slate-950/80 to-slate-950'
  },
  {
    id: 'promo_3',
    tag: 'TÀI CHÍNH S88',
    title: 'NGÂN HÀNG TRUNG ƯƠNG: KHUYẾN MÃI LÃI SUẤT 15%',
    description: 'Gửi tiết kiệm PP tại S88 Bank ngay hôm nay để được hưởng lãi suất hoàng gia cực hời lên tới 15% mỗi chu kỳ thanh toán tự động.',
    badgeColor: 'border-yellow-500/40 text-yellow-400 bg-yellow-950/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]',
    linkText: 'GỬI TIẾT KIỆM',
    eventTime: 'Thời gian có hạn',
    bgGradient: 'from-yellow-500/10 via-slate-950/80 to-slate-950'
  }
];

export default function PromoBanner() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Auto scroll announcements every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PROMOTIONS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Simple dynamic live countdown
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diff = endOfDay.getTime() - now.getTime();
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const promo = PROMOTIONS[activeIndex];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-slate-950 w-full min-h-[190px] sm:min-h-[220px] shadow-[0_0_30px_rgba(0,240,255,0.06)] flex flex-col justify-between">
      
      {/* Background Starry Image (Optimized & smooth loading) */}
      <div className={`absolute inset-0 transition-all duration-1000 ease-out-expo select-none pointer-events-none ${imageLoaded ? 'opacity-85 scale-100' : 'opacity-0 scale-105'}`}>
        <img
          src="https://cdn-media.sforum.vn/storage/app/media/ctvseo_maihue/hinh-nen-1920-1080/hinh-nen-1920-1080-thumbnail.jpg"
          alt="S88 Hero Banner"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onLoad={() => setImageLoaded(true)}
          loading="eager"
        />
        {/* Cinematic dark gradients on top of image */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/20 to-transparent" />
      </div>

      {/* Placeholder skeleton loader if image not yet ready */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 animate-pulse flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      )}

      {/* Cyber grid pattern wrapper */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px] opacity-40 pointer-events-none" />

      {/* Top section: Interactive event info & Carousel indicators */}
      <div className="relative z-10 p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        
        {/* Indicator pills and current tag */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-mono font-black uppercase tracking-wider transition-all duration-500 ${promo.badgeColor}`}>
              <Sparkles className="w-3 h-3 animate-pulse" /> {promo.tag}
            </span>
            <span className="bg-black/60 border border-white/5 py-1 px-2.5 rounded-full text-[9px] font-mono text-cyan-400 flex items-center gap-1.5 font-bold">
              <Clock className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
              COUNTDOWN: <span className="font-extrabold text-glow-blue">{timeLeft}</span>
            </span>
          </div>

          {/* Bullet navigation indicators */}
          <div className="flex gap-1.5">
            {PROMOTIONS.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 transition-all duration-300 rounded-full cursor-pointer ${
                  activeIndex === idx ? 'w-6 bg-[#00f0ff]' : 'w-1.5 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Carousel slide animation for content */}
        <div className="min-h-[75px] sm:min-h-[90px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-1.5 text-left"
            >
              <h3 className="text-base sm:text-lg font-black font-sans text-white tracking-wide uppercase leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {promo.title}
              </h3>
              <p className="text-xs text-slate-300 font-sans font-medium max-w-3xl leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
                {promo.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom actions strip */}
        <div className="flex items-center justify-between flex-wrap gap-4 pt-1 border-t border-white/5 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Megaphone className="w-3.5 h-3.5 text-yellow-500 animate-bounce" />
            <span>Sự kiện đang phát sóng trực tiếp trên máy chủ S88</span>
          </div>
          
          <button className="inline-flex items-center gap-1 bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase py-2 px-4 rounded-xl text-[9px] tracking-widest cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95">
            {promo.linkText} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
