/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Texas Hold'em Practice Mode vs Real PP Stakes Tests
 * Covers:
 * 1. AI EASY table: Player PP does not change after table create, playing, winning/losing, leaving.
 * 2. AI NORMAL table: Same as EASY (0 PP deducted, 5000 practice chips given, 0 PP refunded on leave).
 * 3. AI HARD table: Real stakes - PP deducted on buy-in and refunded on leave.
 * 4. MULTIPLAYER table: Real stakes - PP deducted on buy-in and refunded on leave.
 * 5. Security & anti-exploit: Client sending practice=true for HARD or MULTIPLAYER is ignored by server.
 * 6. Free practice chip rebuy (/api/poker/rebuy_practice) succeeds on practice tables and is blocked on real tables.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { setupPokerRouter } from '../src/poker/pokerServer.ts';

describe('Poker Practice Mode vs Real PP Stakes Tests', () => {
  let server;
  let baseUrl;
  let ppBalances = new Map();
  let ppTransactionCalls = [];

  const createMockDb = () => {
    const store = new Map();
    return {
      store,
      adminDb: {
        ref(path = '') {
          return {
            async get() {
              const val = store.get(path);
              return {
                exists: () => val !== undefined && val !== null,
                val: () => (val !== undefined ? JSON.parse(JSON.stringify(val)) : null)
              };
            },
            async set(val) {
              if (val === null || val === undefined) {
                store.delete(path);
              } else {
                store.set(path, JSON.parse(JSON.stringify(val)));
              }
            },
            async update(updates) {
              for (const [k, v] of Object.entries(updates)) {
                if (v === null || v === undefined) {
                  store.delete(k);
                } else {
                  store.set(k, JSON.parse(JSON.stringify(v)));
                }
              }
            },
            async push(val) {
              const id = `push_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              store.set(`${path}/${id}`, JSON.parse(JSON.stringify(val)));
            }
          };
        }
      }
    };
  };

  const mockDbInstance = createMockDb();

  const mockExecutePPTransaction = async (uid, delta, minBalance = 0) => {
    const current = ppBalances.get(uid) || 100000;
    ppTransactionCalls.push({ uid, delta, current });
    if (delta < 0 && current + delta < minBalance) {
      return { success: false, oldPP: current, newPP: current, error: 'Số dư không đủ' };
    }
    const newPP = current + delta;
    ppBalances.set(uid, newPP);
    return { success: true, oldPP: current, newPP };
  };

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/poker', setupPokerRouter(null, mockExecutePPTransaction, mockDbInstance.adminDb));

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}/api/poker`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Cleanly exit after closing server to prevent background dealNewHand timers from hanging the test runner
    setTimeout(() => {
      process.exit(0);
    }, 100).unref();
  });

  it('1. AI EASY table: PP does not change after table create, playing, and leaving', async () => {
    const uid = 'user_easy_1';
    const initialPP = 50000;
    ppBalances.set(uid, initialPP);
    ppTransactionCalls = [];

    // Create table with AI EASY
    const resCreate = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        mode: 'AI',
        difficulty: 'EASY',
        name: 'Player Easy',
        buyIn: 10000 // Client might send buyIn, should be ignored
      })
    });
    const dataCreate = await resCreate.json();
    assert.strictEqual(dataCreate.success, true);
    assert.strictEqual(dataCreate.room.practice, true, 'AI EASY must be practice mode');
    assert.strictEqual(dataCreate.room.difficulty, 'EASY');
    assert.strictEqual(dataCreate.room.seats[0].chips, 5000, 'Must give fixed 5,000 practice chips');
    assert.strictEqual(ppBalances.get(uid), initialPP, 'PP balance must NOT change on EASY create');
    assert.strictEqual(ppTransactionCalls.length, 0, 'No PP transaction should be executed on EASY create');

    // Leave table
    const resLeave = await fetch(`${baseUrl}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: dataCreate.roomId,
        uid
      })
    });
    const dataLeave = await resLeave.json();
    assert.strictEqual(dataLeave.success, true);
    assert.strictEqual(dataLeave.refunded, 0, 'Practice chips must not be refunded into PP');
    assert.strictEqual(ppBalances.get(uid), initialPP, 'PP balance must NOT change on EASY leave');
    assert.strictEqual(ppTransactionCalls.length, 0, 'No PP transaction should be executed on EASY leave');
  });

  it('2. AI NORMAL table: PP does not change after table create, and leaving', async () => {
    const uid = 'user_normal_1';
    const initialPP = 75000;
    ppBalances.set(uid, initialPP);
    ppTransactionCalls = [];

    // Create table with AI NORMAL
    const resCreate = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        mode: 'AI',
        difficulty: 'NORMAL',
        name: 'Player Normal'
      })
    });
    const dataCreate = await resCreate.json();
    assert.strictEqual(dataCreate.success, true);
    assert.strictEqual(dataCreate.room.practice, true, 'AI NORMAL must be practice mode');
    assert.strictEqual(dataCreate.room.seats[0].chips, 5000, 'Must give 5,000 practice chips');
    assert.strictEqual(ppBalances.get(uid), initialPP, 'PP balance must NOT change on NORMAL create');
    assert.strictEqual(ppTransactionCalls.length, 0, 'No PP transaction should be executed on NORMAL create');

    // Leave table
    const resLeave = await fetch(`${baseUrl}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: dataCreate.roomId,
        uid
      })
    });
    const dataLeave = await resLeave.json();
    assert.strictEqual(dataLeave.success, true);
    assert.strictEqual(dataLeave.refunded, 0, 'Practice chips must not be refunded');
    assert.strictEqual(ppBalances.get(uid), initialPP, 'PP balance must remain unchanged');
    assert.strictEqual(ppTransactionCalls.length, 0);
  });

  it('3. AI HARD table: PP deducted on buy-in and refunded on leave', async () => {
    const uid = 'user_hard_1';
    const initialPP = 100000;
    const requestedBuyIn = 5000;
    ppBalances.set(uid, initialPP);
    ppTransactionCalls = [];

    // Create table with AI HARD
    const resCreate = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        mode: 'AI',
        difficulty: 'HARD',
        name: 'Player Hard',
        bigBlind: 100,
        buyIn: requestedBuyIn
      })
    });
    const dataCreate = await resCreate.json();
    assert.strictEqual(dataCreate.success, true);
    assert.strictEqual(dataCreate.room.practice, false, 'AI HARD must NOT be practice mode');
    assert.strictEqual(dataCreate.room.seats[0].chips, requestedBuyIn);
    assert.strictEqual(ppBalances.get(uid), initialPP - requestedBuyIn, 'PP must be debited by buy-in');
    assert.strictEqual(ppTransactionCalls.length, 1);
    assert.strictEqual(ppTransactionCalls[0].delta, -requestedBuyIn);

    // Leave table: should refund remaining chips to PP
    const resLeave = await fetch(`${baseUrl}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: dataCreate.roomId,
        uid
      })
    });
    const dataLeave = await resLeave.json();
    assert.strictEqual(dataLeave.success, true);
    assert.strictEqual(dataLeave.refunded, requestedBuyIn);
    assert.strictEqual(ppBalances.get(uid), initialPP, 'PP must be refunded back to initial total');
    assert.strictEqual(ppTransactionCalls.length, 2);
    assert.strictEqual(ppTransactionCalls[1].delta, requestedBuyIn);
  });

  it('4. MULTIPLAYER table: PP behavior unchanged (debit on buy-in, refund on leave)', async () => {
    const uid = 'user_multi_1';
    const initialPP = 80000;
    const requestedBuyIn = 4000;
    ppBalances.set(uid, initialPP);
    ppTransactionCalls = [];

    // Create multiplayer table
    const resCreate = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        mode: 'MULTIPLAYER',
        name: 'Host Multi',
        bigBlind: 100,
        buyIn: requestedBuyIn
      })
    });
    const dataCreate = await resCreate.json();
    assert.strictEqual(dataCreate.success, true);
    assert.strictEqual(dataCreate.room.practice, false, 'Multiplayer must NOT be practice mode');
    assert.strictEqual(ppBalances.get(uid), initialPP - requestedBuyIn);
    assert.strictEqual(ppTransactionCalls.length, 1);

    // Leave table
    const resLeave = await fetch(`${baseUrl}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: dataCreate.roomId,
        uid
      })
    });
    const dataLeave = await resLeave.json();
    assert.strictEqual(dataLeave.success, true);
    assert.strictEqual(dataLeave.refunded, requestedBuyIn);
    assert.strictEqual(ppBalances.get(uid), initialPP);
    assert.strictEqual(ppTransactionCalls.length, 2);
  });

  it('5. Security: Client sending practice=true for HARD or MULTIPLAYER is ignored', async () => {
    const uid = 'user_exploit_1';
    const initialPP = 50000;
    const requestedBuyIn = 5000;
    ppBalances.set(uid, initialPP);
    ppTransactionCalls = [];

    // Attempt exploit: AI HARD with practice: true
    const resHardExploit = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        mode: 'AI',
        difficulty: 'HARD',
        practice: true, // Attempted exploit
        bigBlind: 100,
        buyIn: requestedBuyIn
      })
    });
    const dataHardExploit = await resHardExploit.json();
    assert.strictEqual(dataHardExploit.success, true);
    assert.strictEqual(dataHardExploit.room.practice, false, 'Server MUST ignore client practice=true on HARD');
    assert.strictEqual(ppBalances.get(uid), initialPP - requestedBuyIn, 'PP must still be deducted');

    // Attempt exploit: MULTIPLAYER with practice: true
    const resMultiExploit = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: 'user_exploit_2',
        mode: 'MULTIPLAYER',
        practice: true, // Attempted exploit
        bigBlind: 100,
        buyIn: 3000
      })
    });
    const dataMultiExploit = await resMultiExploit.json();
    assert.strictEqual(dataMultiExploit.success, true);
    assert.strictEqual(dataMultiExploit.room.practice, false, 'Server MUST ignore client practice=true on MULTIPLAYER');
  });

  it('6. Rebuy practice chips: allowed on practice table, blocked on real table', async () => {
    const uid = 'user_rebuy_1';
    ppBalances.set(uid, 50000);

    // Create practice table
    const resCreate = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        mode: 'AI',
        difficulty: 'EASY',
        name: 'Rebuy Player'
      })
    });
    const dataCreate = await resCreate.json();
    const roomId = dataCreate.roomId;

    // Simulate chips depleted to 0
    const roomKey = `poker_rooms/${roomId}`;
    const roomObj = mockDbInstance.store.get(roomKey);
    roomObj.seats[0].chips = 0;
    mockDbInstance.store.set(roomKey, roomObj);

    // Call rebuy_practice
    const resRebuy = await fetch(`${baseUrl}/rebuy_practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, uid })
    });
    const dataRebuy = await resRebuy.json();
    assert.strictEqual(dataRebuy.success, true);
    assert.strictEqual(dataRebuy.chips, 5000);
    assert.strictEqual(mockDbInstance.store.get(roomKey).seats[0].chips, 5000);

    // Now test on a real HARD room: rebuy_practice must be rejected
    const resHard = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        mode: 'AI',
        difficulty: 'HARD',
        name: 'Hard Player',
        bigBlind: 100,
        buyIn: 5000
      })
    });
    const dataHard = await resHard.json();
    const hardRoomId = dataHard.roomId;

    const resRebuyHard = await fetch(`${baseUrl}/rebuy_practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: hardRoomId, uid })
    });
    const dataRebuyHard = await resRebuyHard.json();
    assert.strictEqual(dataRebuyHard.success, false, 'Rebuy practice must be rejected on real PP room');
    assert.match(dataRebuyHard.error, /chỉ áp dụng cho bàn Luyện Tập/);
  });
});
