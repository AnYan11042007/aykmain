/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Texas Hold'em Poker Pure Engine
 * Independent of React and Firebase
 * Covers card representation, 10 hand rankings (VN + EN),
 * 5-of-7 card evaluation, side pot calculation, and betting mechanics.
 */

export type Suit = 'c' | 'd' | 'h' | 's'; // clubs, diamonds, hearts, spades
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J, 12=Q, 13=K, 14=A

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type HandCategory =
  | 'ROYAL_FLUSH'
  | 'STRAIGHT_FLUSH'
  | 'FOUR_OF_A_KIND'
  | 'FULL_HOUSE'
  | 'FLUSH'
  | 'STRAIGHT'
  | 'THREE_OF_A_KIND'
  | 'TWO_PAIR'
  | 'ONE_PAIR'
  | 'HIGH_CARD';

export const HAND_CATEGORY_RANKS: Record<HandCategory, number> = {
  ROYAL_FLUSH: 10,
  STRAIGHT_FLUSH: 9,
  FOUR_OF_A_KIND: 8,
  FULL_HOUSE: 7,
  FLUSH: 6,
  STRAIGHT: 5,
  THREE_OF_A_KIND: 4,
  TWO_PAIR: 3,
  ONE_PAIR: 2,
  HIGH_CARD: 1,
};

export const HAND_NAMES_VI: Record<HandCategory, string> = {
  ROYAL_FLUSH: 'Thùng phá sảnh Hoàng gia',
  STRAIGHT_FLUSH: 'Thùng phá sảnh',
  FOUR_OF_A_KIND: 'Tứ quý',
  FULL_HOUSE: 'Cù lũ',
  FLUSH: 'Thùng',
  STRAIGHT: 'Sảnh',
  THREE_OF_A_KIND: 'Sám cô',
  TWO_PAIR: 'Thú (Hai đôi)',
  ONE_PAIR: 'Đôi',
  HIGH_CARD: 'Mậu thầu',
};

export const HAND_NAMES_EN: Record<HandCategory, string> = {
  ROYAL_FLUSH: 'ROYAL FLUSH',
  STRAIGHT_FLUSH: 'STRAIGHT FLUSH',
  FOUR_OF_A_KIND: 'FOUR OF A KIND',
  FULL_HOUSE: 'FULL HOUSE',
  FLUSH: 'FLUSH',
  STRAIGHT: 'STRAIGHT',
  THREE_OF_A_KIND: 'THREE OF A KIND',
  TWO_PAIR: 'TWO PAIR',
  ONE_PAIR: 'ONE PAIR',
  HIGH_CARD: 'HIGH CARD',
};

export const RANK_NAMES: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

export interface HandEvaluation {
  category: HandCategory;
  categoryRank: number; // 1 (Royal Flush) to 10 (High Card) matching demo 2 table position
  nameVi: string;
  nameEn: string;
  shortDesc: string; // e.g. "Sám cô K", "Cù lũ A qua K", "Đôi A"
  best5: Card[];
  tiebreakers: number[]; // e.g. [14, 14, 13, 10, 8]
  score: number; // Numeric score for instant comparison
}

/**
 * Parse string notation into Card object.
 * Examples: 'Ah', '10s', 'Kd', '2c'
 */
export function parseCard(cardStr: string): Card {
  const clean = cardStr.trim();
  const suitChar = clean.slice(-1).toLowerCase() as Suit;
  const rankStr = clean.slice(0, -1).toUpperCase();

  let rank: Rank;
  if (rankStr === 'A') rank = 14;
  else if (rankStr === 'K') rank = 13;
  else if (rankStr === 'Q') rank = 12;
  else if (rankStr === 'J') rank = 11;
  else {
    const num = parseInt(rankStr, 10);
    if (isNaN(num) || num < 2 || num > 10) throw new Error(`Invalid rank in card string: ${cardStr}`);
    rank = num as Rank;
  }

  if (!['c', 'd', 'h', 's'].includes(suitChar)) {
    throw new Error(`Invalid suit in card string: ${cardStr}`);
  }

  return { suit: suitChar, rank };
}

export function formatCard(card: Card): string {
  return `${RANK_NAMES[card.rank]}${card.suit}`;
}

/**
 * Creates standard 52-card deck
 */
