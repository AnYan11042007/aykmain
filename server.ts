/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { initializeApp as initAdminApp, getApps as getAdminApps, cert } from 'firebase-admin/app';
import { getDatabase as getAdminDatabase } from 'firebase-admin/database';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { setupPokerRouter } from './src/poker/pokerServer.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// ----------------- RATE LIMITERS (EXPRESS-RATE-LIMIT) -----------------
export const geminiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Quá nhiều yêu cầu AI, vui lòng thử lại sau.' }
});

export const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Thao tác trò chơi quá nhanh, vui lòng chờ vài giây.' }
});

export const bankLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Quá nhiều yêu cầu chuyển tiền. Vui lòng chờ giây lát.' }
});

export const wheelLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Quá nhiều lượt quay liên tục. Vui lòng thử lại sau.' }
});

// ----------------- FIREBASE ADMIN INITIALIZATION (MANDATORY) -----------------
const databaseURL = process.env.FIREBASE_DATABASE_URL || 
  process.env.VITE_FIREBASE_DATABASE_URL || 
  "https://appsinhvien-24482-default-rtdb.asia-southeast1.firebasedatabase.app";

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('[FATAL] FIREBASE_SERVICE_ACCOUNT is required to run the AYK server. Service account credential missing.');
  process.exit(1);
}

let adminDb: ReturnType<typeof getAdminDatabase>;
let adminAuth: ReturnType<typeof getAdminAuth>;

try {
  if (getAdminApps().length === 0) {
    const rawSa = process.env.FIREBASE_SERVICE_ACCOUNT;
    const sa = typeof rawSa === 'string' && rawSa.trim().startsWith('{')
      ? JSON.parse(rawSa)
      : rawSa;

    initAdminApp({
      credential: cert(sa),
      databaseURL
    });
  }
  adminDb = getAdminDatabase();
  adminAuth = getAdminAuth();
  console.log('[Firebase Admin] Initialized Firebase Admin SDK successfully');
} catch (err: any) {
  console.error('[FATAL] Failed to initialize Firebase Admin SDK:', err?.message || err);
  process.exit(1);
}

// ----------------- AUTHENTICATION MIDDLEWARE -----------------
/**
 * Require valid Firebase ID Token in Authorization: Bearer <token>
 * Populates req.uid and req.user strictly from verified Firebase token.
 * Fake or test tokens are strictly disallowed.
 */
export const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Yêu cầu xác thực: Thiếu Authorization header dạng Bearer <token>' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    return res.status(401).json({ success: false, error: 'Mã xác thực không hợp lệ' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    let effectiveUid = decoded.uid;

    // Check if there is an auth_mapping for this auth.uid
    try {
      const mappedSnap = await adminDb.ref(`auth_mapping/${decoded.uid}`).get();
      if (mappedSnap.exists()) {
        effectiveUid = String(mappedSnap.val());
      } else if (decoded.email) {
        const emailPrefix = decoded.email.split('@')[0];
        const userSnap = await adminDb.ref(`users/${emailPrefix}`).get();
        if (userSnap.exists()) {
          effectiveUid = emailPrefix;
          await adminDb.ref(`auth_mapping/${decoded.uid}`).set(emailPrefix);
        }
      }
    } catch (mapErr) {
      // Non-fatal, fallback to decoded.uid
    }

    (req as any).uid = effectiveUid;
    (req as any).authUid = decoded.uid;
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    console.error('[Auth Middleware Error]:', err?.message || err);
    return res.status(401).json({ success: false, error: 'Phiên xác thực không hợp lệ hoặc đã hết hạn' });
  }
};

// ----------------- GEMINI CLIENT -----------------
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn('GEMINI_API_KEY is not defined in environment variables.');
    }
    ai = new GoogleGenAI({
      apiKey: key || 'MOCK_KEY_FOR_DEV',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

// ----------------- HEALTH CHECK -----------------
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    adminConnected: !!adminDb,
    env: process.env.NODE_ENV || 'development' 
  });
});

// ----------------- GEMINI ROUTES (AUTHENTICATED & RATE-LIMITED) -----------------
app.post('/api/gemini/tutor', requireAuth, geminiLimiter, async (req, res) => {
  const { question, subject, studentStats } = req.body;
  try {
    const client = getGeminiClient();
    const systemPrompt = `Bạn là AI Gia Sư học đường thông minh của trường AYK MAIN 8686. 
Nhiệm vụ: giải thích kiến thức, bài tập học phần "${subject || 'Đại Cương'}" cho học sinh/sinh viên.
Chỉ số học lực: Cần Cù (${studentStats?.[0] || 50}), Trí Tuệ (${studentStats?.[1] || 50}), Nhân Phẩm (${studentStats?.[4] || 50}).
Hãy giải thích súc tích, dễ hiểu, khích lệ tinh thần học thuật, dùng Markdown rõ ràng.`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: question,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error?.message || 'Có lỗi khi gọi Gemini API' });
  }
});

app.post('/api/gemini/chat', requireAuth, geminiLimiter, async (req, res) => {
  const { message } = req.body;
  try {
    const client = getGeminiClient();
    const systemPrompt = `Bạn là AYK 8686 Core AI - Trợ lý thông minh trường học AYK MAIN 8686.
Hỗ trợ sinh viên về thông tin lớp học, học bổng PP, thi đua học tập và rèn luyện kỹ năng. Trả lời bằng tiếng Việt, lịch sự, thân thiện, dùng Markdown đẹp.`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error?.message || 'Có lỗi khi kết nối AI' });
  }
});

// ----------------- SERVER-AUTHORITATIVE WALLET & MISSION HELPERS -----------------

/**
 * Execute atomic transaction on user's PP strictly using node wallets/$uid/pp
 * When wallet does not exist, defaults strictly to 0 PP (NO auto-granting 100,000 PP)
 */
