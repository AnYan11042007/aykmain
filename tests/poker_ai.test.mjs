/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Texas Hold'em AI & Simulation Tests
 * Run via: node --test tests/poker_ai.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCard } from '../src/poker/pokerEngine.ts';
import {
  evaluatePreflopScore,
  estimateEquityMonteCarlo,
  analyzeDrawPotential,
  calculateAIDecision
} from '../src/poker/pokerAI.ts';

describe('Texas Hold\'em AI & Simulation Tests', () => {

  it('should rank premium preflop hands higher than trash', () => {
    const pocketAces = evaluatePreflopScore(parseCard('As'), parseCard('Ah'));
    const pocketKings = evaluatePreflopScore(parseCard('Ks'), parseCard('Kh'));
    const aceKingSuited = evaluatePreflopScore(parseCard('As'), parseCard('Ks'));
    const sevenTwoOffsuit = evaluatePreflopScore(parseCard('7s'), parseCard('2h'));

    assert.ok(pocketAces > pocketKings, 'AA must score higher than KK');
    assert.ok(pocketKings > aceKingSuited, 'KK must score higher than AKs');
    assert.ok(aceKingSuited > sevenTwoOffsuit, 'AKs must score higher than 72o');
    assert.ok(sevenTwoOffsuit < 0.25, '72o is trash preflop');
    assert.ok(pocketAces > 0.85, 'AA is top tier preflop');
  });

  it('should run 2,000 Monte Carlo rollouts and calculate equity accurately', () => {
    // Pocket Aces preflop vs 1 random opponent
    const aces = [parseCard('As'), parseCard('Ah')];
    const emptyBoard = [];

    const result = estimateEquityMonteCarlo(aces, emptyBoard, 1, 2000);

    // AA vs 1 random hand has ~85% equity
    assert.ok(result.equity >= 0.75 && result.equity <= 0.95, `Expected AA equity around 85%, got ${(result.equity * 100).toFixed(1)}%`);
    assert.ok(Math.abs((result.winRate + result.tieRate) - result.equity) < 1e-9);

    // Nut flush on river vs 1 opponent -> 100% equity
    const holeNutFlush = [parseCard('As'), parseCard('Ks')];
    const boardFourSpades = [parseCard('Qs'), parseCard('Js'), parseCard('2s'), parseCard('8d'), parseCard('3c')];
    const riverResult = estimateEquityMonteCarlo(holeNutFlush, boardFourSpades, 1, 100);
    assert.strictEqual(riverResult.equity, 1.0, 'Ace-high flush on this board must have 100% equity');
  });

  it('should analyze flush draws and straight draws on the flop', () => {
    // 2 spades in hand + 2 spades on board = 4 spades (Flush draw, 9 outs)
    const hole = [parseCard('As'), parseCard('8s')];
    const board = [parseCard('Ks'), parseCard('4s'), parseCard('2d')];

    const draws = analyzeDrawPotential(hole, board);
    assert.strictEqual(draws.isFlushDraw, true);
    assert.ok(draws.drawOuts >= 9, 'Flush draw gives at least 9 outs');

    // Open-ended straight draw: 5, 6 in hand, 7, 8 on board (needs 4 or 9 = 8 outs)
    const oesdHole = [parseCard('5h'), parseCard('6c')];
    const oesdBoard = [parseCard('7d'), parseCard('8s'), parseCard('Kh')];
    const oesdDraws = analyzeDrawPotential(oesdHole, oesdBoard);
    assert.strictEqual(oesdDraws.isOpenEndedStraightDraw, true);
    assert.strictEqual(oesdDraws.drawOuts, 8);
  });

  it('should make sound AI decisions for TAG and LAG personalities', () => {
    const mockRoom = {
      id: 'PK_TEST',
      name: 'BÀN TEST',
      mode: 'AI',
      creator: 'user_1',
      creatorName: 'User',
      bigBlind: 100,
      smallBlind: 50,
      minBuyIn: 2000,
      maxBuyIn: 10000,
      status: 'PLAYING',
      round: 'PREFLOP',
      seats: [
        {
          seatIndex: 0,
          uid: 'user_1',
          name: 'Player',
          avatar: '',
          chips: 5000,
          currentBet: 100,
          totalHandBet: 100,
          folded: false,
          allIn: false,
          isAI: false
        },
        {
          seatIndex: 1,
          uid: 'ai_1',
          name: 'Minh_Dev',
          avatar: '',
          chips: 5000,
          currentBet: 50,
          totalHandBet: 50,
          folded: false,
          allIn: false,
          isAI: true,
          personality: 'TAG'
        }
      ],
      dealerSeat: 0,
      currentTurnSeat: 1,
      pot: 150,
      highestBet: 100,
      lastRaiseDelta: 50,
      board: [],
      actionExpiry: Date.now() + 20000
    };

    // AI has 7-2 offsuit in SB facing a raise
    const weakHole = [parseCard('7s'), parseCard('2h')];
    const weakDecision = calculateAIDecision({
      seat: mockRoom.seats[1],
      holeCards: weakHole,
      room: mockRoom
    });

    assert.strictEqual(weakDecision.action, 'FOLD', 'TAG bot should fold 72o facing raise');

    // AI has A-A in SB facing a raise
    const strongHole = [parseCard('As'), parseCard('Ah')];
    const strongDecision = calculateAIDecision({
      seat: mockRoom.seats[1],
      holeCards: strongHole,
      room: mockRoom
    });

    assert.ok(strongDecision.action === 'RAISE' || strongDecision.action === 'CALL', 'AA must raise or call preflop');
  });

  it('should adjust bot decision making based on difficulty levels (EASY vs NORMAL vs HARD)', () => {
    const mockRoom = {
      id: 'PK_DIFF_TEST',
      name: 'BÀN TEST ĐỘ KHÓ',
      mode: 'AI',
      creator: 'user_1',
      creatorName: 'User',
      bigBlind: 100,
      smallBlind: 50,
      minBuyIn: 2000,
      maxBuyIn: 10000,
      status: 'PLAYING',
      round: 'PREFLOP',
      seats: [
        {
          seatIndex: 0,
          uid: 'user_1',
          name: 'Player',
          avatar: '',
          chips: 5000,
          currentBet: 100,
          totalHandBet: 100,
          folded: false,
          allIn: false,
          isAI: false
        },
        {
          seatIndex: 1,
          uid: 'ai_1',
          name: 'Bot_Test',
          avatar: '',
          chips: 5000,
          currentBet: 50,
          totalHandBet: 50,
          folded: false,
          allIn: false,
          isAI: true,
          personality: 'TAG'
        }
      ],
      dealerSeat: 0,
      currentTurnSeat: 1,
      pot: 150,
      highestBet: 100,
      lastRaiseDelta: 50,
      board: [],
      actionExpiry: Date.now() + 20000
    };

    // Marginal preflop hand: 9s 4d
    const marginalHole = [parseCard('9s'), parseCard('4d')];

    // EASY bot: loose and sticky, calls small bet with marginal cards
    const easyDecision = calculateAIDecision({
      seat: mockRoom.seats[1],
      holeCards: marginalHole,
      room: mockRoom,
      difficulty: 'EASY'
    });
    assert.strictEqual(easyDecision.action, 'CALL', 'EASY bot should call small raise with marginal hand');

    // NORMAL bot with TAG personality: folds marginal hand facing raise
    const normalDecision = calculateAIDecision({
      seat: mockRoom.seats[1],
      holeCards: marginalHole,
      room: mockRoom,
      difficulty: 'NORMAL'
    });
    assert.strictEqual(normalDecision.action, 'FOLD', 'NORMAL TAG bot should fold marginal hand facing raise');

    // HARD bot: also folds marginal hand facing raise
    const hardDecision = calculateAIDecision({
      seat: mockRoom.seats[1],
      holeCards: marginalHole,
      room: mockRoom,
      difficulty: 'HARD'
    });
    assert.strictEqual(hardDecision.action, 'FOLD', 'HARD bot should fold marginal hand facing raise');
  });

});
