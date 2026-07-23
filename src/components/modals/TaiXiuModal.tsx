/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { get, ref, update, push } from 'firebase/database';
import { db } from '../../firebase';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Sparkles, X } from 'lucide-react';
import { User } from '../../types';
import { incrementMissionProgress } from '../../utils/missions';

declare let confetti: any;

interface TaiXiuModalProps {
  uid: string;
  user: User | null;
  onClose: () => void;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

export default function TaiXiuModal({ uid, user, onClose, onShowResult }: TaiXiuModalProps) {
  const [betChoice, setBetChoice] = useState<'TAI' | 'XIU' | 'BAO1' | 'BAO6' | ''>('');
  const [betAmount, setBetAmount] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [dices, setDices] = useState<number[]>([1, 1, 1]);
  
  // Super Bao Bonus States
  const [bonusClaimable, setBonusClaimable] = useState(false);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Custom drag offsets for cup opening
  const [cupOffset, setCupOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const diceIcons = [
    null,
    'fa-dice-one',
    'fa-dice-two',
    'fa-dice-three',
    'fa-dice-four',
    'fa-dice-five',
    'fa-dice-six'
  ];

  const handleStartGame = async () => {
    const amt = parseInt(betAmount);
    if (!betChoice) {
      alert('Vui lòng chọn TÀI hoặc XỈU trước khi lắc!');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      alert('Số lượng PP đặt cược không hợp lệ!');
      return;
    }

    const currentPP = user?.pp || 0;
    if (currentPP < amt) {
      alert(`Tài khoản không đủ PP! Số dư hiện tại: ${currentPP.toLocaleString()} PP.`);
      return;
    }

    setIsPlaying(true);
    setIsShaking(true);
    setIsRevealed(false);
    setBonusClaimable(false);
    setBonusClaimed(false);
    setCupOffset({ x: 0, y: 0 });

    try {
      // Deduct PP immediately on stake
      (window as any).__s88_last_legit_tx = Date.now();
      await update(ref(db, `users/${uid}`), { pp: currentPP - amt });

      // Save deduction transaction ledger immediately
      await push(ref(db, 'transactions'), {
        sender: uid,
        senderName: user?.name || 'Sinh Viên',
        receiver: 'SYSTEM_TAIXIU',
        receiverName: 'Lắc Tài Xỉu Thần Thú S88',
        amount: amt,
        message: `Cược Tài Xỉu: Cửa ${betChoice}`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      // Pre-calculate final dice values
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      setDices([d1, d2, d3]);

      // 2 seconds shaking animation
      setTimeout(() => {
        setIsShaking(false);
      }, 2000);
    } catch (err) {
      // Trigger Bet Failure toast notification instead of silent fail
      setIsPlaying(false);
      setIsShaking(false);
      onShowResult(
        'LỖI GIAO DỊCH / BET FAILURE',
        'Giao dịch đặt cược không hợp lệ hoặc bị gián đoạn do độ trễ mạng. Vui lòng thử lại!',
        false
      );
    }
  };

  const handleClaimBonus = async () => {
    if (!bonusClaimable || bonusClaimed || isClaiming) return;
    setIsClaiming(true);
    try {
      (window as any).__s88_last_legit_tx = Date.now();
      const uSnap = await get(ref(db, `users/${uid}`));
      const freshPP = uSnap.val()?.pp || 0;
      await update(ref(db, `users/${uid}`), { pp: freshPP + bonusAmount });

      // Save to transactions history
      await push(ref(db, 'transactions'), {
        sender: 'SYSTEM_TAIXIU_BONUS',
        senderName: 'Lộc Thần Thú Tài Xỉu',
        receiver: uid,
        receiverName: user?.name || 'Sinh Viên',
        amount: bonusAmount,
        message: `🎰 NHẬN THƯỞNG SIÊU BÃO: Bão ba con ${dices[0]}!`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      // Save to game logs
      await push(ref(db, 'game_logs'), {
        uid,
        name: user?.name || 'Sinh Viên',
        game: 'Tài Xỉu (Bonus)',
        bet: 0,
        pnl: bonusAmount,
        result: `Nhận Lộc Siêu Bão x${dices[0]}`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      setBonusClaimed(true);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        onClose();
        onShowResult(
          '🎰 ĐÃ NHẬN THƯỞNG SIÊU BÃO! 🎰',
          `Bạn đã nhận thành công khoản thưởng đặc biệt Siêu Bão: +${bonusAmount.toLocaleString()} PP!`,
          true
        );
      }, 1500);

    } catch (err) {
      setIsClaiming(false);
      onShowResult(
        'LỖI NHẬN THƯỞNG / CLAIM FAILURE',
        'Không thể nhận thưởng do sự cố mạng. Vui lòng thử lại!',
        false
      );
    }
  };

  const handleReveal = async () => {
    if (isRevealed || isShaking || !isPlaying) return;
    setIsRevealed(true);

    const sum = dices[0] + dices[1] + dices[2];
    const isTai = sum >= 11;
    const isTriple = dices[0] === dices[1] && dices[1] === dices[2];

    const amt = parseInt(betAmount);
    let payout = 0;
    let logMsg = '';
    let resultTitle = '';
    let isWinh = false;

    if (betChoice === 'TAI') {
      isWinh = isTai && !isTriple;
      payout = isWinh ? amt * 2 : 0;
    } else if (betChoice === 'XIU') {
      isWinh = !isTai && !isTriple;
      payout = isWinh ? amt * 2 : 0;
    } else if (betChoice === 'BAO1') {
      isWinh = isTriple && dices[0] === 1;
      payout = isWinh ? amt * 150 : 0;
    } else if (betChoice === 'BAO6') {
      isWinh = isTriple && dices[0] === 6;
      payout = isWinh ? amt * 150 : 0;
    }

    if (isWinh) {
      resultTitle = 'CHIẾN THẮNG !';
      if (betChoice === 'BAO1' || betChoice === 'BAO6') {
        resultTitle = '🎰 SIÊU BÃO THẮNG LỚN! 🎰';
        logMsg = `Cổ kết quả: ${dices.join('-')} (Tổng: ${sum}) => BÃO TAM BẢO!!!\nChúc mừng bạn trúng đậm đặc biệt x150 lần tiền cược! Nhận về +${payout.toLocaleString()} PP.`;
      } else {
        logMsg = `Kết quả xúc xắc: ${dices.join('-')} (Tổng: ${sum} - ${isTai ? 'TÀI' : 'XỈU'})\nChúc mừng bạn đoán đúng! Nhận về +${payout.toLocaleString()} PP.`;
      }
    } else {
      resultTitle = 'THẤT BẠI !';
      if (isTriple) {
        logMsg = `Cổ kết quả: ${dices.join('-')} (Tổng: ${sum}) => BÃO!!! Nhà cái húp trọn sạch sành sanh. Bạn đoán sai bên cược!`;
        resultTitle = 'BÃO !!! THUA SẠCH';
      } else {
        logMsg = `Kết quả xúc xắc: ${dices.join('-')} (Tổng: ${sum} - ${isTai ? 'TÀI' : 'XỈU'})\nRất tiếc, bạn đoán sai! Thâm hụt mất -${amt.toLocaleString()} PP.`;
      }
    }

    const isSuperBao = isTriple && (dices[0] === 1 || dices[0] === 6);

    try {
      // Payout award if won
      if (payout > 0) {
        // Authorize transaction in anticheat before updating database
        (window as any).__s88_last_legit_tx = Date.now();
        const uSnap = await get(ref(db, `users/${uid}`));
        const freshPP = uSnap.val()?.pp || 0;
        await update(ref(db, `users/${uid}`), { pp: freshPP + payout });

        // Save payout transaction history for win
        await push(ref(db, 'transactions'), {
          sender: 'SYSTEM_TAIXIU',
          senderName: 'Tài Xỉu S88',
          receiver: uid,
          receiverName: user?.name || 'Sinh Viên',
          amount: payout,
          message: `Thắng Tài Xỉu: Kết quả ${dices.join('-')} (${isTai ? 'TÀI' : 'XỈU'})`,
          time: new Date().toLocaleString('vi-VN'),
          timestamp: Date.now()
        });

        // Update daily missions Tai Xiu wins
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const mRef = ref(db, `users/${uid}/daily_missions/${todayStr}`);
        const mSnap = await get(mRef);
        const currentWins = mSnap.val()?.taiXiuWins || 0;
        await update(mRef, { taiXiuWins: currentWins + 1 });

        // Increment our randomized missions progress
        await incrementMissionProgress(uid, 'taixiu_wins');
      }

      // Record logs in game logger
      await push(ref(db, 'game_logs'), {
        uid,
        name: user?.name || 'Sinh Viên',
        game: 'Tài Xỉu',
        bet: amt,
        pnl: payout - amt,
        result: (betChoice === 'BAO1' || betChoice === 'BAO6') && isWinh ? 'Bão (Thắng x150)' : isTriple ? 'Bão (Thua)' : isWinh ? 'Thắng' : 'Thua',
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      if (isSuperBao) {
        // Offer special claim bonus button, do NOT auto-close modal!
        const bAmt = Math.max(amt * 10, 50000);
        setBonusAmount(bAmt);
        setBonusClaimable(true);
      } else {
        // Clear layout normally
        setTimeout(() => {
          onClose();
          onShowResult(resultTitle, logMsg, isWinh && !isTriple);
        }, 1200);
      }
    } catch (err) {
      onShowResult(
        'LỖI GIAO DỊCH / TRANSACTION FAILURE',
        'Giao dịch không thể hoàn tất. Đã bảo lưu trạng thái trên thiết bị. Vui lòng thử lại!',
        false
      );
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

    // Open/Reveal if dragged away far enough
    if (Math.abs(newX) > 100 || Math.abs(newY) > 100) {
      setIsDragging(false);
      handleReveal();
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (!isRevealed) {
      // Snap back if not triggered
      setCupOffset({ x: 0, y: 0 });
    }
  };

  return (
    <div className="overlay z-[6000]" onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}>
      <div className="glass-box login-panel overflow-y-auto max-h-[92vh] w-[95vw] md:w-full max-w-[480px] p-4 sm:p-6 border-[#ff00ff] relative flex flex-col justify-between max-sm:h-[90vh] max-sm:rounded-3xl max-sm:shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#8b949e] hover:text-white cursor-pointer transition z-50">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-[#ff00ff] text-glow-pink text-xl sm:text-2xl font-black font-mono uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
            <Sparkles className="w-5 h-5 animate-pulse" /> TÀI XỈU NẶN BÁT
          </h2>
          <p className="text-[10px] font-mono text-[#8b949e] uppercase mb-3">
            Lắc đĩa & Vuốt nặn sảng khoái 3D (Tối ưu Portrait)
          </p>

          {isShaking && (
            <div className="text-[#ffd700] text-glow-gold font-mono font-black text-sm py-1 animate-pulse">
              ĐANG RUNG ĐĨA LẮC QUÂN...
            </div>
          )}

          {/* Plate arena */}
          <div className="relative w-52 h-52 sm:w-64 sm:h-64 mx-auto my-3 sm:my-6 flex items-center justify-center select-none">
            {/* Plate background */}
            <div className="absolute w-[190px] h-[190px] sm:w-[230px] sm:h-[230px] bg-gradient-to-b from-[#e6e6e6] via-[#999] to-[#333] rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.8),_inset_0_-5px_15px_rgba(0,0,0,0.5)] border-4 border-[#eee] flex items-center justify-center">
              {/* Inner felt green circle */}
              <div className="w-[150px] h-[150px] sm:w-[190px] sm:h-[190px] bg-[#1a4314] rounded-full shadow-inner border border-black/20" />
            </div>

            {/* Dice display layer */}
            {isPlaying && !isShaking && (
              <div className="absolute z-10 flex gap-2 sm:gap-3 animate-fade-in">
                {dices.map((val, idx) => (
                  <i
                    key={idx}
                    className={`fas ${diceIcons[val]} text-[38px] sm:text-[48px] bg-white text-red-600 rounded-lg shadow-[inset_0_0_8px_rgba(0,0,0,0.2),_0_5px_10px_rgba(0,0,0,0.5)] flex items-center justify-center p-1 sm:p-1.5 ${
                      idx === 1 ? 'text-black' : ''
                    }`}
                    style={{ transform: `rotate(${idx * 15 - 15}deg)` }}
                  />
                ))}
              </div>
            )}

            {/* Draggable Shaker Cup Cover */}
            {isPlaying && !isRevealed && (
              <div
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                style={{
                  transform: `translate(${cupOffset.x}px, ${cupOffset.y}px)`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  display: 'block'
                }}
                className={`absolute w-[150px] h-[150px] sm:w-[180px] sm:h-[180px] bg-gradient-to-r from-red-500 via-red-600 to-red-800 rounded-full z-20 shadow-[0_15px_25px_rgba(0,0,0,0.85),_inset_0_-10px_20px_rgba(0,0,0,0.6)] border border-red-400 flex items-center justify-center ${
                  isShaking ? 'shake-anim' : ''
                }`}
              >
                {/* Cup handle details */}
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-950/20 rounded-full border border-red-400 flex items-center justify-center text-white/50 font-bold text-xs sm:text-base">
                  88
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inputs & actions positioned in bottom half for one-handed portrait thumb access */}
        <div className="mt-auto max-sm:bg-black/90 max-sm:border-t-2 max-sm:border-[#ff00ff]/30 max-sm:-mx-4 max-sm:-mb-4 max-sm:p-4 max-sm:rounded-t-3xl max-sm:shadow-[0_-10px_30px_rgba(255,0,255,0.2)]">
          {!isPlaying ? (
            <div className="space-y-3 font-mono text-xs">
              {/* Bet Side Selection */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBetChoice('TAI')}
                    className={`py-3 rounded-xl border font-black text-sm tracking-widest transition-all cursor-pointer ${
                      betChoice === 'TAI'
                        ? 'border-[#00ff80] text-[#00ff80] bg-[#00ff80]/10 text-glow-green scale-105 shadow-[0_0_15px_rgba(0,255,128,0.3)]'
                        : 'border-[#30363d] text-[#8b949e] hover:text-white bg-black/40'
                    }`}
                  >
                    TÀI (11-17)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetChoice('XIU')}
                    className={`py-3 rounded-xl border font-black text-sm tracking-widest transition-all cursor-pointer ${
                      betChoice === 'XIU'
                        ? 'border-[#ff003c] text-[#ff003c] bg-[#ff003c]/10 text-glow-red scale-105 shadow-[0_0_15px_rgba(255,0,60,0.3)]'
                        : 'border-[#30363d] text-[#8b949e] hover:text-white bg-black/40'
                    }`}
                  >
                    XỈU (4-10)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBetChoice('BAO1')}
                    className={`py-2 rounded-xl border font-black text-xs tracking-wider transition-all cursor-pointer ${
                      betChoice === 'BAO1'
                        ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10 text-glow-gold scale-105 shadow-[0_0_10px_rgba(250,204,21,0.2)]'
                        : 'border-[#30363d] text-[#8b949e] hover:text-white bg-black/40'
                    }`}
                  >
                    🎰 BÃO 1 (x150)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetChoice('BAO6')}
                    className={`py-2 rounded-xl border font-black text-xs tracking-wider transition-all cursor-pointer ${
                      betChoice === 'BAO6'
                        ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10 text-glow-gold scale-105 shadow-[0_0_10px_rgba(250,204,21,0.2)]'
                        : 'border-[#30363d] text-[#8b949e] hover:text-white bg-black/40'
                    }`}
                  >
                    🎰 BÃO 6 (x150)
                  </button>
                </div>
              </div>

              {/* Stake Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#8b949e] uppercase font-bold text-[10px]">CƯỢC PP LẮC BÁT:</label>
                  <div className="flex gap-1">
                    {[50000, 200000, 500000].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setBetAmount(quick.toString())}
                        className="px-1.5 py-0.5 text-[9px] bg-white/5 hover:bg-white/10 text-cyan-300 rounded border border-cyan-500/30 font-bold"
                      >
                        +{(quick/1000)}k
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  placeholder="Nhập số PP cược..."
                  className="w-full bg-black/80 border border-[#30363d] focus:border-[#ff00ff] rounded-xl p-3 outline-none text-[#ffd700] text-glow-gold font-black text-center text-sm"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                />
              </div>

              <button
                onClick={handleStartGame}
                className="w-full py-3.5 bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 hover:from-pink-500 hover:to-purple-500 text-white font-black rounded-xl uppercase tracking-widest transition-all text-xs cursor-pointer shadow-[0_0_20px_rgba(255,0,255,0.4)] active:scale-95"
              >
                [ LẮC ĐĨA QUÂN NGAY ]
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-xs font-mono">
              <p className="text-[#8b949e] text-center">
                Đặt cược: <b className="text-white">{betChoice}</b> | Số tiền:{' '}
                <b className="text-[#ffd700]">{parseInt(betAmount || '0').toLocaleString()} PP</b>
              </p>

              {bonusClaimable ? (
                <div className="border border-yellow-500/50 bg-yellow-500/10 rounded-xl p-3 text-center space-y-2 animate-bounce shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                  <span className="text-sm font-black text-yellow-400 block tracking-widest text-glow-gold">
                    🔥 SIÊU BÃO TAM BẢO XUẤT HIỆN! 🔥
                  </span>
                  <button
                    onClick={handleClaimBonus}
                    disabled={bonusClaimed || isClaiming}
                    className="w-full py-3 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-[0_5px_15px_rgba(245,158,11,0.4)] active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {bonusClaimed ? 'ĐÃ NHẬN THƯỞNG ✔' : isClaiming ? 'ĐANG ĐỒNG BỘ...' : `🎁 NHẬN LỘC SIÊU BÃO (+${bonusAmount.toLocaleString()} PP)`}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-white text-[11px] text-center uppercase tracking-wide leading-relaxed animate-pulse">
                    {isShaking ? 'Đang nhào quân...' : 'DI CHUYỂN BÁT BẰNG TAY để NẶN kết quả!'}
                  </p>
                  {!isShaking && !isRevealed && (
                    <button
                      onClick={handleReveal}
                      className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black rounded-xl uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95"
                    >
                      [ MỞ BÁT NGAY ]
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ADMIN OVERRIDE */}
          {((user?.role as any) === 'ADMIN' || (user?.role as any) === 'TEACHER') && (
            <div className="mt-3 border-t border-red-500/20 pt-2 space-y-1.5 font-mono text-left">
              <span className="text-red-500 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                ⚙️ ADMIN MANUAL OVERRIDE
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((idx) => (
                  <select
                    key={idx}
                    className="w-full bg-black border border-red-500/30 text-red-500 rounded px-1 py-1 font-bold text-[10px] outline-none"
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
