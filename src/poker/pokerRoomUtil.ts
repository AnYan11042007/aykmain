/**
 * Helpers for (de)serialising poker rooms to Firebase Realtime Database.
 *
 * RTDB quirks this works around:
 *  - empty arrays are not stored, so `board: []` comes back as `undefined`
 *  - `null` array slots are dropped (trailing ones disappear entirely)
 *  - `undefined` property values make `set()` / `update()` throw
 */
import type { PokerRoom, PokerSeat } from '../types';

export const POKER_SEAT_COUNT = 5;

function toArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === 'object') return Object.values(v as Record<string, T>);
  return [];
}

/** Rebuild a room read from RTDB so every array field is a real array and seats has exactly 5 slots. */
export function normalizePokerRoom<T extends Partial<PokerRoom> | null | undefined>(raw: T): T {
  if (!raw) return raw;
  const room: any = raw;
  const seats: (PokerSeat | null)[] = [];
  const src = room.seats;
  for (let i = 0; i < POKER_SEAT_COUNT; i++) {
    const s = Array.isArray(src) ? src[i] : src && typeof src === 'object' ? src[i] : null;
    seats.push(s ? (s as PokerSeat) : null);
  }
  room.seats = seats;
  room.board = toArray<string>(room.board);
  room.logs = toArray<string>(room.logs);
  room.winners = toArray(room.winners);
  room.revealedCards = room.revealedCards || {};
  room.pot = room.pot || 0;
  room.highestBet = room.highestBet || 0;
  room.currentTurnSeat = typeof room.currentTurnSeat === 'number' ? room.currentTurnSeat : null;
  return room;
}

/** Strip `undefined` values (JSON round trip) and cap the log length so the node never bloats. */
export function serializePokerRoom(room: PokerRoom): PokerRoom {
  const copy: PokerRoom = { ...room, logs: (room.logs || []).slice(-60) };
  return JSON.parse(JSON.stringify(copy));
}
