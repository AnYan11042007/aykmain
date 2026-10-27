/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Client-side API Fallback for Static Deployments (e.g. GitHub Pages)
 * When no backend server is running or /api/* returns 404/NetworkError,
 * this module authoritatively executes actions client-side using Firebase Realtime Database.
 */

import { ref, get, set, update, runTransaction, push } from 'firebase/database';
import { db, auth } from '../firebase';
import {
  dealNewHand,
  advancePokerGame,
  startNewHandIfReady,
  secureRandom,
  secureRandomInt,
  AI_BOT_TEMPLATES
} from '../poker/pokerCore';
import { normalizePokerRoom, serializePokerRoom } from '../poker/pokerRoomUtil';
import type { PokerRoom, PokerSeat, PokerDifficulty } from '../types';

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

function getEffectiveUid(body: any): string {
  return auth.currentUser?.uid || body?.uid || localStorage.getItem('s88_uid') || 'anonymous_user';
}

/**
 * Execute client-side PP transaction on wallets/${uid}/pp and mirrors to users/${uid}/pp
 */
export async function executeClientPPTransaction(
  uid: string,
  delta: number,
  minBalance = 0
): Promise<{ success: boolean; oldPP: number; newPP: number; error?: string }> {
  try {
    const walletRef = ref(db, `wallets/${uid}/pp`);
    let previousVal = 0;
    let nextVal = 0;

    const txResult = await runTransaction(walletRef, (curr) => {
      const currentBalance = curr === null ? 100000 : Number(curr) || 0;
      previousVal = currentBalance;
      if (delta < 0 && currentBalance + delta < minBalance) {
        return undefined; // abort
      }
      nextVal = currentBalance + delta;
      return nextVal;
    });

    if (!txResult.committed) {
      return { success: false, oldPP: previousVal, newPP: previousVal, error: 'Số dư PP không đủ' };
    }

    // Mirror to users/${uid}/pp for UI reactivity
    try {
      await update(ref(db, `users/${uid}`), { pp: nextVal });
    } catch (_) {}

    return { success: true, oldPP: previousVal, newPP: nextVal };
  } catch (err: any) {
    console.warn('[Client PP Tx Error]:', err);
    // If rules forbid wallets write, attempt users/${uid}/pp directly
    try {
      const userRef = ref(db, `users/${uid}/pp`);
      let previousVal = 0;
      let nextVal = 0;
      const res = await runTransaction(userRef, (curr) => {
        const currentBalance = curr === null ? 100000 : Number(curr) || 0;
        previousVal = currentBalance;
        if (delta < 0 && currentBalance + delta < minBalance) return undefined;
        nextVal = currentBalance + delta;
        return nextVal;
      });
      if (res.committed) {
        return { success: true, oldPP: previousVal, newPP: nextVal };
      }
    } catch (_) {}
    return { success: false, oldPP: 0, newPP: 0, error: err?.message || 'Lỗi cập nhật số dư' };
  }
}

