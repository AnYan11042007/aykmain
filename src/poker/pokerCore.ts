/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Texas Hold'em Poker Core Engine & Actions (Isomorphic: works in Node & Browser)
 */

import { get, ref, set, update, push } from 'firebase/database';
import {
  parseCard,
  formatCard,
  getStandardDeck,
  shuffleDeck,
  evaluateHand,
  calculateSidePots,
  distributePots,
  getBettingOptions,
  isStreetSettled
} from './pokerEngine';
import type { Card } from './pokerEngine';
import type { PokerRoom, PokerSeat, PokerDifficulty, PokerRound } from '../types';
import { normalizePokerRoom, serializePokerRoom } from './pokerRoomUtil';

export function secureRandom(): number {
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    (globalThis as any).crypto.getRandomValues(arr);
    return arr[0] / 0x100000000;
  }
  return Math.random();
}

export function secureRandomInt(min: number, max: number): number {
  return Math.floor(secureRandom() * (max - min)) + min;
}

export function secureRandomHex(bytes: number = 3): string {
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.getRandomValues) {
    const arr = new Uint8Array(bytes);
    (globalThis as any).crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(16).substring(2, 2 + bytes * 2);
}

export function safeSetTimeout(fn: () => void, ms: number) {
  const timer = setTimeout(fn, ms);
  if (timer && typeof (timer as any).unref === 'function') {
    (timer as any).unref();
  }
  return timer;
}

export async function dbGet(db: any, path: string) {
  if (db && typeof db.get === 'function') {
    return await db.get(path);
  }
  return await get(ref(db, path));
}

export async function dbSet(db: any, path: string, val: any) {
  if (db && typeof db.set === 'function') {
    return await db.set(path, val);
  }
  return await set(ref(db, path), val);
}

export async function dbUpdate(db: any, updates: Record<string, any>) {
  if (db && typeof db.update === 'function') {
    return await db.update(updates);
  }
  return await update(ref(db), updates);
}

export async function dbPush(db: any, path: string, val: any) {
  if (db && typeof db.push === 'function') {
    return await db.push(path, val);
  }
  return await push(ref(db, path), val);
}

export function getCryptoShuffledDeck(): Card[] {
  const deck = getStandardDeck();
  return shuffleDeck(deck, secureRandom);
}

export interface AIBotTemplate {
  name: string;
  avatar: string;
  personality: 'TAG' | 'LAG' | 'NIT' | 'TRICKY';
}

