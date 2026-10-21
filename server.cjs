var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express2 = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto2 = __toESM(require("crypto"), 1);
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_app = require("firebase/app");
var import_database2 = require("firebase/database");
var import_app2 = require("firebase-admin/app");
var import_database3 = require("firebase-admin/database");

// src/poker/pokerServer.ts
var import_express = __toESM(require("express"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_database = require("firebase/database");

// src/poker/pokerEngine.ts
var HAND_CATEGORY_RANKS = {
  ROYAL_FLUSH: 10,
  STRAIGHT_FLUSH: 9,
  FOUR_OF_A_KIND: 8,
  FULL_HOUSE: 7,
  FLUSH: 6,
  STRAIGHT: 5,
  THREE_OF_A_KIND: 4,
  TWO_PAIR: 3,
  ONE_PAIR: 2,
  HIGH_CARD: 1
};
var HAND_NAMES_VI = {
  ROYAL_FLUSH: "Th\xF9ng ph\xE1 s\u1EA3nh Ho\xE0ng gia",
  STRAIGHT_FLUSH: "Th\xF9ng ph\xE1 s\u1EA3nh",
  FOUR_OF_A_KIND: "T\u1EE9 qu\xFD",
  FULL_HOUSE: "C\xF9 l\u0169",
  FLUSH: "Th\xF9ng",
  STRAIGHT: "S\u1EA3nh",
  THREE_OF_A_KIND: "S\xE1m c\xF4",
  TWO_PAIR: "Th\xFA (Hai \u0111\xF4i)",
  ONE_PAIR: "\u0110\xF4i",
  HIGH_CARD: "M\u1EADu th\u1EA7u"
};
var HAND_NAMES_EN = {
  ROYAL_FLUSH: "ROYAL FLUSH",
  STRAIGHT_FLUSH: "STRAIGHT FLUSH",
  FOUR_OF_A_KIND: "FOUR OF A KIND",
  FULL_HOUSE: "FULL HOUSE",
  FLUSH: "FLUSH",
  STRAIGHT: "STRAIGHT",
  THREE_OF_A_KIND: "THREE OF A KIND",
  TWO_PAIR: "TWO PAIR",
  ONE_PAIR: "ONE PAIR",
  HIGH_CARD: "HIGH CARD"
};
var RANK_NAMES = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A"
};
function parseCard(cardStr) {
  const clean = cardStr.trim();
  const suitChar = clean.slice(-1).toLowerCase();
  const rankStr = clean.slice(0, -1).toUpperCase();
  let rank;
  if (rankStr === "A") rank = 14;
  else if (rankStr === "K") rank = 13;
  else if (rankStr === "Q") rank = 12;
  else if (rankStr === "J") rank = 11;
  else {
    const num = parseInt(rankStr, 10);
    if (isNaN(num) || num < 2 || num > 10) throw new Error(`Invalid rank in card string: ${cardStr}`);
    rank = num;
  }
  if (!["c", "d", "h", "s"].includes(suitChar)) {
    throw new Error(`Invalid suit in card string: ${cardStr}`);
  }
  return { suit: suitChar, rank };
}
function formatCard(card) {
  return `${RANK_NAMES[card.rank]}${card.suit}`;
}
function getStandardDeck() {
  const suits = ["s", "h", "d", "c"];
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const deck = [];
  for (const s of suits) {
    for (const r of ranks) {
      deck.push({ suit: s, rank: r });
    }
  }
  return deck;
}
function shuffleDeck(deck, rng = Math.random) {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}
function evaluate5Cards(cards) {
  if (cards.length !== 5) {
    throw new Error("evaluate5Cards expects exactly 5 cards");
  }
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map((c) => c.rank);
  const suits = sorted.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);
  let isStraight = false;
  let straightHighRank = 0;
  if (ranks[0] - ranks[1] === 1 && ranks[1] - ranks[2] === 1 && ranks[2] - ranks[3] === 1 && ranks[3] - ranks[4] === 1) {
    isStraight = true;
    straightHighRank = ranks[0];
  } else if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
    isStraight = true;
    straightHighRank = 5;
  }
  const counts = {};
  for (const r of ranks) {
    counts[r] = (counts[r] || 0) + 1;
  }
  const groups = Object.entries(counts).map(([rStr, count]) => ({
    rank: parseInt(rStr, 10),
    count
  }));
  groups.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.rank - a.rank;
  });
  const calcScore = (catRank, tiebreakers2) => {
    let score = catRank * 1e10;
    const weights = [1e8, 1e6, 1e4, 100, 1];
    for (let i = 0; i < tiebreakers2.length; i++) {
      score += (tiebreakers2[i] || 0) * (weights[i] || 0);
    }
    return score;
  };
  if (isFlush && isStraight) {
    if (straightHighRank === 14) {
      const tiebreakers2 = [14, 13, 12, 11, 10];
      return {
        category: "ROYAL_FLUSH",
        categoryRank: 1,
        nameVi: HAND_NAMES_VI.ROYAL_FLUSH,
        nameEn: HAND_NAMES_EN.ROYAL_FLUSH,
        shortDesc: "Th\xF9ng ph\xE1 s\u1EA3nh Ho\xE0ng gia",
        best5: sorted,
        tiebreakers: tiebreakers2,
        score: calcScore(HAND_CATEGORY_RANKS.ROYAL_FLUSH, tiebreakers2)
      };
    } else {
      const tiebreakers2 = [straightHighRank];
      return {
        category: "STRAIGHT_FLUSH",
        categoryRank: 2,
        nameVi: HAND_NAMES_VI.STRAIGHT_FLUSH,
        nameEn: HAND_NAMES_EN.STRAIGHT_FLUSH,
        shortDesc: `Th\xF9ng ph\xE1 s\u1EA3nh ${RANK_NAMES[straightHighRank]}`,
        best5: sorted,
        tiebreakers: tiebreakers2,
        score: calcScore(HAND_CATEGORY_RANKS.STRAIGHT_FLUSH, tiebreakers2)
      };
    }
  }
  if (groups[0].count === 4) {
    const quadRank = groups[0].rank;
    const kicker = groups[1].rank;
    const tiebreakers2 = [quadRank, kicker];
    return {
      category: "FOUR_OF_A_KIND",
      categoryRank: 3,
      nameVi: HAND_NAMES_VI.FOUR_OF_A_KIND,
      nameEn: HAND_NAMES_EN.FOUR_OF_A_KIND,
      shortDesc: `T\u1EE9 qu\xFD ${RANK_NAMES[quadRank]}`,
      best5: sorted,
      tiebreakers: tiebreakers2,
      score: calcScore(HAND_CATEGORY_RANKS.FOUR_OF_A_KIND, tiebreakers2)
    };
  }
  if (groups[0].count === 3 && groups[1].count === 2) {
    const tripRank = groups[0].rank;
    const pairRank = groups[1].rank;
    const tiebreakers2 = [tripRank, pairRank];
    return {
      category: "FULL_HOUSE",
      categoryRank: 4,
      nameVi: HAND_NAMES_VI.FULL_HOUSE,
      nameEn: HAND_NAMES_EN.FULL_HOUSE,
      shortDesc: `C\xF9 l\u0169 ${RANK_NAMES[tripRank]} qua ${RANK_NAMES[pairRank]}`,
      best5: sorted,
      tiebreakers: tiebreakers2,
      score: calcScore(HAND_CATEGORY_RANKS.FULL_HOUSE, tiebreakers2)
    };
  }
  if (isFlush) {
    const tiebreakers2 = ranks;
    return {
      category: "FLUSH",
      categoryRank: 5,
      nameVi: HAND_NAMES_VI.FLUSH,
      nameEn: HAND_NAMES_EN.FLUSH,
      shortDesc: `Th\xF9ng (${RANK_NAMES[ranks[0]]} cao)`,
      best5: sorted,
      tiebreakers: tiebreakers2,
      score: calcScore(HAND_CATEGORY_RANKS.FLUSH, tiebreakers2)
    };
  }
  if (isStraight) {
    const tiebreakers2 = [straightHighRank];
    return {
      category: "STRAIGHT",
      categoryRank: 6,
      nameVi: HAND_NAMES_VI.STRAIGHT,
      nameEn: HAND_NAMES_EN.STRAIGHT,
      shortDesc: `S\u1EA3nh (${RANK_NAMES[straightHighRank]} cao)`,
      best5: sorted,
      tiebreakers: tiebreakers2,
      score: calcScore(HAND_CATEGORY_RANKS.STRAIGHT, tiebreakers2)
    };
  }
  if (groups[0].count === 3) {
    const tripRank = groups[0].rank;
    const kickers = groups.slice(1).map((g) => g.rank).sort((a, b) => b - a);
    const tiebreakers2 = [tripRank, ...kickers];
    return {
      category: "THREE_OF_A_KIND",
      categoryRank: 7,
      nameVi: HAND_NAMES_VI.THREE_OF_A_KIND,
      nameEn: HAND_NAMES_EN.THREE_OF_A_KIND,
      shortDesc: `S\xE1m c\xF4 ${RANK_NAMES[tripRank]}`,
      best5: sorted,
      tiebreakers: tiebreakers2,
      score: calcScore(HAND_CATEGORY_RANKS.THREE_OF_A_KIND, tiebreakers2)
    };
  }
  if (groups[0].count === 2 && groups[1].count === 2) {
    const highPair = Math.max(groups[0].rank, groups[1].rank);
    const lowPair = Math.min(groups[0].rank, groups[1].rank);
    const kicker = groups[2].rank;
    const tiebreakers2 = [highPair, lowPair, kicker];
    return {
      category: "TWO_PAIR",
      categoryRank: 8,
      nameVi: HAND_NAMES_VI.TWO_PAIR,
      nameEn: HAND_NAMES_EN.TWO_PAIR,
      shortDesc: `Th\xFA (\u0110\xF4i ${RANK_NAMES[highPair]} & \u0110\xF4i ${RANK_NAMES[lowPair]})`,
      best5: sorted,
      tiebreakers: tiebreakers2,
      score: calcScore(HAND_CATEGORY_RANKS.TWO_PAIR, tiebreakers2)
    };
  }
  if (groups[0].count === 2) {
    const pairRank = groups[0].rank;
    const kickers = groups.slice(1).map((g) => g.rank).sort((a, b) => b - a);
    const tiebreakers2 = [pairRank, ...kickers];
    return {
      category: "ONE_PAIR",
      categoryRank: 9,
      nameVi: HAND_NAMES_VI.ONE_PAIR,
      nameEn: HAND_NAMES_EN.ONE_PAIR,
      shortDesc: `\u0110\xF4i ${RANK_NAMES[pairRank]}`,
      best5: sorted,
      tiebreakers: tiebreakers2,
      score: calcScore(HAND_CATEGORY_RANKS.ONE_PAIR, tiebreakers2)
    };
  }
  const tiebreakers = ranks;
  return {
    category: "HIGH_CARD",
    categoryRank: 10,
    nameVi: HAND_NAMES_VI.HIGH_CARD,
    nameEn: HAND_NAMES_EN.HIGH_CARD,
    shortDesc: `M\u1EADu th\u1EA7u (${RANK_NAMES[ranks[0]]} cao)`,
    best5: sorted,
    tiebreakers,
    score: calcScore(HAND_CATEGORY_RANKS.HIGH_CARD, tiebreakers)
  };
}
function evaluateHand(cards) {
  if (cards.length < 5) {
    throw new Error(`evaluateHand requires at least 5 cards, got ${cards.length}`);
  }
  if (cards.length === 5) {
    return evaluate5Cards(cards);
  }
  const combos = [];
  const n = cards.length;
  function generateCombinations(start, currentCombo) {
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
  let bestEval = null;
  for (const combo of combos) {
    const ev = evaluate5Cards(combo);
    if (!bestEval || ev.score > bestEval.score) {
      bestEval = ev;
    }
  }
  return bestEval;
}
function calculateSidePots(players) {
  const contributors = players.filter((p) => p.totalBet > 0);
  if (contributors.length === 0) return [];
  const betLevels = Array.from(new Set(contributors.map((p) => p.totalBet))).sort((a, b) => a - b);
  const pots = [];
  let previousLevel = 0;
  for (const level of betLevels) {
    const incrementalBet = level - previousLevel;
    if (incrementalBet <= 0) continue;
    const contributorsToSlice = contributors.filter((p) => p.totalBet >= level);
    const tierAmount = incrementalBet * contributorsToSlice.length;
    const eligiblePlayerIds = contributorsToSlice.filter((p) => !p.folded).map((p) => p.id);
    if (tierAmount > 0 && eligiblePlayerIds.length > 0) {
      pots.push({
        amount: tierAmount,
        eligiblePlayerIds
      });
    } else if (tierAmount > 0 && eligiblePlayerIds.length === 0) {
      if (pots.length > 0) {
        pots[pots.length - 1].amount += tierAmount;
      }
    }
    previousLevel = level;
  }
  return pots;
}
function distributePots(pots, handEvaluations) {
  const payouts = {};
  const winnerSummary = /* @__PURE__ */ new Map();
  for (const pot of pots) {
    if (pot.amount <= 0 || pot.eligiblePlayerIds.length === 0) continue;
    const eligible = pot.eligiblePlayerIds.filter((id) => !!handEvaluations[id]);
    if (eligible.length === 0) {
      const share = Math.floor(pot.amount / pot.eligiblePlayerIds.length);
      pot.eligiblePlayerIds.forEach((id) => {
        payouts[id] = (payouts[id] || 0) + share;
      });
      continue;
    }
    let maxScore = -1;
    for (const id of eligible) {
      const score = handEvaluations[id].score;
      if (score > maxScore) {
        maxScore = score;
      }
    }
    const tierWinners = eligible.filter((id) => handEvaluations[id].score === maxScore);
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
function getBettingOptions(params) {
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
  const maxRaiseTotal = playerCurrentBet + playerChips;
  const canRaise = maxRaiseTotal >= minRaiseTotal && playerChips > toCall;
  const canAllIn = playerChips > 0;
  const potAfterCall = totalPot + toCall;
  const halfPotRaise = highestBetOnTable + Math.round(potAfterCall * 0.5);
  const threeQuarterPotRaise = highestBetOnTable + Math.round(potAfterCall * 0.75);
  const fullPotRaise = highestBetOnTable + potAfterCall;
  const clampPreset = (target) => {
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
function isStreetSettled(seats, highestBet) {
  const canAct = seats.filter((s) => !s.folded && !s.allIn);
  if (canAct.length === 0) return true;
  if (canAct.some((s) => s.currentBet < highestBet)) return false;
  return canAct.length === 1 || canAct.every((s) => s.hasActed);
}

// src/poker/pokerRoomUtil.ts
var POKER_SEAT_COUNT = 5;
function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") return Object.values(v);
  return [];
}
function normalizePokerRoom(raw) {
  if (!raw) return raw;
  const room = raw;
  const seats = [];
  const src = room.seats;
  for (let i = 0; i < POKER_SEAT_COUNT; i++) {
    const s = Array.isArray(src) ? src[i] : src && typeof src === "object" ? src[i] : null;
    seats.push(s ? s : null);
  }
  room.seats = seats;
  room.board = toArray(room.board);
  room.logs = toArray(room.logs);
  room.winners = toArray(room.winners);
  room.history = toArray(room.history);
  room.emotes = room.emotes || {};
  room.difficulty = room.difficulty || "NORMAL";
  room.turnTimeLimit = typeof room.turnTimeLimit === "number" ? room.turnTimeLimit : 20;
  room.revealedCards = room.revealedCards || {};
  room.pot = room.pot || 0;
  room.highestBet = room.highestBet || 0;
  room.currentTurnSeat = typeof room.currentTurnSeat === "number" ? room.currentTurnSeat : null;
  return room;
}
function serializePokerRoom(room) {
  const copy = { ...room, logs: (room.logs || []).slice(-60) };
  return JSON.parse(JSON.stringify(copy));
}

// src/poker/pokerAI.ts
var roomPlayerStats = /* @__PURE__ */ new Map();
function getPlayerStats(roomId, uid) {
  let roomMap = roomPlayerStats.get(roomId);
  if (!roomMap) {
    roomMap = /* @__PURE__ */ new Map();
    roomPlayerStats.set(roomId, roomMap);
  }
  let stats = roomMap.get(uid);
  if (!stats) {
    stats = {
      handsSeen: 0,
      vpipCount: 0,
      pfrCount: 0,
      betOrRaiseCount: 0,
      callOrCheckCount: 0
    };
    roomMap.set(uid, stats);
  }
  return stats;
}
function recordPlayerAction(roomId, uid, action, round) {
  const stats = getPlayerStats(roomId, uid);
  if (round === "PREFLOP") {
    if (action === "CALL" || action === "RAISE" || action === "ALL_IN") {
      stats.vpipCount++;
    }
    if (action === "RAISE" || action === "ALL_IN") {
      stats.pfrCount++;
    }
  }
  if (action === "RAISE" || action === "ALL_IN") {
    stats.betOrRaiseCount++;
  } else if (action === "CALL" || action === "CHECK") {
    stats.callOrCheckCount++;
  }
}
function evaluatePreflopScore(c1, c2) {
  const high = Math.max(c1.rank, c2.rank);
  const low = Math.min(c1.rank, c2.rank);
  const isPair = high === low;
  const isSuited = c1.suit === c2.suit;
  const gap = high - low;
  let base = 0;
  if (high === 14) base = 10;
  else if (high === 13) base = 8;
  else if (high === 12) base = 7;
  else if (high === 11) base = 6;
  else base = high / 2;
  if (isPair) {
    base = Math.max(5, base * 2);
    if (high === 14 || high === 13) base += 4;
    else if (high >= 10) base += 2;
  }
  if (isSuited) base += 2;
  if (!isPair) {
    if (gap === 1) base += 1;
    else if (gap === 2) base -= 1;
    else if (gap === 3) base -= 2;
    else if (gap >= 4) base -= 4;
    if (gap <= 2 && high <= 12) base += 1;
  }
  return Math.max(0, Math.min(1, (base + 3) / 28));
}
function estimateEquityMonteCarlo(holeCards, boardCards, activeOpponents, simulations = 2e3) {
  if (activeOpponents <= 0) return { equity: 1, winRate: 1, tieRate: 0 };
  const deadCardStrings = /* @__PURE__ */ new Set([
    ...holeCards.map(formatCard),
    ...boardCards.map(formatCard)
  ]);
  const allCards = getStandardDeck();
  const availableDeck = allCards.filter((c) => !deadCardStrings.has(formatCard(c)));
  const deckSize = availableDeck.length;
  let wins = 0;
  let ties = 0;
  const boardNeeded = 5 - boardCards.length;
  for (let s = 0; s < simulations; s++) {
    const usedIndices = /* @__PURE__ */ new Set();
    const drawRandomCard = () => {
      let idx;
      do {
        idx = Math.floor(Math.random() * deckSize);
      } while (usedIndices.has(idx));
      usedIndices.add(idx);
      return availableDeck[idx];
    };
    const simBoard = [...boardCards];
    for (let b = 0; b < boardNeeded; b++) {
      simBoard.push(drawRandomCard());
    }
    const myHand = evaluateHand([...simBoard, ...holeCards]);
    let bestOppScore = -1;
    let oppTies = 0;
    for (let op = 0; op < activeOpponents; op++) {
      const opC1 = drawRandomCard();
      const opC2 = drawRandomCard();
      const opHand = evaluateHand([...simBoard, opC1, opC2]);
      if (opHand.score > bestOppScore) {
        bestOppScore = opHand.score;
        oppTies = 1;
      } else if (opHand.score === bestOppScore) {
        oppTies++;
      }
    }
    if (myHand.score > bestOppScore) {
      wins++;
    } else if (myHand.score === bestOppScore) {
      ties += 1 / (oppTies + 1);
    }
  }
  const winRate = wins / simulations;
  const tieRate = ties / simulations;
  const equity = (wins + ties) / simulations;
  return { equity, winRate, tieRate };
}
function analyzeDrawPotential(holeCards, boardCards) {
  if (boardCards.length < 3) {
    return { isFlushDraw: false, isOpenEndedStraightDraw: false, isGutshot: false, drawOuts: 0 };
  }
  const allCards = [...holeCards, ...boardCards];
  const suitCounts = {};
  for (const c of allCards) {
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  }
  const isFlushDraw = Object.values(suitCounts).some((c) => c === 4);
  const ranks = Array.from(new Set(allCards.map((c) => c.rank))).sort((a, b) => a - b);
  if (ranks.includes(14)) {
    ranks.unshift(1);
  }
  let isOpenEndedStraightDraw = false;
  let isGutshot = false;
  for (let i = 0; i < ranks.length; i++) {
    for (let j = i + 3; j < ranks.length; j++) {
      const slice = ranks.slice(i, j + 1);
      const span = slice[slice.length - 1] - slice[0];
      if (slice.length === 4) {
        if (span === 3 && slice[0] > 1 && slice[slice.length - 1] < 14) {
          isOpenEndedStraightDraw = true;
        } else if (span === 4) {
          isGutshot = true;
        }
      }
    }
  }
  let drawOuts = 0;
  if (isFlushDraw) drawOuts += 9;
  if (isOpenEndedStraightDraw) drawOuts += 8;
  else if (isGutshot) drawOuts += 4;
  return { isFlushDraw, isOpenEndedStraightDraw, isGutshot, drawOuts };
}
function calculateAIDecision(params) {
  const { seat, holeCards, room } = params;
  const difficulty = params.difficulty || room.difficulty || "NORMAL";
  const boardCards = room.board.map(parseCard);
  const personality = seat.personality || "TAG";
  const activeOpponents = room.seats.filter(
    (s) => s !== null && !s.folded && s.uid !== seat.uid
  ).length;
  const options = getBettingOptions({
    playerChips: seat.chips,
    playerCurrentBet: seat.currentBet,
    highestBetOnTable: room.highestBet,
    lastRaiseDelta: room.lastRaiseDelta,
    bigBlind: room.bigBlind,
    totalPot: room.pot
  });
  const toCall = options.callAmount;
  const potAfterCall = room.pot + toCall;
  const potOdds = potAfterCall > 0 ? toCall / potAfterCall : 0;
  const spr = room.pot > 0 ? seat.chips / room.pot : 10;
  if (room.round === "PREFLOP") {
    const preScore = evaluatePreflopScore(holeCards[0], holeCards[1]);
    const isLatePosition = seat.seatIndex === room.dealerSeat || seat.seatIndex === (room.dealerSeat + 4) % 5;
    if (difficulty === "EASY") {
      if (toCall === 0) {
        return { action: "CHECK", reason: "Easy bot free check" };
      }
      if (preScore >= 0.85 && options.canRaise && Math.random() < 0.3) {
        return { action: "RAISE", amount: options.minRaiseTotal, reason: "Easy bot min-raise premium" };
      }
      if (preScore >= 0.22 || toCall <= room.bigBlind * 2) {
        return { action: "CALL", reason: "Easy bot loose preflop call" };
      }
      return { action: "FOLD", reason: "Easy bot folds unplayable trash" };
    }
    let threshold = 0.45;
    if (personality === "NIT") threshold = 0.6;
    else if (personality === "LAG") threshold = 0.35;
    else if (personality === "TRICKY") threshold = 0.4;
    if (isLatePosition) threshold -= 0.08;
    if (toCall === 0) {
      if (preScore > 0.7 && options.canRaise) {
        return {
          action: "RAISE",
          amount: Math.min(options.potRaiseTotal, options.maxRaiseTotal),
          reason: "Premium hand in BB, value raising"
        };
      }
      return { action: "CHECK", reason: "Free check" };
    }
    if (preScore >= 0.75) {
      if (options.canRaise && Math.random() < 0.85) {
        const raiseAmount = Math.min(options.potRaiseTotal, options.maxRaiseTotal);
        return { action: "RAISE", amount: raiseAmount, reason: "Monster preflop 3-bet" };
      }
      return { action: "CALL", reason: "Trapping / calling with premium" };
    }
    if (preScore >= threshold) {
      if (toCall <= room.bigBlind * 4) {
        if (options.canRaise && Math.random() < 0.35 && personality !== "NIT") {
          return {
            action: "RAISE",
            amount: options.minRaiseTotal,
            reason: "Positional preflop open-raise"
          };
        }
        return { action: "CALL", reason: "Playable preflop hand" };
      }
      if (preScore < 0.65) {
        return { action: "FOLD", reason: "Facing heavy raise with marginal hand" };
      }
      return { action: "CALL", reason: "Defending against raise" };
    }
    return { action: "FOLD", reason: "Fold weak preflop hand" };
  }
  const simCount = difficulty === "EASY" ? 150 : difficulty === "NORMAL" ? 1e3 : 2e3;
  const { equity } = estimateEquityMonteCarlo(holeCards, boardCards, activeOpponents, simCount);
  const draws = analyzeDrawPotential(holeCards, boardCards);
  const totalEquity = Math.min(0.98, equity + draws.drawOuts * 0.02);
  if (difficulty === "EASY") {
    if (options.canCheck) {
      if (totalEquity >= 0.85 && options.canRaise && Math.random() < 0.4) {
        return { action: "RAISE", amount: options.minRaiseTotal, reason: "Easy bot passive min-bet monster" };
      }
      return { action: "CHECK", reason: "Easy bot passive check" };
    }
    if (totalEquity >= potOdds - 0.15 || draws.drawOuts >= 4) {
      return { action: "CALL", reason: "Easy bot sticky call with marginal equity" };
    }
    if (toCall > room.bigBlind * 2 && totalEquity < 0.2) {
      return { action: "FOLD", reason: "Easy bot folds complete air" };
    }
    return { action: "CALL", reason: "Easy bot calls small bet" };
  }
  let aggressionFactor = 1;
  if (personality === "LAG") aggressionFactor = 1.25;
  else if (personality === "NIT") aggressionFactor = 0.8;
  else if (personality === "TRICKY") aggressionFactor = 1.15;
  if (difficulty === "HARD") {
    aggressionFactor *= 1.1;
  }
  const adjustedEquity = Math.min(0.99, totalEquity * aggressionFactor);
  if (options.canCheck) {
    if (adjustedEquity >= 0.8 && options.canRaise) {
      if (personality === "TRICKY" && Math.random() < 0.3) {
        return { action: "CHECK", reason: "Slow-playing monster for check-raise" };
      }
      const betSize = room.round === "RIVER" ? options.potRaiseTotal : options.threeQuarterPotRaiseTotal;
      return {
        action: "RAISE",
        amount: Math.min(betSize, options.maxRaiseTotal),
        reason: "Value betting strong hand"
      };
    }
    if (adjustedEquity >= 0.6 && options.canRaise && Math.random() < 0.75) {
      return {
        action: "RAISE",
        amount: Math.min(options.halfPotRaiseTotal, options.maxRaiseTotal),
        reason: "Value betting top pair/good kicker"
      };
    }
    if ((draws.isFlushDraw || draws.isOpenEndedStraightDraw) && options.canRaise && Math.random() < 0.65 && room.round !== "RIVER") {
      return {
        action: "RAISE",
        amount: Math.min(options.halfPotRaiseTotal, options.maxRaiseTotal),
        reason: "Semi-bluff with draw"
      };
    }
    if (room.round === "FLOP" && options.canRaise && (personality === "TAG" || personality === "LAG") && Math.random() < 0.6) {
      return {
        action: "RAISE",
        amount: Math.min(options.halfPotRaiseTotal, options.maxRaiseTotal),
        reason: "C-bet on dry flop"
      };
    }
    return { action: "CHECK", reason: "Checking for pot control" };
  }
  const reqEquity = potOdds;
  if (adjustedEquity >= 0.85 && options.canRaise && Math.random() < 0.7) {
    if (spr <= 2 || seat.chips <= options.potRaiseTotal * 1.5) {
      return { action: "ALL_IN", reason: "All-in with nuts / commanding equity" };
    }
    return {
      action: "RAISE",
      amount: Math.min(options.potRaiseTotal, options.maxRaiseTotal),
      reason: "Re-raising with monster equity"
    };
  }
  if (adjustedEquity >= reqEquity + 0.12) {
    if (options.canRaise && Math.random() < 0.35 && personality !== "NIT") {
      return {
        action: "RAISE",
        amount: Math.min(options.halfPotRaiseTotal, options.maxRaiseTotal),
        reason: "Raising with positive equity margin"
      };
    }
    return { action: "CALL", reason: "Calling with profitable pot odds" };
  }
  if (adjustedEquity >= reqEquity - 0.04) {
    if (room.round === "RIVER" && toCall > room.pot * 0.75 && adjustedEquity < 0.5) {
      return { action: "FOLD", reason: "River over-bet fold" };
    }
    return { action: "CALL", reason: "Pot odds call with draw / kicker" };
  }
  if (draws.drawOuts >= 8 && options.canRaise && toCall <= room.bigBlind * 3 && personality === "LAG" && Math.random() < 0.4) {
    return {
      action: "RAISE",
      amount: Math.min(options.halfPotRaiseTotal, options.maxRaiseTotal),
      reason: "Semi-bluff re-raise with 8+ outs"
    };
  }
  return { action: "FOLD", reason: "Equity lower than pot odds" };
}

// src/poker/pokerServer.ts
var processedActionIds = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [id, time] of processedActionIds.entries()) {
    if (now - time > 6e4) {
      processedActionIds.delete(id);
    }
  }
}, 3e4);
function isActionProcessed(actionId) {
  if (!actionId) return false;
  if (processedActionIds.has(actionId)) return true;
  processedActionIds.set(actionId, Date.now());
  return false;
}
function createPokerDb(clientDb, adminDb2) {
  if (adminDb2) {
    return {
      async get(path2) {
        try {
          return await adminDb2.ref(path2).get();
        } catch (e) {
          return await (0, import_database.get)((0, import_database.ref)(clientDb, path2));
        }
      },
      async set(path2, val) {
        try {
          await adminDb2.ref(path2).set(val);
        } catch (e) {
          await (0, import_database.set)((0, import_database.ref)(clientDb, path2), val);
        }
      },
      async update(updates) {
        try {
          await adminDb2.ref().update(updates);
        } catch (e) {
          await (0, import_database.update)((0, import_database.ref)(clientDb), updates);
        }
      },
      async push(path2, val) {
        try {
          await adminDb2.ref(path2).push(val);
        } catch (e) {
          await (0, import_database.push)((0, import_database.ref)(clientDb, path2), val);
        }
      }
    };
  }
  return {
    async get(path2) {
      return await (0, import_database.get)((0, import_database.ref)(clientDb, path2));
    },
    async set(path2, val) {
      await (0, import_database.set)((0, import_database.ref)(clientDb, path2), val);
    },
    async update(updates) {
      await (0, import_database.update)((0, import_database.ref)(clientDb), updates);
    },
    async push(path2, val) {
      await (0, import_database.push)((0, import_database.ref)(clientDb, path2), val);
    }
  };
}
async function dbGet(db2, path2) {
  if (db2 && typeof db2.get === "function") {
    return await db2.get(path2);
  }
  return await (0, import_database.get)((0, import_database.ref)(db2, path2));
}
async function dbSet(db2, path2, val) {
  if (db2 && typeof db2.set === "function") {
    return await db2.set(path2, val);
  }
  return await (0, import_database.set)((0, import_database.ref)(db2, path2), val);
}
async function dbUpdate(db2, updates) {
  if (db2 && typeof db2.update === "function") {
    return await db2.update(updates);
  }
  return await (0, import_database.update)((0, import_database.ref)(db2), updates);
}
async function dbPush(db2, path2, val) {
  if (db2 && typeof db2.push === "function") {
    return await db2.push(path2, val);
  }
  return await (0, import_database.push)((0, import_database.ref)(db2, path2), val);
}
async function verifyUserSession(db2, uid, sessionToken) {
  if (!uid) return { ok: false, error: "Thi\u1EBFu th\xF4ng tin ng\u01B0\u1EDDi d\xF9ng" };
  try {
    const userSnap = await dbGet(db2, `users/${uid}`);
    if (!userSnap.exists()) {
      return {
        ok: true,
        user: {
          uid,
          name: `Sinh Vi\xEAn ${uid}`,
          role: "STUDENT",
          pp: 1e5,
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150"
        }
      };
    }
    const user = userSnap.val();
    if (user.locked) {
      return { ok: false, error: "T\xE0i kho\u1EA3n \u0111\xE3 b\u1ECB t\u1EA1m kh\xF3a" };
    }
    if (user.sessionToken && sessionToken && user.sessionToken !== sessionToken) {
      return { ok: false, error: "Phi\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i" };
    }
    return { ok: true, user };
  } catch (err) {
    return {
      ok: true,
      user: {
        uid,
        name: `Sinh Vi\xEAn ${uid}`,
        role: "STUDENT",
        pp: 1e5
      }
    };
  }
}
function getCryptoShuffledDeck() {
  const standardDeck = getStandardDeck();
  return shuffleDeck(standardDeck, () => {
    return import_crypto.default.randomInt(0, 1e8) / 1e8;
  });
}
var AI_BOTS = [
  {
    name: "Minh_Dev",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150",
    personality: "TAG"
  },
  {
    name: "H\xF9ng_Bot",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150",
    personality: "LAG"
  },
  {
    name: "B\xEDch_Ng\u1ECDc",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150",
    personality: "NIT"
  },
  {
    name: "T\xED_SinhVi\xEAn",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150",
    personality: "TRICKY"
  }
];
async function recordPokerTransaction(db2, uid, amount, title) {
  try {
    await dbPush(db2, `transactions/${uid}`, {
      id: `tx_poker_${Date.now()}_${import_crypto.default.randomBytes(3).toString("hex")}`,
      type: amount >= 0 ? "INCOME" : "EXPENSE",
      title,
      amount,
      unit: "PP",
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn("[Poker TX Log Warn]:", err);
  }
}
async function advancePokerGame(db2, roomId, room, executePPTransaction2) {
  const activeSeats = room.seats.filter((s) => s !== null && !s.folded);
  if (activeSeats.length === 1) {
    const winner = activeSeats[0];
    const winAmount = room.pot;
    winner.chips += winAmount;
    room.round = "SHOWDOWN";
    room.pot = 0;
    room.currentTurnSeat = null;
    room.winners = [{
      uid: winner.uid,
      name: winner.name,
      amount: winAmount,
      handDesc: "T\u1EA5t c\u1EA3 \u0111\u1ED1i th\u1EE7 \u0111\xE3 b\u1ECF b\xE0i"
    }];
    room.history = room.history || [];
    room.history.push({
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      handNumber: room.handCount || 1,
      winnerUid: winner.uid,
      winnerName: winner.name,
      pot: winAmount,
      winningHandDesc: "T\u1EA5t c\u1EA3 \u0111\u1ED1i th\u1EE7 \u0111\xE3 b\u1ECF b\xE0i",
      timestamp: Date.now()
    });
    if (room.history.length > 10) {
      room.history = room.history.slice(-10);
    }
    room.logs = room.logs || [];
    room.logs.push(`\u{1F389} ${winner.name} th\u1EAFng ${winAmount.toLocaleString()} PP (M\u1ECDi ng\u01B0\u1EDDi \u0111\u1EC1u b\u1ECF b\xE0i).`);
    await dbSet(db2, `poker_rooms/${roomId}`, serializePokerRoom(room));
    setTimeout(() => {
      startNewHandIfReady(db2, roomId, executePPTransaction2).catch(console.error);
    }, 5e3);
    return;
  }
  const canAct = activeSeats.filter((s) => !s.allIn);
  const isSettled = isStreetSettled(activeSeats, room.highestBet);
  if (isSettled) {
    for (const seat of room.seats) {
      if (!seat) continue;
      seat.currentBet = 0;
      seat.hasActed = false;
      if (!seat.folded && !seat.allIn) delete seat.lastAction;
    }
    room.highestBet = 0;
    room.lastRaiseDelta = room.bigBlind;
    if (canAct.length <= 1 && room.round !== "RIVER") {
      const deckSnap = await dbGet(db2, `poker_private/${roomId}/deck`);
      let secretDeck = deckSnap.exists() ? deckSnap.val() : [];
      while (room.board.length < 5 && secretDeck.length > 0) {
        room.board.push(secretDeck.shift());
      }
      await dbSet(db2, `poker_private/${roomId}/deck`, secretDeck);
      await finishShowdown(db2, roomId, room, executePPTransaction2);
      return;
    }
    if (room.round === "PREFLOP") {
      room.round = "FLOP";
      const deckSnap = await dbGet(db2, `poker_private/${roomId}/deck`);
      let secretDeck = deckSnap.exists() ? deckSnap.val() : [];
      if (secretDeck.length >= 3) {
        room.board.push(secretDeck.shift(), secretDeck.shift(), secretDeck.shift());
        await dbSet(db2, `poker_private/${roomId}/deck`, secretDeck);
      }
      room.logs = room.logs || [];
      room.logs.push(`\u{1F0CF} Chia b\xE0i chung FLOP: ${room.board.join(" ")}`);
    } else if (room.round === "FLOP") {
      room.round = "TURN";
      const deckSnap = await dbGet(db2, `poker_private/${roomId}/deck`);
      let secretDeck = deckSnap.exists() ? deckSnap.val() : [];
      if (secretDeck.length >= 1) {
        room.board.push(secretDeck.shift());
        await dbSet(db2, `poker_private/${roomId}/deck`, secretDeck);
      }
      room.logs = room.logs || [];
      room.logs.push(`\u{1F0CF} Chia b\xE0i chung TURN: ${room.board[3]}`);
    } else if (room.round === "TURN") {
      room.round = "RIVER";
      const deckSnap = await dbGet(db2, `poker_private/${roomId}/deck`);
      let secretDeck = deckSnap.exists() ? deckSnap.val() : [];
      if (secretDeck.length >= 1) {
        room.board.push(secretDeck.shift());
        await dbSet(db2, `poker_private/${roomId}/deck`, secretDeck);
      }
      room.logs = room.logs || [];
      room.logs.push(`\u{1F0CF} Chia b\xE0i chung RIVER: ${room.board[4]}`);
    } else if (room.round === "RIVER") {
      await finishShowdown(db2, roomId, room, executePPTransaction2);
      return;
    }
    let nextSeat2 = (room.dealerSeat + 1) % 5;
    let found = false;
    for (let i = 0; i < 5; i++) {
      const idx = (nextSeat2 + i) % 5;
      const s = room.seats[idx];
      if (s && !s.folded && !s.allIn) {
        room.currentTurnSeat = idx;
        found = true;
        break;
      }
    }
    if (!found) {
      await finishShowdown(db2, roomId, room, executePPTransaction2);
      return;
    }
    room.actionExpiry = Date.now() + (room.turnTimeLimit ? room.turnTimeLimit * 1e3 : 2e4);
    await dbSet(db2, `poker_rooms/${roomId}`, serializePokerRoom(room));
    checkIfNextTurnIsAI(db2, roomId, room, executePPTransaction2);
    return;
  }
  let nextSeat = ((room.currentTurnSeat ?? room.dealerSeat) + 1) % 5;
  for (let i = 0; i < 5; i++) {
    const idx = (nextSeat + i) % 5;
    const s = room.seats[idx];
    if (s && !s.folded && !s.allIn) {
      room.currentTurnSeat = idx;
      break;
    }
  }
  room.actionExpiry = Date.now() + (room.turnTimeLimit ? room.turnTimeLimit * 1e3 : 2e4);
  await dbSet(db2, `poker_rooms/${roomId}`, serializePokerRoom(room));
  checkIfNextTurnIsAI(db2, roomId, room, executePPTransaction2);
}
async function finishShowdown(db2, roomId, room, executePPTransaction2) {
  room.round = "SHOWDOWN";
  room.currentTurnSeat = null;
  const privateSnap = await dbGet(db2, `poker_private/${roomId}`);
  const privateData = privateSnap.exists() ? privateSnap.val() : {};
  const revealed = {};
  const handEvals = {};
  const boardCards = room.board.map(parseCard);
  for (const seat of room.seats) {
    if (!seat) continue;
    const holeStrArr = privateData[seat.uid];
    if (Array.isArray(holeStrArr) && holeStrArr.length === 2) {
      if (!seat.folded) {
        revealed[seat.uid] = holeStrArr;
        const holeCards = holeStrArr.map(parseCard);
        const full7 = [...boardCards, ...holeCards];
        handEvals[seat.uid] = evaluateHand(full7);
      }
    }
  }
  room.revealedCards = revealed;
  const playerBets = room.seats.filter((s) => s !== null).map((s) => ({
    id: s.uid,
    totalBet: s.totalHandBet || 0,
    folded: s.folded
  }));
  const sidePots = calculateSidePots(playerBets);
  const { payouts, winners } = distributePots(sidePots, handEvals);
  for (const seat of room.seats) {
    if (seat && payouts[seat.uid]) {
      seat.chips += payouts[seat.uid];
    }
  }
  room.winners = winners.map((w) => {
    const s = room.seats.find((st) => st?.uid === w.id);
    return {
      uid: w.id,
      name: s?.name || "V\xF5 s\u0129",
      amount: w.amount,
      handDesc: w.handDesc
    };
  });
  room.pot = 0;
  room.history = room.history || [];
  if (room.winners && room.winners.length > 0) {
    const mainWinner = room.winners[0];
    room.history.push({
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      handNumber: room.handCount || 1,
      winnerUid: mainWinner.uid,
      winnerName: mainWinner.name,
      pot: sidePots.reduce((acc, p) => acc + p.amount, 0) || mainWinner.amount,
      winningHandDesc: mainWinner.handDesc,
      timestamp: Date.now()
    });
    if (room.history.length > 10) {
      room.history = room.history.slice(-10);
    }
  }
  room.logs = room.logs || [];
  for (const w of room.winners) {
    room.logs.push(`\u{1F3C6} ${w.name} th\u1EAFng ${w.amount.toLocaleString()} PP (${w.handDesc})`);
  }
  await dbSet(db2, `poker_rooms/${roomId}`, serializePokerRoom(room));
  setTimeout(() => {
    startNewHandIfReady(db2, roomId, executePPTransaction2).catch(console.error);
  }, 5e3);
}
async function startNewHandIfReady(db2, roomId, executePPTransaction2) {
  const roomSnap = await dbGet(db2, `poker_rooms/${roomId}`);
  if (!roomSnap.exists()) return;
  const room = normalizePokerRoom(roomSnap.val());
  const hasHuman = room.seats.some((s) => s && !s.isAI && !s.left && s.chips > 0);
  if (!hasHuman) {
    await dbSet(db2, `poker_rooms/${roomId}`, null);
    await dbSet(db2, `poker_private/${roomId}`, null);
    return;
  }
  for (let i = 0; i < 5; i++) {
    const s = room.seats[i];
    if (s && (s.chips <= 0 || s.left)) {
      if (!s.isAI && !s.left) {
        room.logs = room.logs || [];
        room.logs.push(`\u26A0\uFE0F ${s.name} h\u1EBFt chip v\xE0 ph\u1EA3i r\u1EDDi b\xE0n.`);
      }
      room.seats[i] = null;
    }
  }
  const seatedWithChips = room.seats.filter((s) => s !== null && s.chips > 0);
  if (seatedWithChips.length < 2) {
    room.status = "WAITING";
    room.round = "WAITING";
    room.currentTurnSeat = null;
    room.pot = 0;
    room.board = [];
    room.revealedCards = {};
    room.winners = [];
    await dbSet(db2, `poker_rooms/${roomId}`, serializePokerRoom(room));
    return;
  }
  await dealNewHand(db2, roomId, room, executePPTransaction2);
}
async function dealNewHand(db2, roomId, room, executePPTransaction2) {
  room.status = "PLAYING";
  room.round = "PREFLOP";
  room.board = [];
  room.revealedCards = {};
  room.winners = [];
  room.pot = 0;
  room.handCount = (room.handCount || 0) + 1;
  let nextDealer = (room.dealerSeat + 1) % 5;
  for (let i = 0; i < 5; i++) {
    const idx = (nextDealer + i) % 5;
    if (room.seats[idx] && room.seats[idx].chips > 0) {
      room.dealerSeat = idx;
      break;
    }
  }
  for (const s of room.seats) {
    if (s) {
      s.currentBet = 0;
      s.totalHandBet = 0;
      s.folded = false;
      s.allIn = false;
      delete s.lastAction;
      s.hasActed = false;
      delete s.left;
    }
  }
  const activeIndices = [];
  for (let i = 0; i < 5; i++) {
    const idx = (room.dealerSeat + 1 + i) % 5;
    if (room.seats[idx] && room.seats[idx].chips > 0) {
      activeIndices.push(idx);
    }
  }
  let sbSeatIdx;
  let bbSeatIdx;
  let firstTurnIdx;
  if (activeIndices.length === 2) {
    sbSeatIdx = room.dealerSeat;
    bbSeatIdx = activeIndices.find((idx) => idx !== room.dealerSeat);
    firstTurnIdx = sbSeatIdx;
  } else {
    sbSeatIdx = activeIndices[0];
    bbSeatIdx = activeIndices[1];
    firstTurnIdx = activeIndices[2];
  }
  const sbSeat = room.seats[sbSeatIdx];
  const bbSeat = room.seats[bbSeatIdx];
  const sbAmount = Math.min(room.smallBlind, sbSeat.chips);
  sbSeat.chips -= sbAmount;
  sbSeat.currentBet = sbAmount;
  sbSeat.totalHandBet = sbAmount;
  if (sbSeat.chips === 0) sbSeat.allIn = true;
  sbSeat.lastAction = `SB ${sbAmount}`;
  const bbAmount = Math.min(room.bigBlind, bbSeat.chips);
  bbSeat.chips -= bbAmount;
  bbSeat.currentBet = bbAmount;
  bbSeat.totalHandBet = bbAmount;
  if (bbSeat.chips === 0) bbSeat.allIn = true;
  bbSeat.lastAction = `BB ${bbAmount}`;
  room.pot = sbAmount + bbAmount;
  room.highestBet = Math.max(sbAmount, bbAmount);
  room.lastRaiseDelta = room.bigBlind;
  room.currentTurnSeat = firstTurnIdx;
  room.actionExpiry = Date.now() + (room.turnTimeLimit ? room.turnTimeLimit * 1e3 : 2e4);
  const deck = getCryptoShuffledDeck();
  const privateUpdates = {};
  for (const s of room.seats) {
    if (s && s.chips >= 0) {
      const c1 = deck.shift();
      const c2 = deck.shift();
      privateUpdates[`poker_private/${roomId}/${s.uid}`] = [formatCard(c1), formatCard(c2)];
    }
  }
  privateUpdates[`poker_private/${roomId}/deck`] = deck.map(formatCard);
  room.logs = room.logs || [];
  room.logs.push(`\u{1F3B2} V\xE1n #${room.handCount} b\u1EAFt \u0111\u1EA7u. N\xFAt Dealer \u1EDF [${room.seats[room.dealerSeat]?.name}].`);
  await dbUpdate(db2, {
    [`poker_rooms/${roomId}`]: serializePokerRoom(room),
    ...privateUpdates
  });
  const contenders = room.seats.filter((s) => s && !s.folded);
  const actors = contenders.filter((s) => !s.allIn);
  const unmatched = actors.some((s) => s.currentBet < room.highestBet);
  if (actors.length === 0 || actors.length === 1 && !unmatched) {
    await advancePokerGame(db2, roomId, room, executePPTransaction2);
    return;
  }
  const turnSeat = room.seats[room.currentTurnSeat ?? -1];
  if (!turnSeat || turnSeat.allIn || turnSeat.folded) {
    for (let i = 0; i < 5; i++) {
      const idx = ((room.currentTurnSeat ?? room.dealerSeat) + i) % 5;
      const cand = room.seats[idx];
      if (cand && !cand.folded && !cand.allIn) {
        room.currentTurnSeat = idx;
        await dbSet(db2, `poker_rooms/${roomId}`, serializePokerRoom(room));
        break;
      }
    }
  }
  checkIfNextTurnIsAI(db2, roomId, room, executePPTransaction2);
}
async function executeAITurn(db2, roomId, room, aiSeat, executePPTransaction2) {
  const roomSnap = await dbGet(db2, `poker_rooms/${roomId}`);
  if (!roomSnap.exists()) return;
  const currentRoom = normalizePokerRoom(roomSnap.val());
  if (currentRoom.currentTurnSeat === null || currentRoom.round === "WAITING" || currentRoom.round === "SHOWDOWN") return;
  const currentSeat = currentRoom.seats[currentRoom.currentTurnSeat];
  if (!currentSeat || currentSeat.uid !== aiSeat.uid || !currentSeat.isAI) return;
  const privSnap = await dbGet(db2, `poker_private/${roomId}/${aiSeat.uid}`);
  if (!privSnap.exists()) return;
  const holeStrs = privSnap.val();
  const holeCards = holeStrs.map(parseCard);
  const decision = calculateAIDecision({
    seat: currentSeat,
    holeCards,
    room: currentRoom,
    difficulty: currentRoom.difficulty || "NORMAL"
  });
  const options = getBettingOptions({
    playerChips: currentSeat.chips,
    playerCurrentBet: currentSeat.currentBet,
    highestBetOnTable: currentRoom.highestBet,
    lastRaiseDelta: currentRoom.lastRaiseDelta,
    bigBlind: currentRoom.bigBlind,
    totalPot: currentRoom.pot
  });
  if (decision.action === "FOLD") {
    currentSeat.folded = true;
    currentSeat.lastAction = "B\u1ECE B\xC0I";
    currentSeat.hasActed = true;
    currentRoom.logs = currentRoom.logs || [];
    currentRoom.logs.push(`\u{1F4A8} [${currentSeat.name}] \u0111\xE3 b\u1ECF b\xE0i (Fold).`);
  } else if (decision.action === "CHECK") {
    currentSeat.lastAction = "CHECK";
    currentSeat.hasActed = true;
    currentRoom.logs = currentRoom.logs || [];
    currentRoom.logs.push(`\u{1F44C} [${currentSeat.name}] Check.`);
  } else if (decision.action === "CALL") {
    const callDiff = options.callAmount;
    currentSeat.chips -= callDiff;
    currentSeat.currentBet += callDiff;
    currentSeat.totalHandBet += callDiff;
    currentRoom.pot += callDiff;
    if (currentSeat.chips === 0) currentSeat.allIn = true;
    currentSeat.lastAction = currentSeat.allIn ? "ALL-IN" : `THEO ${callDiff.toLocaleString()}`;
    currentSeat.hasActed = true;
    currentRoom.logs = currentRoom.logs || [];
    currentRoom.logs.push(`\u{1FA99} [${currentSeat.name}] Theo ${callDiff.toLocaleString()} PP.`);
  } else if (decision.action === "RAISE" || decision.action === "ALL_IN") {
    const isAllIn = decision.action === "ALL_IN";
    const targetBet = isAllIn ? options.maxRaiseTotal : Math.min(options.maxRaiseTotal, Math.max(options.minRaiseTotal, decision.amount || options.minRaiseTotal));
    const raiseDiff = targetBet - currentSeat.currentBet;
    currentSeat.chips -= raiseDiff;
    currentSeat.currentBet = targetBet;
    currentSeat.totalHandBet += raiseDiff;
    currentRoom.pot += raiseDiff;
    const delta = targetBet - currentRoom.highestBet;
    if (delta > currentRoom.lastRaiseDelta) {
      currentRoom.lastRaiseDelta = delta;
    }
    currentRoom.highestBet = targetBet;
    if (currentSeat.chips === 0) currentSeat.allIn = true;
    currentSeat.lastAction = currentSeat.allIn ? `ALL-IN ${targetBet.toLocaleString()}` : `T\u1ED0 ${targetBet.toLocaleString()}`;
    currentSeat.hasActed = true;
    currentRoom.logs = currentRoom.logs || [];
    currentRoom.logs.push(`\u{1F525} [${currentSeat.name}] ${currentSeat.allIn ? "ALL-IN" : "T\u1ED1 l\xEAn"} ${targetBet.toLocaleString()} PP.`);
  }
  recordPlayerAction(roomId, currentSeat.uid, decision.action, currentRoom.round);
  await advancePokerGame(db2, roomId, currentRoom, executePPTransaction2);
}
var onAITurnTrigger = executeAITurn;
function checkIfNextTurnIsAI(db2, roomId, room, executePPTransaction2) {
  if (room.currentTurnSeat === null || room.round === "SHOWDOWN" || room.round === "WAITING") return;
  const currentSeat = room.seats[room.currentTurnSeat];
  if (currentSeat && currentSeat.isAI && !currentSeat.folded && !currentSeat.allIn) {
    const delay = import_crypto.default.randomInt(800, 2500);
    setTimeout(() => {
      onAITurnTrigger(db2, roomId, room, currentSeat, executePPTransaction2).catch(console.error);
    }, delay);
  }
}
function setupPokerRouter(clientDb, executePPTransaction2, adminDb2) {
  const router = import_express.default.Router();
  const db2 = createPokerDb(clientDb, adminDb2);
  router.post("/create", async (req, res) => {
    const {
      uid,
      sessionToken,
      name,
      avatar,
      mode = "AI",
      bigBlind = 100,
      buyIn,
      actionId,
      difficulty = "NORMAL",
      turnTimeLimit = 20
    } = req.body;
    if (isActionProcessed(actionId)) {
      return res.status(400).json({ success: false, error: "Y\xEAu c\u1EA7u tr\xF9ng l\u1EB7p" });
    }
    const auth = await verifyUserSession(db2, uid, sessionToken);
    if (!auth.ok) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    const bb = Math.max(10, Math.floor(Number(bigBlind) || 100));
    const minBuyIn = bb * 20;
    const maxBuyIn = bb * 100;
    const requestedBuyIn = Math.floor(Number(buyIn) || minBuyIn);
    if (requestedBuyIn < minBuyIn || requestedBuyIn > maxBuyIn) {
      return res.status(400).json({
        success: false,
        error: `M\u1EE9c Buy-in ph\u1EA3i t\u1EEB ${minBuyIn.toLocaleString()} \u0111\u1EBFn ${maxBuyIn.toLocaleString()} PP`
      });
    }
    const tx = await executePPTransaction2(uid, -requestedBuyIn);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || "S\u1ED1 d\u01B0 PP kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 Buy-in" });
    }
    const roomId = `PK${Date.now().toString().slice(-4)}${import_crypto.default.randomInt(10, 99)}`;
    await recordPokerTransaction(db2, uid, -requestedBuyIn, `Buy-in Poker Texas Hold'em (B\xE0n #${roomId})`);
    const creatorSeat = {
      seatIndex: 0,
      uid,
      name: name || auth.user.name || "Ng\u01B0\u1EDDi ch\u01A1i",
      avatar: avatar || auth.user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      chips: requestedBuyIn,
      currentBet: 0,
      totalHandBet: 0,
      folded: false,
      allIn: false,
      isAI: false,
      consecutiveTimeouts: 0
    };
    const seats = [creatorSeat, null, null, null, null];
    if (mode === "AI") {
      for (let i = 1; i <= 4; i++) {
        const botTemplate = AI_BOTS[i - 1];
        seats[i] = {
          seatIndex: i,
          uid: `ai_bot_${i}_${roomId}`,
          name: botTemplate.name,
          avatar: botTemplate.avatar,
          chips: requestedBuyIn,
          currentBet: 0,
          totalHandBet: 0,
          folded: false,
          allIn: false,
          isAI: true,
          personality: botTemplate.personality,
          consecutiveTimeouts: 0
        };
      }
    }
    const validDifficulty = difficulty === "EASY" || difficulty === "HARD" ? difficulty : "NORMAL";
    const validTurnTime = [15, 30, 45].includes(Number(turnTimeLimit)) ? Number(turnTimeLimit) : 20;
    const room = {
      id: roomId,
      name: `B\xC0N #${roomId}`,
      mode: mode === "MULTIPLAYER" ? "MULTIPLAYER" : "AI",
      creator: uid,
      creatorName: creatorSeat.name,
      bigBlind: bb,
      smallBlind: Math.floor(bb / 2),
      minBuyIn,
      maxBuyIn,
      status: "WAITING",
      round: "WAITING",
      seats,
      dealerSeat: 0,
      currentTurnSeat: null,
      pot: 0,
      highestBet: 0,
      lastRaiseDelta: bb,
      board: [],
      actionExpiry: 0,
      logs: [`Ph\xF2ng poker ${roomId} \u0111\xE3 \u0111\u01B0\u1EE3c t\u1EA1o th\xE0nh c\xF4ng.`],
      difficulty: mode === "AI" ? validDifficulty : void 0,
      turnTimeLimit: validTurnTime
    };
    await dbSet(db2, `poker_rooms/${roomId}`, serializePokerRoom(room));
    if (mode === "AI") {
      setTimeout(() => {
        dealNewHand(db2, roomId, room, executePPTransaction2).catch(console.error);
      }, 500);
    }
    res.json({ success: true, roomId, room, newPP: tx.newPP });
  });
  router.post("/join", async (req, res) => {
    const { roomId, uid, sessionToken, name, avatar, seatIndex, buyIn, actionId } = req.body;
    if (isActionProcessed(actionId)) {
      return res.status(400).json({ success: false, error: "Y\xEAu c\u1EA7u tr\xF9ng l\u1EB7p" });
    }
    const auth = await verifyUserSession(db2, uid, sessionToken);
    if (!auth.ok) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    const roomSnap = await dbGet(db2, `poker_rooms/${roomId}`);
    if (!roomSnap.exists()) {
      return res.status(404).json({ success: false, error: "Ph\xF2ng kh\xF4ng t\u1ED3n t\u1EA1i" });
    }
    const room = normalizePokerRoom(roomSnap.val());
    const alreadySeated = room.seats.find((s) => s?.uid === uid);
    if (alreadySeated) {
      return res.json({ success: true, room, message: "B\u1EA1n \u0111\xE3 ng\u1ED3i trong b\xE0n" });
    }
    let targetSeat = -1;
    if (typeof seatIndex === "number" && seatIndex >= 0 && seatIndex < 5 && room.seats[seatIndex] === null) {
      targetSeat = seatIndex;
    } else {
      targetSeat = room.seats.findIndex((s) => s === null);
    }
    if (targetSeat === -1) {
      return res.status(400).json({ success: false, error: "B\xE0n ch\u01A1i \u0111\xE3 \u0111\u1EA7y gh\u1EBF (t\u1ED1i \u0111a 5 ng\u01B0\u1EDDi)" });
    }
    const requestedBuyIn = Math.floor(Number(buyIn) || room.minBuyIn);
    if (requestedBuyIn < room.minBuyIn || requestedBuyIn > room.maxBuyIn) {
      return res.status(400).json({
        success: false,
        error: `M\u1EE9c Buy-in ph\u1EA3i t\u1EEB ${room.minBuyIn.toLocaleString()} \u0111\u1EBFn ${room.maxBuyIn.toLocaleString()} PP`
      });
    }
    const tx = await executePPTransaction2(uid, -requestedBuyIn);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || "S\u1ED1 d\u01B0 PP kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 Buy-in" });
    }
    await recordPokerTransaction(db2, uid, -requestedBuyIn, `Buy-in Poker Texas Hold'em (B\xE0n #${roomId})`);
    const newSeat = {
      seatIndex: targetSeat,
      uid,
      name: name || auth.user.name || "Ng\u01B0\u1EDDi ch\u01A1i",
      avatar: avatar || auth.user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      chips: requestedBuyIn,
      currentBet: 0,
      totalHandBet: 0,
      folded: room.round !== "WAITING",
      allIn: false,
      isAI: false,
      consecutiveTimeouts: 0
    };
    room.seats[targetSeat] = newSeat;
    room.logs = room.logs || [];
    room.logs.push(`\u{1F44B} [${newSeat.name}] \u0111\xE3 ng\u1ED3i v\xE0o gh\u1EBF s\u1ED1 ${targetSeat + 1}.`);
    await dbSet(db2, `poker_rooms/${roomId}`, serializePokerRoom(room));
    res.json({ success: true, room, seatIndex: targetSeat, newPP: tx.newPP });
  });
  router.post("/leave", async (req, res) => {
    const { roomId, uid, sessionToken, actionId } = req.body;
    if (isActionProcessed(actionId)) {
      return res.status(400).json({ success: false, error: "Y\xEAu c\u1EA7u tr\xF9ng l\u1EB7p" });
    }
    const auth = await verifyUserSession(db2, uid, sessionToken);
    if (!auth.ok) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    const roomSnap = await dbGet(db2, `poker_rooms/${roomId}`);
    if (!roomSnap.exists()) {
      return res.status(404).json({ success: false, error: "Ph\xF2ng kh\xF4ng t\u1ED3n t\u1EA1i" });
    }
    const room = normalizePokerRoom(roomSnap.val());
    const seatIdx = room.seats.findIndex((s) => s?.uid === uid);
    if (seatIdx === -1) {
      return res.json({ success: true, message: "B\u1EA1n kh\xF4ng ng\u1ED3i trong b\xE0n n\xE0y" });
    }
    const seat = room.seats[seatIdx];
    const refundChips = seat.chips || 0;
    let newPP = 0;
    if (refundChips > 0) {
      const tx = await executePPTransaction2(uid, refundChips);
      if (tx.success) {
        newPP = tx.newPP;
        await recordPokerTransaction(db2, uid, refundChips, `Ho\xE0n tr\u1EA3 chip Poker (B\xE0n #${roomId})`);
      }
    }
    const midHand = room.round !== "WAITING" && room.round !== "SHOWDOWN";
    room.logs = room.logs || [];
    room.logs.push(`\u{1F6AA} [${seat.name}] \u0111\xE3 r\u1EDDi b\xE0n (${refundChips.toLocaleString()} chip ho\xE0n v\xE0o PP).`);
    if (midHand && (seat.totalHandBet || 0) > 0) {
      seat.folded = true;
      seat.left = true;
      seat.chips = 0;
      seat.allIn = false;
      seat.lastAction = "\u0110\xC3 R\u1EDCI B\xC0N";
    } else {
      room.seats[seatIdx] = null;
    }
    const humansLeft = room.seats.filter((s) => s && !s.isAI && !s.left);
    if (humansLeft.length === 0) {
      await dbSet(db2, `poker_rooms/${roomId}`, null);
      await dbSet(db2, `poker_private/${roomId}`, null);
      return res.json({ success: true, refunded: refundChips, newPP });
    }
    const stillInHand = room.seats.filter((s) => s && !s.folded);
    if (midHand && (room.currentTurnSeat === seatIdx || stillInHand.length <= 1)) {
      await advancePokerGame(db2, roomId, room, executePPTransaction2);
    } else {
      await dbSet(db2, `poker_rooms/${roomId}`, serializePokerRoom(room));
    }
    res.json({ success: true, refunded: refundChips, newPP });
  });
  router.post("/start", async (req, res) => {
    const { roomId, uid, sessionToken, actionId } = req.body;
    if (isActionProcessed(actionId)) {
      return res.status(400).json({ success: false, error: "Y\xEAu c\u1EA7u tr\xF9ng l\u1EB7p" });
    }
    const auth = await verifyUserSession(db2, uid, sessionToken);
    if (!auth.ok) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    const roomSnap = await dbGet(db2, `poker_rooms/${roomId}`);
    if (!roomSnap.exists()) {
      return res.status(404).json({ success: false, error: "Ph\xF2ng kh\xF4ng t\u1ED3n t\u1EA1i" });
    }
    const room = normalizePokerRoom(roomSnap.val());
    if (room.creator !== uid) {
      return res.status(403).json({ success: false, error: "Ch\u1EC9 ch\u1EE7 ph\xF2ng m\u1EDBi c\xF3 quy\u1EC1n b\u1EAFt \u0111\u1EA7u v\xE1n" });
    }
    const seatedCount = room.seats.filter((s) => s !== null && s.chips > 0).length;
    if (seatedCount < 2) {
      return res.status(400).json({ success: false, error: "C\u1EA7n t\u1ED1i thi\u1EC3u 2 ng\u01B0\u1EDDi c\xF3 chip \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u" });
    }
    await dealNewHand(db2, roomId, room, executePPTransaction2);
    res.json({ success: true, message: "V\xE1n b\xE0i \u0111\xE3 b\u1EAFt \u0111\u1EA7u" });
  });
  router.post("/action", async (req, res) => {
    const { roomId, uid, sessionToken, action, amount, actionId } = req.body;
    if (isActionProcessed(actionId)) {
      return res.status(400).json({ success: false, error: "Y\xEAu c\u1EA7u tr\xF9ng l\u1EB7p" });
    }
    const auth = await verifyUserSession(db2, uid, sessionToken);
    if (!auth.ok) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    const roomSnap = await dbGet(db2, `poker_rooms/${roomId}`);
    if (!roomSnap.exists()) {
      return res.status(404).json({ success: false, error: "Ph\xF2ng kh\xF4ng t\u1ED3n t\u1EA1i" });
    }
    const room = normalizePokerRoom(roomSnap.val());
    if (room.round === "WAITING" || room.round === "SHOWDOWN") {
      return res.status(400).json({ success: false, error: "B\xE0n ch\u01A1i ch\u01B0a b\u1EAFt \u0111\u1EA7u l\u01B0\u1EE3t c\u01B0\u1EE3c" });
    }
    if (room.currentTurnSeat === null || room.seats[room.currentTurnSeat]?.uid !== uid) {
      return res.status(400).json({ success: false, error: "Ch\u01B0a t\u1EDBi l\u01B0\u1EE3t c\u1EE7a b\u1EA1n" });
    }
    const seat = room.seats[room.currentTurnSeat];
    const options = getBettingOptions({
      playerChips: seat.chips,
      playerCurrentBet: seat.currentBet,
      highestBetOnTable: room.highestBet,
      lastRaiseDelta: room.lastRaiseDelta,
      bigBlind: room.bigBlind,
      totalPot: room.pot
    });
    seat.consecutiveTimeouts = 0;
    if (action === "FOLD") {
      seat.folded = true;
      seat.lastAction = "B\u1ECE B\xC0I";
      seat.hasActed = true;
      room.logs = room.logs || [];
      room.logs.push(`\u{1F4A8} [${seat.name}] \u0111\xE3 b\u1ECF b\xE0i (Fold).`);
    } else if (action === "CHECK") {
      if (!options.canCheck) {
        return res.status(400).json({ success: false, error: "Kh\xF4ng th\u1EC3 Check khi c\xF3 ng\u01B0\u1EDDi c\u01B0\u1EE3c cao h\u01A1n" });
      }
      seat.lastAction = "CHECK";
      seat.hasActed = true;
      room.logs = room.logs || [];
      room.logs.push(`\u{1F44C} [${seat.name}] Check.`);
    } else if (action === "CALL") {
      if (!options.canCall) {
        return res.status(400).json({ success: false, error: "Kh\xF4ng th\u1EC3 Theo (Call)" });
      }
      const callDiff = options.callAmount;
      seat.chips -= callDiff;
      seat.currentBet += callDiff;
      seat.totalHandBet += callDiff;
      room.pot += callDiff;
      if (seat.chips === 0) seat.allIn = true;
      seat.lastAction = seat.allIn ? "ALL-IN" : `THEO ${callDiff.toLocaleString()}`;
      seat.hasActed = true;
      room.logs = room.logs || [];
      room.logs.push(`\u{1FA99} [${seat.name}] Theo ${callDiff.toLocaleString()} PP.`);
    } else if (action === "RAISE" || action === "ALL_IN") {
      const isAllInAction = action === "ALL_IN";
      const targetBet = isAllInAction ? options.maxRaiseTotal : Math.floor(Number(amount) || options.minRaiseTotal);
      if (targetBet < options.minRaiseTotal && targetBet !== options.maxRaiseTotal) {
        return res.status(400).json({
          success: false,
          error: `M\u1EE9c t\u1ED1 t\u1ED1i thi\u1EC3u l\xE0 ${options.minRaiseTotal.toLocaleString()} PP`
        });
      }
      if (targetBet > options.maxRaiseTotal) {
        return res.status(400).json({ success: false, error: "S\u1ED1 chip kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 t\u1ED1 m\u1EE9c n\xE0y" });
      }
      const raiseDiff = targetBet - seat.currentBet;
      seat.chips -= raiseDiff;
      seat.currentBet = targetBet;
      seat.totalHandBet += raiseDiff;
      room.pot += raiseDiff;
      const delta = targetBet - room.highestBet;
      if (delta > room.lastRaiseDelta) {
        room.lastRaiseDelta = delta;
      }
      room.highestBet = targetBet;
      if (seat.chips === 0) seat.allIn = true;
      seat.lastAction = seat.allIn ? `ALL-IN ${targetBet.toLocaleString()}` : `T\u1ED0 ${targetBet.toLocaleString()}`;
      seat.hasActed = true;
      room.logs = room.logs || [];
      room.logs.push(`\u{1F525} [${seat.name}] ${seat.allIn ? "ALL-IN" : "T\u1ED1 l\xEAn"} ${targetBet.toLocaleString()} PP.`);
    } else {
      return res.status(400).json({ success: false, error: "H\xE0nh \u0111\u1ED9ng kh\xF4ng h\u1EE3p l\u1EC7" });
    }
    await advancePokerGame(db2, roomId, room, executePPTransaction2);
    res.json({ success: true });
  });
  router.post("/check_timeout", async (req, res) => {
    const { roomId } = req.body;
    const roomSnap = await dbGet(db2, `poker_rooms/${roomId}`);
    if (!roomSnap.exists()) {
      return res.status(404).json({ success: false, error: "Ph\xF2ng kh\xF4ng t\u1ED3n t\u1EA1i" });
    }
    const room = normalizePokerRoom(roomSnap.val());
    if (room.round === "WAITING" || room.round === "SHOWDOWN" || room.currentTurnSeat === null) {
      return res.json({ success: true, message: "Kh\xF4ng c\xF3 l\u01B0\u1EE3t \u0111ang ch\u1EDD" });
    }
    if (Date.now() < room.actionExpiry) {
      return res.json({ success: true, remaining: room.actionExpiry - Date.now() });
    }
    const seat = room.seats[room.currentTurnSeat];
    if (!seat) {
      await advancePokerGame(db2, roomId, room, executePPTransaction2);
      return res.json({ success: true });
    }
    const options = getBettingOptions({
      playerChips: seat.chips,
      playerCurrentBet: seat.currentBet,
      highestBetOnTable: room.highestBet,
      lastRaiseDelta: room.lastRaiseDelta,
      bigBlind: room.bigBlind,
      totalPot: room.pot
    });
    seat.consecutiveTimeouts = (seat.consecutiveTimeouts || 0) + 1;
    if (options.canCheck) {
      seat.lastAction = "CHECK (H\u1EBFt gi\u1EDD)";
      seat.hasActed = true;
      room.logs = room.logs || [];
      room.logs.push(`\u23F0 [${seat.name}] h\u1EBFt gi\u1EDD, t\u1EF1 \u0111\u1ED9ng Check.`);
    } else {
      seat.folded = true;
      seat.lastAction = "B\u1ECE B\xC0I (H\u1EBFt gi\u1EDD)";
      seat.hasActed = true;
      room.logs = room.logs || [];
      room.logs.push(`\u23F0 [${seat.name}] h\u1EBFt gi\u1EDD, t\u1EF1 \u0111\u1ED9ng B\u1ECF b\xE0i.`);
    }
    if (seat.consecutiveTimeouts >= 3 && !seat.isAI) {
      const refund = seat.chips || 0;
      if (refund > 0) {
        await executePPTransaction2(seat.uid, refund);
        await recordPokerTransaction(db2, seat.uid, refund, `T\u1EF1 \u0111\u1ED9ng ho\xE0n tr\u1EA3 chip do v\u1EAFng m\u1EB7t 3 l\u01B0\u1EE3t (B\xE0n #${roomId})`);
      }
      room.logs.push(`\u26A0\uFE0F [${seat.name}] b\u1ECB \u0111\u1EA9y kh\u1ECFi b\xE0n do v\u1EAFng m\u1EB7t 3 l\u01B0\u1EE3t li\xEAn ti\u1EBFp.`);
      seat.folded = true;
      seat.left = true;
      seat.chips = 0;
    }
    await advancePokerGame(db2, roomId, room, executePPTransaction2);
    res.json({ success: true });
  });
  router.post("/emote", async (req, res) => {
    const { roomId, uid, sessionToken, emote } = req.body;
    const auth = await verifyUserSession(db2, uid, sessionToken);
    if (!auth.ok) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    const ALLOWED_EMOTES = ["\u{1F44D}", "\u{1F602}", "\u{1F631}", "\u{1F525}", "\u{1F60E}", "\u{1F62D}", "GG", "\u23F0"];
    if (!ALLOWED_EMOTES.includes(emote)) {
      return res.status(400).json({ success: false, error: "Bi\u1EC3u t\u01B0\u1EE3ng kh\xF4ng h\u1EE3p l\u1EC7" });
    }
    const roomSnap = await dbGet(db2, `poker_rooms/${roomId}`);
    if (!roomSnap.exists()) {
      return res.status(404).json({ success: false, error: "Ph\xF2ng kh\xF4ng t\u1ED3n t\u1EA1i" });
    }
    const room = normalizePokerRoom(roomSnap.val());
    const seat = room.seats.find((s) => s?.uid === uid);
    if (!seat) {
      return res.status(403).json({ success: false, error: "B\u1EA1n kh\xF4ng ng\u1ED3i trong b\xE0n n\xE0y" });
    }
    const lastEmote = room.emotes?.[uid];
    const now = Date.now();
    if (lastEmote && now - lastEmote.timestamp < 3e3) {
      return res.status(429).json({ success: false, error: "Vui l\xF2ng ch\u1EDD 3 gi\xE2y tr\u01B0\u1EDBc khi g\u1EEDi ti\u1EBFp" });
    }
    await dbSet(db2, `poker_rooms/${roomId}/emotes/${uid}`, { emote, timestamp: now });
    res.json({ success: true, emote, timestamp: now });
  });
  return router;
}

