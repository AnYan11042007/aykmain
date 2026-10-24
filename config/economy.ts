/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AYK Economy & Mini-Game Mathematical Model
 * All RTPs are strictly calibrated between 90% and 96% to guarantee fair play and house sustainability.
 */

export interface GameOdds {
  name: string;
  targetRTP: number; // Percentage, e.g. 93.5%
  maxBet: number;
  calculateRTP: () => number;
}

export const ECONOMY_CONFIG = {
  // Global betting safety caps
  MAX_BET_STANDARD: 50000,
  MAX_WIN_PER_DAY: 500000,
  PVP_COMMISSION_PERCENT: 5, // 5% house rake on PvP pots

  // 1. TAI XIU: 3d6 (sums 3-18)
  // Triple (3 or 18) = House wins. 
  // P(Tai: 11-17, excluding triples) = 105/216 = 48.61%
  // Payout = 2.0x -> RTP = 48.61% * 2.0 = 97.22% (or 1.95x -> 94.79%)
  TAIXIU: {
    payoutMultiplier: 1.95,
    getRTP: () => (105 / 216) * 1.95 // 94.79%
  },

  // 2. PENALTY:
  // 5 goal zones [0, 1, 2, 3, 4]
  // Goalie AI save rate = 52%, Goal rate = 48%
  // Payout = 1.95x -> RTP = 48% * 1.95 = 93.60%
  PENALTY: {
    goalRate: 0.48,
    payoutMultiplier: 1.95,
    getRTP: () => 0.48 * 1.95 // 93.60%
  },

  // 3. ROCK PAPER SCISSORS (RPS):
  // Win rate: 1/3, Loss rate: 1/3, Draw rate: 1/3
  // Win payout: 1.90x
  // Draw refund: 0.90x (10% house fee)
  // Loss: 0x
  // RTP = (1/3)*1.90 + (1/3)*0.90 = 0.6333 + 0.30 = 93.33%
  RPS: {
    winPayout: 1.90,
    drawRefund: 0.90,
    getRTP: () => (1 / 3) * 1.90 + (1 / 3) * 0.90 // 93.33%
  },

  // 4. CLAW MACHINE:
  // Prizes:
  // - Ky Lan: x10 (1.5% chance) -> EV = 0.150
  // - Gau Truc: x3 (8.0% chance) -> EV = 0.240
  // - Cao Lua: x2 (18.0% chance) -> EV = 0.360
  // - Chim Cut: x1.5 (12.0% chance) -> EV = 0.180
  // - Miss: x0 (60.5% chance) -> EV = 0
  // Total EV / RTP = 0.15 + 0.24 + 0.36 + 0.18 = 0.93 = 93.00%
  CLAW: {
    prizes: [
      { id: 'kylan', type: '🦄', name: 'Kỳ Lân May Mắn', mult: 10, prob: 0.015 },
      { id: 'gautruc', type: '🐼', name: 'Gấu Trúc Dễ Thương', mult: 3, prob: 0.080 },
      { id: 'caolua', type: '🦊', name: 'Cáo Lửa Nhanh Nhẹn', mult: 2, prob: 0.180 },
      { id: 'chimcut', type: '🐧', name: 'Chim Cánh Cụt Băng Giá', mult: 1.5, prob: 0.120 }
    ],
    getRTP: () => (0.015 * 10) + (0.080 * 3) + (0.180 * 2) + (0.120 * 1.5) // 93.00%
  },

  // 5. HORSE RACING:
  // 4 Horses, exactly 1 winner (25% each)
  // Payout on winning horse = 3.75x -> RTP = 25% * 3.75 = 93.75%
  HORSE: {
    horsesCount: 4,
    payoutMultiplier: 3.75,
    getRTP: () => 0.25 * 3.75 // 93.75%
  },

  // 6. ROULETTE (European, 37 numbers: 0 to 36):
  // Single number: 1/37 * 35 = 94.59%
  // Red / Black: 18/37 * 1.95 = 94.86%
  // Dozen / Column: 12/37 * 2.90 = 94.05%
  ROULETTE: {
    singlePayout: 35,
    evenMoneyPayout: 1.95,
    dozenPayout: 2.90,
    getRTP: () => (18 / 37) * 1.95 // 94.86%
  },

  // 7. FC MOBILE:
  // Win margin >= 2: prob 12%, payout 2.40x (EV = 0.288)
  // Win margin 1: prob 36%, payout 1.85x (EV = 0.666)
  // Draw: prob 10%, payout 0x
  // Loss: prob 42%, payout 0x
  // Total RTP = 0.288 + 0.666 = 95.40%
  FC_MOBILE: {
    bigWinProb: 0.12,
    bigWinMult: 2.40,
    normalWinProb: 0.36,
    normalWinMult: 1.85,
    getRTP: () => (0.12 * 2.40) + (0.36 * 1.85) // 95.40%
  },

  // 8. LUCKY WHEEL:
  // Cost: 5,000 PP
  // Prizes:
  // 500 PP (37%) = 185
  // 2,000 PP (26%) = 520
  // 5,000 PP (19%) = 950
  // 10,000 PP (11%) = 1100
  // 25,000 PP (6%) = 1500
  // 50,000 PP (1%) = 500
  // EV = 4,755 PP / 5,000 PP = 95.10%
  WHEEL: {
    cost: 5000,
    expectedValue: 4755,
    getRTP: () => 4755 / 5000 // 95.10%
  },

  // 9. CYBER 3D MONSTERS REWARD TABLE (Fixed Server Authoritative)
  CYBER3D_MONSTERS: {
    'DRONE': { name: 'Cyber Drone', rewardPP: 150, maxPerMin: 20 },
    'SPIDER': { name: 'Arachnid Bot', rewardPP: 400, maxPerMin: 15 },
    'GOLEM': { name: 'Titan Golem', rewardPP: 1200, maxPerMin: 8 },
    'MANTA': { name: 'Manta Warship', rewardPP: 2500, maxPerMin: 4 },
    'DRAGON': { name: 'Cyber Dragon Boss', rewardPP: 8000, maxPerMin: 2 }
  } as Record<string, { name: string; rewardPP: number; maxPerMin: number }>
};
