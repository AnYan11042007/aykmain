/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebase';
import { User } from '../types';
import { History, Coins, ArrowUpRight, ArrowDownRight, RefreshCw, Filter, Sparkles, ShieldCheck } from 'lucide-react';

interface TransactionHistoryPortalProps {
  uid: string;
  user: User | null;
}

export interface UnifiedTransactionItem {
  id: string;
  gameId: string;
  gameName: 'Tài Xỉu' | 'Phi Thuyền' | 'Đi Săn Bắn Cá' | 'Sút Phạt' | 'Chuyển Khoản' | 'Khác';
  amount: number;
  changePP: number; // Positive (+) for win, negative (-) for loss
  status: 'WIN' | 'LOSS' | 'TRANSFER' | 'BONUS';
  time: string;
  timestamp: number;
  details?: string;
}

export default function TransactionHistoryPortal({ uid, user }: TransactionHistoryPortalProps) {
  const [transactions, setTransactions] = useState<UnifiedTransactionItem[]>([]);
  const [filterGame, setFilterGame] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    // 1. Fetch Game Logs
    const gameLogsRef = query(ref(db, `game_logs/${uid}`), limitToLast(50));
    // 2. Fetch Direct Transactions
    const txRef = query(ref(db, 'transactions'), limitToLast(50));

    let loadedGameLogs: UnifiedTransactionItem[] = [];
    let loadedTxs: UnifiedTransactionItem[] = [];

    const unsubLogs = onValue(gameLogsRef, (snap) => {
      const data = snap.val() || {};
      loadedGameLogs = Object.entries(data).map(([key, val]: [string, any]) => {
        const isWin = val.isWin || val.win || val.profit > 0;
        const changePP = isWin ? Math.abs(val.payout || val.profit || val.amount || 0) : -Math.abs(val.betAmount || val.amount || 0);

        let gameName: UnifiedTransactionItem['gameName'] = 'Khác';
        if (val.game?.includes('TAI_XIU') || val.gameType === 'TAI_XIU') gameName = 'Tài Xỉu';
        else if (val.game?.includes('CRASH') || val.gameType === 'CRASH') gameName = 'Phi Thuyền';
        else if (val.game?.includes('HUNT') || val.gameType === 'HUNTING') gameName = 'Đi Săn Bắn Cá';
        else if (val.game?.includes('PENALTY')) gameName = 'Sút Phạt';

        return {
          id: key,
          gameId: val.gameId || `GM-${key.substring(1, 8).toUpperCase()}`,
          gameName,
          amount: Math.abs(val.betAmount || val.amount || 0),
          changePP,
          status: isWin ? 'WIN' : 'LOSS',
          time: val.time || (val.timestamp ? new Date(val.timestamp).toLocaleTimeString('vi-VN') : 'Mới đây'),
          timestamp: val.timestamp || Date.now(),
          details: val.details || val.resultStr || (isWin ? 'Thắng cược' : 'Thua cược')
        };
      });

      mergeAndSetHistory();
    });

    const unsubTx = onValue(txRef, (snap) => {
      const data = snap.val() || {};
      loadedTxs = Object.entries(data)
        .filter(([_, val]: [string, any]) => val.sender === uid || val.receiver === uid)
        .map(([key, val]: [string, any]) => {
          const isSender = val.sender === uid;
          const changePP = isSender ? -Math.abs(val.amount || 0) : Math.abs(val.amount || 0);

          let gameName: UnifiedTransactionItem['gameName'] = 'Chuyển Khoản';
          if (val.message?.includes('Bắn Cá') || val.message?.includes('Đi Săn')) gameName = 'Đi Săn Bắn Cá';

          return {
            id: key,
            gameId: `TX-${key.substring(1, 8).toUpperCase()}`,
            gameName,
            amount: val.amount || 0,
            changePP,
            status: changePP >= 0 ? 'BONUS' : 'TRANSFER',
            time: val.time || (val.timestamp ? new Date(val.timestamp).toLocaleTimeString('vi-VN') : 'Mới đây'),
            timestamp: val.timestamp || Date.now(),
            details: val.message || (isSender ? `Gửi tới ${val.receiverName}` : `Nhận từ ${val.senderName}`)
          };
        });

      mergeAndSetHistory();
    });

    const mergeAndSetHistory = () => {
      const combined = [...loadedGameLogs, ...loadedTxs];
      // Sort descending by timestamp
      combined.sort((a, b) => b.timestamp - a.timestamp);
      // Keep top 20
      setTransactions(combined.slice(0, 20));
      setIsLoading(false);
    };

    return () => {
      unsubLogs();
      unsubTx();
    };
  }, [uid]);

  const filteredHistory = transactions.filter((t) => {
    if (filterGame === 'ALL') return true;
    return t.gameName === filterGame;
  });

  const totalEarnings = transactions.reduce((sum, t) => sum + (t.changePP > 0 ? t.changePP : 0), 0);
  const totalSpent = transactions.reduce((sum, t) => sum + (t.changePP < 0 ? Math.abs(t.changePP) : 0), 0);

  return (
    <div className="space-y-6 font-mono">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-box p-4 border border-[#00f0ff]/30 bg-[#00f0ff]/5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Tổng PP Thắng (20 GD)</span>
            <strong className="text-[#00f0ff] font-extrabold text-base flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" /> +{totalEarnings.toLocaleString()} PP
            </strong>
          </div>
          <Coins className="w-8 h-8 text-[#00f0ff]/40" />
        </div>

        <div className="glass-box p-4 border border-red-500/30 bg-red-950/10 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Tổng PP Đã Đặt/Chuyển</span>
            <strong className="text-red-400 font-extrabold text-base flex items-center gap-1 mt-1">
              <ArrowDownRight className="w-4 h-4 text-red-500" /> -{totalSpent.toLocaleString()} PP
            </strong>
          </div>
          <Coins className="w-8 h-8 text-red-500/40" />
        </div>

        <div className="glass-box p-4 border border-amber-400/30 bg-amber-950/10 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Số Dư Hiện Tại</span>
            <strong className="text-[#ffd700] text-glow-gold font-extrabold text-base mt-1 block">
              {(user?.pp || 0).toLocaleString()} PP
            </strong>
          </div>
          <Sparkles className="w-8 h-8 text-amber-400/40" />
        </div>
      </div>

      {/* Filter Controls & Header */}
      <div className="glass-box p-4 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#00f0ff] animate-spin" />
          <h3 className="text-sm font-black uppercase text-white tracking-widest">
            LỊCH SỬ GIAO DỊCH & CƯỢC (20 GIAO DỊCH GẦN NHẤT)
          </h3>
        </div>

        {/* Filter dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterGame}
            onChange={(e) => setFilterGame(e.target.value)}
            className="bg-black/80 border border-white/20 text-xs font-bold text-cyan-300 py-1.5 px-3 rounded-xl outline-none focus:border-cyan-400"
          >
            <option value="ALL">TẤT CẢ GAME & GD</option>
            <option value="Tài Xỉu">🎲 TÀI XỈU</option>
            <option value="Phi Thuyền">🚀 PHI THUYỀN</option>
            <option value="Đi Săn Bắn Cá">🐉 ĐI SĂN BẮN CÁ</option>
            <option value="Sút Phạt">⚽ SÚT PHẠT</option>
            <option value="Chuyển Khoản">💸 CHUYỂN KHOẢN</option>
          </select>
        </div>
      </div>

      {/* Glass-morphism Transactions Table */}
      <div className="glass-box p-1 border border-white/10 rounded-2xl overflow-x-auto shadow-2xl">
        <table className="w-full text-left text-xs border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-black/60 border-b border-white/10 text-[10px] text-slate-400 uppercase tracking-widest">
              <th className="p-3.5">MÃ GAME / ID</th>
              <th className="p-3.5">DANH MỤC</th>
              <th className="p-3.5">SỐ TIỀN CƯỢC</th>
              <th className="p-3.5">KẾT QUẢ / BIẾN ĐỘNG PP</th>
              <th className="p-3.5">CHI TIẾT</th>
              <th className="p-3.5 text-right">THỜI GIAN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-sans text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500 font-mono">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                  Đang đồng bộ dữ liệu giao dịch từ Server Firebase...
                </td>
              </tr>
            ) : filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500 font-mono">
                  Chưa có lịch sử cược hoặc giao dịch phù hợp.
                </td>
              </tr>
            ) : (
              filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-all">
                  <td className="p-3.5 font-mono font-bold text-cyan-300 text-[11px]">
                    {item.gameId}
                  </td>
                  <td className="p-3.5 font-mono font-bold">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] border ${
                      item.gameName === 'Tài Xỉu' ? 'border-yellow-400/40 text-yellow-300 bg-yellow-950/20' :
                      item.gameName === 'Phi Thuyền' ? 'border-purple-400/40 text-purple-300 bg-purple-950/20' :
                      item.gameName === 'Đi Săn Bắn Cá' ? 'border-cyan-400/40 text-cyan-300 bg-cyan-950/20' :
                      item.gameName === 'Sút Phạt' ? 'border-emerald-400/40 text-emerald-300 bg-emerald-950/20' :
                      'border-white/20 text-slate-300 bg-black/40'
                    }`}>
                      {item.gameName}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono font-black text-white">
                    {item.amount.toLocaleString()} PP
                  </td>
                  <td className="p-3.5 font-mono font-extrabold">
                    {item.changePP >= 0 ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ArrowUpRight className="w-4 h-4 shrink-0" /> +{item.changePP.toLocaleString()} PP
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1">
                        <ArrowDownRight className="w-4 h-4 shrink-0" /> {item.changePP.toLocaleString()} PP
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-300 font-medium text-[11px]">
                    {item.details}
                  </td>
                  <td className="p-3.5 font-mono text-[10px] text-slate-400 text-right">
                    {item.time}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
