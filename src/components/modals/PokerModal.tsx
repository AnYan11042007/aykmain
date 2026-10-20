/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Texas Hold'em Poker Modal
 * Strict landscape mobile layout matching Demo 1 & Demo 2
 * Neon dark theme, oval green felt, max 5 seats, 20s countdown ring,
 * hand rank compendium, right control column, and fair Monte Carlo AI.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  BookOpen,
  Volume2,
  VolumeX,
  Settings,
  ChevronLeft,
  Coins,
  Flame,
  Bot,
  Users,
  Plus,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Trophy,
  Check,
  Zap
} from 'lucide-react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../../firebase';
import { User, PokerRoom, PokerSeat } from '../../types';
import {
  parseCard,
  formatCard,
  evaluateHand,
  getBettingOptions,
  HAND_NAMES_VI,
  HAND_NAMES_EN,
  Card,
  HandEvaluation
} from '../../poker/pokerEngine';
import { normalizePokerRoom } from '../../poker/pokerRoomUtil';

interface PokerModalProps {
  uid: string;
  user: User | null;
  onClose: () => void;
  onShowResult?: (title: string, message: string, isWin: boolean) => void;
  /** Layout-test only: render a fixed table instead of listening to Firebase */
  previewRoom?: PokerRoom;
  previewHole?: string[];
}

// Demo 2 Hand Compendium Reference Cards
const HAND_COMPENDIUM_TIERS = [
  { rank: 1, nameVi: 'Thùng phá sảnh Hoàng gia', nameEn: 'ROYAL FLUSH', cards: ['10c', 'Jc', 'Qc', 'Kc', 'Ac'], cat: 'ROYAL_FLUSH' },
  { rank: 2, nameVi: 'Thùng phá sảnh', nameEn: 'STRAIGHT FLUSH', cards: ['5c', '6c', '7c', '8c', '9c'], cat: 'STRAIGHT_FLUSH' },
  { rank: 3, nameVi: 'Tứ quý', nameEn: 'FOUR OF A KIND', cards: ['As', 'Ac', 'Ah', 'Ad', '8s'], cat: 'FOUR_OF_A_KIND' },
  { rank: 4, nameVi: 'Cù lũ', nameEn: 'FULL HOUSE', cards: ['Ks', 'Kh', 'Kd', '10s', '10d'], cat: 'FULL_HOUSE' },
  { rank: 5, nameVi: 'Thùng', nameEn: 'FLUSH', cards: ['Qs', '8s', '6s', '4s', '2s'], cat: 'FLUSH' },
  { rank: 6, nameVi: 'Sảnh', nameEn: 'STRAIGHT', cards: ['2d', '3c', '4s', '5d', '6c'], cat: 'STRAIGHT' },
  { rank: 7, nameVi: 'Sám cô', nameEn: 'THREE OF A KIND', cards: ['Jd', 'Jc', 'Js', '5h', '8s'], cat: 'THREE_OF_A_KIND' },
  { rank: 8, nameVi: 'Thú (Hai đôi)', nameEn: 'TWO PAIR', cards: ['6c', '6s', '10s', '10d', 'Ks'], cat: 'TWO_PAIR' },
  { rank: 9, nameVi: 'Đôi', nameEn: 'ONE PAIR', cards: ['Ah', 'Ac', '2s', '6d', '9s'], cat: 'ONE_PAIR' },
  { rank: 10, nameVi: 'Mậu thầu', nameEn: 'HIGH CARD', cards: ['Kh', 'Js', '8d', '6s', '3c'], cat: 'HIGH_CARD' },
];