export const AI_BOT_TEMPLATES: Record<PokerDifficulty, AIBotTemplate[]> = {
  EASY: [
    { name: 'Nguyễn Văn Gà', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80', personality: 'TRICKY' },
    { name: 'Trần Cá Con', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80', personality: 'NIT' },
    { name: 'Lê Tập Sự', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80', personality: 'TRICKY' },
    { name: 'Phạm Lơ Ngơ', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80', personality: 'NIT' }
  ],
  NORMAL: [
    { name: 'Đặng Chắc Chắn', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', personality: 'TAG' },
    { name: 'Hoàng Liều Lĩnh', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', personality: 'LAG' },
    { name: 'Vũ Tỉnh Táo', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80', personality: 'TAG' },
    { name: 'Bùi Biến Hóa', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80', personality: 'LAG' }
  ],
  HARD: [
    { name: 'Thần Bài Sài Gòn', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80', personality: 'TAG' },
    { name: 'Cá Mập Phố Wall', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80', personality: 'LAG' },
    { name: 'Sát Thủ Poker', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80', personality: 'TAG' },
    { name: 'Huyền Thoại AYK', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=80', personality: 'LAG' }
  ]
};

export async function advancePokerGame(
  db: any,
  roomId: string,
  room: PokerRoom,
  executePPTransaction: Function
): Promise<void> {
  const activeSeats = room.seats.filter(s => s !== null && !s.folded) as PokerSeat[];

  if (activeSeats.length === 1) {
    const winner = activeSeats[0];
    const winAmount = room.pot;
    winner.chips += winAmount;

    room.round = 'SHOWDOWN';
    room.pot = 0;
    room.currentTurnSeat = null;
    room.winners = [{
      uid: winner.uid,
      name: winner.name,
      amount: winAmount,
      handDesc: 'Tất cả đối thủ đã bỏ bài'
    }];
    room.history = room.history || [];
    room.history.push({
      id: `hist_${Date.now()}_${secureRandomHex(2)}`,
      handNumber: room.handCount || 1,
      winnerUid: winner.uid,
      winnerName: winner.name,
      pot: winAmount,
      winningHandDesc: 'Tất cả đối thủ đã bỏ bài',
      timestamp: Date.now()
    });
    if (room.history.length > 10) {
      room.history = room.history.slice(-10);
    }
    room.logs = room.logs || [];
    const unit = room.practice ? 'chip' : 'PP';
    room.logs.push(`🎉 ${winner.name} thắng ${winAmount.toLocaleString()} ${unit} (Mọi người đều bỏ bài).`);

    await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));

    safeSetTimeout(() => {
      startNewHandIfReady(db, roomId, executePPTransaction).catch(console.error);
    }, 5000);
    return;
  }

  const canAct = activeSeats.filter(s => !s.allIn);
  const isSettled = isStreetSettled(activeSeats, room.highestBet);

  if (isSettled) {
    for (const seat of room.seats) {
      if (!seat) continue;
      seat.currentBet = 0;
      seat.hasActed = false;
      if (!seat.folded && !seat.allIn) delete seat.lastAction;
    }
    room.highestBet = 0;
    room.lastRaiseDelta = room.bigBlind;

    if (canAct.length <= 1 && room.round !== 'RIVER') {
      const deckSnap = await dbGet(db, `poker_private/${roomId}/deck`);
      let secretDeck: string[] = deckSnap.exists() ? deckSnap.val() : [];

      while (room.board.length < 5 && secretDeck.length > 0) {
        room.board.push(secretDeck.shift()!);
      }
      await dbSet(db, `poker_private/${roomId}/deck`, secretDeck);
      await finishShowdown(db, roomId, room, executePPTransaction);
      return;
    }

    if (room.round === 'PREFLOP') {
      room.round = 'FLOP';
      const deckSnap = await dbGet(db, `poker_private/${roomId}/deck`);
      let secretDeck: string[] = deckSnap.exists() ? deckSnap.val() : [];
      if (secretDeck.length >= 3) {
        room.board.push(secretDeck.shift()!, secretDeck.shift()!, secretDeck.shift()!);
        await dbSet(db, `poker_private/${roomId}/deck`, secretDeck);
      }
      room.logs = room.logs || [];
      room.logs.push(`🃏 Chia bài chung FLOP: ${room.board.join(' ')}`);
    } else if (room.round === 'FLOP') {
      room.round = 'TURN';
      const deckSnap = await dbGet(db, `poker_private/${roomId}/deck`);
      let secretDeck: string[] = deckSnap.exists() ? deckSnap.val() : [];
      if (secretDeck.length >= 1) {
        room.board.push(secretDeck.shift()!);
        await dbSet(db, `poker_private/${roomId}/deck`, secretDeck);
      }
      room.logs = room.logs || [];
      room.logs.push(`🃏 Chia bài chung TURN: ${room.board[3]}`);
    } else if (room.round === 'TURN') {
      room.round = 'RIVER';
      const deckSnap = await dbGet(db, `poker_private/${roomId}/deck`);
      let secretDeck: string[] = deckSnap.exists() ? deckSnap.val() : [];
      if (secretDeck.length >= 1) {
        room.board.push(secretDeck.shift()!);
        await dbSet(db, `poker_private/${roomId}/deck`, secretDeck);
      }
      room.logs = room.logs || [];
      room.logs.push(`🃏 Chia bài chung RIVER: ${room.board[4]}`);
    } else if (room.round === 'RIVER') {
      await finishShowdown(db, roomId, room, executePPTransaction);
      return;
    }

    let nextSeat = (room.dealerSeat + 1) % 5;
    for (let i = 0; i < 5; i++) {
      const idx = (nextSeat + i) % 5;
      const s = room.seats[idx];
      if (s && !s.folded && !s.allIn) {
        room.currentTurnSeat = idx;
        break;
      }
    }

    room.actionExpiry = Date.now() + (room.turnTimeLimit ? room.turnTimeLimit * 1000 : 20000);
    await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));
    checkIfNextTurnIsAI(db, roomId, room, executePPTransaction);
    return;
  }

  // Street not settled: advance to next active seat
  let nextSeat = (room.currentTurnSeat! + 1) % 5;
  for (let i = 0; i < 5; i++) {
    const idx = (nextSeat + i) % 5;
    const s = room.seats[idx];
    if (s && !s.folded && !s.allIn) {
      room.currentTurnSeat = idx;
      break;
    }
  }

  room.actionExpiry = Date.now() + (room.turnTimeLimit ? room.turnTimeLimit * 1000 : 20000);
  await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));
  checkIfNextTurnIsAI(db, roomId, room, executePPTransaction);
}

export async function finishShowdown(
  db: any,
  roomId: string,
  room: PokerRoom,
  executePPTransaction: Function
): Promise<void> {
  room.round = 'SHOWDOWN';
  room.currentTurnSeat = null;

  const privateSnap = await dbGet(db, `poker_private/${roomId}`);
  const privateData = privateSnap.exists() ? privateSnap.val() : {};

  const revealed: Record<string, string[]> = {};
  const handEvals: Record<string, any> = {};
  const boardCards = room.board.map(parseCard);

  for (const seat of room.seats) {
    if (!seat) continue;
    const holeStrArr = privateData[seat.uid];
    if (Array.isArray(holeStrArr) && holeStrArr.length === 2) {
      if (!seat.folded) {
        revealed[seat.uid] = holeStrArr;
        const holeCards = holeStrArr.map(parseCard);
        const full7 = [...boardCards, ...holeCards];
        handEvals[seat.uid] = evaluateHand(full7);
      }
    }
  }

  room.revealedCards = revealed;

  const playerBets = room.seats
    .filter(s => s !== null)
    .map(s => ({
      id: s!.uid,
      totalBet: s!.totalHandBet || 0,
      folded: s!.folded
    }));

  const sidePots = calculateSidePots(playerBets);
  const { payouts, winners } = distributePots(sidePots, handEvals);

  for (const seat of room.seats) {
    if (seat && payouts[seat.uid]) {
      seat.chips += payouts[seat.uid];
    }
  }

  room.winners = winners.map(w => {
    const s = room.seats.find(st => st?.uid === w.id);
    return {
      uid: w.id,
      name: s?.name || 'Võ sĩ',
      amount: w.amount,
      handDesc: w.handDesc
    };
  });

  room.pot = 0;
  room.history = room.history || [];
  if (room.winners && room.winners.length > 0) {
    const mainWinner = room.winners[0];
    room.history.push({
      id: `hist_${Date.now()}_${secureRandomHex(2)}`,
      handNumber: room.handCount || 1,
      winnerUid: mainWinner.uid,
      winnerName: mainWinner.name,
      pot: sidePots.reduce((acc, p) => acc + p.amount, 0) || mainWinner.amount,
      winningHandDesc: mainWinner.handDesc,
      timestamp: Date.now()
    });
    if (room.history.length > 10) {
      room.history = room.history.slice(-10);
    }
  }

  room.logs = room.logs || [];
  const unit = room.practice ? 'chip' : 'PP';
  for (const w of room.winners) {
    room.logs.push(`🏆 ${w.name} thắng ${w.amount.toLocaleString()} ${unit} (${w.handDesc})`);
  }

  await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));

  safeSetTimeout(() => {
    startNewHandIfReady(db, roomId, executePPTransaction).catch(console.error);
  }, 5000);
}

export async function startNewHandIfReady(
  db: any,
  roomId: string,
  executePPTransaction: Function
): Promise<void> {
  const roomSnap = await dbGet(db, `poker_rooms/${roomId}`);
  if (!roomSnap.exists()) return;
  const room = normalizePokerRoom(roomSnap.val() as PokerRoom);

  const hasHumanSeated = room.seats.some(s => s && !s.isAI && !s.left);
  if (!hasHumanSeated) {
    await dbSet(db, `poker_rooms/${roomId}`, null);
    await dbSet(db, `poker_private/${roomId}`, null);
    return;
  }

  if (room.practice) {
    const human = room.seats.find(s => s && !s.isAI && !s.left);
    if (human && human.chips <= 0) {
      for (const s of room.seats) {
        if (s && s.isAI && s.chips <= 0) {
          s.chips = 5000;
        }
      }
      room.status = 'WAITING';
      room.round = 'WAITING';
      room.currentTurnSeat = null;
      room.pot = 0;
      room.board = [];
      room.revealedCards = {};
      room.winners = [];
      room.logs = room.logs || [];
      room.logs.push(`⚠️ [${human.name}] đã hết chip luyện tập. Hãy bấm "Nạp Lại Chip" để tiếp tục.`);
      await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));
      return;
    }
  }

  for (let i = 0; i < 5; i++) {
    const s = room.seats[i];
    if (s && (s.chips <= 0 || s.left)) {
      if (!s.isAI && !s.left) {
        room.logs = room.logs || [];
        room.logs.push(`⚠️ ${s.name} hết chip và phải rời bàn.`);
      }
      room.seats[i] = null;
    }
  }

  const eligibleSeats = room.seats.filter(s => s !== null && s.chips > 0);
  if (eligibleSeats.length < 2) {
    room.status = 'WAITING';
    room.round = 'WAITING';
    room.currentTurnSeat = null;
    room.pot = 0;
    room.board = [];
    room.revealedCards = {};
    room.winners = [];
    await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));
    return;
  }

  await dealNewHand(db, roomId, room, executePPTransaction);
}

