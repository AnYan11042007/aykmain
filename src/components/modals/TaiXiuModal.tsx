/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { get, ref, update, push } from 'firebase/database';
import { db } from '../../firebase';
import { Sparkles, X, Tv, HelpCircle, Eye, RefreshCw, CheckCircle2, RotateCcw } from 'lucide-react';
import { User } from '../../types';
import { incrementMissionProgress } from '../../utils/missions';

declare let confetti: any;

interface TaiXiuModalProps {
  uid: string;
  user: User | null;
  onClose: () => void;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

interface HistoryItem {
  id: string;
  dices: number[];
  sum: number;
  isTai: boolean;
  isTriple: boolean;
}

export default function TaiXiuModal({ uid, user, onClose, onShowResult }: TaiXiuModalProps) {
  // Bet selection & chip values
  const [selectedChip, setSelectedChip] = useState<number>(50000); // Default 50k chip
  const [activeBets, setActiveBets] = useState<{ [key: string]: number }>({});
  const [lastBets, setLastBets] = useState<{ [key: string]: number }>({});
  
  // Game state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [dices, setDices] = useState<number[]>([3, 4, 5]);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [isPipMode, setIsPipMode] = useState<boolean>(false);

  // Drag Nặn Bát offset
  const [cupOffset, setCupOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // History tracking
  const [history, setHistory] = useState<HistoryItem[]>([
    { id: '1', dices: [4, 5, 5], sum: 14, isTai: true, isTriple: false },
    { id: '2', dices: [2, 3, 3], sum: 8, isTai: false, isTriple: false },
    { id: '3', dices: [5, 5, 6], sum: 16, isTai: true, isTriple: false },
    { id: '4', dices: [1, 2, 3], sum: 6, isTai: false, isTriple: false },
    { id: '5', dices: [6, 6, 4], sum: 16, isTai: true, isTriple: false },
    { id: '6', dices: [2, 2, 2], sum: 6, isTai: false, isTriple: true },
    { id: '7', dices: [3, 4, 6], sum: 13, isTai: true, isTriple: false },
    { id: '8', dices: [1, 1, 4], sum: 6, isTai: false, isTriple: false },
    { id: '9', dices: [5, 6, 6], sum: 17, isTai: true, isTriple: false },
    { id: '10', dices: [2, 3, 4], sum: 9, isTai: false, isTriple: false },
    { id: '11', dices: [4, 4, 5], sum: 13, isTai: true, isTriple: false },
    { id: '12', dices: [1, 2, 2], sum: 5, isTai: false, isTriple: false },
  ]);

  const chipOptions = [
    { label: '10k', value: 10000, bg: 'from-amber-600 to-yellow-400 border-amber-300 text-yellow-950' },
    { label: '50k', value: 50000, bg: 'from-slate-400 to-slate-100 border-slate-200 text-slate-900' },
    { label: '100k', value: 100000, bg: 'from-amber-700 to-yellow-500 border-yellow-300 text-amber-950' },
    { label: '500k', value: 500000, bg: 'from-orange-700 to-amber-600 border-orange-300 text-orange-950' },
    { label: '1M', value: 1000000, bg: 'from-[#854d0e] via-[#fef08a] to-[#713f12] border-yellow-200 text-black font-black' },
  ];

  // Total bet amount placed across all bet keys
  const totalBetAmount: number = (Object.values(activeBets) as number[]).reduce((acc: number, curr: number) => acc + curr, 0);

  // Add chip to a specific bet area
  const handlePlaceBet = (betKey: string) => {
    if (isPlaying && !isShaking) return;
    setActiveBets((prev) => ({
      ...prev,
      [betKey]: (prev[betKey] || 0) + selectedChip,
    }));
  };

  // Cancel all current bets
  const handleCancelBets = () => {
    if (isPlaying) return;
    setActiveBets({});
  };

  // Re-bet last bets
  const handleRebet = () => {
    if (isPlaying) return;
    if (Object.keys(lastBets).length > 0) {
      setActiveBets(lastBets);
    }
  };

  // Start shaking & rolling dice
  const handleStartGame = async () => {
    if (totalBetAmount <= 0) {
      alert('Vui lòng chọn chip cược và nhấp vào khu vực cược trước khi bắt đầu!');
      return;
    }

    const currentPP = user?.pp || 0;
    if (currentPP < totalBetAmount) {
      alert(`Tài khoản không đủ PP! Số dư hiện tại: ${currentPP.toLocaleString()} PP.`);
      return;
    }

    setIsPlaying(true);
    setIsShaking(true);
    setIsRevealed(false);
    setCupOffset({ x: 0, y: 0 });
    setLastBets(activeBets);

    try {
      // Deduct PP immediately
      (window as any).__s88_last_legit_tx = Date.now();
      await update(ref(db, `users/${uid}`), { pp: currentPP - totalBetAmount });

      // Save deduction ledger
      await push(ref(db, 'transactions'), {
        sender: uid,
        senderName: user?.name || 'Sinh Viên',
        receiver: 'SYSTEM_TAIXIU',
        receiverName: 'Tài Xỉu S88 ELITE',
        amount: totalBetAmount,
        message: `Cược Tài Xỉu ELITE (${Object.keys(activeBets).join(', ')})`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      // Pre-calculate final dice
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      setDices([d1, d2, d3]);

      // 1.8s Shaking animation
      setTimeout(() => {
        setIsShaking(false);
      }, 1800);
    } catch (err) {
      setIsPlaying(false);
      setIsShaking(false);
      onShowResult(
        'LỖI GIAO DỊCH / BET FAILURE',
        'Giao dịch cược bị gián đoạn. Vui lòng kiểm tra kết nối mạng!',
        false
      );
    }
  };

  // Reveal dice & evaluate win/loss payouts
  const handleReveal = async () => {
    if (isRevealed || isShaking || !isPlaying) return;
    setIsRevealed(true);

    const sum = dices[0] + dices[1] + dices[2];
    const isTai = sum >= 11;
    const isTriple = dices[0] === dices[1] && dices[1] === dices[2];

    let totalPayout = 0;

    // Evaluate each active bet spot
    Object.entries(activeBets).forEach(([betKey, val]) => {
      const amt = Number(val);
      if (amt <= 0) return;

      // 1. Main TÀI / XỈU bets
      if (betKey === 'TAI' && isTai && !isTriple) {
        totalPayout += Math.floor(amt * 1.95);
      } else if (betKey === 'XIU' && !isTai && !isTriple) {
        totalPayout += Math.floor(amt * 1.95);
      }

      // 2. Total Sum bets (TOTAL_4, TOTAL_5, ..., TOTAL_17)
      if (betKey === `TOTAL_${sum}`) {
        if ([4, 5, 6, 7, 14, 15, 16, 17].includes(sum)) {
          totalPayout += amt * 50;
        } else if ([8, 10, 11, 12, 13].includes(sum)) {
          totalPayout += amt * 6;
        }
      }

      // 3. Double bets (DOI_1, DOI_2, etc.)
      const counts: { [num: number]: number } = {};
      dices.forEach((d) => { counts[d] = (counts[d] || 0) + 1; });
      Object.entries(counts).forEach(([numStr, cnt]) => {
        const num = parseInt(numStr);
        if (cnt >= 2) {
          if (betKey === `DOI_${num}`) {
            const odds = num === 2 ? 30 : [1, 6, 7].includes(num) ? 25 : 20;
            totalPayout += amt * odds;
          }
        }
      });

      // 4. Triple bets (BAO_ANY, BAO_1, BAO_6, BAO_SPECIFIC)
      if (isTriple) {
        if (betKey === 'BAO_ANY') {
          totalPayout += amt * 30;
        } else if (betKey === `BAO_${dices[0]}` || betKey === 'BAO_SPECIFIC') {
          totalPayout += amt * 150;
        }
      }
    });

    const isWin = totalPayout > 0;
    const netPnl = totalPayout - totalBetAmount;

    // Append to history roadmap
    setHistory((prev) => [
      { id: Date.now().toString(), dices, sum, isTai, isTriple },
      ...prev.slice(0, 49),
    ]);

    try {
      if (totalPayout > 0) {
        (window as any).__s88_last_legit_tx = Date.now();
        const uSnap = await get(ref(db, `users/${uid}`));
        const freshPP = uSnap.val()?.pp || 0;
        await update(ref(db, `users/${uid}`), { pp: freshPP + totalPayout });

        await push(ref(db, 'transactions'), {
          sender: 'SYSTEM_TAIXIU',
          senderName: 'Tài Xỉu S88 ELITE',
          receiver: uid,
          receiverName: user?.name || 'Sinh Viên',
          amount: totalPayout,
          message: `Thắng Tài Xỉu ELITE: Kết quả ${dices.join('-')} (${sum}đ - ${isTai ? 'TÀI' : 'XỈU'})`,
          time: new Date().toLocaleString('vi-VN'),
          timestamp: Date.now()
        });

        // Update daily missions progress
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const mRef = ref(db, `users/${uid}/daily_missions/${todayStr}`);
        const mSnap = await get(mRef);
        const currentWins = mSnap.val()?.taiXiuWins || 0;
        await update(mRef, { taiXiuWins: currentWins + 1 });
        await incrementMissionProgress(uid, 'taixiu_wins');

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      await push(ref(db, 'game_logs'), {
        uid,
        name: user?.name || 'Sinh Viên',
        game: 'Tài Xỉu ELITE',
        bet: totalBetAmount,
        pnl: netPnl,
        result: isTriple ? 'Bão Tam Bảo' : isWin ? 'Thắng' : 'Thua',
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      setTimeout(() => {
        setIsPlaying(false);
        setActiveBets({});
        if (isWin) {
          onShowResult(
            '🎰 CHIẾN THẮNG LỚN! 🎰',
            `Kết quả: ${dices.join(' - ')} (Tổng ${sum}đ - ${isTai ? 'TÀI' : 'XỈU'})\nChúc mừng bạn nhận về +${totalPayout.toLocaleString()} PP!`,
            true
          );
        } else {
          onShowResult(
            'KẾT QUẢ TÀI XỈU',
            `Kết quả: ${dices.join(' - ')} (Tổng ${sum}đ - ${isTai ? 'TÀI' : 'XỈU'})\nRất tiếc, bạn chưa gặp may mắn lần này!`,
            false
          );
        }
      }, 1500);
    } catch (err) {
      setIsPlaying(false);
    }
  };

  // Draggable cup logic
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isRevealed || isShaking || !isPlaying) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - cupOffset.x, y: clientY - cupOffset.y });
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;
    setCupOffset({ x: newX, y: newY });

    if (Math.abs(newX) > 90 || Math.abs(newY) > 90) {
      setIsDragging(false);
      handleReveal();
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (!isRevealed) {
      setCupOffset({ x: 0, y: 0 });
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[6000] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onMouseMove={handleDragMove} 
      onMouseUp={handleDragEnd} 
      onTouchMove={handleDragMove} 
      onTouchEnd={handleDragEnd}
    >
      <div className={`relative w-full ${isPipMode ? 'max-w-[420px]' : 'max-w-[960px]'} bg-gradient-to-b from-[#1a1c1e] via-[#0f1115] to-[#07080a] border-2 border-[#d4af37]/60 rounded-2xl shadow-[0_0_50px_rgba(212,175,55,0.25)] flex flex-col justify-between overflow-hidden transition-all duration-300`}>
        
        {/* ================= HEADER BAR ================= */}
        <div className="bg-gradient-to-r from-black via-slate-900 to-black px-3 py-2 border-b border-amber-500/30 flex items-center justify-between text-xs font-mono select-none">
          <div className="flex items-center gap-2">
            {/* Live Stream Badge */}
            <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5 shadow-[0_0_10px_rgba(220,38,38,0.8)] uppercase">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              LIVE STREAM S88
            </span>

            {/* Viewers counter */}
            <span className="bg-black/60 text-slate-300 border border-white/10 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
              <Eye className="w-3 h-3 text-cyan-400" /> 188 người xem
            </span>

            {/* Rules Button */}
            <button 
              onClick={() => setShowRules(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 cursor-pointer transition shadow"
            >
              <HelpCircle className="w-3 h-3" /> LUẬT CHƠI
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsPipMode(!isPipMode)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer"
            >
              <Tv className="w-3 h-3 text-yellow-400" /> {isPipMode ? 'MỞ RỘNG' : 'CHẾ ĐỘ PIP'}
            </button>
            <span className="text-emerald-400 text-[10px] font-bold border border-emerald-500/30 px-1.5 py-0.5 rounded bg-emerald-950/40 hidden sm:inline">
              1080p HD
            </span>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rules Modal Overlay */}
        {showRules && (
          <div className="absolute inset-0 z-50 bg-black/95 p-6 flex flex-col justify-between font-mono text-xs text-slate-200">
            <div>
              <h3 className="text-amber-400 text-base font-black uppercase mb-3 flex items-center gap-2 border-b border-amber-500/30 pb-2">
                📜 LUẬT CHƠI TÀI XỈU S88 ELITE
              </h3>
              <ul className="space-y-2 list-disc list-inside text-slate-300 leading-relaxed text-[11px]">
                <li><b className="text-yellow-300">TÀI (11-17):</b> Thắng gấp x1.95 tiền cược. Thua nếu ra 3 con giống nhau (Bão).</li>
                <li><b className="text-cyan-300">XỈU (4-10):</b> Thắng gấp x1.95 tiền cược. Thua nếu ra 3 con giống nhau (Bão).</li>
                <li><b className="text-emerald-300">CƯỢC TỔNG (4-17):</b> Đoán chính xác tổng nút của 3 xúc xắc (Ăn từ 1:6 tới 1:50).</li>
                <li><b className="text-purple-300">CƯỢC ĐÔI:</b> Xuất hiện cặp đôi chỉ định (Ăn từ 1:20 tới 1:30).</li>
                <li><b className="text-rose-300">CƯỢC BA (BÃ<u>O</u>):</b> Cả 3 xúc xắc ra mặt giống nhau (Thắng đậm x30 tới x150 lần).</li>
              </ul>
            </div>
            <button 
              onClick={() => setShowRules(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase rounded-xl transition cursor-pointer"
            >
              ĐÃ HIỂU LUẬT
            </button>
          </div>
        )}

        {/* ================= MAIN ARENA AREA ================= */}
        <div className="p-3 sm:p-5 space-y-4 relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-black to-black">
          
          {/* CENTERPIECE: BÁT VÀNG S88 ELITE */}
          <div className="relative flex flex-col items-center justify-center my-1 select-none">
            
            {/* Luxurious Casino Table Backdrop */}
            <div className="relative w-64 sm:w-80 h-44 sm:h-52 flex items-center justify-center">
              
              {/* Outer Golden Pedestal Base with Glowing Green LED Ring */}
              <div className="absolute bottom-0 w-60 sm:w-72 h-20 sm:h-24 rounded-full bg-gradient-to-b from-[#2b1e16] via-[#1a110a] to-[#0a0603] border-2 border-amber-600/80 shadow-[0_10px_30px_rgba(0,0,0,0.9)] flex items-center justify-center">
                
                {/* Glowing Green LED Ring */}
                <div className="w-[92%] h-[75%] rounded-full border-2 border-emerald-400 shadow-[0_0_20px_#10b981,_inset_0_0_15px_#10b981] bg-[#0c2e17] flex items-center justify-center overflow-hidden relative">
                  
                  {/* Brass Nameplate */}
                  <div className="absolute bottom-1 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 border border-yellow-200 text-black font-black text-[10px] px-3 py-0.5 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.8)] tracking-widest uppercase z-10">
                    S88 ELITE
                  </div>

                  {/* Felt table surface inside ring */}
                  <div className="w-[88%] h-[80%] rounded-full bg-gradient-to-b from-[#155322] to-[#0a2c11] border border-black/40 flex items-center justify-center relative">
                    
                    {/* Render 3 Wooden Dice when shaking or playing */}
                    <div className="flex items-center gap-2 sm:gap-3 z-10">
                      {dices.map((val, idx) => (
                        <div 
                          key={idx}
                          className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#8b5a2b] via-[#5c3a1a] to-[#3a220e] border-2 border-[#d4af37] rounded-lg shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),_0_6px_12px_rgba(0,0,0,0.8)] flex items-center justify-center font-mono font-black text-white text-base sm:text-lg select-none"
                          style={{ transform: `rotate(${idx * 12 - 12}deg)` }}
                        >
                          {val === 1 && <span className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_5px_#ef4444]" />}
                          {val === 2 && <div className="flex gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full"/><span className="w-1.5 h-1.5 bg-white rounded-full"/></div>}
                          {val === 3 && <div className="flex flex-col gap-0.5"><span className="w-1.5 h-1.5 bg-white rounded-full"/><span className="w-1.5 h-1.5 bg-white rounded-full"/><span className="w-1.5 h-1.5 bg-white rounded-full"/></div>}
                          {val === 4 && <div className="grid grid-cols-2 gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"/><span className="w-1.5 h-1.5 bg-red-500 rounded-full"/><span className="w-1.5 h-1.5 bg-red-500 rounded-full"/><span className="w-1.5 h-1.5 bg-red-500 rounded-full"/></div>}
                          {val === 5 && <span className="text-white text-xs font-black">5</span>}
                          {val === 6 && <span className="text-yellow-300 text-xs font-black">6</span>}
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              </div>

              {/* BÁT VÀNG DOME (Cover) */}
              {(!isPlaying || !isRevealed) && (
                <div 
                  onMouseDown={handleDragStart}
                  onTouchStart={handleDragStart}
                  style={{
                    transform: `translate(${cupOffset.x}px, ${cupOffset.y}px)`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                  className={`absolute top-0 w-48 sm:w-56 h-36 sm:h-44 rounded-t-full bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-700 border-4 border-yellow-200 shadow-[0_15px_35px_rgba(0,0,0,0.9),_inset_0_4px_15px_rgba(255,255,255,0.8)] z-30 flex flex-col items-center justify-start pt-2 ${
                    isShaking ? 'animate-bounce' : ''
                  }`}
                >
                  {/* Top Golden Knob Handle */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-600 border border-yellow-100 shadow-[0_3px_8px_rgba(0,0,0,0.6)] -mt-4" />

                  {/* Dragon & Phoenix Engravings Art Overlay */}
                  <div className="w-[88%] h-[70%] border border-amber-200/50 rounded-t-full mt-2 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-amber-500/20 to-amber-900/40">
                    {/* Dragon-Phoenix Embossed SVG Motifs */}
                    <svg className="w-32 sm:w-40 h-20 text-yellow-200/60 opacity-80" viewBox="0 0 100 50" fill="currentColor">
                      <path d="M10,25 Q25,5 40,25 T70,25 Q85,45 90,25 M15,20 Q30,35 45,20 T75,20" stroke="currentColor" strokeWidth="2" fill="none" />
                      <circle cx="50" cy="25" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M46,25 L54,25 M50,21 L50,29" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span className="text-[9px] font-mono font-black text-yellow-100 uppercase tracking-widest drop-shadow">
                      {isShaking ? 'ĐANG LẮC BÁT...' : 'BÁT VÀNG S88'}
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Hint message under dome */}
            {isPlaying && !isShaking && !isRevealed && (
              <div className="mt-2 text-cyan-300 text-[11px] font-mono font-bold animate-pulse">
                👇 KÉO DI CHUYỂN BÁT VÀNG ĐỂ NẶN KẾT QUẢ!
              </div>
            )}
          </div>

          {/* ================= BETTING TABLE (BÀN CƯỢC TRỰC QUAN) ================= */}
          <div className="border-2 border-amber-500/60 rounded-xl p-2 sm:p-3 bg-gradient-to-b from-[#0b2413] via-[#081a0e] to-[#040e07] shadow-2xl relative select-none">
            
            {/* Top Main Bets: XỈU vs TÀI */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              
              {/* XỈU Box (Left) */}
              <button
                type="button"
                onClick={() => handlePlaceBet('XIU')}
                className={`col-span-5 p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden ${
                  activeBets['XIU']
                    ? 'border-yellow-400 bg-gradient-to-b from-[#0e4d25] to-[#052611] shadow-[0_0_20px_rgba(34,197,94,0.6)] ring-2 ring-yellow-300'
                    : 'border-emerald-600/70 bg-gradient-to-b from-[#0c391c] via-[#072411] to-[#031308] hover:border-emerald-400'
                }`}
              >
                <span className="text-amber-300 font-black text-xl sm:text-3xl tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  XỈU
                </span>
                <span className="text-slate-200 font-mono text-xs sm:text-sm font-bold mt-0.5">
                  (4-10)
                </span>
                <span className="text-emerald-400 font-mono text-[10px] font-bold mt-1">
                  Tỷ lệ 1:1.95
                </span>

                {/* Placed Bet Chip Badge */}
                {activeBets['XIU'] && (
                  <div className="absolute top-1 right-1 bg-yellow-400 text-black font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-yellow-100 animate-bounce">
                    {(activeBets['XIU']/1000).toLocaleString()}k
                  </div>
                )}
              </button>

              {/* Center Dice Info Box */}
              <div className="col-span-2 border border-amber-500/40 rounded-lg bg-black/60 p-1 flex flex-col items-center justify-center text-center font-mono">
                <span className="text-amber-400 text-[9px] font-black uppercase">
                  XÚC XẮC
                </span>
                <div className="flex gap-1 my-1">
                  {dices.map((d, i) => (
                    <span key={i} className="text-xs font-black bg-amber-950/80 text-yellow-300 border border-amber-500/50 px-1 rounded">
                      {d}
                    </span>
                  ))}
                </div>
                <span className="text-cyan-300 text-[9px] font-bold">
                  Tổng {dices[0] + dices[1] + dices[2]}
                </span>
              </div>

              {/* TÀI Box (Right) */}
              <button
                type="button"
                onClick={() => handlePlaceBet('TAI')}
                className={`col-span-5 p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden ${
                  activeBets['TAI']
                    ? 'border-yellow-400 bg-gradient-to-b from-[#6b1111] to-[#300606] shadow-[0_0_20px_rgba(239,68,68,0.6)] ring-2 ring-yellow-300'
                    : 'border-rose-700/70 bg-gradient-to-b from-[#4a0d0d] via-[#2d0707] to-[#170303] hover:border-rose-400'
                }`}
              >
                <span className="text-amber-300 font-black text-xl sm:text-3xl tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  TÀI
                </span>
                <span className="text-slate-200 font-mono text-xs sm:text-sm font-bold mt-0.5">
                  (11-17)
                </span>
                <span className="text-rose-400 font-mono text-[10px] font-bold mt-1">
                  Tỷ lệ 1:1.95
                </span>

                {/* Placed Bet Chip Badge */}
                {activeBets['TAI'] && (
                  <div className="absolute top-1 right-1 bg-yellow-400 text-black font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-yellow-100 animate-bounce">
                    {(activeBets['TAI']/1000).toLocaleString()}k
                  </div>
                )}
              </button>

            </div>

            {/* Row 1: CƯỢC TỔNG (Total Score 4 to 17) */}
            <div className="border-t border-amber-500/40 pt-2 mt-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                <div className="bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono font-black text-[9px] px-2 py-2 rounded shrink-0 uppercase text-center leading-tight">
                  Tổng Điểm<br/>4 - 17
                </div>

                {[4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17].map((num) => {
                  const odds = [4, 5, 6, 7, 14, 15, 16, 17].includes(num) ? '1:50' : '1:6';
                  const key = `TOTAL_${num}`;
                  const isPlaced = !!activeBets[key];

                  return (
                    <button
                      key={num}
                      onClick={() => handlePlaceBet(key)}
                      className={`flex-1 min-w-[42px] p-1 rounded border text-center font-mono cursor-pointer transition relative ${
                        isPlaced
                          ? 'border-yellow-400 bg-amber-500/30 text-yellow-300 font-black shadow-[0_0_10px_rgba(250,204,21,0.5)]'
                          : 'border-amber-500/30 bg-black/40 text-slate-300 hover:border-amber-400 hover:bg-amber-950/30'
                      }`}
                    >
                      <div className="text-xs font-black text-amber-300">{num}</div>
                      <div className="text-[8px] text-slate-400 font-bold">Tổng {num}</div>
                      <div className="text-[7.5px] text-yellow-400 font-bold">({odds})</div>
                      {isPlaced && (
                        <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[7px] font-black px-1 rounded-full">
                          {(activeBets[key]!/1000)}k
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: CƯỢC ĐÔI */}
            <div className="border-t border-amber-500/30 pt-2 mt-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                <div className="bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono font-black text-[9px] px-2 py-2 rounded shrink-0 uppercase text-center">
                  Cược Đôi
                </div>

                {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                  const odds = num === 2 ? '1:30' : [1, 6, 7].includes(num) ? '1:25' : '1:20';
                  const key = `DOI_${num}`;
                  const isPlaced = !!activeBets[key];

                  return (
                    <button
                      key={num}
                      onClick={() => handlePlaceBet(key)}
                      className={`flex-1 min-w-[55px] p-1 rounded border text-center font-mono cursor-pointer transition relative ${
                        isPlaced
                          ? 'border-yellow-400 bg-amber-500/30 text-yellow-300 font-black'
                          : 'border-amber-500/30 bg-black/40 text-slate-300 hover:border-amber-400'
                      }`}
                    >
                      <div className="text-[10px] font-black text-amber-300">Đôi {num}</div>
                      <div className="text-[8px] text-yellow-400 font-bold">{odds}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: CƯỢC BA (BÃ<u>O</u>) */}
            <div className="border-t border-amber-500/30 pt-2 mt-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                <div className="bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono font-black text-[9px] px-2 py-2 rounded shrink-0 uppercase text-center">
                  Cược Ba
                </div>

                {[
                  { label: 'Ba Bất Kỳ', odds: '1:30', key: 'BAO_ANY' },
                  { label: 'Ba Cụ Thể (1-1-1)', odds: '1:150', key: 'BAO_1' },
                  { label: 'Ba Cụ Thể (2-2-2)', odds: '1:150', key: 'BAO_2' },
                  { label: 'Ba Cụ Thể (3-3-3)', odds: '1:150', key: 'BAO_3' },
                  { label: 'Ba Cụ Thể (4-4-4)', odds: '1:150', key: 'BAO_4' },
                  { label: 'Ba Cụ Thể (5-5-5)', odds: '1:150', key: 'BAO_5' },
                  { label: 'Ba Cụ Thể (6-6-6)', odds: '1:150', key: 'BAO_6' },
                ].map((item, idx) => {
                  const isPlaced = !!activeBets[item.key];
                  return (
                    <button
                      key={idx}
                      onClick={() => handlePlaceBet(item.key)}
                      className={`flex-1 min-w-[70px] p-1 rounded border text-center font-mono cursor-pointer transition relative ${
                        isPlaced
                          ? 'border-yellow-400 bg-amber-500/30 text-yellow-300 font-black'
                          : 'border-amber-500/30 bg-black/40 text-slate-300 hover:border-amber-400'
                      }`}
                    >
                      <div className="text-[9px] font-bold text-amber-200">{item.label}</div>
                      <div className="text-[8px] text-yellow-400 font-black">{item.odds}</div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ================= CONTROLS & CHIPS SYSTEM ================= */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border-t border-amber-500/30 pt-3 select-none">
            
            {/* Chip Stacks Selector (Bottom Left) */}
            <div className="md:col-span-6 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-mono text-amber-400 font-bold shrink-0 uppercase mr-1">
                CHÍP CƯỢC:
              </span>
              {chipOptions.map((chip) => {
                const isSelected = selectedChip === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setSelectedChip(chip.value)}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 bg-gradient-to-b ${chip.bg} shadow-lg flex items-center justify-center font-mono font-black text-[10px] cursor-pointer transition transform hover:scale-110 shrink-0 ${
                      isSelected
                        ? 'ring-4 ring-yellow-300 scale-110 shadow-[0_0_15px_rgba(250,204,21,0.8)] z-10'
                        : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Action Buttons (Middle) */}
            <div className="md:col-span-6 flex items-center gap-2 justify-end">
              
              {/* Confirm Bet */}
              <button
                onClick={handleStartGame}
                disabled={isPlaying || totalBetAmount <= 0}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.4)] transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Xác Nhận Cược ({totalBetAmount > 0 ? (totalBetAmount/1000).toLocaleString() + 'k' : '0'})
              </button>

              {/* Cancel Bets */}
              <button
                onClick={handleCancelBets}
                disabled={isPlaying || totalBetAmount <= 0}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl border border-slate-600/60 transition cursor-pointer disabled:opacity-50"
              >
                Hủy Cược
              </button>

              {/* Re-bet */}
              <button
                onClick={handleRebet}
                disabled={isPlaying}
                className="px-3 py-2.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 font-bold text-xs uppercase rounded-xl border border-amber-500/40 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Cược Lại
              </button>

            </div>

          </div>

          {/* ================= HISTORY ROADMAP (LỊCH SỬ KẾT QUẢ) ================= */}
          <div className="border border-amber-500/30 rounded-xl p-2.5 bg-black/80 font-mono select-none">
            <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold mb-2">
              <span className="flex items-center gap-1">
                📊 LỊCH SỬ KẾT QUẢ (Roadmap)
              </span>
              <span className="text-slate-400">Last 100 tay</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {history.map((item) => (
                <div 
                  key={item.id}
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 border shadow-sm ${
                    item.isTai
                      ? 'bg-red-600 text-white border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                      : 'bg-blue-600 text-white border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                  }`}
                  title={`Dices: ${item.dices.join('-')} | Sum: ${item.sum}`}
                >
                  {item.isTai ? 'T' : 'X'}
                </div>
              ))}
            </div>
          </div>

          {/* ADMIN OVERRIDE PANEL */}
          {((user?.role as any) === 'ADMIN' || (user?.role as any) === 'TEACHER') && (
            <div className="border-t border-red-500/20 pt-2 space-y-1 font-mono text-left">
              <span className="text-red-400 text-[9px] font-black uppercase tracking-wider">
                ⚙️ ADMIN MANUAL OVERRIDE
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((idx) => (
                  <select
                    key={idx}
                    className="w-full bg-black border border-red-500/30 text-red-400 rounded px-1 py-0.5 font-bold text-[10px] outline-none"
                    value={dices[idx] || 1}
                    onChange={(e) => {
                      const newDices = [...dices];
                      newDices[idx] = parseInt(e.target.value);
                      setDices(newDices);
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6].map((v) => (
                      <option key={v} value={v}> Mặt {v} </option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