export async function executePPTransaction(
  uid: string, 
  delta: number, 
  minBalance = 0
): Promise<{ success: boolean; oldPP: number; newPP: number; error?: string }> {
  let previousValue = 0;
  let finalValue = 0;

  try {
    const walletPPRef = adminDb.ref(`wallets/${uid}/pp`);
    const walletSnap = await walletPPRef.get();
    let currentBalance = 0;

    if (walletSnap.exists()) {
      currentBalance = Number(walletSnap.val()) || 0;
    } else {
      // Check legacy users/${uid}/pp for existing accounts
      const legacySnap = await adminDb.ref(`users/${uid}/pp`).get();
      if (legacySnap.exists()) {
        currentBalance = Number(legacySnap.val()) || 0;
        await walletPPRef.set(currentBalance);
      } else {
        // STRICT: Do NOT auto-grant 100,000 PP if wallet does not exist. Default to 0.
        currentBalance = 0;
        await walletPPRef.set(0);
      }
    }

    const txResult = await walletPPRef.transaction((currentPP: any) => {
      const balance = currentPP === null ? currentBalance : Number(currentPP);
      previousValue = balance;
      if (delta < 0 && balance + delta < minBalance) {
        return undefined; // Real abort on insufficient balance
      }
      finalValue = balance + delta;
      return finalValue;
    });

    if (!txResult.committed) {
      return { success: false, oldPP: previousValue, newPP: previousValue, error: 'Số dư PP không đủ' };
    }

    // Mirror to users/${uid}/pp for read-compatibility
    try {
      await adminDb.ref(`users/${uid}/pp`).set(finalValue);
    } catch (_) {}

    return { success: true, oldPP: previousValue, newPP: finalValue };
  } catch (err: any) {
    console.error(`[Admin PP Transaction for ${uid} Error]:`, err?.message || err);
    return { success: false, oldPP: 0, newPP: 0, error: err?.message || 'Lỗi xử lý giao dịch máy chủ' };
  }
}

/**
 * Add XP and Battle Pass progress directly to user's wallet on server
 */
export async function addWalletXP(uid: string, xpDelta: number) {
  try {
    const cleanDelta = Math.max(0, Math.floor(xpDelta));
    if (cleanDelta <= 0) return;
    const walletRef = adminDb.ref(`wallets/${uid}`);
    await walletRef.child('xp').transaction((val) => (Number(val) || 0) + cleanDelta);
    await walletRef.child('battlePassXP').transaction((val) => (Number(val) || 0) + cleanDelta);
    // Mirror to users/${uid}
    await adminDb.ref(`users/${uid}/xp`).transaction((val) => (Number(val) || 0) + cleanDelta);
    await adminDb.ref(`users/${uid}/battlePassXP`).transaction((val) => (Number(val) || 0) + cleanDelta);
  } catch (err) {
    console.warn('[addWalletXP Notice]:', err);
  }
}

/**
 * Server-authoritative daily mission progress recorder
 * Progress only increments when server records completed game rounds
 */
export async function recordMissionActivityServer(uid: string, missionType: string, amount = 1) {
  try {
    const now = new Date();
    const vnDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = vnDate.toISOString().slice(0, 10);

    const mListRef = adminDb.ref(`users/${uid}/daily_missions/${todayStr}/missions_list`);
    const snap = await mListRef.get();
    if (!snap.exists()) return;

    const val = snap.val();
    const list: any[] = Array.isArray(val) ? val : Object.values(val);
    let changed = false;

    const gameTypes = [
      'taixiu_wins', 'taixiu_play', 'crash_rides', 'penalty_goals', 'horse_rides',
      'card_battle', 'claw_machine', 'fcmobile_match', 'world_hunting', 'wheel_spins'
    ];
    const isGameActivity = gameTypes.includes(missionType) || missionType === 'game_play';

    const updatedList = list.map((m) => {
      if (!m || m.claimed) return m;
      const isMatch = m.type === missionType;
      const isGeneric = m.type === 'game_play' && isGameActivity;
      if ((isMatch || isGeneric) && m.current < m.target) {
        changed = true;
        return {
          ...m,
          current: Math.min((Number(m.current) || 0) + amount, Number(m.target) || 1)
        };
      }
      return m;
    });

    if (changed) {
      await mListRef.set(updatedList);
    }
  } catch (err) {
    console.warn('[recordMissionActivityServer Error]:', err);
  }
}

/**
 * Initial 100,000 PP registration wallet initializer (Invoked strictly upon new account creation)
 */
app.post('/api/wallet/init-registration', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  if (!uid) {
    return res.status(400).json({ success: false, error: 'Thiếu UID người dùng' });
  }

  try {
    const walletRef = adminDb.ref(`wallets/${uid}`);
    const snap = await walletRef.get();

    if (!snap.exists()) {
      const initialWallet = {
        pp: 100000, // 100k PP granted strictly on first registration only
        xp: 0,
        level: 1,
        gold: { amount: 0, avgPrice: 0 },
        inventory: { frames: [], badges: [] },
        battlePassXP: 0,
        gachaCoins: 0,
        isPremiumBattlePass: false,
        unlockedFrames: [],
        createdAt: Date.now()
      };
      await walletRef.set(initialWallet);
      await adminDb.ref(`users/${uid}/pp`).set(100000);
      return res.json({ success: true, initialized: true, wallet: initialWallet });
    }

    return res.json({ success: true, initialized: false, wallet: snap.val() });
  } catch (err: any) {
    console.error('[Init Wallet Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lỗi khởi tạo ví người dùng' });
  }
});

// ----------------- GAME ROLL (AUTHENTICATED & RATE-LIMITED) -----------------

/**
 * Server-authoritative game evaluation endpoint
 * Takes UID strictly from verified token (ignores client-supplied uid in body)
 */
