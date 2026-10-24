/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, fetchWithAuth } from '../../firebase';
import { X, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
import { User } from '../../types';

interface CryptoModalProps {
  uid: string;
  user: User | null;
  onClose: () => void;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

interface Point {
  x: number;
  y: number;
}

export default function CryptoModal({ uid, user, onClose, onShowResult }: CryptoModalProps) {
  const [betAmount, setBetAmount] = useState('');
  const [isTrading, setIsTrading] = useState(false);
  const [hasRugPulled, setHasRugPulled] = useState(false);

  // Multiplier state
  const [multiplier, setMultiplier] = useState(1.00);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tradingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rugPullPointRef = useRef<number>(1.00);
  const betRef = useRef<number>(0);

  // Chart line state variables inside ref to avoid interval closure traps
  const chartPointsRef = useRef<Point[]>([{ x: 0, y: 260 }]);
  const chartXRef = useRef<number>(0);
  const chartMultRef = useRef<number>(1.00);

  useEffect(() => {
    return () => {
      if (tradingIntervalRef.current) clearInterval(tradingIntervalRef.current);
    };
  }, []);

  const handleStartTrade = async () => {
    if (isTrading) return;

    const amt = parseInt(betAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Số vốn PP đầu tư không hợp lệ!');
      return;
    }

    const currentPP = user?.pp || 0;
    if (currentPP < amt) {
      alert(`Số dư PP không đủ để đầu tư! Ví: ${currentPP.toLocaleString()} PP.`);
      return;
    }

    try {
      const res = await fetchWithAuth('/api/game/crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bet', betAmount: amt })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Lỗi khởi động sàn giao dịch!');
        return;
      }

      setIsTrading(true);
      setHasRugPulled(false);
      setMultiplier(1.00);
      betRef.current = amt;

      // Reset chart points
      chartPointsRef.current = [{ x: 0, y: 260 }];
      chartXRef.current = 0;
      chartMultRef.current = 1.00;

      let speed = 0.003;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      tradingIntervalRef.current = setInterval(() => {
        chartMultRef.current += speed;
        speed += 0.0002; // accelerating growth curve

        const currentMult = chartMultRef.current;
        setMultiplier(currentMult);

        // Generate line path values
        chartXRef.current += 3.5;
        let cY = 260 - ((currentMult - 1.0) * 35);
        if (cY < 20) {
          cY = 20 + Math.random() * 8;
        }

        chartPointsRef.current.push({ x: chartXRef.current, y: cY });

        // Keep last 180 points for buffer scrolling
        if (chartXRef.current >= 540) {
          chartPointsRef.current.shift();
        }

        // Draw line on Canvas
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.beginPath();
          ctx.moveTo(chartPointsRef.current[0].x, chartPointsRef.current[0].y);
          ctx.strokeStyle = '#00ff80'; // Emerald Green trend line
          ctx.lineWidth = 3.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#00ff80';

          for (let i = 1; i < chartPointsRef.current.length; i++) {
            ctx.lineTo(chartPointsRef.current[i].x, chartPointsRef.current[i].y);
          }
          ctx.stroke();
        }

        // Maximum visual multiplier safety cap
        if (currentMult >= 50.0) {
          if (tradingIntervalRef.current) {
            clearInterval(tradingIntervalRef.current);
            tradingIntervalRef.current = null;
          }
          handleCashOut();
        }
      }, 40);

    } catch (err) {
      alert('Lỗi khởi động sàn giao dịch!');
      setIsTrading(false);
    }
  };

  const handleRugPull = async () => {
    setIsTrading(false);
    setHasRugPulled(true);

    const amt = betRef.current;
    const finalPoint = chartMultRef.current;

    // Draw final crash drop down line on Canvas
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.lineTo(chartXRef.current, 290);
      ctx.strokeStyle = '#ff003c'; // red candle drop
      ctx.shadowColor = '#ff003c';
      ctx.stroke();
    }

    fetchWithAuth('/api/game/crypto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rugged' })
    }).catch(() => {});

    setTimeout(() => {
      onClose();
      onShowResult(
        '📉 RUG PULL !!! SẬP SÀN',
        `Nến xanh của bạn đã bị cá mập úp sọt xả hàng ở x${finalPoint.toFixed(2)}!\nTổn thất toàn bộ nguồn vốn đầu tư: -${amt.toLocaleString()} PP.`,
        false
      );
    }, 1500);
  };

  const handleCashOut = async () => {
    if (!isTrading || hasRugPulled) return;

    if (tradingIntervalRef.current) {
      clearInterval(tradingIntervalRef.current);
      tradingIntervalRef.current = null;
    }

    const currentMult = chartMultRef.current;

    try {
      const res = await fetchWithAuth('/api/game/crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cashout', multiplier: currentMult })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIsTrading(false);
        setTimeout(() => {
          onClose();
          onShowResult(
            'CHỐT LỜI THÀNH CÔNG !',
            `Bạn đã bán xả hàng kịp thời ở mốc nến xanh x${currentMult.toFixed(2)}!\nNhận được dòng tiền: +${data.winAmount.toLocaleString()} PP!`,
            true
          );
        }, 1500);
      } else {
        handleRugPull();
      }
    } catch (err) {
      handleRugPull();
    }
  };

  // Handle canvas responsive sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div className="game-overlay bg-black/90 backdrop-blur-md">
      <div className="game-shell bg-[#080705] border-0 md:border-2 md:border-[#ffd700] flex flex-col shadow-2xl font-mono">
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 shrink-0 flex items-center justify-between px-4 py-3 bg-[#141208]/95 border-b border-[#ffd700]/40 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-5 h-5 text-[#ffd700] shrink-0" />
            <div className="truncate">
              <h2 className="text-[#ffd700] text-base md:text-lg font-black uppercase tracking-wider truncate">
                TRADING CRYPTO LIVE
              </h2>
              <span className="text-[10px] text-emerald-400 font-bold block truncate">
                Số dư: {(user?.pp || 0).toLocaleString()} PP
              </span>
            </div>
          </div>
          <button 
            onClick={isTrading ? undefined : onClose} 
            disabled={isTrading}
            aria-label="Đóng"
            className="game-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 space-y-4">
          <p className="text-[10px] text-[#8b949e] uppercase text-center tracking-wider">
            Gồng lãi nến xanh và thoát hàng trước khi cá mập xả kho
          </p>

          {/* Live chart trading area */}
          <div className="relative w-full h-[220px] sm:h-[260px] md:h-[280px] bg-[#050505] border-2 border-[#ffd700]/80 rounded-xl overflow-hidden shadow-inner select-none">
            
            {/* Big multiplier backdrop */}
            <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl sm:text-5xl font-black tracking-widest font-mono text-glow-gold text-[#ffd700]/15 z-0 select-none">
              X{multiplier.toFixed(2)}
            </div>

            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10" />

            {/* Rug pull warning card overlay */}
            {hasRugPulled && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-20 animate-fade-in font-mono border-2 border-[#ff003c]/60 rounded-xl p-4 text-center">
                <h1 className="text-2xl sm:text-3xl font-black text-[#ff003c] text-glow-red tracking-widest uppercase mb-1.5 animate-bounce">
                  📉 RUG PULL !!!
                </h1>
                <p className="text-xs text-[#8b949e] uppercase">SÀN ĐÃ CHÁY TÀI KHOẢN</p>
              </div>
            )}
          </div>

          {/* Action Controls */}
          {!isTrading && !hasRugPulled ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[#8b949e] uppercase font-bold text-[10px]">Số lượng PP đặt cược giao dịch:</label>
                  <span className="text-emerald-400 font-bold text-[10px]">Ví: {(user?.pp || 0).toLocaleString()} PP</span>
                </div>
                <input
                  type="number"
                  placeholder="Nhập số PP đầu tư coin..."
                  className="w-full min-h-[44px] bg-black/60 border border-[#30363d] focus:border-[#ffd700] rounded-xl p-3 text-center text-sm font-black text-[#ffd700] text-glow-gold outline-none"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                />
                <div className="grid grid-cols-4 gap-1.5">
                  {['5000', '20000', '50000', '100000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBetAmount(amt)}
                      className={`min-h-[44px] text-xs font-black rounded-lg border transition cursor-pointer flex items-center justify-center ${
                        betAmount === amt
                          ? 'bg-[#ffd700]/20 border-[#ffd700] text-[#ffd700]'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {parseInt(amt) >= 1000 ? `${parseInt(amt) / 1000}K` : amt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartTrade}
                className="w-full min-h-[48px] py-3.5 bg-yellow-950/20 hover:bg-[#ffd700] hover:text-black border border-[#ffd700] text-[#ffd700] font-black uppercase text-xs tracking-widest cursor-pointer rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🚀</span> [ MUA VÀO & GỒNG LÃI ]
              </button>
            </div>
          ) : (
            <div className="font-mono">
              {isTrading ? (
                <button
                  onClick={handleCashOut}
                  className="w-full min-h-[48px] py-4 bg-emerald-950/30 border-2 border-dashed border-[#00ff80] text-[#00ff80] text-glow-green hover:bg-[#00ff80]/15 font-black uppercase tracking-widest text-sm rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>💰</span> [ BÁN THOÁT HÀNG (CHỐT X{multiplier.toFixed(2)}) ]
                </button>
              ) : (
                <button
                  disabled
                  className="w-full min-h-[48px] py-4 bg-red-950/20 border border-[#ff003c] text-[#ff003c] text-glow-red font-black uppercase tracking-widest text-sm rounded-xl cursor-not-allowed flex items-center justify-center"
                >
                  📉 CHÁY TÀI KHOẢN ! RUG PULLED
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