export default function PokerModal({ uid, user, onClose, onShowResult, previewRoom, previewHole }: PokerModalProps) {
  // Sound Muted state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Active Room ID & Local Room State
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(previewRoom ? previewRoom.id : null);
  const [room, setRoom] = useState<PokerRoom | null>(previewRoom ? normalizePokerRoom(previewRoom) : null);
  const [myHoleCards, setMyHoleCards] = useState<string[]>(previewHole || []);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Hand Rank Modal (Demo 2)
  const [showHandRankModal, setShowHandRankModal] = useState<boolean>(false);

  // Lobby & Create Room State
  const [lobbyRooms, setLobbyRooms] = useState<PokerRoom[]>([]);
  const [selectedMode, setSelectedMode] = useState<'AI' | 'MULTIPLAYER'>('AI');
  const [selectedBB, setSelectedBB] = useState<number>(100);
  const [buyInSlider, setBuyInSlider] = useState<number>(5000); // 50x BB default
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // In-Game Raise Slider Value
  const [customRaiseAmount, setCustomRaiseAmount] = useState<number>(200);

  // Countdown seconds remaining for current turn
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);

  // One shared AudioContext (browsers cap how many can exist at once)
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => () => { audioCtxRef.current?.close().catch(() => {}); audioCtxRef.current = null; }, []);

  // Web Audio Synth for crisp poker sounds
  const playSound = (type: 'deal' | 'chip' | 'check' | 'fold' | 'win') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx: AudioContext = audioCtxRef.current || (audioCtxRef.current = new AudioCtx());
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'chip') {
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'deal') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.36); // C6
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'fold') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else {
        // check
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch (e) {}
  };

  // Listen to Lobby Rooms Realtime
  useEffect(() => {
    if (previewRoom) return;
    const roomsRef = ref(db, 'poker_rooms');
    const unsub = onValue(roomsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: PokerRoom[] = Object.values(val);
        setLobbyRooms(list.filter(r => r && r.id).map(r => normalizePokerRoom(r)));
      } else {
        setLobbyRooms([]);
      }
    });
    return () => off(roomsRef, 'value', unsub);
  }, []);

  // Listen to Active Room State
  useEffect(() => {
    if (!currentRoomId || previewRoom) return;

    const roomRef = ref(db, `poker_rooms/${currentRoomId}`);
    const unsubRoom = onValue(roomRef, (snap) => {
      if (snap.exists()) {
        const rData = normalizePokerRoom(snap.val() as PokerRoom);
        setRoom(rData);

        // Sound cues on round changes
        if (rData.round === 'FLOP' || rData.round === 'TURN' || rData.round === 'RIVER') {
          playSound('deal');
        } else if (rData.round === 'SHOWDOWN') {
          playSound('win');
        }
      } else {
        // Room deleted / left
        setRoom(null);
        setCurrentRoomId(null);
      }
    });

    // Listen to private hole cards
    const privRef = ref(db, `poker_private/${currentRoomId}/${uid}`);
    const unsubPriv = onValue(privRef, (snap) => {
      if (snap.exists()) {
        setMyHoleCards(snap.val() || []);
      } else {
        setMyHoleCards([]);
      }
    });

    return () => {
      off(roomRef, 'value', unsubRoom);
      off(privRef, 'value', unsubPriv);
    };
  }, [currentRoomId, uid]);

  // Turn timer countdown & auto-timeout polling
  useEffect(() => {
    if (!room || room.round === 'WAITING' || room.round === 'SHOWDOWN' || room.currentTurnSeat === null) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((room.actionExpiry - now) / 1000));
      setSecondsRemaining(diff);

      if (diff === 0 && room.currentTurnSeat !== null) {
        // Ping server timeout check
        fetch('/api/poker/check_timeout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: room.id })
        }).catch(() => {});
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room]);

  // Find My Seat Index in 5-seat table
  const mySeatIndex = useMemo(() => {
    if (!room) return -1;
    return room.seats.findIndex(s => s?.uid === uid);
  }, [room, uid]);

  const mySeat = mySeatIndex !== -1 && room ? room.seats[mySeatIndex] : null;

  // Re-map seats so that current player is ALWAYS at bottom-center (index 0 in visual layout)
  // 5 Seats in clockwise visual order:
  // 0: Bottom-Center (Me)
  // 1: Left-Middle
  // 2: Top-Left
  // 3: Top-Right
  // 4: Right-Middle
  const visualSeats = useMemo(() => {
    if (!room) return [];
    const baseOffset = mySeatIndex !== -1 ? mySeatIndex : 0;
    const reordered: Array<{ seat: PokerSeat | null; visualPos: number; originalIndex: number }> = [];

    for (let i = 0; i < 5; i++) {
      const originalIndex = (baseOffset + i) % 5;
      reordered.push({
        seat: room.seats[originalIndex],
        visualPos: i,
        originalIndex
      });
    }
    return reordered;
  }, [room, mySeatIndex]);

  // Evaluate My Hand strength & label
  const myHandEvaluation = useMemo<HandEvaluation | null>(() => {
    if (!room || myHoleCards.length !== 2) return null;
    const allKnown = [...myHoleCards, ...room.board].map(parseCard);
    if (allKnown.length < 5) {
      // Just 2 hole cards preflop
      const c1 = allKnown[0];
      const c2 = allKnown[1];
      if (c1.rank === c2.rank) {
        return {
          category: 'ONE_PAIR',
          categoryRank: 9,
          nameVi: 'Đôi',
          nameEn: 'ONE PAIR',
          shortDesc: `ĐÔI ${c1.rank === 14 ? 'A' : c1.rank === 13 ? 'K' : c1.rank === 12 ? 'Q' : c1.rank === 11 ? 'J' : c1.rank}`,
          best5: [c1, c2],
          tiebreakers: [c1.rank],
          score: 0
        };
      }
      const high = Math.max(c1.rank, c2.rank);
      return {
        category: 'HIGH_CARD',
        categoryRank: 10,
        nameVi: 'Mậu thầu',
        nameEn: 'HIGH CARD',
        shortDesc: `MẬU THẦU ${high === 14 ? 'A' : high === 13 ? 'K' : high === 12 ? 'Q' : high === 11 ? 'J' : high}`,
        best5: [c1, c2],
        tiebreakers: [high],
        score: 0
      };
    }
    return evaluateHand(allKnown);
  }, [myHoleCards, room]);

  // Betting options for my turn
  const bettingOptions = useMemo(() => {
    if (!room || !mySeat || room.currentTurnSeat !== mySeatIndex) {
      return null;
    }
    return getBettingOptions({
      playerChips: mySeat.chips,
      playerCurrentBet: mySeat.currentBet,
      highestBetOnTable: room.highestBet,
      lastRaiseDelta: room.lastRaiseDelta,
      bigBlind: room.bigBlind,
      totalPot: room.pot
    });
  }, [room, mySeat, mySeatIndex]);

  // Synchronize raise slider when my turn arrives
  useEffect(() => {
    if (bettingOptions) {
      setCustomRaiseAmount(bettingOptions.minRaiseTotal);
    }
  }, [bettingOptions?.minRaiseTotal]);

  // API Call helper
  const sendAction = async (endpoint: string, payload: any) => {
    setLoadingAction(true);
    setErrorMessage('');
    const token = localStorage.getItem('s88_sessionToken') || user?.sessionToken || '';
    const actionId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res = await fetch(`/api/poker/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          sessionToken: token,
          actionId
        })
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.error || 'Thao tác không thành công');
      } else {
        if (data.roomId) {
          setCurrentRoomId(data.roomId);
        }
      }
      return data;
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoadingAction(false);
    }
  };

  // Actions
  const handleCreateRoom = async () => {
    const minBuy = selectedBB * 20;
    const maxBuy = selectedBB * 100;
    const clampedBuyIn = Math.max(minBuy, Math.min(maxBuy, buyInSlider));

    if ((user?.pp || 0) < clampedBuyIn) {
      setErrorMessage(`Bạn không đủ ${clampedBuyIn.toLocaleString()} PP để tham gia bàn này`);
      return;
    }

    setIsCreating(true);
    const data = await sendAction('create', {
      uid,
      name: user?.name || 'Võ sĩ AYK',
      avatar: user?.avatar || '',
      mode: selectedMode,
      bigBlind: selectedBB,
      buyIn: clampedBuyIn
    });
    setIsCreating(false);
    if (data?.success) {
      playSound('chip');
    }
  };

  const handleJoinRoom = async (targetRoomId: string, minBuy: number) => {
    if ((user?.pp || 0) < minBuy) {
      setErrorMessage(`Bạn cần tối thiểu ${minBuy.toLocaleString()} PP để vào bàn`);
      return;
    }
    const data = await sendAction('join', {
      roomId: targetRoomId,
      uid,
      name: user?.name || 'Võ sĩ AYK',
      avatar: user?.avatar || '',
      buyIn: minBuy
    });
    if (data?.success) {
      setCurrentRoomId(targetRoomId);
      playSound('chip');
    }
  };

  const handleLeaveTable = async () => {
    if (!currentRoomId) return;
    const data = await sendAction('leave', { roomId: currentRoomId, uid });
    if (data?.success) {
      setCurrentRoomId(null);
      setRoom(null);
      setMyHoleCards([]);
      if (data.refunded > 0) {
        onShowResult?.('Rời Bàn Poker', `Đã hoàn lại ${data.refunded.toLocaleString()} chip vào tài khoản PP!`, true);
      }
    }
  };

  const confirmLeaveTable = () => {
    const midHand = !!room && room.round !== 'WAITING' && room.round !== 'SHOWDOWN' && !!mySeat && !mySeat.folded;
    if (midHand && !window.confirm('Ván đang diễn ra. Rời bàn bây giờ sẽ bỏ bài và mất số chip đã cược trong ván này. Vẫn rời bàn?')) return;
    handleLeaveTable();
  };

  const handleStartHand = async () => {
    if (!currentRoomId) return;
    await sendAction('start', { roomId: currentRoomId, uid });
  };

  const handleBettingAction = async (action: 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'ALL_IN', amount?: number) => {
    if (!currentRoomId) return;
    playSound(action === 'FOLD' ? 'fold' : action === 'CHECK' ? 'check' : 'chip');
    await sendAction('action', {
      roomId: currentRoomId,
      uid,
      action,
      amount
    });
  };

  // Calculate Pot Odds for UI display
  const potOddsDisplay = useMemo(() => {
    if (!room || !bettingOptions) return '0 : 1';
    const toCall = bettingOptions.callAmount;
    if (toCall <= 0) return 'Miễn phí';
    const potAfter = room.pot + toCall;
    const ratio = (potAfter / toCall).toFixed(1);
    return `${ratio} : 1`;
  }, [room, bettingOptions]);

  // Render individual card face matching Demo 1 & Demo 2
  const renderCard = (cardStr: string, isFaceDown = false, isTiltLeft = false, isTiltRight = false) => {
    if (isFaceDown) {
      return (
        <div className={`w-8 min-[400px]:w-9 sm:w-11 md:w-13 aspect-[2.5/3.5] rounded-md sm:rounded-lg bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 border border-purple-500/50 shadow-md relative overflow-hidden flex items-center justify-center ${
          isTiltLeft ? '-rotate-6' : isTiltRight ? 'rotate-6' : ''
        }`}>
          {/* Card Back Cyber Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(168,85,247,0.15)_25%,transparent_25%,transparent_50%,rgba(168,85,247,0.15)_50%,rgba(168,85,247,0.15)_75%,transparent_75%,transparent)] bg-[size:8px_8px]" />
          <span className="text-purple-400 text-xs sm:text-sm select-none opacity-80">♠</span>
        </div>
      );
    }

    const card = parseCard(cardStr);
    const isRed = card.suit === 'h' || card.suit === 'd';
    const suitSymbol = card.suit === 'h' ? '♥' : card.suit === 'd' ? '♦' : card.suit === 'c' ? '♣' : '♠';
    const rankLabel = card.rank === 14 ? 'A' : card.rank === 13 ? 'K' : card.rank === 12 ? 'Q' : card.rank === 11 ? 'J' : card.rank;

    return (
      <div className={`w-8 min-[400px]:w-9 sm:w-11 md:w-13 aspect-[2.5/3.5] bg-white rounded-md sm:rounded-lg border border-slate-300 shadow-xl flex flex-col justify-between p-0.5 sm:p-1 relative select-none font-bold ${
        isTiltLeft ? '-rotate-6 hover:rotate-0 transition-transform' : isTiltRight ? 'rotate-6 hover:rotate-0 transition-transform' : ''
      }`}>
        <div className={`text-[10px] sm:text-xs leading-none flex items-center gap-0.5 ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
          <span>{rankLabel}</span>
          <span className="text-[9px] sm:text-[11px]">{suitSymbol}</span>
        </div>
        <div className={`text-base sm:text-xl text-center self-center my-auto ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
          {suitSymbol}
        </div>
        <div className={`text-[10px] sm:text-xs leading-none self-end rotate-180 flex items-center gap-0.5 ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
          <span>{rankLabel}</span>
          <span className="text-[9px] sm:text-[11px]">{suitSymbol}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="game-overlay bg-black/90 backdrop-blur-md font-sans select-none">
      <div className="game-shell game-shell--wide bg-[#05070d] md:border-2 md:border-cyan-500/40 shadow-[0_0_60px_rgba(0,240,255,0.2)]">
      
      {/* 2. DEMO 2: BẢNG XẾP HẠNG BÀI POKER MODAL OVERLAY */}
      {showHandRankModal && (
        <div
          className="absolute inset-0 z-[90] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
          onClick={() => setShowHandRankModal(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[95vh] bg-[#0c101a] border-2 border-cyan-500/50 rounded-2xl p-4 sm:p-6 shadow-[0_0_60px_rgba(0,240,255,0.3)] flex flex-col justify-between relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base sm:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>📖 BẢNG <span className="text-yellow-400">XẾP HẠNG BÀI</span> POKER</span>
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400">
                  Từ mạnh nhất đến yếu nhất · lấy 5 lá tốt nhất từ 2 lá riêng + 5 lá chung
                </p>
              </div>
              <button
                onClick={() => setShowHandRankModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 10 Hand Tiers (2 columns of 5) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 my-3 overflow-y-auto max-h-[72vh] pr-1">
              {HAND_COMPENDIUM_TIERS.map(tier => {
                const isCurrent = myHandEvaluation?.category === tier.cat;

                return (
                  <div
                    key={tier.rank}
                    className={`p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                      isCurrent
                        ? 'bg-amber-950/40 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)] ring-1 ring-yellow-400'
                        : 'bg-black/60 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Rank Number circle */}
                      <div className="w-6 h-6 rounded-full bg-blue-500/30 border border-blue-400 text-blue-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {tier.rank}
                      </div>

                      {/* 5 mini sample cards */}
                      <div className="flex items-center -space-x-1 sm:-space-x-1.5 shrink-0">
                        {tier.cards.map((cStr, idx) => (
                          <div key={idx} className="scale-75 sm:scale-90 origin-left">
                            {renderCard(cStr)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hand title & subtitle */}
                    <div className="text-right min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-black text-white uppercase truncate">
                        {tier.nameVi}
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                        {tier.nameEn}
                      </div>
                      {isCurrent && (
                        <div className="text-[9px] text-emerald-400 font-mono font-bold animate-pulse mt-0.5">
                          ← bài hiện tại của bạn
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer close */}
            <div className="pt-2 text-center">
              <button
                onClick={() => setShowHandRankModal(false)}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-xs uppercase rounded-xl cursor-pointer hover:brightness-125 transition shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              >
                ĐÓNG BẢNG XẾP HẠNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN POKER CONTAINER: FULL-SCREEN LANDSCAPE FRAME */}
      <div className="w-full flex-1 min-h-0 flex flex-col gap-2 p-2 sm:p-3 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0d1627] via-[#070b14] to-[#04060b]">
        
        {/* Subtle Cyber Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

        {/* ===================== TOP HEADER BAR ===================== */}
        <div className="relative z-20 flex items-center justify-between gap-2 shrink-0 min-h-[56px] border-b border-cyan-500/20 px-1 sm:px-2 pb-1">
          
          {/* Left: Exit button & Table Name / Blind */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={currentRoomId ? confirmLeaveTable : onClose}
              className="game-close"
              aria-label="Thoát bàn chơi"
              title="Thoát bàn chơi"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-yellow-400 text-xs sm:text-sm font-black uppercase tracking-wider font-mono flex items-center gap-1 whitespace-nowrap">
                  ♠ POKER<span className="hidden min-[480px]:inline"> TEXAS HOLD'EM</span>
                </span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate">
                {room ? `BÀN #${room.id} · BLIND ${room.smallBlind}/${room.bigBlind}` : 'SẢNH CHỜ POKER S-SYSTEM'}
              </div>
            </div>
          </div>

          {/* Center: Round Pill Badge (PREFLOP, FLOP, TURN, RIVER, SHOWDOWN) */}
          {room && (
            <div className="hidden sm:flex px-3 sm:px-4 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center gap-1.5 animate-pulse">
              <span className="text-[10px] sm:text-xs font-mono font-black text-cyan-300 uppercase tracking-widest">
                {room.round}
              </span>
            </div>
          )}

          {/* Right: PP Balance & Utility Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* PP Balance Pill */}
            <div className="px-2 sm:px-3 py-1 bg-black/80 border border-amber-500/40 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              <span className="text-amber-400 text-xs sm:text-sm">🪙</span>
              <span className="text-xs sm:text-sm font-mono font-black text-[#ffd700] tracking-wide">
                {(user?.pp || 0).toLocaleString()} <span className="text-[10px] text-yellow-500">PP</span>
              </span>
            </div>

            {/* Hand Compendium Book button */}
            <button
              onClick={() => setShowHandRankModal(true)}
              className="game-icon-btn text-yellow-400" aria-label="Bảng xếp hạng bài"
              title="Bảng xếp hạng bài"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Sound toggle button */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="game-icon-btn text-cyan-300" aria-label="Âm thanh"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* Error message banner if any */}
        {errorMessage && (
          <div className="bg-rose-950/90 border border-rose-500/60 px-4 py-1.5 text-rose-200 text-xs text-center flex items-center justify-center gap-2 z-30">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ===================== BODY VIEW: LOBBY OR ACTIVE TABLE ===================== */}
        {!room ? (
          /* ===================== LOBBY VIEW ===================== */
          <div className="flex-1 flex flex-col justify-center items-center p-3 sm:p-6 overflow-y-auto z-10 space-y-4">
            <div className="w-full max-w-4xl bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_40px_rgba(0,240,255,0.15)] space-y-5">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="text-cyan-400">🃏 ĐẤU TRƯỜNG</span> POKER TEXAS HOLD'EM
                  </h2>
                  <p className="text-xs text-slate-300">
                    Bàn cược chuẩn 5 ghế · Tỉ lệ cược thật · AI siêu cấp với 2.000+ mô phỏng Monte Carlo
                  </p>
                </div>

                {/* Mode Selector Tabs */}
                <div className="flex rounded-xl bg-black/60 p-1 border border-white/10">
                  <button
                    onClick={() => setSelectedMode('AI')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono font-black uppercase transition cursor-pointer flex items-center gap-1.5 ${
                      selectedMode === 'AI' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bot className="w-4 h-4" /> Đấu với AI (1+4 Bot)
                  </button>
                  <button
                    onClick={() => setSelectedMode('MULTIPLAYER')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono font-black uppercase transition cursor-pointer flex items-center gap-1.5 ${
                      selectedMode === 'MULTIPLAYER' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" /> Bàn Nhiều Người (2-5)
                  </button>
                </div>
              </div>

              {/* Create Room Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Blind Select */}
                <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2">
                  <label className="text-[10px] font-mono text-cyan-300 font-bold uppercase block">
                    MỨC CƯỢC BIG BLIND (BB)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                    {[50, 100, 200, 500, 1000, 2000].map(bb => (
                      <button
                        key={bb}
                        onClick={() => {
                          setSelectedBB(bb);
                          setBuyInSlider(bb * 50);
                        }}
                        className={`py-1.5 rounded-lg border font-bold transition cursor-pointer ${
                          selectedBB === bb ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-slate-900 text-white border-white/10 hover:border-white/30'
                        }`}
                      >
                        {bb} PP
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Buy-in Slider */}
                <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-yellow-400 font-bold uppercase">MỨC BUY-IN VÀO BÀN</span>
                    <span className="text-white font-black">{buyInSlider.toLocaleString()} PP</span>
                  </div>
                  <input
                    type="range"
                    min={selectedBB * 20}
                    max={selectedBB * 100}
                    step={selectedBB * 5}
                    value={buyInSlider}
                    onChange={e => setBuyInSlider(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>Min: {(selectedBB * 20).toLocaleString()}</span>
                    <span>50x BB</span>
                    <span>Max: {(selectedBB * 100).toLocaleString()}</span>
                  </div>
                </div>

                {/* 3. Action Button */}
                <div className="flex flex-col justify-end">
                  <button
                    onClick={handleCreateRoom}
                    disabled={isCreating}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:brightness-110 text-black font-mono font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.5)] active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isCreating ? 'ĐANG KHỞI TẠO...' : selectedMode === 'AI' ? 'VÀO BÀN ĐẤU AI NGAY' : 'TẠO BÀN POKER MỚI'}</span>
                  </button>
                </div>
              </div>

              {/* Multiplayer Room List */}
              {selectedMode === 'MULTIPLAYER' && (
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                    DANH SÁCH BÀN ĐANG HOẠT ĐỘNG
                  </span>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {lobbyRooms.filter(r => r.mode === 'MULTIPLAYER').length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 font-mono">
                        Chưa có bàn chơi nhiều người nào. Hãy bấm "TẠO BÀN POKER MỚI" ở trên!
                      </div>
                    ) : (
                      lobbyRooms.filter(r => r.mode === 'MULTIPLAYER').map(lr => {
                        const seatedCount = lr.seats.filter(s => s !== null).length;
                        return (
                          <div
                            key={lr.id}
                            className="p-2.5 bg-black/60 border border-white/10 hover:border-cyan-500/50 rounded-xl flex items-center justify-between gap-3 transition"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-yellow-400 font-mono font-bold text-xs">#{lr.id}</span>
                              <span className="text-xs font-bold text-white">{lr.name}</span>
                              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-mono">
                                Blind {lr.smallBlind}/{lr.bigBlind}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {seatedCount}/5 Ghế
                              </span>
                            </div>

                            <button
                              onClick={() => handleJoinRoom(lr.id, lr.minBuyIn)}
                              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-black text-xs uppercase rounded-lg transition cursor-pointer"
                            >
                              VÀO BÀN
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ===================== ACTIVE POKER TABLE VIEW (DEMO 1) ===================== */
          <div className="flex-1 min-h-0 flex flex-col min-[700px]:flex-row gap-2 relative overflow-hidden p-1 z-10">
            
            {/* 3A. OVAL POKER TABLE AREA (LEFT & CENTER) */}
            <div className="flex-1 min-h-0 min-w-0 relative flex items-center justify-center overflow-hidden">
              
              {/* OVAL FELT CONTAINER */}
              <div className="w-[98%] h-[96%] min-[700px]:w-[96%] min-[700px]:h-[88%] rounded-[56px] min-[700px]:rounded-[180px] bg-gradient-to-b from-[#0e5c36] via-[#094125] to-[#042414] border-[6px] border-[#02130a] shadow-[0_0_80px_rgba(0,240,255,0.25)] relative flex items-center justify-center">
                
                {/* Glowing Cyan/Neon Inner Ring matching Demo 1 */}
                <div className="absolute inset-1.5 rounded-[50px] min-[700px]:rounded-[174px] border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.6)] pointer-events-none" />

                {/* Watermark in center */}
                <div className="absolute text-[32px] sm:text-[42px] font-mono font-black text-white/[0.04] uppercase tracking-[12px] select-none pointer-events-none">
                  AYK POKER
                </div>

                {/* CENTER AREA: POT BADGE + 5 COMMUNITY CARDS */}
                <div className="flex flex-col items-center gap-2 sm:gap-3 z-10 max-[699px]:mt-10">
                  {/* POT BADGE (Demo 1: Golden Pill POT 1.850 PP) */}
                  <div className="px-3.5 sm:px-5 py-1 rounded-full bg-black/80 border-2 border-amber-400/90 shadow-[0_0_25px_rgba(250,204,21,0.6)] flex items-center gap-2 animate-pulse">
                    <span className="text-yellow-400 text-xs sm:text-sm">🪙</span>
                    <span className="text-xs sm:text-sm font-mono font-black text-yellow-300 uppercase tracking-wider">
                      POT {room.pot.toLocaleString()} PP
                    </span>
                  </div>

                  {/* 5 COMMUNITY CARDS */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {[0, 1, 2, 3, 4].map(idx => {
                      const cardStr = room.board[idx];
                      if (!cardStr) {
                        // Empty slot placeholder
                        return (
                          <div
                            key={idx}
                            className="w-8 min-[400px]:w-9 sm:w-11 md:w-13 aspect-[2.5/3.5] rounded-md sm:rounded-lg border border-dashed border-emerald-500/30 bg-black/20 flex items-center justify-center text-emerald-500/20 text-xs"
                          >
                            ♠
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="animate-fadeIn">
                          {renderCard(cardStr)}
                        </div>
                      );
                    })}

                    {/* Table current street bet indicator */}
                    {room.highestBet > 0 && (
                      <div className="ml-1 sm:ml-2 px-2 py-0.5 rounded-full bg-black/70 border border-rose-500/60 text-rose-300 font-mono text-[9px] sm:text-[10px] font-bold flex items-center gap-1 shadow">
                        <span>🔴</span> {room.highestBet.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* WAITING (multiplayer lobby) / SHOWDOWN WINNERS BANNER */}
                {room.round === 'WAITING' && (
                  <div className="absolute inset-x-0 top-[22%] z-30 flex flex-col items-center gap-2 px-4 text-center">
                    <span className="px-3 py-1 rounded-full bg-black/80 border border-cyan-400/60 text-cyan-200 text-xs font-mono font-bold">
                      Đang chờ người chơi · {room.seats.filter(Boolean).length}/5 ghế
                    </span>
                    {room.creator === uid ? (
                      <button
                        onClick={handleStartHand}
                        disabled={loadingAction || room.seats.filter(st => st && st.chips > 0).length < 2}
                        className="tap-wide px-6 min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-black font-black text-sm uppercase tracking-wider disabled:opacity-40 shadow-[0_0_20px_rgba(52,211,153,0.5)]"
                      >
                        ▶ BẮT ĐẦU VÁN
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-300">Chờ chủ bàn ({room.creatorName}) bắt đầu ván…</span>
                    )}
                  </div>
                )}
                {room.round === 'SHOWDOWN' && room.winners && room.winners.length > 0 && (
                  <div className="absolute inset-x-2 top-[24%] z-30 flex flex-col items-center gap-1 pointer-events-none">
                    {room.winners.map(w => (
                      <div key={w.uid} className="px-3 py-1.5 rounded-xl bg-black/90 border-2 border-yellow-400/80 shadow-[0_0_25px_rgba(250,204,21,0.5)] text-center max-w-full">
                        <div className="text-[11px] sm:text-sm font-black text-yellow-300 truncate">
                          🏆 {w.uid === uid ? 'BẠN' : w.name} +{w.amount.toLocaleString()} PP
                        </div>
                        <div className="text-[9px] sm:text-[10px] font-mono text-emerald-300 truncate">{w.handDesc}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5 SEATS POSITIONED AROUND OVAL */}
                {visualSeats.map(item => {
                  const { seat, visualPos, originalIndex } = item;
                  const isCurrentTurn = room.currentTurnSeat === originalIndex;
                  const isDealer = room.dealerSeat === originalIndex;

                  // Positions for 5 seats (0: Bottom-Center, 1: Left-Middle, 2: Top-Left, 3: Top-Right, 4: Right-Middle)
                  const posClasses = [
                    'bottom-1 left-1.5 min-[700px]:left-[10%]',                                                       // 0: Me (bottom-left, hole cards sit at bottom-centre)
                    'left-1 top-[42%] -translate-y-1/2 min-[700px]:left-2 min-[700px]:top-1/2 min-[700px]:-translate-y-1/2', // 1: Left-Middle
                    'left-3 top-1 min-[700px]:left-[24%] min-[700px]:top-2',                                         // 2: Top-Left
                    'right-3 top-1 min-[700px]:right-[24%] min-[700px]:top-2',                                       // 3: Top-Right
                    'right-1 top-[42%] -translate-y-1/2 min-[700px]:right-2 min-[700px]:top-1/2 min-[700px]:-translate-y-1/2', // 4: Right-Middle
                  ][visualPos];

                  if (!seat) {
                    return (
                      <div key={visualPos} className={`absolute ${posClasses} z-20 flex flex-col items-center`}>
                        <div className="w-10 h-10 rounded-full border border-dashed border-white/20 bg-black/40 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                          Trống
                        </div>
                      </div>
                    );
                  }

                  const isMe = seat.uid === uid;
                  const initials = seat.name.slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={visualPos}
                      className={`absolute ${posClasses} z-20 flex flex-col items-center transition-all duration-300 ${
                        seat.folded ? 'opacity-40 grayscale' : ''
                      }`}
                    >
                      {/* Status Badges: ALL-IN or BỎ BÀI */}
                      {seat.allIn && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono font-black text-[8px] uppercase tracking-wider mb-1 animate-pulse shadow-md">
                          ALL-IN
                        </span>
                      )}
                      {seat.folded && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-bold text-[8px] uppercase mb-1">
                          BỎ BÀI
                        </span>
                      )}

                      {/* Avatar Circle with Countdown Timer Ring */}
                      <div className="relative">
                        {/* Countdown ring when it is this seat's turn */}
                        {isCurrentTurn && (
                          <div className="absolute -inset-1.5 rounded-full border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-spin" style={{ animationDuration: '6s' }} />
                        )}

                        {/* Avatar */}
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 flex items-center justify-center font-bold text-xs sm:text-sm text-white shadow-lg ${
                          isMe
                            ? 'bg-gradient-to-br from-cyan-600 to-blue-700 border-cyan-400'
                            : 'bg-gradient-to-br from-slate-800 to-slate-900 border-white/30'
                        }`}>
                          {seat.avatar && seat.avatar.trim() ? (
                            <img src={seat.avatar.trim()} alt={seat.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>

                        {/* Turn Timer Badge (e.g. 12s) */}
                        {isCurrentTurn && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-black font-mono font-black text-[9px] flex items-center justify-center shadow border border-black animate-bounce">
                            {secondsRemaining}
                          </div>
                        )}

                        {/* Dealer Button 'D' */}
                        {isDealer && (
                          <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-yellow-400 text-black font-mono font-black text-[9px] flex items-center justify-center shadow-md border border-black">
                            D
                          </div>
                        )}
                      </div>

                      {/* Name & Chips Pill */}
                      <div className="mt-1 px-2 py-0.5 rounded-lg bg-black/80 border border-white/10 text-center max-w-[85px] sm:max-w-[105px]">
                        <span className="block text-[9px] sm:text-[10px] font-bold text-white truncate">
                          {isMe ? 'Bạn · AYK' : seat.name}
                        </span>
                        <span className="block text-[8px] sm:text-[9px] font-mono text-[#ffd700] font-black">
                          🪙 {seat.chips.toLocaleString()}
                        </span>
                      </div>

                      {/* Current Bet Chips on Table */}
                      {seat.currentBet > 0 && (
                        <div className="mt-0.5 px-1.5 py-0.2 rounded-full bg-black/80 border border-amber-400/50 text-[#ffd700] font-mono text-[8px] font-bold flex items-center gap-1 shadow">
                          <span>🔴</span> {seat.currentBet.toLocaleString()}
                        </div>
                      )}

                      {/* Opponent's Cards (Face Down or Revealed on Showdown) */}
                      {!isMe && (
                        <div className={`items-center -space-x-3.5 sm:-space-x-2 mt-0.5 max-w-[48px] sm:max-w-none justify-center z-10 ${room.revealedCards && room.revealedCards[seat.uid] ? 'flex' : 'hidden min-[700px]:flex'}`}>
                          {room.revealedCards && room.revealedCards[seat.uid] ? (
                            room.revealedCards[seat.uid].map((cStr, cIdx) => (
                              <div key={cIdx} className="scale-[0.44] min-[400px]:scale-[0.5] sm:scale-75 origin-top shrink-0 -mx-2 sm:mx-0">
                                {renderCard(cStr)}
                              </div>
                            ))
                          ) : (
                            <>
                              <div className="scale-[0.6] sm:scale-90 origin-center -mx-1 sm:mx-0">
                                {renderCard('XX', true, true, false)}
                              </div>
                              <div className="scale-[0.6] sm:scale-90 origin-center -mx-1 sm:mx-0">
                                {renderCard('XX', true, false, true)}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Last Action Pill */}
                      {seat.lastAction && (
                        <span className="text-[7.5px] font-mono font-bold text-cyan-300 bg-black/70 px-1.5 rounded mt-0.5">
                          {seat.lastAction}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* MY HOLE CARDS & HAND NAME BADGE (BOTTOM CENTER - PROMINENT) */}
                {mySeat && myHoleCards.length === 2 && (
                  <div className="absolute bottom-2 right-2 min-[700px]:right-auto min-[700px]:left-1/2 min-[700px]:-translate-x-1/2 z-30 flex items-center gap-2 sm:gap-3">
                    {/* 2 Player Hole Cards with Yellow Glow */}
                    <div className="flex items-center -space-x-3 filter drop-shadow-[0_0_12px_rgba(250,204,21,0.7)]">
                      {renderCard(myHoleCards[0], false, true, false)}
                      {renderCard(myHoleCards[1], false, false, true)}
                    </div>

                    {/* Hand Name Label Box matching Demo 1 */}
                    {myHandEvaluation && (
                      <div className="bg-black/90 border-2 border-yellow-500/70 p-2 sm:p-2.5 rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] min-w-[104px] sm:min-w-[120px] text-left">
                        <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-widest">
                          BÀI CỦA BẠN
                        </span>
                        <span className="block text-xs sm:text-sm font-black text-yellow-300 uppercase tracking-wider font-sans">
                          {myHandEvaluation.shortDesc}
                        </span>
                        <span className="block text-[8.5px] font-mono text-emerald-400 font-semibold truncate">
                          {myHandEvaluation.nameEn}
                        </span>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* 3B. RIGHT CONTROL COLUMN (BET SLIDER, PRESETS & ACTION BUTTONS) */}
            <div className="w-full min-[700px]:w-64 shrink-0 flex flex-col gap-2 min-[700px]:justify-between bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-2.5 sm:p-3 relative z-20 shadow-2xl font-mono">
              
              {/* TOP: TỐ ĐẾN & AMOUNT */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">TỐ ĐẾN</span>
                  <span className="text-base font-black text-[#ffd700] tracking-wider">
                    {customRaiseAmount.toLocaleString()} PP
                  </span>
                </div>

                {/* SLIDER */}
                <input
                  type="range"
                  min={bettingOptions?.minRaiseTotal || 200}
                  max={bettingOptions?.maxRaiseTotal || 5000}
                  step={room?.bigBlind || 50}
                  value={customRaiseAmount}
                  onChange={e => setCustomRaiseAmount(Number(e.target.value))}
                  disabled={!bettingOptions?.canRaise}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />

                {/* 4 PRESET BUTTONS (½ POT, ¾ POT, POT, ALL-IN) */}
                <div className="grid grid-cols-4 min-[700px]:grid-cols-2 gap-1.5">
                  <button
                    onClick={() => bettingOptions && setCustomRaiseAmount(bettingOptions.halfPotRaiseTotal)}
                    disabled={!bettingOptions?.canRaise}
                    className="py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-white/10 rounded-lg text-xs font-bold text-slate-300 cursor-pointer transition active:scale-95"
                  >
                    ½ POT
                  </button>
                  <button
                    onClick={() => bettingOptions && setCustomRaiseAmount(bettingOptions.threeQuarterPotRaiseTotal)}
                    disabled={!bettingOptions?.canRaise}
                    className="py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-white/10 rounded-lg text-xs font-bold text-slate-300 cursor-pointer transition active:scale-95"
                  >
                    ¾ POT
                  </button>
                  <button
                    onClick={() => bettingOptions && setCustomRaiseAmount(bettingOptions.potRaiseTotal)}
                    disabled={!bettingOptions?.canRaise}
                    className="py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-white/10 rounded-lg text-xs font-bold text-slate-300 cursor-pointer transition active:scale-95"
                  >
                    POT
                  </button>
                  <button
                    onClick={() => bettingOptions && setCustomRaiseAmount(bettingOptions.maxRaiseTotal)}
                    disabled={!bettingOptions?.canAllIn}
                    className="py-2 bg-rose-950/60 hover:bg-rose-900/80 disabled:opacity-30 border border-rose-500/40 rounded-lg text-xs font-black text-rose-400 cursor-pointer transition active:scale-95"
                  >
                    ALL-IN
                  </button>
                </div>

                {/* STATS: Tối thiểu tố & Pot odds */}
                <div className="hidden min-[700px]:block pt-1 border-t border-white/5 space-y-1 text-[10px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Tối thiểu tố</span>
                    <span className="text-cyan-300 font-bold">
                      {bettingOptions?.minRaiseTotal.toLocaleString() || '---'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Pot odds</span>
                    <span className="text-cyan-300 font-bold">{potOddsDisplay}</span>
                  </div>
                </div>
              </div>

              {/* BOTTOM: 3 BIG ACTION BUTTONS matching Demo 1 */}
              <div className="grid grid-cols-3 min-[700px]:grid-cols-1 gap-1.5 pt-1 min-[700px]:pt-2">
                
                {/* 1. TỐ BUTTON (Yellow) */}
                <button
                  onClick={() => handleBettingAction('RAISE', customRaiseAmount)}
                  disabled={!bettingOptions?.canRaise || loadingAction}
                  className="w-full min-h-[52px] order-3 min-[700px]:order-none py-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:brightness-110 disabled:opacity-25 text-black font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(250,204,21,0.5)] active:scale-95 flex flex-col items-center justify-center leading-tight"
                >
                  <span className="text-sm font-black">TỐ</span>
                  <span className="text-[9px] font-bold">{customRaiseAmount.toLocaleString()} PP</span>
                </button>

                {/* 2. THEO / CHECK BUTTON (Cyan) */}
                {bettingOptions?.canCheck ? (
                  <button
                    onClick={() => handleBettingAction('CHECK')}
                    disabled={loadingAction}
                    className="w-full min-h-[52px] order-2 min-[700px]:order-none py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 disabled:opacity-25 text-black font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-95 flex flex-col items-center justify-center leading-tight"
                  >
                    <span className="text-sm font-black">CHECK</span>
                    <span className="text-[9px] font-bold">MIỄN PHÍ</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleBettingAction('CALL')}
                    disabled={!bettingOptions?.canCall || loadingAction}
                    className="w-full min-h-[52px] order-2 min-[700px]:order-none py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 disabled:opacity-25 text-black font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-95 flex flex-col items-center justify-center leading-tight"
                  >
                    <span className="text-sm font-black">THEO</span>
                    <span className="text-[9px] font-bold">{bettingOptions?.callAmount.toLocaleString()} PP</span>
                  </button>
                )}

                {/* 3. BỎ BÀI BUTTON (Red) */}
                <button
                  onClick={() => handleBettingAction('FOLD')}
                  disabled={!mySeat || mySeat.folded || room.round === 'WAITING' || room.round === 'SHOWDOWN' || loadingAction}
                  className="w-full min-h-[52px] order-1 min-[700px]:order-none py-2 bg-rose-950/60 hover:bg-rose-900/80 disabled:opacity-25 border border-rose-500/60 text-rose-400 hover:text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer active:scale-95 flex flex-col items-center justify-center leading-tight"
                >
                  <span className="text-xs font-black">BỎ BÀI</span>
                  <span className="text-[8px] font-mono">FOLD</span>
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
      </div>
    </div>
  );
}