export function getStandardDeck(): Card[] {
  const suits: Suit[] = ['s', 'h', 'd', 'c']; // spades, hearts, diamonds, clubs
  const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const deck: Card[] = [];
  for (const s of suits) {
    for (const r of ranks) {
      deck.push({ suit: s, rank: r });
    }
  }
  return deck;
}

/**
 * Fisher-Yates shuffle
 */
export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/**
 * Evaluates exactly 5 cards.
 */
export function evaluate5Cards(cards: Card[]): HandEvaluation {
  if (cards.length !== 5) {
    throw new Error('evaluate5Cards expects exactly 5 cards');
  }

  // Sort descending by rank
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map(c => c.rank);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHighRank = 0;

  // Normal straight: 5 consecutive ranks
  if (
    ranks[0] - ranks[1] === 1 &&
    ranks[1] - ranks[2] === 1 &&
    ranks[2] - ranks[3] === 1 &&
    ranks[3] - ranks[4] === 1
  ) {
    isStraight = true;
    straightHighRank = ranks[0];
  } else if (
    ranks[0] === 14 &&
    ranks[1] === 5 &&
    ranks[2] === 4 &&
    ranks[3] === 3 &&
    ranks[4] === 2
  ) {
    // Wheel straight: A-2-3-4-5 (A counts as 1, high card is 5)
    isStraight = true;
    straightHighRank = 5;
  }

  // Group by rank
  const counts: Record<number, number> = {};
  for (const r of ranks) {
    counts[r] = (counts[r] || 0) + 1;
  }

  const groups = Object.entries(counts).map(([rStr, count]) => ({
    rank: parseInt(rStr, 10),
    count
  }));

  // Sort groups by count desc, then rank desc
  groups.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.rank - a.rank;
  });

  // Calculate score base multiplier
  // Score formula: categoryWeight * 10^10 + r1 * 10^8 + r2 * 10^6 + r3 * 10^4 + r4 * 10^2 + r5
  const calcScore = (catRank: number, tiebreakers: number[]) => {
    let score = catRank * 10000000000;
    const weights = [100000000, 1000000, 10000, 100, 1];
    for (let i = 0; i < tiebreakers.length; i++) {
      score += (tiebreakers[i] || 0) * (weights[i] || 0);
    }
    return score;
  };

  // 1. Royal Flush & 2. Straight Flush
  if (isFlush && isStraight) {
    if (straightHighRank === 14) {
      const tiebreakers = [14, 13, 12, 11, 10];
      return {
        category: 'ROYAL_FLUSH',
        categoryRank: 1,
        nameVi: HAND_NAMES_VI.ROYAL_FLUSH,
        nameEn: HAND_NAMES_EN.ROYAL_FLUSH,
        shortDesc: 'Thùng phá sảnh Hoàng gia',
        best5: sorted,
        tiebreakers,
        score: calcScore(HAND_CATEGORY_RANKS.ROYAL_FLUSH, tiebreakers)
      };
    } else {
      const tiebreakers = [straightHighRank];
      return {
        category: 'STRAIGHT_FLUSH',
        categoryRank: 2,
        nameVi: HAND_NAMES_VI.STRAIGHT_FLUSH,
        nameEn: HAND_NAMES_EN.STRAIGHT_FLUSH,
        shortDesc: `Thùng phá sảnh ${RANK_NAMES[straightHighRank as Rank]}`,
        best5: sorted,
        tiebreakers,
        score: calcScore(HAND_CATEGORY_RANKS.STRAIGHT_FLUSH, tiebreakers)
      };
    }
  }

  // 3. Four of a kind
  if (groups[0].count === 4) {
    const quadRank = groups[0].rank;
    const kicker = groups[1].rank;
    const tiebreakers = [quadRank, kicker];
    return {
      category: 'FOUR_OF_A_KIND',
      categoryRank: 3,
      nameVi: HAND_NAMES_VI.FOUR_OF_A_KIND,
      nameEn: HAND_NAMES_EN.FOUR_OF_A_KIND,
      shortDesc: `Tứ quý ${RANK_NAMES[quadRank as Rank]}`,
      best5: sorted,
      tiebreakers,
      score: calcScore(HAND_CATEGORY_RANKS.FOUR_OF_A_KIND, tiebreakers)
    };
  }

  // 4. Full house
  if (groups[0].count === 3 && groups[1].count === 2) {
    const tripRank = groups[0].rank;
    const pairRank = groups[1].rank;
    const tiebreakers = [tripRank, pairRank];
    return {
      category: 'FULL_HOUSE',
      categoryRank: 4,
      nameVi: HAND_NAMES_VI.FULL_HOUSE,
      nameEn: HAND_NAMES_EN.FULL_HOUSE,
      shortDesc: `Cù lũ ${RANK_NAMES[tripRank as Rank]} qua ${RANK_NAMES[pairRank as Rank]}`,
      best5: sorted,
      tiebreakers,
      score: calcScore(HAND_CATEGORY_RANKS.FULL_HOUSE, tiebreakers)
    };
  }

  // 5. Flush
  if (isFlush) {
    const tiebreakers = ranks;
    return {
      category: 'FLUSH',
      categoryRank: 5,
      nameVi: HAND_NAMES_VI.FLUSH,
      nameEn: HAND_NAMES_EN.FLUSH,
      shortDesc: `Thùng (${RANK_NAMES[ranks[0] as Rank]} cao)`,
      best5: sorted,
      tiebreakers,
      score: calcScore(HAND_CATEGORY_RANKS.FLUSH, tiebreakers)
    };
  }

  // 6. Straight
  if (isStraight) {
    const tiebreakers = [straightHighRank];
    return {
      category: 'STRAIGHT',
      categoryRank: 6,
      nameVi: HAND_NAMES_VI.STRAIGHT,
      nameEn: HAND_NAMES_EN.STRAIGHT,
      shortDesc: `Sảnh (${RANK_NAMES[straightHighRank as Rank]} cao)`,
      best5: sorted,
      tiebreakers,
      score: calcScore(HAND_CATEGORY_RANKS.STRAIGHT, tiebreakers)
    };
  }

  // 7. Three of a kind
  if (groups[0].count === 3) {
    const tripRank = groups[0].rank;
    const kickers = groups.slice(1).map(g => g.rank).sort((a, b) => b - a);
    const tiebreakers = [tripRank, ...kickers];
    return {
      category: 'THREE_OF_A_KIND',
      categoryRank: 7,
      nameVi: HAND_NAMES_VI.THREE_OF_A_KIND,
      nameEn: HAND_NAMES_EN.THREE_OF_A_KIND,
      shortDesc: `Sám cô ${RANK_NAMES[tripRank as Rank]}`,
      best5: sorted,
      tiebreakers,
      score: calcScore(HAND_CATEGORY_RANKS.THREE_OF_A_KIND, tiebreakers)
    };
  }

  // 8. Two pair
  if (groups[0].count === 2 && groups[1].count === 2) {
    const highPair = Math.max(groups[0].rank, groups[1].rank);
    const lowPair = Math.min(groups[0].rank, groups[1].rank);
    const kicker = groups[2].rank;
    const tiebreakers = [highPair, lowPair, kicker];
    return {
      category: 'TWO_PAIR',
      categoryRank: 8,
      nameVi: HAND_NAMES_VI.TWO_PAIR,
      nameEn: HAND_NAMES_EN.TWO_PAIR,
      shortDesc: `Thú (Đôi ${RANK_NAMES[highPair as Rank]} & Đôi ${RANK_NAMES[lowPair as Rank]})`,
      best5: sorted,
      tiebreakers,
      score: calcScore(HAND_CATEGORY_RANKS.TWO_PAIR, tiebreakers)
    };
  }

  // 9. One pair
  if (groups[0].count === 2) {
    const pairRank = groups[0].rank;
    const kickers = groups.slice(1).map(g => g.rank).sort((a, b) => b - a);
    const tiebreakers = [pairRank, ...kickers];
    return {
      category: 'ONE_PAIR',
      categoryRank: 9,
      nameVi: HAND_NAMES_VI.ONE_PAIR,
      nameEn: HAND_NAMES_EN.ONE_PAIR,
      shortDesc: `Đôi ${RANK_NAMES[pairRank as Rank]}`,
      best5: sorted,
      tiebreakers,
      score: calcScore(HAND_CATEGORY_RANKS.ONE_PAIR, tiebreakers)
    };
  }

  // 10. High card
  const tiebreakers = ranks;
  return {
    category: 'HIGH_CARD',
    categoryRank: 10,
    nameVi: HAND_NAMES_VI.HIGH_CARD,
    nameEn: HAND_NAMES_EN.HIGH_CARD,
    shortDesc: `Mậu thầu (${RANK_NAMES[ranks[0] as Rank]} cao)`,
    best5: sorted,
    tiebreakers,
    score: calcScore(HAND_CATEGORY_RANKS.HIGH_CARD, tiebreakers)
  };
}

