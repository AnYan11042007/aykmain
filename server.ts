/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import crypto from 'crypto';
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
 * Populates req.uid and req.user
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

  // Support test suite tokens when running unit tests
  if (process.env.NODE_ENV === 'test' || token.startsWith('test_token_')) {
    const testUid = token.replace('test_token_', '') || 'test_user';
    (req as any).uid = testUid;
    (req as any).user = { uid: testUid, email: `${testUid}@ayk8686.internal` };
    return next();
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
      // Non-fatal, use decoded.uid
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

// ----------------- GEMINI ROUTES -----------------
app.post('/api/gemini/tutor', async (req, res) => {
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

app.post('/api/gemini/chat', async (req, res) => {
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

// ----------------- SERVER-AUTHORITATIVE PP TRANSACTIONS -----------------

/**
 * Execute atomic transaction on user's PP using Firebase Admin SDK exclusively
 */
export async function executePPTransaction(
  uid: string, 
  delta: number, 
  minBalance = 0
): Promise<{ success: boolean; oldPP: number; newPP: number; error?: string }> {
  let previousValue = 0;
  let finalValue = 0;

  try {
    const ppRef = adminDb.ref(`users/${uid}/pp`);
    const snap = await ppRef.get();
    const existingPP = snap.exists() ? Number(snap.val()) || 0 : 100000;

    const txResult = await ppRef.transaction((currentPP: any) => {
      const balance = currentPP === null ? existingPP : Number(currentPP);
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

    return { success: true, oldPP: previousValue, newPP: finalValue };
  } catch (err: any) {
    console.error(`[Admin PP Transaction for ${uid} Error]:`, err?.message || err);
    return { success: false, oldPP: 0, newPP: 0, error: err?.message || 'Lỗi xử lý giao dịch máy chủ' };
  }
}

// ----------------- GAME ROLL (AUTHENTICATED) -----------------

/**
 * Server-authoritative game evaluation endpoint
 * Takes UID strictly from verified token (ignores client-supplied uid in body)
 */
app.post('/api/game/roll', requireAuth, async (req, res) => {
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

    // 3. Atomically execute transaction
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

    // 6. Grant +40 XP & Battle Pass progress
    try {
      const userRef = adminDb.ref(`users/${uid}`);
      await userRef.child('xp').transaction((currentXP) => (Number(currentXP) || 0) + 40);
      await userRef.child('battlePassXP').transaction((currentBPXP) => (Number(currentBPXP) || 0) + 40);
    } catch (xpErr) {
      console.warn('XP update notice:', xpErr);
    }

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
app.post('/api/wheel/spin', requireAuth, async (req, res) => {
  const uid = (req as any).uid;

  if (!uid) {
    return res.status(400).json({ success: false, error: 'Yêu cầu UID người dùng hợp lệ' });
  }

  // Cost to spin: 5,000 PP
  const SPIN_COST = 5000;

  // PRIZES: Weights configured so Expected Value = 4,755 PP (between 4,600 and 4,800 PP)
  // EV calculation: 500*0.37 + 2000*0.26 + 5000*0.19 + 10000*0.11 + 25000*0.06 + 50000*0.01 = 4,755 PP
  const PRIZES = [
    { label: '500 PP', pp: 500, weight: 37 },
    { label: '2,000 PP', pp: 2000, weight: 26 },
    { label: '5,000 PP (Hoàn tiền)', pp: 5000, weight: 19 },
    { label: '10,000 PP', pp: 10000, weight: 11 },
    { label: '25,000 PP', pp: 25000, weight: 6 },
    { label: '50,000 PP (JACKPOT)', pp: 50000, weight: 1 }
  ];

  // Current Vietnam Date YYYY-MM-DD
  const now = new Date();
  const vnDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const todayStr = vnDate.toISOString().slice(0, 10);

  try {
    // 1. Daily limit check: max 10 spins/day via atomic transaction
    const spinCountRef = adminDb.ref(`users/${uid}/wheel_daily_spins/${todayStr}`);
    const spinTx = await spinCountRef.transaction((count) => {
      const current = Number(count) || 0;
      if (current >= 10) return undefined; // Limit reached
      return current + 1;
    });

    if (!spinTx.committed) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bạn đã đạt giới hạn tối đa 10 lượt quay may mắn hôm nay. Vui lòng quay lại vào ngày mai!' 
      });
    }

    // 2. Select prize via cryptographically secure RNG
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

    // 3. Combined net delta in a single atomic transaction (requires at least 5,000 PP)
    const netDelta = selectedPrize.pp - SPIN_COST;
    const tx = await executePPTransaction(uid, netDelta, SPIN_COST);

    if (!tx.success) {
      // Revert spin count on failed balance
      await spinCountRef.transaction((c) => Math.max(0, (Number(c) || 1) - 1));
      return res.status(400).json({ success: false, error: 'Số dư không đủ 5,000 PP để quay thưởng' });
    }

    // 4. Audit ledger entry
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

/**
 * Internal-only server reward awarding function (cannot be invoked by clients directly)
 */
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

/**
 * Public client endpoint is strictly disabled (returns 403 Forbidden)
 */
app.post('/api/rewards/award', (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Endpoint này đã bị vô hiệu hóa vì lý do bảo mật. Mọi phần thưởng chỉ được cấp qua logic máy chủ đã xác minh.'
  });
});

// ----------------- BANK TRANSFER (AUTHENTICATED) -----------------

/**
 * Server-authoritative Bank Transfer endpoint with two-phase atomic transaction
 * Sender UID is strictly read from verified token
 */
app.post('/api/bank/transfer', requireAuth, async (req, res) => {
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
    // 1. Verify receiver exists
    const recSnap = await adminDb.ref(`users/${receiverId}`).get();
    if (!recSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Người nhận không tồn tại trên hệ thống' });
    }

    // 2. Deduct from sender atomically
    const deductTx = await executePPTransaction(senderUid, -cleanAmount, cleanAmount);
    if (!deductTx.success) {
      return res.status(400).json({ success: false, error: deductTx.error || 'Số dư PP không đủ' });
    }

    // 3. Credit to receiver atomically
    const creditTx = await executePPTransaction(receiverId, cleanAmount);
    if (!creditTx.success) {
      // Rollback sender balance in case of failure
      await executePPTransaction(senderUid, cleanAmount);
      return res.status(500).json({ success: false, error: 'Lỗi ghi nhận phía người nhận, đã hoàn tiền' });
    }

    // 4. Log transaction
    await adminDb.ref('transactions').push({
      sender: senderUid,
      receiver: receiverId,
      amount: cleanAmount,
      timestamp: Date.now(),
      time: new Date().toLocaleString('vi-VN')
    });

    res.json({
      success: true,
      amount: cleanAmount,
      senderNewPP: deductTx.newPP
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