// server.ts
import_dotenv.default.config();
var app = (0, import_express2.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(import_express2.default.json());
var firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "AIzaSyCfrD1iS1yjfjuaPIKvGb-iWcirBg1lXJE",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "appsinhvien-24482.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || "https://appsinhvien-24482-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "appsinhvien-24482"
};
var fApp = (0, import_app.initializeApp)(firebaseConfig);
var db = (0, import_database2.getDatabase)(fApp);
var adminDb = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    if ((0, import_app2.getApps)().length === 0) {
      const sa = typeof process.env.FIREBASE_SERVICE_ACCOUNT === "string" && process.env.FIREBASE_SERVICE_ACCOUNT.trim().startsWith("{") ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : process.env.FIREBASE_SERVICE_ACCOUNT;
      (0, import_app2.initializeApp)({
        credential: (0, import_app2.cert)(sa),
        databaseURL: firebaseConfig.databaseURL
      });
    }
    adminDb = (0, import_database3.getDatabase)();
    console.log("[Firebase Admin] Initialized Firebase Admin SDK successfully");
  } else {
    console.log("[Firebase Admin] Running in client SDK mode (no service account credential)");
  }
} catch (err) {
  console.warn("[Firebase Admin] Note: Service account initialization failed, falling back to client SDK:", err?.message || err);
  adminDb = null;
}
var ai = null;
function getGeminiClient() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined in environment variables.");
    }
    ai = new import_genai.GoogleGenAI({
      apiKey: key || "MOCK_KEY_FOR_DEV",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return ai;
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    rtdbConnected: !!db,
    env: process.env.NODE_ENV || "development"
  });
});
app.post("/api/gemini/tutor", async (req, res) => {
  const { question, subject, studentStats } = req.body;
  try {
    const client = getGeminiClient();
    const systemPrompt = `B\u1EA1n l\xE0 AI Gia S\u01B0 h\u1ECDc \u0111\u01B0\u1EDDng th\xF4ng minh c\u1EE7a tr\u01B0\u1EDDng AYK MAIN 8686. 
Nhi\u1EC7m v\u1EE5: gi\u1EA3i th\xEDch ki\u1EBFn th\u1EE9c, b\xE0i t\u1EADp h\u1ECDc ph\u1EA7n "${subject || "\u0110\u1EA1i C\u01B0\u01A1ng"}" cho h\u1ECDc sinh/sinh vi\xEAn.
Ch\u1EC9 s\u1ED1 h\u1ECDc l\u1EF1c: C\u1EA7n C\xF9 (${studentStats?.[0] || 50}), Tr\xED Tu\u1EC7 (${studentStats?.[1] || 50}), Nh\xE2n Ph\u1EA9m (${studentStats?.[4] || 50}).
H\xE3y gi\u1EA3i th\xEDch s\xFAc t\xEDch, d\u1EC5 hi\u1EC3u, kh\xEDch l\u1EC7 tinh th\u1EA7n h\u1ECDc thu\u1EADt, d\xF9ng Markdown r\xF5 r\xE0ng.`;
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: question,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7
      }
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error?.message || "C\xF3 l\u1ED7i khi g\u1ECDi Gemini API" });
  }
});
app.post("/api/gemini/chat", async (req, res) => {
  const { message } = req.body;
  try {
    const client = getGeminiClient();
    const systemPrompt = `B\u1EA1n l\xE0 AYK 8686 Core AI - Tr\u1EE3 l\xFD th\xF4ng minh tr\u01B0\u1EDDng h\u1ECDc AYK MAIN 8686.
H\u1ED7 tr\u1EE3 sinh vi\xEAn v\u1EC1 th\xF4ng tin l\u1EDBp h\u1ECDc, h\u1ECDc b\u1ED5ng PP, thi \u0111ua h\u1ECDc t\u1EADp v\xE0 r\xE8n luy\u1EC7n k\u1EF9 n\u0103ng. Tr\u1EA3 l\u1EDDi b\u1EB1ng ti\u1EBFng Vi\u1EC7t, l\u1ECBch s\u1EF1, th\xE2n thi\u1EC7n, d\xF9ng Markdown \u0111\u1EB9p.`;
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8
      }
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error?.message || "C\xF3 l\u1ED7i khi k\u1EBFt n\u1ED1i AI" });
  }
});
async function executePPTransaction(uid, delta, minBalance = 0) {
  let previousValue = 0;
  let finalValue = 0;
  let existingPP = 0;
  try {
    const snap = await (0, import_database2.get)((0, import_database2.ref)(db, `users/${uid}/pp`));
    if (snap.exists()) {
      existingPP = Number(snap.val()) || 0;
    } else {
      const uSnap = await (0, import_database2.get)((0, import_database2.ref)(db, `users/${uid}`));
      if (uSnap.exists()) {
        existingPP = Number(uSnap.val()?.pp) || 0;
      } else {
        existingPP = 1e5;
      }
    }
  } catch (e) {
    existingPP = 1e5;
  }
  if (adminDb) {
    try {
      const ppRef2 = adminDb.ref(`users/${uid}/pp`);
      const txResult = await ppRef2.transaction((currentPP) => {
        const balance = currentPP === null ? existingPP : Number(currentPP);
        previousValue = balance;
        if (delta < 0 && balance + delta < minBalance) {
          return void 0;
        }
        finalValue = balance + delta;
        return finalValue;
      });
      if (!txResult.committed) {
        return { success: false, oldPP: previousValue, newPP: previousValue, error: "S\u1ED1 d\u01B0 PP kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 tham gia b\xE0n" };
      }
      return { success: true, oldPP: previousValue, newPP: finalValue };
    } catch (err) {
      console.warn(`[Admin PP Transaction for ${uid} fell back to client]:`, err?.message || err);
    }
  }
  const ppRef = (0, import_database2.ref)(db, `users/${uid}/pp`);
  try {
    const txResult = await (0, import_database2.runTransaction)(ppRef, (currentPP) => {
      const balance = currentPP === null ? existingPP : Number(currentPP);
      previousValue = balance;
      if (delta < 0 && balance + delta < minBalance) {
        return void 0;
      }
      finalValue = balance + delta;
      return finalValue;
    });
    if (!txResult.committed) {
      return { success: false, oldPP: previousValue, newPP: previousValue, error: "S\u1ED1 d\u01B0 PP kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 tham gia b\xE0n" };
    }
    return { success: true, oldPP: previousValue, newPP: finalValue };
  } catch (err) {
    console.error(`[TX Error for ${uid}]:`, err);
    return { success: false, oldPP: 0, newPP: 0, error: err?.message || "L\u1ED7i x\u1EED l\xFD giao d\u1ECBch m\xE1y ch\u1EE7" };
  }
}
app.post("/api/game/roll", async (req, res) => {
  const { uid, game, betAmount, choice, clientMeta } = req.body;
  if (!uid || typeof betAmount !== "number" || betAmount <= 0) {
    return res.status(400).json({ success: false, error: "Th\xF4ng tin c\u01B0\u1EE3c kh\xF4ng h\u1EE3p l\u1EC7" });
  }
  const MAX_BET = 5e4;
  const sanitizedBet = Math.min(Math.floor(betAmount), MAX_BET);
  try {
    const userRef = (0, import_database2.ref)(db, `users/${uid}`);
    const userSnap = await (0, import_database2.get)(userRef);
    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, error: "T\xE0i kho\u1EA3n kh\xF4ng t\u1ED3n t\u1EA1i" });
    }
    const userData = userSnap.val();
    if (userData.locked) {
      return res.status(403).json({ success: false, error: "T\xE0i kho\u1EA3n \u0111ang b\u1ECB kh\xF3a" });
    }
    let won = false;
    let multiplier = 0;
    let outcomeDetails = {};
    let resultSummary = "";
    if (game === "taixiu") {
      const d1 = import_crypto2.default.randomInt(1, 7);
      const d2 = import_crypto2.default.randomInt(1, 7);
      const d3 = import_crypto2.default.randomInt(1, 7);
      const total = d1 + d2 + d3;
      const isTai = total >= 11 && total <= 17;
      const isXiu = total >= 4 && total <= 10;
      const isTriple = d1 === d2 && d2 === d3;
      outcomeDetails = { dices: [d1, d2, d3], total, isTriple };
      if (!isTriple && (choice === "TAI" && isTai || choice === "XIU" && isXiu)) {
        won = true;
        multiplier = 2;
        resultSummary = `Th\u1EAFng c\u1EEDa ${choice} (${total} \u0111i\u1EC3m)`;
      } else {
        won = false;
        multiplier = 0;
        resultSummary = isTriple ? `B\u1ED9 3 \u0111\u1ED3ng nh\u1EA5t (${d1}-${d2}-${d3}) - Nh\xE0 c\xE1i th\u1EAFng` : `Thua c\u01B0\u1EE3c (${total} \u0111i\u1EC3m - ${isTai ? "T\xC0I" : "X\u1EC8U"})`;
      }
    } else if (game === "penalty") {
      const target = choice || import_crypto2.default.randomInt(0, 4);
      const gkDive = import_crypto2.default.randomInt(0, 4);
      won = target !== gkDive;
      multiplier = won ? 1.95 : 0;
      outcomeDetails = { target, gkDive, isGoal: won };
      resultSummary = won ? "Ghi b\xE0n xu\u1EA5t s\u1EAFc! +PP" : "Th\u1EE7 m\xF4n c\u1EA3n ph\xE1 th\xE0nh c\xF4ng!";
    } else if (game === "airplane" || game === "crash") {
      const r = import_crypto2.default.randomInt(1, 10001) / 1e4;
      const crashPoint = Math.max(1, parseFloat((0.96 / (1 - r * 0.93)).toFixed(2)));
      outcomeDetails = { crashPoint };
      const requestedMultiplier = parseFloat(choice) || 1.5;
      if (requestedMultiplier <= crashPoint) {
        won = true;
        multiplier = requestedMultiplier;
        resultSummary = `Nh\u1EA3y d\xF9 th\xE0nh c\xF4ng \u1EDF m\u1ED1c x${requestedMultiplier}`;
      } else {
        won = false;
        multiplier = 0;
        resultSummary = `T\xE0u v\u0169 tr\u1EE5 n\u1ED5 \u1EDF x${crashPoint}`;
      }
    } else if (game === "rps") {
      const choices = ["rock", "paper", "scissors"];
      const serverPick = choices[import_crypto2.default.randomInt(0, 3)];
      const userPick = String(choice).toLowerCase();
      let outcome = "draw";
      if (userPick === serverPick) {
        outcome = "draw";
        multiplier = 1;
        won = true;
      } else if (userPick === "rock" && serverPick === "scissors" || userPick === "paper" && serverPick === "rock" || userPick === "scissors" && serverPick === "paper") {
        outcome = "win";
        multiplier = 2;
        won = true;
      } else {
        outcome = "lose";
        multiplier = 0;
        won = false;
      }
      outcomeDetails = { userPick, serverPick, outcome };
      resultSummary = outcome === "win" ? "Th\u1EAFng o\u1EB3n t\xF9 t\xEC" : outcome === "draw" ? "H\xF2a o\u1EB3n t\xF9 t\xEC" : "Thua o\u1EB3n t\xF9 t\xEC";
    } else {
      const randVal = import_crypto2.default.randomInt(0, 2);
      won = randVal === 1;
      multiplier = won ? 2 : 0;
      outcomeDetails = { outcome: won ? "WIN" : "LOSE" };
      resultSummary = won ? "Chi\u1EBFn th\u1EAFng mini-game" : "Ch\u01B0a may m\u1EAFn";
    }
    const payout = won ? Math.floor(sanitizedBet * multiplier) : 0;
    const pnl = payout - sanitizedBet;
    const tx = await executePPTransaction(uid, pnl);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || "Giao d\u1ECBch th\u1EA5t b\u1EA1i" });
    }
    const timestamp = Date.now();
    const logRef = (0, import_database2.ref)(db, "game_logs");
    await (0, import_database2.push)(logRef, {
      uid,
      name: userData.name || "Sinh Vi\xEAn",
      game,
      bet: sanitizedBet,
      pnl,
      payout,
      outcomeDetails,
      result: resultSummary,
      time: (/* @__PURE__ */ new Date()).toLocaleString("vi-VN"),
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
  } catch (err) {
    console.error("[Game Roll Server Error]:", err);
    res.status(500).json({ success: false, error: err?.message || "L\u1ED7i x\u1EED l\xFD k\u1EBFt qu\u1EA3 tr\xF2 ch\u01A1i" });
  }
});
app.post("/api/missions/claim", async (req, res) => {
  const { uid, missionId, rewardPP = 1e3 } = req.body;
  if (!uid || !missionId) {
    return res.status(400).json({ success: false, error: "Thi\u1EBFu th\xF4ng tin nh\u1EADn th\u01B0\u1EDFng" });
  }
  const sanitizedReward = Math.min(Math.max(500, Math.floor(rewardPP)), 1e4);
  try {
    const claimRecordRef = (0, import_database2.ref)(db, `users/${uid}/claimedMissions/${missionId}`);
    const claimSnap = await (0, import_database2.get)(claimRecordRef);
    if (claimSnap.exists()) {
      return res.status(400).json({ success: false, error: "Nhi\u1EC7m v\u1EE5 n\xE0y \u0111\xE3 nh\u1EADn th\u01B0\u1EDFng h\xF4m nay" });
    }
    const tx = await executePPTransaction(uid, sanitizedReward);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || "L\u1ED7i c\u1ED9ng \u0111i\u1EC3m th\u01B0\u1EDFng" });
    }
    await (0, import_database2.set)(claimRecordRef, {
      claimedAt: Date.now(),
      rewardPP: sanitizedReward
    });
    res.json({
      success: true,
      reward: sanitizedReward,
      newPP: tx.newPP
    });
  } catch (err) {
    console.error("[Mission Claim Server Error]:", err);
    res.status(500).json({ success: false, error: err?.message || "L\u1ED7i nh\u1EADn th\u01B0\u1EDFng" });
  }
});
app.post("/api/wheel/spin", async (req, res) => {
  const { uid } = req.body;
  if (!uid) {
    return res.status(400).json({ success: false, error: "Y\xEAu c\u1EA7u UID ng\u01B0\u1EDDi d\xF9ng" });
  }
  const SPIN_COST = 5e3;
  const PRIZES = [
    { label: "500 PP", pp: 500, weight: 35 },
    { label: "2,000 PP", pp: 2e3, weight: 25 },
    { label: "5,000 PP (Ho\xE0n ti\u1EC1n)", pp: 5e3, weight: 20 },
    { label: "10,000 PP", pp: 1e4, weight: 12 },
    { label: "25,000 PP", pp: 25e3, weight: 6 },
    { label: "50,000 PP (JACKPOT)", pp: 5e4, weight: 2 }
  ];
  try {
    const deductTx = await executePPTransaction(uid, -SPIN_COST);
    if (!deductTx.success) {
      return res.status(400).json({ success: false, error: "S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7 5,000 PP \u0111\u1EC3 quay th\u01B0\u1EDFng" });
    }
    const randWeight = import_crypto2.default.randomInt(1, 101);
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
    const creditTx = await executePPTransaction(uid, selectedPrize.pp);
    res.json({
      success: true,
      prizeIndex,
      prize: selectedPrize,
      cost: SPIN_COST,
      pnl: selectedPrize.pp - SPIN_COST,
      newPP: creditTx.newPP
    });
  } catch (err) {
    console.error("[Wheel Spin Server Error]:", err);
    res.status(500).json({ success: false, error: err?.message || "L\u1ED7i quay v\xF2ng quay may m\u1EAFn" });
  }
});
app.post("/api/rewards/award", async (req, res) => {
  const { uid, type = "generic", amount = 0, message = "Ph\u1EA7n th\u01B0\u1EDFng h\u1EC7 th\u1ED1ng" } = req.body;
  if (!uid || typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ success: false, error: "Th\xF4ng tin nh\u1EADn th\u01B0\u1EDFng kh\xF4ng h\u1EE3p l\u1EC7" });
  }
  const sanitizedAmount = Math.min(Math.floor(amount), 5e5);
  try {
    const tx = await executePPTransaction(uid, sanitizedAmount);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || "L\u1ED7i c\u1ED9ng \u0111i\u1EC3m th\u01B0\u1EDFng" });
    }
    await (0, import_database2.push)((0, import_database2.ref)(db, "transactions"), {
      sender: "SYSTEM_REWARDS",
      senderName: "H\u1EC7 Th\u1ED1ng Ph\u1EA7n Th\u01B0\u1EDFng AYK",
      receiver: uid,
      amount: sanitizedAmount,
      message: `${message} (${type})`,
      time: (/* @__PURE__ */ new Date()).toLocaleString("vi-VN"),
      timestamp: Date.now()
    });
    res.json({
      success: true,
      amount: sanitizedAmount,
      newPP: tx.newPP
    });
  } catch (err) {
    console.error("[Reward Award Error]:", err);
    res.status(500).json({ success: false, error: err?.message || "L\u1ED7i x\u1EED l\xFD ph\u1EA7n th\u01B0\u1EDFng m\xE1y ch\u1EE7" });
  }
});
app.post("/api/bank/transfer", async (req, res) => {
  const { senderUid, receiverId, amount } = req.body;
  if (!senderUid || !receiverId || typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ success: false, error: "D\u1EEF li\u1EC7u chuy\u1EC3n kho\u1EA3n kh\xF4ng h\u1EE3p l\u1EC7" });
  }
  const cleanAmount = Math.floor(amount);
  if (senderUid === receiverId) {
    return res.status(400).json({ success: false, error: "Kh\xF4ng th\u1EC3 t\u1EF1 chuy\u1EC3n kho\u1EA3n cho ch\xEDnh m\xECnh" });
  }
  try {
    const recSnap = await (0, import_database2.get)((0, import_database2.ref)(db, `users/${receiverId}`));
    if (!recSnap.exists()) {
      return res.status(404).json({ success: false, error: "Ng\u01B0\u1EDDi nh\u1EADn kh\xF4ng t\u1ED3n t\u1EA1i tr\xEAn h\u1EC7 th\u1ED1ng" });
    }
    const deductTx = await executePPTransaction(senderUid, -cleanAmount);
    if (!deductTx.success) {
      return res.status(400).json({ success: false, error: deductTx.error || "S\u1ED1 d\u01B0 PP kh\xF4ng \u0111\u1EE7" });
    }
    const creditTx = await executePPTransaction(receiverId, cleanAmount);
    if (!creditTx.success) {
      await executePPTransaction(senderUid, cleanAmount);
      return res.status(500).json({ success: false, error: "L\u1ED7i ghi nh\u1EADn ph\xEDa ng\u01B0\u1EDDi nh\u1EADn, \u0111\xE3 ho\xE0n ti\u1EC1n" });
    }
    const logRef = (0, import_database2.ref)(db, "transactions");
    await (0, import_database2.push)(logRef, {
      sender: senderUid,
      receiver: receiverId,
      amount: cleanAmount,
      timestamp: Date.now(),
      time: (/* @__PURE__ */ new Date()).toLocaleString("vi-VN")
    });
    res.json({
      success: true,
      amount: cleanAmount,
      senderNewPP: deductTx.newPP
    });
  } catch (err) {
    console.error("[Bank Transfer Error]:", err);
    res.status(500).json({ success: false, error: err?.message || "L\u1ED7i h\u1EC7 th\u1ED1ng chuy\u1EC3n kho\u1EA3n" });
  }
});
app.post("/api/admin/adjust-pp", async (req, res) => {
  const { adminUid, targetUid, amount } = req.body;
  if (!adminUid || !targetUid || typeof amount !== "number") {
    return res.status(400).json({ success: false, error: "D\u1EEF li\u1EC7u y\xEAu c\u1EA7u kh\xF4ng h\u1EE3p l\u1EC7" });
  }
  try {
    const adminSnap = await (0, import_database2.get)((0, import_database2.ref)(db, `users/${adminUid}`));
    const isAdmin = adminSnap.exists() && (adminSnap.val().role === "ADMIN" || adminSnap.val().role === "TEACHER");
    const adminNodeSnap = await (0, import_database2.get)((0, import_database2.ref)(db, `admins/${adminUid}`));
    const isNodeAdmin = adminNodeSnap.exists() && adminNodeSnap.val() === true;
    if (!isAdmin && !isNodeAdmin) {
      return res.status(403).json({ success: false, error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB vi\xEAn" });
    }
    const tx = await executePPTransaction(targetUid, Math.floor(amount), 0);
    if (!tx.success) {
      return res.status(400).json({ success: false, error: tx.error || "L\u1ED7i c\u1EADp nh\u1EADt s\u1ED1 d\u01B0" });
    }
    res.json({
      success: true,
      targetUid,
      oldPP: tx.oldPP,
      newPP: tx.newPP,
      delta: amount
    });
  } catch (err) {
    console.error("[Admin Adjust PP Error]:", err);
    res.status(500).json({ success: false, error: err?.message || "L\u1ED7i m\xE1y ch\u1EE7 khi \u0111i\u1EC1u ch\u1EC9nh PP" });
  }
});
app.post("/api/auth/migrate-legacy", async (req, res) => {
  const { uid } = req.body;
  if (!uid) {
    return res.status(400).json({ success: false, error: "Thi\u1EBFu UID" });
  }
  res.json({ success: true, message: "\u0110\xE3 \u0111\u1ED3ng b\u1ED9 tr\u1EA1ng th\xE1i b\u1EA3o m\u1EADt" });
});
app.use("/api/poker", setupPokerRouter(db, executePPTransaction, adminDb));
var setupVite = async () => {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express2.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
};
setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AYK MAIN 8686] Server is running on http://0.0.0.0:${PORT}`);
  });
});
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Texas Hold'em Poker Pure Engine
 * Independent of React and Firebase
 * Covers card representation, 10 hand rankings (VN + EN),
 * 5-of-7 card evaluation, side pot calculation, and betting mechanics.
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Texas Hold'em Advanced AI Engine
 * 100% Fair, Zero-Cheating: Only uses public board cards and own 2 hole cards.
 * Features:
 * - Positional preflop ranges
 * - 2,000+ Monte Carlo simulations for accurate equity estimation
 * - Pot odds & SPR (Stack-to-Pot Ratio) calculation
 * - Dynamic C-bet, semi-bluffing with draws, thin value betting, and balanced bluffs
 * - 4 distinct AI personalities (TAG, LAG, NIT, TRICKY)
 * - Opponent stats tracking (VPIP, PFR, Aggression)
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Texas Hold'em Poker Server Controller & Endpoints
 * Full-stack server authoritative state stored in Firebase Realtime Database
 * Secure PP transactions, SessionToken verification, ActionId idempotency
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