app.post('/api/game/roll', requireAuth, gameLimiter, async (req, res) => {
  const uid = (req as any).uid;
  const { game, betAmount, choice, clientMeta } = req.body;

  if (!uid || typeof betAmount !== 'number' || betAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Thông tin cược không hợp lệ' });
  }

  // Maximum bet safety limit per turn (50,000 PP) to prevent gambling escalation
  const MAX_BET = 50000;
  const sanitizedBet = Math.min(Math.floor(betAmount), MAX_BET);

  try {
    // 1. Verify user exists and is not locked
    const userSnap = await adminDb.ref(`users/${uid}`).get();
    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Tài khoản không tồn tại' });
    }
    const userData = userSnap.val();
    if (userData.locked) {
      return res.status(403).json({ success: false, error: 'Tài khoản đang bị khóa' });
    }

    let won = false;
    let multiplier = 0;
    let outcomeDetails: any = {};
    let resultSummary = '';

    // Cryptographically secure RNG resolution
    if (game === 'taixiu') {
      const d1 = crypto.randomInt(1, 7);
      const d2 = crypto.randomInt(1, 7);
      const d3 = crypto.randomInt(1, 7);
      const total = d1 + d2 + d3;
      const isTai = total >= 11 && total <= 17;
      const isXiu = total >= 4 && total <= 10;
      const isTriple = (d1 === d2 && d2 === d3);

      outcomeDetails = { dices: [d1, d2, d3], total, isTriple };
      if (!isTriple && ((choice === 'TAI' && isTai) || (choice === 'XIU' && isXiu))) {
        won = true;
        multiplier = 2.0;
        resultSummary = `Thắng cửa ${choice} (${total} điểm)`;
      } else {
        won = false;
        multiplier = 0;
        resultSummary = isTriple ? `Bộ 3 đồng nhất (${d1}-${d2}-${d3}) - Nhà cái thắng` : `Thua cược (${total} điểm - ${isTai ? 'TÀI' : 'XỈU'})`;
      }
    } else if (game === 'penalty') {
      const target = choice || crypto.randomInt(0, 4);
      const gkDive = crypto.randomInt(0, 4);
      won = (target !== gkDive);
      multiplier = won ? 1.95 : 0;
      outcomeDetails = { target, gkDive, isGoal: won };
      resultSummary = won ? 'Ghi bàn xuất sắc! +PP' : 'Thủ môn cản phá thành công!';
    } else if (game === 'airplane' || game === 'crash') {
      const r = crypto.randomInt(1, 10001) / 10000;
      const crashPoint = Math.max(1.0, parseFloat((0.96 / (1 - r * 0.93)).toFixed(2)));
      outcomeDetails = { crashPoint };
      
      const requestedMultiplier = parseFloat(choice) || 1.5;
      if (requestedMultiplier <= crashPoint) {
        won = true;
        multiplier = requestedMultiplier;
        resultSummary = `Nhảy dù thành công ở mốc x${requestedMultiplier}`;
      } else {
        won = false;
        multiplier = 0;
        resultSummary = `Tàu vũ trụ nổ ở x${crashPoint}`;
      }
    } else if (game === 'rps') {
      const choices = ['rock', 'paper', 'scissors'];
      const serverPick = choices[crypto.randomInt(0, 3)];
      const userPick = String(choice).toLowerCase();
      let outcome = 'draw';
      if (userPick === serverPick) {
        outcome = 'draw';
        multiplier = 1.0;
        won = true;
      } else if (
        (userPick === 'rock' && serverPick === 'scissors') ||
        (userPick === 'paper' && serverPick === 'rock') ||
        (userPick === 'scissors' && serverPick === 'paper')
      ) {
        outcome = 'win';
        multiplier = 2.0;
        won = true;
      } else {
        outcome = 'lose';
        multiplier = 0;
        won = false;
      }
      outcomeDetails = { userPick, serverPick, outcome };
      resultSummary = outcome === 'win' ? 'Thắng oẳn tù tì' : outcome === 'draw' ? 'Hòa oẳn tù tì' : 'Thua oẳn tù tì';
    } else {
      const randVal = crypto.randomInt(0, 2);
      won = randVal === 1;
      multiplier = won ? 2.0 : 0;
      outcomeDetails = { outcome: won ? 'WIN' : 'LOSE' };
      resultSummary = won ? 'Chiến thắng mini-game' : 'Chưa may mắn';
    }

    // 2. Calculate net profit / loss
    const payout = won ? Math.floor(sanitizedBet * multiplier) : 0;
    const pnl = payout - sanitizedBet;

    // 3. Atomically execute transaction on wallets node
    const tx = await executePPTransaction(uid, pnl, sanitizedBet);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || 'Giao dịch thất bại' });
    }

    // 4. Record audit log
    const timestamp = Date.now();
    await adminDb.ref('game_logs').push({
      uid,
      name: userData.name || 'Sinh Viên',
      game,
      bet: sanitizedBet,
      pnl,
      payout,
      outcomeDetails,
      result: resultSummary,
      time: new Date().toLocaleString('vi-VN'),
      timestamp
    });

    // 5. Update daily mission progress strictly from server
    if (game === 'taixiu' && won) {
      await recordMissionActivityServer(uid, 'taixiu_wins');
    } else if (game === 'penalty' && won) {
      await recordMissionActivityServer(uid, 'penalty_goals');
    }
    await recordMissionActivityServer(uid, 'game_play');

    res.json({
      success: true,
      won,
      bet: sanitizedBet,
      payout,
      pnl,
      outcomeDetails,
      resultSummary,
      oldPP: tx.oldPP,
      newPP: tx.newPP
    });
  } catch (err: any) {
    console.error('[Game Roll Server Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lỗi xử lý kết quả trò chơi' });
  }
});

// ----------------- MINI-GAME SERVER ENDPOINTS (ROULETTE, HORSE, CRYPTO, AIRPLANE, CLAW, FCMOBILE, CYBER3D, WORLDCARD) -----------------

/**
 * Server-authoritative Roulette resolution
 */
app.post('/api/game/roulette', requireAuth, gameLimiter, async (req, res) => {
  const uid = (req as any).uid;
  const { bets } = req.body;

  if (!uid || !Array.isArray(bets) || bets.length === 0) {
    return res.status(400).json({ success: false, error: 'Dữ liệu cược roulette không hợp lệ' });
  }

  const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

  let totalStake = 0;
  for (const b of bets) {
    const amt = Math.floor(Number(b.amount) || 0);
    if (amt <= 0) return res.status(400).json({ success: false, error: 'Mức cược không hợp lệ' });
    totalStake += amt;
  }

  if (totalStake > 100000) {
    return res.status(400).json({ success: false, error: 'Tổng tiền cược vượt quá 100,000 PP' });
  }

  // Cryptographically secure RNG resolution: 0 - 36
  const winningNum = crypto.randomInt(0, 37);
  const isRed = RED_NUMBERS.includes(winningNum);
  const isBlack = BLACK_NUMBERS.includes(winningNum);
  const isGreen = winningNum === 0;

  let totalPayout = 0;
  const details: string[] = [];

  for (const bet of bets) {
    const amt = Math.floor(Number(bet.amount) || 0);
    let mult = 0;

    if (bet.choice === 'RED' && isRed) mult = 2;
    else if (bet.choice === 'BLACK' && isBlack) mult = 2;
    else if (bet.choice === 'GREEN' && isGreen) mult = 36;
    else if (bet.choice === 'LOW' && winningNum >= 1 && winningNum <= 18) mult = 2;
    else if (bet.choice === 'HIGH' && winningNum >= 19 && winningNum <= 36) mult = 2;
    else if (bet.choice === 'DOZEN_1' && winningNum >= 1 && winningNum <= 12) mult = 3;
    else if (bet.choice === 'DOZEN_2' && winningNum >= 13 && winningNum <= 24) mult = 3;
    else if (bet.choice === 'DOZEN_3' && winningNum >= 25 && winningNum <= 36) mult = 3;
    else if (typeof bet.choice === 'string' && bet.choice.startsWith('NUM_')) {
      const num = parseInt(bet.choice.replace('NUM_', ''), 10);
      if (num === winningNum) mult = 36;
    }

    if (mult > 0) {
      const pay = amt * mult;
      totalPayout += pay;
      details.push(`Trúng ${bet.choice} (+${pay.toLocaleString()} PP)`);
    }
  }

  const pnl = totalPayout - totalStake;
  const tx = await executePPTransaction(uid, pnl, totalStake);
  if (!tx.success) {
    return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ' });
  }

  await adminDb.ref('game_logs').push({
    uid,
    game: 'Roulette',
    bet: totalStake,
    pnl,
    result: totalPayout > 0 ? `Thắng ô [${winningNum}]` : `Thua ô [${winningNum}]`,
    time: new Date().toLocaleString('vi-VN'),
    timestamp: Date.now()
  });

  await recordMissionActivityServer(uid, 'game_play');

  res.json({
    success: true,
    winningNum,
    totalStake,
    totalPayout,
    pnl,
    won: totalPayout > 0,
    details,
    newPP: tx.newPP
  });
});

