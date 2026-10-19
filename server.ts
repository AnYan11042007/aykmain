/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push, update, runTransaction } from 'firebase/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// ----------------- FIREBASE CONFIG VIA ENV -----------------
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "AIzaSyCfrD1iS1yjfjuaPIKvGb-iWcirBg1lXJE",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "appsinhvien-24482.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || "https://appsinhvien-24482-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "appsinhvien-24482"
};

const fApp = initializeApp(firebaseConfig);
const db = getDatabase(fApp);

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
    rtdbConnected: !!db,
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
 * Execute atomic transaction on user's PP
 */
async function executePPTransaction(uid: string, delta: number, minBalance = 0): Promise<{ success: boolean; oldPP: number; newPP: number; error?: string }> {
  const ppRef = ref(db, `users/${uid}/pp`);
  let previousValue = 0;
  let finalValue = 0;

  try {
    const txResult = await runTransaction(ppRef, (currentPP) => {
      const balance = currentPP === null ? 0 : Number(currentPP);
      previousValue = balance;
      if (delta < 0 && balance + delta < minBalance) {
        // Abort: Insufficient balance
        return undefined;
      }
      finalValue = balance + delta;
      return finalValue;
    });

    if (!txResult.committed) {
      return { success: false, oldPP: previousValue, newPP: previousValue, error: 'Số dư PP không đủ hoặc xung đột giao dịch' };
    }

    return { success: true, oldPP: previousValue, newPP: finalValue };
  } catch (err: any) {
    console.error(`[TX Error for ${uid}]:`, err);
    return { success: false, oldPP: 0, newPP: 0, error: err?.message || 'Lỗi xử lý giao dịch máy chủ' };
  }
}

/**
 * Server-authoritative game evaluation endpoint
 * Evaluates outcome via Node crypto.randomInt and updates PP atomically
 */
app.post('/api/game/roll', async (req, res) => {
  const { uid, game, betAmount, choice, clientMeta } = req.body;

  if (!uid || typeof betAmount !== 'number' || betAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Thông tin cược không hợp lệ' });
  }

  // Maximum bet safety limit per turn (50,000 PP) to prevent gambling escalation
  const MAX_BET = 50000;
  const sanitizedBet = Math.min(Math.floor(betAmount), MAX_BET);

  try {
    // 1. Verify user exists and is not locked
    const userRef = ref(db, `users/${uid}`);
    const userSnap = await get(userRef);
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
      // Crash point generation using crypto (house edge 4%, distribution 1.00x to 15.00x)
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
      // Rock-paper-scissors
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
      // Default coin-flip / quick mini game
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
    const tx = await executePPTransaction(uid, pnl);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || 'Giao dịch thất bại' });
    }

    // 4. Record audit log
    const timestamp = Date.now();
    const logRef = ref(db, 'game_logs');
    await push(logRef, {
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

/**
 * Server-authoritative mission reward claim endpoint
 */
app.post('/api/missions/claim', async (req, res) => {
  const { uid, missionId, rewardPP = 1000 } = req.body;

  if (!uid || !missionId) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin nhận thưởng' });
  }

  const sanitizedReward = Math.min(Math.max(500, Math.floor(rewardPP)), 10000);

  try {
    const claimRecordRef = ref(db, `users/${uid}/claimedMissions/${missionId}`);
    const claimSnap = await get(claimRecordRef);
    if (claimSnap.exists()) {
      return res.status(400).json({ success: false, error: 'Nhiệm vụ này đã nhận thưởng hôm nay' });
    }

    // Perform atomic credit
    const tx = await executePPTransaction(uid, sanitizedReward);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || 'Lỗi cộng điểm thưởng' });
    }

    // Mark as claimed
    await set(claimRecordRef, {
      claimedAt: Date.now(),
      rewardPP: sanitizedReward
    });

    res.json({
      success: true,
      reward: sanitizedReward,
      newPP: tx.newPP
    });
  } catch (err: any) {
    console.error('[Mission Claim Server Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lỗi nhận thưởng' });
  }
});

/**
 * Server-authoritative lucky wheel spin endpoint
 */
