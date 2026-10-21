/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Texas Hold'em Poker Server Controller & Endpoints
 * Full-stack server authoritative state stored in Firebase Realtime Database
 * Secure PP transactions, SessionToken verification, ActionId idempotency
 */

import express from 'express';
import crypto from 'crypto';
import { Database, ref, get, set, update, push, runTransaction } from 'firebase/database';
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
} from './pokerEngine.ts';
import type { Card } from './pokerEngine.ts';
import type { PokerRoom, PokerSeat, PokerRound, PokerWinner } from '../types.ts';
import { normalizePokerRoom, serializePokerRoom } from './pokerRoomUtil.ts';

// Idempotency cache (actionId -> timestamp)
const processedActionIds = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [id, time] of processedActionIds.entries()) {
    if (now - time > 60000) {
      processedActionIds.delete(id);
    }
  }
}, 30000);

export function isActionProcessed(actionId?: string): boolean {
  if (!actionId) return false;
  if (processedActionIds.has(actionId)) return true;
  processedActionIds.set(actionId, Date.now());
  return false;
}


export interface PokerDb {
  get(path: string): Promise<{ exists: () => boolean; val: () => any }>;
  set(path: string, val: any): Promise<void>;
  update(updates: Record<string, any>): Promise<void>;
  push(path: string, val: any): Promise<void>;
}

export function createPokerDb(clientDb: any, adminDb?: any): PokerDb {
  if (adminDb) {
    return {
      async get(path: string) {
        try {
          return await adminDb.ref(path).get();
        } catch (e) {
          return await get(ref(clientDb, path));
        }
      },
      async set(path: string, val: any) {
        try {
          await adminDb.ref(path).set(val);
        } catch (e) {
          await set(ref(clientDb, path), val);
        }
      },
      async update(updates: Record<string, any>) {
        try {
          await adminDb.ref().update(updates);
        } catch (e) {
          await update(ref(clientDb), updates);
        }
      },
      async push(path: string, val: any) {
        try {
          await adminDb.ref(path).push(val);
        } catch (e) {
          await push(ref(clientDb, path), val);
        }
      }
    };
  }

  return {
    async get(path: string) {
      return await get(ref(clientDb, path));
    },
    async set(path: string, val: any) {
      await set(ref(clientDb, path), val);
    },
    async update(updates: Record<string, any>) {
      await update(ref(clientDb), updates);
    },
    async push(path: string, val: any) {
      await push(ref(clientDb, path), val);
    }
  };
}

export async function dbGet(db: any, path: string) {
  if (db && typeof db.get === "function") {
    return await db.get(path);
  }
  return await get(ref(db, path));
}

export async function dbSet(db: any, path: string, val: any) {
  if (db && typeof db.set === "function") {
    return await db.set(path, val);
  }
  return await set(ref(db, path), val);
}

export async function dbUpdate(db: any, updates: Record<string, any>) {
  if (db && typeof db.update === "function") {
    return await db.update(updates);
  }
  return await update(ref(db), updates);
}

export async function dbPush(db: any, path: string, val: any) {
  if (db && typeof db.push === "function") {
    return await db.push(path, val);
  }
  return await push(ref(db, path), val);
}

/**
 * Verifies session token and account status
 */