/**
 * Server-authoritative Horse Race resolution
 */
app.post('/api/game/horse', requireAuth, gameLimiter, async (req, res) => {
  const uid = (req as any).uid;
  const { choice, betAmount } = req.body;
  const horseChoice = parseInt(choice, 10);
  const amt = Math.floor(Number(betAmount) || 0);

  if (!uid || isNaN(horseChoice) || horseChoice < 1 || horseChoice > 4 || amt <= 0 || amt > 50000) {
    return res.status(400).json({ success: false, error: 'Thông tin cược đua ngựa không hợp lệ' });
  }

  const winningHorse = crypto.randomInt(1, 5); // 1 to 4
  const isWinner = horseChoice === winningHorse;
  const payout = isWinner ? amt * 3 : 0;
  const pnl = payout - amt;

  const tx = await executePPTransaction(uid, pnl, amt);
  if (!tx.success) {
    return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ' });
  }

  await adminDb.ref('game_logs').push({
    uid,
    game: 'Đua Ngựa',
    bet: amt,
    pnl,
    result: isWinner ? `Thắng (Ngựa #${winningHorse} về nhất)` : `Thua (Ngựa #${winningHorse} về nhất)`,
    time: new Date().toLocaleString('vi-VN'),
    timestamp: Date.now()
  });

  await recordMissionActivityServer(uid, 'horse_rides');

  res.json({
    success: true,
    winningHorse,
    isWinner,
    payout,
    pnl,
    newPP: tx.newPP
  });
});

/**
 * Server-authoritative Crypto Trade (Rug Pull / Cash Out)
 */