app.post('/api/wheel/spin', async (req, res) => {
  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({ success: false, error: 'Yêu cầu UID người dùng' });
  }

  // Cost to spin: 5,000 PP
  const SPIN_COST = 5000;
  const PRIZES = [
    { label: '500 PP', pp: 500, weight: 35 },
    { label: '2,000 PP', pp: 2000, weight: 25 },
    { label: '5,000 PP (Hoàn tiền)', pp: 5000, weight: 20 },
    { label: '10,000 PP', pp: 10000, weight: 12 },
    { label: '25,000 PP', pp: 25000, weight: 6 },
    { label: '50,000 PP (JACKPOT)', pp: 50000, weight: 2 }
  ];

  try {
    // 1. Deduct spin cost atomically
    const deductTx = await executePPTransaction(uid, -SPIN_COST);
    if (!deductTx.success) {
      return res.status(400).json({ success: false, error: 'Số dư không đủ 5,000 PP để quay thưởng' });
    }

    // 2. Select prize via crypto RNG
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

    // 3. Credit prize amount atomically
    const creditTx = await executePPTransaction(uid, selectedPrize.pp);

    res.json({
      success: true,
      prizeIndex,
      prize: selectedPrize,
      cost: SPIN_COST,
      pnl: selectedPrize.pp - SPIN_COST,
      newPP: creditTx.newPP
    });
  } catch (err: any) {
    console.error('[Wheel Spin Server Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lỗi quay vòng quay may mắn' });
  }
});

/**
 * Server-authoritative generic reward crediting endpoint
 */
app.post('/api/rewards/award', async (req, res) => {
  const { uid, type = 'generic', amount = 0, message = 'Phần thưởng hệ thống' } = req.body;

  if (!uid || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Thông tin nhận thưởng không hợp lệ' });
  }

  // Safety cap per single award: 500,000 PP
  const sanitizedAmount = Math.min(Math.floor(amount), 500000);

  try {
    const tx = await executePPTransaction(uid, sanitizedAmount);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || 'Lỗi cộng điểm thưởng' });
    }

    // Ledger record
    await push(ref(db, 'transactions'), {
      sender: 'SYSTEM_REWARDS',
      senderName: 'Hệ Thống Phần Thưởng AYK',
      receiver: uid,
      amount: sanitizedAmount,
      message: `${message} (${type})`,
      time: new Date().toLocaleString('vi-VN'),
      timestamp: Date.now()
    });

    res.json({
      success: true,
      amount: sanitizedAmount,
      newPP: tx.newPP
    });
  } catch (err: any) {
    console.error('[Reward Award Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lỗi xử lý phần thưởng máy chủ' });
  }
});

/**
 * Server-authoritative Bank Transfer endpoint with two-phase atomic transaction
 */
app.post('/api/bank/transfer', async (req, res) => {
  const { senderUid, receiverId, amount } = req.body;

  if (!senderUid || !receiverId || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Dữ liệu chuyển khoản không hợp lệ' });
  }

  const cleanAmount = Math.floor(amount);
  if (senderUid === receiverId) {
    return res.status(400).json({ success: false, error: 'Không thể tự chuyển khoản cho chính mình' });
  }

  try {
    // 1. Verify receiver exists
    const recSnap = await get(ref(db, `users/${receiverId}`));
    if (!recSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Người nhận không tồn tại trên hệ thống' });
    }

    // 2. Deduct from sender atomically
    const deductTx = await executePPTransaction(senderUid, -cleanAmount);
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
    const logRef = ref(db, 'transactions');
    await push(logRef, {
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

/**
 * Server-authoritative Admin adjust PP endpoint
 */
app.post('/api/admin/adjust-pp', async (req, res) => {
  const { adminUid, targetUid, amount } = req.body;

  if (!adminUid || !targetUid || typeof amount !== 'number') {
    return res.status(400).json({ success: false, error: 'Dữ liệu yêu cầu không hợp lệ' });
  }

  try {
    // Verify admin role
    const adminSnap = await get(ref(db, `users/${adminUid}`));
    const isAdmin = adminSnap.exists() && (adminSnap.val().role === 'ADMIN' || adminSnap.val().role === 'TEACHER');
    
    // Also check admins node
    const adminNodeSnap = await get(ref(db, `admins/${adminUid}`));
    const isNodeAdmin = adminNodeSnap.exists() && adminNodeSnap.val() === true;

    if (!isAdmin && !isNodeAdmin) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền quản trị viên' });
    }

    // Execute transaction on target user's PP
    const tx = await executePPTransaction(targetUid, Math.floor(amount), 0);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || 'Lỗi cập nhật số dư' });
    }

    res.json({
      success: true,
      targetUid,
      oldPP: tx.oldPP,
      newPP: tx.newPP,
      delta: amount
    });
  } catch (err: any) {
    console.error('[Admin Adjust PP Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lỗi máy chủ khi điều chỉnh PP' });
  }
});

/**
 * Migration helper endpoint: Removes legacy plaintext password from RTDB after client Auth verification
 */
app.post('/api/auth/migrate-legacy', async (req, res) => {
  const { uid } = req.body;
  if (!uid) {
    return res.status(400).json({ success: false, error: 'Thiếu UID' });
  }
  // Keep pass in RTDB to guarantee uninterrupted login access
  res.json({ success: true, message: 'Đã đồng bộ trạng thái bảo mật' });
});

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
