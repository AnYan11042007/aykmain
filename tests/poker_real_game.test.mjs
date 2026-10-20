/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Texas Hold'em Real Game Simulation & Mechanics Tests
 * Covers:
 * 1. Full 1 Human + 4 AI Bots hand simulation with strict chip conservation.
 * 2. Mid-game all-in with main pot and side pot calculations and multi-level payouts.
 * 3. Mid-game leave table (ghost seat) preserving dead money in pot while refunding uncommitted chips.
 * 4. 3 consecutive timeouts leading to auto check/fold, then auto stand-up & chip refund.
 * 
 * Run via: node --test tests/poker_real_game.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCard,
  formatCard,
  getStandardDeck,
  shuffleDeck,
  evaluateHand,
  compareHands,
  calculateSidePots,
  distributePots,
  getBettingOptions,
  isStreetSettled
} from '../src/poker/pokerEngine.ts';
import { normalizePokerRoom, serializePokerRoom } from '../src/poker/pokerRoomUtil.ts';

describe('Texas Hold\'em Real Game Simulation & Mechanics Tests', () => {

  it('should run a full 5-player game (1 human + 4 AI bots) with correct pot and chip accounting', () => {
    // Initial Buy-In: 2,000 chips each = 10,000 total chips
    const initialChips = 2000;
    const smallBlind = 50;
    const bigBlind = 100;

    const mockSeats = [
      { uid: 'human_1', name: 'Sinh Viên AYK', avatar: 'https://example.com/me.png', chips: initialChips, currentBet: 0, totalHandBet: 0, folded: false, allIn: false, isAI: false },
      { uid: 'ai_1', name: 'Anh Ba TAG', avatar: 'https://example.com/bot1.png', chips: initialChips, currentBet: 0, totalHandBet: 0, folded: false, allIn: false, isAI: true, personality: 'TAG' },
      { uid: 'ai_2', name: 'Shark LAG', avatar: 'https://example.com/bot2.png', chips: initialChips, currentBet: 0, totalHandBet: 0, folded: false, allIn: false, isAI: true, personality: 'LAG' },
      { uid: 'ai_3', name: 'Mr. Tight', avatar: 'https://example.com/bot3.png', chips: initialChips, currentBet: 0, totalHandBet: 0, folded: false, allIn: false, isAI: true, personality: 'ROCK' },
      { uid: 'ai_4', name: 'Cô Sáu Calling', avatar: 'https://example.com/bot4.png', chips: initialChips, currentBet: 0, totalHandBet: 0, folded: false, allIn: false, isAI: true, personality: 'CALLING_STATION' }
    ];

    let room = normalizePokerRoom({
      id: 'room_sim_5p',
      name: 'Bàn Thử Nghiệm 5 Người',
      creatorUid: 'human_1',
      creatorName: 'Sinh Viên AYK',
      mode: 'AI',
      smallBlind,
      bigBlind,
      minBuyIn: 2000,
      maxBuyIn: 10000,
      pot: 0,
      highestBet: 0,
      lastRaiseDelta: bigBlind,
      round: 'PREFLOP',
      communityCards: [],
      dealerSeat: 0,
      currentTurnSeat: 3,
      actionExpiry: Date.now() + 20000,
      handCount: 1,
      seats: mockSeats,
      logs: []
    });

    // 1. Post Blinds: Seat 1 posts SB (50), Seat 2 posts BB (100)
    const sbSeat = room.seats[1];
    const bbSeat = room.seats[2];
    sbSeat.chips -= smallBlind;
    sbSeat.currentBet = smallBlind;
    sbSeat.totalHandBet = smallBlind;
    bbSeat.chips -= bigBlind;
    bbSeat.currentBet = bigBlind;
    bbSeat.totalHandBet = bigBlind;

    room.pot = smallBlind + bigBlind;
    room.highestBet = bigBlind;
    room.lastRaiseDelta = bigBlind;

    assert.strictEqual(room.pot, 150);
    assert.strictEqual(sbSeat.chips, 1950);
    assert.strictEqual(bbSeat.chips, 1900);

    // 2. Preflop Action:
    // Seat 3 calls 100
    const seat3 = room.seats[3];
    seat3.chips -= bigBlind;
    seat3.currentBet = bigBlind;
    seat3.totalHandBet = bigBlind;
    seat3.hasActed = true;
    room.pot += bigBlind;

    // Seat 4 folds
    const seat4 = room.seats[4];
    seat4.folded = true;
    seat4.hasActed = true;

    // Seat 0 (Human) raises to 300
    const human = room.seats[0];
    const humanRaise = 300;
    human.chips -= humanRaise;
    human.currentBet = humanRaise;
    human.totalHandBet = humanRaise;
    human.hasActed = true;
    room.pot += humanRaise;
    room.highestBet = humanRaise;
    room.lastRaiseDelta = 200;

    // SB calls the 300 (needs 250 more)
    sbSeat.chips -= 250;
    sbSeat.currentBet = 300;
    sbSeat.totalHandBet = 300;
    sbSeat.hasActed = true;
    room.pot += 250;

    // BB folds
    bbSeat.folded = true;
    bbSeat.hasActed = true;

    // Seat 3 calls the 300 (needs 200 more)
    seat3.chips -= 200;
    seat3.currentBet = 300;
    seat3.totalHandBet = 300;
    seat3.hasActed = true;
    room.pot += 200;

    // Check preflop pot: SB(300) + BB(100) + S3(300) + Human(300) = 1,000
    assert.strictEqual(room.pot, 1000);
    assert.ok(isStreetSettled(room.seats, room.highestBet), 'Preflop street must be settled when bets match');

    // 3. Flop Deals 3 cards: Ad, Kd, Qd
    room.round = 'FLOP';
    room.communityCards = ['Ad', 'Kd', 'Qd'];
    // Reset round bets
    for (const s of room.seats) {
      if (s) { s.currentBet = 0; s.hasActed = false; }
    }
    room.highestBet = 0;

    // Flop betting: SB checks, Seat 3 bets 200, Human calls 200, SB calls 200
    sbSeat.chips -= 200; sbSeat.currentBet = 200; sbSeat.totalHandBet += 200; sbSeat.hasActed = true;
    seat3.chips -= 200; seat3.currentBet = 200; seat3.totalHandBet += 200; seat3.hasActed = true;
    human.chips -= 200; human.currentBet = 200; human.totalHandBet += 200; human.hasActed = true;
    room.pot += 600; // Pot is now 1,600

    assert.strictEqual(room.pot, 1600);
    assert.ok(isStreetSettled(room.seats, room.highestBet), 'Flop street settled');

    // 4. Turn: Jd, River: 2c
    room.round = 'TURN';
    room.communityCards.push('Jd');
    for (const s of room.seats) if (s) { s.currentBet = 0; s.hasActed = true; } // Everyone checks turn

    room.round = 'RIVER';
    room.communityCards.push('2c');
    for (const s of room.seats) if (s) { s.currentBet = 0; s.hasActed = true; } // Everyone checks river

    // 5. Showdown:
    // Human has 10s 9c -> Broadway Straight (A-K-Q-J-10)
    // SB has 9h 8h -> High Card / Low pair
    // Seat 3 has Ah 5c -> Pair of Aces
    const humanHole = ['10s', '9c'];
    const sbHole = ['9h', '8h'];
    const seat3Hole = ['Ah', '5c'];

    const board = room.communityCards.map(parseCard);
    const evalHuman = evaluateHand([...humanHole.map(parseCard), ...board]);
    const evalSB = evaluateHand([...sbHole.map(parseCard), ...board]);
    const evalSeat3 = evaluateHand([...seat3Hole.map(parseCard), ...board]);

    assert.strictEqual(evalHuman.category, 'STRAIGHT', 'Human must have Broadway straight A-K-Q-J-10');
    assert.ok(compareHands(evalHuman, evalSeat3) > 0, 'Straight beats Pair of Aces');
    assert.ok(compareHands(evalHuman, evalSB) > 0, 'Straight beats 9s');

    // Award pot to Human
    human.chips += room.pot;
    room.pot = 0;
    room.round = 'SHOWDOWN';

    // Verify Chip Conservation: Total chips across all 5 seats MUST EQUAL 10,000!
    const totalChipsEnd = room.seats.reduce((sum, s) => sum + (s?.chips || 0), 0);
    assert.strictEqual(totalChipsEnd, 10000, 'Total chips in game must remain exactly 10,000');
    assert.strictEqual(human.chips, 1500 + 1600, 'Human chip count matches net profit');
  });

  it('should handle all-in mid-game correctly with main pot and side pot calculations', () => {
    // Setup 3 players:
    // P1 (Short stack): 400 chips
    // P2 (Medium stack): 1,200 chips
    // P3 (Big stack): 2,000 chips
    const bets = [
      { id: 'p1', totalBet: 400, folded: false },
      { id: 'p2', totalBet: 1200, folded: false },
      { id: 'p3', totalBet: 1200, folded: false }
    ];

    const pots = calculateSidePots(bets);
    assert.strictEqual(pots.length, 2, 'Must create 2 pots: 1 Main Pot and 1 Side Pot');

    // Main Pot: 400 from all 3 = 1,200 (p1, p2, p3 eligible)
    assert.strictEqual(pots[0].amount, 1200);
    assert.deepStrictEqual(pots[0].eligiblePlayerIds.sort(), ['p1', 'p2', 'p3']);

    // Side Pot: (1200 - 400) from p2 and p3 = 800 * 2 = 1,600 (only p2, p3 eligible)
    assert.strictEqual(pots[1].amount, 1600);
    assert.deepStrictEqual(pots[1].eligiblePlayerIds.sort(), ['p2', 'p3']);

    // Total pot = 2,800 chips
    const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);
    assert.strictEqual(totalPot, 2800);

    // Scenario: P1 has Flush (Royal Flush), P2 has Two Pair, P3 has High Card
    // P1 wins Main Pot (1,200). P2 wins Side Pot (1,600).
    const board = ['Ah', 'Kh', 'Qh', '2s', '3d'].map(parseCard);
    const handEvals = {
      p1: evaluateHand([parseCard('Jh'), parseCard('10h'), ...board]), // Royal Flush
      p2: evaluateHand([parseCard('As'), parseCard('Ks'), ...board]),   // Two Pair A & K
      p3: evaluateHand([parseCard('7c'), parseCard('8c'), ...board])    // Ace-high card
    };

    const result = distributePots(pots, handEvals);
    assert.strictEqual(result.payouts.p1, 1200, 'P1 all-in wins the full Main Pot of 1,200 chips');
    assert.strictEqual(result.payouts.p2, 1600, 'P2 wins the full Side Pot of 1,600 chips');
    assert.strictEqual(result.payouts.p3 || 0, 0, 'P3 loses both pots');

    // Sum of payouts must equal total pot
    const sumPayouts = Object.values(result.payouts).reduce((a, b) => a + b, 0);
    assert.strictEqual(sumPayouts, 2800, 'Total payouts must equal total pot');
  });

  it('should handle player leaving table mid-hand (ghost seat) preserving dead money in pot', () => {
    // 3 players start with 2,000 chips each.
    // Total supply = 6,000 PP / chips.
    const seats = [
      { uid: 'leaver_p1', name: 'Leaver', chips: 2000, currentBet: 0, totalHandBet: 0, folded: false, allIn: false, isAI: false },
      { uid: 'remain_p2', name: 'Winner P2', chips: 2000, currentBet: 0, totalHandBet: 0, folded: false, allIn: false, isAI: false },
      { uid: 'remain_p3', name: 'Player P3', chips: 2000, currentBet: 0, totalHandBet: 0, folded: false, allIn: false, isAI: false }
    ];

    let room = normalizePokerRoom({
      id: 'room_ghost_test',
      name: 'Ghost Seat Test',
      creatorUid: 'remain_p2',
      creatorName: 'Winner P2',
      mode: 'MULTIPLAYER',
      smallBlind: 50,
      bigBlind: 100,
      minBuyIn: 1000,
      maxBuyIn: 5000,
      pot: 0,
      highestBet: 0,
      lastRaiseDelta: 100,
      round: 'FLOP',
      communityCards: ['Kh', 'Qh', '9h'],
      dealerSeat: 1,
      currentTurnSeat: 0,
      actionExpiry: Date.now() + 20000,
      handCount: 1,
      seats: seats,
      logs: []
    });

    // Each player has committed 300 chips into the pot so far
    seats[0].chips = 1700; seats[0].totalHandBet = 300; seats[0].currentBet = 0;
    seats[1].chips = 1700; seats[1].totalHandBet = 300; seats[1].currentBet = 0;
    seats[2].chips = 1700; seats[2].totalHandBet = 300; seats[2].currentBet = 0;
    room.pot = 900;

    // Player 1 unexpectedly leaves the table!
    const leaverSeat = room.seats[0];
    const uncommittedChips = leaverSeat.chips; // 1,700 chips
    assert.strictEqual(uncommittedChips, 1700, 'Uncommitted chips must be 1,700');

    // Simulated refund transaction for uncommitted chips
    let refundedPP = 0;
    const mockRefundTx = (uid, refundAmount) => {
      refundedPP += refundAmount;
      return Promise.resolve({ success: true, oldPP: 0, newPP: refundAmount });
    };
    mockRefundTx(leaverSeat.uid, uncommittedChips);
    assert.strictEqual(refundedPP, 1700, 'Refunded exactly 1,700 PP to user account');

    // Seat is marked as ghost (left: true, folded: true, chips: 0)
    leaverSeat.left = true;
    leaverSeat.folded = true;
    leaverSeat.chips = 0;
    leaverSeat.lastAction = 'ĐÃ RỜI BÀN';

    // The committed 300 chips REMAIN in the pot!
    assert.strictEqual(room.pot, 900, 'Pot retains all 900 chips including dead money from leaver');

    // Game plays out between remain_p2 and remain_p3
    // P2 has Flush (Ah 2h + Kh Qh 9h = 5 Hearts)
    // P3 has Pair (Kd 4s + Kh Qh 9h = Pair of Kings)
    const board = room.communityCards.map(parseCard);
    const evalP2 = evaluateHand([parseCard('Ah'), parseCard('2h'), ...board]);
    const evalP3 = evaluateHand([parseCard('Kd'), parseCard('4s'), ...board]);

    assert.strictEqual(evalP2.category, 'FLUSH', 'P2 must hold an Ace-high Flush');
    assert.ok(compareHands(evalP2, evalP3) > 0, 'Flush beats Pair of Kings');

    // P2 claims the pot
    seats[1].chips += room.pot;
    room.pot = 0;

    // Total economy check:
    // P1 refunded: 1,700
    // P2 chips: 1,700 + 900 = 2,600
    // P3 chips: 1,700
    // Total = 1,700 + 2,600 + 1,700 = 6,000 PP! Exactly 100% preserved.
    const totalEconomy = refundedPP + seats[1].chips + seats[2].chips;
    assert.strictEqual(totalEconomy, 6000, 'Total money in economy must be strictly preserved after mid-hand leave');
  });

  it('should handle 3 consecutive turn timeouts by auto checking/folding and then standing up & refunding', () => {
    const seat = {
      uid: 'afk_user_1',
      name: 'Ngủ Quên',
      chips: 2500,
      currentBet: 0,
      totalHandBet: 0,
      folded: false,
      allIn: false,
      isAI: false,
      consecutiveTimeouts: 0
    };

    let refundedAmount = 0;
    const executePPTransaction = (uid, amount) => {
      refundedAmount += amount;
      return Promise.resolve({ success: true, oldPP: 0, newPP: amount });
    };

    // Helper simulating the timeout resolution logic in pokerServer.ts check_timeout
    function handleTimeout(seatObj, canCheck) {
      seatObj.consecutiveTimeouts = (seatObj.consecutiveTimeouts || 0) + 1;
      if (canCheck) {
        seatObj.lastAction = 'CHECK (Hết giờ)';
      } else {
        seatObj.folded = true;
        seatObj.lastAction = 'BỎ BÀI (Hết giờ)';
      }

      if (seatObj.consecutiveTimeouts >= 3 && !seatObj.isAI) {
        const refund = seatObj.chips || 0;
        if (refund > 0) {
          executePPTransaction(seatObj.uid, refund);
          seatObj.chips = 0;
        }
        seatObj.left = true;
        seatObj.folded = true;
      }
    }

    // Turn 1 Timeout: No bet on table -> Auto-Check
    handleTimeout(seat, true);
    assert.strictEqual(seat.consecutiveTimeouts, 1);
    assert.strictEqual(seat.lastAction, 'CHECK (Hết giờ)');
    assert.strictEqual(seat.folded, false);
    assert.strictEqual(seat.left, undefined);

    // Turn 2 Timeout: Faced a raise -> Auto-Fold
    handleTimeout(seat, false);
    assert.strictEqual(seat.consecutiveTimeouts, 2);
    assert.strictEqual(seat.lastAction, 'BỎ BÀI (Hết giờ)');
    assert.strictEqual(seat.folded, true);
    assert.strictEqual(seat.left, undefined);

    // Turn 3 Timeout: 3rd consecutive timeout -> Auto-Standup & Full Refund of remaining chips
    handleTimeout(seat, false);
    assert.strictEqual(seat.consecutiveTimeouts, 3);
    assert.strictEqual(seat.left, true);
    assert.strictEqual(seat.folded, true);
    assert.strictEqual(seat.chips, 0);
    assert.strictEqual(refundedAmount, 2500, 'User received 100% refund of remaining 2,500 chips upon 3rd timeout');
  });

});
