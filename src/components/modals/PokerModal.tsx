/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Texas Hold'em Poker Modal
 * Responsive Mobile & Desktop Layout (Part A) + Enhanced Game Features (Part B)
 * 
 * Part A:
 * - Minimum 11px font size on mobile for names, chips, actions
 * - Opponent hole cards always visible on mobile
 * - Dynamic viewport height (dvh) & custom layout for short landscape (< 500px)
 * - Action buttons >= 52px with safe-area-inset-bottom
 * - Raise slider +/- 1 BB buttons for accurate mobile adjustment
 * - Preserves laptop/desktop layout (>= 700px)
 * 
 * Part B:
 * - Bot Difficulty: EASY / NORMAL / HARD with distinct playstyles and Monte Carlo simulations
 * - Quick Emotes (8 symbols: 👍 😂 😱 🔥 😎 😭 GG ⏰) with 3s cooldown & avatar speech bubbles
 * - Big Win celebration (pot >= 20 BB) with canvas-confetti & celebratory banner
 * - Hand History panel (up to 10 hands) showing winnings and winning hand descriptions
 * - Personal Poker Stats (games, win rate, biggest pot, best hand)
 * - Beginner Hint Mode (AI equity estimate + Vietnamese advice)
 * - Multiplayer turn timer options (15s / 30s / 45s)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  BookOpen,
  Volume2,
  VolumeX,
  ChevronLeft,
  Plus,
  ShieldAlert,
  Bot,
  Users,
  Lightbulb,
  History,
  BarChart2,
  Smile,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Play
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ref, onValue, off } from 'firebase/database';
import { db, fetchWithAuth } from '../../firebase';
import { User, PokerRoom, PokerSeat, PokerDifficulty, PokerHistoryItem } from '../../types';
import {
  parseCard,
  evaluateHand,
  getBettingOptions,
  HandEvaluation,
  BettingOptions
} from '../../poker/pokerEngine';
import { estimateEquityMonteCarlo, evaluatePreflopScore } from '../../poker/pokerAI';
import { normalizePokerRoom } from '../../poker/pokerRoomUtil';

interface PokerModalProps {
  uid: string;
  user: User | null;
  onClose: () => void;
  onShowResult?: (title: string, message: string, isWin: boolean) => void;
  previewRoom?: PokerRoom;
  previewHole?: string[];
}

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

const EMOTE_LIST = ['👍', '😂', '😱', '🔥', '😎', '😭', 'GG', '⏰'] as const;

interface PersonalPokerStats {
  handsPlayed: number;
  handsWon: number;
  biggestPot: number;
  bestHandName: string;
  bestHandRank: number; // 1 (best) to 10 (weakest), 11 none
}