export async function handleClientApiFallback(path: string, options: RequestInit = {}): Promise<Response> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  let body: any = {};
  try {
    if (options.body && typeof options.body === 'string') {
      body = JSON.parse(options.body);
    }
  } catch (_) {}

  const uid = getEffectiveUid(body);

  // 1. Health check
  if (cleanPath === '/api/health') {
    return jsonResponse({
      status: 'ok',
      standalone: true,
      timestamp: Date.now()
    });
  }

  // 2. Auth register profile
  if (cleanPath === '/api/auth/register-profile') {
    const { name, role, avatar, studentCode, department } = body;
    const initialPP = 100000;
    const profile = {
      name: name || 'Sinh Viên AYK',
      role: role || 'STUDENT',
      avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      studentCode: studentCode || 'SV' + Math.floor(1000 + Math.random() * 9000),
      department: department || 'Công Nghệ Thông Tin',
      pp: initialPP,
      xp: 0,
      gold: 0,
      createdAt: Date.now(),
      level: 1,
      unlockedFrames: ['default']
    };
    try {
      await update(ref(db, `users/${uid}`), profile);
      await set(ref(db, `wallets/${uid}/pp`), initialPP);
    } catch (_) {}
    return jsonResponse({ success: true, profile });
  }

  // 3. Wallet init
  if (cleanPath === '/api/wallet/init-registration') {
    await set(ref(db, `wallets/${uid}/pp`), 100000);
    await update(ref(db, `users/${uid}`), { pp: 100000 });
    return jsonResponse({ success: true, pp: 100000 });
  }

  // 4. Tài Xỉu
  if (cleanPath === '/api/game/roll') {
    const bet = Math.floor(Number(body.betAmount) || 0);
    const choice = body.choice; // 'TAI' | 'XIU'
    if (bet <= 0) return jsonResponse({ success: false, error: 'Số tiền cược không hợp lệ' }, 400);

    const tx = await executeClientPPTransaction(uid, -bet, bet);
    if (!tx.success) return jsonResponse({ success: false, error: tx.error || 'Số dư không đủ' }, 400);

    const d1 = secureRandomInt(1, 7);
    const d2 = secureRandomInt(1, 7);
    const d3 = secureRandomInt(1, 7);
    const sum = d1 + d2 + d3;
    const isStorm = d1 === d2 && d2 === d3;
    const outcome = isStorm ? 'STORM' : sum >= 11 ? 'TAI' : 'XIU';
    const won = !isStorm && choice === outcome;
    const payout = won ? bet * 2 : 0;

    let finalPP = tx.newPP;
    if (won) {
      const rewardTx = await executeClientPPTransaction(uid, payout);
      finalPP = rewardTx.newPP;
    }

    return jsonResponse({
      success: true,
      dice: [d1, d2, d3],
      sum,
      result: outcome,
      won,
      payout,
      newPP: finalPP
    });
  }

  // 5. Roulette
  if (cleanPath === '/api/game/roulette') {
    const bet = Math.floor(Number(body.betAmount) || 0);
    const betType = body.betType;
    const betVal = body.betVal;
    if (bet <= 0) return jsonResponse({ success: false, error: 'Mức cược không hợp lệ' }, 400);

    const tx = await executeClientPPTransaction(uid, -bet, bet);
    if (!tx.success) return jsonResponse({ success: false, error: tx.error || 'Số dư không đủ' }, 400);

    const number = secureRandomInt(0, 37); // 0 to 36
    const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(number);
    let won = false;
    let multiplier = 0;

    if (betType === 'NUMBER' && Number(betVal) === number) {
      won = true;
      multiplier = 35;
    } else if (betType === 'COLOR') {
      if ((betVal === 'RED' && isRed) || (betVal === 'BLACK' && !isRed && number !== 0)) {
        won = true;
        multiplier = 2;
      }
    } else if (betType === 'PARITY') {
      if (number !== 0 && ((betVal === 'EVEN' && number % 2 === 0) || (betVal === 'ODD' && number % 2 !== 0))) {
        won = true;
        multiplier = 2;
      }
    }

    const payout = won ? bet * multiplier : 0;
    let finalPP = tx.newPP;
    if (won) {
      const rewardTx = await executeClientPPTransaction(uid, payout);
      finalPP = rewardTx.newPP;
    }

    return jsonResponse({
      success: true,
      number,
      isRed,
      won,
      payout,
      newPP: finalPP
    });
  }

  // 6. Horse racing
  if (cleanPath === '/api/game/horse') {
    const bet = Math.floor(Number(body.betAmount) || 0);
    const horseChoice = Number(body.horseId);
    if (bet <= 0) return jsonResponse({ success: false, error: 'Mức cược không hợp lệ' }, 400);

    const tx = await executeClientPPTransaction(uid, -bet, bet);
    if (!tx.success) return jsonResponse({ success: false, error: tx.error || 'Số dư không đủ' }, 400);

    const horses = [1, 2, 3, 4].sort(() => secureRandom() - 0.5);
    const winner = horses[0];
    const won = winner === horseChoice;
    const payout = won ? Math.floor(bet * 3.8) : 0;

    let finalPP = tx.newPP;
    if (won) {
      const rewardTx = await executeClientPPTransaction(uid, payout);
      finalPP = rewardTx.newPP;
    }

    return jsonResponse({
      success: true,
      winner,
      order: horses,
      won,
      payout,
      newPP: finalPP
    });
  }

  // 7. Airplane / Crash
  if (cleanPath === '/api/game/airplane') {
    const { action, betAmount, multiplier, roundId } = body;
    if (action === 'bet') {
      const amt = Math.floor(Number(betAmount) || 0);
      if (amt <= 0) return jsonResponse({ success: false, error: 'Mức cược không hợp lệ' }, 400);
      const tx = await executeClientPPTransaction(uid, -amt, amt);
      if (!tx.success) return jsonResponse({ success: false, error: tx.error || 'Số dư không đủ' }, 400);

      const r = secureRandom();
      const crashPoint = Math.max(1.02, parseFloat((0.95 / (1 - r * 0.95)).toFixed(2)));
      const betData = {
        roundId: roundId || Date.now(),
        amount: amt,
        crashPoint,
        startedAt: Date.now(),
        status: 'PLAYING'
      };
      await set(ref(db, `users/${uid}/crash_game`), betData);
      return jsonResponse({ success: true, bet: betData, newPP: tx.newPP });
    } else if (action === 'cashout') {
      const betSnap = await get(ref(db, `users/${uid}/crash_game`));
      if (!betSnap.exists()) return jsonResponse({ success: false, error: 'Không tìm thấy cược' }, 400);
      const bet = betSnap.val();
      if (bet.status !== 'PLAYING') return jsonResponse({ success: false, error: 'Cược đã kết thúc' }, 400);

      const clientMult = parseFloat(multiplier) || 1.0;
      if (clientMult >= bet.crashPoint) {
        await update(ref(db, `users/${uid}/crash_game`), { status: 'CRASHED' });
        return jsonResponse({ success: false, error: 'Phi thuyền đã nổ!', crashed: true }, 400);
      }

      const winAmount = Math.floor(bet.amount * clientMult);
      const tx = await executeClientPPTransaction(uid, winAmount);
      await update(ref(db, `users/${uid}/crash_game`), { status: 'CASHED_OUT', multiplier: clientMult });
      return jsonResponse({ success: true, winAmount, multiplier: clientMult, newPP: tx.newPP });
    } else if (action === 'crash') {
      await update(ref(db, `users/${uid}/crash_game`), { status: 'CRASHED' });
      return jsonResponse({ success: true });
    }
  }

  // 8. Live stream bet & evaluate (Includes Dragon Tiger 100% refund on TIE!)
  if (cleanPath === '/api/live-stream/bet') {
    const amt = Math.floor(Number(body.amount) || 0);
    if (amt <= 0) return jsonResponse({ success: false, error: 'Mức cược không hợp lệ' }, 400);
    const tx = await executeClientPPTransaction(uid, -amt, amt);
    if (!tx.success) return jsonResponse({ success: false, error: tx.error || 'Số dư không đủ' }, 400);
    return jsonResponse({ success: true, newPP: tx.newPP });
  }

  if (cleanPath === '/api/live-stream/evaluate') {
    const { won, payout } = body;
    const amt = Math.floor(Number(payout) || 0);
    let newPP = 0;
    if (won && amt > 0) {
      const tx = await executeClientPPTransaction(uid, amt);
      newPP = tx.newPP;
    }
    return jsonResponse({ success: true, newPP });
  }

  // 9. Attendance check-in
  if (cleanPath === '/api/attendance/checkin') {
    const reward = 5000;
    const tx = await executeClientPPTransaction(uid, reward);
    const today = new Date().toISOString().slice(0, 10);
    try {
      await update(ref(db, `users/${uid}/attendance`), { [today]: true, lastCheckin: Date.now() });
    } catch (_) {}
    return jsonResponse({ success: true, reward, newPP: tx.newPP });
  }

  // 10. Missions claim
  if (cleanPath === '/api/missions/claim') {
    const { missionId, rewardPP = 2000 } = body;
    const tx = await executeClientPPTransaction(uid, rewardPP);
    return jsonResponse({ success: true, rewardPP, newPP: tx.newPP, missionId });
  }

  // 11. Wheel spin
  if (cleanPath === '/api/wheel/spin') {
    const prizes = [
      { id: 1, label: '1,000 PP', pp: 1000 },
      { id: 2, label: '5,000 PP', pp: 5000 },
      { id: 3, label: '10,000 PP', pp: 10000 },
      { id: 4, label: '50,000 PP', pp: 50000 },
      { id: 5, label: 'May Mắn Lần Sau', pp: 0 },
      { id: 6, label: '2,000 PP', pp: 2000 }
    ];
    const prize = prizes[secureRandomInt(0, prizes.length)];
    let newPP = 0;
    if (prize.pp > 0) {
      const tx = await executeClientPPTransaction(uid, prize.pp);
      newPP = tx.newPP;
    }
    return jsonResponse({ success: true, prize, newPP });
  }

  // 12. Bank transfer
  if (cleanPath === '/api/bank/transfer') {
    const { receiverUid, amount } = body;
    const amt = Math.floor(Number(amount) || 0);
    if (amt <= 0) return jsonResponse({ success: false, error: 'Số tiền chuyển không hợp lệ' }, 400);
    const txSender = await executeClientPPTransaction(uid, -amt, amt);
    if (!txSender.success) return jsonResponse({ success: false, error: 'Số dư không đủ' }, 400);
    await executeClientPPTransaction(receiverUid, amt);
    return jsonResponse({ success: true, newPP: txSender.newPP, transferred: amt });
  }

  // 13. Gold trade
  if (cleanPath === '/api/gold/trade') {
    const { action, amount = 1 } = body;
    const pricePerGold = 10000;
    const totalCost = amount * pricePerGold;
    if (action === 'BUY') {
      const tx = await executeClientPPTransaction(uid, -totalCost, totalCost);
      if (!tx.success) return jsonResponse({ success: false, error: 'Số dư không đủ' }, 400);
      try {
        await runTransaction(ref(db, `users/${uid}/gold`), (g) => (Number(g) || 0) + amount);
      } catch (_) {}
      return jsonResponse({ success: true, newPP: tx.newPP });
    } else {
      const tx = await executeClientPPTransaction(uid, totalCost);
      try {
        await runTransaction(ref(db, `users/${uid}/gold`), (g) => Math.max(0, (Number(g) || 0) - amount));
      } catch (_) {}
      return jsonResponse({ success: true, newPP: tx.newPP });
    }
  }

  // 14. Academic quiz submit
  if (cleanPath === '/api/academic/quiz-submit') {
    const { score = 100 } = body;
    const reward = Math.floor(score * 50);
    const tx = await executeClientPPTransaction(uid, reward);
    return jsonResponse({ success: true, reward, newPP: tx.newPP });
  }

  // 15. Marketplace buy
  if (cleanPath === '/api/marketplace/buy') {
    const { price = 5000, itemId } = body;
    const tx = await executeClientPPTransaction(uid, -price, price);
    if (!tx.success) return jsonResponse({ success: false, error: 'Số dư không đủ mua vật phẩm' }, 400);
    return jsonResponse({ success: true, newPP: tx.newPP, itemId });
  }

  // 16. Battle Pass
  if (cleanPath === '/api/battlepass/upgrade') {
    const cost = 50000;
    const tx = await executeClientPPTransaction(uid, -cost, cost);
    if (!tx.success) return jsonResponse({ success: false, error: 'Số dư không đủ nâng cấp Battle Pass' }, 400);
    await update(ref(db, `users/${uid}`), { isPremiumBattlePass: true });
    return jsonResponse({ success: true, newPP: tx.newPP });
  }

  if (cleanPath === '/api/battlepass/claim') {
    const rewardPP = 10000;
    const tx = await executeClientPPTransaction(uid, rewardPP);
    return jsonResponse({ success: true, rewardPP, newPP: tx.newPP });
  }

  // 17. World Hunting
  if (cleanPath === '/api/hunting/fire') {
    const cost = Math.floor(Number(body.bulletCost) || 100);
    const tx = await executeClientPPTransaction(uid, -cost, cost);
    if (!tx.success) return jsonResponse({ success: false, error: 'Số dư không đủ bắn đạn' }, 400);
    return jsonResponse({ success: true, newPP: tx.newPP });
  }

  if (cleanPath === '/api/hunting/kill') {
    const reward = Math.floor(Number(body.reward) || 500);
    const tx = await executeClientPPTransaction(uid, reward);
    return jsonResponse({ success: true, newPP: tx.newPP });
  }

  // 18. Promo code
  if (cleanPath === '/api/promo/redeem') {
    const code = (body.code || '').trim().toUpperCase();
    if (code === 'AYK8686' || code === 'CHAOMUNG') {
      const tx = await executeClientPPTransaction(uid, 50000);
      return jsonResponse({ success: true, reward: 50000, newPP: tx.newPP, message: 'Nhận thành công 50,000 PP!' });
    }
    return jsonResponse({ success: false, error: 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn' }, 400);
  }

  // ==========================================
  // 19. POKER ENDPOINTS (Stand-alone client execution)
  // ==========================================
  if (cleanPath.startsWith('/api/poker/')) {
    const pokerAction = cleanPath.replace('/api/poker/', '');

    if (pokerAction === 'create') {
      const { name, avatar, mode, bigBlind, buyIn, difficulty, turnTimeLimit } = body;
      const targetMode = mode === 'AI' ? 'AI' : 'MULTIPLAYER';
      const bb = Math.max(10, Math.floor(Number(bigBlind) || 100));
      const minBuyIn = bb * 20;
      const maxBuyIn = bb * 100;
      const isPractice = targetMode === 'AI' && (difficulty === 'EASY' || difficulty === 'NORMAL');
      const requestedBuyIn = isPractice ? 5000 : Math.max(minBuyIn, Math.min(maxBuyIn, Number(buyIn) || minBuyIn));

      let userNewPP = 0;
      if (!isPractice) {
        const tx = await executeClientPPTransaction(uid, -requestedBuyIn, requestedBuyIn);
        if (!tx.success) {
          return jsonResponse({ success: false, error: tx.error || 'Số dư PP không đủ để Buy-in' }, 400);
        }
        userNewPP = tx.newPP;
      }

      const roomId = `PK${Date.now().toString().slice(-4)}${secureRandomInt(10, 99)}`;
      const creatorSeat: PokerSeat = {
        seatIndex: 0,
        uid,
        name: name || 'Võ sĩ AYK',
        avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        chips: requestedBuyIn,
        currentBet: 0,
        totalHandBet: 0,
        folded: false,
        allIn: false,
        isAI: false,
        consecutiveTimeouts: 0
      };

      const seats: Array<PokerSeat | null> = [creatorSeat, null, null, null, null];

      if (targetMode === 'AI') {
        const validDiff: PokerDifficulty = difficulty || 'NORMAL';
        const templates = AI_BOT_TEMPLATES[validDiff];
        for (let i = 1; i < 5; i++) {
          const t = templates[(i - 1) % templates.length];
          seats[i] = {
            seatIndex: i,
            uid: `bot_${roomId}_${i}`,
            name: t.name,
            avatar: t.avatar,
            chips: requestedBuyIn,
            currentBet: 0,
            totalHandBet: 0,
            folded: false,
            allIn: false,
            isAI: true,
            personality: t.personality,
            consecutiveTimeouts: 0
          };
        }
      }

      const room: PokerRoom = {
        id: roomId,
        name: `BÀN #${roomId}`,
        mode: targetMode,
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
        logs: [`Phòng poker ${roomId} (${isPractice ? 'Luyện tập · 5,000 chip ảo' : 'Cược PP'}) đã được tạo thành công.`],
        difficulty: targetMode === 'AI' ? difficulty : undefined,
        turnTimeLimit: [15, 30, 45].includes(Number(turnTimeLimit)) ? Number(turnTimeLimit) : 20,
        practice: isPractice
      };

      await set(ref(db, `poker_rooms/${roomId}`), serializePokerRoom(room));

      if (targetMode === 'AI') {
        setTimeout(() => {
          dealNewHand(db, roomId, room, executeClientPPTransaction).catch(console.error);
        }, 300);
      }

      return jsonResponse({ success: true, roomId, room, newPP: userNewPP });
    }

    if (pokerAction === 'join') {
      const { roomId, name, avatar, buyIn } = body;
      const roomSnap = await get(ref(db, `poker_rooms/${roomId}`));
      if (!roomSnap.exists()) return jsonResponse({ success: false, error: 'Phòng không tồn tại' }, 404);
      const room = normalizePokerRoom(roomSnap.val() as PokerRoom);

      const alreadySeated = room.seats.find(s => s?.uid === uid);
      if (alreadySeated) return jsonResponse({ success: true, room });

      const targetSeat = room.seats.findIndex(s => s === null);
      if (targetSeat === -1) return jsonResponse({ success: false, error: 'Bàn chơi đã đầy ghế' }, 400);

      const requestedBuyIn = Math.floor(Number(buyIn) || room.minBuyIn);
      let userNewPP = 0;
      if (!room.practice) {
        const tx = await executeClientPPTransaction(uid, -requestedBuyIn, requestedBuyIn);
        if (!tx.success) return jsonResponse({ success: false, error: 'Số dư không đủ Buy-in' }, 400);
        userNewPP = tx.newPP;
      }

      const newSeat: PokerSeat = {
        seatIndex: targetSeat,
        uid,
        name: name || 'Người chơi',
        avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
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

      await set(ref(db, `poker_rooms/${roomId}`), serializePokerRoom(room));
      return jsonResponse({ success: true, room, seatIndex: targetSeat, newPP: userNewPP });
    }

    if (pokerAction === 'leave') {
      const { roomId } = body;
      const roomSnap = await get(ref(db, `poker_rooms/${roomId}`));
      if (!roomSnap.exists()) return jsonResponse({ success: true });
      const room = normalizePokerRoom(roomSnap.val() as PokerRoom);
      const seatIdx = room.seats.findIndex(s => s?.uid === uid);
      if (seatIdx === -1) return jsonResponse({ success: true });

      const seat = room.seats[seatIdx]!;
      const refundChips = seat.chips || 0;
      let newPP = 0;
      if (!room.practice && refundChips > 0) {
        const tx = await executeClientPPTransaction(uid, refundChips);
        newPP = tx.newPP;
      }

      room.seats[seatIdx] = null;
      const humansLeft = room.seats.filter(s => s && !s.isAI && !s.left);
      if (humansLeft.length === 0) {
        await set(ref(db, `poker_rooms/${roomId}`), null);
        await set(ref(db, `poker_private/${roomId}`), null);
        return jsonResponse({ success: true, refunded: refundChips, newPP });
      }

      await set(ref(db, `poker_rooms/${roomId}`), serializePokerRoom(room));
      return jsonResponse({ success: true, refunded: refundChips, newPP });
    }

    if (pokerAction === 'action') {
      const { roomId, action, raiseAmount } = body;
      const roomSnap = await get(ref(db, `poker_rooms/${roomId}`));
      if (!roomSnap.exists()) return jsonResponse({ success: false, error: 'Phòng không tồn tại' }, 404);
      const room = normalizePokerRoom(roomSnap.val() as PokerRoom);

      if (room.currentTurnSeat === null || room.seats[room.currentTurnSeat]?.uid !== uid) {
        return jsonResponse({ success: false, error: 'Chưa tới lượt của bạn' }, 400);
      }

      const seat = room.seats[room.currentTurnSeat]!;
      const callDiff = Math.max(0, room.highestBet - seat.currentBet);

      if (action === 'FOLD') {
        seat.folded = true;
        seat.lastAction = 'BỎ BÀI';
        seat.hasActed = true;
        room.logs = room.logs || [];
        room.logs.push(`💨 [${seat.name}] đã bỏ bài (Fold).`);
      } else if (action === 'CHECK') {
        if (callDiff > 0) return jsonResponse({ success: false, error: 'Bạn phải Theo hoặc Bỏ bài' }, 400);
        seat.lastAction = 'CHECK';
        seat.hasActed = true;
        room.logs = room.logs || [];
        room.logs.push(`👌 [${seat.name}] Check.`);
      } else if (action === 'CALL') {
        const actualCall = Math.min(seat.chips, callDiff);
        seat.chips -= actualCall;
        seat.currentBet += actualCall;
        seat.totalHandBet += actualCall;
        room.pot += actualCall;
        if (seat.chips === 0) seat.allIn = true;
        seat.lastAction = seat.allIn ? 'ALL-IN' : `THEO ${actualCall.toLocaleString()}`;
        seat.hasActed = true;
        const unit = room.practice ? 'chip' : 'PP';
        room.logs = room.logs || [];
        room.logs.push(`🪙 [${seat.name}] Theo ${actualCall.toLocaleString()} ${unit}.`);
      } else if (action === 'BET' || action === 'RAISE' || action === 'ALL_IN') {
        const targetBet = action === 'ALL_IN'
          ? seat.currentBet + seat.chips
          : Math.floor(Number(raiseAmount) || (room.highestBet + room.bigBlind));
        const raiseDiff = targetBet - seat.currentBet;
        if (raiseDiff > seat.chips) return jsonResponse({ success: false, error: 'Không đủ chip' }, 400);

        seat.chips -= raiseDiff;
        seat.currentBet = targetBet;
        seat.totalHandBet += raiseDiff;
        room.pot += raiseDiff;

        const delta = targetBet - room.highestBet;
        if (delta > room.lastRaiseDelta) room.lastRaiseDelta = delta;
        room.highestBet = targetBet;
        if (seat.chips === 0) seat.allIn = true;
        seat.lastAction = seat.allIn ? `ALL-IN ${targetBet.toLocaleString()}` : `TỐ ${targetBet.toLocaleString()}`;
        seat.hasActed = true;
        const unit = room.practice ? 'chip' : 'PP';
        room.logs = room.logs || [];
        room.logs.push(`🔥 [${seat.name}] ${seat.allIn ? 'ALL-IN' : 'Tố lên'} ${targetBet.toLocaleString()} ${unit}.`);
      }

      await advancePokerGame(db, roomId, room, executeClientPPTransaction);
      return jsonResponse({ success: true });
    }

    if (pokerAction === 'rebuy_practice') {
      const { roomId } = body;
      const roomSnap = await get(ref(db, `poker_rooms/${roomId}`));
      if (!roomSnap.exists()) return jsonResponse({ success: false, error: 'Phòng không tồn tại' }, 404);
      const room = normalizePokerRoom(roomSnap.val() as PokerRoom);
      const seat = room.seats.find(s => s?.uid === uid);
      if (!seat) return jsonResponse({ success: false, error: 'Bạn không ngồi trong bàn này' }, 403);

      seat.chips = 5000;
      seat.folded = false;
      seat.allIn = false;
      for (const s of room.seats) {
        if (s && s.isAI && s.chips <= 0) s.chips = 5000;
      }
      room.logs = room.logs || [];
      room.logs.push(`🔄 [${seat.name}] đã nạp lại 5,000 chip luyện tập miễn phí.`);
      await set(ref(db, `poker_rooms/${roomId}`), serializePokerRoom(room));

      if (room.status === 'WAITING' || room.round === 'WAITING') {
        setTimeout(() => {
          dealNewHand(db, roomId, room, executeClientPPTransaction).catch(console.error);
        }, 500);
      }
      return jsonResponse({ success: true, chips: seat.chips });
    }

    if (pokerAction === 'emote') {
      const { roomId, emote } = body;
      await set(ref(db, `poker_rooms/${roomId}/emotes/${uid}`), { emote, timestamp: Date.now() });
      return jsonResponse({ success: true, emote, timestamp: Date.now() });
    }

    if (pokerAction === 'check_timeout') {
      return jsonResponse({ success: true });
    }
  }

  // Catch-all response
  return jsonResponse({ success: true, message: 'Thao tác hoàn tất (Chế độ Standalone)' });
}
