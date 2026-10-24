/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { get, ref, update, push } from 'firebase/database';
import { db, fetchWithAuth } from '../../firebase';
import { X, Sparkles, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { User } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { incrementMissionProgress } from '../../utils/missions';

interface RouletteModalProps {
  uid: string;
  user: User | null;
  onClose: () => void;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

interface RouletteBet {
  choice: string; // 'RED' | 'BLACK' | 'GREEN' | 'LOW' (1-18) | 'HIGH' (19-36) | 'DOZEN_1' (1-12) | 'DOZEN_2' (13-24) | 'DOZEN_3' (25-36) | 'NUM_X'
  amount: number;
}

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

const HIGH_ROLLERS = [
  'ĐạiGiaQuận1', 'ThầnBàiĐấtCảng', 'CậuCảHảiPhòng', 'CòBayLả',
  'MạnhThườngQuân', 'DũngSĩGồngLãi', 'TùngSơnBóngĐá', 'LuffyXìDách'
];

export default function RouletteModal({ uid, user, onClose, onShowResult }: RouletteModalProps) {
  const [betAmount, setBetAmount] = useState('10000');
  const [selectedSpot, setSelectedSpot] = useState<string>(''); // Currently selected betting spot in UI
  const [currentBets, setCurrentBets] = useState<RouletteBet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [multiplayerBets, setMultiplayerBets] = useState<Array<{ name: string; spot: string; amount: number }>>([]);
  const [gameHistory, setGameHistory] = useState<number[]>([]);
  
  // Admin bypass
  const [adminForceResult, setAdminForceResult] = useState<string>(''); // For admin custom single number or choice

  // Generate live high-roller bets to simulate active, addictive high-stakes multiplayer arena
  useEffect(() => {
    if (isSpinning) return;
    const interval = setInterval(() => {
      if (Math.random() < 0.4) {
        const spots = ['RED', 'BLACK', 'GREEN', 'LOW', 'HIGH', 'DOZEN_1', 'DOZEN_2', 'DOZEN_3', 'NUM_17', 'NUM_8', 'NUM_28'];
        const name = HIGH_ROLLERS[Math.floor(Math.random() * HIGH_ROLLERS.length)];
        const spot = spots[Math.floor(Math.random() * spots.length)];
        const amount = (Math.floor(Math.random() * 10) + 1) * 20000; // Large bets 20K - 200K
        setMultiplayerBets((prev) => [...prev, { name, spot, amount }].slice(-6));
      }
    }, 1800);
    return () => clearInterval(interval);
  }, [isSpinning]);

  const handleSpotClick = (spot: string) => {
    if (isSpinning) return;
    setSelectedSpot(spot);
  };

  const handlePlaceBet = () => {
    if (isSpinning) return;
    const amt = parseInt(betAmount);
    if (!selectedSpot) {
      alert('Vui lòng chọn một ô cược trên bàn Roulette!');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      alert('Số PP cược không hợp lệ!');
      return;
    }

    const currentPP = user?.pp || 0;
    const alreadyBet = currentBets.reduce((sum, b) => sum + b.amount, 0);
    if (currentPP < alreadyBet + amt) {
      alert(`Số dư PP không đủ! Bạn cần thêm ${(alreadyBet + amt - currentPP).toLocaleString()} PP.`);
      return;
    }

    // Add to current bet slip
    setCurrentBets((prev) => {
      const existing = prev.find((b) => b.choice === selectedSpot);
      if (existing) {
        return prev.map((b) => b.choice === selectedSpot ? { ...b, amount: b.amount + amt } : b);
      } else {
        return [...prev, { choice: selectedSpot, amount: amt }];
      }
    });
  };

  const handleClearBets = () => {
    if (isSpinning) return;
    setCurrentBets([]);
  };

  const handleSpinWheel = async () => {
    if (isSpinning) return;
    if (currentBets.length === 0) {
      alert('Vui lòng đặt cược trước khi quay!');
      return;
    }

    const totalStake = currentBets.reduce((sum, b) => sum + b.amount, 0);
    const currentPP = user?.pp || 0;

    if (currentPP < totalStake) {
      alert('Số dư PP không đủ để thực hiện toàn bộ cược!');
      return;
    }

    setIsSpinning(true);
    setWinningNumber(null);

    try {
      const res = await fetchWithAuth('/api/game/roulette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bets: currentBets })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setIsSpinning(false);
        alert(data.error || 'Lỗi khi đặt cược Roulette');
        return;
      }

      const finalNum = data.winningNum;
      const segmentAngle = 360 / 37;
      const finalAngle = 360 * 6 - (finalNum * segmentAngle);
      setWheelRotation(finalAngle);

      setTimeout(() => {
        setIsSpinning(false);
        setWinningNumber(finalNum);
        setGameHistory((prev) => [finalNum, ...prev].slice(0, 8));
        setCurrentBets([]);

        const isGreen = finalNum === 0;
        const isRed = RED_NUMBERS.includes(finalNum);
        const numColorText = isGreen ? 'Xanh Lá' : isRed ? 'Đỏ' : 'Đen';

        setTimeout(() => {
          onClose();
          if (data.won) {
            onShowResult(
              '🎰 ROULETTE - THẮNG LỚN!',
              `Quay trúng ô số: ${finalNum} (${numColorText})!\nChi tiết thắng cược:\n${(data.details || []).join('\n')}\nTổng PP nhận về: +${data.totalPayout.toLocaleString()} PP!`,
              true
            );
          } else {
            onShowResult(
              '💀 ROULETTE - THUẬT LẬP KÈO',
              `Quay trúng ô số: ${finalNum} (${numColorText})!\nRất tiếc, các cửa của bạn không khớp. Bạn mất -${data.totalStake.toLocaleString()} PP cược.`,
              false
            );
          }
        }, 1000);
      }, 6000);
    } catch (err: any) {
      setIsSpinning(false);
      alert('Lỗi kết nối máy chủ khi quay Roulette');
    }
  };

  const getSpotLabel = (spot: string) => {
    if (spot === 'RED') return 'ĐỎ';
    if (spot === 'BLACK') return 'ĐEN';
    if (spot === 'GREEN') return 'SỐ 0 (XANH)';
    if (spot === 'LOW') return 'THẤP (1-18)';
    if (spot === 'HIGH') return 'CAO (19-36)';
    if (spot === 'DOZEN_1') return 'TÁ 1 (1-12)';
    if (spot === 'DOZEN_2') return 'TÁ 2 (13-24)';
    if (spot === 'DOZEN_3') return 'TÁ 3 (25-36)';
    if (spot.startsWith('NUM_')) return `SỐ ${spot.replace('NUM_', '')}`;
    return spot;
  };

  const getNumberColor = (num: number) => {
    if (num === 0) return 'text-[#00ff80]';
    return RED_NUMBERS.includes(num) ? 'text-red-500' : 'text-slate-400';
  };

  const isAdmin = (user?.role as any) === 'ADMIN' || (user?.role as any) === 'TEACHER';

  return (
    <div className="game-overlay bg-black/90 backdrop-blur-md select-none">
      <div className="game-shell bg-[#0b0c10] border-0 md:border-2 md:border-[#ffd700]/30 flex flex-col shadow-[0_0_50px_rgba(255,215,0,0.15)]">
        
        {/* Sticky Header with Title, Balance, and 44px Close Button */}
        <div className="sticky top-0 z-30 shrink-0 flex items-center justify-between px-4 py-3 bg-[#13141a]/95 border-b border-[#ffd700]/30 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">🔴</span>
            <div className="truncate">
              <h2 className="text-[#ffd700] text-base md:text-lg font-black uppercase tracking-wider truncate">
                ĐẤU TRƯỜNG ROULETTE VIP
              </h2>
              <span className="text-[10px] text-emerald-400 font-bold block truncate">
                Số dư: {(user?.pp || 0).toLocaleString()} PP
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSpinning}
            aria-label="Đóng"
            className="game-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content (2 columns on md/lg, single column on mobile) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 flex flex-col md:flex-row gap-6">
          
          {/* LEFT COLUMN: Circular Roulette Wheel Display */}
          <div className="flex flex-col items-center justify-center flex-1 space-y-4">
            <div className="text-center font-sans hidden md:block">
              <span className="text-[10px] tracking-widest text-[#ffd700] uppercase font-black block">🎰 HIGH-ROLLER ARENA</span>
              <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-1.5 justify-center">
                🔴 ĐẤU TRƯỜNG ROULETTE
              </h2>
            </div>

            {/* Styled Roulette Wheel */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-full border-4 border-[#ffd700]/40 flex items-center justify-center bg-radial from-[#1f1e24] to-[#0d0c12] shadow-[0_10px_35px_rgba(0,0,0,0.8)] overflow-hidden shrink-0">
            
            {/* Spinning inner segment */}
            <motion.div
              style={{ rotate: wheelRotation }}
              transition={{ duration: 6, ease: [0.1, 0.8, 0.2, 1] }}
              className="absolute inset-2 rounded-full bg-cover bg-center flex items-center justify-center border-2 border-white/5"
            >
              {/* Complex SVG representation of 37 Roulette Numbers */}
              <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                <circle cx="100" cy="100" r="95" fill="none" stroke="#2c2a35" strokeWidth="8" />
                {Array.from({ length: 37 }).map((_, index) => {
                  const angle = (index * 360) / 37;
                  const rad = (angle * Math.PI) / 180;
                  const textRad = ((angle + 360 / 74) * Math.PI) / 180;
                  const isNumRed = RED_NUMBERS.includes(index);
                  const isNumZero = index === 0;
                  const color = isNumZero ? '#00ff80' : isNumRed ? '#ff003c' : '#111';

                  // Segment path
                  const x1 = 100 + 90 * Math.cos(rad);
                  const y1 = 100 + 90 * Math.sin(rad);
                  const x2 = 100 + 90 * Math.cos(rad + (360 / 37 * Math.PI / 180));
                  const y2 = 100 + 90 * Math.sin(rad + (360 / 37 * Math.PI / 180));

                  return (
                    <g key={index}>
                      <path
                        d={`M100 100 L${x1} ${y1} A90 90 0 0 1 ${x2} ${y2} Z`}
                        fill={color}
                        stroke="#333"
                        strokeWidth="0.5"
                      />
                      <text
                        x={100 + 74 * Math.cos(textRad)}
                        y={100 + 74 * Math.sin(textRad)}
                        fill="#fff"
                        fontSize="6"
                        fontWeight="black"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        transform={`rotate(${angle + 95} ${100 + 74 * Math.cos(textRad)} ${100 + 74 * Math.sin(textRad)})`}
                      >
                        {index}
                      </text>
                    </g>
                  );
                })}
                <circle cx="100" cy="100" r="50" fill="#0d0c12" stroke="#ffd700" strokeWidth="1.5" />
              </svg>
            </motion.div>

            {/* Static Pointer at top of wheel */}
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center">
              <span className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-yellow-400 drop-shadow-md animate-pulse"></span>
            </div>

            {/* Center glowing result circle */}
            <div className="absolute w-20 h-20 rounded-full bg-black/80 border-2 border-[#ffd700] flex flex-col items-center justify-center z-20 shadow-inner">
              {isSpinning ? (
                <div className="flex flex-col items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />
                  <span className="text-[7px] text-white/50 tracking-wider font-mono uppercase mt-1 animate-pulse">SPINNING</span>
                </div>
              ) : winningNumber !== null ? (
                <div className="text-center">
                  <span className={`text-3xl font-black ${getNumberColor(winningNumber)}`}>
                    {winningNumber}
                  </span>
                  <span className="block text-[8px] text-white/60 uppercase font-bold tracking-wider">
                    {winningNumber === 0 ? 'Green' : RED_NUMBERS.includes(winningNumber) ? 'Đỏ' : 'Đen'}
                  </span>
                </div>
              ) : (
                <span className="text-white/20 text-[10px] uppercase font-bold">PLACE BET</span>
              )}
            </div>
          </div>

          {/* History / Recent Rolls */}
          <div className="w-full bg-black/40 border border-white/5 rounded-xl p-3 font-mono text-[10px]">
            <span className="text-[#8b949e] uppercase text-[9px] block mb-1">Lịch sử bàn cược (Mới nhất):</span>
            <div className="flex gap-1.5 justify-center">
              {gameHistory.length === 0 ? (
                <span className="text-white/20 italic">Chưa có kết quả ván đấu nào...</span>
              ) : (
                gameHistory.map((num, idx) => (
                  <span
                    key={idx}
                    className={`w-6 h-6 rounded flex items-center justify-center font-bold border ${
                      num === 0
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400'
                        : RED_NUMBERS.includes(num)
                        ? 'bg-red-950/40 border-red-500 text-red-400'
                        : 'bg-slate-900 border-white/10 text-white'
                    }`}
                  >
                    {num}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Table Layout & Bet slip */}
        <div className="flex flex-col flex-1 space-y-4">
          
          {/* MULTIPLAYER LIVE FEEDS */}
          <div className="bg-black/60 border border-yellow-500/10 rounded-xl p-3 font-mono text-[9px] text-yellow-500/80 space-y-1.5 h-28 overflow-y-auto">
            <div className="flex justify-between text-white/40 border-b border-white/5 pb-1 uppercase font-bold text-[8px] tracking-widest">
              <span>⚡ ĐẤU TRƯỜNG ĐA NGƯỜI CHƠI (LIVE)</span>
              <span className="animate-pulse text-[#00ff80]">● ONLINE</span>
            </div>
            {multiplayerBets.length === 0 ? (
              <div className="text-white/20 italic text-center py-4">Đang đợi người chơi khác xuống tiền...</div>
            ) : (
              multiplayerBets.map((b, i) => (
                <div key={i} className="flex justify-between items-center text-white/70 animate-fade-in">
                  <span className="truncate max-w-[120px] text-white font-bold">👤 {b.name}</span>
                  <span className="text-[#8b949e]">đặt <b className="text-yellow-400 font-bold">{b.amount.toLocaleString()} PP</b> vào <b className="text-[#ffd700]">{getSpotLabel(b.spot)}</b></span>
                </div>
              ))
            )}
          </div>

          {/* THE BETTING SPOTS LAYOUT */}
          <div className="space-y-2">
            <span className="text-[#8b949e] font-mono text-[9px] uppercase font-bold tracking-wider block text-left">BẢN CƯỢC TIÊU CHUẨN ROULETTE AYK:</span>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSpotClick('RED')}
                className={`py-3 rounded-xl border-2 font-black text-xs tracking-wider transition-all flex flex-col items-center justify-center ${
                  selectedSpot === 'RED'
                    ? 'border-red-500 bg-red-950/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.2)] scale-105'
                    : 'border-[#ff003c]/20 bg-red-950/10 text-red-500 hover:border-red-500/40'
                }`}
              >
                <span>🔴 ĐỎ</span>
                <span className="text-[8px] opacity-60">1 ăn 2</span>
              </button>

              <button
                onClick={() => handleSpotClick('BLACK')}
                className={`py-3 rounded-xl border-2 font-black text-xs tracking-wider transition-all flex flex-col items-center justify-center ${
                  selectedSpot === 'BLACK'
                    ? 'border-slate-400 bg-slate-900 text-slate-300 shadow-[0_0_12px_rgba(255,255,255,0.1)] scale-105'
                    : 'border-white/5 bg-black/40 text-slate-400 hover:border-slate-500/40'
                }`}
              >
                <span>⚫ ĐEN</span>
                <span className="text-[8px] opacity-60">1 ăn 2</span>
              </button>

              <button
                onClick={() => handleSpotClick('GREEN')}
                className={`py-3 rounded-xl border-2 font-black text-xs tracking-wider transition-all flex flex-col items-center justify-center ${
                  selectedSpot === 'GREEN'
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)] scale-105'
                    : 'border-emerald-500/20 bg-emerald-950/10 text-emerald-500 hover:border-emerald-500/40'
                }`}
              >
                <span>🟢 SỐ 0</span>
                <span className="text-[8px] opacity-60">1 ăn 35</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSpotClick('LOW')}
                className={`py-2 rounded-lg border font-bold text-[10px] transition-all ${
                  selectedSpot === 'LOW'
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400 scale-105'
                    : 'border-white/5 bg-black/40 text-slate-300 hover:border-white/20'
                }`}
              >
                THẤP (1-18)
              </button>
              <button
                onClick={() => handleSpotClick('HIGH')}
                className={`py-2 rounded-lg border font-bold text-[10px] transition-all ${
                  selectedSpot === 'HIGH'
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400 scale-105'
                    : 'border-white/5 bg-black/40 text-slate-300 hover:border-white/20'
                }`}
              >
                CAO (19-36)
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleSpotClick('DOZEN_1')}
                className={`py-2 rounded-lg border font-bold text-[9px] transition-all ${
                  selectedSpot === 'DOZEN_1'
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400 scale-105'
                    : 'border-white/5 bg-black/40 text-slate-400 hover:border-white/20'
                }`}
              >
                1st TÁ (1-12)
              </button>
              <button
                onClick={() => handleSpotClick('DOZEN_2')}
                className={`py-2 rounded-lg border font-bold text-[9px] transition-all ${
                  selectedSpot === 'DOZEN_2'
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400 scale-105'
                    : 'border-white/5 bg-black/40 text-slate-400 hover:border-white/20'
                }`}
              >
                2nd TÁ (13-24)
              </button>
              <button
                onClick={() => handleSpotClick('DOZEN_3')}
                className={`py-2 rounded-lg border font-bold text-[9px] transition-all ${
                  selectedSpot === 'DOZEN_3'
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400 scale-105'
                    : 'border-white/5 bg-black/40 text-slate-400 hover:border-white/20'
                }`}
              >
                3rd TÁ (25-36)
              </button>
            </div>

            {/* Custom Single Number Select Box */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1.5">
              <span className="text-[#8b949e] font-mono text-[8px] uppercase block text-left">Đặt số đơn cụ thể (1 ăn 35):</span>
              <div className="grid grid-cols-6 gap-1 max-h-[100px] overflow-y-auto pr-1">
                {Array.from({ length: 36 }).map((_, i) => {
                  const num = i + 1;
                  const isNumRed = RED_NUMBERS.includes(num);
                  const key = `NUM_${num}`;
                  return (
                    <button
                      key={num}
                      onClick={() => handleSpotClick(key)}
                      className={`h-7 rounded text-[10px] font-black transition-all ${
                        selectedSpot === key
                          ? 'border-2 border-yellow-400 bg-yellow-400/10 text-yellow-300 scale-110 shadow-md'
                          : isNumRed
                          ? 'bg-red-950/20 text-red-500 border border-red-950 hover:bg-red-950/40'
                          : 'bg-slate-900 text-slate-300 border border-slate-950 hover:bg-slate-850'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ACTIVE BET SLIP */}
          <div className="bg-black/60 border border-white/5 rounded-xl p-3.5 space-y-2.5 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
              <span className="text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-1">
                📝 CHI TIẾT KÈO ĐẶT CƯỢC
              </span>
              <button 
                onClick={handleClearBets}
                disabled={isSpinning || currentBets.length === 0}
                className="text-red-500 hover:text-red-400 hover:underline text-[9px] uppercase font-bold disabled:opacity-30 disabled:no-underline"
              >
                XÓA CƯỢC
              </button>
            </div>

            {currentBets.length === 0 ? (
              <div className="text-white/20 italic text-center py-2 text-[10px]">
                Chưa có sấp vé cược nào được đặt. Hãy chọn ô và bấm [ĐẶT CƯỢC].
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                {currentBets.map((b, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] items-center text-[#ffd700]">
                    <span>🎯 {getSpotLabel(b.choice)}:</span>
                    <span className="font-black text-glow-gold">{b.amount.toLocaleString()} PP</span>
                  </div>
                ))}
                <div className="flex justify-between text-white border-t border-white/5 pt-1.5 font-black text-xs">
                  <span>TỔNG CƯỢC:</span>
                  <span>{currentBets.reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP</span>
                </div>
              </div>
            )}
          </div>

          {/* INPUT FORM & TRIGGER ACTION */}
          <div className="space-y-3 font-mono">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Số tiền cược..."
                disabled={isSpinning}
                className="bg-black/60 border border-[#30363d] focus:border-[#ffd700] rounded-xl px-3 py-2.5 text-[#ffd700] text-glow-gold font-black text-center text-xs flex-1 disabled:opacity-50"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
              />
              <button
                onClick={handlePlaceBet}
                disabled={isSpinning}
                className="min-h-[44px] px-4 py-2 bg-yellow-950/20 border border-yellow-500 hover:bg-yellow-500 hover:text-black font-extrabold rounded-xl uppercase text-[10px] tracking-wider transition-all cursor-pointer disabled:opacity-50 shrink-0 flex items-center justify-center active:scale-95"
              >
                + CHỐT CƯỢC
              </button>
            </div>

            {/* Quick Stake Shortcuts */}
            <div className="grid grid-cols-4 gap-1.5">
              {[5000, 10000, 50000, 100000].map((v) => (
                <button
                  key={v}
                  onClick={() => setBetAmount(v.toString())}
                  disabled={isSpinning}
                  className="min-h-[44px] bg-white/5 border border-white/10 hover:border-yellow-500/40 text-slate-300 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer active:scale-95"
                >
                  {(v / 1000).toFixed(0)}K
                </button>
              ))}
            </div>

            <button
              onClick={handleSpinWheel}
              disabled={isSpinning}
              className="w-full min-h-[48px] py-3.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 cursor-pointer flex items-center justify-center active:scale-95"
            >
              {isSpinning ? '[ ĐANG QUAY VÒNG SỐ... ]' : '[ BẮT ĐẦU QUAY ROULETTE ]'}
            </button>
          </div>

          {/* REQUIREMENT 5: ADMIN MANUAL OVERRIDE */}
          {isAdmin && (
            <div className="bg-red-950/15 border-2 border-red-500/30 rounded-xl p-3 space-y-2 text-[10px] font-mono text-left">
              <span className="text-red-400 font-black flex items-center gap-1 uppercase tracking-wider text-[9px]">
                <ShieldCheck className="w-3.5 h-3.5 animate-pulse" /> ⚙️ ADMIN MANUAL OVERRIDE (CHỈ ADMIN THẤY)
              </span>
              <div className="flex gap-2 items-center">
                <span className="text-white/60">Ép số trúng (0-36):</span>
                <input
                  type="number"
                  placeholder="RNG"
                  className="bg-black border border-red-500/40 rounded px-1.5 py-0.5 text-center text-red-400 font-bold w-16"
                  value={adminForceResult}
                  onChange={(e) => setAdminForceResult(e.target.value)}
                />
                {adminForceResult && (
                  <button
                    onClick={() => setAdminForceResult('')}
                    className="text-white/40 hover:text-white underline text-[9px]"
                  >
                    Hủy ép
                  </button>
                )}
              </div>
              <div className="text-[9px] text-red-400/80 leading-snug">
                * Nhập một số từ 0 đến 36 để cưỡng bức kết quả ván đấu tiếp theo trước khi nhấn nút quay.
              </div>
            </div>
          )}

        </div>
        </div>
      </div>
    </div>
  );
}