export default function PokerModal({ uid, user, onClose, onShowResult, previewRoom, previewHole }: PokerModalProps) {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(previewRoom ? previewRoom.id : null);
  const [room, setRoom] = useState<PokerRoom | null>(previewRoom ? normalizePokerRoom(previewRoom) : null);
  const [myHoleCards, setMyHoleCards] = useState<string[]>(previewHole || []);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Modals & Drawers
  const [showHandRankModal, setShowHandRankModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState<boolean>(false);
  const [showEmotePicker, setShowEmotePicker] = useState<boolean>(false);
  const [showBeginnerHints, setShowBeginnerHints] = useState<boolean>(true);

  // Big Win Banner state
  const [bigWinBanner, setBigWinBanner] = useState<{ winnerName: string; amount: number; isMe: boolean } | null>(null);
  const lastBigWinHandRef = useRef<number>(-1);
  const lastHandRecordedRef = useRef<number>(-1);

  // Emote cooldown timer
  const [emoteCooldownUntil, setEmoteCooldownUntil] = useState<number>(0);
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  // Personal Stats (Separated between Real PP games and Practice chip games)
  const [statsTab, setStatsTab] = useState<'REAL' | 'PRACTICE'>('REAL');
  const [realStats, setRealStats] = useState<PersonalPokerStats>(() => {
    if (typeof window === 'undefined') {
      return { handsPlayed: 0, handsWon: 0, biggestPot: 0, bestHandName: 'Chưa có', bestHandRank: 11 };
    }
    try {
      const saved = localStorage.getItem(`ayk_poker_stats_${uid}_real`) || localStorage.getItem(`ayk_poker_stats_${uid}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { handsPlayed: 0, handsWon: 0, biggestPot: 0, bestHandName: 'Chưa có', bestHandRank: 11 };
  });

  const [practiceStats, setPracticeStats] = useState<PersonalPokerStats>(() => {
    if (typeof window === 'undefined') {
      return { handsPlayed: 0, handsWon: 0, biggestPot: 0, bestHandName: 'Chưa có', bestHandRank: 11 };
    }
    try {
      const saved = localStorage.getItem(`ayk_poker_stats_${uid}_practice`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { handsPlayed: 0, handsWon: 0, biggestPot: 0, bestHandName: 'Chưa có', bestHandRank: 11 };
  });

  // Responsive short screen detection (< 500px height for landscape mobile)
  const [isShortScreen, setIsShortScreen] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerHeight < 500 : false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsShortScreen(window.innerHeight < 500);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Periodic ticker to expire emote bubbles & update timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Lobby & Create Room State
  const [lobbyRooms, setLobbyRooms] = useState<PokerRoom[]>([]);
  const [selectedMode, setSelectedMode] = useState<'AI' | 'MULTIPLAYER'>('AI');
  const [selectedBB, setSelectedBB] = useState<number>(100);
  const [buyInSlider, setBuyInSlider] = useState<number>(5000);
  const [aiDifficulty, setAiDifficulty] = useState<PokerDifficulty>('NORMAL');
  const [turnTimeLimit, setTurnTimeLimit] = useState<number>(30);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // In-Game Raise Slider Value
  const [customRaiseAmount, setCustomRaiseAmount] = useState<number>(200);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);

  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => () => { audioCtxRef.current?.close().catch(() => {}); audioCtxRef.current = null; }, []);

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
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.12);
        osc.frequency.setValueAtTime(783.99, now + 0.24);
        osc.frequency.setValueAtTime(1046.50, now + 0.36);
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
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch (e) {}
  };

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
  }, [previewRoom]);

  useEffect(() => {
    if (!currentRoomId || previewRoom) return;

    const roomRef = ref(db, `poker_rooms/${currentRoomId}`);
    const unsubRoom = onValue(roomRef, (snap) => {
      if (snap.exists()) {
        const rData = normalizePokerRoom(snap.val() as PokerRoom);
        setRoom(rData);

        if (rData.round === 'FLOP' || rData.round === 'TURN' || rData.round === 'RIVER') {
          playSound('deal');
        } else if (rData.round === 'SHOWDOWN') {
          playSound('win');
        }
      } else {
        setRoom(null);
        setCurrentRoomId(null);
      }
    });

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
  }, [currentRoomId, uid, previewRoom]);

  // Turn timeout watcher
  useEffect(() => {
    if (!room || room.round === 'WAITING' || room.round === 'SHOWDOWN' || room.currentTurnSeat === null) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((room.actionExpiry - now) / 1000));
      setSecondsRemaining(diff);

      if (diff === 0 && room.currentTurnSeat !== null) {
        fetchWithAuth('/api/poker/check_timeout', {
          method: 'POST',
          body: JSON.stringify({ roomId: room.id })
        }).catch(() => {});
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room]);

  const mySeatIndex = useMemo(() => {
    if (!room) return -1;
    return room.seats.findIndex(s => s?.uid === uid);
  }, [room, uid]);

  const mySeat = mySeatIndex !== -1 && room ? room.seats[mySeatIndex] : null;
  const unitLabel = room?.practice ? 'chip' : 'PP';

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

  const myHandEvaluation = useMemo<HandEvaluation | null>(() => {
    if (!room || myHoleCards.length !== 2) return null;
    const allKnown = [...myHoleCards, ...room.board].map(parseCard);
    if (allKnown.length < 5) {
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

  const bettingOptions = useMemo<BettingOptions | null>(() => {
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

  useEffect(() => {
    if (bettingOptions) {
      setCustomRaiseAmount(bettingOptions.minRaiseTotal);
    }
  }, [bettingOptions?.minRaiseTotal]);

  // Big Win Detection (pot >= 20 BB) & Personal Stats Update
  useEffect(() => {
    if (!room || room.round !== 'SHOWDOWN' || !room.winners || room.winners.length === 0) {
      return;
    }
    const currentHand = room.handCount || 1;

    // 1. Big Win Confetti & Banner
    const isBigPot = room.winners.some(w => w.amount >= room.bigBlind * 20);
    if (isBigPot && lastBigWinHandRef.current !== currentHand) {
      lastBigWinHandRef.current = currentHand;
      const primaryWinner = room.winners[0];
      setBigWinBanner({
        winnerName: primaryWinner.name,
        amount: primaryWinner.amount,
        isMe: primaryWinner.uid === uid
      });

      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.55 },
          zIndex: 9999
        });
      } catch (e) {}

      setTimeout(() => {
        setBigWinBanner(null);
      }, 5000);
    }

    // 2. Personal Stats Update (Separated strictly between practice and real stakes)
    if (mySeat && !mySeat.left && lastHandRecordedRef.current !== currentHand) {
      lastHandRecordedRef.current = currentHand;
      const isPracticeHand = room.practice === true;

      const updateStatsFn = (prev: PersonalPokerStats): PersonalPokerStats => {
        const nextPlayed = prev.handsPlayed + 1;
        const myWin = room.winners?.find(w => w.uid === uid);
        const nextWon = myWin ? prev.handsWon + 1 : prev.handsWon;
        const nextBiggest = myWin ? Math.max(prev.biggestPot, myWin.amount) : prev.biggestPot;

        let nextRank = prev.bestHandRank;
        let nextHandName = prev.bestHandName;
        if (myHandEvaluation && myHandEvaluation.categoryRank < prev.bestHandRank) {
          nextRank = myHandEvaluation.categoryRank;
          nextHandName = `${myHandEvaluation.nameVi} (${myHandEvaluation.shortDesc})`;
        }

        const updated: PersonalPokerStats = {
          handsPlayed: nextPlayed,
          handsWon: nextWon,
          biggestPot: nextBiggest,
          bestHandName: nextHandName,
          bestHandRank: nextRank
        };

        try {
          const key = isPracticeHand ? `ayk_poker_stats_${uid}_practice` : `ayk_poker_stats_${uid}_real`;
          localStorage.setItem(key, JSON.stringify(updated));
        } catch (e) {}

        return updated;
      };

      if (isPracticeHand) {
        setPracticeStats(updateStatsFn);
      } else {
        setRealStats(updateStatsFn);
      }
    }
  }, [room, mySeat, uid, myHandEvaluation]);

  // Beginner AI Equity Calculation & Advice
  const beginnerHint = useMemo(() => {
    if (!showBeginnerHints || !room || myHoleCards.length !== 2 || mySeat?.folded) {
      return null;
    }
    const hole = myHoleCards.map(parseCard);
    const board = room.board.map(parseCard);
    const activeCount = room.seats.filter(s => s && !s.folded && s.uid !== uid).length;

    let equity = 0.5;
    if (board.length === 0) {
      equity = evaluatePreflopScore(hole[0], hole[1]);
    } else {
      const sim = estimateEquityMonteCarlo(hole, board, Math.max(1, activeCount), 200);
      equity = sim.equity;
    }

    const eqPercent = Math.round(equity * 100);
    let recommendation = 'THEO / CHECK';
    let recColor = 'text-cyan-400';
    let explanation = `Tỉ lệ thắng ước lượng ~${eqPercent}%. Bài có tiềm năng tốt, nên xem thêm bài chung.`;

    if (equity >= 0.70) {
      recommendation = bettingOptions?.canRaise ? 'TỐ / TẤT TAY' : 'THEO (CALL)';
      recColor = 'text-emerald-400';
      explanation = `Bài của bạn rất mạnh (~${eqPercent}% thắng). Hãy nâng cược để tối đa hóa pot!`;
    } else if (equity < 0.35) {
      if (bettingOptions?.canCheck) {
        recommendation = 'CHECK MIỄN PHÍ';
        recColor = 'text-yellow-400';
        explanation = `Tỉ lệ thắng khá thấp (~${eqPercent}%). Check miễn phí, tuyệt đối không nên cược thêm.`;
      } else {
        recommendation = 'BỎ BÀI (FOLD)';
        recColor = 'text-rose-400';
        explanation = `Tỉ lệ thắng thấp (~${eqPercent}%), đối thủ đang cược. Nên bỏ bài để bảo toàn số chip.`;
      }
    } else if (bettingOptions?.canCheck) {
      recommendation = 'CHECK (XEM BÀI)';
      recColor = 'text-cyan-400';
      explanation = `Tỉ lệ thắng trung bình (~${eqPercent}%). Check để quan sát tiếp nước đi của đối phương.`;
    }

    return {
      equityPercent: eqPercent,
      recommendation,
      recColor,
      explanation
    };
  }, [showBeginnerHints, room, myHoleCards, mySeat, bettingOptions, uid]);

  const sendAction = async (endpoint: string, payload: any) => {
    setLoadingAction(true);
    setErrorMessage('');
    const token = localStorage.getItem('s88_sessionToken') || user?.sessionToken || '';
    const actionId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res = await fetchWithAuth(`/api/poker/${endpoint}`, {
        method: 'POST',
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

  const handleCreateRoom = async () => {
    const isPracticeMode = selectedMode === 'AI' && (aiDifficulty === 'EASY' || aiDifficulty === 'NORMAL');
    const minBuy = selectedBB * 20;
    const maxBuy = selectedBB * 100;
    const clampedBuyIn = Math.max(minBuy, Math.min(maxBuy, buyInSlider));

    if (!isPracticeMode && (user?.pp || 0) < clampedBuyIn) {
      setErrorMessage(`Bạn không đủ ${clampedBuyIn.toLocaleString()} PP để tham gia bàn này`);
      return;
    }

    setIsCreating(true);
    const data = await sendAction('create', {
      uid,
      name: user?.name || 'Võ sĩ AYK',
      avatar: user?.avatar || '',
      mode: selectedMode,
      bigBlind: isPracticeMode ? 100 : selectedBB,
      buyIn: isPracticeMode ? 5000 : clampedBuyIn,
      difficulty: selectedMode === 'AI' ? aiDifficulty : undefined,
      turnTimeLimit: selectedMode === 'MULTIPLAYER' ? turnTimeLimit : 20
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
    const wasPractice = room?.practice;
    const data = await sendAction('leave', { roomId: currentRoomId, uid });
    if (data?.success) {
      setCurrentRoomId(null);
      setRoom(null);
      setMyHoleCards([]);
      if (data.refunded > 0) {
        onShowResult?.('Rời Bàn Poker', `Đã hoàn lại ${data.refunded.toLocaleString()} chip vào tài khoản PP!`, true);
      } else if (wasPractice) {
        onShowResult?.('Rời Bàn Poker', 'Đã rời bàn Luyện Tập. Chip ảo đã được giải phóng.', false);
      }
    }
  };

  const handleRebuyPractice = async () => {
    if (!currentRoomId) return;
    const data = await sendAction('rebuy_practice', { roomId: currentRoomId, uid });
    if (data?.success) {
      playSound('chip');
    }
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

  // Adjust raise slider by +/- 1 BB
  const stepBB = room?.bigBlind || 50;
  const handleStepRaise = (deltaBB: number) => {
    if (!bettingOptions) return;
    const delta = deltaBB * stepBB;
    setCustomRaiseAmount(prev => {
      const nextVal = prev + delta;
      return Math.max(bettingOptions.minRaiseTotal, Math.min(bettingOptions.maxRaiseTotal, nextVal));
    });
  };

  // Quick Emote Send (rate limited: 1 per 3s)
  const handleSendEmote = async (emoji: string) => {
    if (!currentRoomId || Date.now() < emoteCooldownUntil) return;
    setEmoteCooldownUntil(Date.now() + 3000);
    setShowEmotePicker(false);
    await sendAction('emote', {
      roomId: currentRoomId,
      uid,
      emote: emoji
    });
  };

  const potOddsDisplay = useMemo(() => {
    if (!room || !bettingOptions) return '0 : 1';
    const toCall = bettingOptions.callAmount;
    if (toCall <= 0) return 'Miễn phí';
    const potAfter = room.pot + toCall;
    const ratio = (potAfter / toCall).toFixed(1);
    return `${ratio} : 1`;
  }, [room, bettingOptions]);

  const renderCard = (cardStr: string, isFaceDown = false, isTiltLeft = false, isTiltRight = false) => {
    if (isFaceDown) {
      return (
        <div className={`w-8 min-[400px]:w-9 sm:w-11 md:w-13 aspect-[2.5/3.5] rounded-md sm:rounded-lg bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 border border-purple-500/50 shadow-md relative overflow-hidden flex items-center justify-center shrink-0 ${
          isTiltLeft ? '-rotate-6' : isTiltRight ? 'rotate-6' : ''
        }`}>
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
      <div className={`w-8 min-[400px]:w-9 sm:w-11 md:w-13 aspect-[2.5/3.5] bg-white rounded-md sm:rounded-lg border border-slate-300 shadow-xl flex flex-col justify-between p-0.5 sm:p-1 relative select-none font-bold shrink-0 ${
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
    <div className="game-overlay bg-black/90 backdrop-blur-md font-sans select-none min-h-[100dvh] h-[100dvh]">
      <div className="game-shell game-shell--wide bg-[#05070d] md:border-2 md:border-cyan-500/40 shadow-[0_0_60px_rgba(0,240,255,0.2)] h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden">
      
      {/* 1. BIG WIN BANNER OVERLAY */}
      {bigWinBanner && (
        <div className="absolute inset-x-0 top-16 z-[95] flex justify-center px-4 pointer-events-none animate-bounce">
          <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black border-2 border-white shadow-[0_0_50px_rgba(250,204,21,0.9)] flex items-center gap-3">
            <Sparkles className="w-6 h-6 animate-spin" />
            <div className="text-center">
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest block">
                🎉 THẮNG LỚN! POT KHỦNG 20+ BB 🎉
              </span>
              <span className="text-base sm:text-xl font-mono font-black block">
                {bigWinBanner.isMe ? 'BẠN ĐÃ ĂN TRỌN' : bigWinBanner.winnerName} +{bigWinBanner.amount.toLocaleString()} {unitLabel}!
              </span>
            </div>
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
        </div>
      )}

      {/* 2. DEMO 2: BẢNG XẾP HẠNG BÀI POKER MODAL OVERLAY */}
      {showHandRankModal && (
        <div
          className="absolute inset-0 z-[90] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
          onClick={() => setShowHandRankModal(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[92dvh] bg-[#0c101a] border-2 border-cyan-500/50 rounded-2xl p-4 sm:p-6 shadow-[0_0_60px_rgba(0,240,255,0.3)] flex flex-col justify-between relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base sm:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>📖 BẢNG <span className="text-yellow-400">XẾP HẠNG BÀI</span> POKER</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Từ mạnh nhất đến yếu nhất · lấy 5 lá tốt nhất từ 2 lá riêng + 5 lá chung
                </p>
              </div>
              <button
                onClick={() => setShowHandRankModal(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 my-3 overflow-y-auto max-h-[68dvh] pr-1">
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
                      <div className="w-6 h-6 rounded-full bg-blue-500/30 border border-blue-400 text-blue-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {tier.rank}
                      </div>

                      <div className="flex items-center -space-x-1 sm:-space-x-1.5 shrink-0">
                        {tier.cards.map((cStr, idx) => (
                          <div key={idx} className="scale-75 sm:scale-90 origin-left">
                            {renderCard(cStr)}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-right min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-black text-white uppercase truncate">
                        {tier.nameVi}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        {tier.nameEn}
                      </div>
                      {isCurrent && (
                        <div className="text-[10px] text-emerald-400 font-mono font-bold animate-pulse mt-0.5">
                          ← bài hiện tại của bạn
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowHandRankModal(false)}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-xs uppercase rounded-xl cursor-pointer hover:brightness-125 transition shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              >
                ĐÓNG BẢNG XẾP HẠNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. THỐNG KÊ CÁ NHÂN MODAL OVERLAY */}
      {showStatsModal && (
        <div
          className="absolute inset-0 z-[90] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
          onClick={() => setShowStatsModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#0c101a] border-2 border-purple-500/60 rounded-2xl p-5 shadow-[0_0_60px_rgba(168,85,247,0.3)] relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-purple-400" />
                <span>THỐNG KÊ <span className="text-purple-400">POKER CÁ NHÂN</span></span>
              </h3>
              <button
                onClick={() => setShowStatsModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs for Real PP vs Practice Chip stats */}
            <div className="flex rounded-xl bg-black/60 p-1 border border-white/10 my-3">
              <button
                onClick={() => setStatsTab('REAL')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  statsTab === 'REAL'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                💰 CƯỢC PP THẬT
              </button>
              <button
                onClick={() => setStatsTab('PRACTICE')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  statsTab === 'PRACTICE'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎓 LUYỆN TẬP (CHIP ẢO)
              </button>
            </div>

            {(() => {
              const currentStat = statsTab === 'REAL' ? realStats : practiceStats;
              const currentUnit = statsTab === 'REAL' ? 'PP' : 'chip';

              return (
                <div className="grid grid-cols-2 gap-3 my-3">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 text-center">
                    <span className="text-[11px] text-slate-400 font-mono block">SỐ VÁN ĐÃ ĐẤU</span>
                    <span className="text-xl font-mono font-black text-white mt-1 block">
                      {currentStat.handsPlayed}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 text-center">
                    <span className="text-[11px] text-slate-400 font-mono block">TỈ LỆ THẮNG</span>
                    <span className="text-xl font-mono font-black text-emerald-400 mt-1 block">
                      {currentStat.handsPlayed > 0
                        ? `${Math.round((currentStat.handsWon / currentStat.handsPlayed) * 100)}%`
                        : '0%'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">({currentStat.handsWon} ván thắng)</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/30 text-center col-span-2">
                    <span className="text-[11px] text-yellow-400 font-mono block font-bold">POT LỚN NHẤT ĐÃ THẮNG</span>
                    <span className="text-xl sm:text-2xl font-mono font-black text-[#ffd700] mt-1 block">
                      🪙 {currentStat.biggestPot.toLocaleString()} {currentUnit}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-purple-500/30 text-center col-span-2">
                    <span className="text-[11px] text-purple-300 font-mono block font-bold">TAY BÀI MẠNH NHẤT TỪNG ĐẠT</span>
                    <span className="text-sm sm:text-base font-black text-white mt-1 block">
                      {currentStat.bestHandName}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowStatsModal(false)}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-mono font-black text-xs uppercase rounded-xl cursor-pointer transition shadow-[0_0_15px_rgba(168,85,247,0.4)]"
              >
                ĐÓNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN POKER CONTAINER */}
      <div className="w-full flex-1 min-h-0 flex flex-col p-1.5 sm:p-2.5 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0d1627] via-[#070b14] to-[#04060b]">
        
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

        {/* ===================== TOP HEADER BAR ===================== */}
        <div className={`relative z-20 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 border-b border-cyan-500/20 px-1 sm:px-2 pb-1 ${
          isShortScreen ? 'min-h-[42px] py-0.5' : 'min-h-[50px] sm:min-h-[56px]'
        }`}>
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <button
              onClick={currentRoomId ? handleLeaveTable : onClose}
              className="game-close !w-9 !h-9 !min-w-[36px] !min-h-[36px] sm:!w-11 sm:!h-11"
              aria-label="Thoát bàn chơi"
              title="Thoát bàn chơi"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-yellow-400 text-xs sm:text-sm font-black uppercase tracking-wider font-mono flex items-center gap-1 whitespace-nowrap">
                  ♠ POKER<span className="hidden min-[480px]:inline"> TEXAS HOLD'EM</span>
                </span>
                {room && (
                  room.practice ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/60 text-[10px] font-mono font-black uppercase flex items-center gap-1 shadow">
                      🎓 LUYỆN TẬP
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-950 text-yellow-300 border border-amber-500/60 text-[10px] font-mono font-black uppercase flex items-center gap-1 shadow">
                      💰 PP THẬT
                    </span>
                  )
                )}
                {room?.mode === 'AI' && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    room.difficulty === 'EASY'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : room.difficulty === 'HARD'
                      ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                  }`}>
                    Bot {room.difficulty || 'NORMAL'}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">
                {room ? `BÀN #${room.id} · BLIND ${room.smallBlind}/${room.bigBlind}` : 'SẢNH CHỜ POKER'}
              </div>
            </div>
          </div>

          {room && (
            <div className="hidden sm:flex px-3 sm:px-4 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center gap-1.5 animate-pulse">
              <span className="text-xs font-mono font-black text-cyan-300 uppercase tracking-widest">
                {room.round}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* PP Balance Pill */}
            <div className="px-2.5 sm:px-3 py-1 bg-black/80 border border-amber-500/40 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              <span className="text-amber-400 text-xs sm:text-sm">🪙</span>
              <span className="text-xs sm:text-sm font-mono font-black text-[#ffd700] tracking-wide">
                {(user?.pp || 0).toLocaleString()} <span className="text-[11px] text-yellow-500">PP</span>
              </span>
            </div>

            {/* Beginner Hint Toggle */}
            {room && (
              <button
                onClick={() => setShowBeginnerHints(!showBeginnerHints)}
                className={`game-icon-btn !w-9 !h-9 !min-w-[36px] !min-h-[36px] sm:!w-11 sm:!h-11 ${
                  showBeginnerHints ? 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40' : 'text-slate-500'
                }`}
                aria-label="Gợi ý AI"
                title={showBeginnerHints ? 'Tắt gợi ý AI' : 'Bật gợi ý AI cho người mới'}
              >
                <Lightbulb className="w-4 h-4" />
              </button>
            )}

            {/* Hand History Toggle */}
            {room && (
              <button
                onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                className={`game-icon-btn !w-9 !h-9 !min-w-[36px] !min-h-[36px] sm:!w-11 sm:!h-11 ${
                  showHistoryPanel ? 'text-cyan-300 border-cyan-400 bg-cyan-950/40' : 'text-slate-300'
                }`}
                aria-label="Lịch sử ván"
                title="Lịch sử 10 ván gần nhất"
              >
                <History className="w-4 h-4" />
              </button>
            )}

            {/* Personal Stats Button */}
            <button
              onClick={() => setShowStatsModal(true)}
              className="game-icon-btn !w-9 !h-9 !min-w-[36px] !min-h-[36px] sm:!w-11 sm:!h-11 text-purple-400"
              aria-label="Thống kê"
              title="Thống kê cá nhân"
            >
              <BarChart2 className="w-4 h-4" />
            </button>

            {/* Hand Rank Book */}
            <button
              onClick={() => setShowHandRankModal(true)}
              className="game-icon-btn !w-9 !h-9 !min-w-[36px] !min-h-[36px] sm:!w-11 sm:!h-11 text-yellow-400"
              aria-label="Bảng xếp hạng bài"
              title="Bảng xếp hạng bài"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="game-icon-btn !w-9 !h-9 !min-w-[36px] !min-h-[36px] sm:!w-11 sm:!h-11 text-cyan-300"
              aria-label="Âm thanh"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-950/90 border border-rose-500/60 px-4 py-1.5 text-rose-200 text-xs text-center flex items-center justify-center gap-2 z-30 shrink-0">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ===================== BODY VIEW ===================== */}
        {!room ? (
          /* ===================== LOBBY VIEW ===================== */
          <div className="flex-1 flex flex-col justify-center items-center p-3 sm:p-6 overflow-y-auto z-10 space-y-4">
            <div className="w-full max-w-4xl bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-[0_0_40px_rgba(0,240,255,0.15)] space-y-4">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="text-cyan-400">🃏 ĐẤU TRƯỜNG</span> POKER TEXAS HOLD'EM
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Bàn cược chuẩn 5 ghế · Tỉ lệ cược thật · AI siêu cấp với 2.000+ mô phỏng Monte Carlo
                  </p>
                </div>

                <div className="flex rounded-xl bg-black/60 p-1 border border-white/10">
                  <button
                    onClick={() => setSelectedMode('AI')}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-mono font-black uppercase transition cursor-pointer flex items-center gap-1.5 ${
                      selectedMode === 'AI' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bot className="w-4 h-4" /> Đấu với AI (1+4 Bot)
                  </button>
                  <button
                    onClick={() => setSelectedMode('MULTIPLAYER')}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-mono font-black uppercase transition cursor-pointer flex items-center gap-1.5 ${
                      selectedMode === 'MULTIPLAYER' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" /> Bàn Nhiều Người (2-5)
                  </button>
                </div>
              </div>

              {/* Bot Difficulty Selector (AI Mode) */}
              {selectedMode === 'AI' && (
                <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono text-cyan-300 font-bold uppercase flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5" /> CHỌN ĐỘ KHÓ BOT AI
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {aiDifficulty === 'EASY' && 'Dễ: Bot hay theo bài yếu, ít tố, không bluff'}
                      {aiDifficulty === 'NORMAL' && 'Thường: Lối chơi chuẩn, cân bằng'}
                      {aiDifficulty === 'HARD' && 'Khó: 2.000+ mô phỏng Monte Carlo, cược GTO'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAiDifficulty('EASY')}
                      className={`py-2 px-3 rounded-lg border font-mono font-bold text-xs uppercase transition cursor-pointer ${
                        aiDifficulty === 'EASY'
                          ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                          : 'bg-black/60 text-slate-300 border-white/10 hover:border-emerald-500/40'
                      }`}
                    >
                      🌱 DỄ
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiDifficulty('NORMAL')}
                      className={`py-2 px-3 rounded-lg border font-mono font-bold text-xs uppercase transition cursor-pointer ${
                        aiDifficulty === 'NORMAL'
                          ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                          : 'bg-black/60 text-slate-300 border-white/10 hover:border-cyan-500/40'
                      }`}
                    >
                      ⚡ THƯỜNG
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiDifficulty('HARD')}
                      className={`py-2 px-3 rounded-lg border font-mono font-bold text-xs uppercase transition cursor-pointer ${
                        aiDifficulty === 'HARD'
                          ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                          : 'bg-black/60 text-slate-300 border-white/10 hover:border-purple-500/40'
                      }`}
                    >
                      🔥 KHÓ (2.000+ MC)
                    </button>
                  </div>
                </div>
              )}

              {/* Turn Time Limit Selector (Multiplayer Mode) */}
              {selectedMode === 'MULTIPLAYER' && (
                <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono text-purple-300 font-bold uppercase flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> THỜI GIAN MỖI LƯỢT ĐÁNH
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Chủ bàn chọn thời gian suy nghĩ cho mỗi người
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[15, 30, 45].map(sec => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setTurnTimeLimit(sec)}
                        className={`py-2 px-3 rounded-lg border font-mono font-bold text-xs uppercase transition cursor-pointer ${
                          turnTimeLimit === sec
                            ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                            : 'bg-black/60 text-slate-300 border-white/10 hover:border-purple-500/40'
                        }`}
                      >
                        ⏱️ {sec} GIÂY {sec === 15 ? '(Nhanh)' : sec === 30 ? '(Chuẩn)' : '(Thong thả)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Create Room Controls */}
              {selectedMode === 'AI' && (aiDifficulty === 'EASY' || aiDifficulty === 'NORMAL') ? (
                /* PRACTICE MODE LOBBY PANEL */
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 border-2 border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.25)] flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1.5 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono font-black text-xs uppercase tracking-wider">
                      🎓 CHẾ ĐỘ LUYỆN TẬP · KHÔNG DÙNG PP · KHÔNG THƯỞNG PP
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200">
                      Bạn sẽ được cấp miễn phí <strong className="text-emerald-400 font-mono">5.000 chip ảo</strong> để rèn luyện kỹ năng với 4 bot AI ({aiDifficulty === 'EASY' ? 'Độ khó DỄ' : 'Độ khó THƯỜNG'}). Hết chip được nạp lại miễn phí không giới hạn!
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Mức cược tiêu chuẩn: Small Blind 50 / Big Blind 100 chip ảo · Hoàn toàn miễn phí 100%
                    </p>
                  </div>

                  <div className="w-full md:w-auto shrink-0">
                    <button
                      onClick={handleCreateRoom}
                      disabled={isCreating}
                      className="w-full md:w-auto px-8 min-h-[52px] py-3.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:brightness-110 text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition cursor-pointer shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      <span>{isCreating ? 'ĐANG KHỞI TẠO...' : 'VÀO BÀN LUYỆN TẬP NGAY'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* REAL STAKES LOBBY CONTROLS (AI HARD & MULTIPLAYER) */
                <div className="space-y-3">
                  {selectedMode === 'AI' && aiDifficulty === 'HARD' && (
                    <div className="px-3.5 py-2 rounded-xl bg-amber-950/60 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <span className="font-mono font-bold text-yellow-300 flex items-center gap-1.5">
                        💰 CƯỢC PP THẬT (ĐỐI ĐẦU BOT AI KHÓ)
                      </span>
                      <span className="text-[11px] text-amber-200/90 font-mono">
                        Buy-in sẽ trừ PP thật · Thắng nhận PP thật từ Pot · 2.000+ mô phỏng Monte Carlo
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2">
                      <label className="text-[11px] font-mono text-cyan-300 font-bold uppercase block">
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

                    <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-[11px] font-mono">
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
                        className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg touch-pan-y"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Min: {(selectedBB * 20).toLocaleString()}</span>
                        <span>50x BB</span>
                        <span>Max: {(selectedBB * 100).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-end">
                      <button
                        onClick={handleCreateRoom}
                        disabled={isCreating}
                        className="w-full min-h-[52px] py-3.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:brightness-110 text-black font-mono font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.5)] active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isCreating ? 'ĐANG KHỞI TẠO...' : selectedMode === 'AI' ? 'VÀO BÀN ĐẤU AI (CƯỢC PP)' : 'TẠO BÀN POKER MỚI'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedMode === 'MULTIPLAYER' && (
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                    DANH SÁCH BÀN ĐANG HOẠT ĐỘNG
                  </span>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {lobbyRooms.filter(r => r.mode === 'MULTIPLAYER').length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 font-mono">
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
                              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[11px] font-mono">
                                Blind {lr.smallBlind}/{lr.bigBlind}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {seatedCount}/5 Ghế · {lr.turnTimeLimit || 20}s
                              </span>
                            </div>

                            <button
                              onClick={() => handleJoinRoom(lr.id, lr.minBuyIn)}
                              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-black text-xs uppercase rounded-lg transition cursor-pointer min-h-[40px]"
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
          /* ===================== ACTIVE POKER TABLE VIEW ===================== */
          <div className={`flex-1 min-h-0 flex gap-2 relative overflow-hidden p-0.5 sm:p-1 z-10 ${
            isShortScreen ? 'flex-row' : 'flex-col min-[700px]:flex-row'
          }`}>
            
            {/* 3A. OVAL POKER TABLE AREA */}
            <div className="flex-1 min-h-0 min-w-0 relative flex items-center justify-center overflow-hidden">
              
              <div className="w-[99%] h-[98%] min-[700px]:w-[96%] min-[700px]:h-[90%] rounded-[56px] min-[700px]:rounded-[180px] bg-gradient-to-b from-[#0e5c36] via-[#094125] to-[#042414] border-[5px] sm:border-[6px] border-[#02130a] shadow-[0_0_80px_rgba(0,240,255,0.25)] relative flex items-center justify-center">
                
                <div className="absolute inset-1.5 rounded-[50px] min-[700px]:rounded-[174px] border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.6)] pointer-events-none" />

                <div className="absolute text-[26px] sm:text-[42px] font-mono font-black text-white/[0.04] uppercase tracking-[10px] select-none pointer-events-none">
                  AYK POKER
                </div>

                {/* CENTER AREA: POT BADGE + 5 COMMUNITY CARDS */}
                <div className="flex flex-col items-center gap-1.5 sm:gap-2.5 z-10 max-[699px]:-mt-2">
                  <div className="px-3 sm:px-5 py-1 rounded-full bg-black/80 border-2 border-amber-400/90 shadow-[0_0_25px_rgba(250,204,21,0.6)] flex items-center gap-1.5 animate-pulse">
                    <span className="text-yellow-400 text-xs sm:text-sm">🪙</span>
                    <span className="text-xs sm:text-sm font-mono font-black text-yellow-300 uppercase tracking-wider">
                      POT {room.pot.toLocaleString()} {unitLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2">
                    {[0, 1, 2, 3, 4].map(idx => {
                      const cardStr = room.board[idx];
                      if (!cardStr) {
                        return (
                          <div
                            key={idx}
                            className="w-8 min-[400px]:w-9 sm:w-11 md:w-13 aspect-[2.5/3.5] rounded-md sm:rounded-lg border border-dashed border-emerald-500/30 bg-black/20 flex items-center justify-center text-emerald-500/20 text-xs shrink-0"
                          >
                            ♠
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="animate-fadeIn shrink-0">
                          {renderCard(cardStr)}
                        </div>
                      );
                    })}

                    {room.highestBet > 0 && (
                      <div className="ml-1 sm:ml-2 px-2 py-0.5 rounded-full bg-black/70 border border-rose-500/60 text-rose-300 font-mono text-[11px] font-bold flex items-center gap-1 shadow">
                        <span>🔴</span> {room.highestBet.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* WAITING / SHOWDOWN WINNERS BANNER */}
                {room.round === 'WAITING' && (
                  <div className="absolute inset-x-0 top-[20%] z-30 flex flex-col items-center gap-2 px-4 text-center">
                    <span className="px-3 py-1 rounded-full bg-black/80 border border-cyan-400/60 text-cyan-200 text-xs font-mono font-bold">
                      Đang chờ người chơi · {room.seats.filter(Boolean).length}/5 ghế
                    </span>
                    {room.practice && mySeat && mySeat.chips <= 0 ? (
                      <button
                        onClick={handleRebuyPractice}
                        disabled={loadingAction}
                        className="px-6 min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(52,211,153,0.7)] cursor-pointer flex items-center gap-2 animate-bounce"
                      >
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>NẠP LẠI 5.000 CHIP LUYỆN TẬP</span>
                      </button>
                    ) : room.creator === uid ? (
                      <button
                        onClick={handleStartHand}
                        disabled={loadingAction || room.seats.filter(st => st && st.chips > 0).length < 2}
                        className="px-6 min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-black font-black text-xs sm:text-sm uppercase tracking-wider disabled:opacity-40 shadow-[0_0_20px_rgba(52,211,153,0.5)] cursor-pointer"
                      >
                        ▶ BẮT ĐẦU VÁN
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-300">Chờ chủ bàn ({room.creatorName}) bắt đầu ván…</span>
                    )}
                  </div>
                )}
                {room.round === 'SHOWDOWN' && room.winners && room.winners.length > 0 && (
                  <div className="absolute inset-x-2 top-[20%] z-30 flex flex-col items-center gap-1 pointer-events-none">
                    {room.winners.map(w => (
                      <div key={w.uid} className="px-3 py-1.5 rounded-xl bg-black/90 border-2 border-yellow-400/80 shadow-[0_0_25px_rgba(250,204,21,0.5)] text-center max-w-full">
                        <div className="text-xs sm:text-sm font-black text-yellow-300 truncate">
                          🏆 {w.uid === uid ? 'BẠN' : w.name} +{w.amount.toLocaleString()} {unitLabel}
                        </div>
                        <div className="text-[11px] font-mono text-emerald-300 truncate">{w.handDesc}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5 SEATS POSITIONED AROUND OVAL */}
                {visualSeats.map(item => {
                  const { seat, visualPos, originalIndex } = item;
                  const isCurrentTurn = room.currentTurnSeat === originalIndex;
                  const isDealer = room.dealerSeat === originalIndex;

                  const posClasses = [
                    'bottom-1 left-1.5 min-[700px]:left-[10%]',
                    'left-1 top-[42%] -translate-y-1/2 min-[700px]:left-2 min-[700px]:top-1/2 min-[700px]:-translate-y-1/2',
                    'left-2 top-1 min-[700px]:left-[24%] min-[700px]:top-2',
                    'right-2 top-1 min-[700px]:right-[24%] min-[700px]:top-2',
                    'right-1 top-[42%] -translate-y-1/2 min-[700px]:right-2 min-[700px]:top-1/2 min-[700px]:-translate-y-1/2',
                  ][visualPos];

                  if (!seat) {
                    return (
                      <div key={visualPos} className={`absolute ${posClasses} z-20 flex flex-col items-center`}>
                        <div className="w-10 h-10 rounded-full border border-dashed border-white/20 bg-black/40 flex items-center justify-center text-[11px] text-slate-500 font-mono">
                          Trống
                        </div>
                      </div>
                    );
                  }

                  const isMe = seat.uid === uid;
                  const initials = seat.name.slice(0, 2).toUpperCase();

                  // Check if player has an active emote bubble (< 3s)
                  const playerEmote = room.emotes?.[seat.uid];
                  const hasEmote = playerEmote && nowTimestamp - playerEmote.timestamp < 3000;

                  return (
                    <div
                      key={visualPos}
                      className={`absolute ${posClasses} z-20 flex flex-col items-center transition-all duration-300 ${
                        seat.folded ? 'opacity-40 grayscale' : ''
                      }`}
                    >
                      {/* Emote Speech Bubble */}
                      {hasEmote && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-50 px-2.5 py-1 bg-white border-2 border-yellow-400 text-slate-900 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.8)] font-black text-sm sm:text-base animate-bounce whitespace-nowrap">
                          {playerEmote.emote}
                        </div>
                      )}

                      {seat.allIn && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono font-black text-[10px] sm:text-[11px] uppercase tracking-wider mb-0.5 animate-pulse shadow-md">
                          ALL-IN
                        </span>
                      )}
                      {seat.folded && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-bold text-[10px] sm:text-[11px] uppercase mb-0.5">
                          BỎ BÀI
                        </span>
                      )}

                      <div className="relative">
                        {isCurrentTurn && (
                          <div className="absolute -inset-1.5 rounded-full border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-spin" style={{ animationDuration: '6s' }} />
                        )}

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

                        {isCurrentTurn && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-black font-mono font-black text-[10px] flex items-center justify-center shadow border border-black animate-bounce">
                            {secondsRemaining}
                          </div>
                        )}

                        {isDealer && (
                          <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-yellow-400 text-black font-mono font-black text-[10px] flex items-center justify-center shadow-md border border-black">
                            D
                          </div>
                        )}
                      </div>

                      {/* Name & Chips Pill (>= 11px font size) */}
                      <div className="mt-0.5 px-2 py-0.5 rounded-lg bg-black/85 border border-white/10 text-center min-w-[70px] max-w-[95px] sm:max-w-[115px]">
                        <span className="block text-[11px] sm:text-xs font-bold text-white truncate leading-tight">
                          {isMe ? 'Bạn · AYK' : seat.name}
                        </span>
                        <span className="block text-[11px] sm:text-xs font-mono text-[#ffd700] font-black leading-tight mt-0.5">
                          🪙 {seat.chips.toLocaleString()}
                        </span>
                      </div>

                      {/* Current Bet Chips */}
                      {seat.currentBet > 0 && (
                        <div className="mt-0.5 px-1.5 py-0.5 rounded-full bg-black/80 border border-amber-400/50 text-[#ffd700] font-mono text-[11px] font-bold flex items-center gap-1 shadow">
                          <span>🔴</span> {seat.currentBet.toLocaleString()}
                        </div>
                      )}

                      {/* Opponent's Cards: ALWAYS visible on mobile so players know who is in the hand */}
                      {!isMe && (
                        <div className="flex items-center -space-x-2 mt-0.5 justify-center z-10">
                          {room.revealedCards && room.revealedCards[seat.uid] ? (
                            room.revealedCards[seat.uid].map((cStr, cIdx) => (
                              <div key={cIdx} className="scale-[0.52] min-[400px]:scale-[0.58] sm:scale-75 origin-top shrink-0 -mx-1 sm:mx-0">
                                {renderCard(cStr)}
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center -space-x-2">
                              <div className="scale-[0.52] min-[400px]:scale-[0.58] sm:scale-75 origin-center">
                                {renderCard('XX', true, true, false)}
                              </div>
                              <div className="scale-[0.52] min-[400px]:scale-[0.58] sm:scale-75 origin-center">
                                {renderCard('XX', true, false, true)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Last Action Pill (>= 11px font size) */}
                      {seat.lastAction && (
                        <span className="text-[11px] font-mono font-bold text-cyan-300 bg-black/85 px-1.5 py-0.5 rounded shadow mt-0.5 leading-none">
                          {seat.lastAction}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* MY HOLE CARDS & HAND NAME BADGE */}
                {mySeat && myHoleCards.length === 2 && (
                  <div className="absolute bottom-1 right-1.5 min-[700px]:right-auto min-[700px]:left-1/2 min-[700px]:-translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-3">
                    <div className="flex items-center -space-x-3 filter drop-shadow-[0_0_12px_rgba(250,204,21,0.7)]">
                      {renderCard(myHoleCards[0], false, true, false)}
                      {renderCard(myHoleCards[1], false, false, true)}
                    </div>

                    {myHandEvaluation && (
                      <div className="bg-black/90 border-2 border-yellow-500/70 p-1.5 sm:p-2.5 rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] min-w-[95px] sm:min-w-[120px] text-left">
                        <span className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider font-semibold">
                          BÀI CỦA BẠN
                        </span>
                        <span className="block text-xs sm:text-sm font-black text-yellow-300 uppercase tracking-wider font-sans leading-tight">
                          {myHandEvaluation.shortDesc}
                        </span>
                        <span className="block text-[11px] font-mono text-emerald-400 font-semibold truncate leading-tight mt-0.5">
                          {myHandEvaluation.nameEn}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* COLLAPSIBLE 10 HANDS HISTORY PANEL */}
                {showHistoryPanel && (
                  <div className="absolute left-2 top-2 z-40 w-72 sm:w-80 max-h-[75%] bg-[#0a0f1d]/95 border-2 border-cyan-500/60 rounded-xl p-2.5 shadow-2xl flex flex-col animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                      <span className="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" /> LỊCH SỬ 10 VÁN GẦN NHẤT
                      </span>
                      <button
                        onClick={() => setShowHistoryPanel(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                      {(!room.history || room.history.length === 0) ? (
                        <div className="text-center py-4 text-[11px] text-slate-400 font-mono">
                          Chưa có lịch sử ván bài nào.
                        </div>
                      ) : (
                        room.history.slice().reverse().map((item: PokerHistoryItem, idx: number) => {
                          const isMeWin = item.winnerUid === uid;
                          return (
                            <div
                              key={item.id || idx}
                              className={`p-2 rounded-lg border text-left flex justify-between items-center text-[11px] font-mono ${
                                isMeWin
                                  ? 'bg-amber-950/40 border-yellow-400/80 text-yellow-300'
                                  : 'bg-black/60 border-white/10 text-slate-300'
                              }`}
                            >
                              <div className="min-w-0 pr-1">
                                <span className="font-bold block truncate">
                                  Ván #{item.handNumber} · {isMeWin ? '🏆 BẠN THẮNG' : item.winnerName}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {item.winningHandDesc}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-bold text-[#ffd700] block">
                                  +{item.pot.toLocaleString()} {unitLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* 3B. CONTROL COLUMN (THUMB-FRIENDLY, SAFE AREA & +/- 1 BB) */}
            <div className={`shrink-0 flex flex-col justify-between bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-2 sm:p-3 relative z-20 shadow-2xl font-mono pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] ${
              isShortScreen ? 'w-56 sm:w-64 h-full overflow-y-auto' : 'w-full min-[700px]:w-64 gap-2'
            }`}>
              
              {/* BEGINNER AI HINT CARD */}
              {beginnerHint && (
                <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-slate-900 border border-emerald-500/40 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-yellow-400" /> GỢI Ý CHO NGƯỜI MỚI
                    </span>
                    <span className="font-mono font-black text-cyan-300">
                      {beginnerHint.equityPercent}% thắng
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Khuyên:</span>
                    <span className={`text-xs font-black uppercase ${beginnerHint.recColor}`}>
                      {beginnerHint.recommendation}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-tight">
                    {beginnerHint.explanation}
                  </p>
                </div>
              )}

              {/* TOP: TỐ ĐẾN & AMOUNT */}
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">TỐ ĐẾN</span>
                  <span className="text-sm sm:text-base font-black text-[#ffd700] tracking-wider">
                    {customRaiseAmount.toLocaleString()} {unitLabel}
                  </span>
                </div>

                {/* SLIDER WITH +/- 1 BB BUTTONS */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStepRaise(-1)}
                    disabled={!bettingOptions?.canRaise || customRaiseAmount <= (bettingOptions?.minRaiseTotal || 0)}
                    className="w-10 h-10 min-w-[40px] rounded-lg bg-slate-900 border border-white/20 text-cyan-300 hover:bg-slate-800 disabled:opacity-30 font-mono font-black text-xs sm:text-sm flex items-center justify-center cursor-pointer transition active:scale-90"
                    title="Giảm 1 BB"
                  >
                    -1BB
                  </button>
                  <input
                    type="range"
                    min={bettingOptions?.minRaiseTotal || 200}
                    max={bettingOptions?.maxRaiseTotal || 5000}
                    step={stepBB}
                    value={customRaiseAmount}
                    onChange={e => setCustomRaiseAmount(Number(e.target.value))}
                    disabled={!bettingOptions?.canRaise}
                    className="flex-1 accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg touch-pan-y"
                  />
                  <button
                    type="button"
                    onClick={() => handleStepRaise(1)}
                    disabled={!bettingOptions?.canRaise || customRaiseAmount >= (bettingOptions?.maxRaiseTotal || 0)}
                    className="w-10 h-10 min-w-[40px] rounded-lg bg-slate-900 border border-white/20 text-cyan-300 hover:bg-slate-800 disabled:opacity-30 font-mono font-black text-xs sm:text-sm flex items-center justify-center cursor-pointer transition active:scale-90"
                    title="Tăng 1 BB"
                  >
                    +1BB
                  </button>
                </div>

                {/* 4 PRESET BUTTONS (½ POT, ¾ POT, POT, ALL-IN) */}
                <div className="grid grid-cols-4 min-[700px]:grid-cols-2 gap-1.5">
                  <button
                    onClick={() => bettingOptions && setCustomRaiseAmount(bettingOptions.halfPotRaiseTotal)}
                    disabled={!bettingOptions?.canRaise}
                    className="py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-white/10 rounded-lg text-xs font-bold text-slate-300 cursor-pointer transition active:scale-95 min-h-[38px]"
                  >
                    ½ POT
                  </button>
                  <button
                    onClick={() => bettingOptions && setCustomRaiseAmount(bettingOptions.threeQuarterPotRaiseTotal)}
                    disabled={!bettingOptions?.canRaise}
                    className="py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-white/10 rounded-lg text-xs font-bold text-slate-300 cursor-pointer transition active:scale-95 min-h-[38px]"
                  >
                    ¾ POT
                  </button>
                  <button
                    onClick={() => bettingOptions && setCustomRaiseAmount(bettingOptions.potRaiseTotal)}
                    disabled={!bettingOptions?.canRaise}
                    className="py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-white/10 rounded-lg text-xs font-bold text-slate-300 cursor-pointer transition active:scale-95 min-h-[38px]"
                  >
                    POT
                  </button>
                  <button
                    onClick={() => bettingOptions && setCustomRaiseAmount(bettingOptions.maxRaiseTotal)}
                    disabled={!bettingOptions?.canAllIn}
                    className="py-1.5 sm:py-2 bg-rose-950/60 hover:bg-rose-900/80 disabled:opacity-30 border border-rose-500/40 rounded-lg text-xs font-black text-rose-400 cursor-pointer transition active:scale-95 min-h-[38px]"
                  >
                    ALL-IN
                  </button>
                </div>

                <div className="hidden min-[700px]:block pt-1 border-t border-white/5 space-y-1 text-[11px]">
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

              {/* QUICK EMOTE BAR */}
              <div className="relative pt-1">
                <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Smile className="w-3.5 h-3.5 text-yellow-400" /> BÀY TỎ CẢM XÚC (3S)
                  </span>
                  <button
                    onClick={() => setShowEmotePicker(!showEmotePicker)}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                  >
                    {showEmotePicker ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                  </button>
                </div>

                <div className="grid grid-cols-8 gap-1 pt-1">
                  {EMOTE_LIST.map((emo) => {
                    const isCooldown = Date.now() < emoteCooldownUntil;
                    return (
                      <button
                        key={emo}
                        type="button"
                        onClick={() => handleSendEmote(emo)}
                        disabled={isCooldown}
                        className="h-8 rounded-lg bg-black/60 hover:bg-slate-800 disabled:opacity-30 border border-white/10 hover:border-yellow-400/60 text-xs sm:text-sm flex items-center justify-center transition active:scale-90 cursor-pointer"
                        title={emo}
                      >
                        {emo}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BOTTOM: 3 BIG ACTION BUTTONS (>= 52px height) */}
              <div className={`grid gap-1.5 pt-1 min-[700px]:pt-2 ${
                isShortScreen ? 'grid-cols-1' : 'grid-cols-3 min-[700px]:grid-cols-1'
              }`}>
                {/* REBUY PRACTICE CHIPS BUTTON IF DEPLETED */}
                {room.practice && mySeat && mySeat.chips <= 0 ? (
                  <button
                    onClick={handleRebuyPractice}
                    disabled={loadingAction}
                    className="w-full min-h-[52px] h-[52px] sm:h-14 py-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 hover:brightness-110 disabled:opacity-30 text-black font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.7)] active:scale-95 flex items-center justify-center gap-2 animate-pulse"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>NẠP LẠI 5.000 CHIP LUYỆN TẬP</span>
                  </button>
                ) : (
                  <>
                    {/* 1. TỐ BUTTON (Yellow) */}
                    <button
                      onClick={() => handleBettingAction('RAISE', customRaiseAmount)}
                      disabled={!bettingOptions?.canRaise || loadingAction}
                      className="w-full min-h-[52px] h-[52px] sm:h-14 order-3 min-[700px]:order-none py-1.5 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:brightness-110 disabled:opacity-25 text-black font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(250,204,21,0.5)] active:scale-95 flex flex-col items-center justify-center leading-tight touch-manipulation"
                    >
                      <span className="text-sm font-black">TỐ</span>
                      <span className="text-[11px] font-bold">{customRaiseAmount.toLocaleString()} {unitLabel}</span>
                    </button>

                    {/* 2. THEO / CHECK BUTTON (Cyan) */}
                    {bettingOptions?.canCheck ? (
                      <button
                        onClick={() => handleBettingAction('CHECK')}
                        disabled={loadingAction}
                        className="w-full min-h-[52px] h-[52px] sm:h-14 order-2 min-[700px]:order-none py-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 disabled:opacity-25 text-black font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-95 flex flex-col items-center justify-center leading-tight touch-manipulation"
                      >
                        <span className="text-sm font-black">CHECK</span>
                        <span className="text-[11px] font-bold">MIỄN PHÍ</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBettingAction('CALL')}
                        disabled={!bettingOptions?.canCall || loadingAction}
                        className="w-full min-h-[52px] h-[52px] sm:h-14 order-2 min-[700px]:order-none py-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 disabled:opacity-25 text-black font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-95 flex flex-col items-center justify-center leading-tight touch-manipulation"
                      >
                        <span className="text-sm font-black">THEO</span>
                        <span className="text-[11px] font-bold">{bettingOptions?.callAmount.toLocaleString()} {unitLabel}</span>
                      </button>
                    )}

                    {/* 3. BỎ BÀI BUTTON (Red) */}
                    <button
                      onClick={() => handleBettingAction('FOLD')}
                      disabled={!mySeat || mySeat.folded || room.round === 'WAITING' || room.round === 'SHOWDOWN' || loadingAction}
                      className="w-full min-h-[52px] h-[52px] sm:h-14 order-1 min-[700px]:order-none py-1.5 bg-rose-950/60 hover:bg-rose-900/80 disabled:opacity-25 border border-rose-500/60 text-rose-400 hover:text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer active:scale-95 flex flex-col items-center justify-center leading-tight touch-manipulation"
                    >
                      <span className="text-xs sm:text-sm font-black">BỎ BÀI</span>
                      <span className="text-[11px] font-mono">FOLD</span>
                    </button>
                  </>
                )}
              </div>

            </div>

          </div>
        )}

      </div>
      </div>
    </div>
  );
}
