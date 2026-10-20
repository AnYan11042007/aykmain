/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Texas Hold'em Poker Pure Engine Tests
 * Run via: node --test tests/poker_engine.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCard,
  formatCard,
  getStandardDeck,
  shuffleDeck,
  evaluate5Cards,
  evaluateHand,
  compareHands,
  calculateSidePots,
  distributePots,
  getBettingOptions,
  HAND_NAMES_VI
} from '../src/poker/pokerEngine.ts';

describe('Texas Hold\'em Poker Pure Engine Tests', () => {

  it('should parse and format cards correctly', () => {
    const c1 = parseCard('Ah');
    assert.strictEqual(c1.rank, 14);
    assert.strictEqual(c1.suit, 'h');
    assert.strictEqual(formatCard(c1), 'Ah');

    const c2 = parseCard('10s');
    assert.strictEqual(c2.rank, 10);
    assert.strictEqual(c2.suit, 's');
    assert.strictEqual(formatCard(c2), '10s');

    const c3 = parseCard('2c');
    assert.strictEqual(c3.rank, 2);
    assert.strictEqual(c3.suit, 'c');
  });

  it('should generate a standard 52-card deck and shuffle without duplication', () => {
    const deck = getStandardDeck();
    assert.strictEqual(deck.length, 52);

    const shuffled = shuffleDeck(deck);
    assert.strictEqual(shuffled.length, 52);

    const uniqueSet = new Set(shuffled.map(formatCard));
    assert.strictEqual(uniqueSet.size, 52);
  });

  it('should evaluate all 10 hand categories matching Demo 2 table', () => {
    // 1. Royal Flush
    const rf = evaluate5Cards(['10s', 'Js', 'Qs', 'Ks', 'As'].map(parseCard));
    assert.strictEqual(rf.category, 'ROYAL_FLUSH');
    assert.strictEqual(rf.categoryRank, 1);
    assert.strictEqual(rf.nameVi, HAND_NAMES_VI.ROYAL_FLUSH);

    // 2. Straight Flush
    const sf = evaluate5Cards(['5c', '6c', '7c', '8c', '9c'].map(parseCard));
    assert.strictEqual(sf.category, 'STRAIGHT_FLUSH');
    assert.strictEqual(sf.categoryRank, 2);

    // 3. Four of a kind
    const quads = evaluate5Cards(['As', 'Ac', 'Ah', 'Ad', '8s'].map(parseCard));
    assert.strictEqual(quads.category, 'FOUR_OF_A_KIND');
    assert.strictEqual(quads.categoryRank, 3);

    // 4. Full house
    const fh = evaluate5Cards(['Ks', 'Kh', 'Kd', '10s', '10d'].map(parseCard));
    assert.strictEqual(fh.category, 'FULL_HOUSE');
    assert.strictEqual(fh.categoryRank, 4);

    // 5. Flush
    const flush = evaluate5Cards(['Qs', '8s', '6s', '4s', '2s'].map(parseCard));
    assert.strictEqual(flush.category, 'FLUSH');
    assert.strictEqual(flush.categoryRank, 5);

    // 6. Straight (regular)
    const straight = evaluate5Cards(['2d', '3c', '4s', '5d', '6c'].map(parseCard));
    assert.strictEqual(straight.category, 'STRAIGHT');
    assert.strictEqual(straight.categoryRank, 6);

    // 7. Three of a kind
    const trips = evaluate5Cards(['Jd', 'Jc', 'Js', '5h', '8s'].map(parseCard));
    assert.strictEqual(trips.category, 'THREE_OF_A_KIND');
    assert.strictEqual(trips.categoryRank, 7);

    // 8. Two pair
    const tp = evaluate5Cards(['6c', '6s', '10s', '10d', 'Ks'].map(parseCard));
    assert.strictEqual(tp.category, 'TWO_PAIR');
    assert.strictEqual(tp.categoryRank, 8);

    // 9. One pair
    const pair = evaluate5Cards(['Ah', 'Ac', '2s', '6d', '9s'].map(parseCard));
    assert.strictEqual(pair.category, 'ONE_PAIR');
    assert.strictEqual(pair.categoryRank, 9);

    // 10. High card
    const high = evaluate5Cards(['Kh', 'Js', '8d', '6s', '3c'].map(parseCard));
    assert.strictEqual(high.category, 'HIGH_CARD');
    assert.strictEqual(high.categoryRank, 10);
  });

  it('should rank hands strictly in hierarchical order', () => {
    const rf = evaluate5Cards(['10s', 'Js', 'Qs', 'Ks', 'As'].map(parseCard));
    const sf = evaluate5Cards(['5c', '6c', '7c', '8c', '9c'].map(parseCard));
    const quads = evaluate5Cards(['As', 'Ac', 'Ah', 'Ad', '8s'].map(parseCard));
    const fh = evaluate5Cards(['Ks', 'Kh', 'Kd', '10s', '10d'].map(parseCard));
    const flush = evaluate5Cards(['Qs', '8s', '6s', '4s', '2s'].map(parseCard));
    const straight = evaluate5Cards(['2d', '3c', '4s', '5d', '6c'].map(parseCard));
    const trips = evaluate5Cards(['Jd', 'Jc', 'Js', '5h', '8s'].map(parseCard));
    const tp = evaluate5Cards(['6c', '6s', '10s', '10d', 'Ks'].map(parseCard));
    const pair = evaluate5Cards(['Ah', 'Ac', '2s', '6d', '9s'].map(parseCard));
    const high = evaluate5Cards(['Kh', 'Js', '8d', '6s', '3c'].map(parseCard));

    assert.ok(compareHands(rf, sf) > 0);
    assert.ok(compareHands(sf, quads) > 0);
    assert.ok(compareHands(quads, fh) > 0);
    assert.ok(compareHands(fh, flush) > 0);
    assert.ok(compareHands(flush, straight) > 0);
    assert.ok(compareHands(straight, trips) > 0);
    assert.ok(compareHands(trips, tp) > 0);
    assert.ok(compareHands(tp, pair) > 0);
    assert.ok(compareHands(pair, high) > 0);
  });

  it('should handle wheel straight (A-2-3-4-5) correctly vs higher straights', () => {
    const wheel = evaluate5Cards(['As', '2h', '3d', '4c', '5s'].map(parseCard));
    const sixHighStraight = evaluate5Cards(['2d', '3c', '4s', '5d', '6c'].map(parseCard));

    assert.strictEqual(wheel.category, 'STRAIGHT');
    assert.strictEqual(wheel.tiebreakers[0], 5); // 5-high straight
    assert.ok(compareHands(sixHighStraight, wheel) > 0, '6-high straight must beat 5-high wheel straight');
  });

  it('should compare kickers accurately for same category', () => {
    // Pair of Kings with Ace kicker vs Pair of Kings with Queen kicker
    const pairK_A = evaluate5Cards(['Ks', 'Kd', 'Ah', '8c', '2s'].map(parseCard));
    const pairK_Q = evaluate5Cards(['Kc', 'Kh', 'Qd', '8s', '2h'].map(parseCard));

    assert.strictEqual(pairK_A.category, 'ONE_PAIR');
    assert.strictEqual(pairK_Q.category, 'ONE_PAIR');
    assert.ok(compareHands(pairK_A, pairK_Q) > 0, 'Ace kicker beats Queen kicker');

    // Two pair tie with kicker
    const tp_A = evaluate5Cards(['Ah', 'Ad', 'Kh', 'Kd', 'Qs'].map(parseCard));
    const tp_J = evaluate5Cards(['As', 'Ac', 'Ks', 'Kc', 'Jd'].map(parseCard));
    assert.ok(compareHands(tp_A, tp_J) > 0, 'Queen kicker beats Jack kicker on identical two pairs');

    // Identical hands (split)
    const hand1 = evaluate5Cards(['As', 'Kh', 'Qd', 'Jc', '9s'].map(parseCard));
    const hand2 = evaluate5Cards(['Ah', 'Ks', 'Qc', 'Jd', '9h'].map(parseCard));
    assert.strictEqual(compareHands(hand1, hand2), 0, 'Identical ranks must tie');
  });

  it('should select best 5 of 7 cards', () => {
    // Hole cards: Ks, Kh (Pair of Kings)
    // Board: 8c, 3s, Jd, Kd, 4s (contains a King -> Three of a kind)
    const sevenCards = ['Ks', 'Kh', '8c', '3s', 'Jd', 'Kd', '4s'].map(parseCard);
    const ev = evaluateHand(sevenCards);

    assert.strictEqual(ev.category, 'THREE_OF_A_KIND');
    assert.strictEqual(ev.tiebreakers[0], 13); // Kings
    assert.strictEqual(ev.best5.length, 5);
  });

  it('should calculate side pots correctly for multi-way all-in scenarios', () => {
    // Scenario:
    // P1: all-in 100
    // P2: all-in 200
    // P3: calls 300
    // P4: folds after betting 50
    const players = [
      { id: 'P1', totalBet: 100, folded: false },
      { id: 'P2', totalBet: 200, folded: false },
      { id: 'P3', totalBet: 300, folded: false },
      { id: 'P4', totalBet: 50, folded: true },
    ];

    const pots = calculateSidePots(players);

    // Levels: 50, 100, 200, 300
    // Total money: 100 + 200 + 300 + 50 = 650
    const totalInPots = pots.reduce((sum, p) => sum + p.amount, 0);
    assert.strictEqual(totalInPots, 650, 'Total pot money must match sum of all bets');

    // P4 is folded so never in eligiblePlayerIds
    pots.forEach(p => {
      assert.strictEqual(p.eligiblePlayerIds.includes('P4'), false, 'Folded player must not be eligible');
    });

    // P1 is only eligible up to 100
    const lastPotWithP1 = pots.filter(p => p.eligiblePlayerIds.includes('P1'));
    assert.ok(lastPotWithP1.length > 0);

    // Highest side pot should only be eligible for P3 (or P2 & P3)
    const topPot = pots[pots.length - 1];
    assert.deepStrictEqual(topPot.eligiblePlayerIds, ['P3']);
  });

  it('should distribute side pots and split remainder chips correctly', () => {
    const pots = [
      { amount: 300, eligiblePlayerIds: ['P1', 'P2'] },
      { amount: 200, eligiblePlayerIds: ['P2', 'P3'] }
    ];

    // P1 has Full House (beats P2's Flush)
    // P2 has Flush (beats P3's Two Pair)
    const handEvals = {
      P1: evaluate5Cards(['Ks', 'Kh', 'Kd', '10s', '10d'].map(parseCard)),
      P2: evaluate5Cards(['Qs', '8s', '6s', '4s', '2s'].map(parseCard)),
      P3: evaluate5Cards(['6c', '6s', '10s', '10d', 'Ks'].map(parseCard)),
    };

    const result = distributePots(pots, handEvals);

    // Pot 1 (300): P1 beats P2 -> P1 gets 300
    // Pot 2 (200): P2 beats P3 -> P2 gets 200
    assert.strictEqual(result.payouts['P1'], 300);
    assert.strictEqual(result.payouts['P2'], 200);
    assert.strictEqual(result.payouts['P3'] || 0, 0);
  });

  it('should enforce betting mechanics: check, call, min-raise, presets, and all-in', () => {
    // Blind 50 / 100. Table highest bet is 200 (BB raised to 200, last raise delta = 100).
    // Player has 500 chips, bet 50 so far. Total pot = 450.
    const opts = getBettingOptions({
      playerChips: 500,
      playerCurrentBet: 50,
      highestBetOnTable: 200,
      lastRaiseDelta: 100,
      bigBlind: 100,
      totalPot: 450
    });

    assert.strictEqual(opts.canCheck, false, 'Must call 150, cannot check');
    assert.strictEqual(opts.canCall, true);
    assert.strictEqual(opts.callAmount, 150);

    // Min raise total = highestBet (200) + max(BB, lastRaiseDelta) (100) = 300
    assert.strictEqual(opts.minRaiseTotal, 300);

    // Max raise total = current bet (50) + chips (500) = 550 (All-in)
    assert.strictEqual(opts.maxRaiseTotal, 550);
    assert.strictEqual(opts.canRaise, true);

    // Preset calculations
    assert.ok(opts.halfPotRaiseTotal >= opts.minRaiseTotal);
    assert.ok(opts.potRaiseTotal <= opts.maxRaiseTotal);
  });

});