export async function dealNewHand(
  db: any,
  roomId: string,
  room: PokerRoom,
  executePPTransaction: Function
): Promise<void> {
  const eligibleIndexes: number[] = [];
  for (let i = 0; i < 5; i++) {
    if (room.seats[i] !== null && room.seats[i]!.chips > 0) {
      eligibleIndexes.push(i);
    }
  }

  if (eligibleIndexes.length < 2) {
    room.status = 'WAITING';
    room.round = 'WAITING';
    room.currentTurnSeat = null;
    await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));
    return;
  }

  room.handCount = (room.handCount || 0) + 1;
  room.status = 'PLAYING';
  room.round = 'PREFLOP';
  room.board = [];
  room.pot = 0;
  room.revealedCards = {};
  room.winners = [];

  let nextDealerIdx = -1;
  for (let step = 1; step <= 5; step++) {
    const testIdx = (room.dealerSeat + step) % 5;
    if (eligibleIndexes.includes(testIdx)) {
      nextDealerIdx = testIdx;
      break;
    }
  }
  room.dealerSeat = nextDealerIdx !== -1 ? nextDealerIdx : eligibleIndexes[0];

  let sbSeat = -1;
  let bbSeat = -1;
  let utgSeat = -1;

  if (eligibleIndexes.length === 2) {
    sbSeat = room.dealerSeat;
    bbSeat = eligibleIndexes.find(idx => idx !== sbSeat)!;
    utgSeat = sbSeat;
  } else {
    const dealerPosInEligible = eligibleIndexes.indexOf(room.dealerSeat);
    sbSeat = eligibleIndexes[(dealerPosInEligible + 1) % eligibleIndexes.length];
    bbSeat = eligibleIndexes[(dealerPosInEligible + 2) % eligibleIndexes.length];
    utgSeat = eligibleIndexes[(dealerPosInEligible + 3) % eligibleIndexes.length];
  }

  for (const idx of eligibleIndexes) {
    const s = room.seats[idx]!;
    s.currentBet = 0;
    s.totalHandBet = 0;
    s.folded = false;
    s.allIn = false;
    s.hasActed = false;
    s.consecutiveTimeouts = 0;
    delete s.lastAction;
  }

  const sbPlayer = room.seats[sbSeat]!;
  const sbAmount = Math.min(sbPlayer.chips, room.smallBlind);
  sbPlayer.chips -= sbAmount;
  sbPlayer.currentBet = sbAmount;
  sbPlayer.totalHandBet = sbAmount;
  sbPlayer.lastAction = `SB ${sbAmount.toLocaleString()}`;
  if (sbPlayer.chips === 0) sbPlayer.allIn = true;

  const bbPlayer = room.seats[bbSeat]!;
  const bbAmount = Math.min(bbPlayer.chips, room.bigBlind);
  bbPlayer.chips -= bbAmount;
  bbPlayer.currentBet = bbAmount;
  bbPlayer.totalHandBet = bbAmount;
  bbPlayer.lastAction = `BB ${bbAmount.toLocaleString()}`;
  if (bbPlayer.chips === 0) bbPlayer.allIn = true;

  room.pot = sbAmount + bbAmount;
  room.highestBet = bbAmount;
  room.lastRaiseDelta = room.bigBlind;
  room.currentTurnSeat = utgSeat;

  const shuffledCards = getCryptoShuffledDeck();
  const deckStr = shuffledCards.map(formatCard);

  const privateHoles: Record<string, string[]> = {};
  for (const idx of eligibleIndexes) {
    const seat = room.seats[idx]!;
    const card1 = deckStr.shift()!;
    const card2 = deckStr.shift()!;
    privateHoles[seat.uid] = [card1, card2];
    await dbSet(db, `poker_private/${roomId}/${seat.uid}`, [card1, card2]);
  }
  await dbSet(db, `poker_private/${roomId}/deck`, deckStr);

  room.actionExpiry = Date.now() + (room.turnTimeLimit ? room.turnTimeLimit * 1000 : 20000);
  room.logs = room.logs || [];
  room.logs.push(`--- Ván #${room.handCount} bắt đầu ---`);
  room.logs.push(`Dealer: [${room.seats[room.dealerSeat]?.name}], SB: ${sbPlayer.name} (${sbAmount}), BB: ${bbPlayer.name} (${bbAmount})`);

  await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));
  checkIfNextTurnIsAI(db, roomId, room, executePPTransaction);
}

