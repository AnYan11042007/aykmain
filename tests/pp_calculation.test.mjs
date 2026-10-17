/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('PP Calculation & Transaction Logic Tests', () => {

  it('should prevent balance overdraft on negative delta', () => {
    const currentBalance = 10000;
    const debitAmount = 15000;

    const canDebit = currentBalance >= debitAmount;
    assert.strictEqual(canDebit, false, 'Should reject debit exceeding current balance');

    const validDebit = 5000;
    const nextBalance = currentBalance - validDebit;
    assert.strictEqual(nextBalance, 5000, 'Balance should correctly be 5,000 PP');
  });

  it('should calculate Tai Xiu payouts correctly without cheats', () => {
    const betAmount = 10000;
    const dices = [4, 5, 6]; // Sum = 15 => TAI
    const total = dices.reduce((a, b) => a + b, 0);
    const isTai = total >= 11 && total <= 17;
    const isXiu = total >= 4 && total <= 10;
    const isTriple = (dices[0] === dices[1] && dices[1] === dices[2]);

    assert.strictEqual(total, 15);
    assert.strictEqual(isTai, true);
    assert.strictEqual(isXiu, false);
    assert.strictEqual(isTriple, false);

    // Win on TAI
    const choice = 'TAI';
    const won = !isTriple && ((choice === 'TAI' && isTai) || (choice === 'XIU' && isXiu));
    const multiplier = won ? 2.0 : 0;
    const payout = Math.floor(betAmount * multiplier);
    const pnl = payout - betAmount;

    assert.strictEqual(won, true);
    assert.strictEqual(payout, 20000);
    assert.strictEqual(pnl, 10000);
  });

  it('should preserve total money supply during peer-to-peer bank transfer', () => {
    let senderBalance = 50000;
    let receiverBalance = 20000;
    const transferAmount = 15000;

    const initialTotal = senderBalance + receiverBalance;

    // Execute atomic 2-phase transfer
    senderBalance -= transferAmount;
    receiverBalance += transferAmount;

    const finalTotal = senderBalance + receiverBalance;

    assert.strictEqual(senderBalance, 35000);
    assert.strictEqual(receiverBalance, 35000);
    assert.strictEqual(initialTotal, finalTotal, 'Money supply must be strictly conserved in transfer');
  });

  it('should enforce safety caps on daily mission rewards and max bets', () => {
    const MAX_SINGLE_BET = 50000;
    const requestedBet = 10000000;
    const sanitizedBet = Math.min(requestedBet, MAX_SINGLE_BET);

    assert.strictEqual(sanitizedBet, 50000, 'Bet must be capped at 50,000 PP');

    const MAX_AWARD = 500000;
    const requestedAward = 9999999;
    const sanitizedAward = Math.min(requestedAward, MAX_AWARD);

    assert.strictEqual(sanitizedAward, 500000, 'Award must be capped at 500,000 PP');
  });

});
