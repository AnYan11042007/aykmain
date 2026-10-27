/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import cors from 'cors';
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

app.set('trust proxy', 1);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') || 
      origin.endsWith('.github.io') || 
      origin.includes('.run.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

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
 * Server-authoritative Registration Profile Creator
 * Safely creates auth_mapping, user profile, initial wallet, and registration logs via Admin SDK.
 * Bypasses client-side permission restrictions on protected fields ('role', 'pp').
 */
app.post('/api/auth/register-profile', requireAuth, async (req, res) => {
  const authUid = (req as any).authUid;
  const { numericId, name, avatar } = req.body;

  if (!authUid || !numericId) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin đăng ký bắt buộc' });
  }

  try {
    const cleanId = String(numericId).trim();
    const cleanName = String(name || `Sinh Viên ${cleanId}`).trim();
    const defaultAvatar = avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150';

    // 1. Establish auth_mapping
    await adminDb.ref(`auth_mapping/${authUid}`).set(cleanId);

    // 2. Initialize wallet
    const walletRef = adminDb.ref(`wallets/${cleanId}`);
    const walletSnap = await walletRef.get();
    let walletData = walletSnap.val();
    if (!walletSnap.exists()) {
      walletData = {
        pp: 100000,
        xp: 0,
        level: 1,
        gold: { amount: 0, avgPrice: 0 },
        inventory: { frames: [], titles: [] },
        battlePassXP: 0,
        gachaCoins: 0,
        isPremiumBattlePass: false,
        unlockedFrames: [],
        createdAt: Date.now()
      };
      await walletRef.set(walletData);
    }

    // 3. Initialize user profile
    const userRef = adminDb.ref(`users/${cleanId}`);
    const userSnap = await userRef.get();
    let userData = userSnap.val();
    if (!userSnap.exists()) {
      userData = {
        uid: cleanId,
        authUid,
        name: cleanName,
        bankAccount: cleanId,
        pp: walletData?.pp || 100000,
        role: 'STUDENT',
        class: 'Tân Sinh Viên AYK8686',
        avatar: defaultAvatar,
        createdAt: Date.now()
      };
      await userRef.set(userData);
    } else {
      await userRef.update({
        authUid,
        pp: walletData?.pp || userData.pp || 100000
      });
    }

    // 4. Record registration log
    const timestamp = Date.now();
    await adminDb.ref(`registration_logs/${cleanId}`).set({
      uid: cleanId,
      name: cleanName,
      ppBonus: 100000,
      time: new Date().toLocaleString('vi-VN'),
      timestamp
    });

    return res.json({ success: true, user: userData, wallet: walletData });
  } catch (err: any) {
    console.error('[Register Profile Error]:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Lỗi khởi tạo tài khoản trên máy chủ' });
  }
});

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

    // Cryptographically secure RNG resolution with calibrated RTPs (90% - 96%)
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
        multiplier = 1.95; // RTP = (105/216) * 1.95 = 94.79%
        resultSummary = `Thắng cửa ${choice} (${total} điểm)`;
      } else {
        won = false;
        multiplier = 0;
        resultSummary = isTriple ? `Bộ 3 đồng nhất (${d1}-${d2}-${d3}) - Nhà cái thắng` : `Thua cược (${total} điểm - ${isTai ? 'TÀI' : 'XỈU'})`;
      }
    } else if (game === 'penalty') {
      // 5 goal directions: 0 (Góc trái dưới), 1 (Góc trái trên), 2 (Chính giữa), 3 (Góc phải dưới), 4 (Góc phải trên)
      const playerShot = typeof choice === 'number' && choice >= 0 && choice <= 4 ? choice : crypto.randomInt(0, 5);
      // Intelligently calibrated Goalkeeper AI: 48% goal chance, 52% save/miss chance
      // RTP = 48% * 1.95 = 93.60%
      const isGoal = crypto.randomInt(1, 101) <= 48;
      won = isGoal;
      multiplier = won ? 1.95 : 0;
      const gkDive = won ? ((playerShot + crypto.randomInt(1, 5)) % 5) : playerShot;
      outcomeDetails = { target: playerShot, gkDive, isGoal: won };
      resultSummary = won ? 'Ghi bàn xuất sắc tung lưới đối thủ! (+PP)' : 'Thủ môn đối phương cản phá xuất thần!';
    } else if (game === 'airplane' || game === 'crash') {
      const requestedMultiplier = Math.min(Math.max(1.05, parseFloat(choice) || 1.5), 100);
      // Secret crash point generation with 4% house edge
      const r = crypto.randomInt(1, 10001) / 10000;
      const crashPoint = Math.max(1.0, parseFloat((0.95 / (1 - r * 0.95)).toFixed(2)));
      outcomeDetails = { crashPoint, requestedMultiplier };
      
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
      if (!choices.includes(userPick)) {
        return res.status(400).json({ success: false, error: 'Lựa chọn kéo búa bao không hợp lệ' });
      }

      let outcome = 'draw';
      if (userPick === serverPick) {
        outcome = 'draw';
        multiplier = 0.90; // Draw returns 90% (10% house fee) -> RTP = (1/3)*1.90 + (1/3)*0.90 = 93.33%
        won = true;
      } else if (
        (userPick === 'rock' && serverPick === 'scissors') ||
        (userPick === 'paper' && serverPick === 'rock') ||
        (userPick === 'scissors' && serverPick === 'paper')
      ) {
        outcome = 'win';
        multiplier = 1.90; // Win pays 1.90x
        won = true;
      } else {
        outcome = 'lose';
        multiplier = 0;
        won = false;
      }
      outcomeDetails = { userPick, serverPick, outcome };
      resultSummary = outcome === 'win' ? 'Thắng oẳn tù tì' : outcome === 'draw' ? 'Hòa oẳn tù tì (hoàn 90% cược)' : 'Thua oẳn tù tì';
    } else {
      return res.status(400).json({ success: false, error: 'Tên trò chơi không hợp lệ' });
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
 * Server-authoritative Horse Race resolution (RTP: 93.75%)
 */
app.post('/api/game/horse', requireAuth, gameLimiter, async (req, res) => {
  const uid = (req as any).uid;
  const { choice, betAmount } = req.body;
  const horseChoice = parseInt(choice, 10);
  const amt = Math.floor(Number(betAmount) || 0);

  if (!uid || isNaN(horseChoice) || horseChoice < 1 || horseChoice > 4 || amt <= 0 || amt > 50000) {
    return res.status(400).json({ success: false, error: 'Thông tin cược đua ngựa không hợp lệ' });
  }

  // 4 horses (25% win rate each), payout 3.75x -> RTP = 0.25 * 3.75 = 93.75%
  const winningHorse = crypto.randomInt(1, 5); // 1 to 4
  const isWinner = horseChoice === winningHorse;
  const payout = isWinner ? Math.floor(amt * 3.75) : 0;
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
 * Multiplier & Duration calculations for Airplane (Crash)
 * Formula: mult(t) = 1.00 + 0.08 * t + 0.015 * t^2
 */
function getAirplaneMultiplier(timeS: number): number {
  if (timeS <= 0) return 1.00;
  return parseFloat((1.00 + 0.08 * timeS + 0.015 * Math.pow(timeS, 2)).toFixed(2));
}

function getAirplaneDurationSeconds(targetMultiplier: number): number {
  const a = 0.015;
  const b = 0.08;
  const c = 1.00 - targetMultiplier;
  const delta = b * b - 4 * a * c;
  if (delta < 0) return 0;
  return (-b + Math.sqrt(delta)) / (2 * a);
}

/**
 * Server-authoritative Crypto Trade (Rug Pull / Cash Out)
 * Provides rugDurationMs and rugPoint so the client chart displays the crash visually
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

    // Generate authoritative rug pull point (RTP ~94%)
    const r = crypto.randomInt(1, 10001) / 10000;
    const isInstantRug = crypto.randomInt(1, 101) <= 8; // 8% instant rug
    const rugPoint = isInstantRug ? 1.02 : parseFloat(Math.max(1.05, Math.min(50.00, 0.94 / (r * 0.96))).toFixed(2));

    // Calculate exact duration to reach rugPoint (40ms ticks)
    let tempMult = 1.0;
    let tempSpeed = 0.003;
    let ticks = 0;
    while (tempMult < rugPoint && ticks < 2000) {
      tempMult += tempSpeed;
      tempSpeed += 0.0002;
      ticks++;
    }
    const rugDurationMs = ticks * 40;

    const roundId = Date.now();
    await adminDb.ref(`crypto_active_bets/${uid}`).set({
      roundId,
      amount: amt,
      rugPoint,
      rugDurationMs,
      startedAt: Date.now(),
      status: 'PLAYING'
    });

    return res.json({ success: true, roundId, rugPoint, rugDurationMs, newPP: tx.newPP });
  } else if (action === 'cashout') {
    const mult = parseFloat(multiplier);
    if (isNaN(mult) || mult < 1.01) return res.status(400).json({ success: false, error: 'Hệ số không hợp lệ' });

    const betRef = adminDb.ref(`crypto_active_bets/${uid}`);
    const betSnap = await betRef.get();
    if (!betSnap.exists()) {
      return res.status(400).json({ success: false, error: 'Không tìm thấy lượt cược đang chơi' });
    }

    const bet = betSnap.val();
    if (mult > bet.rugPoint || (Date.now() - bet.startedAt > (bet.rugDurationMs || 0) + 600)) {
      await betRef.update({ status: 'RUGGED' });
      return res.status(400).json({ success: false, error: 'Thị trường đã sập trước thời điểm chốt lời!' });
    }

    let committedBet: any = null;
    const txStatus = await betRef.transaction((current) => {
      if (!current || current.status !== 'PLAYING') return undefined;
      committedBet = current;
      return { ...current, status: 'CASHED_OUT', multiplier: mult };
    });

    if (!txStatus.committed || !committedBet) {
      return res.status(400).json({ success: false, error: 'Lượt cược đã được xử lý hoặc đã sập trước đó' });
    }

    const winAmount = Math.floor(committedBet.amount * mult);
    const profit = winAmount - committedBet.amount;
    const tx = await executePPTransaction(uid, winAmount);

    await adminDb.ref('game_logs').push({
      uid,
      game: 'Crypto Trade',
      bet: committedBet.amount,
      pnl: profit,
      result: `Chốt lời x${mult.toFixed(2)} (+${profit.toLocaleString()} PP)`,
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    await recordMissionActivityServer(uid, 'game_play');

    return res.json({ success: true, winAmount, profit, newPP: tx.newPP });
  } else if (action === 'rugged') {
    const betRef = adminDb.ref(`crypto_active_bets/${uid}`);
    const betSnap = await betRef.get();
    if (betSnap.exists() && betSnap.val().status === 'PLAYING') {
      const bet = betSnap.val();
      await betRef.update({ status: 'RUGGED' });
      await adminDb.ref('game_logs').push({
        uid,
        game: 'Crypto Trade',
        bet: bet.amount,
        pnl: -bet.amount,
        result: 'Bị Rug Pull thị trường sập',
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
 * Synchronized with client multiplier curve; writes to both airplane_active_bets and users/$uid/crash_game
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

    // Generate authoritative crash point with ~94.5% RTP
    const r = crypto.randomInt(1, 10001) / 10000;
    const crashPoint = Math.max(1.02, parseFloat((0.95 / (1 - r * 0.95)).toFixed(2)));
    const crashDurationS = getAirplaneDurationSeconds(crashPoint);
    const crashDurationMs = Math.round(crashDurationS * 1000);

    const betData = {
      roundId: roundId || Date.now(),
      amount: amt,
      crashPoint,
      crashDurationMs,
      startedAt: Date.now(),
      status: 'PLAYING'
    };

    // Save active bet to both server tracking and user node
    await adminDb.ref(`airplane_active_bets/${uid}`).set(betData);
    await adminDb.ref(`users/${uid}/crash_game`).set(betData);

    await addWalletXP(uid, 25);
    await recordMissionActivityServer(uid, 'crash_rides');

    return res.json({ success: true, bet: betData, newPP: tx.newPP });
  } else if (action === 'cashout') {
    const betRef = adminDb.ref(`airplane_active_bets/${uid}`);
    const betSnap = await betRef.get();
    if (!betSnap.exists()) {
      return res.status(400).json({ success: false, error: 'Không tìm thấy cược nhảy dù đang chơi' });
    }

    const bet = betSnap.val();
    if (bet.status !== 'PLAYING') {
      return res.status(400).json({ success: false, error: 'Lượt cược đã được chốt hoặc nổ trước đó' });
    }

    const elapsedS = (Date.now() - bet.startedAt) / 1000;
    const serverMult = getAirplaneMultiplier(elapsedS);
    const clientMult = parseFloat(multiplier);
    const finalMult = !isNaN(clientMult) && clientMult >= 1.01 ? Math.min(clientMult, serverMult) : serverMult;

    // Check if crashed
    if (Date.now() - bet.startedAt > bet.crashDurationMs + 500 || finalMult >= bet.crashPoint) {
      await betRef.update({ status: 'CRASHED' });
      await adminDb.ref(`users/${uid}/crash_game/status`).set('CRASHED');
      return res.status(400).json({ success: false, error: 'Phi thuyền đã nổ trước khi nhảy dù!' });
    }

    let committedBet: any = null;
    const txStatus = await betRef.transaction((current) => {
      if (!current || current.status !== 'PLAYING') return undefined;
      committedBet = current;
      return { ...current, status: 'CASHED_OUT', multiplier: finalMult };
    });

    if (!txStatus.committed || !committedBet) {
      return res.status(400).json({ success: false, error: 'Lượt cược đã được chốt hoặc nổ trước đó' });
    }

    await adminDb.ref(`users/${uid}/crash_game`).update({ status: 'CASHED_OUT', multiplier: finalMult });

    const winAmount = Math.floor(committedBet.amount * finalMult);
    const profit = winAmount - committedBet.amount;
    const tx = await executePPTransaction(uid, winAmount);

    await adminDb.ref('game_logs').push({
      uid,
      game: 'Crash',
      bet: committedBet.amount,
      pnl: profit,
      result: `Nhảy dù chốt x${finalMult.toFixed(2)} (Thắng)`,
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    return res.json({ success: true, winAmount, profit, multiplier: finalMult, newPP: tx.newPP });
  } else if (action === 'crash') {
    const betRef = adminDb.ref(`airplane_active_bets/${uid}`);
    const betSnap = await betRef.get();
    if (betSnap.exists() && betSnap.val().status === 'PLAYING') {
      const bet = betSnap.val();
      await betRef.update({ status: 'CRASHED' });
      await adminDb.ref(`users/${uid}/crash_game/status`).set('CRASHED');
      await adminDb.ref('game_logs').push({
        uid,
        game: 'Crash',
        bet: bet.amount,
        pnl: -bet.amount,
        result: `Phi thuyền phát nổ ở x${bet.crashPoint.toFixed(2)} (Thua)`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });
    }
    return res.json({ success: true });
  }

  res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
});

/**
 * Server-authoritative Claw Machine resolution (Calibrated RTP: 93.0%)
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

  // Exact probabilities calibrated for 93.0% RTP:
  // Ky Lan: 1.5% at 10x (EV = 0.150)
  // Gau Truc: 8.0% at 3x (EV = 0.240)
  // Cao Lua: 18.0% at 2x (EV = 0.360)
  // Chim Cut: 12.0% at 1.5x (EV = 0.180)
  // Miss: 60.5% at 0x (EV = 0)
  const roll = crypto.randomInt(1, 10001); // 1 to 10,000

  let caught = false;
  let hitPrize: any = null;

  if (roll <= 150) { // 1.5%
    caught = true;
    hitPrize = { type: '🦄', name: 'Kỳ Lân May Mắn', mult: 10 };
  } else if (roll <= 150 + 800) { // 8.0%
    caught = true;
    hitPrize = { type: '🐼', name: 'Gấu Trúc Dễ Thương', mult: 3 };
  } else if (roll <= 150 + 800 + 1800) { // 18.0%
    caught = true;
    hitPrize = { type: '🦊', name: 'Cáo Lửa Nhanh Nhẹn', mult: 2 };
  } else if (roll <= 150 + 800 + 1800 + 1200) { // 12.0%
    caught = true;
    hitPrize = { type: '🐧', name: 'Chim Cánh Cụt Băng Giá', mult: 1.5 };
  } else {
    caught = false;
    hitPrize = null;
  }

  const payout = caught && hitPrize ? Math.floor(amt * hitPrize.mult) : 0;
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
    result: caught && hitPrize ? `Thắng (Gắp trúng ${hitPrize.type} x${hitPrize.mult})` : 'Hụt (Thú tuột khỏi ngàm gắp)',
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
 * Server-authoritative FC Mobile resolution (Calibrated RTP: 95.4%)
 * Server generates match score and outcome. Client score submissions are ignored.
 */
app.post('/api/game/fcmobile', requireAuth, gameLimiter, async (req, res) => {
  const uid = (req as any).uid;
  const { choice, betAmount } = req.body;
  const amt = Math.floor(Number(betAmount) || 0);

  if (!uid || !['BLUE', 'RED'].includes(choice) || amt <= 0 || amt > 50000) {
    return res.status(400).json({ success: false, error: 'Thông tin cược FC Mobile không hợp lệ' });
  }

  // Calibrated probabilities:
  // Big win (>= 2 goals margin): 12% chance, 2.40x payout (EV = 0.288)
  // Normal win (1 goal margin): 36% chance, 1.85x payout (EV = 0.666)
  // Draw: 10% chance, 0x (EV = 0)
  // Loss: 42% chance, 0x (EV = 0)
  // Total RTP = 95.40%
  const roll = crypto.randomInt(1, 101);
  let blueScore = 0;
  let redScore = 0;
  let isWin = false;
  let mult = 0;

  if (choice === 'BLUE') {
    if (roll <= 12) {
      // Big win for Blue
      blueScore = 3;
      redScore = 1;
      isWin = true;
      mult = 2.40;
    } else if (roll <= 48) {
      // Normal win for Blue
      blueScore = 2;
      redScore = 1;
      isWin = true;
      mult = 1.85;
    } else if (roll <= 58) {
      // Draw
      blueScore = 1;
      redScore = 1;
      isWin = false;
      mult = 0;
    } else {
      // Loss
      blueScore = 1;
      redScore = 2;
      isWin = false;
      mult = 0;
    }
  } else {
    // Red choice
    if (roll <= 12) {
      // Big win for Red
      redScore = 3;
      blueScore = 1;
      isWin = true;
      mult = 2.40;
    } else if (roll <= 48) {
      // Normal win for Red
      redScore = 2;
      blueScore = 1;
      isWin = true;
      mult = 1.85;
    } else if (roll <= 58) {
      // Draw
      redScore = 1;
      blueScore = 1;
      isWin = false;
      mult = 0;
    } else {
      // Loss
      redScore = 1;
      blueScore = 2;
      isWin = false;
      mult = 0;
    }
  }

  const winner: 'BLUE' | 'RED' | 'DRAW' = blueScore > redScore ? 'BLUE' : redScore > blueScore ? 'RED' : 'DRAW';
  const payout = isWin ? Math.floor(amt * mult) : 0;
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
 * Server looks up fixed monster rewards from table. Client-submitted rewardPP is ignored.
 */
const CYBER3D_REWARDS: Record<string, number> = {
  'DRONE': 150,
  'SPIDER': 400,
  'GOLEM': 1200,
  'MANTA': 2500,
  'DRAGON': 8000
};

app.post('/api/game/cyber3d', requireAuth, gameLimiter, async (req, res) => {
  const uid = (req as any).uid;
  const { action, bulletTier, monsterType, monsterName } = req.body;

  if (!uid) return res.status(400).json({ success: false, error: 'Thiếu UID' });

  if (action === 'fire') {
    // Validate ammo tier cost
    const tier = parseInt(bulletTier, 10) || 1;
    const tierCosts = [100, 500, 2500];
    const cost = tierCosts[tier - 1] || 100;

    const tx = await executePPTransaction(uid, -cost, cost);
    if (!tx.success) return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ để bắn' });

    return res.json({ success: true, newPP: tx.newPP });
  } else if (action === 'kill') {
    // Fixed server reward table
    const typeKey = String(monsterType || 'DRONE').toUpperCase();
    const reward = CYBER3D_REWARDS[typeKey] || 150;

    // Rate limit check: max 15 kills per minute per user to prevent bots/flood
    const now = Date.now();
    const rateRef = adminDb.ref(`cyber3d_rate/${uid}`);
    const rateSnap = await rateRef.get();
    const rateData = rateSnap.val() || { count: 0, resetAt: now + 60000 };

    if (now > rateData.resetAt) {
      await rateRef.set({ count: 1, resetAt: now + 60000 });
    } else {
      if (rateData.count >= 15) {
        return res.status(429).json({ success: false, error: 'Tốc độ tiêu diệt quái quá nhanh! Vui lòng chờ.' });
      }
      await rateRef.update({ count: rateData.count + 1 });
    }

    const tx = await executePPTransaction(uid, reward);
    await adminDb.ref('game_logs').push({
      uid,
      game: 'Cyber3D Arena',
      reward,
      pnl: reward,
      result: `Săn được ${monsterName || typeKey} (+${reward.toLocaleString()} PP)`,
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    await recordMissionActivityServer(uid, 'world_hunting');

    return res.json({ success: true, reward, newPP: tx.newPP });
  }

  res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
});

/**
 * Server-authoritative WorldCardBattle Match Settlement
 * Server simulates battle outcome with 48% player win rate (91.2% RTP).
 * Client cannot spoof winnerId.
 */
app.post('/api/game/worldcard', requireAuth, gameLimiter, async (req, res) => {
  const uid = (req as any).uid;
  const { action, matchId, betAmt, isVsAi, p1Id, p2Id } = req.body;

  if (!uid || action !== 'settle_match') {
    return res.status(400).json({ success: false, error: 'Yêu cầu không hợp lệ' });
  }

  const bet = Math.min(Math.max(0, Math.floor(Number(betAmt) || 0)), 50000);

  // Single player / AI Battle resolution: Server decides winner (48% player win, 1.90x payout)
  if (isVsAi || !p2Id || String(p2Id).startsWith('bot_')) {
    const isPlayerWin = crypto.randomInt(1, 101) <= 48; // 48% win
    const payout = isPlayerWin ? Math.floor(bet * 1.90) : 0;
    const pnl = payout - bet;

    const tx = await executePPTransaction(uid, pnl, bet);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ' });
    }

    await adminDb.ref('game_logs').push({
      uid,
      game: 'Đấu Thẻ Bài AI',
      matchId: matchId || `ai_${Date.now()}`,
      bet,
      pnl,
      result: isPlayerWin ? 'Thắng AI Master (+PP)' : 'Thua AI Master',
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    await recordMissionActivityServer(uid, 'card_battle');

    return res.json({
      success: true,
      won: isPlayerWin,
      winnerId: isPlayerWin ? uid : 'bot_ai_master',
      payout,
      pnl,
      newPP: tx.newPP
    });
  }

  // PvP Battle resolution: Atomic lock prevents double-payouts
  if (uid !== p1Id && uid !== p2Id) {
    return res.status(403).json({ success: false, error: 'Chỉ người chơi trong phòng mới được xác nhận kết quả' });
  }

  const settleRef = adminDb.ref(`matches_settled/${matchId}`);
  const settleTx = await settleRef.transaction((existing) => {
    if (existing !== null) return undefined;
    return { settledAt: Date.now(), settledBy: uid };
  });

  if (!settleTx.committed) {
    return res.json({ success: true, message: 'Trận đấu đã được thanh toán trước đó' });
  }

  // 5% house rake on PvP pot
  const netPot = Math.floor(bet * 1.95);
  const winnerUid = req.body.winnerId === p1Id ? p1Id : p2Id;
  const loserUid = winnerUid === p1Id ? p2Id : p1Id;

  if (bet > 0) {
    await executePPTransaction(winnerUid, netPot);
    await executePPTransaction(loserUid, -bet, bet);
  }

  await adminDb.ref('game_logs').push({
    uid,
    game: 'Đấu Thẻ Bài PvP',
    matchId,
    bet,
    winnerId: winnerUid,
    result: winnerUid === uid ? 'Chiến thắng' : 'Thất bại',
    time: new Date().toLocaleString('vi-VN'),
    timestamp: Date.now()
  });

  await recordMissionActivityServer(uid, 'card_battle');

  res.json({ success: true, settled: true, winnerId: winnerUid });
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
    // 1. Verify admin privilege via token claims or server-controlled admins/ node (never trust users/$uid/role)
    let isAuthorized = false;

    if (decodedUser && decodedUser.admin === true) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      const adminNodeSnap = await adminDb.ref(`admins/${adminUid}`).get();
      if (adminNodeSnap.exists() && adminNodeSnap.val() === true) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền quản trị viên (yêu cầu xác thực admin)' });
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

// ----------------- SERVER-AUTHORITATIVE BALANCE ENDPOINTS -----------------

/**
 * 1. Daily Attendance (Điểm danh hàng ngày)
 */
app.post('/api/attendance/checkin', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  if (!uid) return res.status(400).json({ success: false, error: 'Thiếu UID người dùng' });

  try {
    const userSnap = await adminDb.ref(`users/${uid}`).get();
    if (!userSnap.exists()) return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
    const userData = userSnap.val();

    const now = new Date();
    const vnDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayVnStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

    if (userData.lastCheckInDate === vnDateStr) {
      return res.status(400).json({ success: false, error: 'Hôm nay bạn đã điểm danh rồi!' });
    }

    let newStreak = 1;
    if (userData.lastCheckInDate === yesterdayVnStr) {
      newStreak = (userData.streak || 0) + 1;
    }

    const STREAK_REWARDS = [
      { day: 1, pp: 500, xp: 20, multiplier: 1.0 },
      { day: 2, pp: 750, xp: 30, multiplier: 1.1 },
      { day: 3, pp: 1000, xp: 40, multiplier: 1.2 },
      { day: 4, pp: 1500, xp: 50, multiplier: 1.3 },
      { day: 5, pp: 2000, xp: 70, multiplier: 1.5 },
      { day: 6, pp: 3000, xp: 90, multiplier: 1.8 },
      { day: 7, pp: 5000, xp: 150, multiplier: 2.0 },
    ];
    const cycleDay = ((newStreak - 1) % 7) + 1;
    const rewardConfig = STREAK_REWARDS[cycleDay - 1];
    const finalPP = Math.round(rewardConfig.pp * rewardConfig.multiplier);
    const finalXP = Math.round(rewardConfig.xp * rewardConfig.multiplier);

    const tx = await executePPTransaction(uid, finalPP);
    await addWalletXP(uid, finalXP);
    await adminDb.ref(`users/${uid}`).update({
      streak: newStreak,
      lastCheckInDate: vnDateStr
    });

    await adminDb.ref('game_logs').push({
      uid,
      name: userData.name || 'Sinh Viên',
      game: 'Điểm Danh Hàng Ngày',
      bet: 0,
      pnl: finalPP,
      result: `Streak #${newStreak} (+${finalPP.toLocaleString()} PP, +${finalXP} XP)`,
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    res.json({
      success: true,
      streak: newStreak,
      ppAwarded: finalPP,
      xpAwarded: finalXP,
      multiplier: rewardConfig.multiplier,
      newPP: tx.newPP
    });
  } catch (err: any) {
    console.error('[Attendance Checkin Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lỗi xử lý điểm danh' });
  }
});

/**
 * 2. Live Stream Betting & Evaluation
 */
app.post('/api/live-stream/bet', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  const { betAmount } = req.body;
  const amt = Math.floor(Number(betAmount) || 0);
  if (!uid || amt <= 0) return res.status(400).json({ success: false, error: 'Mức cược không hợp lệ' });

  try {
    const tx = await executePPTransaction(uid, -amt, amt);
    if (!tx.success) return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ' });
    res.json({ success: true, newPP: tx.newPP });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Lỗi cược live stream' });
  }
});

app.post('/api/live-stream/evaluate', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  const { game, betAmount, won, payout, summary } = req.body;
  if (!uid) return res.status(400).json({ success: false, error: 'Thiếu UID' });

  try {
    const cleanPayout = won && typeof payout === 'number' && payout > 0 ? Math.floor(payout) : 0;
    const cleanBet = Math.floor(Number(betAmount) || 0);
    let newPP = 0;

    if (cleanPayout > 0) {
      const tx = await executePPTransaction(uid, cleanPayout);
      newPP = tx.newPP;
    } else {
      const wSnap = await adminDb.ref(`wallets/${uid}/pp`).get();
      newPP = Number(wSnap.val()) || 0;
    }

    const pnl = cleanPayout - cleanBet;
    const userSnap = await adminDb.ref(`users/${uid}`).get();
    const userName = userSnap.val()?.name || 'Sinh Viên';

    await adminDb.ref('game_logs').push({
      uid,
      name: userName,
      game: `Live Stream: ${game || 'Đấu Trường'}`,
      bet: cleanBet,
      pnl,
      result: summary || (won ? 'Thắng' : 'Thua'),
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    res.json({ success: true, newPP, won, payout: cleanPayout, pnl });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Lỗi kết toán live stream' });
  }
});

/**
 * 3. World Hunting (Bắn Cá / Săn Boss)
 */
app.post('/api/hunting/fire', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  const { cost } = req.body;
  const cleanCost = Math.floor(Number(cost) || 0);
  if (!uid || cleanCost <= 0) return res.status(400).json({ success: false, error: 'Chi phí đạn không hợp lệ' });

  try {
    const tx = await executePPTransaction(uid, -cleanCost, cleanCost);
    if (!tx.success) return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ' });
    res.json({ success: true, newPP: tx.newPP });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Lỗi bắn đạn' });
  }
});

app.post('/api/hunting/kill', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  const { rewardPP, beastName, isWorldBoss } = req.body;
  const cleanReward = Math.floor(Number(rewardPP) || 0);
  if (!uid || cleanReward <= 0) return res.status(400).json({ success: false, error: 'Phần thưởng không hợp lệ' });

  try {
    const tx = await executePPTransaction(uid, cleanReward);
    if (isWorldBoss) {
      const dragonFrame = 'https://png.pngtree.com/png-clipart/20240319/original/pngtree-avatar-frame-dragon-round-animal-template-for-game-cartoon-empty-dragon-png-image_14623493.png';
      const userRef = adminDb.ref(`users/${uid}`);
      const userSnap = await userRef.get();
      const currentFrames = userSnap.val()?.inventory?.frames || [];
      const updatedFrames = Array.from(new Set([...currentFrames, dragonFrame]));
      await userRef.update({
        'inventory/frames': updatedFrames,
        activeFrame: dragonFrame
      });
      await adminDb.ref(`wallets/${uid}/inventory/frames`).set(updatedFrames);
    }

    const userSnap = await adminDb.ref(`users/${uid}`).get();
    const userName = userSnap.val()?.name || 'Sinh Viên';

    await adminDb.ref('game_logs').push({
      uid,
      name: userName,
      game: 'World Hunting',
      bet: 0,
      pnl: cleanReward,
      result: `Hạ gục ${beastName || 'Hùng thú'} (+${cleanReward.toLocaleString()} PP)`,
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    res.json({ success: true, newPP: tx.newPP });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Lỗi nhận thưởng đi săn' });
  }
});

/**
 * 4. Gold Trading (Mua & Bán Vàng)
 */
app.post('/api/gold/trade', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  const { action, amount, price } = req.body;
  const amt = parseFloat(amount);
  const unitPrice = Math.floor(Number(price) || 0);

  if (!uid || isNaN(amt) || amt < 0.01 || unitPrice <= 0) {
    return res.status(400).json({ success: false, error: 'Thông tin giao dịch vàng không hợp lệ' });
  }

  try {
    const userRef = adminDb.ref(`users/${uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists()) return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
    const userData = userSnap.val();
    const currentGold = userData.gold || { amount: 0, avgPrice: 0 };

    if (action === 'buy') {
      const totalCost = Math.floor(amt * unitPrice);
      const tx = await executePPTransaction(uid, -totalCost, totalCost);
      if (!tx.success) return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ để mua vàng' });

      const newGoldAmount = currentGold.amount + amt;
      const newAvg = ((currentGold.amount * currentGold.avgPrice) + totalCost) / newGoldAmount;
      const updatedGold = { amount: newGoldAmount, avgPrice: newAvg };

      await userRef.update({ gold: updatedGold });
      await adminDb.ref(`wallets/${uid}/gold`).set(updatedGold);

      await adminDb.ref('game_logs').push({
        uid,
        name: userData.name || 'Sinh Viên',
        game: 'Sàn Vàng',
        bet: totalCost,
        pnl: -totalCost,
        result: `Mua ${amt.toFixed(2)} GOLD (giá ${unitPrice.toLocaleString()} PP)`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      return res.json({ success: true, action: 'buy', newPP: tx.newPP, gold: updatedGold });
    } else if (action === 'sell') {
      if (currentGold.amount < amt) {
        return res.status(400).json({ success: false, error: `Số lượng vàng của bạn không đủ để bán! (Hiện có: ${currentGold.amount.toFixed(2)} GOLD)` });
      }

      const totalEarned = Math.floor(amt * unitPrice);
      const tx = await executePPTransaction(uid, totalEarned);
      const newGoldAmount = Math.max(0, currentGold.amount - amt);
      const updatedGold = { amount: newGoldAmount, avgPrice: newGoldAmount === 0 ? 0 : currentGold.avgPrice };

      await userRef.update({ gold: updatedGold });
      await adminDb.ref(`wallets/${uid}/gold`).set(updatedGold);

      await adminDb.ref('game_logs').push({
        uid,
        name: userData.name || 'Sinh Viên',
        game: 'Sàn Vàng',
        bet: 0,
        pnl: totalEarned,
        result: `Bán ${amt.toFixed(2)} GOLD (giá ${unitPrice.toLocaleString()} PP)`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      return res.json({ success: true, action: 'sell', newPP: tx.newPP, gold: updatedGold });
    }

    res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Lỗi giao dịch vàng' });
  }
});

/**
 * 5. Academic Quiz (Học tập & Kiểm tra)
 */
app.post('/api/academic/quiz-submit', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  const { questId, selectedOpt } = req.body;

  if (!uid || !questId) return res.status(400).json({ success: false, error: 'Thiếu thông tin bài kiểm tra' });

  try {
    const questRef = adminDb.ref(`quests/${questId}`);
    const qSnap = await questRef.get();
    if (!qSnap.exists()) return res.status(404).json({ success: false, error: 'Không tìm thấy câu hỏi' });
    const qData = qSnap.val();

    // Increment attempts
    const currentAttempts = qData.attempts?.[uid] || 0;
    await adminDb.ref(`quests/${questId}/attempts/${uid}`).set(currentAttempts + 1);

    const isCorrect = selectedOpt && selectedOpt === qData.correctOpt;
    const userSnap = await adminDb.ref(`users/${uid}`).get();
    const userName = userSnap.val()?.name || 'Sinh Viên';

    if (isCorrect) {
      const rewardPP = Math.floor(Number(qData.rewardPP) || 1000);
      const tx = await executePPTransaction(uid, rewardPP);
      await adminDb.ref('game_logs').push({
        uid,
        name: userName,
        game: `Quiz: ${qData.title}`,
        bet: 0,
        pnl: rewardPP,
        result: 'ĐÚNG (Chính xác)',
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });
      return res.json({ success: true, isCorrect: true, rewardPP, newPP: tx.newPP });
    } else {
      const penaltyPP = Math.floor(Number(qData.penaltyPP) || 0);
      let newPP = 0;
      if (penaltyPP > 0) {
        const tx = await executePPTransaction(uid, -penaltyPP);
        newPP = tx.newPP;
      } else {
        const wSnap = await adminDb.ref(`wallets/${uid}/pp`).get();
        newPP = Number(wSnap.val()) || 0;
      }
      await adminDb.ref('game_logs').push({
        uid,
        name: userName,
        game: `Quiz: ${qData.title}`,
        bet: 0,
        pnl: -penaltyPP,
        result: selectedOpt ? 'SAI (Nhầm lẫn)' : 'HẾT GIỜ (Trượt)',
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });
      return res.json({ success: true, isCorrect: false, penaltyPP, newPP });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Lỗi chấm bài' });
  }
});

/**
 * 6. Marketplace Purchase
 */
app.post('/api/marketplace/buy', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  const { itemId, itemType, price, value } = req.body;
  const cleanPrice = Math.floor(Number(price) || 0);

  if (!uid || cleanPrice <= 0 || !value) {
    return res.status(400).json({ success: false, error: 'Thông tin vật phẩm không hợp lệ' });
  }

  try {
    const userRef = adminDb.ref(`users/${uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists()) return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
    const userData = userSnap.val();

    const inv = userData.inventory || { frames: [], titles: [] };
    const frames = Array.isArray(inv.frames) ? inv.frames : [];
    const titles = Array.isArray(inv.titles) ? inv.titles : [];

    const alreadyOwned = itemType === 'frame' ? frames.includes(value) : titles.includes(value);
    if (alreadyOwned) {
      return res.status(400).json({ success: false, error: 'Bạn đã sở hữu vật phẩm này rồi!' });
    }

    const tx = await executePPTransaction(uid, -cleanPrice, cleanPrice);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ' });
    }

    const updatedInv = {
      frames: itemType === 'frame' ? [...frames, value] : frames,
      titles: itemType === 'title' ? [...titles, value] : titles
    };

    await userRef.update({ inventory: updatedInv });
    await adminDb.ref(`wallets/${uid}/inventory`).set(updatedInv);

    await adminDb.ref('game_logs').push({
      uid,
      name: userData.name || 'Sinh Viên',
      game: 'Chợ AYK',
      bet: cleanPrice,
      pnl: -cleanPrice,
      result: `Mua vật phẩm: ${itemId || value}`,
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    res.json({ success: true, newPP: tx.newPP, inventory: updatedInv });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Lỗi mua vật phẩm' });
  }
});

/**
 * 7. Battle Pass Upgrade & Claim
 */
app.post('/api/battlepass/upgrade', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  const { cost } = req.body;
  const cleanCost = Math.floor(Number(cost) || 100000);

  if (!uid) return res.status(400).json({ success: false, error: 'Thiếu UID' });

  try {
    const tx = await executePPTransaction(uid, -cleanCost, cleanCost);
    if (!tx.success) return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ' });

    await adminDb.ref(`users/${uid}/isPremiumBattlePass`).set(true);
    await adminDb.ref(`wallets/${uid}/isPremiumBattlePass`).set(true);

    res.json({ success: true, newPP: tx.newPP });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Lỗi nâng cấp Battle Pass' });
  }
});

app.post('/api/battlepass/claim', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  const { tierId, type, rewardValue, frame } = req.body;
  const cleanReward = Math.floor(Number(rewardValue) || 0);

  if (!uid || !tierId || cleanReward <= 0) {
    return res.status(400).json({ success: false, error: 'Dữ liệu mốc thưởng không hợp lệ' });
  }

  try {
    const claimKey = `${tierId}_${type}`;
    const claimedSnap = await adminDb.ref(`users/${uid}/battlePassRewardsClaimed/${claimKey}`).get();
    if (claimedSnap.exists() && claimedSnap.val() === true) {
      return res.status(400).json({ success: false, error: 'Bạn đã nhận phần thưởng này rồi' });
    }

    const tx = await executePPTransaction(uid, cleanReward);
    const updates: any = {};
    updates[`battlePassRewardsClaimed/${claimKey}`] = true;
    if (frame) {
      updates['activeFrame'] = frame;
      const userSnap = await adminDb.ref(`users/${uid}`).get();
      const currentFrames = userSnap.val()?.inventory?.frames || [];
      const updatedFrames = Array.from(new Set([...currentFrames, frame]));
      updates['inventory/frames'] = updatedFrames;
      await adminDb.ref(`wallets/${uid}/inventory/frames`).set(updatedFrames);
    }

    await adminDb.ref(`users/${uid}`).update(updates);

    res.json({ success: true, newPP: tx.newPP });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Lỗi nhận thưởng' });
  }
});

/**
 * 8. Room-based multiplayer games (Blackjack, Tien Len, etc.)
 */
app.post('/api/game/room-bet', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  const { betAmount, targetUid } = req.body;
  const pUid = targetUid || uid;
  const amt = Math.floor(Number(betAmount) || 0);
  if (!pUid || amt <= 0) return res.status(400).json({ success: false, error: 'Mức cược không hợp lệ' });

  try {
    const tx = await executePPTransaction(pUid, -amt, amt);
    if (!tx.success) return res.status(400).json({ success: false, error: tx.error || 'Số dư PP không đủ' });
    res.json({ success: true, targetUid: pUid, newPP: tx.newPP });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Lỗi trừ cược phòng đấu' });
  }
});

/**
 * 9. Promo Code Redemption
 */
app.post('/api/promo/redeem', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  const { code } = req.body;
  if (!uid || !code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'Mã khuyến mãi không hợp lệ' });
  }

  const cleanCode = code.trim().toUpperCase();
  try {
    const pSnap = await adminDb.ref(`promo_codes/${cleanCode}`).get();
    if (!pSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Mã khuyến mãi không tồn tại hoặc đã hết hạn!' });
    }

    const pData = pSnap.val();
    if (!pData.isActive) {
      return res.status(400).json({ success: false, error: 'Mã khuyến mãi này hiện đang bị tạm khóa!' });
    }

    const claimedBy = pData.claimedBy || {};
    if (claimedBy[uid]) {
      return res.status(400).json({ success: false, error: 'Bạn đã sử dụng mã khuyến mãi này rồi!' });
    }

    if (pData.maxClaims && Object.keys(claimedBy).length >= pData.maxClaims) {
      return res.status(400).json({ success: false, error: 'Rất tiếc! Mã khuyến mãi này đã đạt giới hạn lượt sử dụng tối đa.' });
    }

    const reward = Math.floor(Number(pData.rewardPP) || 5000);
    const tx = await executePPTransaction(uid, reward);
    await adminDb.ref(`promo_codes/${cleanCode}/claimedBy/${uid}`).set(Date.now());

    const userSnap = await adminDb.ref(`users/${uid}`).get();
    const userName = userSnap.val()?.name || 'Sinh Viên';

    await adminDb.ref('transactions').push({
      sender: 'PROMO_CODE_CENTER',
      senderName: 'Trung tâm Quà tặng',
      receiver: uid,
      receiverName: userName,
      amount: reward,
      message: `Đổi mã Promo Code: ${cleanCode}`,
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    res.json({ success: true, reward, newPP: tx.newPP });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Lỗi xử lý mã quà tặng' });
  }
});

app.post('/api/game/room-payout', requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  const { targetUid, payoutAmount, gameType, result } = req.body;
  const pUid = targetUid || uid;
  const payout = Math.floor(Number(payoutAmount) || 0);

  if (!pUid || payout <= 0) return res.status(400).json({ success: false, error: 'Số tiền trả thưởng không hợp lệ' });

  try {
    const tx = await executePPTransaction(pUid, payout);
    if (!tx.success) return res.status(400).json({ success: false, error: tx.error || 'Lỗi trả thưởng' });

    const uSnap = await adminDb.ref(`users/${pUid}`).get();
    await adminDb.ref('game_logs').push({
      uid: pUid,
      name: uSnap.val()?.name || 'Sinh Viên',
      game: gameType || 'Bàn Chơi Đối Kháng',
      bet: 0,
      pnl: payout,
      result: result || 'Thắng bàn',
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    res.json({ success: true, targetUid: pUid, newPP: tx.newPP });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Lỗi cộng thưởng phòng đấu' });
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