/**
 * Evaluates best 5-card combination from up to 7 cards.
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    throw new Error(`evaluateHand requires at least 5 cards, got ${cards.length}`);
  }

  if (cards.length === 5) {
    return evaluate5Cards(cards);
  }

  // Generate all 5-card combinations
  const combos: Card[][] = [];
  const n = cards.length;

  function generateCombinations(start: number, currentCombo: Card[]) {
    if (currentCombo.length === 5) {
      combos.push([...currentCombo]);
      return;
    }
    for (let i = start; i < n; i++) {
      currentCombo.push(cards[i]);
      generateCombinations(i + 1, currentCombo);
      currentCombo.pop();
    }
  }

  generateCombinations(0, []);

  let bestEval: HandEvaluation | null = null;
  for (const combo of combos) {
    const ev = evaluate5Cards(combo);
    if (!bestEval || ev.score > bestEval.score) {
      bestEval = ev;
    }
  }

  return bestEval!;
}

/**
 * Compare two evaluated hands
 * returns > 0 if h1 beats h2
 * returns < 0 if h2 beats h1
 * returns 0 if exact tie
 */
export function compareHands(h1: HandEvaluation, h2: HandEvaluation): number {
  return h1.score - h2.score;
}

// ----------------- SIDE POT AND PAYOUT LOGIC -----------------