app.post('/api/game/crypto', requireAuth, gameLimiter, async (req, res) => {
  const uid = (req as any).uid;
  const { action, betAmount, multiplier } = req.body;

  if (!uid) return res.status(400).json({ success: false, error: 'Thiếu UID' });

  if (action === 'bet') {
    const amt = Math.floor(Number(betAmount) || 0);
    if (amt <= 0 || amt > 50000) return res.status(400).json({ success: false, error: 'Mức cược không hợp lệ' });

    const tx = await executePPTransaction(uid, -amt, amt);
    if (!tx.success) return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ' });

    // Generate authoritative rug pull point (min 1.0, max 100.0)
    const r = crypto.randomInt(1, 10001) / 10000;
    const isInstantRug = crypto.randomInt(1, 101) <= 8; // 8% instant rug
    const rugPoint = isInstantRug ? 1.00 : parseFloat(Math.max(1.00, Math.min(100.00, 1.0 / (r * 0.95))).toFixed(2));

    const roundId = Date.now();
    await adminDb.ref(`crypto_active_bets/${uid}`).set({
      roundId,
      amount: amt,
      rugPoint,
      startedAt: Date.now(),
      status: 'PLAYING'
    });

    return res.json({ success: true, roundId, rugPoint, newPP: tx.newPP });
  } else if (action === 'cashout') {
    const mult = parseFloat(multiplier);
    if (isNaN(mult) || mult < 1.01) return res.status(400).json({ success: false, error: 'Hệ số không hợp lệ' });

    const betSnap = await adminDb.ref(`crypto_active_bets/${uid}`).get();
    if (!betSnap.exists() || betSnap.val().status !== 'PLAYING') {
      return res.status(400).json({ success: false, error: 'Không tìm thấy lượt cược đang chơi' });
    }

    const bet = betSnap.val();
    if (mult > bet.rugPoint) {
      await adminDb.ref(`crypto_active_bets/${uid}`).update({ status: 'RUGGED' });
      return res.status(400).json({ success: false, error: `Thị trường đã sập ở x${bet.rugPoint}!` });
    }

    const winAmount = Math.floor(bet.amount * mult);
    const profit = winAmount - bet.amount;
    const tx = await executePPTransaction(uid, winAmount);

    await adminDb.ref(`crypto_active_bets/${uid}`).update({ status: 'CASHED_OUT', mult, winAmount });

    await adminDb.ref('game_logs').push({
      uid,
      game: 'Crypto Trade',
      bet: bet.amount,
      pnl: profit,
      result: `Chốt lời x${mult.toFixed(2)} (+${profit.toLocaleString()} PP)`,
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    await recordMissionActivityServer(uid, 'game_play');

    return res.json({ success: true, winAmount, profit, newPP: tx.newPP });
  } else if (action === 'rugged') {
    const betSnap = await adminDb.ref(`crypto_active_bets/${uid}`).get();
    if (betSnap.exists() && betSnap.val().status === 'PLAYING') {
      const bet = betSnap.val();
      await adminDb.ref(`crypto_active_bets/${uid}`).update({ status: 'RUGGED' });
      await adminDb.ref('game_logs').push({
        uid,
        game: 'Crypto Trade',
        bet: bet.amount,
        pnl: -bet.amount,
        result: `Bị Rug Pull ở x${bet.rugPoint}`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });
    }
    return res.json({ success: true });
  }

  res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
});

/**
 * Server-authoritative Airplane / Crash Game (Bet, Cash Out, Crash)
 */
app.post('/api/game/airplane', requireAuth, gameLimiter, async (req, res) => {
  const uid = (req as any).uid;
  const { action, betAmount, multiplier, roundId } = req.body;

  if (!uid) return res.status(400).json({ success: false, error: 'Thiếu UID' });

  if (action === 'bet') {
    const amt = Math.floor(Number(betAmount) || 0);
    if (amt <= 0 || amt > 50000) return res.status(400).json({ success: false, error: 'Mức cược không hợp lệ' });

    const tx = await executePPTransaction(uid, -amt, amt);
    if (!tx.success) return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ' });

    await adminDb.ref(`airplane_active_bets/${uid}`).set({
      roundId: roundId || Date.now(),
      amount: amt,
      status: 'PLAYING',
      timestamp: Date.now()
    });

    await addWalletXP(uid, 25);
    await recordMissionActivityServer(uid, 'crash_rides');

    return res.json({ success: true, newPP: tx.newPP });
  } else if (action === 'cashout') {
    const mult = parseFloat(multiplier);
    if (isNaN(mult) || mult < 1.01) return res.status(400).json({ success: false, error: 'Hệ số nhảy dù không hợp lệ' });

    const betSnap = await adminDb.ref(`airplane_active_bets/${uid}`).get();
    if (!betSnap.exists() || betSnap.val().status !== 'PLAYING') {
      return res.status(400).json({ success: false, error: 'Không tìm thấy cược nhảy dù đang chơi' });
    }

    const bet = betSnap.val();
    const winAmount = Math.floor(bet.amount * mult);
    const profit = winAmount - bet.amount;

    const tx = await executePPTransaction(uid, winAmount);
    await adminDb.ref(`airplane_active_bets/${uid}`).update({ status: 'CASHED_OUT', multiplier: mult, winAmount });

    await adminDb.ref('game_logs').push({
      uid,
      game: 'Crash',
      bet: bet.amount,
      pnl: profit,
      result: `Nhảy dù chốt x${mult.toFixed(2)} (Thắng)`,
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    return res.json({ success: true, winAmount, profit, newPP: tx.newPP });
  } else if (action === 'crash') {
    const betSnap = await adminDb.ref(`airplane_active_bets/${uid}`).get();
    if (betSnap.exists() && betSnap.val().status === 'PLAYING') {
      const bet = betSnap.val();
      await adminDb.ref(`airplane_active_bets/${uid}`).update({ status: 'CRASHED' });
      await adminDb.ref('game_logs').push({
        uid,
        game: 'Crash',
        bet: bet.amount,
        pnl: -bet.amount,
        result: `Phi thuyền phát nổ (Thua)`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });
    }
    return res.json({ success: true });
  }

  res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
});

/**
 * Server-authoritative Claw Machine resolution
 */
app.post('/api/game/claw', requireAuth, gameLimiter, async (req, res) => {
  const uid = (req as any).uid;
  const { betAmount } = req.body;
  const amt = Math.floor(Number(betAmount) || 0);

  if (!uid || amt <= 0 || amt > 50000) {
    return res.status(400).json({ success: false, error: 'Mức cược không hợp lệ' });
  }

  const deductTx = await executePPTransaction(uid, -amt, amt);
  if (!deductTx.success) {
    return res.status(400).json({ success: false, error: deductTx.error || 'Số dư PP không đủ' });
  }

  const PRIZES = [
    { type: '🦄', name: 'Kỳ Lân May Mắn', mult: 10, weight: 5, slipChance: 0.70 },
    { type: '🐼', name: 'Gấu Trúc Dễ Thương', mult: 3, weight: 20, slipChance: 0.40 },
    { type: '🐻', name: 'Gấu Nâu Tinh Nghịch', mult: 3, weight: 25, slipChance: 0.40 },
    { type: '🦊', name: 'Cáo Lửa Nhanh Nhẹn', mult: 2, weight: 25, slipChance: 0.25 },
    { type: '🐧', name: 'Chim Cánh Cụt Băng Giá', mult: 2, weight: 25, slipChance: 0.25 }
  ];

  const rand = crypto.randomInt(1, 101);
  let acc = 0;
  let candidate = PRIZES[0];
  for (const p of PRIZES) {
    acc += p.weight;
    if (rand <= acc) {
      candidate = p;
      break;
    }
  }

  const slipRoll = crypto.randomInt(1, 101) / 100;
  const caught = slipRoll > candidate.slipChance;

  let payout = 0;
  let hitPrize: any = null;
  if (caught) {
    hitPrize = { type: candidate.type, name: candidate.name, mult: candidate.mult };
    payout = amt * candidate.mult;
  }

  let finalPP = deductTx.newPP;
  if (payout > 0) {
    const creditTx = await executePPTransaction(uid, payout);
    finalPP = creditTx.newPP;
  }

  const pnl = payout - amt;
  await adminDb.ref('game_logs').push({
    uid,
    game: 'Gắp Thú',
    bet: amt,
    pnl,
    result: caught ? `Thắng (Gắp trúng ${candidate.type} x${candidate.mult})` : 'Hụt (Thú tuột khỏi ngàm gắp)',
    time: new Date().toLocaleString('vi-VN'),
    timestamp: Date.now()
  });

  await recordMissionActivityServer(uid, 'claw_machine');

  res.json({
    success: true,
    caught,
    hitPrize,
    payout,
    pnl,
    newPP: finalPP
  });
});

/**
 * Server-authoritative FC Mobile resolution
 */
app.post('/api/game/fcmobile', requireAuth, gameLimiter, async (req, res) => {
  const uid = (req as any).uid;
  const { choice, betAmount, score } = req.body;
  const amt = Math.floor(Number(betAmount) || 0);

  if (!uid || !['BLUE', 'RED'].includes(choice) || amt <= 0 || amt > 50000) {
    return res.status(400).json({ success: false, error: 'Thông tin cược FC Mobile không hợp lệ' });
  }

  let blueScore = crypto.randomInt(0, 4);
  let redScore = crypto.randomInt(0, 4);

  if (score && typeof score.blue === 'number' && typeof score.red === 'number') {
    blueScore = Math.min(Math.max(0, Math.floor(score.blue)), 8);
    redScore = Math.min(Math.max(0, Math.floor(score.red)), 8);
  }

  let winner: 'BLUE' | 'RED' | 'DRAW' = 'DRAW';
  if (blueScore > redScore) winner = 'BLUE';
  else if (redScore > blueScore) winner = 'RED';

  const isWin = choice === winner;
  const gap = Math.abs(blueScore - redScore);
  const mult = isWin ? (gap >= 2 ? 2.5 : 2.0) : 0;
  const payout = Math.floor(amt * mult);
  const pnl = payout - amt;

  const tx = await executePPTransaction(uid, pnl, amt);
  if (!tx.success) {
    return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ' });
  }

  await adminDb.ref('game_logs').push({
    uid,
    game: 'FC Mobile',
    bet: amt,
    pnl,
    result: isWin ? `Thắng (${choice} thắng ${blueScore}-${redScore})` : `Thua (Tỉ số ${blueScore}-${redScore})`,
    time: new Date().toLocaleString('vi-VN'),
    timestamp: Date.now()
  });

  await recordMissionActivityServer(uid, 'fcmobile_match');

  res.json({
    success: true,
    winner,
    score: { blue: blueScore, red: redScore },
    isWin,
    mult,
    payout,
    pnl,
    newPP: tx.newPP
  });
});

/**
 * Server-authoritative Cyber3D resolution (Firing ammo & Monster kills)
 */
app.post('/api/game/cyber3d', requireAuth, gameLimiter, async (req, res) => {
  const uid = (req as any).uid;
  const { action, bulletCost, rewardPP, monsterName } = req.body;

  if (!uid) return res.status(400).json({ success: false, error: 'Thiếu UID' });

  if (action === 'fire') {
    const cost = Math.floor(Number(bulletCost) || 0);
    if (cost <= 0 || cost > 50000) return res.status(400).json({ success: false, error: 'Chi phí đạn không hợp lệ' });

    const tx = await executePPTransaction(uid, -cost, cost);
    if (!tx.success) return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ để bắn' });

    return res.json({ success: true, newPP: tx.newPP });
  } else if (action === 'kill') {
    const reward = Math.floor(Number(rewardPP) || 0);
    if (reward <= 0 || reward > 100000) return res.status(400).json({ success: false, error: 'Phần thưởng không hợp lệ' });

    const tx = await executePPTransaction(uid, reward);
    await adminDb.ref('game_logs').push({
      uid,
      game: 'Cyber3D Arena',
      reward,
      pnl: reward,
      result: `Săn được ${monsterName || 'Quái vật 3D'} (+${reward.toLocaleString()} PP)`,
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    await recordMissionActivityServer(uid, 'world_hunting');

    return res.json({ success: true, newPP: tx.newPP });
  }

  res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
});

/**
 * Server-authoritative WorldCardBattle Match Settlement
 */
app.post('/api/game/worldcard', requireAuth, gameLimiter, async (req, res) => {
  const uid = (req as any).uid;
  const { action, matchId, betAmt, winnerId, p1Id, p2Id } = req.body;

  if (!uid || action !== 'settle_match') {
    return res.status(400).json({ success: false, error: 'Yêu cầu không hợp lệ' });
  }

  if (uid !== p1Id && uid !== p2Id) {
    return res.status(403).json({ success: false, error: 'Chỉ người chơi trong trận mới được xác nhận kết quả' });
  }

  const bet = Math.min(Math.max(0, Math.floor(Number(betAmt) || 0)), 50000);

  // Atomic lock on match settlement to prevent double-payouts
  const settleRef = adminDb.ref(`matches_settled/${matchId}`);
  const settleTx = await settleRef.transaction((existing) => {
    if (existing !== null) return undefined;
    return { settledAt: Date.now(), settledBy: uid, winnerId };
  });

  if (!settleTx.committed) {
    return res.json({ success: true, message: 'Trận đấu đã được thanh toán trước đó' });
  }

  if (bet > 0) {
    if (winnerId === p1Id) {
      await executePPTransaction(p1Id, bet);
      if (p2Id && !p2Id.startsWith('bot_')) {
        await executePPTransaction(p2Id, -bet, bet);
      }
    } else if (winnerId === p2Id) {
      if (p2Id && !p2Id.startsWith('bot_')) {
        await executePPTransaction(p2Id, bet);
      }
      await executePPTransaction(p1Id, -bet, bet);
    }
  }

  await adminDb.ref('game_logs').push({
    uid,
    game: 'Đấu Thẻ Bài 1v1',
    matchId,
    bet,
    winnerId,
    result: winnerId === uid ? 'Chiến thắng' : 'Thất bại',
    time: new Date().toLocaleString('vi-VN'),
    timestamp: Date.now()
  });

  await recordMissionActivityServer(uid, 'card_battle');

  res.json({ success: true, settled: true, winnerId });
});

// ----------------- MISSIONS CLAIM (AUTHENTICATED & SERVER-AUTHORITATIVE) -----------------

/**
 * Server calculates reward from mission record, prevents double-claims via atomic date lock (YYYY-MM-DD)
 */
app.post('/api/missions/claim', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  const { missionId } = req.body;

  if (!uid || !missionId) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin nhận thưởng' });
  }

  // Current Vietnam Date YYYY-MM-DD
  const now = new Date();
  const vnDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const todayStr = vnDate.toISOString().slice(0, 10);

  try {
    // 1. Double-claim prevention: atomic transaction on daily claim lock
    const lockRef = adminDb.ref(`users/${uid}/daily_missions_claimed/${todayStr}_${missionId}`);
    const lockTx = await lockRef.transaction((existing) => {
      if (existing !== null) return undefined; // Already claimed today!
      return { claimedAt: Date.now() };
    });

    if (!lockTx.committed) {
      return res.status(400).json({ success: false, error: 'Nhiệm vụ này đã nhận thưởng hôm nay!' });
    }

    // 2. Fetch user's mission list from server record
    const missionListRef = adminDb.ref(`users/${uid}/daily_missions/${todayStr}/missions_list`);
    const snap = await missionListRef.get();

    if (!snap.exists()) {
      await lockRef.remove();
      return res.status(404).json({ success: false, error: 'Không tìm thấy danh sách nhiệm vụ hôm nay' });
    }

    const val = snap.val();
    const missions: any[] = Array.isArray(val) ? val : Object.values(val);
    const missionIdx = missions.findIndex((m) => m && m.id === missionId);

    if (missionIdx === -1) {
      await lockRef.remove();
      return res.status(404).json({ success: false, error: 'Nhiệm vụ không tồn tại trong danh sách hôm nay' });
    }

    const mission = missions[missionIdx];
    if (mission.current < mission.target) {
      await lockRef.remove();
      return res.status(400).json({ success: false, error: 'Chưa hoàn thành tiến độ yêu cầu của nhiệm vụ!' });
    }

    // 3. Server calculates reward strictly from mission configuration
    const rewardPP = Math.min(Math.max(100, Math.floor(Number(mission.reward) || 1000)), 50000);

    // 4. Perform atomic credit on PP
    const tx = await executePPTransaction(uid, rewardPP);
    if (!tx.success) {
      await lockRef.remove();
      return res.status(400).json({ success: false, error: tx.error || 'Lỗi cộng điểm thưởng' });
    }

    // 5. Update mission claimed status in list
    await adminDb.ref(`users/${uid}/daily_missions/${todayStr}/missions_list/${missionIdx}/claimed`).set(true);

    // 6. Grant +40 XP & Battle Pass progress directly to wallet
    await addWalletXP(uid, 40);

    // 7. Record transaction audit
    await adminDb.ref('transactions').push({
      sender: 'SYSTEM_DAILY_MISSIONS',
      senderName: 'Nhiệm Vụ Hằng Ngày',
      receiver: uid,
      amount: rewardPP,
      message: `Hoàn thành nhiệm vụ: ${mission.title}`,
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    res.json({
      success: true,
      reward: rewardPP,
      newPP: tx.newPP
    });
  } catch (err: any) {
    console.error('[Mission Claim Server Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lỗi nhận thưởng' });
  }
});

// ----------------- LUCKY WHEEL SPIN (EV: 4,755 PP, MAX 10 SPINS/DAY, SINGLE TRANSACTION) -----------------

/**
 * Server-authoritative lucky wheel spin endpoint
 * Adjusted weights: Expected Value = 4,755 PP (Cost: 5,000 PP)
 * Max 10 spins/day per user. Deduct and prize combined into a single atomic transaction.
 */
app.post('/api/wheel/spin', requireAuth, wheelLimiter, async (req, res) => {
  const uid = (req as any).uid;

  if (!uid) {
    return res.status(400).json({ success: false, error: 'Yêu cầu UID người dùng hợp lệ' });
  }

  const SPIN_COST = 5000;

  const PRIZES = [
    { label: '500 PP', pp: 500, weight: 37 },
    { label: '2,000 PP', pp: 2000, weight: 26 },
    { label: '5,000 PP (Hoàn tiền)', pp: 5000, weight: 19 },
    { label: '10,000 PP', pp: 10000, weight: 11 },
    { label: '25,000 PP', pp: 25000, weight: 6 },
    { label: '50,000 PP (JACKPOT)', pp: 50000, weight: 1 }
  ];

  const now = new Date();
  const vnDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const todayStr = vnDate.toISOString().slice(0, 10);

  try {
    const spinCountRef = adminDb.ref(`users/${uid}/wheel_daily_spins/${todayStr}`);
    const spinTx = await spinCountRef.transaction((count) => {
      const current = Number(count) || 0;
      if (current >= 10) return undefined;
      return current + 1;
    });

    if (!spinTx.committed) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bạn đã đạt giới hạn tối đa 10 lượt quay may mắn hôm nay. Vui lòng quay lại vào ngày mai!' 
      });
    }

    const randWeight = crypto.randomInt(1, 101);
    let accum = 0;
    let selectedPrize = PRIZES[0];
    let prizeIndex = 0;

    for (let i = 0; i < PRIZES.length; i++) {
      accum += PRIZES[i].weight;
      if (randWeight <= accum) {
        selectedPrize = PRIZES[i];
        prizeIndex = i;
        break;
      }
    }

    const netDelta = selectedPrize.pp - SPIN_COST;
    const tx = await executePPTransaction(uid, netDelta, SPIN_COST);

    if (!tx.success) {
      await spinCountRef.transaction((c) => Math.max(0, (Number(c) || 1) - 1));
      return res.status(400).json({ success: false, error: 'Số dư không đủ 5,000 PP để quay thưởng' });
    }

    await adminDb.ref('transactions').push({
      sender: 'LUCKY_WHEEL',
      senderName: 'Vòng Quay May Mắn',
      receiver: uid,
      amount: selectedPrize.pp,
      cost: SPIN_COST,
      pnl: netDelta,
      prizeLabel: selectedPrize.label,
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    await recordMissionActivityServer(uid, 'wheel_spins');

    res.json({
      success: true,
      prizeIndex,
      prize: selectedPrize,
      cost: SPIN_COST,
      pnl: netDelta,
      newPP: tx.newPP,
      spinsToday: spinTx.snapshot.val()
    });
  } catch (err: any) {
    console.error('[Wheel Spin Server Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lỗi quay vòng quay may mắn' });
  }
});

// ----------------- INTERNAL REWARD HELPER & DISABLED PUBLIC REWARD ROUTE -----------------

export async function awardInternalReward(
  uid: string, 
  amount: number, 
  type = 'system', 
  message = 'Phần thưởng hệ thống'
): Promise<{ success: boolean; newPP: number; error?: string }> {
  const cleanAmount = Math.max(0, Math.floor(amount));
  const tx = await executePPTransaction(uid, cleanAmount);
  if (!tx.success) {
    return { success: false, newPP: 0, error: tx.error };
  }

  await adminDb.ref('transactions').push({
    sender: 'SYSTEM_INTERNAL',
    senderName: 'Máy Chủ AYK',
    receiver: uid,
    amount: cleanAmount,
    message: `${message} (${type})`,
    time: new Date().toLocaleString('vi-VN'),
    timestamp: Date.now()
  });

  return { success: true, newPP: tx.newPP };
}

app.post('/api/rewards/award', (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Endpoint này đã bị vô hiệu hóa vì lý do bảo mật. Mọi phần thưởng chỉ được cấp qua logic máy chủ đã xác minh.'
  });
});

// ----------------- BANK TRANSFER (AUTHENTICATED & 24H AGE & DAILY LIMIT) -----------------

/**
 * Server-authoritative Bank Transfer endpoint with two-phase atomic transaction
 * Sender UID is strictly read from verified token
 * Safeguards:
 * 1. New accounts (< 24h old) are prohibited from transferring PP
 * 2. Daily transfer limit capped at 200,000 PP/day
 */
app.post('/api/bank/transfer', requireAuth, bankLimiter, async (req, res) => {
  const senderUid = (req as any).uid;
  const { receiverId, amount } = req.body;

  if (!senderUid || !receiverId || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Dữ liệu chuyển khoản không hợp lệ' });
  }

  const cleanAmount = Math.floor(amount);
  if (senderUid === receiverId) {
    return res.status(400).json({ success: false, error: 'Không thể tự chuyển khoản cho chính mình' });
  }

  try {
    // 1. Account age verification: account must be at least 24h old
    const senderUserSnap = await adminDb.ref(`users/${senderUid}`).get();
    if (!senderUserSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Tài khoản người gửi không tồn tại' });
    }
    const senderData = senderUserSnap.val();
    const createdAt = senderData.createdAt || senderData.timestamp || 0;
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (createdAt && (now - createdAt < TWENTY_FOUR_HOURS)) {
      const hoursLeft = Math.ceil((TWENTY_FOUR_HOURS - (now - createdAt)) / (60 * 60 * 1000));
      return res.status(403).json({ 
        success: false, 
        error: `Tài khoản mới tạo dưới 24 giờ chưa thể chuyển khoản để phòng chống gian lận (còn khoảng ${hoursLeft} giờ).` 
      });
    }

    // 2. Daily transfer limit check: 200,000 PP/day
    const vnDate = new Date(now + 7 * 60 * 60 * 1000);
    const todayStr = vnDate.toISOString().slice(0, 10);
    const dailyTransferRef = adminDb.ref(`users/${senderUid}/transfers_today/${todayStr}`);
    const DAILY_LIMIT = 200000;

    let dailyTotal = 0;
    const dailyTx = await dailyTransferRef.transaction((current) => {
      const currentVal = Number(current) || 0;
      if (currentVal + cleanAmount > DAILY_LIMIT) {
        return undefined; // Exceeded limit
      }
      dailyTotal = currentVal + cleanAmount;
      return dailyTotal;
    });

    if (!dailyTx.committed) {
      return res.status(400).json({
        success: false,
        error: `Giao dịch vượt hạn mức chuyển khoản tối đa trong ngày (${DAILY_LIMIT.toLocaleString()} PP/ngày)!`
      });
    }

    // 3. Verify receiver exists
    const recSnap = await adminDb.ref(`users/${receiverId}`).get();
    if (!recSnap.exists()) {
      await dailyTransferRef.transaction((c) => Math.max(0, (Number(c) || 0) - cleanAmount));
      return res.status(404).json({ success: false, error: 'Người nhận không tồn tại trên hệ thống' });
    }

    // 4. Deduct from sender atomically
    const deductTx = await executePPTransaction(senderUid, -cleanAmount, cleanAmount);
    if (!deductTx.success) {
      await dailyTransferRef.transaction((c) => Math.max(0, (Number(c) || 0) - cleanAmount));
      return res.status(400).json({ success: false, error: deductTx.error || 'Số dư PP không đủ' });
    }

    // 5. Credit to receiver atomically
    const creditTx = await executePPTransaction(receiverId, cleanAmount);
    if (!creditTx.success) {
      await executePPTransaction(senderUid, cleanAmount);
      await dailyTransferRef.transaction((c) => Math.max(0, (Number(c) || 0) - cleanAmount));
      return res.status(500).json({ success: false, error: 'Lỗi ghi nhận phía người nhận, đã hoàn tiền' });
    }

    // 6. Log transaction
    await adminDb.ref('transactions').push({
      sender: senderUid,
      senderName: senderData.name || 'Sinh Viên',
      receiver: receiverId,
      receiverName: recSnap.val().name || 'Sinh Viên',
      amount: cleanAmount,
      timestamp: Date.now(),
      time: new Date().toLocaleString('vi-VN')
    });

    res.json({
      success: true,
      amount: cleanAmount,
      senderNewPP: deductTx.newPP,
      dailyTransferred: dailyTotal,
      dailyLimit: DAILY_LIMIT
    });
  } catch (err: any) {
    console.error('[Bank Transfer Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lỗi hệ thống chuyển khoản' });
  }
});