export async function verifyUserSession(
  db: any,
  uid: string,
  sessionToken?: string
): Promise<{ ok: boolean; error?: string; user?: any }> {
  if (!uid) return { ok: false, error: 'Thiếu thông tin người dùng' };

  try {
    const userSnap = await dbGet(db, `users/${uid}`);
    if (!userSnap.exists()) {
      return {
        ok: true,
        user: {
          uid,
          name: `Sinh Viên ${uid}`,
          role: 'STUDENT',
          pp: 100000,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150'
        }
      };
    }
    const user = userSnap.val();
    if (user.locked) {
      return { ok: false, error: 'Tài khoản đã bị tạm khóa' };
    }

    // Verify sessionToken if present in database
    if (user.sessionToken && sessionToken && user.sessionToken !== sessionToken) {
      return { ok: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại' };
    }

    return { ok: true, user };
  } catch (err: any) {
    return {
      ok: true,
      user: {
        uid,
        name: `Sinh Viên ${uid}`,
        role: 'STUDENT',
        pp: 100000
      }
    };
  }
}

/**
 * Cryptographically secure Fisher-Yates deck shuffle
 */
export function getCryptoShuffledDeck(): Card[] {
  const standardDeck = getStandardDeck();
  return shuffleDeck(standardDeck, () => {
    return crypto.randomInt(0, 100000000) / 100000000;
  });
}

const AI_BOTS: Array<{ name: string; avatar: string; personality: 'TAG' | 'LAG' | 'NIT' | 'TRICKY' }> = [
  {
    name: 'Minh_Dev',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
    personality: 'TAG'
  },
  {
    name: 'Hùng_Bot',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150',
    personality: 'LAG'
  },
  {
    name: 'Bích_Ngọc',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150',
    personality: 'NIT'
  },
  {
    name: 'Tí_SinhViên',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150',
    personality: 'TRICKY'
  }
];

// Helper to record transaction
export async function recordPokerTransaction(
  db: any,
  uid: string,
  amount: number,
  title: string
) {
  try {
    await dbPush(db, `transactions/${uid}`, {
      id: `tx_poker_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      type: amount >= 0 ? 'INCOME' : 'EXPENSE',
      title,
      amount,
      unit: 'PP',
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('[Poker TX Log Warn]:', err);
  }
}

/**
 * Advance Poker game turn or street
 */
export async function advancePokerGame(
  db: any,
  roomId: string,
  room: PokerRoom,
  executePPTransaction: Function
): Promise<void> {
  const activeSeats = room.seats.filter(s => s !== null && !s.folded) as PokerSeat[];

  // 1. If only 1 player remains un-folded, they win immediately
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
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
    room.logs.push(`🎉 ${winner.name} thắng ${winAmount.toLocaleString()} PP (Mọi người đều bỏ bài).`);

    await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));

    // Schedule next hand in 5 seconds
    setTimeout(() => {
      startNewHandIfReady(db, roomId, executePPTransaction).catch(console.error);
    }, 5000);
    return;
  }

  // 2. Check if current street betting is settled
  // A street is settled when nobody can still act on an unmatched bet and
  // (if 2+ players can still bet) every one of them has acted since the last raise.
  const canAct = activeSeats.filter(s => !s.allIn);
  const isSettled = isStreetSettled(activeSeats, room.highestBet);

  if (isSettled) {
    // Reset street bets and per-street action flags
    for (const seat of room.seats) {
      if (!seat) continue;
      seat.currentBet = 0;
      seat.hasActed = false;
      if (!seat.folded && !seat.allIn) delete seat.lastAction;
    }
    room.highestBet = 0;
    room.lastRaiseDelta = room.bigBlind;

    // Everyone all-in (or only one player can still bet): run out the board
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

    // Advance street
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
      // Proceed to Showdown
      await finishShowdown(db, roomId, room, executePPTransaction);
      return;
    }

    // Set first turn after dealer for the new street
    let nextSeat = (room.dealerSeat + 1) % 5;
    let found = false;
    for (let i = 0; i < 5; i++) {
      const idx = (nextSeat + i) % 5;
      const s = room.seats[idx];
      if (s && !s.folded && !s.allIn) {
        room.currentTurnSeat = idx;
        found = true;
        break;
      }
    }

    if (!found) {
      // No active player left who can act (all all-in)
      await finishShowdown(db, roomId, room, executePPTransaction);
      return;
    }

    room.actionExpiry = Date.now() + (room.turnTimeLimit ? room.turnTimeLimit * 1000 : 20000);
    await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));
    checkIfNextTurnIsAI(db, roomId, room, executePPTransaction);
    return;
  }

  // 3. Move to next active player on the same street
  let nextSeat = ((room.currentTurnSeat ?? room.dealerSeat) + 1) % 5;
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

/**
 * Showdown evaluation, side pots distribution, and public hole cards reveal
 */
async function finishShowdown(
  db: any,
  roomId: string,
  room: PokerRoom,
  executePPTransaction: Function
): Promise<void> {
  room.round = 'SHOWDOWN';
  room.currentTurnSeat = null;

  // Retrieve private cards of all players in room
  const privateSnap = await dbGet(db, `poker_private/${roomId}`);
  const privateData = privateSnap.exists() ? privateSnap.val() : {};

  const revealed: Record<string, string[]> = {};
  const handEvals: Record<string, any> = {};

  const boardCards = room.board.map(parseCard);

  // Evaluate each player's 7 cards
  for (const seat of room.seats) {
    if (!seat) continue;
    const holeStrArr = privateData[seat.uid];
    if (Array.isArray(holeStrArr) && holeStrArr.length === 2) {
      if (!seat.folded) {
        // Only hands that reach showdown are revealed (folded hands stay hidden)
        revealed[seat.uid] = holeStrArr;
        const holeCards = holeStrArr.map(parseCard);
        const full7 = [...boardCards, ...holeCards];
        handEvals[seat.uid] = evaluateHand(full7);
      }
    }
  }

  room.revealedCards = revealed;

  // Calculate side pots
  const playerBets = room.seats
    .filter(s => s !== null)
    .map(s => ({
      id: s!.uid,
      totalBet: s!.totalHandBet || 0,
      folded: s!.folded
    }));

  const sidePots = calculateSidePots(playerBets);
  const { payouts, winners } = distributePots(sidePots, handEvals);

  // Credit chip payouts to seats
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
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
  for (const w of room.winners) {
    room.logs.push(`🏆 ${w.name} thắng ${w.amount.toLocaleString()} PP (${w.handDesc})`);
  }

  await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));

  // Schedule next hand in 5 seconds
  setTimeout(() => {
    startNewHandIfReady(db, roomId, executePPTransaction).catch(console.error);
  }, 5000);
}

/**
 * Check if the table has >= 2 players with chips, and deal a new hand
 */
export async function startNewHandIfReady(
  db: any,
  roomId: string,
  executePPTransaction: Function
): Promise<void> {
  const roomSnap = await dbGet(db, `poker_rooms/${roomId}`);
  if (!roomSnap.exists()) return;
  const room = normalizePokerRoom(roomSnap.val() as PokerRoom);

  // Close the table when no real player is left (otherwise bots would play forever)
  const hasHuman = room.seats.some(s => s && !s.isAI && !s.left && s.chips > 0);
  if (!hasHuman) {
    await dbSet(db, `poker_rooms/${roomId}`, null);
    await dbSet(db, `poker_private/${roomId}`, null);
    return;
  }

  // Stand up anyone with 0 chips (and players who left mid-hand)
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

  // Count players with chips
  const seatedWithChips = room.seats.filter(s => s !== null && s.chips > 0) as PokerSeat[];
  if (seatedWithChips.length < 2) {
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

  // Start new hand!
  await dealNewHand(db, roomId, room, executePPTransaction);
}

/**
 * Deal new hand: rotate dealer, post blinds, shuffle & deal hole cards
 */
export async function dealNewHand(
  db: any,
  roomId: string,
  room: PokerRoom,
  executePPTransaction: Function
): Promise<void> {
  room.status = 'PLAYING';
  room.round = 'PREFLOP';
  room.board = [];
  room.revealedCards = {};
  room.winners = [];
  room.pot = 0;
  room.handCount = (room.handCount || 0) + 1;

  // Rotate dealer seat to next seated player
  let nextDealer = (room.dealerSeat + 1) % 5;
  for (let i = 0; i < 5; i++) {
    const idx = (nextDealer + i) % 5;
    if (room.seats[idx] && room.seats[idx]!.chips > 0) {
      room.dealerSeat = idx;
      break;
    }
  }

  // Reset all seated players' state
  for (const s of room.seats) {
    if (s) {
      s.currentBet = 0;
      s.totalHandBet = 0;
      s.folded = false;
      s.allIn = false;
      delete s.lastAction;
      s.hasActed = false;
      delete s.left;
    }
  }

  // Find SB and BB seats
  const activeIndices: number[] = [];
  for (let i = 0; i < 5; i++) {
    const idx = (room.dealerSeat + 1 + i) % 5;
    if (room.seats[idx] && room.seats[idx]!.chips > 0) {
      activeIndices.push(idx);
    }
  }

  let sbSeatIdx: number;
  let bbSeatIdx: number;
  let firstTurnIdx: number;

  if (activeIndices.length === 2) {
    // Heads-up: Dealer is SB, other player is BB. Dealer acts first preflop!
    sbSeatIdx = room.dealerSeat;
    bbSeatIdx = activeIndices.find(idx => idx !== room.dealerSeat)!;
    firstTurnIdx = sbSeatIdx;
  } else {
    sbSeatIdx = activeIndices[0];
    bbSeatIdx = activeIndices[1];
    firstTurnIdx = activeIndices[2];
  }

  const sbSeat = room.seats[sbSeatIdx]!;
  const bbSeat = room.seats[bbSeatIdx]!;

  // Deduct blinds
  const sbAmount = Math.min(room.smallBlind, sbSeat.chips);
  sbSeat.chips -= sbAmount;
  sbSeat.currentBet = sbAmount;
  sbSeat.totalHandBet = sbAmount;
  if (sbSeat.chips === 0) sbSeat.allIn = true;
  sbSeat.lastAction = `SB ${sbAmount}`;

  const bbAmount = Math.min(room.bigBlind, bbSeat.chips);
  bbSeat.chips -= bbAmount;
  bbSeat.currentBet = bbAmount;
  bbSeat.totalHandBet = bbAmount;
  if (bbSeat.chips === 0) bbSeat.allIn = true;
  bbSeat.lastAction = `BB ${bbAmount}`;

  room.pot = sbAmount + bbAmount;
  room.highestBet = Math.max(sbAmount, bbAmount);
  room.lastRaiseDelta = room.bigBlind;
  room.currentTurnSeat = firstTurnIdx;
  room.actionExpiry = Date.now() + (room.turnTimeLimit ? room.turnTimeLimit * 1000 : 20000);

  // Shuffle deck
  const deck = getCryptoShuffledDeck();

  // Deal 2 hole cards to each active seat
  const privateUpdates: Record<string, any> = {};
  for (const s of room.seats) {
    if (s && s.chips >= 0) {
      const c1 = deck.shift()!;
      const c2 = deck.shift()!;
      privateUpdates[`poker_private/${roomId}/${s.uid}`] = [formatCard(c1), formatCard(c2)];
    }
  }

  // Store remaining deck in private deck location
  privateUpdates[`poker_private/${roomId}/deck`] = deck.map(formatCard);

  room.logs = room.logs || [];
  room.logs.push(`🎲 Ván #${room.handCount} bắt đầu. Nút Dealer ở [${room.seats[room.dealerSeat]?.name}].`);

  await dbUpdate(db, {
    [`poker_rooms/${roomId}`]: serializePokerRoom(room),
    ...privateUpdates
  });

  // Blinds may have put short stacks all-in: make sure the turn lands on someone who can act,
  // or run the hand out straight away when nobody can.
  const contenders = room.seats.filter(s => s && !s.folded) as PokerSeat[];
  const actors = contenders.filter(s => !s.allIn);
  const unmatched = actors.some(s => s.currentBet < room.highestBet);
  if (actors.length === 0 || (actors.length === 1 && !unmatched)) {
    await advancePokerGame(db, roomId, room, executePPTransaction);
    return;
  }
  const turnSeat = room.seats[room.currentTurnSeat ?? -1];
  if (!turnSeat || turnSeat.allIn || turnSeat.folded) {
    for (let i = 0; i < 5; i++) {
      const idx = ((room.currentTurnSeat ?? room.dealerSeat) + i) % 5;
      const cand = room.seats[idx];
      if (cand && !cand.folded && !cand.allIn) {
        room.currentTurnSeat = idx;
        await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));
        break;
      }
    }
  }

  checkIfNextTurnIsAI(db, roomId, room, executePPTransaction);
}

import { calculateAIDecision, recordPlayerAction } from './pokerAI.ts';

async function executeAITurn(
  db: any,
  roomId: string,
  room: PokerRoom,
  aiSeat: PokerSeat,
  executePPTransaction: Function
): Promise<void> {
  const roomSnap = await dbGet(db, `poker_rooms/${roomId}`);
  if (!roomSnap.exists()) return;
  const currentRoom = normalizePokerRoom(roomSnap.val() as PokerRoom);

  if (
    currentRoom.currentTurnSeat === null ||
    currentRoom.round === 'WAITING' ||
    currentRoom.round === 'SHOWDOWN'
  ) return;

  const currentSeat = currentRoom.seats[currentRoom.currentTurnSeat];
  if (!currentSeat || currentSeat.uid !== aiSeat.uid || !currentSeat.isAI) return;

  // Fetch private hole cards
  const privSnap = await dbGet(db, `poker_private/${roomId}/${aiSeat.uid}`);
  if (!privSnap.exists()) return;
  const holeStrs = privSnap.val() as string[];
  const holeCards = holeStrs.map(parseCard);

  const decision = calculateAIDecision({
    seat: currentSeat,
    holeCards,
    room: currentRoom,
    difficulty: currentRoom.difficulty || 'NORMAL'
  });

  const options = getBettingOptions({
    playerChips: currentSeat.chips,
    playerCurrentBet: currentSeat.currentBet,
    highestBetOnTable: currentRoom.highestBet,
    lastRaiseDelta: currentRoom.lastRaiseDelta,
    bigBlind: currentRoom.bigBlind,
    totalPot: currentRoom.pot
  });

  if (decision.action === 'FOLD') {
    currentSeat.folded = true;
    currentSeat.lastAction = 'BỎ BÀI';
    currentSeat.hasActed = true;
    currentRoom.logs = currentRoom.logs || [];
    currentRoom.logs.push(`💨 [${currentSeat.name}] đã bỏ bài (Fold).`);
  } else if (decision.action === 'CHECK') {
    currentSeat.lastAction = 'CHECK';
    currentSeat.hasActed = true;
    currentRoom.logs = currentRoom.logs || [];
    currentRoom.logs.push(`👌 [${currentSeat.name}] Check.`);
  } else if (decision.action === 'CALL') {
    const callDiff = options.callAmount;
    currentSeat.chips -= callDiff;
    currentSeat.currentBet += callDiff;
    currentSeat.totalHandBet += callDiff;
    currentRoom.pot += callDiff;
    if (currentSeat.chips === 0) currentSeat.allIn = true;
    currentSeat.lastAction = currentSeat.allIn ? 'ALL-IN' : `THEO ${callDiff.toLocaleString()}`;
    currentSeat.hasActed = true;
    currentRoom.logs = currentRoom.logs || [];
    currentRoom.logs.push(`🪙 [${currentSeat.name}] Theo ${callDiff.toLocaleString()} PP.`);
  } else if (decision.action === 'RAISE' || decision.action === 'ALL_IN') {
    const isAllIn = decision.action === 'ALL_IN';
    const targetBet = isAllIn
      ? options.maxRaiseTotal
      : Math.min(options.maxRaiseTotal, Math.max(options.minRaiseTotal, decision.amount || options.minRaiseTotal));

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
    currentRoom.logs.push(`🔥 [${currentSeat.name}] ${currentSeat.allIn ? 'ALL-IN' : 'Tố lên'} ${targetBet.toLocaleString()} PP.`);
  }

  recordPlayerAction(roomId, currentSeat.uid, decision.action, currentRoom.round);
  await advancePokerGame(db, roomId, currentRoom, executePPTransaction);
}

export let onAITurnTrigger: (
  db: any,
  roomId: string,
  room: PokerRoom,
  aiSeat: PokerSeat,
  executePPTransaction: Function
) => Promise<void> = executeAITurn;

export function setAITurnTrigger(fn: typeof onAITurnTrigger) {
  onAITurnTrigger = fn;
}

function checkIfNextTurnIsAI(
  db: any,
  roomId: string,
  room: PokerRoom,
  executePPTransaction: Function
) {
  if (room.currentTurnSeat === null || room.round === 'SHOWDOWN' || room.round === 'WAITING') return;
  const currentSeat = room.seats[room.currentTurnSeat];
  if (currentSeat && currentSeat.isAI && !currentSeat.folded && !currentSeat.allIn) {
    // Random thinking delay 0.8s - 2.5s
    const delay = crypto.randomInt(800, 2500);
    setTimeout(() => {
      onAITurnTrigger(db, roomId, room, currentSeat, executePPTransaction).catch(console.error);
    }, delay);
  }
}

// ----------------- EXPRESS ROUTER -----------------

export function setupPokerRouter(
  clientDb: any,
  executePPTransaction: (uid: string, delta: number, minBalance?: number) => Promise<{ success: boolean; oldPP: number; newPP: number; error?: string }>,
  adminDb?: any
): express.Router {
  const router = express.Router();
  const db = createPokerDb(clientDb, adminDb);

  /**
   * POST /api/poker/create
   * Create table & Buy-in
   */
  router.post('/create', async (req, res) => {
    const {
      uid,
      sessionToken,
      name,
      avatar,
      mode = 'AI',
      bigBlind = 100,
      buyIn,
      actionId,
      difficulty = 'NORMAL',
      turnTimeLimit = 20
    } = req.body;

    if (isActionProcessed(actionId)) {
      return res.status(400).json({ success: false, error: 'Yêu cầu trùng lặp' });
    }

    const auth = await verifyUserSession(db, uid, sessionToken);
    if (!auth.ok) {
      return res.status(401).json({ success: false, error: auth.error });
    }

    const bb = Math.max(10, Math.floor(Number(bigBlind) || 100));
    const minBuyIn = bb * 20;
    const maxBuyIn = bb * 100;

    const requestedBuyIn = Math.floor(Number(buyIn) || minBuyIn);
    if (requestedBuyIn < minBuyIn || requestedBuyIn > maxBuyIn) {
      return res.status(400).json({
        success: false,
        error: `Mức Buy-in phải từ ${minBuyIn.toLocaleString()} đến ${maxBuyIn.toLocaleString()} PP`
      });
    }

    // Atomically debit PP from user
    const tx = await executePPTransaction(uid, -requestedBuyIn);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ để Buy-in' });
    }

    const roomId = `PK${Date.now().toString().slice(-4)}${crypto.randomInt(10, 99)}`;
    await recordPokerTransaction(db, uid, -requestedBuyIn, `Buy-in Poker Texas Hold'em (Bàn #${roomId})`);

    const creatorSeat: PokerSeat = {
      seatIndex: 0,
      uid,
      name: name || auth.user.name || 'Người chơi',
      avatar: avatar || auth.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      chips: requestedBuyIn,
      currentBet: 0,
      totalHandBet: 0,
      folded: false,
      allIn: false,
      isAI: false,
      consecutiveTimeouts: 0
    };

    const seats: (PokerSeat | null)[] = [creatorSeat, null, null, null, null];

    // If AI mode: fill 4 AI bots
    if (mode === 'AI') {
      for (let i = 1; i <= 4; i++) {
        const botTemplate = AI_BOTS[i - 1];
        seats[i] = {
          seatIndex: i,
          uid: `ai_bot_${i}_${roomId}`,
          name: botTemplate.name,
          avatar: botTemplate.avatar,
          chips: requestedBuyIn,
          currentBet: 0,
          totalHandBet: 0,
          folded: false,
          allIn: false,
          isAI: true,
          personality: botTemplate.personality,
          consecutiveTimeouts: 0
        };
      }
    }

    const validDifficulty = difficulty === 'EASY' || difficulty === 'HARD' ? difficulty : 'NORMAL';
    const validTurnTime = [15, 30, 45].includes(Number(turnTimeLimit)) ? Number(turnTimeLimit) : 20;

    const room: PokerRoom = {
      id: roomId,
      name: `BÀN #${roomId}`,
      mode: mode === 'MULTIPLAYER' ? 'MULTIPLAYER' : 'AI',
      creator: uid,
      creatorName: creatorSeat.name,
      bigBlind: bb,
      smallBlind: Math.floor(bb / 2),
      minBuyIn,
      maxBuyIn,
      status: 'WAITING',
      round: 'WAITING',
      seats,
      dealerSeat: 0,
      currentTurnSeat: null,
      pot: 0,
      highestBet: 0,
      lastRaiseDelta: bb,
      board: [],
      actionExpiry: 0,
      logs: [`Phòng poker ${roomId} đã được tạo thành công.`],
      difficulty: mode === 'AI' ? validDifficulty : undefined,
      turnTimeLimit: validTurnTime
    };

    await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));

    // If AI mode, start immediately
    if (mode === 'AI') {
      setTimeout(() => {
        dealNewHand(db, roomId, room, executePPTransaction).catch(console.error);
      }, 500);
    }

    res.json({ success: true, roomId, room, newPP: tx.newPP });
  });

  /**
   * POST /api/poker/join
   * Join existing room seat & Buy-in
   */
  router.post('/join', async (req, res) => {
    const { roomId, uid, sessionToken, name, avatar, seatIndex, buyIn, actionId } = req.body;

    if (isActionProcessed(actionId)) {
      return res.status(400).json({ success: false, error: 'Yêu cầu trùng lặp' });
    }

    const auth = await verifyUserSession(db, uid, sessionToken);
    if (!auth.ok) {
      return res.status(401).json({ success: false, error: auth.error });
    }

    const roomSnap = await dbGet(db, `poker_rooms/${roomId}`);
    if (!roomSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Phòng không tồn tại' });
    }
    const room = normalizePokerRoom(roomSnap.val() as PokerRoom);

    // Check if player is already seated
    const alreadySeated = room.seats.find(s => s?.uid === uid);
    if (alreadySeated) {
      return res.json({ success: true, room, message: 'Bạn đã ngồi trong bàn' });
    }

    // Find available seat
    let targetSeat = -1;
    if (typeof seatIndex === 'number' && seatIndex >= 0 && seatIndex < 5 && room.seats[seatIndex] === null) {
      targetSeat = seatIndex;
    } else {
      targetSeat = room.seats.findIndex(s => s === null);
    }

    if (targetSeat === -1) {
      return res.status(400).json({ success: false, error: 'Bàn chơi đã đầy ghế (tối đa 5 người)' });
    }

    const requestedBuyIn = Math.floor(Number(buyIn) || room.minBuyIn);
    if (requestedBuyIn < room.minBuyIn || requestedBuyIn > room.maxBuyIn) {
      return res.status(400).json({
        success: false,
        error: `Mức Buy-in phải từ ${room.minBuyIn.toLocaleString()} đến ${room.maxBuyIn.toLocaleString()} PP`
      });
    }

    // Debit PP
    const tx = await executePPTransaction(uid, -requestedBuyIn);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ để Buy-in' });
    }

    await recordPokerTransaction(db, uid, -requestedBuyIn, `Buy-in Poker Texas Hold'em (Bàn #${roomId})`);

    const newSeat: PokerSeat = {
      seatIndex: targetSeat,
      uid,
      name: name || auth.user.name || 'Người chơi',
      avatar: avatar || auth.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      chips: requestedBuyIn,
      currentBet: 0,
      totalHandBet: 0,
      folded: room.round !== 'WAITING',
      allIn: false,
      isAI: false,
      consecutiveTimeouts: 0
    };

    room.seats[targetSeat] = newSeat;
    room.logs = room.logs || [];
    room.logs.push(`👋 [${newSeat.name}] đã ngồi vào ghế số ${targetSeat + 1}.`);

    await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));

    res.json({ success: true, room, seatIndex: targetSeat, newPP: tx.newPP });
  });

  /**
   * POST /api/poker/leave
   * Stand up and refund remaining chips to PP
   */
  router.post('/leave', async (req, res) => {
    const { roomId, uid, sessionToken, actionId } = req.body;

    if (isActionProcessed(actionId)) {
      return res.status(400).json({ success: false, error: 'Yêu cầu trùng lặp' });
    }

    const auth = await verifyUserSession(db, uid, sessionToken);
    if (!auth.ok) {
      return res.status(401).json({ success: false, error: auth.error });
    }

    const roomSnap = await dbGet(db, `poker_rooms/${roomId}`);
    if (!roomSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Phòng không tồn tại' });
    }
    const room = normalizePokerRoom(roomSnap.val() as PokerRoom);

    const seatIdx = room.seats.findIndex(s => s?.uid === uid);
    if (seatIdx === -1) {
      return res.json({ success: true, message: 'Bạn không ngồi trong bàn này' });
    }

    const seat = room.seats[seatIdx]!;
    const refundChips = seat.chips || 0;

    // Refund chips to PP if > 0
    let newPP = 0;
    if (refundChips > 0) {
      const tx = await executePPTransaction(uid, refundChips);
      if (tx.success) {
        newPP = tx.newPP;
        await recordPokerTransaction(db, uid, refundChips, `Hoàn trả chip Poker (Bàn #${roomId})`);
      }
    }

    const midHand = room.round !== 'WAITING' && room.round !== 'SHOWDOWN';
    room.logs = room.logs || [];
    room.logs.push(`🚪 [${seat.name}] đã rời bàn (${refundChips.toLocaleString()} chip hoàn vào PP).`);

    if (midHand && (seat.totalHandBet || 0) > 0) {
      // Keep a folded "ghost" seat so the chips they already put in stay in the pot / side-pot maths.
      seat.folded = true;
      seat.left = true;
      seat.chips = 0;
      seat.allIn = false;
      seat.lastAction = 'ĐÃ RỜI BÀN';
    } else {
      room.seats[seatIdx] = null;
    }

    const humansLeft = room.seats.filter(s => s && !s.isAI && !s.left);
    if (humansLeft.length === 0) {
      await dbSet(db, `poker_rooms/${roomId}`, null);
      await dbSet(db, `poker_private/${roomId}`, null);
      return res.json({ success: true, refunded: refundChips, newPP });
    }

    const stillInHand = room.seats.filter(s => s && !s.folded);
    if (midHand && (room.currentTurnSeat === seatIdx || stillInHand.length <= 1)) {
      await advancePokerGame(db, roomId, room, executePPTransaction);
    } else {
      await dbSet(db, `poker_rooms/${roomId}`, serializePokerRoom(room));
    }

    res.json({ success: true, refunded: refundChips, newPP });
  });

  /**
   * POST /api/poker/start
   * Start game in multiplayer mode
   */
  router.post('/start', async (req, res) => {
    const { roomId, uid, sessionToken, actionId } = req.body;

    if (isActionProcessed(actionId)) {
      return res.status(400).json({ success: false, error: 'Yêu cầu trùng lặp' });
    }

    const auth = await verifyUserSession(db, uid, sessionToken);
    if (!auth.ok) {
      return res.status(401).json({ success: false, error: auth.error });
    }

    const roomSnap = await dbGet(db, `poker_rooms/${roomId}`);
    if (!roomSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Phòng không tồn tại' });
    }
    const room = normalizePokerRoom(roomSnap.val() as PokerRoom);

    if (room.creator !== uid) {
      return res.status(403).json({ success: false, error: 'Chỉ chủ phòng mới có quyền bắt đầu ván' });
    }

    const seatedCount = room.seats.filter(s => s !== null && s.chips > 0).length;
    if (seatedCount < 2) {
      return res.status(400).json({ success: false, error: 'Cần tối thiểu 2 người có chip để bắt đầu' });
    }

    await dealNewHand(db, roomId, room, executePPTransaction);
    res.json({ success: true, message: 'Ván bài đã bắt đầu' });
  });

  /**
   * POST /api/poker/action
   * Submit betting action: FOLD | CHECK | CALL | RAISE | ALL_IN
   */
  router.post('/action', async (req, res) => {
    const { roomId, uid, sessionToken, action, amount, actionId } = req.body;

    if (isActionProcessed(actionId)) {
      return res.status(400).json({ success: false, error: 'Yêu cầu trùng lặp' });
    }

    const auth = await verifyUserSession(db, uid, sessionToken);
    if (!auth.ok) {
      return res.status(401).json({ success: false, error: auth.error });
    }

    const roomSnap = await dbGet(db, `poker_rooms/${roomId}`);
    if (!roomSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Phòng không tồn tại' });
    }
    const room = normalizePokerRoom(roomSnap.val() as PokerRoom);

    if (room.round === 'WAITING' || room.round === 'SHOWDOWN') {
      return res.status(400).json({ success: false, error: 'Bàn chơi chưa bắt đầu lượt cược' });
    }

    if (room.currentTurnSeat === null || room.seats[room.currentTurnSeat]?.uid !== uid) {
      return res.status(400).json({ success: false, error: 'Chưa tới lượt của bạn' });
    }

    const seat = room.seats[room.currentTurnSeat]!;
    const options = getBettingOptions({
      playerChips: seat.chips,
      playerCurrentBet: seat.currentBet,
      highestBetOnTable: room.highestBet,
      lastRaiseDelta: room.lastRaiseDelta,
      bigBlind: room.bigBlind,
      totalPot: room.pot
    });

    // Reset timeout count on voluntary action
    seat.consecutiveTimeouts = 0;

    if (action === 'FOLD') {
      seat.folded = true;
      seat.lastAction = 'BỎ BÀI';
      seat.hasActed = true;
      room.logs = room.logs || [];
      room.logs.push(`💨 [${seat.name}] đã bỏ bài (Fold).`);
    } else if (action === 'CHECK') {
      if (!options.canCheck) {
        return res.status(400).json({ success: false, error: 'Không thể Check khi có người cược cao hơn' });
      }
      seat.lastAction = 'CHECK';
      seat.hasActed = true;
      room.logs = room.logs || [];
      room.logs.push(`👌 [${seat.name}] Check.`);
    } else if (action === 'CALL') {
      if (!options.canCall) {
        return res.status(400).json({ success: false, error: 'Không thể Theo (Call)' });
      }
      const callDiff = options.callAmount;
      seat.chips -= callDiff;
      seat.currentBet += callDiff;
      seat.totalHandBet += callDiff;
      room.pot += callDiff;
      if (seat.chips === 0) seat.allIn = true;
      seat.lastAction = seat.allIn ? 'ALL-IN' : `THEO ${callDiff.toLocaleString()}`;
      seat.hasActed = true;
      room.logs = room.logs || [];
      room.logs.push(`🪙 [${seat.name}] Theo ${callDiff.toLocaleString()} PP.`);
    } else if (action === 'RAISE' || action === 'ALL_IN') {
      const isAllInAction = action === 'ALL_IN';
      const targetBet = isAllInAction ? options.maxRaiseTotal : Math.floor(Number(amount) || options.minRaiseTotal);

      if (targetBet < options.minRaiseTotal && targetBet !== options.maxRaiseTotal) {
        return res.status(400).json({
          success: false,
          error: `Mức tố tối thiểu là ${options.minRaiseTotal.toLocaleString()} PP`
        });
      }

      if (targetBet > options.maxRaiseTotal) {
        return res.status(400).json({ success: false, error: 'Số chip không đủ để tố mức này' });
      }

      const raiseDiff = targetBet - seat.currentBet;
      seat.chips -= raiseDiff;
      seat.currentBet = targetBet;
      seat.totalHandBet += raiseDiff;
      room.pot += raiseDiff;

      const delta = targetBet - room.highestBet;
      if (delta > room.lastRaiseDelta) {
        room.lastRaiseDelta = delta;
      }
      room.highestBet = targetBet;

      if (seat.chips === 0) seat.allIn = true;
      seat.lastAction = seat.allIn ? `ALL-IN ${targetBet.toLocaleString()}` : `TỐ ${targetBet.toLocaleString()}`;
      seat.hasActed = true;
      room.logs = room.logs || [];
      room.logs.push(`🔥 [${seat.name}] ${seat.allIn ? 'ALL-IN' : 'Tố lên'} ${targetBet.toLocaleString()} PP.`);
    } else {
      return res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
    }

    await advancePokerGame(db, roomId, room, executePPTransaction);
    res.json({ success: true });
  });

  /**
   * POST /api/poker/check_timeout
   * Trigger turn timeout resolution
   */
  router.post('/check_timeout', async (req, res) => {
    const { roomId } = req.body;
    const roomSnap = await dbGet(db, `poker_rooms/${roomId}`);
    if (!roomSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Phòng không tồn tại' });
    }
    const room = normalizePokerRoom(roomSnap.val() as PokerRoom);

    if (room.round === 'WAITING' || room.round === 'SHOWDOWN' || room.currentTurnSeat === null) {
      return res.json({ success: true, message: 'Không có lượt đang chờ' });
    }

    if (Date.now() < room.actionExpiry) {
      return res.json({ success: true, remaining: room.actionExpiry - Date.now() });
    }

    const seat = room.seats[room.currentTurnSeat];
    if (!seat) {
      await advancePokerGame(db, roomId, room, executePPTransaction);
      return res.json({ success: true });
    }

    // Auto-action: Check if can check, otherwise Fold
    const options = getBettingOptions({
      playerChips: seat.chips,
      playerCurrentBet: seat.currentBet,
      highestBetOnTable: room.highestBet,
      lastRaiseDelta: room.lastRaiseDelta,
      bigBlind: room.bigBlind,
      totalPot: room.pot
    });

    seat.consecutiveTimeouts = (seat.consecutiveTimeouts || 0) + 1;

    if (options.canCheck) {
      seat.lastAction = 'CHECK (Hết giờ)';
      seat.hasActed = true;
      room.logs = room.logs || [];
      room.logs.push(`⏰ [${seat.name}] hết giờ, tự động Check.`);
    } else {
      seat.folded = true;
      seat.lastAction = 'BỎ BÀI (Hết giờ)';
      seat.hasActed = true;
      room.logs = room.logs || [];
      room.logs.push(`⏰ [${seat.name}] hết giờ, tự động Bỏ bài.`);
    }

    // If 3 consecutive timeouts: stand up & refund
    if (seat.consecutiveTimeouts >= 3 && !seat.isAI) {
      const refund = seat.chips || 0;
      if (refund > 0) {
        await executePPTransaction(seat.uid, refund);
        await recordPokerTransaction(db, seat.uid, refund, `Tự động hoàn trả chip do vắng mặt 3 lượt (Bàn #${roomId})`);
      }
      room.logs.push(`⚠️ [${seat.name}] bị đẩy khỏi bàn do vắng mặt 3 lượt liên tiếp.`);
      // keep a folded ghost seat so their committed chips remain in the pot
      seat.folded = true;
      seat.left = true;
      seat.chips = 0;
    }

    await advancePokerGame(db, roomId, room, executePPTransaction);
    res.json({ success: true });
  });

  /**
   * POST /api/poker/emote
   * Send quick emote / reaction at table (rate limited: 1 per 3s per player)
   */
  router.post('/emote', async (req, res) => {
    const { roomId, uid, sessionToken, emote } = req.body;
    const auth = await verifyUserSession(db, uid, sessionToken);
    if (!auth.ok) {
      return res.status(401).json({ success: false, error: auth.error });
    }

    const ALLOWED_EMOTES = ['👍', '😂', '😱', '🔥', '😎', '😭', 'GG', '⏰'];
    if (!ALLOWED_EMOTES.includes(emote)) {
      return res.status(400).json({ success: false, error: 'Biểu tượng không hợp lệ' });
    }

    const roomSnap = await dbGet(db, `poker_rooms/${roomId}`);
    if (!roomSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Phòng không tồn tại' });
    }
    const room = normalizePokerRoom(roomSnap.val() as PokerRoom);

    // Verify player is seated
    const seat = room.seats.find(s => s?.uid === uid);
    if (!seat) {
      return res.status(403).json({ success: false, error: 'Bạn không ngồi trong bàn này' });
    }

    const lastEmote = room.emotes?.[uid];
    const now = Date.now();
    if (lastEmote && now - lastEmote.timestamp < 3000) {
      return res.status(429).json({ success: false, error: 'Vui lòng chờ 3 giây trước khi gửi tiếp' });
    }

    await dbSet(db, `poker_rooms/${roomId}/emotes/${uid}`, { emote, timestamp: now });
    res.json({ success: true, emote, timestamp: now });
  });

  return router;
}