export interface PlayerBetEntry {
  id: string;
  totalBet: number;
  folded: boolean;
}

export interface PotTier {
  amount: number;
  eligiblePlayerIds: string[];
}

/**
 * Calculates main pot and all side pots accurately based on each player's total investment.
 */
export function calculateSidePots(players: PlayerBetEntry[]): PotTier[] {
  // Only players with bet > 0 contribute
  const contributors = players.filter(p => p.totalBet > 0);
  if (contributors.length === 0) return [];

  // Extract distinct bet levels among all contributors, sorted ascending
  const betLevels = Array.from(new Set(contributors.map(p => p.totalBet))).sort((a, b) => a - b);

  const pots: PotTier[] = [];
  let previousLevel = 0;

  for (const level of betLevels) {
    const incrementalBet = level - previousLevel;
    if (incrementalBet <= 0) continue;

    // Count how many players contributed to this slice
    const contributorsToSlice = contributors.filter(p => p.totalBet >= level);
    const tierAmount = incrementalBet * contributorsToSlice.length;

    // Eligible players are those who contributed to this slice AND have NOT folded
    const eligiblePlayerIds = contributorsToSlice
      .filter(p => !p.folded)
      .map(p => p.id);

    if (tierAmount > 0 && eligiblePlayerIds.length > 0) {
      pots.push({
        amount: tierAmount,
        eligiblePlayerIds
      });
    } else if (tierAmount > 0 && eligiblePlayerIds.length === 0) {
      // If nobody eligible in this tier (everyone folded), fold into previous pot if exists
      if (pots.length > 0) {
        pots[pots.length - 1].amount += tierAmount;
      }
    }

    previousLevel = level;
  }

  return pots;
}

export interface PlayerPayoutResult {
  payouts: Record<string, number>;
  winners: Array<{
    id: string;
    amount: number;
    handDesc: string;
  }>;
}

/**
 * Distributes side pots according to evaluated hand strengths.
 */