// ----------------- ADMIN ADJUST PP (AUTHENTICATED & ROLE CHECKED) -----------------

/**
 * Server-authoritative Admin adjust PP endpoint
 * Caller must have custom claim admin, or role === 'ADMIN' / 'TEACHER', or be listed under admins/
 */
app.post('/api/admin/adjust-pp', requireAuth, async (req, res) => {
  const adminUid = (req as any).uid;
  const decodedUser = (req as any).user;
  const { targetUid, amount } = req.body;

  if (!adminUid || !targetUid || typeof amount !== 'number') {
    return res.status(400).json({ success: false, error: 'Dữ liệu yêu cầu không hợp lệ' });
  }

  try {
    // 1. Verify admin privilege via token claims or database
    let isAuthorized = false;

    if (decodedUser && (decodedUser.admin === true || decodedUser.role === 'ADMIN')) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      const adminSnap = await adminDb.ref(`users/${adminUid}`).get();
      if (adminSnap.exists()) {
        const role = adminSnap.val().role;
        if (role === 'ADMIN' || role === 'TEACHER') {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      const adminNodeSnap = await adminDb.ref(`admins/${adminUid}`).get();
      if (adminNodeSnap.exists() && adminNodeSnap.val() === true) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền quản trị viên' });
    }

    // 2. Execute transaction on target user's PP
    const cleanDelta = Math.floor(amount);
    const tx = await executePPTransaction(targetUid, cleanDelta, 0);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || 'Lỗi cập nhật số dư' });
    }

    // 3. Log admin transaction
    await adminDb.ref('transactions').push({
      sender: `ADMIN_${adminUid}`,
      receiver: targetUid,
      amount: cleanDelta,
      type: 'ADMIN_ADJUSTMENT',
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    res.json({
      success: true,
      targetUid,
      oldPP: tx.oldPP,
      newPP: tx.newPP,
      delta: cleanDelta
    });
  } catch (err: any) {
    console.error('[Admin Adjust PP Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lỗi máy chủ khi điều chỉnh PP' });
  }
});

// ----------------- POKER TEXAS HOLD'EM ROUTES -----------------
app.use('/api/poker', requireAuth, setupPokerRouter(null, executePPTransaction, adminDb));

// ----------------- VITE DEV / STATIC HANDLER -----------------
const setupVite = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
};

setupVite().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AYK MAIN 8686] Server is running on http://0.0.0.0:${PORT}`);
  });
});
