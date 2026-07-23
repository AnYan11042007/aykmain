/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { ref, push, set, update } from 'firebase/database';
import { db } from '../firebase';

export interface AIBot {
  id: string;
  name: string;
  avatar: string;
  level: number;
  title: string;
}

export const AI_BOTS: AIBot[] = [
  { id: 'bot_1', name: '🐉 Thần Bài Sài Gòn', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot1', level: 45, title: 'Bá Chủ Đặt Cược' },
  { id: 'bot_2', name: '🐽 Bé Heo Xinh', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot2', level: 18, title: 'Thánh Soi Cầu' },
  { id: 'bot_3', name: '💎 Đại Gia Quận 1', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot3', level: 88, title: 'Đại Gia S88' },
  { id: 'bot_4', name: '🔥 Nam Cương 88', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot4', level: 32, title: 'Vua Phi Thuyền' },
  { id: 'bot_5', name: '👑 Hoàng Tử Lắc Bát', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot5', level: 60, title: 'Cao Thủ Nặn Bát' },
  { id: 'bot_6', name: '🎯 Thánh Soi Cầu', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot6', level: 27, title: 'Chủ Lô Đề' },
  { id: 'bot_7', name: '🚀 Pro_Hunter_99', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot7', level: 50, title: 'Thợ Săn Rồng' },
  { id: 'bot_8', name: '⚡ Bá Chủ Tài Xỉu', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot8', level: 75, title: 'Trùm Bão Bát' },
  { id: 'bot_9', name: '🐉 Cửu Long Vương', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot9', level: 99, title: 'Huyền Thoại Casino' },
  { id: 'bot_10', name: '🌸 Bé Miu Miu', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot10', level: 12, title: 'Tân Thủ Mắn Lộc' }
];

const AI_CHAT_MESSAGES = [
  "Anh em ơi Tài tiếng này chắc như đinh đóng cột! 🎲🔥",
  "Vừa cất cánh Phi Thuyền húp x8.50 ngon ơ 🚀💸",
  "Bá Chủ Rồng Thần vừa xuất hiện bên Đấu Trường Săn Thú kìa ae ơi!",
  "Tiếng này theo Xỉu gấp đôi tay gỡ lại lẹ ⚡",
  "Hôm nay sảnh S88 nổ hũ đậm quá ae ơi 🎉",
  "Đại gia nào húp hũ bão 150x đỉnh vậy khao chè đê!",
  "Anh em ai đánh sút phạt penalty không gánh kèo với",
  "Chào cả nhà S88 nhé, chúc ae nổ hũ rực rỡ!",
  "Xỉu 3 con 1 nổ Bão húp trọn 150x sướng rên 🎰",
  "Trận này rồng thần chảy nhiều máu quá ae tập trung dồn dame QTE!",
  "Mới nạp thẻ x2 lộc quất nốt tay Tài cuối nghỉ đêm",
  "Lên Phi Thuyền cất cánh x10.00 nhảy dù an toàn rồi nhé ae",
  "S88 nạp rút nhanh vãi chưởng chưa đầy 5s đã ting ting",
  "Chiến thần bắn cá khu 3 vừa diệt xong Rồng Thần Cổ Đại 🐉"
];

const GAME_NAMES = ['Tài Xỉu', 'Phi Thuyền', 'Đi Săn Bắn Cá', 'Sút Phạt 3D'];

export default function AIBotSimulation() {
  useEffect(() => {
    // 1. AI Betting Simulator (Runs every 8 - 14 seconds)
    const betInterval = setInterval(() => {
      const bot = AI_BOTS[Math.floor(Math.random() * AI_BOTS.length)];
      const game = GAME_NAMES[Math.floor(Math.random() * GAME_NAMES.length)];
      const isWin = Math.random() > 0.45;
      const amount = (Math.floor(Math.random() * 45) + 5) * 10000; // 50k to 500k PP
      const pnl = isWin ? Math.floor(amount * (1.2 + Math.random() * 2.5)) : -amount;

      // Log to game_logs in Firebase
      push(ref(db, 'game_logs'), {
        uid: bot.id,
        name: bot.name,
        game,
        bet: amount,
        pnl,
        result: isWin ? 'Thắng Cược' : 'Thua Cược',
        time: new Date().toLocaleTimeString('vi-VN'),
        timestamp: Date.now()
      }).catch(() => {});
    }, 10000);

    // 2. AI Chat Messages Simulator (Runs every 12 - 22 seconds)
    const chatInterval = setInterval(() => {
      const bot = AI_BOTS[Math.floor(Math.random() * AI_BOTS.length)];
      const text = AI_CHAT_MESSAGES[Math.floor(Math.random() * AI_CHAT_MESSAGES.length)];

      push(ref(db, 'global_chat'), {
        senderId: bot.id,
        senderName: bot.name,
        senderAvatar: bot.avatar,
        text,
        time: new Date().toLocaleTimeString('vi-VN'),
        timestamp: Date.now()
      }).catch(() => {});
    }, 15000);

    // 3. Dynamic Online AI Viewer Counter Fluctuation (Ranging from 10 to 500+ AI viewers)
    const onlineInterval = setInterval(() => {
      // Generate realistic viewer surge between 10 and 520
      const baseAIViewers = Math.floor(Math.random() * 490) + 15; // 15 to 505
      const onlineUpdates: { [key: string]: any } = {};

      // Register active 10 bots + dynamic viewer nodes in 'online' node
      AI_BOTS.forEach((b, idx) => {
        onlineUpdates[`bot_${idx}`] = {
          name: `${b.name} (${b.title})`,
          time: Date.now(),
          isAI: true
        };
      });

      // Add dynamic virtual viewers chunk
      for (let i = 0; i < Math.min(baseAIViewers, 30); i++) {
        onlineUpdates[`v_user_${i}`] = {
          name: `Khán Giả S88 #${1000 + i}`,
          time: Date.now(),
          isAI: true
        };
      }

      update(ref(db, 'online'), onlineUpdates).catch(() => {});
    }, 8000);

    return () => {
      clearInterval(betInterval);
      clearInterval(chatInterval);
      clearInterval(onlineInterval);
    };
  }, []);

  return null; // Invisible background simulation runner
}