export function distributePots(
  pots: PotTier[],
  handEvaluations: Record<string, HandEvaluation>
): PlayerPayoutResult {
  const payouts: Record<string, number> = {};
  const winnerSummary: Map<string, { amount: number; handDesc: string }> = new Map();

  for (const pot of pots) {
    if (pot.amount <= 0 || pot.eligiblePlayerIds.length === 0) continue;

    // Filter to eligible players with evaluations
    const eligible = pot.eligiblePlayerIds.filter(id => !!handEvaluations[id]);
    if (eligible.length === 0) {
      // Fallback: split among eligible if any
      const share = Math.floor(pot.amount / pot.eligiblePlayerIds.length);
      pot.eligiblePlayerIds.forEach(id => {
        payouts[id] = (payouts[id] || 0) + share;
      });
      continue;
    }

    // Find highest score among eligible
    let maxScore = -1;
    for (const id of eligible) {
      const score = handEvaluations[id].score;
      if (score > maxScore) {
        maxScore = score;
      }
    }

    const tierWinners = eligible.filter(id => handEvaluations[id].score === maxScore);
    const splitAmount = Math.floor(pot.amount / tierWinners.length);
    let remainder = pot.amount % tierWinners.length;

    for (const wId of tierWinners) {
      let win = splitAmount;
      if (remainder > 0) {
        win += 1;
        remainder--;
      }
      payouts[wId] = (payouts[wId] || 0) + win;

      const current = winnerSummary.get(wId) || { amount: 0, handDesc: handEvaluations[wId].shortDesc };
      current.amount += win;
      winnerSummary.set(wId, current);
    }
  }

  const winners = Array.from(winnerSummary.entries()).map(([id, info]) => ({
    id,
    amount: info.amount,
    handDesc: info.handDesc
  }));

  return { payouts, winners };
}

// ----------------- BETTING & ACTION VALIDATION -----------------

export interface BettingOptions {
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  canAllIn: boolean;
  callAmount: number;
  minRaiseTotal: number;
  maxRaiseTotal: number;
  halfPotRaiseTotal: number;
  threeQuarterPotRaiseTotal: number;
  potRaiseTotal: number;
}

/**
 * Calculates valid betting options for a player on their turn.
 */
export function getBettingOptions(params: {
  playerChips: number;
  playerCurrentBet: number;
  highestBetOnTable: number;
  lastRaiseDelta: number;
  bigBlind: number;
  totalPot: number;
}): BettingOptions {
  const {
    playerChips,
    playerCurrentBet,
    highestBetOnTable,
    lastRaiseDelta,
    bigBlind,
    totalPot
  } = params;

  const toCall = Math.max(0, highestBetOnTable - playerCurrentBet);
  const canCheck = toCall === 0;
  const canCall = toCall > 0 && playerChips > 0;
  const callAmount = Math.min(toCall, playerChips);

  const minRaiseDelta = Math.max(bigBlind, lastRaiseDelta);
  const minRaiseTotal = highestBetOnTable + minRaiseDelta;
  const maxRaiseTotal = playerCurrentBet + playerChips; // All-in

  const canRaise = maxRaiseTotal >= minRaiseTotal && playerChips > toCall;
  const canAllIn = playerChips > 0;

  // Preset sizes (expressed as total bet for the street)
  // Pot-sized raise in Texas Hold'em: Call amount + current total pot (including the call)
  const potAfterCall = totalPot + toCall;
  const halfPotRaise = highestBetOnTable + Math.round(potAfterCall * 0.5);
  const threeQuarterPotRaise = highestBetOnTable + Math.round(potAfterCall * 0.75);
  const fullPotRaise = highestBetOnTable + potAfterCall;

  const clampPreset = (target: number) => {
    if (target < minRaiseTotal) return minRaiseTotal;
    if (target > maxRaiseTotal) return maxRaiseTotal;
    return target;
  };

  return {
    canCheck,
    canCall,
    canRaise,
    canAllIn,
    callAmount,
    minRaiseTotal: Math.min(minRaiseTotal, maxRaiseTotal),
    maxRaiseTotal,
    halfPotRaiseTotal: clampPreset(halfPotRaise),
    threeQuarterPotRaiseTotal: clampPreset(threeQuarterPotRaise),
    potRaiseTotal: clampPreset(fullPotRaise)
  };
}

// ----------------- STREET SETTLEMENT -----------------

export interface StreetSeatState {
  folded: boolean;
  allIn: boolean;
  currentBet: number;
  hasActed?: boolean;
}

/**
 * A betting street is over when nobody who can still bet faces an unmatched bet and,
 * if two or more players can still bet, each of them has acted since the last raise.
 */
export function isStreetSettled(seats: StreetSeatState[], highestBet: number): boolean {
  const canAct = seats.filter(s => !s.folded && !s.allIn);
  if (canAct.length === 0) return true;
  if (canAct.some(s => s.currentBet < highestBet)) return false;
  return canAct.length === 1 || canAct.every(s => s.hasActed);
}