export function checkIfNextTurnIsAI(
  db: any,
  roomId: string,
  room: PokerRoom,
  executePPTransaction: Function
) {
  if (room.currentTurnSeat === null || room.round === 'SHOWDOWN' || room.round === 'WAITING') return;
  const currentSeat = room.seats[room.currentTurnSeat];
  if (currentSeat && currentSeat.isAI && !currentSeat.folded && !currentSeat.allIn) {
    const delay = secureRandomInt(800, 2000);
    safeSetTimeout(() => {
      executeAITurn(db, roomId, room, currentSeat, executePPTransaction).catch(console.error);
    }, delay);
  }
}

export async function executeAITurn(
  db: any,
  roomId: string,
  room: PokerRoom,
  aiSeat: PokerSeat,
  executePPTransaction: Function
): Promise<void> {
  const roomSnap = await dbGet(db, `poker_rooms/${roomId}`);
  if (!roomSnap.exists()) return;
  const currentRoom = normalizePokerRoom(roomSnap.val() as PokerRoom);

  if (currentRoom.currentTurnSeat === null || currentRoom.seats[currentRoom.currentTurnSeat]?.uid !== aiSeat.uid) {
    return;
  }
  const currentSeat = currentRoom.seats[currentRoom.currentTurnSeat]!;
  if (currentSeat.folded || currentSeat.allIn) return;

  const privateSnap = await dbGet(db, `poker_private/${roomId}/${aiSeat.uid}`);
  const holeCards: string[] = privateSnap.exists() ? privateSnap.val() : [];

  const options = getBettingOptions({
    playerChips: currentSeat.chips,
    playerCurrentBet: currentSeat.currentBet,
    highestBetOnTable: currentRoom.highestBet,
    lastRaiseDelta: currentRoom.lastRaiseDelta,
    bigBlind: currentRoom.bigBlind,
    totalPot: currentRoom.pot
  });

  // Decision logic based on strength & difficulty
  let action: 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'ALL_IN' = 'CHECK';
  let raiseAmount = options.minRaiseTotal;

  const cardsParsed = holeCards.map(parseCard);
  const boardParsed = currentRoom.board.map(parseCard);
  const totalCards = [...cardsParsed, ...boardParsed];

  let evalScore = 0;
  if (totalCards.length >= 5) {
    const ev = evaluateHand(totalCards);
    evalScore = 11 - ev.categoryRank; // 1 to 10
  } else if (cardsParsed.length === 2) {
    const isPair = cardsParsed[0].rank === cardsParsed[1].rank;
    const isSuited = cardsParsed[0].suit === cardsParsed[1].suit;
    const high = Math.max(cardsParsed[0].rank, cardsParsed[1].rank);
    evalScore = isPair ? (high >= 10 ? 8 : 5) : high >= 12 ? (isSuited ? 6 : 4) : 2;
  }

  const diff = currentRoom.difficulty || 'NORMAL';
  const bluffRoll = secureRandom();

  if (options.callAmount === 0) {
    // Free to check
    if (evalScore >= 6 && options.canRaise && bluffRoll > 0.4) {
      action = 'RAISE';
      raiseAmount = Math.min(options.maxRaiseTotal, Math.max(options.minRaiseTotal, options.minRaiseTotal * (evalScore >= 8 ? 2 : 1)));
    } else {
      action = 'CHECK';
    }
  } else {
    // Bet facing
    const potOdds = options.callAmount / (currentRoom.pot + options.callAmount);
    const aggressive = diff === 'HARD' || (currentSeat.personality === 'LAG');

    if (evalScore >= 7 || (aggressive && bluffRoll > 0.6 && evalScore >= 4)) {
      if (options.canRaise && bluffRoll > 0.5) {
        action = 'RAISE';
        raiseAmount = Math.min(options.maxRaiseTotal, Math.max(options.minRaiseTotal, currentRoom.highestBet + currentRoom.bigBlind * 2));
      } else {
        action = 'CALL';
      }
    } else if (evalScore >= 4 || potOdds < 0.25 || (diff === 'EASY' && bluffRoll > 0.3)) {
      action = 'CALL';
    } else {
      action = 'FOLD';
    }
  }

  if (action === 'FOLD') {
    currentSeat.folded = true;
    currentSeat.lastAction = 'BỎ BÀI';
    currentSeat.hasActed = true;
    currentRoom.logs = currentRoom.logs || [];
    currentRoom.logs.push(`💨 [${currentSeat.name}] đã bỏ bài (Fold).`);
  } else if (action === 'CHECK') {
    currentSeat.lastAction = 'CHECK';
    currentSeat.hasActed = true;
    currentRoom.logs = currentRoom.logs || [];
    currentRoom.logs.push(`👌 [${currentSeat.name}] Check.`);
  } else if (action === 'CALL') {
    const callDiff = options.callAmount;
    currentSeat.chips -= callDiff;
    currentSeat.currentBet += callDiff;
    currentSeat.totalHandBet += callDiff;
    currentRoom.pot += callDiff;
    if (currentSeat.chips === 0) currentSeat.allIn = true;
    currentSeat.lastAction = currentSeat.allIn ? 'ALL-IN' : `THEO ${callDiff.toLocaleString()}`;
    currentSeat.hasActed = true;
    const unit = currentRoom.practice ? 'chip' : 'PP';
    currentRoom.logs = currentRoom.logs || [];
    currentRoom.logs.push(`🪙 [${currentSeat.name}] Theo ${callDiff.toLocaleString()} ${unit}.`);
  } else if (action === 'RAISE' || action === 'ALL_IN') {
    const targetBet = Math.min(options.maxRaiseTotal, Math.max(options.minRaiseTotal, raiseAmount));
    const raiseDiff = targetBet - currentSeat.currentBet;
    currentSeat.chips -= raiseDiff;
    currentSeat.currentBet = targetBet;
    currentSeat.totalHandBet += raiseDiff;
    currentRoom.pot += raiseDiff;

    const delta = targetBet - currentRoom.highestBet;
    if (delta > currentRoom.lastRaiseDelta) {
      currentRoom.lastRaiseDelta = delta;
    }
    currentRoom.highestBet = targetBet;
    if (currentSeat.chips === 0) currentSeat.allIn = true;
    currentSeat.lastAction = currentSeat.allIn ? `ALL-IN ${targetBet.toLocaleString()}` : `TỐ ${targetBet.toLocaleString()}`;
    currentSeat.hasActed = true;
    currentRoom.logs = currentRoom.logs || [];
    const unit = currentRoom.practice ? 'chip' : 'PP';
    currentRoom.logs.push(`🔥 [${currentSeat.name}] ${currentSeat.allIn ? 'ALL-IN' : 'Tố lên'} ${targetBet.toLocaleString()} ${unit}.`);
  }

  await advancePokerGame(db, roomId, currentRoom, executePPTransaction);
}
