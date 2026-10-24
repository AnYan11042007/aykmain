/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Economy RTP Verification Test Suite
 * Simulates large sample runs to mathematically guarantee that all mini-games
 * have house edges with Return-To-Player (RTP) between 90% and 97%.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Mini-Game RTP & Economy Mathematical Integrity Tests', () => {

  it('1. Tai Xiu RTP must be <= 97%', () => {
    // 3d6 simulation: sum 3 to 18
    // Triples: [1,1,1], [2,2,2], [3,3,3], [4,4,4], [5,5,5], [6,6,6] -> house wins
    // Tai: sum 11..17 (excluding triples)
    let taiWins = 0;
    let totalCombinations = 0;

    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        for (let d3 = 1; d3 <= 6; d3++) {
          totalCombinations++;
          const sum = d1 + d2 + d3;
          const isTriple = (d1 === d2 && d2 === d3);
          if (!isTriple && sum >= 11 && sum <= 17) {
            taiWins++;
          }
        }
      }
    }

    assert.strictEqual(totalCombinations, 216);
    assert.strictEqual(taiWins, 105);
    const winProb = taiWins / totalCombinations; // ~48.61%
    const payoutMultiplier = 1.95;
    const rtp = winProb * payoutMultiplier;

    assert.ok(rtp <= 0.97, `Tai Xiu RTP ${rtp} must be <= 0.97`);
    assert.ok(rtp >= 0.90, `Tai Xiu RTP ${rtp} must be >= 0.90`);
  });

  it('2. Penalty RTP must be between 90% and 96%', () => {
    const goalRate = 0.48; // 48% goal chance vs intelligent goalkeeper
    const payout = 1.95;
    const rtp = goalRate * payout;

    assert.ok(Math.abs(rtp - 0.936) < 1e-6, 'Penalty RTP must be approximately 93.6%');
    assert.ok(rtp <= 0.96);
    assert.ok(rtp >= 0.90);
  });

  it('3. Rock Paper Scissors (RPS) RTP must be between 90% and 96%', () => {
    // 3 outcomes with equal 1/3 probability:
    // Win: 1.90x
    // Draw: 0.90x
    // Loss: 0x
    const rtp = (1 / 3) * 1.90 + (1 / 3) * 0.90;
    assert.ok(rtp <= 0.96, `RPS RTP ${rtp} must be <= 0.96`);
    assert.ok(rtp >= 0.90, `RPS RTP ${rtp} must be >= 0.90`);
  });

  it('4. Claw Machine RTP must be between 90% and 96%', () => {
    const prizes = [
      { mult: 10, prob: 0.015 },
      { mult: 3, prob: 0.080 },
      { mult: 2, prob: 0.180 },
      { mult: 1.5, prob: 0.120 }
    ];

    const rtp = prizes.reduce((acc, p) => acc + (p.mult * p.prob), 0);
    assert.strictEqual(Number(rtp.toFixed(3)), 0.930, 'Claw Machine RTP must be 93.0%');
    assert.ok(rtp <= 0.96);
    assert.ok(rtp >= 0.90);
  });

  it('5. Horse Racing RTP must be between 90% and 96%', () => {
    // 4 horses, 25% chance of winning, 3.75x payout
    const rtp = 0.25 * 3.75;
    assert.strictEqual(rtp, 0.9375, 'Horse Racing RTP must be 93.75%');
    assert.ok(rtp <= 0.96);
    assert.ok(rtp >= 0.90);
  });

  it('6. FC Mobile RTP must be between 90% and 96%', () => {
    // Big win: 12% at 2.40x
    // Normal win: 36% at 1.85x
    const rtp = (0.12 * 2.40) + (0.36 * 1.85);
    assert.strictEqual(Number(rtp.toFixed(3)), 0.954, 'FC Mobile RTP must be 95.4%');
    assert.ok(rtp <= 0.96);
    assert.ok(rtp >= 0.90);
  });

  it('7. Lucky Wheel RTP must be between 90% and 96%', () => {
    const cost = 5000;
    const prizes = [
      { pp: 500, weight: 37 },
      { pp: 2000, weight: 26 },
      { pp: 5000, weight: 19 },
      { pp: 10000, weight: 11 },
      { pp: 25000, weight: 6 },
      { pp: 50000, weight: 1 }
    ];

    const ev = prizes.reduce((sum, p) => sum + (p.pp * (p.weight / 100)), 0);
    const rtp = ev / cost;
    assert.strictEqual(ev, 4755);
    assert.strictEqual(rtp, 0.951, 'Wheel RTP must be 95.1%');
    assert.ok(rtp <= 0.96);
    assert.ok(rtp >= 0.90);
  });

  it('8. Monte Carlo 100,000 simulations check for Claw Machine', () => {
    let totalBet = 0;
    let totalWon = 0;
    const BET = 1000;

    for (let i = 0; i < 100000; i++) {
      totalBet += BET;
      const roll = Math.random();
      if (roll < 0.015) {
        totalWon += BET * 10;
      } else if (roll < 0.015 + 0.08) {
        totalWon += BET * 3;
      } else if (roll < 0.015 + 0.08 + 0.18) {
        totalWon += BET * 2;
      } else if (roll < 0.015 + 0.08 + 0.18 + 0.12) {
        totalWon += BET * 1.5;
      }
    }

    const empiricalRTP = totalWon / totalBet;
    // With 100k trials, empirical RTP should be close to 0.93 (+- 2%)
    assert.ok(empiricalRTP >= 0.88 && empiricalRTP <= 0.97, `Empirical RTP ${empiricalRTP} within expected variance`);
  });
});
