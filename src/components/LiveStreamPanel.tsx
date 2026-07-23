/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { get, ref, push, update, onValue } from 'firebase/database';
import { db } from '../firebase';
import { User } from '../types';
import { 
  Tv, Users, Send, Coins, Flame, Trophy, Play, Info, AlertCircle, 
  Sparkles, Volume2, Compass, Maximize2, Minimize2, ExternalLink, X, HelpCircle, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LiveStreamPanelProps {
  uid: string;
  user: User | null;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

type GameType = 'taixiu' | 'crash' | 'penalty' | 'horse' | 'claw' | 'fcmobile' | 'dragontiger';

const BOT_NAMES = [
  'ĐạiGiaQuận1', 'HọcThầnS88', 'LắcKinhKông', 'ThầnBàiĐấtCảng', 
  'HípPro99', 'BạchThủLô', 'KiềuNữBếnTre', 'MạnhThườngQuân',
  'CậuCảHảiPhòng', 'CòBayLả', 'TùngSơnBóngĐá', 'LuffyXìDách',
  'HeoConLonTon', 'DũngSĩGồngLãi', 'ThầyHuấnDạyVăn', 'GiaCátDự'
];

const BOT_COMMENTS: Record<GameType, string[]> = {
  taixiu: [
    'Cầu bệt Tài đẹp quá anh em ơi, tất tay thôi!',
    'Mới bẻ cầu Xỉu xong, ván này chắc chắn Xỉu nha ae.',
    'Lắc mạnh tay lên chị dealer xinh đẹp ơi 🎲',
    'Vừa ăn quả Tài húp ngọt xớt.',
    'U là trời, bão 3 hột 1 kìa, khóc thét 😭',
    'Nhà cái quả này húp trọn rồi.',
    'Gia đình đang yên ấm bỗng chuyển sang Xỉu',
    'Sếp Tùng vừa vào 50k Tài kìa, uy tín luôn',
    'Cầu 2-2 rõ như ban ngày.',
    'Lót dép ngồi xem các cao thủ xuống xác.'
  ],
  crash: [
    'Ván trước bay lên x18 mới nổ, đỉnh chóp!',
    'Tầm này gồng tới x3 là ấm rồi ae.',
    'Nhảy dù sớm cho an toàn, tham thì thâm.',
    'Ối giời ơi vừa bấm cược chưa kịp bay đã nổ x1.02, cay thế!',
    'Không chiến sinh tử gồng lãi đỉnh cao quá!',
    'Gồng x50 giàu sang luôn.',
    'Tên lửa này chạy bằng cơm hay sao bay khỏe thế!',
    'Rút sớm ăn chắc mặc bền ae ạ.',
    'Kỷ lục ván trước ai gồng x88 không?',
    'Mạnh mẽ lên phi thuyền ơi, vút bay nào 🚀'
  ],
  penalty: [
    'Thủ môn đội bạn hôm nay ngáo ngơ quá, cứ sút góc trái là vào.',
    'Thần sút phạt ván này nhắm góc cao bên phải nhé!',
    'Đặt vào TRƯỢT kiếm cơm cháo qua ngày thôi.',
    'Sút căng đét lủng lưới đối phương luôn!',
    'Ối giời ơi thủ môn bay người như chim bắt được bóng kìa 🦅',
    'Cổ vũ ván này vào lưới rinh Jackpot.',
    'Góc chết hiểm hóc thế ai mà đỡ nổi.',
    'Trọng tài bắt thiên vị quá nha haha.',
    'Bắn chim rồi tiền đạo ơi 🤣',
    'Khán đài đang cháy hết mình cổ vũ!'
  ],
  horse: [
    'Ván này con số 3 chạy bốc lắm ae ơi!',
    'Ngựa số 1 nãy giờ toàn về chót, ván này bốc đầu nha 🐎',
    'Tất tay ngựa số 4 đi anh em ơi!',
    'Thần mã số 2 hôm nay sải bước đẹp quá!',
    'Trại ngựa Hoàng Gia ván này nhộn nhịp ghê.',
    'Hóng cúp vô địch về tay ngựa số 3 🏆'
  ],
  claw: [
    'Gấu bông mập ú nu thế kia gắp kiểu gì trời 😂',
    'Để ý gắp kỳ lân x10 kìa anh em ơi!',
    'Máy này càng lỏng lẻo lắm, canh trượt thôi cho chắc.',
    'Úi tí nữa thì húp được em rồng lửa!',
    'Gắp trúng đi nàooo, em thích con thỏ hồng quá 🐰',
    'Kỹ năng gắp thượng thừa đây rồi!'
  ],
  fcmobile: [
    'Đội Xanh hôm nay đá sơ đồ 4-3-3 tấn công rực lửa!',
    'Đặt cửa Hòa x4 thơm phức nha ae.',
    'Đỏ vừa sút dội xà ngang tiếc thế!',
    'Tin tay Đội Đỏ lội ngược dòng ngoạn mục nào ⚽',
    'Sân vận động Arena hôm nay đông khán giả ghê.',
    'Hàng thủ đội Xanh chơi như mơ ngủ 🤣'
  ],
  dragontiger: [
    'Cầu Rồng đang chạy dài kìa anh em, theo Rồng thôi 🐉',
    'Hổ bứt phá ván này chắc chắn rồi!',
    'Lót Hòa x8 ăn đậm quá sướng tê người 🐯',
    'Rồng với Hổ đấu nhau dữ dội ghê.',
    'Dealer chia bài mượt mà quá sếp ơi!',
    'Em đặt Hổ 20k hên xui xem thế nào.'
  ]
};

const getSoccerSimulation = (elapsed: number, blueScore: number, redScore: number) => {
  if (elapsed < 0) {
    return {
      players: [
        { id: 'b_gk', team: 'blue', label: 'GK', name: 'Filip N.', number: 1, x: 8, y: 50 },
        { id: 'b_df1', team: 'blue', label: 'DF', name: 'Quế Hải', number: 3, x: 25, y: 30 },
        { id: 'b_df2', team: 'blue', label: 'DF', name: 'Duy Mạnh', number: 4, x: 25, y: 70 },
        { id: 'b_mf', team: 'blue', label: 'MF', name: 'Quang Hải', number: 19, x: 45, y: 50 },
        { id: 'b_fw1', team: 'blue', label: 'FW', name: 'Tiến Linh', number: 22, x: 65, y: 30 },
        { id: 'b_fw2', team: 'blue', label: 'FW', name: 'Tuấn Hải', number: 10, x: 65, y: 70 },
        { id: 'r_gk', team: 'red', label: 'GK', name: 'Đ. Văn Lâm', number: 23, x: 92, y: 50 },
        { id: 'r_df1', team: 'red', label: 'DF', name: 'Việt Anh', number: 20, x: 75, y: 30 },
        { id: 'r_df2', team: 'red', label: 'DF', name: 'Thanh Bình', number: 6, x: 75, y: 70 },
        { id: 'r_mf', team: 'red', label: 'MF', name: 'Hoàng Đức', number: 14, x: 55, y: 50 },
        { id: 'r_fw1', team: 'red', label: 'FW', name: 'Công Phượng', number: 16, x: 35, y: 30 },
        { id: 'r_fw2', team: 'red', label: 'FW', name: 'Văn Toàn', number: 9, x: 35, y: 70 },
      ],
      ball: { x: 50, y: 50 },
      action: 'KHỞI ĐỘNG 🏃‍♂️',
      activePlayerId: null,
      commentary: 'Bình luận viên Anh Quân: Hai đội đang khởi động trên sân Arena. Trận đấu sắp bắt đầu!'
    };
  }

  // Segment 90 seconds into 9 play cycles of 10s each
  const cycleDuration = 10;
  const cycleIndex = Math.floor(elapsed / cycleDuration);
  const cycleTime = elapsed % cycleDuration;
  
  const isBlueAttacking = cycleIndex % 2 === 0;

  // Predict if cycle leads to goal/save/miss
  let isGoal = false;
  let isShotSaved = false;
  let isShotMissed = false;

  if (isBlueAttacking) {
    const goalThreshold = cycleIndex === 0 ? 1 : cycleIndex === 2 ? 1 : cycleIndex === 4 ? 2 : cycleIndex === 6 ? 2 : 3;
    if (blueScore >= goalThreshold) {
      isGoal = true;
    } else {
      isShotSaved = cycleIndex % 4 === 0;
      isShotMissed = !isShotSaved;
    }
  } else {
    const goalThreshold = cycleIndex === 1 ? 1 : cycleIndex === 3 ? 1 : cycleIndex === 5 ? 2 : cycleIndex === 7 ? 2 : 3;
    if (redScore >= goalThreshold) {
      isGoal = true;
    } else {
      isShotSaved = cycleIndex % 3 === 0;
      isShotMissed = !isShotSaved;
    }
  }

  const pMap: Record<string, { x: number; y: number }> = {};
  
  const baseBlue = {
    gk: { x: 8, y: 50 },
    df1: { x: 25, y: 28 },
    df2: { x: 25, y: 72 },
    mf: { x: 45, y: 50 },
    fw1: { x: 65, y: 28 },
    fw2: { x: 65, y: 72 },
  };

  const baseRed = {
    gk: { x: 92, y: 50 },
    df1: { x: 75, y: 28 },
    df2: { x: 75, y: 72 },
    mf: { x: 55, y: 50 },
    fw1: { x: 35, y: 28 },
    fw2: { x: 35, y: 72 },
  };

  const osc = (freq: number, ampX: number, ampY: number) => {
    return {
      x: Math.sin(elapsed * freq) * ampX,
      y: Math.cos(elapsed * (freq + 0.2)) * ampY,
    };
  };

  pMap.b_gk = { x: baseBlue.gk.x, y: baseBlue.gk.y + Math.sin(elapsed * 2) * 5 };
  if (!isBlueAttacking && cycleTime > 6 && (isGoal || isShotSaved)) {
    const targetY = 32 + (cycleIndex % 3) * 18;
    pMap.b_gk.x = baseBlue.gk.x + (cycleTime - 6) * 3;
    pMap.b_gk.y = baseBlue.gk.y + (targetY - baseBlue.gk.y) * Math.min(1, (cycleTime - 6) / 2.5);
  }

  pMap.r_gk = { x: baseRed.gk.x, y: baseRed.gk.y + Math.sin(elapsed * 2) * 5 };
  if (isBlueAttacking && cycleTime > 6 && (isGoal || isShotSaved)) {
    const targetY = 32 + (cycleIndex % 3) * 18;
    pMap.r_gk.x = baseRed.gk.x - (cycleTime - 6) * 3;
    pMap.r_gk.y = baseRed.gk.y + (targetY - baseRed.gk.y) * Math.min(1, (cycleTime - 6) / 2.5);
  }

  const bDF1o = osc(1.1, 4, 6);
  pMap.b_df1 = { x: baseBlue.df1.x + bDF1o.x, y: baseBlue.df1.y + bDF1o.y };
  
  const bDF2o = osc(1.3, 4, 6);
  pMap.b_df2 = { x: baseBlue.df2.x + bDF2o.x, y: baseBlue.df2.y + bDF2o.y };
  
  const bMFo = osc(1.5, 8, 8);
  pMap.b_mf = { x: baseBlue.mf.x + bMFo.x, y: baseBlue.mf.y + bMFo.y };
  
  const bFW1o = osc(1.7, 10, 10);
  pMap.b_fw1 = { x: baseBlue.fw1.x + bFW1o.x, y: baseBlue.fw1.y + bFW1o.y };
  
  const bFW2o = osc(1.9, 10, 10);
  pMap.b_fw2 = { x: baseBlue.fw2.x + bFW2o.x, y: baseBlue.fw2.y + bFW2o.y };

  const rDF1o = osc(1.2, 4, 6);
  pMap.r_df1 = { x: baseRed.df1.x + rDF1o.x, y: baseRed.df1.y + rDF1o.y };
  
  const rDF2o = osc(1.4, 4, 6);
  pMap.r_df2 = { x: baseRed.df2.x + rDF2o.x, y: baseRed.df2.y + rDF2o.y };
  
  const rMFo = osc(1.6, 8, 8);
  pMap.r_mf = { x: baseRed.mf.x + rMFo.x, y: baseRed.mf.y + rMFo.y };
  
  const rFW1o = osc(1.8, 10, 10);
  pMap.r_fw1 = { x: baseRed.fw1.x + rFW1o.x, y: baseRed.fw1.y + rFW1o.y };
  
  const rFW2o = osc(2.0, 10, 10);
  pMap.r_fw2 = { x: baseRed.fw2.x + rFW2o.x, y: baseRed.fw2.y + rFW2o.y };

  let ballX = 50;
  let ballY = 50;
  let actionText = 'CHUYỀN BÓNG';
  let activePlayerId = '';
  let commentaryText = '';

  if (isBlueAttacking) {
    if (cycleTime < 2.5) {
      const t = cycleTime / 2.5;
      const start = pMap.b_df1;
      const end = pMap.b_mf;
      ballX = start.x + (end.x - start.x) * t;
      ballY = start.y + (end.y - start.y) * t;
      actionText = 'CHUYỀN BÓNG 🎯';
      activePlayerId = 'b_df1';
      commentaryText = 'Anh Quân: Quế Hải chuyền bóng ngắn cực sắc nét, triển khai tấn công nhanh từ phần sân nhà.';
    } else if (cycleTime < 5.0) {
      const t = (cycleTime - 2.5) / 2.5;
      const start = pMap.b_mf;
      const targetFw = cycleIndex % 4 === 0 ? 'b_fw1' : 'b_fw2';
      const end = pMap[targetFw];
      ballX = start.x + (end.x - start.x) * t;
      ballY = start.y + (end.y - start.y) * t;
      
      const presser = cycleIndex % 4 === 0 ? 'r_df1' : 'r_df2';
      pMap[presser].x = ballX + 4;
      pMap[presser].y = ballY + Math.sin(cycleTime * 10) * 3;

      actionText = 'ĐỘT PHÁ ⚡';
      activePlayerId = 'b_mf';
      commentaryText = `Anh Quân: Quang Hải đột phá trung lộ, đảo chân đánh lừa hậu vệ đối phương tuyệt hay!`;
    } else if (cycleTime < 7.0) {
      const t = (cycleTime - 5.0) / 2.0;
      const shooter = cycleIndex % 4 === 0 ? 'b_fw1' : 'b_fw2';
      ballX = pMap[shooter].x + Math.sin(cycleTime * 10) * 1.5;
      ballY = pMap[shooter].y + Math.cos(cycleTime * 10) * 1.5;

      const presser = cycleIndex % 4 === 0 ? 'r_df1' : 'r_df2';
      pMap[presser].x = pMap[shooter].x - 2;
      pMap[presser].y = pMap[shooter].y;

      actionText = 'HÃM BÓNG & DỨT ĐIỂM! 💥';
      activePlayerId = shooter;
      commentaryText = `Anh Quân: Cơ hội dứt điểm dồn dập! Tiến Linh đỡ ngực khéo léo rồi tung chân sút cực nhanh!`;
    } else if (cycleTime < 8.5) {
      const t = (cycleTime - 7.0) / 1.5;
      const shooter = cycleIndex % 4 === 0 ? 'b_fw1' : 'b_fw2';
      const start = pMap[shooter];
      
      const targetGoalY = 38 + (cycleIndex % 3) * 12;
      const end = { x: 97, y: targetGoalY };
      
      ballX = start.x + (end.x - start.x) * t;
      ballY = start.y + (end.y - start.y) * t;

      actionText = 'SÚT BANH!!! ⚽🔥';
      activePlayerId = shooter;
      commentaryText = 'Anh Quân: CÚ SÚT SẤM SÉT!!! Bóng đi xoáy cuộn hiểm hóc găm thẳng về phía khung thành!';
    } else {
      if (isGoal) {
        ballX = 99;
        ballY = 42 + (cycleIndex % 3) * 8;
        actionText = 'VÀOOOOOO!!! 🏟️🎉';
        commentaryText = 'Anh Quân: VÀOOOOOO!!! SIÊU PHẨM KHÔNG THỂ CẢN PHÁ!!! Khán đài nổ tung trong ngập tràn niềm vui!';
      } else if (isShotSaved) {
        ballX = pMap.r_gk.x - 2;
        ballY = pMap.r_gk.y;
        actionText = 'CỨU THUA XUẤT SẮC! 🧤';
        activePlayerId = 'r_gk';
        commentaryText = 'Anh Quân: KHÔNG VÀO!!! Đặng Văn Lâm đổ người cản phá chuẩn chỉ đến từng mili giây!';
      } else {
        ballX = 99;
        ballY = 15 + (cycleIndex % 2) * 70;
        actionText = 'SÚT TRỆCH CỘT 😢';
        commentaryText = 'Anh Quân: TIẾC QUÁ!!! Bóng sượt xà ngang đi ra ngoài trong gang tấc!';
      }
    }
  } else {
    if (cycleTime < 2.5) {
      const t = cycleTime / 2.5;
      const start = pMap.r_df1;
      const end = pMap.r_mf;
      ballX = start.x + (end.x - start.x) * t;
      ballY = start.y + (end.y - start.y) * t;
      actionText = 'CHUYỀN BÓNG 🎯';
      activePlayerId = 'r_df1';
      commentaryText = 'Anh Quân: Việt Anh dũng mãnh thu hồi bóng, thực hiện đường chuyền chuẩn xác cho Hoàng Đức.';
    } else if (cycleTime < 5.0) {
      const t = (cycleTime - 2.5) / 2.5;
      const start = pMap.r_mf;
      const targetFw = cycleIndex % 3 === 0 ? 'r_fw1' : 'r_fw2';
      const end = pMap[targetFw];
      ballX = start.x + (end.x - start.x) * t;
      ballY = start.y + (end.y - start.y) * t;

      const presser = cycleIndex % 3 === 0 ? 'b_df1' : 'b_df2';
      pMap[presser].x = ballX - 4;
      pMap[presser].y = ballY + Math.sin(cycleTime * 10) * 3;

      actionText = 'XẢO QUYỆT ĐỘT PHÁ ⚡';
      activePlayerId = 'r_mf';
      commentaryText = 'Anh Quân: Hoàng Đức đi bóng lắt léo vượt qua sự áp sát quyết liệt, mở bóng sang biên!';
    } else if (cycleTime < 7.0) {
      const t = (cycleTime - 5.0) / 2.0;
      const shooter = cycleIndex % 3 === 0 ? 'r_fw1' : 'r_fw2';
      ballX = pMap[shooter].x - Math.sin(cycleTime * 10) * 1.5;
      ballY = pMap[shooter].y + Math.cos(cycleTime * 10) * 1.5;

      const presser = cycleIndex % 3 === 0 ? 'b_df1' : 'b_df2';
      pMap[presser].x = pMap[shooter].x + 2;
      pMap[presser].y = pMap[shooter].y;

      actionText = 'ĐÁNH ĐẦU / SÚT NGAY! 💥';
      activePlayerId = shooter;
      commentaryText = 'Anh Quân: Văn Toàn bứt tốc xé gió, hãm bóng một nhịp dứt điểm dũng mãnh!';
    } else if (cycleTime < 8.5) {
      const t = (cycleTime - 7.0) / 1.5;
      const shooter = cycleIndex % 3 === 0 ? 'r_fw1' : 'r_fw2';
      const start = pMap[shooter];
      
      const targetGoalY = 38 + (cycleIndex % 3) * 12;
      const end = { x: 3, y: targetGoalY };
      
      ballX = start.x + (end.x - start.x) * t;
      ballY = start.y + (end.y - start.y) * t;

      actionText = 'SÚT BANH CĂNG THẲNG! ⚽🔥';
      activePlayerId = shooter;
      commentaryText = 'Anh Quân: NGUY HIỂM!!! Cú sút chìm góc hẹp vô cùng căng và hiểm hóc!';
    } else {
      if (isGoal) {
        ballX = 1;
        ballY = 42 + (cycleIndex % 3) * 8;
        actionText = 'VÀOOOOOO!!! 🏟️🎉';
        commentaryText = 'Anh Quân: VÀOOOOOO!!! Lưới của đội Xanh rung lên bần bật! Thủ môn hoàn toàn bó tay!';
      } else if (isShotSaved) {
        ballX = pMap.b_gk.x + 2;
        ballY = pMap.b_gk.y;
        actionText = 'THỦ MÔN CỨU THUA! 🧤';
        activePlayerId = 'b_gk';
        commentaryText = 'Anh Quân: CỨU THUA ĐẲNG CẤP!!! Filip Nguyễn bay người đấm bóng giải nguy tuyệt vời!';
      } else {
        ballX = 1;
        ballY = 15 + (cycleIndex % 2) * 70;
        actionText = 'BÓNG CHỆCH CỘT 😢';
        commentaryText = 'Anh Quân: KHÔNG VÀO!!! Bóng ăn hơi nhiều ra má ngoài dội thẳng ra biên!';
      }
    }
  }

  const finalPlayers = [
    { id: 'b_gk', team: 'blue', label: 'GK', name: 'Filip N.', number: 1, ...pMap.b_gk },
    { id: 'b_df1', team: 'blue', label: 'DF', name: 'Quế Hải', number: 3, ...pMap.b_df1 },
    { id: 'b_df2', team: 'blue', label: 'DF', name: 'Duy Mạnh', number: 4, ...pMap.b_df2 },
    { id: 'b_mf', team: 'blue', label: 'MF', name: 'Quang Hải', number: 19, ...pMap.b_mf },
    { id: 'b_fw1', team: 'blue', label: 'FW', name: 'Tiến Linh', number: 22, ...pMap.b_fw1 },
    { id: 'b_fw2', team: 'blue', label: 'FW', name: 'Tuấn Hải', number: 10, ...pMap.b_fw2 },
    { id: 'r_gk', team: 'red', label: 'GK', name: 'Đ. Văn Lâm', number: 23, ...pMap.r_gk },
    { id: 'r_df1', team: 'red', label: 'DF', name: 'Việt Anh', number: 20, ...pMap.r_df1 },
    { id: 'r_df2', team: 'red', label: 'DF', name: 'Thanh Bình', number: 6, ...pMap.r_df2 },
    { id: 'r_mf', team: 'red', label: 'MF', name: 'Hoàng Đức', number: 14, ...pMap.r_mf },
    { id: 'r_fw1', team: 'red', label: 'FW', name: 'Công Phượng', number: 16, ...pMap.r_fw1 },
    { id: 'r_fw2', team: 'red', label: 'FW', name: 'Văn Toàn', number: 9, ...pMap.r_fw2 },
  ];

  return {
    players: finalPlayers,
    ball: { x: ballX, y: ballY },
    action: actionText,
    activePlayerId,
    commentary: commentaryText
  };
};

// Get synchronized outcomes based on cycle index
const getSyncResultForCycle = (cycleId: number, type: GameType) => {
  try {
    const cheat = localStorage.getItem('s88_cheat_' + type + '_' + cycleId);
    if (cheat) return JSON.parse(cheat);
  } catch(e) {}

  let currentSeed = cycleId * 12345.678;
  const rand = () => {
    const x = Math.sin(currentSeed + Math.cos(currentSeed * 2.3)) * 10000;
    currentSeed += 9.876543;
    return x - Math.floor(x);
  };
  
  const r1 = rand();
  const r2 = rand();
  const r3 = rand();
  
  if (type === 'taixiu') {
    const d1 = Math.floor(r1 * 6) + 1;
    const d2 = Math.floor(r2 * 2.1) + Math.floor(r3 * 3) + 1;
    const d3 = Math.floor((r1 + r2) * 3) % 6 + 1;
    const d1f = d1 < 1 ? 1 : d1 > 6 ? 6 : d1;
    const d2f = d2 < 1 ? 1 : d2 > 6 ? 6 : d2;
    const d3f = d3 < 1 ? 1 : d3 > 6 ? 6 : d3;
    return { dices: [d1f, d2f, d3f] };
  } else if (type === 'crash') {
    const baseChance = r1;
    let mult = 1.0;
    if (baseChance < 0.1) {
      mult = 1.0 + baseChance * 2;
    } else if (baseChance < 0.8) {
      mult = 1.2 + (baseChance - 0.1) * 3;
    } else {
      mult = 3.3 + Math.pow((baseChance - 0.8) * 10, 2.5);
    }
    return parseFloat(Math.min(mult, 88.8).toFixed(2));
  } else if (type === 'penalty') {
    const strikerTarget = Math.floor(r1 * 5);
    const goalieDive = Math.floor(r2 * 5);
    const isGoal = strikerTarget !== goalieDive && r3 > 0.12;
    return { target: strikerTarget, dive: goalieDive, isGoal };
  } else if (type === 'horse') {
    const winner = Math.floor(r1 * 4) + 1;
    return { winner };
  } else if (type === 'claw') {
    const success = r1 > 0.70; // 30% win chance
    const prizeIndex = Math.floor(r2 * 5);
    return { success, prizeIndex };
  } else if (type === 'dragontiger') {
    const suits = ['♠', '♣', '♦', '♥'];
    const dVal = Math.floor(r1 * 13) + 1; // 1-13
    const tVal = Math.floor(r2 * 13) + 1; // 1-13
    const dSuit = suits[Math.floor(r3 * 4)];
    const tSuit = suits[Math.floor((r1 + r2) * 2) % 4];
    return { dragonVal: dVal, dragonSuit: dSuit, tigerVal: tVal, tigerSuit: tSuit };
  } else {
    // fcmobile score
    const bS = Math.floor(r1 * 3);
    const rS = Math.floor(r2 * 3);
    return { blueScore: bS, redScore: rS };
  }
};

export default function LiveStreamPanel({ uid, user, onShowResult }: LiveStreamPanelProps) {
  const [activeTab, setActiveTab] = useState<GameType>('taixiu');
  const [betChoice, setBetChoice] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>('');
  const [activeViewerCount, setActiveViewerCount] = useState<number>(195);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [chatInput, setChatInput] = useState<string>('');
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  
  // Custom states for free-form Admin Cheating
  const [cheatTxDie1, setCheatTxDie1] = useState<number>(6);
  const [cheatTxDie2, setCheatTxDie2] = useState<number>(6);
  const [cheatTxDie3, setCheatTxDie3] = useState<number>(6);
  const [cheatCrashPointInput, setCheatCrashPointInput] = useState<string>('5.00');
  const [cheatPenTarget, setCheatPenTarget] = useState<number>(0);
  const [cheatPenDive, setCheatPenDive] = useState<number>(1);
  const [cheatPenGoal, setCheatPenGoal] = useState<boolean>(true);
  const [cheatClawSuccess, setCheatClawSuccess] = useState<boolean>(true);
  const [cheatClawPrize, setCheatClawPrize] = useState<number>(2);
  const [cheatFcBlueScore, setCheatFcBlueScore] = useState<number>(2);
  const [cheatFcRedScore, setCheatFcRedScore] = useState<number>(1);
  const [cheatDtDragonVal, setCheatDtDragonVal] = useState<number>(10);
  const [cheatDtTigerVal, setCheatDtTigerVal] = useState<number>(5);
  const [cheatDtDragonSuit, setCheatDtDragonSuit] = useState<string>('♥');
  const [cheatDtTigerSuit, setCheatDtTigerSuit] = useState<string>('♠');
  
  // Realtime messages restricted strictly to latest 10 messages for neatness
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; message: string; isUser?: boolean; isSystem?: boolean; time: string }>>([]);

  const [isAdminMode, setIsAdminMode] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyH') {
        setIsAdminMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  
  // Track Picture-in-Picture mode
  const [isPipActive, setIsPipActive] = useState<boolean>(() => {
    return localStorage.getItem('s88_live_pip_active') === 'true';
  });

  // AI User Chat Simulation
  useEffect(() => {
    const chatTemplates = [
      "Ván này vào cửa nào anh em?",
      "Vãi, bẻ cầu rồi",
      "All in anh em ơi!",
      "Nhà cái nay dễ bắt bài",
      "Ván sau x2 lên",
      "Thôi nghỉ thôi",
      "Vừa ăn to xong haha",
      "Sao lag thế nhỉ",
      "Game mượt ghê",
      "Thằng kia đánh láo thật",
      "Cửa này sáng này",
      "Sợ thật, hên quá",
      "Lại về bờ rồi",
      "Mới nạp thêm 50k",
      "Chốt lời nào"
    ];

    const chatInterval = setInterval(() => {
      if (Math.random() < 0.6) {
        const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        const msg = chatTemplates[Math.floor(Math.random() * chatTemplates.length)];
        const now = new Date();
        const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        setChatMessages(prev => {
          const newMsg = { sender: bot, message: msg, time, isBot: true };
          const updated = [...prev, newMsg];
          return updated.slice(-10); // Strictly limit to last 10
        });
      }
    }, 3000);

    return () => clearInterval(chatInterval);
  }, []);


  const [currentBetPlaced, setCurrentBetPlaced] = useState<{
    cycleId: number;
    amount: number;
    choice: string;
    evaluated: boolean;
    game: GameType;
  } | null>(null);

  const [hasCashedOut, setHasCashedOut] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Live real-time scrolling bets list
  interface LiveBet {
    sender: string;
    amount: number;
    choice: string;
    isUser?: boolean;
    isBot?: boolean;
  }
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);

  // User 20 Betting History Tab State
  const [betsBoardTab, setBetsBoardTab] = useState<'LIVE' | 'HISTORY'>('LIVE');
  const [userGameHistory, setUserGameHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!uid) return;
    const logsRef = ref(db, 'game_logs');
    const unsubscribe = onValue(logsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const logsArray = Object.values(data)
          .filter((item: any) => item.uid === uid)
          .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))
          .slice(0, 20); // Max 20 history
        setUserGameHistory(logsArray);
      }
    });
    return () => unsubscribe();
  }, [uid]);

  // Game Engine Duration Constants (Synced perfectly with LiveCasinoStream)
  const txCycleDuration = 35000;
  const txBettingSecs = 20;
  const txShakingSecs = 4;
  const txRevealSecs = 6;

  const txCycleId = Math.floor(currentTime / txCycleDuration);
  const txTimeElapsed = currentTime % txCycleDuration;
  const txSecondsElapsed = txTimeElapsed / 1000;

  let txPhase: 'BETTING' | 'SHAKING' | 'REVEAL' | 'COOLDOWN' = 'BETTING';
  let txTimerText = '';
  let txCountdown = 0;

  if (txSecondsElapsed < txBettingSecs) {
    txPhase = 'BETTING';
    txCountdown = Math.ceil(txBettingSecs - txSecondsElapsed);
    txTimerText = `Nhận cược: ${txCountdown}s`;
  } else if (txSecondsElapsed < txBettingSecs + txShakingSecs) {
    txPhase = 'SHAKING';
    txTimerText = 'Dealer đang lắc hũ...';
  } else if (txSecondsElapsed < txBettingSecs + txShakingSecs + txRevealSecs) {
    txPhase = 'REVEAL';
    txTimerText = 'Đang mở bát!';
  } else {
    txPhase = 'COOLDOWN';
    txCountdown = Math.ceil(txCycleDuration / 1000 - txSecondsElapsed);
    txTimerText = `Chuẩn bị ván mới: ${txCountdown}s`;
  }

  const crashCycleDuration = 30000;
  const crashBettingSecs = 10;
  const crashFlightSecs = 15;

  const crashCycleId = Math.floor(currentTime / crashCycleDuration);
  const crashTimeElapsed = currentTime % crashCycleDuration;
  const crashSecondsElapsed = crashTimeElapsed / 1000;

  let crashPhase: 'BETTING' | 'FLIGHT' | 'COOLDOWN' = 'BETTING';
  let crashTimerText = '';
  let crashCountdown = 0;

  if (crashSecondsElapsed < crashBettingSecs) {
    crashPhase = 'BETTING';
    crashCountdown = Math.ceil(crashBettingSecs - crashSecondsElapsed);
    crashTimerText = `Đặt cược: ${crashCountdown}s`;
  } else if (crashSecondsElapsed < crashBettingSecs + crashFlightSecs) {
    crashPhase = 'FLIGHT';
    crashTimerText = 'PHI THUYỀN ĐANG BAY!';
  } else {
    crashPhase = 'COOLDOWN';
    crashCountdown = Math.ceil(crashCycleDuration / 1000 - crashSecondsElapsed);
    crashTimerText = `Chuẩn bị phóng: ${crashCountdown}s`;
  }

  const penCycleDuration = 40000;
  const penBettingSecs = 25;
  const penShootingSecs = 5;

  const penCycleId = Math.floor(currentTime / penCycleDuration);
  const penTimeElapsed = currentTime % penCycleDuration;
  const penSecondsElapsed = penTimeElapsed / 1000;


  let penPhase: 'BETTING' | 'SHOOTING' | 'COOLDOWN' = 'BETTING';
  let penTimerText = '';
  let penCountdown = 0;

  if (penSecondsElapsed < penBettingSecs) {
    penPhase = 'BETTING';
    penCountdown = Math.ceil(penBettingSecs - penSecondsElapsed);
    penTimerText = `Nhận cược: ${penCountdown}s`;
  } else if (penSecondsElapsed < penBettingSecs + penShootingSecs) {
    penPhase = 'SHOOTING';
    penTimerText = 'Cầu thủ chuẩn bị sút...';
  } else {
    penPhase = 'COOLDOWN';
    penCountdown = Math.ceil(penCycleDuration / 1000 - penSecondsElapsed);
    penTimerText = `Lượt sút tiếp theo: ${penCountdown}s`;
  }

  // --- HORSE RACING ---
  const horseCycleDuration = 35000;
  const horseBettingSecs = 15;
  const horseRacingSecs = 15;
  const horseCycleId = Math.floor(currentTime / horseCycleDuration);
  const horseTimeElapsed = currentTime % horseCycleDuration;
  const horseSecondsElapsed = horseTimeElapsed / 1000;
  let horsePhase: 'BETTING' | 'RACING' | 'COOLDOWN' = 'BETTING';
  let horseCountdown = 0;
  let horseTimerText = '';
  if (horseSecondsElapsed < horseBettingSecs) {
    horsePhase = 'BETTING';
    horseCountdown = Math.ceil(horseBettingSecs - horseSecondsElapsed);
    horseTimerText = `Nhận cược: ${horseCountdown}s`;
  } else if (horseSecondsElapsed < horseBettingSecs + horseRacingSecs) {
    horsePhase = 'RACING';
    horseTimerText = 'Cuộc đua đang diễn ra...';
  } else {
    horsePhase = 'COOLDOWN';
    horseCountdown = Math.ceil(horseCycleDuration / 1000 - horseSecondsElapsed);
    horseTimerText = `Chờ ván mới: ${horseCountdown}s`;
  }

  // --- CLAW MACHINE ---
  const clawCycleDuration = 25000;
  const clawBettingSecs = 10;
  const clawDroppingSecs = 10;
  const clawCycleId = Math.floor(currentTime / clawCycleDuration);
  const clawTimeElapsed = currentTime % clawCycleDuration;
  const clawSecondsElapsed = clawTimeElapsed / 1000;
  let clawPhase: 'BETTING' | 'DROPPING' | 'COOLDOWN' = 'BETTING';
  let clawCountdown = 0;
  let clawTimerText = '';
  if (clawSecondsElapsed < clawBettingSecs) {
    clawPhase = 'BETTING';
    clawCountdown = Math.ceil(clawBettingSecs - clawSecondsElapsed);
    clawTimerText = `Nhận cược: ${clawCountdown}s`;
  } else if (clawSecondsElapsed < clawBettingSecs + clawDroppingSecs) {
    clawPhase = 'DROPPING';
    clawTimerText = 'Máy đang gắp thú...';
  } else {
    clawPhase = 'COOLDOWN';
    clawCountdown = Math.ceil(clawCycleDuration / 1000 - clawSecondsElapsed);
    clawTimerText = `Chờ lượt tiếp theo: ${clawCountdown}s`;
  }

  // --- FC MOBILE ---
  const fcCycleDuration = 110000;
  const fcBettingSecs = 15;
  const fcPlayingSecs = 90;
  const fcCycleId = Math.floor(currentTime / fcCycleDuration);
  const fcTimeElapsed = currentTime % fcCycleDuration;
  const fcSecondsElapsed = fcTimeElapsed / 1000;
  let fcPhase: 'BETTING' | 'PLAYING' | 'COOLDOWN' = 'BETTING';
  let fcCountdown = 0;
  let fcTimerText = '';
  if (fcSecondsElapsed < fcBettingSecs) {
    fcPhase = 'BETTING';
    fcCountdown = Math.ceil(fcBettingSecs - fcSecondsElapsed);
    fcTimerText = `Nhận cược: ${fcCountdown}s`;
  } else if (fcSecondsElapsed < fcBettingSecs + fcPlayingSecs) {
    fcPhase = 'PLAYING';
    fcTimerText = 'Trận đấu đang diễn ra...';
  } else {
    fcPhase = 'COOLDOWN';
    fcCountdown = Math.ceil(fcCycleDuration / 1000 - fcSecondsElapsed);
    fcTimerText = `Chờ ván mới: ${fcCountdown}s`;
  }

  // --- DRAGON TIGER ---
  const dtCycleDuration = 25000; // 25 seconds
  const dtBettingSecs = 10;
  const dtRevealSecs = 7;
  const dtCycleId = Math.floor(currentTime / dtCycleDuration);
  const dtTimeElapsed = currentTime % dtCycleDuration;
  const dtSecondsElapsed = dtTimeElapsed / 1000;
  let dtPhase: 'BETTING' | 'REVEAL' | 'COOLDOWN' = 'BETTING';
  let dtCountdown = 0;
  let dtTimerText = '';
  if (dtSecondsElapsed < dtBettingSecs) {
    dtPhase = 'BETTING';
    dtCountdown = Math.ceil(dtBettingSecs - dtSecondsElapsed);
    dtTimerText = `Nhận cược: ${dtCountdown}s`;
  } else if (dtSecondsElapsed < dtBettingSecs + dtRevealSecs) {
    dtPhase = 'REVEAL';
    dtTimerText = 'Đang chia bài... 🎴';
  } else {
    dtPhase = 'COOLDOWN';
    dtCountdown = Math.ceil(dtCycleDuration / 1000 - dtSecondsElapsed);
    dtTimerText = `Chờ ván mới: ${dtCountdown}s`;
  }

  const currentTxResult = getSyncResultForCycle(txCycleId, 'taixiu') as { dices: number[] };
  const currentCrashPoint = getSyncResultForCycle(crashCycleId, 'crash') as number;
  const currentPenResult = getSyncResultForCycle(penCycleId, 'penalty') as { target: number; dive: number; isGoal: boolean };
  const currentHorseResult = getSyncResultForCycle(horseCycleId, 'horse') as { winner: number };
  const currentClawResult = getSyncResultForCycle(clawCycleId, 'claw') as { success: boolean; prizeIndex: number };
  const currentFcResult = getSyncResultForCycle(fcCycleId, 'fcmobile') as { blueScore: number; redScore: number };
  const currentDtResult = getSyncResultForCycle(dtCycleId, 'dragontiger') as { dragonVal: number; dragonSuit: string; tigerVal: number; tigerSuit: string };

  // Real-time score progression for FC Mobile (avoids leaking outcome)
  const getFCRealtimeScore = () => {
    if (fcPhase === 'BETTING') return { blue: 0, red: 0 };
    if (fcPhase === 'COOLDOWN') return { blue: currentFcResult.blueScore, red: currentFcResult.redScore };
    
    // PLAYING phase
    const elapsedPlaySecs = fcSecondsElapsed - fcBettingSecs;
    const progress = elapsedPlaySecs / fcPlayingSecs; // 0 to 1
    
    let blue = 0;
    let red = 0;
    
    // Distribute blue goals
    if (currentFcResult.blueScore === 1) {
      if (progress >= 0.35) blue = 1;
    } else if (currentFcResult.blueScore >= 2) {
      if (progress >= 0.25) blue = 1;
      if (progress >= 0.70) blue = currentFcResult.blueScore;
    }
    
    // Distribute red goals
    if (currentFcResult.redScore === 1) {
      if (progress >= 0.45) red = 1;
    } else if (currentFcResult.redScore >= 2) {
      if (progress >= 0.35) red = 1;
      if (progress >= 0.80) red = currentFcResult.redScore;
    }
    
    return { blue, red };
  };
  
  const fcRealtimeScore = getFCRealtimeScore();

  // Admin/Teacher commission pay credit helper (5% of the bet amount goes to admin automatically)
  const payAdminCommission = async (betAmount: number) => {
    const commission = Math.floor(betAmount * 0.05); // 5% house commission
    if (commission <= 0) return;
    try {
      const usersRef = ref(db, 'users');
      const snap = await get(usersRef);
      if (snap.exists()) {
        const updates: Record<string, any> = {};
        snap.forEach((child) => {
          const val = child.val();
          if (val.role === 'TEACHER') {
            const currentTeacherPP = val.pp || 0;
            updates[`users/${child.key}/pp`] = currentTeacherPP + commission;
          }
        });
        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
          console.log(`Paid ${commission} PP admin commission to teacher(s)`);
        }
      }
    } catch (err) {
      console.error('Error paying admin commission:', err);
    }
  };

  // Time-synchronized clock ticks
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);
      setActiveViewerCount((prev) => {
        const diff = Math.floor(Math.random() * 5) - 2;
        const next = prev + diff;
        return next < 160 ? 160 : next > 280 ? 280 : next;
      });
    }, 100);

    // Initial warm greetings
    setChatMessages([
      { sender: 'HỆ THỐNG', message: 'Hệ thống Live Stream S-System 88 đã trực tuyến. Bố cục tối ưu, mượt mà tuyệt đối!', isSystem: true, time: 'Now' },
      { sender: 'Dealer Vy Vy 💖', message: 'Em chào anh chị ạ! Chúc cả nhà chơi live vui vẻ, đại thắng rực rỡ nhé!', isSystem: true, time: 'Now' }
    ]);

    return () => clearInterval(timer);
  }, []);

  // Bot simulation chats (Keep only latest 10 items)
  useEffect(() => {
    const chatBotInterval = setInterval(() => {
      const randomBot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const gameComments = BOT_COMMENTS[activeTab];
      const randomComment = gameComments[Math.floor(Math.random() * gameComments.length)];
      
      setChatMessages((prev) => {
        const updated = [...prev, {
          sender: randomBot,
          message: randomComment,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }];
        // Strictly keep only the last 10 messages as requested
        return updated.slice(-10);
      });
    }, 4500);

    return () => clearInterval(chatBotInterval);
  }, [activeTab]);

  // Keep chat auto-scrolled
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Refs to capture active phases for background timers without triggering re-render/clears
  const txPhaseRef = useRef(txPhase);
  const crashPhaseRef = useRef(crashPhase);
  const penPhaseRef = useRef(penPhase);
  const horsePhaseRef = useRef(horsePhase);
  const clawPhaseRef = useRef(clawPhase);
  const fcPhaseRef = useRef(fcPhase);
  const dtPhaseRef = useRef(dtPhase);

  useEffect(() => {
    txPhaseRef.current = txPhase;
    crashPhaseRef.current = crashPhase;
    penPhaseRef.current = penPhase;
    horsePhaseRef.current = horsePhase;
    clawPhaseRef.current = clawPhase;
    fcPhaseRef.current = fcPhase;
    dtPhaseRef.current = dtPhase;
  }, [txPhase, crashPhase, penPhase, horsePhase, clawPhase, fcPhase, dtPhase]);

  // Synchronized Live Betting Board Simulation
  useEffect(() => {
    // Determine the current cycle ID of the active game
    let currentCycle = 0;
    if (activeTab === 'taixiu') currentCycle = txCycleId;
    else if (activeTab === 'crash') currentCycle = crashCycleId;
    else if (activeTab === 'penalty') currentCycle = penCycleId;
    else if (activeTab === 'horse') currentCycle = horseCycleId;
    else if (activeTab === 'claw') currentCycle = clawCycleId;
    else if (activeTab === 'fcmobile') currentCycle = fcCycleId;
    else if (activeTab === 'dragontiger') currentCycle = dtCycleId;

    // Reset live bets at the start of a round/cycle
    // If the user has an active bet for this round, preserve it!
    const userActiveBet = currentBetPlaced && 
                          currentBetPlaced.game === activeTab && 
                          currentBetPlaced.cycleId === currentCycle
                            ? {
                                sender: user?.name || 'Sinh Viên',
                                amount: currentBetPlaced.amount,
                                choice: currentBetPlaced.choice,
                                isUser: true
                              }
                            : null;

    // Populate initial randomized seed bets right away
    const initialBets: LiveBet[] = [];
    if (userActiveBet) {
      initialBets.push(userActiveBet);
    }

    const seedCount = Math.floor(Math.random() * 4) + 4; // 4 to 7 starting bets
    const choices = activeTab === 'taixiu' ? ['TAI', 'XIU', 'TRIPLE_1', 'TRIPLE_6'] :
                    activeTab === 'crash' ? ['CRASH_RIDE'] :
                    activeTab === 'penalty' ? ['GOAL', 'MISS', 'QUAD_0', 'QUAD_1', 'QUAD_2', 'QUAD_3', 'QUAD_4'] :
                    activeTab === 'horse' ? ['HORSE_1', 'HORSE_2', 'HORSE_3', 'HORSE_4'] :
                    activeTab === 'claw' ? ['CLAW_WIN', 'CLAW_LOSE'] :
                    activeTab === 'dragontiger' ? ['DRAGON', 'TIGER', 'TIE'] :
                    ['FC_BLUE', 'FC_RED', 'FC_DRAW'];

    const getBotBetAmount = () => {
      const roll = Math.random();
      if (roll < 0.85) {
        // Normal cược under 100k
        return Math.floor(Math.random() * 90 + 2) * 1000;
      } else if (roll < 0.95) {
        // Vài m (1M to 5M)
        return (Math.floor(Math.random() * 5) + 1) * 1000000;
      } else if (roll < 0.99) {
        // Vài chục m (10M to 50M)
        return (Math.floor(Math.random() * 5) + 1) * 10000000;
      } else {
        // Tròn 1 Tỷ PP (1,000,000,000)
        return 1000000000;
      }
    };

    for (let i = 0; i < seedCount; i++) {
      const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const amount = getBotBetAmount();
      // Weigh TRIPLE bets slightly lower for bot realism
      let choice = choices[Math.floor(Math.random() * choices.length)];
      if (activeTab === 'taixiu' && (choice === 'TRIPLE_1' || choice === 'TRIPLE_6') && Math.random() > 0.1) {
        choice = Math.random() > 0.5 ? 'TAI' : 'XIU';
      }
      initialBets.push({ sender: bot, amount, choice, isBot: true });
    }
    setLiveBets(initialBets);

    // Periodically feed new bets when in the BETTING phase
    const betTickInterval = setInterval(() => {
      let isBettingPhase = false;
      if (activeTab === 'taixiu') isBettingPhase = txPhaseRef.current === 'BETTING';
      else if (activeTab === 'crash') isBettingPhase = crashPhaseRef.current === 'BETTING';
      else if (activeTab === 'penalty') isBettingPhase = penPhaseRef.current === 'BETTING';
      else if (activeTab === 'horse') isBettingPhase = horsePhaseRef.current === 'BETTING';
      else if (activeTab === 'claw') isBettingPhase = clawPhaseRef.current === 'BETTING';
      else if (activeTab === 'fcmobile') isBettingPhase = fcPhaseRef.current === 'BETTING';
      else if (activeTab === 'dragontiger') isBettingPhase = dtPhaseRef.current === 'BETTING';

      if (isBettingPhase && Math.random() < 0.75) {
        const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        const amount = getBotBetAmount();
        let choice = choices[Math.floor(Math.random() * choices.length)];
        if (activeTab === 'taixiu' && (choice === 'TRIPLE_1' || choice === 'TRIPLE_6') && Math.random() > 0.1) {
          choice = Math.random() > 0.5 ? 'TAI' : 'XIU';
        }

        // Push bot bet to chat room for live bustling feel
        if (Math.random() < 0.65) {
          setChatMessages((cPrev) => {
            const updated = [...cPrev, {
              sender: bot,
              message: `đã đặt cược ${amount.toLocaleString()} PP vào cửa [${choice}] 🔥`,
              isBotBet: true,
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }];
            return updated.slice(-10);
          });
        }

        setLiveBets((prev) => {
          // Find if there is a user bet in the existing list
          const userBet = prev.find(b => b.isUser);
          const botsOnly = prev.filter(b => !b.isUser);
          const newBotBet = { sender: bot, amount, choice, isBot: true };
          const updatedBots = [...botsOnly, newBotBet].slice(-14);
          return userBet ? [userBet, ...updatedBots] : updatedBots;
        });
      }
    }, 1800);

    return () => clearInterval(betTickInterval);
  }, [activeTab, txCycleId, crashCycleId, penCycleId, horseCycleId, clawCycleId, fcCycleId, dtCycleId, currentBetPlaced, user]);


  // Broadcast PIP state changes dynamically
  const togglePip = () => {
    const nextState = !isPipActive;
    setIsPipActive(nextState);
    if (nextState) {
      localStorage.setItem('s88_live_pip_active', 'true');
      localStorage.setItem('s88_live_pip_game', activeTab);
    } else {
      localStorage.removeItem('s88_live_pip_active');
      localStorage.removeItem('s88_live_pip_game');
    }
    // Fire event to notify App.tsx immediately
    window.dispatchEvent(new Event('s88_pip_update'));
  };

  // Sync active tab to PIP context
  useEffect(() => {
    if (isPipActive) {
      localStorage.setItem('s88_live_pip_game', activeTab);
      window.dispatchEvent(new Event('s88_pip_update'));
    }
  }, [activeTab, isPipActive]);




  let currentCrashMultiplier = 1.0;
  if (crashPhase === 'FLIGHT') {
    const flightElapsed = crashSecondsElapsed - crashBettingSecs;
    currentCrashMultiplier = parseFloat((1.0 + Math.pow(flightElapsed / 3.5, 2.2)).toFixed(2));
    if (currentCrashMultiplier >= currentCrashPoint) {
      currentCrashMultiplier = currentCrashPoint;
    }
  } else if (crashPhase === 'COOLDOWN') {
    currentCrashMultiplier = currentCrashPoint;
  }

  // Auto-evaluation logic on phase change
  useEffect(() => {
    if (!currentBetPlaced || currentBetPlaced.game !== 'taixiu') return;
    if (txPhase === 'BETTING') {
      if (currentBetPlaced && currentBetPlaced.cycleId !== txCycleId) {
        setCurrentBetPlaced(null);
      }
      return;
    }

    if (txPhase === 'REVEAL' && currentBetPlaced && currentBetPlaced.cycleId === txCycleId && !currentBetPlaced.evaluated) {
      const dices = currentTxResult.dices;
      const sum = dices[0] + dices[1] + dices[2];
      const isTriple = dices[0] === dices[1] && dices[1] === dices[2];
      const isTai = sum >= 11;
      
      let won = false;
      let mult = 2.0;

      if (currentBetPlaced.choice === 'TAI') {
        won = !isTriple && isTai;
      } else if (currentBetPlaced.choice === 'XIU') {
        won = !isTriple && !isTai;
      } else if (currentBetPlaced.choice === 'TRIPLE_1') {
        won = dices[0] === 1 && dices[1] === 1 && dices[2] === 1;
        mult = 150.0;
      } else if (currentBetPlaced.choice === 'TRIPLE_6') {
        won = dices[0] === 6 && dices[1] === 6 && dices[2] === 6;
        mult = 150.0;
      }

      const profit = won ? Math.floor(currentBetPlaced.amount * mult) : 0;
      
      const handleEvaluateTx = async () => {
        try {
          const uSnap = await get(ref(db, `users/${uid}`));
          const freshPP = uSnap.val()?.pp || 0;
          let netProfit = profit - currentBetPlaced.amount;
          
          if (profit > 0) {
            await update(ref(db, `users/${uid}`), { pp: freshPP + profit });

            // Increment daily missions Tai Xiu wins
            const todayStr = new Date().toLocaleDateString('sv-SE');
            const mRef = ref(db, `users/${uid}/daily_missions/${todayStr}`);
            const mSnap = await get(mRef);
            const currentWins = mSnap.val()?.taiXiuWins || 0;
            await update(mRef, { taiXiuWins: currentWins + 1 });
          }

          await push(ref(db, 'game_logs'), {
            uid,
            name: user?.name || 'Sinh Viên',
            game: 'Live Stream Tài Xỉu',
            bet: currentBetPlaced.amount,
            pnl: netProfit,
            result: (isTriple && (currentBetPlaced.choice === 'TRIPLE_1' || currentBetPlaced.choice === 'TRIPLE_6') && won) ? 'Bão (Thắng)' : isTriple ? 'Bão (Thua)' : won ? 'Thắng' : 'Thua',
            time: new Date().toLocaleString('vi-VN'),
            timestamp: Date.now()
          });

          const choiceText = currentBetPlaced.choice === 'TAI' ? 'Tài' : currentBetPlaced.choice === 'XIU' ? 'Xỉu' : currentBetPlaced.choice === 'TRIPLE_1' ? 'Bão 1' : 'Bão 6';
          const winMsg = won 
            ? `Chúc mừng sếp! Kết quả: ${dices.join('-')} (${sum} nút - ${isTriple ? 'BÃO' : isTai ? 'TÀI' : 'XỈU'}). Đặt cửa: ${choiceText}. Nhận về +${profit.toLocaleString()} PP!`
            : `Rất tiếc! Kết quả: ${dices.join('-')} (${sum} nút - ${isTriple ? 'BÃO' : isTai ? 'TÀI' : 'XỈU'}). Đặt cửa: ${choiceText}. Mất cọc cược.`;
          
          onShowResult(
            won ? 'LIVE TÀI XỈU - THẮNG LỚN' : 'LIVE TÀI XỈU - THUA TRẬN',
            winMsg,
            won
          );

          setCurrentBetPlaced((prev) => prev ? { ...prev, evaluated: true } : null);
        } catch (err) {
          console.error(err);
        }
      };

      handleEvaluateTx();
    }
  }, [txPhase, currentBetPlaced, txCycleId, uid, user]);

  useEffect(() => {
    if (!currentBetPlaced || currentBetPlaced.game !== 'crash') return;
    if (crashPhase === 'BETTING') {
      setHasCashedOut(false);
      if (currentBetPlaced && currentBetPlaced.cycleId !== crashCycleId) {
        setCurrentBetPlaced(null);
      }
    }

    if (crashPhase === 'COOLDOWN' && currentBetPlaced && currentBetPlaced.cycleId === crashCycleId && !currentBetPlaced.evaluated) {
      if (!hasCashedOut) {
        const handleLoseCrash = async () => {
          try {
            await push(ref(db, 'game_logs'), {
              uid,
              name: user?.name || 'Sinh Viên',
              game: 'Live Phi Thuyền Crash',
              bet: currentBetPlaced.amount,
              pnl: -currentBetPlaced.amount,
              result: 'Thua (Crash)',
              time: new Date().toLocaleString('vi-VN'),
              timestamp: Date.now()
            });

            onShowResult(
              'PHI THUYỀN BỊ BẮN HỎNG 💥',
              `Phi thuyền đã phát nổ tại ${currentCrashPoint}x trước khi bạn kịp chốt lời! Mất cọc ${currentBetPlaced.amount.toLocaleString()} PP.`,
              false
            );

            setCurrentBetPlaced((prev) => prev ? { ...prev, evaluated: true } : null);
          } catch (err) {
            console.error(err);
          }
        };
        handleLoseCrash();
      }
    }
  }, [crashPhase, currentBetPlaced, crashCycleId, hasCashedOut, uid, user]);

  useEffect(() => {
    if (!currentBetPlaced || currentBetPlaced.game !== 'penalty') return;
    if (penPhase === 'BETTING') {
      if (currentBetPlaced && currentBetPlaced.cycleId !== penCycleId) {
        setCurrentBetPlaced(null);
      }
      return;
    }

    if (penPhase === 'SHOOTING' && currentBetPlaced && currentBetPlaced.cycleId === penCycleId && !currentBetPlaced.evaluated) {
      const res = currentPenResult;
      
      const isCorrectChoice = (
        (currentBetPlaced.choice === 'GOAL' && res.isGoal) ||
        (currentBetPlaced.choice === 'MISS' && !res.isGoal) ||
        (currentBetPlaced.choice === `QUAD_${res.target}` && res.isGoal)
      );

      let mult = 1.0;
      if (isCorrectChoice) {
        if (currentBetPlaced.choice === 'GOAL') mult = 1.8;
        else if (currentBetPlaced.choice === 'MISS') mult = 2.0;
        else if (currentBetPlaced.choice.startsWith('QUAD_')) mult = 4.5;
      }

      const payout = isCorrectChoice ? Math.floor(currentBetPlaced.amount * mult) : 0;
      const won = payout > 0;

      const handleEvaluatePenalty = async () => {
        try {
          const uSnap = await get(ref(db, `users/${uid}`));
          const freshPP = uSnap.val()?.pp || 0;
          let netProfit = payout - currentBetPlaced.amount;
          
          if (payout > 0) {
            await update(ref(db, `users/${uid}`), { pp: freshPP + payout });
          }

          await push(ref(db, 'game_logs'), {
            uid,
            name: user?.name || 'Sinh Viên',
            game: 'Live Penalty Shootout',
            bet: currentBetPlaced.amount,
            pnl: netProfit,
            result: won ? 'Thắng' : 'Thua',
            time: new Date().toLocaleString('vi-VN'),
            timestamp: Date.now()
          });

          const quadrantLabels = ['Góc Cao Trái', 'Góc Cao Phải', 'Góc Dưới Trái', 'Góc Dưới Phải', 'Chính Giữa'];
          const targetName = quadrantLabels[res.target];
          
          let resultMsg = res.isGoal
            ? `Cầu thủ sút hiểm hóc vào [${targetName}]! VÀO!!!`
            : `Cầu thủ sút về hướng [${targetName}]. Thủ môn quá xuất sắc ôm gọn! TRƯỢT.`;

          onShowResult(
            won ? 'LIVE PENALTY - THẮNG LỚN ⚽' : 'LIVE PENALTY - HỤT KÈO 💀',
            `${resultMsg}\n\nĐặt cược: ${currentBetPlaced.choice}\nKết quả: ${won ? `+${payout.toLocaleString()}` : `-${currentBetPlaced.amount.toLocaleString()}`} PP.`,
            won
          );

          setCurrentBetPlaced((prev) => prev ? { ...prev, evaluated: true } : null);
        } catch (err) {
          console.error(err);
        }
      };

      handleEvaluatePenalty();
    }
  }, [penPhase, currentBetPlaced, penCycleId, uid, user]);

  useEffect(() => {
    if (!currentBetPlaced || currentBetPlaced.game !== 'horse') return;
    if (horsePhase === 'BETTING') {
      if (currentBetPlaced && currentBetPlaced.cycleId !== horseCycleId) {
        setCurrentBetPlaced(null);
      }
      return;
    }

    if (horsePhase === 'RACING' && currentBetPlaced && currentBetPlaced.cycleId === horseCycleId && !currentBetPlaced.evaluated) {
      const res = currentHorseResult;
      const chosenHorse = parseInt(currentBetPlaced.choice.split('_')[1]);
      const won = res.winner === chosenHorse;
      const mult = 3.5;
      const payout = won ? Math.floor(currentBetPlaced.amount * mult) : 0;

      const handleEvaluateHorse = async () => {
        try {
          const uSnap = await get(ref(db, `users/${uid}`));
          const freshPP = uSnap.val()?.pp || 0;
          let netProfit = payout - currentBetPlaced.amount;
          
          if (payout > 0) {
            await update(ref(db, `users/${uid}`), { pp: freshPP + payout });
          }

          await push(ref(db, 'game_logs'), {
            uid,
            name: user?.name || 'Sinh Viên',
            game: 'Live Đua Ngựa',
            bet: currentBetPlaced.amount,
            pnl: netProfit,
            result: won ? `Thắng (Ngựa ${res.winner})` : `Thua (Ngựa ${res.winner} thắng)`,
            time: new Date().toLocaleString('vi-VN'),
            timestamp: Date.now()
          });

          onShowResult(
            won ? 'LIVE ĐUA NGỰA - THẮNG CUỘC 🐎' : 'LIVE ĐUA NGỰA - TRẬT KÈO 💀',
            `Kết quả: Ngựa Số ${res.winner} bứt tốc cán đích đầu tiên!\n\nLựa chọn của bạn: Ngựa Số ${chosenHorse}\nBiến động tài sản: ${won ? `+${payout.toLocaleString()}` : `-${currentBetPlaced.amount.toLocaleString()}`} PP.`,
            won
          );

          setCurrentBetPlaced((prev) => prev ? { ...prev, evaluated: true } : null);
        } catch (err) {
          console.error(err);
        }
      };
      handleEvaluateHorse();
    }
  }, [horsePhase, currentBetPlaced, horseCycleId, uid, user]);

  useEffect(() => {
    if (!currentBetPlaced || currentBetPlaced.game !== 'claw') return;
    if (clawPhase === 'BETTING') {
      if (currentBetPlaced && currentBetPlaced.cycleId !== clawCycleId) {
        setCurrentBetPlaced(null);
      }
      return;
    }

    if (clawPhase === 'DROPPING' && currentBetPlaced && currentBetPlaced.cycleId === clawCycleId && !currentBetPlaced.evaluated) {
      const res = currentClawResult;
      const isWinChoice = currentBetPlaced.choice === 'CLAW_WIN';
      const won = (isWinChoice && res.success) || (!isWinChoice && !res.success);
      const mult = isWinChoice ? 4.0 : 1.25;
      const payout = won ? Math.floor(currentBetPlaced.amount * mult) : 0;

      const handleEvaluateClaw = async () => {
        try {
          const uSnap = await get(ref(db, `users/${uid}`));
          const freshPP = uSnap.val()?.pp || 0;
          let netProfit = payout - currentBetPlaced.amount;
          
          if (payout > 0) {
            await update(ref(db, `users/${uid}`), { pp: freshPP + payout });
          }

          await push(ref(db, 'game_logs'), {
            uid,
            name: user?.name || 'Sinh Viên',
            game: 'Live Gắp Thú',
            bet: currentBetPlaced.amount,
            pnl: netProfit,
            result: won ? 'Thắng' : 'Thua',
            time: new Date().toLocaleString('vi-VN'),
            timestamp: Date.now()
          });

          const prizeNames = ['Gấu Bông 🧸', 'Kỳ Lân 🦄', 'Rồng Lửa 🐉', 'Mèo Kitty 🐱', 'Cáo Đỏ 🦊'];
          const prizeName = prizeNames[res.prizeIndex];

          const resultMsg = res.success 
            ? `Máy gắp thành công tóm được em [${prizeName}] siêu cưng!`
            : `Rất tiếc! Càng gắp lỏng lẻo trượt mất em thú bông khi kéo lên!`;

          onShowResult(
            won ? 'LIVE GẮP THÚ - ĐẠI THẮNG 🧸' : 'LIVE GẮP THÚ - THẤT BẠI 💔',
            `${resultMsg}\n\nĐặt cược: ${isWinChoice ? 'GẮP TRÚNG' : 'TRƯỢT'}\nBiến động: ${won ? `+${payout.toLocaleString()}` : `-${currentBetPlaced.amount.toLocaleString()}`} PP.`,
            won
          );

          setCurrentBetPlaced((prev) => prev ? { ...prev, evaluated: true } : null);
        } catch (err) {
          console.error(err);
        }
      };
      handleEvaluateClaw();
    }
  }, [clawPhase, currentBetPlaced, clawCycleId, uid, user]);

  useEffect(() => {
    if (!currentBetPlaced || currentBetPlaced.game !== 'fcmobile') return;
    if (fcPhase === 'BETTING') {
      if (currentBetPlaced && currentBetPlaced.cycleId !== fcCycleId) {
        setCurrentBetPlaced(null);
      }
      return;
    }

    if (fcPhase === 'PLAYING' && currentBetPlaced && currentBetPlaced.cycleId === fcCycleId && !currentBetPlaced.evaluated) {
      const res = currentFcResult;
      let matchWinner = 'FC_DRAW';
      if (res.blueScore > res.redScore) matchWinner = 'FC_BLUE';
      else if (res.redScore > res.blueScore) matchWinner = 'FC_RED';

      const won = currentBetPlaced.choice === matchWinner;
      const mult = matchWinner === 'FC_DRAW' ? 4.0 : 2.0;
      const payout = won ? Math.floor(currentBetPlaced.amount * mult) : 0;

      const handleEvaluateFc = async () => {
        try {
          const uSnap = await get(ref(db, `users/${uid}`));
          const freshPP = uSnap.val()?.pp || 0;
          let netProfit = payout - currentBetPlaced.amount;
          
          if (payout > 0) {
            await update(ref(db, `users/${uid}`), { pp: freshPP + payout });
          }

          await push(ref(db, 'game_logs'), {
            uid,
            name: user?.name || 'Sinh Viên',
            game: 'Live FC Arena',
            bet: currentBetPlaced.amount,
            pnl: netProfit,
            result: won ? 'Thắng' : 'Thua',
            time: new Date().toLocaleString('vi-VN'),
            timestamp: Date.now()
          });

          onShowResult(
            won ? 'LIVE FC ARENA - CHIẾN THẮNG 🏟️' : 'LIVE FC ARENA - BẠI TRẬN 💀',
            `Tỉ số chung cuộc: Xanh ${res.blueScore} - ${res.redScore} Đỏ.\n\nĐặt cược: ${
              currentBetPlaced.choice === 'FC_BLUE' ? 'Đội Xanh' : currentBetPlaced.choice === 'FC_RED' ? 'Đội Đỏ' : 'Hòa'
            }\nNhận thưởng: ${won ? `+${payout.toLocaleString()}` : `-${currentBetPlaced.amount.toLocaleString()}`} PP.`,
            won
          );

          setCurrentBetPlaced((prev) => prev ? { ...prev, evaluated: true } : null);
        } catch (err) {
          console.error(err);
        }
      };
      handleEvaluateFc();
    }
  }, [fcPhase, currentBetPlaced, fcCycleId, uid, user]);

  // --- DRAGON TIGER EVALUATION ---
  useEffect(() => {
    if (!currentBetPlaced || currentBetPlaced.game !== 'dragontiger') return;
    if (dtPhase === 'BETTING') {
      if (currentBetPlaced && currentBetPlaced.cycleId !== dtCycleId) {
        setCurrentBetPlaced(null);
      }
      return;
    }

    if (dtPhase === 'REVEAL' && currentBetPlaced && currentBetPlaced.cycleId === dtCycleId && !currentBetPlaced.evaluated) {
      const res = currentDtResult;
      const dVal = res.dragonVal;
      const tVal = res.tigerVal;

      let winner = 'TIE';
      if (dVal > tVal) winner = 'DRAGON';
      else if (tVal > dVal) winner = 'TIGER';

      const won = currentBetPlaced.choice === winner;
      const mult = winner === 'TIE' ? 8.0 : 2.0;
      const payout = won ? Math.floor(currentBetPlaced.amount * mult) : 0;

      const handleEvaluateDt = async () => {
        try {
          const uSnap = await get(ref(db, `users/${uid}`));
          const freshPP = uSnap.val()?.pp || 0;
          let netProfit = payout - currentBetPlaced.amount;

          if (payout > 0) {
            await update(ref(db, `users/${uid}`), { pp: freshPP + payout });
          }

          await push(ref(db, 'game_logs'), {
            uid,
            name: user?.name || 'Sinh Viên',
            game: 'Live Rồng Hổ',
            bet: currentBetPlaced.amount,
            pnl: netProfit,
            result: won ? 'Thắng' : 'Thua',
            time: new Date().toLocaleString('vi-VN'),
            timestamp: Date.now()
          });

          const winnerText = winner === 'DRAGON' ? 'RỒNG THẮNG 🐉' : winner === 'TIGER' ? 'HỔ THẮNG 🐯' : 'HÒA 🤝';
          const choiceText = currentBetPlaced.choice === 'DRAGON' ? 'Rồng' : currentBetPlaced.choice === 'TIGER' ? 'Hổ' : 'Hòa';

          onShowResult(
            won ? 'LIVE RỒNG HỔ - THẮNG LỚN 🎉' : 'LIVE RỒNG HỔ - THUA CUỘC 💀',
            `Kết quả: Rồng [${getCardLabel(dVal)}${res.dragonSuit}] - Hổ [${getCardLabel(tVal)}${res.tigerSuit}] (${winnerText}).\n\nCửa đặt: ${choiceText}\nTài sản: ${won ? `+${payout.toLocaleString()}` : `-${currentBetPlaced.amount.toLocaleString()}`} PP.`,
            won
          );

          setCurrentBetPlaced((prev) => prev ? { ...prev, evaluated: true } : null);
        } catch (err) {
          console.error(err);
        }
      };
      handleEvaluateDt();
    }
  }, [dtPhase, currentBetPlaced, dtCycleId, uid, user]);

  const getCardLabel = (val: number) => {
    if (val === 1) return 'A';
    if (val === 11) return 'J';
    if (val === 12) return 'Q';
    if (val === 13) return 'K';
    return val.toString();
  };

  const handlePlaceBet = async () => {
    const amt = parseInt(betAmount);
    if (!betChoice) {
      alert('Vui lòng chọn cửa cược!');
      return;
    }
    if (isNaN(amt) || amt <= 100) {
      alert('Mức cược tối thiểu là 100 PP!');
      return;
    }

    const currentPP = user?.pp || 0;
    if (currentPP < amt) {
      alert(`Bạn không có đủ ${amt.toLocaleString()} PP!`);
      return;
    }

    let currentCycle = 0;
    if (activeTab === 'taixiu') {
      if (txPhase !== 'BETTING') {
        alert('Hết thời gian cược ván này!');
        return;
      }
      currentCycle = txCycleId;
    } else if (activeTab === 'crash') {
      if (crashPhase !== 'BETTING') {
        alert('Phi thuyền đã cất cánh!');
        return;
      }
      currentCycle = crashCycleId;
    } else if (activeTab === 'penalty') {
      if (penPhase !== 'BETTING') {
        alert('Lượt sút đền đã diễn ra!');
        return;
      }
      currentCycle = penCycleId;
    } else if (activeTab === 'horse') {
      if (horsePhase !== 'BETTING') {
        alert('Trận đua ngựa đã bắt đầu!');
        return;
      }
      currentCycle = horseCycleId;
    } else if (activeTab === 'claw') {
      if (clawPhase !== 'BETTING') {
        alert('Lượt gắp thú đã bắt đầu!');
        return;
      }
      currentCycle = clawCycleId;
    } else if (activeTab === 'fcmobile') {
      if (fcPhase !== 'BETTING') {
        alert('Trận đấu bóng đá đang diễn ra!');
        return;
      }
      currentCycle = fcCycleId;
    } else if (activeTab === 'dragontiger') {
      if (dtPhase !== 'BETTING') {
        alert('Hết thời gian cược ván này!');
        return;
      }
      currentCycle = dtCycleId;
    }

    try {
      await update(ref(db, `users/${uid}`), { pp: currentPP - amt });

      // Credit 5% commission of the bet amount directly to Admin/Teacher accounts
      await payAdminCommission(amt);

      // If playing Crash, increment daily mission rides count
      if (activeTab === 'crash') {
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const mRef = ref(db, `users/${uid}/daily_missions/${todayStr}`);
        const mSnap = await get(mRef);
        const currentRides = mSnap.val()?.crashRides || 0;
        await update(mRef, { crashRides: currentRides + 1 });
      }

      setCurrentBetPlaced({
        cycleId: currentCycle,
        amount: amt,
        choice: betChoice,
        evaluated: false,
        game: activeTab
      });

      // Insert user bet into the list
      setLiveBets((prev) => [
        ...prev,
        {
          sender: user?.name || 'Sinh Viên',
          amount: amt,
          choice: betChoice,
          isUser: true
        }
      ]);

      setChatMessages((prev) => {
        const updated = [
          ...prev,
          {
            sender: 'Dealer Vy Vy 💖',
            message: `Sếp vừa đặt cược ${amt.toLocaleString()} PP vào cửa [${betChoice}]! May mắn nha sếp!`,
            isSystem: true,
            time: 'Now'
          }
        ];
        return updated.slice(-10);
      });
    } catch (err) {
      alert('Lỗi kết nối máy chủ sòng bài!');
    }
  };

  const handleCrashCashout = async () => {
    if (crashPhase !== 'FLIGHT' || !currentBetPlaced || currentBetPlaced.cycleId !== crashCycleId || currentBetPlaced.evaluated || hasCashedOut) return;

    if (currentCrashMultiplier >= currentCrashPoint) {
      alert('Tên lửa đã nổ!');
      return;
    }

    setHasCashedOut(true);
    const winMult = currentCrashMultiplier;
    const payout = Math.floor(currentBetPlaced.amount * winMult);

    try {
      const uSnap = await get(ref(db, `users/${uid}`));
      const freshPP = uSnap.val()?.pp || 0;
      await update(ref(db, `users/${uid}`), { pp: freshPP + payout });

      await push(ref(db, 'game_logs'), {
        uid,
        name: user?.name || 'Sinh Viên',
        game: 'Live Phi Thuyền Crash',
        bet: currentBetPlaced.amount,
        pnl: payout - currentBetPlaced.amount,
        result: `Thắng (Chốt x${winMult})`,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      onShowResult(
        'RÚT QUÂN THÀNH CÔNG! 🚀',
        `Chúc mừng bạn chốt lời tại x${winMult}! Húp về +${payout.toLocaleString()} PP!`,
        true
      );

      setCurrentBetPlaced((prev) => prev ? { ...prev, evaluated: true } : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');

    setChatMessages((prev) => {
      const updated = [
        ...prev,
        {
          sender: user?.name || 'Sinh Viên',
          message: userMsg,
          isUser: true,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ];
      return updated.slice(-10);
    });

    if (userMsg.toLowerCase().includes('lắc') || userMsg.toLowerCase().includes('tài') || userMsg.toLowerCase().includes('xỉu')) {
      setTimeout(() => {
        setChatMessages((prev) => {
          const updated = [
            ...prev,
            {
              sender: 'Dealer Vy Vy 💖',
              message: 'Cầu đang chạy đẹp lắm nè sếp, đặt cược đi ạ!',
              isSystem: true,
              time: 'Now'
            }
          ];
          return updated.slice(-10);
        });
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Standardized aspect-ratio-locked grid of uniformly sized stream thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        
        {/* Tài Xỉu Stream Thumbnail */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setActiveTab('taixiu'); setBetChoice(''); }}
          className={`relative aspect-[16/9] w-full rounded-xl overflow-hidden border font-mono text-[10px] transition-all cursor-pointer flex flex-col justify-between p-3 group ${
            activeTab === 'taixiu'
              ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)] ring-1 ring-red-500'
              : 'border-white/5 bg-black/60 hover:border-white/20'
          }`}
        >
          <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1596838132731-3301c3fd4317?auto=format&fit=crop&w=150&q=80')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/60 z-[1]" />

          <div className="z-10 flex justify-between items-center w-full">
            <span className="py-0.5 px-1.5 bg-red-600 text-white font-black text-[7px] uppercase tracking-wider rounded flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-white inline-block animate-ping" />
              LIVE
            </span>
            <span className="text-[7px] text-white/70 font-bold bg-black/40 py-0.5 px-1 rounded">
              1,240 xem
            </span>
          </div>

          <div className="z-10 text-left">
            <h4 className="text-white font-black text-[10px] uppercase tracking-wider">🎲 TÀI XỈU S88</h4>
            <p className="text-[8px] text-slate-300 mt-0.5">Dealer Vy Vy lắc bát</p>
          </div>
        </motion.button>

        {/* Gồng Lãi Stream Thumbnail */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setActiveTab('crash'); setBetChoice(''); }}
          className={`relative aspect-[16/9] w-full rounded-xl overflow-hidden border font-mono text-[10px] transition-all cursor-pointer flex flex-col justify-between p-3 group ${
            activeTab === 'crash'
              ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500'
              : 'border-white/5 bg-black/60 hover:border-white/20'
          }`}
        >
          <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=150&q=80')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/60 z-[1]" />

          <div className="z-10 flex justify-between items-center w-full">
            <span className="py-0.5 px-1.5 bg-cyan-500 text-black font-black text-[7px] uppercase tracking-wider rounded flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-black inline-block animate-ping" />
              FLYING
            </span>
            <span className="text-[7px] text-white/70 font-bold bg-black/40 py-0.5 px-1 rounded">
              842 xem
            </span>
          </div>

          <div className="z-10 text-left">
            <h4 className="text-white font-black text-[10px] uppercase tracking-wider">🚀 KHÔNG CHIẾN</h4>
            <p className="text-[8px] text-slate-300 mt-0.5">Phi thuyền bay x100</p>
          </div>
        </motion.button>

        {/* Sút Phạt Stream Thumbnail */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setActiveTab('penalty'); setBetChoice(''); }}
          className={`relative aspect-[16/9] w-full rounded-xl overflow-hidden border font-mono text-[10px] transition-all cursor-pointer flex flex-col justify-between p-3 group ${
            activeTab === 'penalty'
              ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500'
              : 'border-white/5 bg-black/60 hover:border-white/20'
          }`}
        >
          <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=150&q=80')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/60 z-[1]" />

          <div className="z-10 flex justify-between items-center w-full">
            <span className="py-0.5 px-1.5 bg-emerald-500 text-black font-black text-[7px] uppercase tracking-wider rounded flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-black inline-block animate-ping" />
              STADIUM
            </span>
            <span className="text-[7px] text-white/70 font-bold bg-black/40 py-0.5 px-1 rounded">
              2,110 xem
            </span>
          </div>

          <div className="z-10 text-left">
            <h4 className="text-white font-black text-[10px] uppercase tracking-wider">⚽ SÚT PHẠT 3D</h4>
            <p className="text-[8px] text-slate-300 mt-0.5">Sân cỏ rực lửa kịch tính</p>
          </div>
        </motion.button>

        {/* Đua Ngựa Stream Thumbnail */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setActiveTab('horse'); setBetChoice(''); }}
          className={`relative aspect-[16/9] w-full rounded-xl overflow-hidden border font-mono text-[10px] transition-all cursor-pointer flex flex-col justify-between p-3 group ${
            activeTab === 'horse'
              ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-500'
              : 'border-white/5 bg-black/60 hover:border-white/20'
          }`}
        >
          <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=150&q=80')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/60 z-[1]" />

          <div className="z-10 flex justify-between items-center w-full">
            <span className="py-0.5 px-1.5 bg-amber-500 text-black font-black text-[7px] uppercase tracking-wider rounded flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-black inline-block animate-ping" />
              RACETRACK
            </span>
            <span className="text-[7px] text-white/70 font-bold bg-black/40 py-0.5 px-1 rounded">
              1,540 xem
            </span>
          </div>

          <div className="z-10 text-left">
            <h4 className="text-white font-black text-[10px] uppercase tracking-wider">🐎 ĐUA NGỰA LIVE</h4>
            <p className="text-[8px] text-slate-300 mt-0.5">Kịch tính tới mét cuối</p>
          </div>
        </motion.button>

        {/* Gắp Thú Stream Thumbnail */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setActiveTab('claw'); setBetChoice(''); }}
          className={`relative aspect-[16/9] w-full rounded-xl overflow-hidden border font-mono text-[10px] transition-all cursor-pointer flex flex-col justify-between p-3 group ${
            activeTab === 'claw'
              ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.25)] ring-1 ring-pink-500'
              : 'border-white/5 bg-black/60 hover:border-white/20'
          }`}
        >
          <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1559251606-c623743a6d76?auto=format&fit=crop&w=150&q=80')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/60 z-[1]" />

          <div className="z-10 flex justify-between items-center w-full">
            <span className="py-0.5 px-1.5 bg-pink-500 text-white font-black text-[7px] uppercase tracking-wider rounded flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-white inline-block animate-ping" />
              TOY BOX
            </span>
            <span className="text-[7px] text-white/70 font-bold bg-black/40 py-0.5 px-1 rounded">
              925 xem
            </span>
          </div>

          <div className="z-10 text-left">
            <h4 className="text-white font-black text-[10px] uppercase tracking-wider">🧸 GẮP THÚ LIVE</h4>
            <p className="text-[8px] text-slate-300 mt-0.5">Gắp mượt trúng jackpot</p>
          </div>
        </motion.button>

        {/* FC Arena Stream Thumbnail */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setActiveTab('fcmobile'); setBetChoice(''); }}
          className={`relative aspect-[16/9] w-full rounded-xl overflow-hidden border font-mono text-[10px] transition-all cursor-pointer flex flex-col justify-between p-3 group ${
            activeTab === 'fcmobile'
              ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.25)] ring-1 ring-blue-500'
              : 'border-white/5 bg-black/60 hover:border-white/20'
          }`}
        >
          <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=150&q=80')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/60 z-[1]" />

          <div className="z-10 flex justify-between items-center w-full">
            <span className="py-0.5 px-1.5 bg-blue-500 text-white font-black text-[7px] uppercase tracking-wider rounded flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-white inline-block animate-ping" />
              FC ARENA
            </span>
            <span className="text-[7px] text-white/70 font-bold bg-black/40 py-0.5 px-1 rounded">
              3,150 xem
            </span>
          </div>

          <div className="z-10 text-left">
            <h4 className="text-white font-black text-[10px] uppercase tracking-wider">🏟️ FC ARENA S88</h4>
            <p className="text-[8px] text-slate-300 mt-0.5">Đại chiến siêu cúp live</p>
          </div>
        </motion.button>

        {/* Dragon Tiger Stream Thumbnail */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setActiveTab('dragontiger'); setBetChoice(''); }}
          className={`relative aspect-[16/9] w-full rounded-xl overflow-hidden border font-mono text-[10px] transition-all cursor-pointer flex flex-col justify-between p-3 group ${
            activeTab === 'dragontiger'
              ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-500'
              : 'border-white/5 bg-black/60 hover:border-white/20'
          }`}
        >
          <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=150&q=80')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/60 z-[1]" />

          <div className="z-10 flex justify-between items-center w-full">
            <span className="py-0.5 px-1.5 bg-amber-500 text-black font-black text-[7px] uppercase tracking-wider rounded flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-black inline-block animate-ping" />
              DRAGON
            </span>
            <span className="text-[7px] text-white/70 font-bold bg-black/40 py-0.5 px-1 rounded">
              2,840 xem
            </span>
          </div>

          <div className="z-10 text-left">
            <h4 className="text-white font-black text-[10px] uppercase tracking-wider">🐉 RỒNG HỔ LIVE</h4>
            <p className="text-[8px] text-slate-300 mt-0.5">Long tranh Hổ đấu đỉnh cao</p>
          </div>
        </motion.button>

      </div>

      {/* Mobile Portrait Mode Optimized Banner */}
      <div className="block sm:hidden bg-gradient-to-r from-amber-950/40 via-black to-amber-950/40 border border-amber-500/30 p-2.5 rounded-2xl mb-3 text-center">
        <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-[11px]">
          <span className="text-xs">📱</span>
          <span>Bố cục Dọc (Portrait) điện thoại: Đặt cược & Lịch sử giao dịch ở nửa dưới màn hình!</span>
        </div>
      </div>

      {/* Grid container: balanced, sleek, bento layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Stream & Betting HUD container (Span 8) */}
        
        {/* Stream Player (Span 8) */}
        {/* Main stream player screen */}
          <div className="lg:col-span-8 relative aspect-video w-full rounded-2xl bg-black border border-white/5 overflow-hidden flex flex-col justify-between p-4 shadow-2xl group">
            
            {/* Stream HUD */}
            <div className="z-10 flex justify-between items-start w-full">
              <div className="flex items-center gap-2">
                <span className="py-1 px-2.5 bg-red-600 text-white font-black text-[9px] uppercase tracking-wider rounded-md flex items-center gap-1.5">
                  <motion.span 
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-white inline-block"
                  />
                  LIVE STREAMS88
                </span>
                <span className="py-1 px-2 bg-black/70 border border-white/10 text-white font-mono text-[9px] rounded-md flex items-center gap-1">
                  <Users className="w-3 h-3 text-red-500 animate-pulse" />
                  {activeViewerCount} người xem
                </span>
                
                <button
                  onClick={() => setShowRulesModal(true)}
                  className="py-1 px-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-mono text-[9px] font-black rounded-md flex items-center gap-1 cursor-pointer transition-all uppercase tracking-wider"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Luật chơi
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePip}
                  className={`py-1 px-2.5 rounded-md text-[9px] font-mono font-bold uppercase cursor-pointer flex items-center gap-1 transition-all ${
                    isPipActive 
                      ? 'bg-red-600/20 border border-red-500 text-red-400 text-glow-red' 
                      : 'bg-black/60 border border-white/10 text-white hover:bg-white/10'
                  }`}
                  title="Bật/Tắt chế độ xem thu nhỏ góc màn hình (PIP)"
                >
                  <Maximize2 className="w-3 h-3" />
                  {isPipActive ? 'PIP: BẬT' : 'CHẾ ĐỘ PIP'}
                </button>
                <span className="py-1 px-2 bg-black/60 border border-white/10 text-white font-mono text-[9px] rounded-md">
                  1080P HD
                </span>
              </div>
            </div>

            {/* Simulated Stream stage area */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
              
              {/* TAI XIU STAGE */}
              {activeTab === 'taixiu' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-[#0c0d14] to-[#1a1c29]">
                  {/* Cyber Casino grid lines & glowing radial overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.015)_1px,transparent_1px)] bg-[size:20px_20px] opacity-40" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,98,0.06)_0%,transparent_70%)]" />

                  {/* Dealer Info HUD */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-slate-950/80 backdrop-blur-md border border-white/10 py-1.5 px-3 rounded-2xl shadow-xl">
                    <div className="relative">
                      <img 
                        src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&h=80" 
                        alt="Dealer" 
                        className="w-8 h-8 rounded-full border border-red-500/60 object-cover shadow-md"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[7px] text-[#8b949e] font-bold uppercase tracking-wider">DEALER LYNA</span>
                      <span className="text-[9px] text-white font-medium">
                        {txPhase === 'BETTING' ? 'Đặt Tài/Xỉu lượm lúa ạ! 🎲' : txPhase === 'SHAKING' ? 'Em lắc mạnh tay nha...' : 'Cùng ngắm kết quả!'}
                      </span>
                    </div>
                  </div>

                  {/* VIP Table Center Ring */}
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    {/* Golden luxury felt ring */}
                    <div className="absolute w-40 h-40 rounded-full border-4 border-yellow-500/20 bg-emerald-950/40 shadow-[inset_0_0_30px_rgba(0,255,128,0.15)] flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full border border-yellow-500/10 bg-emerald-900/10" />
                    </div>
                    
                    {/* Golden plate pedestal */}
                    <div className="absolute w-36 h-8 bg-gradient-to-b from-amber-800 to-amber-950 rounded-full border border-yellow-500/30 bottom-4 shadow-lg"></div>
                    
                    {/* Shaker cup with luxury golden 3D design and Framer Motion bounce */}
                    <motion.div 
                      animate={txPhase === 'SHAKING' ? {
                        y: [0, -15, 0, -15, 0],
                        rotate: [0, 12, -12, 12, 0],
                      } : txPhase === 'REVEAL' ? {
                        y: -55,
                        opacity: 0.1,
                        scale: 0.8,
                        rotate: 15
                      } : txPhase === 'COOLDOWN' ? {
                        y: -75,
                        opacity: 0
                      } : {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        rotate: 0
                      }}
                      transition={{
                        duration: txPhase === 'SHAKING' ? 0.25 : 0.6,
                        repeat: txPhase === 'SHAKING' ? Infinity : 0,
                        ease: "easeInOut"
                      }}
                      className="absolute bottom-7 w-20 h-22 bg-gradient-to-b from-yellow-400 via-yellow-600 to-amber-800 border border-yellow-300 rounded-t-full shadow-2xl flex flex-col items-center justify-center z-20"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4)_0%,transparent_60%)] rounded-t-full" />
                      <div className="w-full h-1 bg-yellow-400/40 my-1 z-10" />
                      <span className="text-white text-[8px] font-black font-sans tracking-widest z-10 text-shadow-sm">S88 ELITE</span>
                      <div className="w-full h-1 bg-yellow-400/40 my-1 z-10" />
                    </motion.div>

                    {/* Highly authentic Asian dices - red dot for 1/4, black for others */}
                    {(txPhase === 'REVEAL' || txPhase === 'COOLDOWN') && (
                      <div className="absolute bottom-9 flex gap-2.5 z-10 bg-black/60 p-2 rounded-xl border border-white/10 shadow-2xl backdrop-blur-sm">
                        {currentTxResult.dices.map((dieVal, idx) => (
                          <motion.div 
                            initial={{ scale: 0, rotate: -90, y: 15 }}
                            animate={{ scale: 1, rotate: idx * 12 - 6, y: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 12, delay: idx * 0.1 }}
                            key={idx} 
                            className="w-8 h-8 bg-slate-50 border-2 border-slate-300 rounded-xl flex items-center justify-center shadow-lg font-black text-slate-900 text-sm relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-200" />
                            <div className="relative font-mono text-base flex items-center justify-center w-full h-full">
                              {dieVal === 1 ? (
                                <span className="text-red-600 text-xl font-bold">🔴</span>
                              ) : dieVal === 4 ? (
                                <span className="text-red-600 text-base font-bold">4</span>
                              ) : (
                                <span className="text-slate-900 font-extrabold">{dieVal}</span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Neon results banner overlay */}
                  {txPhase === 'REVEAL' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: -15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="absolute top-12 py-1.5 px-4 bg-slate-950/90 border-2 border-yellow-500/40 rounded-full text-[10px] font-mono font-black uppercase tracking-wider text-white flex items-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.25)]"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                      KẾT QUẢ: <span className="text-yellow-400 font-extrabold text-glow-gold">{currentTxResult.dices.reduce((a, b) => a + b, 0)} NÚT</span> 
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${currentTxResult.dices.reduce((a, b) => a + b, 0) >= 11 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                        {currentTxResult.dices.reduce((a, b) => a + b, 0) >= 11 ? 'TÀI (CHẴN)' : 'XỈU (LẺ)'}
                      </span>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ROCKET CRASH STAGE */}
              {activeTab === 'crash' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-[#02050b] overflow-hidden">
                  {/* Space stardust grid & futuristic warp lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.015)_1px,transparent_1px)] bg-[size:30px_30px]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.1)_0%,transparent_60%)]" />

                  {/* Star speed trails - warp speed effect as multiplier increases */}
                  <div className="absolute inset-0 opacity-40 pointer-events-none">
                    <div className="absolute top-[10%] left-[20%] w-0.5 h-12 bg-gradient-to-b from-cyan-400 to-transparent rounded-full animate-pulse" />
                    <div className="absolute top-[30%] left-[60%] w-0.5 h-16 bg-gradient-to-b from-cyan-400 to-transparent rounded-full animate-pulse animate-delay-200" />
                    <div className="absolute top-[50%] left-[10%] w-0.5 h-20 bg-gradient-to-b from-cyan-400 to-transparent rounded-full animate-pulse animate-delay-500" />
                    <div className="absolute top-[20%] right-[15%] w-0.5 h-14 bg-gradient-to-b from-cyan-400 to-transparent rounded-full animate-pulse" />
                  </div>

                  {/* Floating Rocket with realistic fire trail */}
                  {crashPhase === 'FLIGHT' && (
                    <motion.div 
                      animate={{ 
                        y: [0, -10, 0],
                        x: [0, 4, 0]
                      }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                      className="absolute bottom-1/4 left-1/4"
                      style={{
                        transform: `translate(${Math.min(crashSecondsElapsed * 18, 160)}px, -${Math.min(crashSecondsElapsed * 10, 100)}px) rotate(45deg)`
                      }}
                    >
                      <div className="relative flex flex-col items-center">
                        <span className="text-5xl filter drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">🚀</span>
                        {/* Fire booster trail */}
                        <div className="absolute bottom-[-18px] w-4 h-8 bg-gradient-to-t from-red-500 via-orange-400 to-transparent rounded-full filter blur-xs animate-pulse origin-top scale-y-150" />
                        <div className="absolute bottom-[-10px] w-2 h-4 bg-yellow-300 rounded-full filter blur-xs" />
                      </div>
                    </motion.div>
                  )}

                  {/* Cinematic crash explosion with warning flashes */}
                  {crashPhase === 'COOLDOWN' && (
                    <div className="absolute flex flex-col items-center justify-center animate-[shake_0.5s_infinite] z-10">
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: [1, 1.4, 1.2], opacity: 1 }}
                        className="text-6xl filter drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]"
                      >
                        💥
                      </motion.div>
                      <span className="text-white font-mono text-[10px] uppercase bg-red-950/90 py-1.5 px-4 border-2 border-red-500/50 rounded-2xl mt-4 font-black shadow-[0_0_15px_rgba(239,68,68,0.4)] tracking-wider">
                        BÙMM! CRASHED @ <span className="text-red-400 text-glow-red font-black text-xs">{currentCrashPoint}x</span>
                      </span>
                    </div>
                  )}

                  {/* High contrast HUD displays */}
                  {crashPhase === 'FLIGHT' && (
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-glow-cyan text-cyan-400 text-5xl font-mono font-black tracking-wide">
                        {currentCrashMultiplier}x
                      </span>
                      <span className="text-[8px] text-white/50 font-mono tracking-widest mt-2 uppercase bg-slate-950/80 border border-white/5 py-1 px-3 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        PHI THUYỀN ĐANG BAY CAO...
                      </span>
                    </div>
                  )}

                  {crashPhase === 'BETTING' && (
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-glow-cyan text-cyan-400 text-2xl font-mono font-black animate-pulse flex items-center gap-2">
                        🚀 CHUẨN BỊ BAY
                      </span>
                      <span className="text-[9px] text-white/80 font-mono tracking-widest mt-2 bg-slate-950/95 py-1.5 px-4 border border-cyan-500/40 rounded-2xl flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                        CỔNG CƯỢC MỞ: <b className="text-[#00f0ff] font-extrabold text-glow-blue">{crashCountdown}S</b>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* PENALTY STAGE */}
              {activeTab === 'penalty' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-[#021808] to-[#010903] overflow-hidden">
                  {/* Soccer stadium pitch patterns with perspective */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.05)_1.5px,transparent_1.5px)] bg-[size:16px_16px]" />
                  <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-emerald-950/30 via-emerald-950/10 to-transparent border-t border-emerald-500/20" />

                  {/* ESPN-Style Sports HUD score bug */}
                  <div className="absolute top-12 z-10 flex items-center bg-slate-950/95 border border-white/10 px-4 py-1.5 rounded-full font-mono text-[9px] shadow-[0_4px_25px_rgba(0,0,0,0.8)] gap-3">
                    <span className="text-emerald-400 font-extrabold tracking-wider">STUDENT</span>
                    <span className="text-white font-black bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-500/40">1</span>
                    <span className="text-slate-500 font-bold">:</span>
                    <span className="text-white font-black bg-red-900/50 px-2 py-0.5 rounded border border-red-500/40">1</span>
                    <span className="text-red-400 font-extrabold tracking-wider">S-BOT</span>
                    <span className="text-yellow-400 font-black animate-pulse px-1.5 border border-yellow-500/30 rounded text-[8px]">90'</span>
                  </div>

                  {/* Stadium Spotlights representation */}
                  <div className="absolute top-0 inset-x-0 flex justify-between px-10 pointer-events-none opacity-20">
                    <div className="w-32 h-64 bg-gradient-to-br from-white/10 to-transparent origin-top rotate-12 blur-md" />
                    <div className="w-32 h-64 bg-gradient-to-bl from-white/10 to-transparent origin-top -rotate-12 blur-md" />
                  </div>

                  {/* Goal and Goalpost Net with neon-glow targets */}
                  <div className="relative w-84 h-38 border-4 border-slate-50/80 border-b-0 rounded-t-xl flex justify-center items-end bottom-1 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_1.5px,transparent_1.5px)] bg-[size:10px_10px] rounded-t-lg" />
                    
                    {/* Glowing yellow target corner indicators */}
                    <div className="absolute inset-x-4 top-2 bottom-2 grid grid-cols-2 grid-rows-2 gap-x-28 gap-y-12 opacity-50 pointer-events-none z-10">
                      <div className="border border-dashed border-yellow-400 rounded-lg flex items-center justify-center text-[7px] text-yellow-300 font-mono font-bold bg-yellow-500/5 animate-pulse">G1</div>
                      <div className="border border-dashed border-yellow-400 rounded-lg flex items-center justify-center text-[7px] text-yellow-300 font-mono font-bold bg-yellow-500/5 animate-pulse">G2</div>
                      <div className="border border-dashed border-yellow-400 rounded-lg flex items-center justify-center text-[7px] text-yellow-300 font-mono font-bold bg-yellow-500/5 animate-pulse">G3</div>
                      <div className="border border-dashed border-yellow-400 rounded-lg flex items-center justify-center text-[7px] text-yellow-300 font-mono font-bold bg-yellow-500/5 animate-pulse">G4</div>
                    </div>

                    {/* Goalkeeper styled with gloves and jersey */}
                    <div className="absolute bottom-0 w-16 h-22 bg-gradient-to-b from-orange-400 via-orange-600 to-amber-700 rounded-t-full border-2 border-slate-50 flex flex-col items-center justify-center shadow-2xl transition-all duration-300 z-10"
                      style={
                        penPhase === 'SHOOTING'
                          ? {
                              transform: `translate(${
                                currentPenResult.dive === 0 ? '-90px' :
                                currentPenResult.dive === 1 ? '90px' :
                                currentPenResult.dive === 2 ? '-65px, 15px' :
                                currentPenResult.dive === 3 ? '65px, 15px' : '0'
                              })`
                            }
                          : {}
                      }
                    >
                      <span className="text-3xl filter drop-shadow-md">🧤</span>
                      <span className="text-[7px] font-mono font-black text-white bg-black/80 px-1.5 rounded border border-white/20 uppercase tracking-widest mt-1">S88-GK</span>
                    </div>

                    {/* Soccer ball with glowing speed trails */}
                    {penPhase === 'SHOOTING' && (
                      <motion.div 
                        animate={{ rotate: 720 }}
                        transition={{ repeat: Infinity, duration: 0.15, ease: "linear" }}
                        className="absolute bottom-[-32px] w-9 h-9 rounded-full bg-white border border-slate-900 flex items-center justify-center text-sm shadow-[0_0_20px_rgba(255,255,255,0.8)] transition-all duration-500 z-20"
                        style={{
                          transform: `translate(${
                            currentPenResult.target === 0 ? '-100px, -115px' :
                            currentPenResult.target === 1 ? '100px, -115px' :
                            currentPenResult.target === 2 ? '-80px, -45px' :
                            currentPenResult.target === 3 ? '80px, -45px' : '0px, -70px'
                          }) scale(0.55)`
                        }}
                      >
                        ⚽
                      </motion.div>
                    )}
                  </div>

                  {/* Cinematic goal or save alerts */}
                  {penPhase === 'COOLDOWN' && (
                    <div className="absolute bottom-16 text-center z-20 bg-slate-950/95 px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl">
                      <span className={`font-black font-mono text-sm text-glow tracking-widest block ${
                        currentPenResult.isGoal ? 'text-emerald-400 text-glow-emerald animate-bounce' : 'text-red-500 text-glow-red'
                      }`}>
                        {currentPenResult.isGoal ? '⚽ GOOOAL! BÓNG VÀO LƯỚI!' : '🧤 CẢN PHÁ XUẤT THẦN!'}
                      </span>
                      <span className="text-[8px] text-[#8b949e] font-mono block mt-1 uppercase">
                        {currentPenResult.isGoal ? 'Cú sút phạt hiểm hóc xé toạc mành lưới' : 'Thủ môn đoán chuẩn hướng bóng ôm gọn'}
                      </span>
                    </div>
                  )}

                  {penPhase === 'BETTING' && (
                    <div className="absolute bottom-16 text-center z-10">
                      <span className="text-glow-emerald text-emerald-400 text-[9px] font-mono font-black bg-slate-950/95 py-1.5 px-4 rounded-full border border-emerald-500/30 tracking-wider animate-pulse uppercase">
                        ⚽ LƯỢT SÚT PHẠT ĐANG MỞ ĐẶT CƯỢC ⚽
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* HORSE RACING STAGE */}
              {activeTab === 'horse' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-[#111910] to-[#1e2d1d] p-4">
                  {/* Cyber race track stardust overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,128,0.03)_1.5px,transparent_1.5px)] bg-[size:16px_16px]" />
                  
                  {/* High Tech Neon Dirt Track */}
                  <div className="w-[95%] h-36 bg-amber-950/15 border border-yellow-500/20 rounded-2xl relative overflow-hidden p-2 flex flex-col justify-between shadow-inner backdrop-blur-xs">
                    
                    {/* Glowing lanes */}
                    {[1, 2, 3, 4].map((num) => {
                      let xOffset = 10; // default start
                      if (horsePhase === 'RACING') {
                        const elapsed = horseSecondsElapsed - horseBettingSecs;
                        const progress = elapsed / horseRacingSecs; // 0 to 1
                        
                        // Deterministic horse speeds with winning horse getting ahead at the end.
                        const isWinner = currentHorseResult.winner === num;
                        const wobble = Math.abs(Math.sin(elapsed * 15 + num)) * 1.8;
                        const baseSpeed = progress * 72;
                        const winnerBoost = isWinner && progress > 0.45 ? (progress - 0.45) * 22 : 0;
                        const loserLag = !isWinner && progress > 0.65 ? -(progress - 0.65) * 5 : 0;
                        
                        xOffset = 10 + baseSpeed + winnerBoost + loserLag + wobble;
                        xOffset = Math.min(Math.max(xOffset, 10), 84); // clamp
                      } else if (horsePhase === 'COOLDOWN') {
                        const isWinner = currentHorseResult.winner === num;
                        xOffset = isWinner ? 84 : 70 - num * 3;
                      }

                      return (
                        <div key={num} className="h-6 border-b border-dashed border-white/10 last:border-0 flex items-center relative w-full">
                          <span className="absolute left-1 text-[8px] font-mono text-[#00ff80]/60 font-bold">L.{num}</span>
                          
                          {/* Running horse emoji with dust effect */}
                          <div
                            style={{ left: `${xOffset}%` }}
                            className="absolute flex items-center gap-1.5 transition-all duration-300"
                          >
                            <span className="text-xl filter drop-shadow-md animate-[bounce_0.3s_infinite_alternate]">🐎</span>
                            {/* Dust cloud representation */}
                            {horsePhase === 'RACING' && (
                              <div className="w-1.5 h-1.5 bg-yellow-600/30 rounded-full filter blur-xs animate-ping shrink-0" />
                            )}
                            <span className={`text-[7px] font-mono font-black px-1 py-0.5 rounded-sm border ${
                              currentHorseResult.winner === num && horsePhase === 'COOLDOWN' ? 'border-amber-400 bg-amber-400 text-black shadow-[0_0_8px_rgba(234,179,8,0.4)]' : 'border-white/20 text-white bg-slate-900/60'
                            }`}>
                              #{num}
                            </span>
                          </div>
                          
                          {/* Finish Line checkerboard */}
                          <div className="absolute right-12 top-0 bottom-0 w-1.5 bg-[repeating-linear-gradient(45deg,#fff,#fff_4px,#000_4px,#000_8px)] opacity-60" />
                        </div>
                      );
                    })}
                  </div>

                  {/* High contrast announcements */}
                  {horsePhase === 'BETTING' && (
                    <div className="absolute top-12 py-1 px-4 bg-slate-950/95 border border-yellow-500/40 rounded-full text-[9px] font-mono font-black uppercase text-white animate-pulse">
                      🏁 CHUẨN BỊ XUẤT PHÁT: <span className="text-yellow-400 text-glow-gold">{horseCountdown}S</span>
                    </div>
                  )}

                  {horsePhase === 'COOLDOWN' && (
                    <div className="absolute bottom-16 text-center z-10 bg-slate-950/95 px-5 py-2.5 rounded-2xl border-2 border-yellow-500/30 shadow-2xl animate-[bounce_1s_infinite_alternate]">
                      <span className="font-black font-mono text-xs text-yellow-400 text-glow-gold tracking-wider block">
                        🏆 CHIẾN MÃ SỐ {currentHorseResult.winner} VÔ ĐỊCH!
                      </span>
                      <span className="text-[8px] text-[#8b949e] font-mono block mt-1 uppercase">
                        Sải bước thần tốc, giành cúp vinh quang vàng ròng
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* CLAW MACHINE STAGE */}
              {activeTab === 'claw' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-[#130b17] to-[#26152b] p-4">
                  {/* Neon retro grid background */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(236,72,153,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(236,72,153,0.015)_1px,transparent_1px)] bg-[size:18px_18px]" />
                  
                  {/* Dynamic Conveyor Belt with neon reflection */}
                  <div className="absolute bottom-8 w-full h-12 bg-purple-950/30 border-y border-purple-500/20 flex items-center overflow-hidden">
                    <div className="flex gap-8 text-xl animate-[marquee_12s_linear_infinite]">
                      {['🧸', '🦄', '🐉', '🐱', '🦊', '🐼', '🐯', '🐰'].map((emoji, idx) => {
                        const isCaught = clawPhase === 'COOLDOWN' && currentClawResult.success && currentClawResult.prizeIndex === idx % 5;
                        return (
                          <div key={idx} className={`transition-all duration-300 ${isCaught ? 'opacity-0 scale-50' : 'opacity-100'}`}>
                            {emoji}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Crane Claw Assembly */}
                  {(() => {
                    let clawY = 10; // Top
                    let grabbedToy = '';
                    
                    if (clawPhase === 'DROPPING') {
                      const elapsed = clawSecondsElapsed - clawBettingSecs;
                      if (elapsed < 5) {
                        clawY = 10 + (elapsed / 5) * 55;
                      } else {
                        clawY = 65 - ((elapsed - 5) / 5) * 55;
                        if (currentClawResult.success) {
                          const toys = ['🧸', '🦄', '🐉', '🐱', '🦊'];
                          grabbedToy = toys[currentClawResult.prizeIndex];
                        }
                      }
                    } else if (clawPhase === 'COOLDOWN') {
                      clawY = 10;
                      if (currentClawResult.success) {
                        const toys = ['🧸', '🦄', '🐉', '🐱', '🦊'];
                        grabbedToy = toys[currentClawResult.prizeIndex];
                      }
                    }

                    return (
                      <div className="absolute inset-x-0 top-0 h-full pointer-events-none z-10 flex justify-center w-full">
                        {/* Metal steel wire */}
                        <div className="w-0.5 bg-slate-300 shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ height: `${clawY}%` }} />
                        
                        {/* Mechanical Claw with drop shadows */}
                        <div className="absolute flex flex-col items-center transition-all duration-200" style={{ top: `${clawY}%` }}>
                          <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                            {clawPhase === 'DROPPING' && clawSecondsElapsed - clawBettingSecs > 4.5 && grabbedToy ? '🤏' : '🎣'}
                          </span>
                          
                          {/* Snatched Toy inside claw claw */}
                          {grabbedToy && (
                            <span className="text-xl mt-[-4px] animate-[bounce_0.5s_infinite_alternate] filter drop-shadow-md">
                              {grabbedToy}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* High contrast headers */}
                  {clawPhase === 'BETTING' && (
                    <div className="absolute top-12 py-1 px-4 bg-slate-950/95 border border-pink-500/40 rounded-full text-[9px] font-mono font-black uppercase text-white animate-pulse">
                      🧸 MỞ GẮP THÚ: <span className="text-pink-400 text-glow-pink">{clawCountdown}S</span>
                    </div>
                  )}

                  {clawPhase === 'COOLDOWN' && (
                    <div className="absolute bottom-22 text-center z-20 bg-slate-950/95 px-5 py-2 rounded-2xl border border-pink-500/40 shadow-2xl">
                      <span className={`font-black font-mono text-[10px] block tracking-wider ${
                        currentClawResult.success ? 'text-pink-400 text-glow-pink animate-bounce' : 'text-slate-400'
                      }`}>
                        {currentClawResult.success ? '🎉 GẮP TRÚNG THÀNH CÔNG!' : '💔 HỤT MẤT TIẾC QUÁ!'}
                      </span>
                      {currentClawResult.success && (
                        <span className="text-[8px] text-white/70 font-mono block mt-0.5 uppercase">
                          Sở hữu ngay em thú bông hiếm, nhận gấp x4.0 PP
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* FC ARENA STAGE */}
              {activeTab === 'fcmobile' && (() => {
                const simElapsed = fcPhase === 'PLAYING' ? fcSecondsElapsed - fcBettingSecs : -1;
                const sim = getSoccerSimulation(simElapsed, fcRealtimeScore.blue, fcRealtimeScore.red);

                return (
                  <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-[#060e1b] to-[#0e1624] p-3 sm:p-4">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05)_1.5px,transparent_1.5px)] bg-[size:16px_16px]" />
                    
                    {/* Realistic Lush Soccer Pitch Pattern */}
                    <div className="w-[95%] h-56 sm:h-64 border-2 border-white/20 rounded-2xl relative overflow-hidden bg-gradient-to-b from-[#0f451b] to-[#175d27] shadow-2xl flex items-center justify-center">
                      {/* Lines & markings */}
                      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/20" />
                      <div className="absolute w-18 h-18 sm:w-22 sm:h-22 border-2 border-white/10 rounded-full" />
                      <div className="absolute inset-y-0 left-0 w-[14%] border-2 border-white/10 border-l-0" />
                      <div className="absolute inset-y-0 right-0 w-[14%] border-2 border-white/10 border-r-0" />

                      {/* Render Players as sleek dynamic shirts */}
                      {sim.players.map((p) => {
                        const isBallCarrier = sim.activePlayerId === p.id;
                        return (
                          <div
                            key={p.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none transition-all duration-300"
                            style={{ left: `${p.x}%`, top: `${p.y}%` }}
                          >
                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-mono font-black border-2 shadow-xl ${
                              p.team === 'blue' 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-700 border-blue-300 text-white' 
                                : 'bg-gradient-to-br from-red-500 to-red-700 border-red-300 text-white'
                            }`}>
                              {p.number}
                            </div>
                            
                            <span className="text-[6px] sm:text-[8px] font-mono text-white bg-slate-950/80 px-1 rounded-sm scale-90 whitespace-nowrap -mt-0.5 select-none font-bold shadow">
                              {p.label === 'GK' ? `GK` : p.name.split(' ')[1] || p.name}
                            </span>

                            {isBallCarrier && (
                              <span className="absolute -top-4 text-[6px] sm:text-[8px] text-yellow-300 font-black animate-bounce whitespace-nowrap uppercase tracking-wider bg-slate-950 border border-yellow-400/40 px-1 py-0.5 rounded">
                                {sim.action}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Glowing soccer ball */}
                      <div 
                        className="absolute z-30 text-xs transition-all duration-200 pointer-events-none -translate-x-1/2 -translate-y-1/2 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]" 
                        style={{ left: `${sim.ball.x}%`, top: `${sim.ball.y}%` }}
                      >
                        ⚽
                      </div>
                    </div>

                    {/* TV Commentary box with audio waves */}
                    <div className="w-[95%] mt-2 bg-slate-950/90 border border-blue-500/20 px-3 py-1.5 rounded-2xl flex gap-3 items-center shadow-2xl">
                      <div className="w-6 h-6 rounded-full bg-blue-950 border border-blue-400/30 flex items-center justify-center shrink-0 text-xs">
                        🎙️
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[7px] font-mono font-black text-blue-400 block tracking-wider uppercase">BÌNH LUẬN TRỰC TIẾP 🎤</span>
                        <p className="text-[9px] text-slate-200 mt-0.5 italic truncate font-semibold font-sans">
                          "{sim.commentary}"
                        </p>
                      </div>
                    </div>

                    {/* Live Scorebug */}
                    <div className="absolute top-8 flex items-center bg-slate-950/95 border border-white/10 px-3 py-1 rounded-full font-mono text-[8px] sm:text-[9px] shadow-2xl gap-3 z-10">
                      <span className="text-blue-400 font-extrabold">BLUE</span>
                      <span className="text-white font-black bg-blue-900/50 px-2 py-0.5 rounded border border-blue-500/30">
                        {fcRealtimeScore.blue}
                      </span>
                      <span className="text-slate-500 font-bold">:</span>
                      <span className="text-white font-black bg-red-900/50 px-2 py-0.5 rounded border border-red-500/30">
                        {fcRealtimeScore.red}
                      </span>
                      <span className="text-red-400 font-extrabold">RED</span>
                      <span className="text-yellow-400 font-black px-1 animate-pulse">
                        {fcPhase === 'BETTING' ? "PRE-MATCH" : fcPhase === 'PLAYING' ? `${Math.min(Math.floor((fcSecondsElapsed - fcBettingSecs) / fcPlayingSecs * 90), 90)}'` : "FT"}
                      </span>
                    </div>

                    {fcPhase === 'BETTING' && (
                      <div className="absolute top-18 py-1 px-3 bg-slate-950/95 border border-blue-500/40 rounded-full text-[9px] font-mono font-black uppercase text-white animate-pulse z-10">
                        🏟️ TRẬN ĐẤU BẮT ĐẦU TRONG: {fcCountdown}S
                      </div>
                    )}

                    {fcPhase === 'COOLDOWN' && (
                      <div className="absolute bottom-18 text-center z-10 bg-slate-950/95 px-5 py-2 rounded-2xl border border-blue-500/40 shadow-2xl">
                        <span className="font-black font-mono text-[9px] text-blue-400 text-glow-blue tracking-wider block">
                          🏟️ TRẬN ĐẤU KẾT THÚC!
                        </span>
                        <span className="text-[8px] text-[#8b949e] font-mono block mt-0.5 uppercase">
                          Tỉ số chung cuộc: Xanh {currentFcResult.blueScore} - {currentFcResult.redScore} Đỏ
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* DRAGON TIGER STAGE */}
              {activeTab === 'dragontiger' && (() => {
                const res = currentDtResult;
                const dVal = res.dragonVal;
                const tVal = res.tigerVal;
                
                let winner = 'TIE';
                if (dVal > tVal) winner = 'DRAGON';
                else if (tVal > dVal) winner = 'TIGER';

                const showCards = dtPhase === 'REVEAL' || dtPhase === 'COOLDOWN';

                return (
                  <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-[#140505] via-[#050202] to-[#05110a] p-3 sm:p-4">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.04)_1.5px,transparent_1.5px)] bg-[size:16px_16px]" />
                    
                    {/* Golden Casino Felt Grid Arena */}
                    <div className="w-[95%] h-56 sm:h-64 border-2 border-yellow-500/30 rounded-3xl relative overflow-hidden bg-gradient-to-b from-[#100707] to-[#07140b] shadow-[0_4px_30px_rgba(0,0,0,0.9)] flex items-center justify-between px-6 sm:px-12">
                      
                      {/* Left Side: Dragon Area with gold embroidery border */}
                      <div className={`flex flex-col items-center gap-3.5 transition-all duration-300 ${
                        dtPhase === 'COOLDOWN' && winner === 'DRAGON' ? 'scale-105 filter drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'opacity-85'
                      }`}>
                        <span className="text-glow-red text-red-500 font-black text-xs sm:text-sm tracking-widest uppercase flex items-center gap-1">🐉 RỒNG</span>
                        
                        {/* Card Slot */}
                        <div className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-center relative bg-slate-950 transition-all duration-500 shadow-xl ${
                          dtPhase === 'COOLDOWN' && winner === 'DRAGON' 
                            ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] bg-red-950/30' 
                            : 'border-red-500/25'
                        }`}>
                          {showCards ? (
                            <div className="flex flex-col items-center justify-between h-full p-2.5 w-full bg-white rounded-lg">
                              <span className={`text-xs font-black self-start ${res.dragonSuit === '♠' || res.dragonSuit === '♣' ? 'text-slate-950' : 'text-red-600'}`}>
                                {getCardLabel(dVal)}
                              </span>
                              <span className={`text-3xl sm:text-4xl filter drop-shadow-sm ${res.dragonSuit === '♠' || res.dragonSuit === '♣' ? 'text-slate-950' : 'text-red-600'}`}>
                                {res.dragonSuit}
                              </span>
                              <span className={`text-xs font-black self-end rotate-180 ${res.dragonSuit === '♠' || res.dragonSuit === '♣' ? 'text-slate-950' : 'text-red-600'}`}>
                                {getCardLabel(dVal)}
                              </span>
                            </div>
                          ) : (
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-red-800 to-red-950 flex items-center justify-center border border-red-500/40 p-1">
                              <div className="w-full h-full border border-red-500/20 rounded-md flex flex-col items-center justify-center bg-black/50">
                                <span className="text-xl sm:text-2xl animate-pulse">🐉</span>
                                <span className="text-[6px] font-mono font-bold text-red-400 mt-1 uppercase tracking-wider">S88 DRAGON</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {dtPhase === 'COOLDOWN' && winner === 'DRAGON' && (
                          <span className="py-0.5 px-2 bg-red-600 text-white font-black text-[7px] uppercase tracking-wider rounded-md animate-bounce shadow-lg">
                            WINNER 🏆
                          </span>
                        )}
                      </div>

                      {/* Center: Tie Area & Status */}
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex flex-col items-center justify-center bg-slate-950 transition-all duration-300 ${
                          dtPhase === 'COOLDOWN' && winner === 'TIE' 
                            ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] scale-105' 
                            : 'border-yellow-500/20'
                        }`}>
                          <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest block leading-none">HÒA</span>
                          <span className="text-[8px] text-slate-500 font-mono mt-0.5">x8.0</span>
                        </div>
                        {dtPhase === 'COOLDOWN' && winner === 'TIE' && (
                          <span className="py-0.5 px-2 bg-yellow-500 text-black font-black text-[7px] uppercase tracking-wider rounded-md animate-pulse">
                            TIE GAME 🤝
                          </span>
                        )}
                      </div>

                      {/* Right Side: Tiger Area with gold embroidery border */}
                      <div className={`flex flex-col items-center gap-3.5 transition-all duration-300 ${
                        dtPhase === 'COOLDOWN' && winner === 'TIGER' ? 'scale-105 filter drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'opacity-85'
                      }`}>
                        <span className="text-glow-blue text-blue-400 font-black text-xs sm:text-sm tracking-widest uppercase flex items-center gap-1">🐯 HỔ</span>
                        
                        {/* Card Slot */}
                        <div className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-center relative bg-slate-950 transition-all duration-500 shadow-xl ${
                          dtPhase === 'COOLDOWN' && winner === 'TIGER' 
                            ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)] bg-blue-950/30' 
                            : 'border-blue-500/25'
                        }`}>
                          {showCards ? (
                            <div className="flex flex-col items-center justify-between h-full p-2.5 w-full bg-white rounded-lg">
                              <span className={`text-xs font-black self-start ${res.tigerSuit === '♠' || res.tigerSuit === '♣' ? 'text-slate-950' : 'text-red-600'}`}>
                                {getCardLabel(tVal)}
                              </span>
                              <span className={`text-3xl sm:text-4xl filter drop-shadow-md ${res.tigerSuit === '♠' || res.tigerSuit === '♣' ? 'text-slate-950' : 'text-red-600'}`}>
                                {res.tigerSuit}
                              </span>
                              <span className={`text-xs font-black self-end rotate-180 ${res.tigerSuit === '♠' || res.tigerSuit === '♣' ? 'text-slate-950' : 'text-red-600'}`}>
                                {getCardLabel(tVal)}
                              </span>
                            </div>
                          ) : (
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-800 to-blue-950 flex items-center justify-center border border-blue-500/40 p-1">
                              <div className="w-full h-full border border-blue-500/20 rounded-md flex flex-col items-center justify-center bg-black/50">
                                <span className="text-xl sm:text-2xl animate-pulse">🐯</span>
                                <span className="text-[6px] font-mono font-bold text-blue-400 mt-1 uppercase tracking-wider">S88 TIGER</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {dtPhase === 'COOLDOWN' && winner === 'TIGER' && (
                          <span className="py-0.5 px-2 bg-blue-600 text-white font-black text-[7px] uppercase tracking-wider rounded-md animate-bounce shadow-lg">
                            WINNER 🏆
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Header overlay title */}
                    <div className="absolute top-8 py-1 px-4 bg-slate-950/95 border border-yellow-500/30 rounded-full text-[9px] font-mono font-black uppercase text-yellow-400 tracking-widest z-10">
                      🐅 ĐẤU TRƯỜNG LONG TRANH HỔ ĐẤU S88
                    </div>

                    {dtPhase === 'BETTING' && (
                      <div className="absolute top-18 py-1 px-3 bg-slate-950/95 border border-red-500/40 rounded-full text-[9px] font-mono font-black uppercase text-white animate-pulse z-10">
                        🔔 ĐẶT CƯỢC: {dtCountdown}S
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>

            {/* Bottom HUD */}
            <div className="z-10 flex justify-between items-center w-full font-mono text-[10px]">
              <span className="flex items-center gap-1 font-bold text-white uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                {activeTab === 'taixiu' ? txTimerText : 
                 activeTab === 'crash' ? crashTimerText : 
                 activeTab === 'penalty' ? penTimerText : 
                 activeTab === 'horse' ? horseTimerText : 
                 activeTab === 'claw' ? clawTimerText : 
                 activeTab === 'fcmobile' ? fcTimerText : dtTimerText}
              </span>
              <span className="text-white/40">Phát trực tiếp #S88-LIV-0{
                activeTab === 'taixiu' ? txCycleId : 
                activeTab === 'crash' ? crashCycleId : 
                activeTab === 'penalty' ? penCycleId : 
                activeTab === 'horse' ? horseCycleId : 
                activeTab === 'claw' ? clawCycleId : 
                activeTab === 'fcmobile' ? fcCycleId : dtCycleId}</span>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
          </div>

        {/* RIGHT COLUMN: Chat Sidebar - STRICTLY strictly limited to last 10 messages (Span 4) */}
        <div className="lg:col-span-4 flex flex-col glass-box border-white/5 overflow-hidden">
          
          <div className="bg-black/60 border-b border-white/5 py-3 px-4 flex justify-between items-center shrink-0">
            <span className="font-mono text-[11px] font-black text-white tracking-wider flex items-center gap-1">
              💬 PHÒNG CHÁT LIVE (MỚI NHẤT)
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* Messages container - compact, vertical layout, exactly 10 latest messages shown */}
          <div 
            ref={chatContainerRef}
            className="flex-1 p-3 overflow-y-auto space-y-2 font-sans scrollbar-thin bg-black/20"
          >
            {chatMessages.map((msg, index) => {
              if ((msg as any).isBotBet) {
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={index} 
                    className="bg-cyan-950/80 border border-cyan-500/40 rounded-xl p-2 text-cyan-200 font-mono text-[10px] leading-relaxed shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 font-black text-[8px] rounded uppercase border border-cyan-400/30">
                        🤖 AI BOT
                      </span>
                      <strong className="font-bold text-white">{msg.sender}</strong>
                    </div>
                    <div className="text-amber-300 font-bold flex items-center gap-1">
                      <span>🎲</span> {msg.message}
                    </div>
                  </motion.div>
                );
              }
              if (msg.isSystem) {
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={index} 
                    className="bg-white/5 border border-white/5 rounded-lg p-2 text-[#ff4500] font-mono text-[10px] leading-relaxed"
                  >
                    <strong className="font-bold mr-1">{msg.sender}:</strong>
                    {msg.message}
                  </motion.div>
                );
              }
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={index} 
                  className={`flex flex-col gap-0.5 max-w-[90%] ${
                    msg.isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <span className="text-[9px] text-[#8b949e] font-mono font-bold">
                    {msg.sender}
                  </span>
                  <div className={`py-1.5 px-2.5 rounded-xl leading-relaxed text-[11px] font-medium whitespace-pre-line ${
                    msg.isUser 
                      ? 'bg-red-600 text-white rounded-tr-none' 
                      : 'bg-black/50 border border-[#30363d] text-white rounded-tl-none'
                  }`}>
                    {msg.message}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Compact Input */}
          <form 
            onSubmit={handleSendChat}
            className="p-2.5 bg-black/40 border-t border-white/5 flex gap-2 shrink-0 font-mono text-xs"
          >
            <input
              type="text"
              placeholder="Nhập nội dung chát..."
              className="flex-1 bg-black/50 border border-[#30363d] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-white/30 focus:outline-none focus:border-red-500"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button
              type="submit"
              className="px-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      </div>
      {/* Betting Board */}
      <div className="mt-4">
        {/* Real-time Betting Board & Total Pools */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Total Pools Card */}
            <div className="md:col-span-5 glass-box p-4 border-[#ffd700]/20 bg-yellow-950/5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block mb-1">📊 TỔNG TIỀN CƯỢC VÁN NÀY</span>
                <span className="text-glow-gold text-[#ffd700] text-2xl font-black font-mono">
                  {liveBets.reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5 font-mono text-[10px]">
                {activeTab === 'taixiu' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-red-400">🔴 TỔNG CỬA TÀI:</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'TAI').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-400">🔵 TỔNG CỬA XỈU:</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'XIU').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                  </>
                )}
                {activeTab === 'crash' && (
                  <div className="flex justify-between">
                    <span className="text-cyan-400">🚀 TỔNG TIỀN GỒNG LÃI:</span>
                    <span className="font-bold text-white">
                      {liveBets.reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                    </span>
                  </div>
                )}
                {activeTab === 'penalty' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-emerald-400">⚽ TỔNG CỬA VÀO (GOAL):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'GOAL').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-400">🧤 TỔNG THỦ MÔN CẢN (MISS):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'MISS').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Live Scrolling Bets Board & User History Tab */}
            <div className="md:col-span-7 glass-box p-4 border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 font-mono text-[10px]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBetsBoardTab('LIVE')}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                      betsBoardTab === 'LIVE'
                        ? 'bg-[#00f0ff] text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    ⚡ CƯỢC LIVE MỚI NHẤT
                  </button>

                  <button
                    onClick={() => setBetsBoardTab('HISTORY')}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                      betsBoardTab === 'HISTORY'
                        ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    📜 LỊCH SỬ CƯỢC BẠN (20 VÁN)
                  </button>
                </div>
              </div>

              <div className="h-32 overflow-y-auto space-y-1.5 scrollbar-thin pr-1 font-mono text-[10px] text-slate-300">
                {betsBoardTab === 'LIVE' ? (
                  liveBets.length === 0 ? (
                    <div className="text-white/20 italic text-center py-6">Đang đợi người chơi xuống tiền...</div>
                  ) : (
                    [...liveBets].reverse().map((bet, idx) => {
                      let outcomeText = `+${bet.amount.toLocaleString()} PP`;
                      let outcomeColorClass = 'text-[#ffd700]';
                      let statusLabel = '';
                      
                      const getOutcome = () => {
                        if (activeTab === 'taixiu') {
                          if (txPhase === 'BETTING' || txPhase === 'SHAKING') return { pending: true };
                          const dices = currentTxResult.dices;
                          const sum = dices[0] + dices[1] + dices[2];
                          const isTriple = dices[0] === dices[1] && dices[1] === dices[2];
                          const isTai = sum >= 11;
                          
                          let won = false;
                          let mult = 2.0;

                          if (bet.choice === 'TAI') {
                            won = !isTriple && isTai;
                          } else if (bet.choice === 'XIU') {
                            won = !isTriple && !isTai;
                          } else if (bet.choice === 'TRIPLE_1') {
                            won = dices[0] === 1 && dices[1] === 1 && dices[2] === 1;
                            mult = 150.0;
                          } else if (bet.choice === 'TRIPLE_6') {
                            won = dices[0] === 6 && dices[1] === 6 && dices[2] === 6;
                            mult = 150.0;
                          }
                          return { won, payout: won ? Math.floor(bet.amount * mult) : 0 };
                        }
                        
                        if (activeTab === 'dragontiger') {
                          if (dtPhase === 'BETTING') return { pending: true };
                          const res = currentDtResult;
                          const dVal = res.dragonVal;
                          const tVal = res.tigerVal;
                          let winner = 'TIE';
                          if (dVal > tVal) winner = 'DRAGON';
                          else if (tVal > dVal) winner = 'TIGER';
                          const won = bet.choice === winner;
                          const mult = winner === 'TIE' ? 8.0 : 2.0;
                          return { won, payout: won ? Math.floor(bet.amount * mult) : 0 };
                        }
                        
                        if (activeTab === 'crash') {
                          if (crashPhase === 'BETTING') return { pending: true };
                          if (bet.isUser) {
                            return hasCashedOut 
                              ? { won: true, payout: Math.floor(bet.amount * currentCrashMultiplier) }
                              : { won: false, payout: 0 };
                          } else {
                            const botCashoutTarget = ((bet.sender.charCodeAt(0) % 6) + 12) / 10;
                            const won = currentCrashPoint >= botCashoutTarget;
                            return { won, payout: won ? Math.floor(bet.amount * botCashoutTarget) : 0 };
                          }
                        }
                        
                        if (activeTab === 'penalty') {
                          if (penPhase === 'BETTING') return { pending: true };
                          const isGoal = currentPenResult.isGoal;
                          const target = currentPenResult.target;
                          let won = false;
                          let mult = 1.8;
                          if (bet.choice === 'GOAL') {
                            won = isGoal;
                            mult = 1.8;
                          } else if (bet.choice === 'MISS') {
                            won = !isGoal;
                            mult = 1.8;
                          } else if (bet.choice.startsWith('QUAD_')) {
                            const qIdx = parseInt(bet.choice.split('_')[1]);
                            won = isGoal && (target === qIdx);
                            mult = 4.5;
                          }
                          return { won, payout: won ? Math.floor(bet.amount * mult) : 0 };
                        }
                        
                        if (activeTab === 'horse') {
                          if (horsePhase !== 'COOLDOWN') return { pending: true };
                          const winner = currentHorseResult.winner;
                          const won = bet.choice === `HORSE_${winner}`;
                          return { won, payout: won ? Math.floor(bet.amount * 3.5) : 0 };
                        }
                        
                        if (activeTab === 'claw') {
                          if (clawPhase !== 'COOLDOWN') return { pending: true };
                          const success = currentClawResult.success;
                          const won = (bet.choice === 'CLAW_WIN' && success) || (bet.choice === 'CLAW_LOSE' && !success);
                          const mult = bet.choice === 'CLAW_WIN' ? 4.0 : 1.2;
                          return { won, payout: won ? Math.floor(bet.amount * mult) : 0 };
                        }
                        
                        if (activeTab === 'fcmobile') {
                          if (fcPhase !== 'COOLDOWN') return { pending: true };
                          const blue = currentFcResult.blueScore;
                          const red = currentFcResult.redScore;
                          let won = false;
                          let mult = 1.9;
                          if (bet.choice === 'FC_BLUE') won = blue > red;
                          else if (bet.choice === 'FC_RED') won = red > blue;
                          else if (bet.choice === 'FC_DRAW') { won = blue === red; mult = 3.0; }
                          return { won, payout: won ? Math.floor(bet.amount * mult) : 0 };
                        }
                        
                        return { pending: true };
                      };
                      
                      const res = getOutcome();
                      if (!res.pending) {
                        if (res.won) {
                          outcomeText = `+${res.payout?.toLocaleString()} PP`;
                          outcomeColorClass = 'text-emerald-400 font-black';
                          statusLabel = ' thắng';
                        } else {
                          outcomeText = `-${bet.amount.toLocaleString()} PP`;
                          outcomeColorClass = 'text-red-500 line-through opacity-80';
                          statusLabel = ' thua';
                        }
                      }
                      
                      return (
                        <div key={idx} className={`flex justify-between items-center py-1.5 px-2 rounded transition-all duration-300 ${
                          bet.isUser 
                            ? res.won ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/20'
                            : 'bg-black/20'
                        }`}>
                          <span className="font-bold truncate max-w-[120px] flex items-center gap-1">
                            {bet.isUser ? '⭐️ BẠN' : bet.sender}
                            {statusLabel && <span className={`text-[8px] font-normal uppercase ${res.won ? 'text-emerald-400' : 'text-red-500'}`}>{statusLabel}</span>}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="bg-white/5 px-1.5 py-0.5 rounded text-white/70 text-[8px]">
                              {bet.choice === 'TAI' ? 'TÀI' : 
                               bet.choice === 'XIU' ? 'XỈU' : 
                               bet.choice === 'CRASH_RIDE' ? 'PHI THUYỀN' : 
                               bet.choice === 'GOAL' ? 'VÀO' : 
                               bet.choice === 'MISS' ? 'TRƯỢT' : bet.choice.startsWith('QUAD_') ? `SÚT G.${parseInt(bet.choice.split('_')[1]) + 1}` : 
                               bet.choice === 'CLAW_WIN' ? 'GẮP TRÚNG' :
                               bet.choice === 'CLAW_LOSE' ? 'GẮP HỤT' :
                               bet.choice === 'FC_BLUE' ? 'XANH' :
                               bet.choice === 'FC_RED' ? 'ĐỎ' :
                               bet.choice === 'FC_DRAW' ? 'HÒA' : bet.choice.replace('HORSE_', 'NGỰA #')}
                            </span>
                            <span className={`${outcomeColorClass} font-black font-mono`}>{outcomeText}</span>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : (
                  userGameHistory.length === 0 ? (
                    <div className="text-white/30 italic text-center py-6 font-mono text-xs">
                      Chưa có lịch sử đặt cược nào gần đây!
                    </div>
                  ) : (
                    userGameHistory.map((item, idx) => {
                      const isWin = item.pnl > 0;
                      return (
                        <div
                          key={item.id || idx}
                          className={`flex items-center justify-between p-2 rounded border font-mono text-[10px] ${
                            isWin ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-red-950/20 border-red-500/20'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${isWin ? 'bg-emerald-400' : 'bg-red-500'}`} />
                              {item.game}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {item.time || new Date(item.timestamp || Date.now()).toLocaleTimeString('vi-VN')}
                            </span>
                          </div>

                          <div className="text-right">
                            <div className="text-[9px] text-slate-400">Cược: {item.bet?.toLocaleString()} PP</div>
                            <div className={`font-black ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isWin ? `+${item.pnl?.toLocaleString()} PP` : `${item.pnl?.toLocaleString()} PP`}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          </div>

          {/* Place Bet Panel */}
          <div className="glass-box p-4 border-white/5 flex flex-col gap-3">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-mono mb-2">1. Chọn cửa cược hợp lệ:</span>
              
              {activeTab === 'taixiu' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      disabled={txPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === txCycleId)}
                      onClick={() => setBetChoice('TAI')}
                      className={`py-3 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer ${
                        betChoice === 'TAI'
                          ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                          : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      🔴 TÀI (11-17 NÚT) [ x2.0 ]
                    </button>
                    <button
                      disabled={txPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === txCycleId)}
                      onClick={() => setBetChoice('XIU')}
                      className={`py-3 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer ${
                        betChoice === 'XIU'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                          : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      🔵 XỈU (4-10 NÚT) [ x2.0 ]
                    </button>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase font-mono mb-1.5 text-center">BÃO BA HỘT - SĂN HŨ SIÊU KHỦNG (X150):</span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        disabled={txPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === txCycleId)}
                        onClick={() => setBetChoice('TRIPLE_1')}
                        className={`py-2.5 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          betChoice === 'TRIPLE_1'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                            : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <span>🎲 BÃO 1 (3 CON 1)</span>
                        <span className="text-[9px] text-amber-400 font-bold">[ x150.0 ]</span>
                      </button>
                      <button
                        disabled={txPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === txCycleId)}
                        onClick={() => setBetChoice('TRIPLE_6')}
                        className={`py-2.5 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          betChoice === 'TRIPLE_6'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                            : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <span>🎲 BÃO 6 (3 CON 6)</span>
                        <span className="text-[9px] text-amber-400 font-bold">[ x150.0 ]</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'crash' && (
                <div className="flex flex-col gap-2">
                  <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-[11px] font-mono text-cyan-400 leading-relaxed text-center">
                    🌟 Đặt cược và chốt lời (CÁSHOUT) khi phi thuyền đang bay. Tên lửa phát nổ trước chốt lời, mất cược!
                  </div>
                  <button
                    disabled={crashPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === crashCycleId)}
                    onClick={() => setBetChoice('CRASH_RIDE')}
                    className={`w-full py-3 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer ${
                      betChoice === 'CRASH_RIDE'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500'
                        : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    [ CHỌN BAY PHI THUYỀN ]
                  </button>
                </div>
              )}

              {activeTab === 'penalty' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      disabled={penPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === penCycleId)}
                      onClick={() => setBetChoice('GOAL')}
                      className={`py-3 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer ${
                        betChoice === 'GOAL'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                          : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      BẤT KỲ GÓC VÀO [ x1.8 ]
                    </button>
                    <button
                      disabled={penPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === penCycleId)}
                      onClick={() => setBetChoice('MISS')}
                      className={`py-3 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer ${
                        betChoice === 'MISS'
                          ? 'bg-red-500/20 border-red-500 text-red-500'
                          : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      THỦ MÔN CẢN PHÁ [ x2.0 ]
                    </button>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase font-mono my-2 text-center">HOẶC CƯỢC GÓC SÚT HIỂM HÓC CHỈ ĐỊNH (X4.5):</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {['Góc Cao Trái', 'Góc Cao Phải', 'Góc Dưới Trái', 'Góc Dưới Phải', 'Chính Giữa'].map((lbl, idx) => (
                        <button
                          key={idx}
                          disabled={penPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === penCycleId)}
                          onClick={() => setBetChoice(`QUAD_${idx}`)}
                          className={`py-2 rounded-lg border font-mono text-[9px] font-black transition-all cursor-pointer text-center ${
                            betChoice === `QUAD_${idx}`
                              ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                              : 'bg-black/40 border-white/5 text-white/60 hover:bg-white/5'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={lbl}
                        >
                          Sút G.{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'horse' && (
                <div className="space-y-2">
                  <div className="p-2.5 bg-amber-950/10 border border-amber-500/20 rounded-xl text-[10px] font-mono text-amber-400 leading-relaxed text-center">
                    🏇 Đặt cược vào chú ngựa chiến dũng mãnh nhất cán đích đầu tiên để nhận x3.5 mức cược!
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        disabled={horsePhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === horseCycleId)}
                        onClick={() => setBetChoice(`HORSE_${num}`)}
                        className={`py-3 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          betChoice === `HORSE_${num}`
                            ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                            : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <span className="text-sm">🐎</span>
                        <span className="text-[9px]">Ngựa #{num} [x3.5]</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'claw' && (
                <div className="space-y-2">
                  <div className="p-2.5 bg-pink-950/10 border border-pink-500/20 rounded-xl text-[10px] font-mono text-pink-400 leading-relaxed text-center">
                    🧸 Gắp thành công thú nhồi bông để nhận x4.0 mức cược, hoặc chọn cửa Hụt để nhận x1.2 mức cược an toàn!
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      disabled={clawPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === clawCycleId)}
                      onClick={() => setBetChoice('CLAW_WIN')}
                      className={`py-3.5 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        betChoice === 'CLAW_WIN'
                          ? 'bg-pink-500/20 border-pink-500 text-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.2)]'
                          : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span className="text-base">🎉</span>
                      <span>GẮP THÀNH CÔNG [ x4.0 ]</span>
                    </button>
                    <button
                      disabled={clawPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === clawCycleId)}
                      onClick={() => setBetChoice('CLAW_LOSE')}
                      className={`py-3.5 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        betChoice === 'CLAW_LOSE'
                          ? 'bg-slate-500/20 border-slate-500 text-slate-400'
                          : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span className="text-base">💔</span>
                      <span>GẮP HỤT MẤT [ x1.2 ]</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'fcmobile' && (
                <div className="space-y-2">
                  <div className="p-2.5 bg-blue-950/10 border border-blue-500/20 rounded-xl text-[10px] font-mono text-blue-400 leading-relaxed text-center">
                    ⚽ Dự đoán đội chiến thắng trong trận đấu đại chiến siêu cúp rực lửa!
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      disabled={fcPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === fcCycleId)}
                      onClick={() => setBetChoice('FC_BLUE')}
                      className={`py-3 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        betChoice === 'FC_BLUE'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                          : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span>🔵 XANH THẮNG</span>
                      <span className="text-[9px] text-blue-400">[ x2.0 ]</span>
                    </button>
                    <button
                      disabled={fcPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === fcCycleId)}
                      onClick={() => setBetChoice('FC_DRAW')}
                      className={`py-3 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        betChoice === 'FC_DRAW'
                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
                          : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span>🤝 CỬA HOÀ</span>
                      <span className="text-[9px] text-yellow-400">[ x4.0 ]</span>
                    </button>
                    <button
                      disabled={fcPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === fcCycleId)}
                      onClick={() => setBetChoice('FC_RED')}
                      className={`py-3 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        betChoice === 'FC_RED'
                          ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                          : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span>🔴 ĐỎ THẮNG</span>
                      <span className="text-[9px] text-red-400">[ x2.0 ]</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'dragontiger' && (
                <div className="space-y-2">
                  <div className="p-2.5 bg-amber-950/10 border border-yellow-500/20 rounded-xl text-[10px] font-mono text-yellow-400 leading-relaxed text-center">
                    🐉 Đặt cược RỒNG HỔ hoặc cửa HÒA. Hòa thắng trả lại 50% tiền cược Rồng/Hổ và ăn gấp 8 lần cửa Hòa!
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      disabled={dtPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === dtCycleId)}
                      onClick={() => setBetChoice('DRAGON')}
                      className={`py-3.5 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        betChoice === 'DRAGON'
                          ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                          : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span>🐉 ĐẶT RỒNG</span>
                      <span className="text-[9px] text-red-400">[ x2.0 ]</span>
                    </button>
                    <button
                      disabled={dtPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === dtCycleId)}
                      onClick={() => setBetChoice('TIE')}
                      className={`py-3.5 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        betChoice === 'TIE'
                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
                          : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span>🤝 ĐẶT HOÀ</span>
                      <span className="text-[9px] text-yellow-400">[ x8.0 ]</span>
                    </button>
                    <button
                      disabled={dtPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === dtCycleId)}
                      onClick={() => setBetChoice('TIGER')}
                      className={`py-3.5 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        betChoice === 'TIGER'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                          : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span>🐯 ĐẶT HỔ</span>
                      <span className="text-[9px] text-blue-400">[ x2.0 ]</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch mt-1">
              <div className="flex-1 flex gap-2 font-mono text-xs">
                <input
                  type="number"
                  placeholder="Nhập mức PP cược..."
                  className="bg-black/40 border border-[#30363d] rounded-lg p-3 text-center text-[#ffd700] text-glow-gold font-bold w-2/3 focus:border-red-500 focus:outline-none"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={
                    activeTab === 'taixiu' ? txPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === txCycleId) :
                    activeTab === 'crash' ? crashPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === crashCycleId) :
                    activeTab === 'penalty' ? penPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === penCycleId) :
                    activeTab === 'horse' ? horsePhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === horseCycleId) :
                    activeTab === 'claw' ? clawPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === clawCycleId) :
                    activeTab === 'dragontiger' ? dtPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === dtCycleId) :
                    fcPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === fcCycleId)
                  }
                />
                
                <div className="grid grid-cols-2 gap-1 w-1/3">
                  <button 
                    onClick={() => setBetAmount('1000')}
                    className="bg-black/40 border border-white/5 hover:bg-white/5 text-[9px] font-bold rounded cursor-pointer"
                  >
                    1K
                  </button>
                  <button 
                    onClick={() => setBetAmount('5000')}
                    className="bg-black/40 border border-white/5 hover:bg-white/5 text-[9px] font-bold rounded cursor-pointer"
                  >
                    5K
                  </button>
                </div>
              </div>

              {activeTab === 'crash' && crashPhase === 'FLIGHT' && currentBetPlaced && currentBetPlaced.cycleId === crashCycleId && !currentBetPlaced.evaluated ? (
                <button
                  onClick={handleCrashCashout}
                  className="py-3 px-6 bg-gradient-to-r from-cyan-600 to-cyan-500 text-black font-mono font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1 w-full sm:w-auto shrink-0"
                >
                  🚀 CHỐT X{currentCrashMultiplier} (ĂN {Math.floor(currentBetPlaced.amount * currentCrashMultiplier)} PP)
                </button>
              ) : (
                <button
                  disabled={
                    activeTab === 'taixiu' ? txPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === txCycleId) :
                    activeTab === 'crash' ? crashPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === crashCycleId) :
                    activeTab === 'penalty' ? penPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === penCycleId) :
                    activeTab === 'horse' ? horsePhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === horseCycleId) :
                    activeTab === 'claw' ? clawPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === clawCycleId) :
                    activeTab === 'dragontiger' ? dtPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === dtCycleId) :
                    fcPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === fcCycleId)
                  }
                  onClick={handlePlaceBet}
                  className="py-3 px-6 bg-red-600 hover:bg-red-500 text-white font-mono font-black text-xs uppercase tracking-widest rounded-xl disabled:bg-slate-800 disabled:text-white/30 disabled:border-transparent disabled:cursor-not-allowed hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-1 w-full sm:w-auto shrink-0"
                >
                  <Coins className="w-4 h-4" /> [ XÁC NHẬN CƯỢC LIVE ]
                </button>
              )}
            </div>

            {currentBetPlaced && (
              <div className="py-2.5 px-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex justify-between items-center text-[10px] font-mono mt-1 text-yellow-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  ĐÃ KHÓA CƯỢC: {currentBetPlaced.amount.toLocaleString()} PP cửa [{currentBetPlaced.choice}]
                </span>
                <span>
                  {currentBetPlaced.evaluated ? '✅ ĐÃ KẾT TOÁN' : '⏳ CHỜ KẾT QUẢ'}
                </span>
              </div>
            )}

          </div>
      </div>

      {/* 🔴 ADMIN CHEAT PANEL (SECRET) */}
      {isAdminMode && (
        <div className="fixed bottom-4 left-4 z-50 bg-black/90 border border-red-500 p-4 rounded-xl shadow-[0_0_30px_rgba(255,0,0,0.4)] font-mono text-[10px] w-80 text-red-400">
          <h3 className="font-black text-xs text-white mb-2 flex items-center justify-between">
            <span className="animate-pulse">⚠️ GOD MODE (CTRL+SHIFT+H)</span>
            <button onClick={() => setIsAdminMode(false)} className="text-white/50 hover:text-white"><X className="w-3 h-3" /></button>
          </h3>
          <p className="text-white/60 mb-2">Thao túng kết quả LIVE Stream. Áp dụng cho chu kỳ hiện tại.</p>
          
          {activeTab === 'taixiu' && (
            <div className="space-y-2 border-t border-red-500/20 pt-2 text-[10px]">
              <div className="flex justify-between">
                <span>Chu kỳ TX: {txCycleId}</span>
                <span className="text-white font-bold">KQ gốc: {currentTxResult.dices.reduce((a,b)=>a+b,0)} ({currentTxResult.dices.reduce((a,b)=>a+b,0)>=11?'TÀI':'XỈU'})</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-white/60 block font-mono">Chọn mặt xúc xắc tự do:</span>
                <div className="flex gap-2">
                  <select 
                    value={cheatTxDie1} 
                    onChange={(e) => setCheatTxDie1(parseInt(e.target.value))} 
                    className="bg-black text-white border border-red-500/40 rounded px-1.5 py-1 text-center font-bold flex-1"
                  >
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Xúc sắc 1: {n}</option>)}
                  </select>
                  <select 
                    value={cheatTxDie2} 
                    onChange={(e) => setCheatTxDie2(parseInt(e.target.value))} 
                    className="bg-black text-white border border-red-500/40 rounded px-1.5 py-1 text-center font-bold flex-1"
                  >
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Xúc sắc 2: {n}</option>)}
                  </select>
                  <select 
                    value={cheatTxDie3} 
                    onChange={(e) => setCheatTxDie3(parseInt(e.target.value))} 
                    className="bg-black text-white border border-red-500/40 rounded px-1.5 py-1 text-center font-bold flex-1"
                  >
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Xúc sắc 3: {n}</option>)}
                  </select>
                </div>
                <button 
                  onClick={() => { 
                    localStorage.setItem('s88_cheat_taixiu_' + txCycleId, JSON.stringify({ dices: [cheatTxDie1, cheatTxDie2, cheatTxDie3] })); 
                    window.dispatchEvent(new Event('storage'));
                    alert(`Đã ép kết quả xúc xắc: ${cheatTxDie1}-${cheatTxDie2}-${cheatTxDie3} (Tổng: ${cheatTxDie1+cheatTxDie2+cheatTxDie3})`);
                  }} 
                  className="w-full bg-red-600/90 text-white font-bold p-1 rounded hover:bg-red-500 font-mono mt-1"
                >
                  ÁP DỤNG KẾT QUẢ TX (Tự chọn: {cheatTxDie1+cheatTxDie2+cheatTxDie3})
                </button>
              </div>
            </div>
          )}

          {activeTab === 'crash' && (
            <div className="space-y-2 border-t border-red-500/20 pt-2 text-[10px]">
              <div className="flex justify-between">
                <span>Chu kỳ Crash: {crashCycleId}</span>
                <span className="text-white font-bold">KQ gốc: x{currentCrashPoint}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-white/60 block font-mono">Nhập số nhân nổ hũ tự do (Ví dụ: 1.50, 10.85, 99.00):</span>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    step="0.01"
                    min="1.00"
                    max="1000.00"
                    value={cheatCrashPointInput}
                    onChange={(e) => setCheatCrashPointInput(e.target.value)}
                    className="bg-black text-white border border-red-500/40 rounded px-2 py-1 flex-1 font-bold font-mono"
                  />
                  <button 
                    onClick={() => { 
                      const parsed = parseFloat(cheatCrashPointInput);
                      if (isNaN(parsed) || parsed < 1.0) {
                        alert('Số nhân không hợp lệ! Vui lòng nhập >= 1.0');
                        return;
                      }
                      localStorage.setItem('s88_cheat_crash_' + crashCycleId, parsed.toFixed(2)); 
                      window.dispatchEvent(new Event('storage'));
                      alert(`Đã ép Crash nổ tại x${parsed.toFixed(2)}`);
                    }} 
                    className="bg-cyan-600 text-black font-black px-3 rounded hover:bg-cyan-500 font-mono"
                  >
                    ÁP DỤNG
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'penalty' && (
            <div className="space-y-2 border-t border-red-500/20 pt-2 text-[10px]">
              <div className="flex justify-between">
                <span>Chu kỳ Pen: {penCycleId}</span>
                <span className="text-white font-bold">KQ gốc: {currentPenResult.isGoal ? 'VÀO' : 'TRƯỢT'}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-white/60 block font-mono">Ép góc sút / hướng bay thủ môn tự do:</span>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={cheatPenTarget} 
                    onChange={(e) => setCheatPenTarget(parseInt(e.target.value))} 
                    className="bg-black text-white border border-red-500/40 rounded px-1 py-1 text-[9px]"
                  >
                    <option value={0}>Sút Góc cao trái (G.1)</option>
                    <option value={1}>Sút Góc cao phải (G.2)</option>
                    <option value={2}>Sút Góc thấp trái (G.3)</option>
                    <option value={3}>Sút Góc thấp phải (G.4)</option>
                    <option value={4}>Sút Chính giữa (G.5)</option>
                  </select>
                  <select 
                    value={cheatPenDive} 
                    onChange={(e) => setCheatPenDive(parseInt(e.target.value))} 
                    className="bg-black text-white border border-red-500/40 rounded px-1 py-1 text-[9px]"
                  >
                    <option value={0}>Thủ môn Bay Trái</option>
                    <option value={1}>Thủ môn Bay Phải</option>
                    <option value={2}>Thủ môn Quỳ Trái</option>
                    <option value={3}>Thủ môn Quỳ Phải</option>
                    <option value={4}>Thủ môn Đứng im</option>
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-white/60">Ép kết quả:</span>
                  <div className="flex gap-1 flex-1 justify-end">
                    <button 
                      onClick={() => setCheatPenGoal(true)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${cheatPenGoal ? 'bg-emerald-600 text-white' : 'bg-black border border-white/10 text-white/40'}`}
                    >
                      ⚽ VÀO (GOAL)
                    </button>
                    <button 
                      onClick={() => setCheatPenGoal(false)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${!cheatPenGoal ? 'bg-red-600 text-white' : 'bg-black border border-white/10 text-white/40'}`}
                    >
                      🧤 CẢN PHÁ
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => { 
                    localStorage.setItem('s88_cheat_penalty_' + penCycleId, JSON.stringify({ target: cheatPenTarget, dive: cheatPenDive, isGoal: cheatPenGoal })); 
                    window.dispatchEvent(new Event('storage'));
                    alert(`Đã ép Penalty: sút góc ${cheatPenTarget}, thủ môn dive ${cheatPenDive}, kết quả: ${cheatPenGoal ? 'VÀO' : 'CẢN'}`);
                  }} 
                  className="w-full bg-red-600 text-white font-bold p-1 rounded hover:bg-red-500 mt-1"
                >
                  ÁP DỤNG KẾT QUẢ PENALTY
                </button>
              </div>
            </div>
          )}

          {activeTab === 'horse' && (
            <div className="space-y-2 border-t border-red-500/20 pt-2 text-[10px]">
              <div className="flex justify-between">
                <span>Chu kỳ Ngựa: {horseCycleId}</span>
                <span className="text-white font-bold">KQ gốc: Ngựa #{currentHorseResult.winner}</span>
              </div>
              <div className="space-y-1">
                <span className="text-white/60 block font-mono">Chọn Ngựa về Nhất tự do:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => { 
                        localStorage.setItem('s88_cheat_horse_' + horseCycleId, JSON.stringify({ winner: num })); 
                        window.dispatchEvent(new Event('storage'));
                        alert(`Đã ép Ngựa #${num} về nhất!`);
                      }}
                      className="bg-amber-500/20 border border-amber-500/50 p-1.5 rounded hover:bg-amber-500 hover:text-white text-center text-[9px] font-bold"
                    >
                      Ngựa #{num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'claw' && (
            <div className="space-y-2 border-t border-red-500/20 pt-2 text-[10px]">
              <div className="flex justify-between">
                <span>Chu kỳ Gắp: {clawCycleId}</span>
                <span className="text-white font-bold">KQ gốc: {currentClawResult.success ? 'TRÚNG' : 'HỤT'}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-white/60 block font-mono">Tùy chỉnh thành công & vị trí thú gắp:</span>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setCheatClawSuccess(true)}
                      className={`px-2 py-0.5 rounded text-[8px] font-bold ${cheatClawSuccess ? 'bg-emerald-600 text-white' : 'bg-black text-white/40 border border-white/5'}`}
                    >
                      🧸 GẮP TRÚNG
                    </button>
                    <button 
                      onClick={() => setCheatClawSuccess(false)}
                      className={`px-2 py-0.5 rounded text-[8px] font-bold ${!cheatClawSuccess ? 'bg-red-600 text-white' : 'bg-black text-white/40 border border-white/5'}`}
                    >
                      ❌ GẮP HỤT
                    </button>
                  </div>
                  <select 
                    value={cheatClawPrize} 
                    onChange={(e) => setCheatClawPrize(parseInt(e.target.value))}
                    className="bg-black text-white border border-red-500/40 rounded px-1 py-0.5 text-[9px] flex-1 text-center"
                  >
                    <option value={0}>Gấu Bông Thường (#1)</option>
                    <option value={1}>Pikachu Tinh Nghịch (#2)</option>
                    <option value={2}>Heo Hồng Vương Giả (JACKPOT #3)</option>
                    <option value={3}>Mèo Chiêu Tài Nhỏ (#4)</option>
                    <option value={4}>Thỏ Ngọc Cung Trăng (#5)</option>
                  </select>
                </div>
                <button 
                  onClick={() => { 
                    localStorage.setItem('s88_cheat_claw_' + clawCycleId, JSON.stringify({ success: cheatClawSuccess, prizeIndex: cheatClawPrize })); 
                    window.dispatchEvent(new Event('storage'));
                    alert(`Đã ép Gắp Thú: ${cheatClawSuccess ? 'GẮP TRÚNG' : 'GẮP HỤT'}, Thú vị trí #${cheatClawPrize + 1}`);
                  }} 
                  className="w-full bg-red-600 text-white font-bold p-1 rounded hover:bg-red-500 mt-1"
                >
                  ÁP DỤNG KẾT QUẢ GẮP THÚ
                </button>
              </div>
            </div>
          )}

          {activeTab === 'fcmobile' && (
            <div className="space-y-2 border-t border-red-500/20 pt-2 text-[10px]">
              <div className="flex justify-between">
                <span>Chu kỳ Bóng đá: {fcCycleId}</span>
                <span className="text-white font-bold">KQ gốc: {currentFcResult.blueScore}-{currentFcResult.redScore}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-white/60 block font-mono">Nhập tỉ số trận đấu tự do:</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-blue-400 font-bold">XANH:</span>
                    <input 
                      type="number" 
                      min="0"
                      max="9"
                      value={cheatFcBlueScore}
                      onChange={(e) => setCheatFcBlueScore(parseInt(e.target.value) || 0)}
                      className="bg-black text-white border border-red-500/40 rounded px-1 py-0.5 w-12 text-center font-bold"
                    />
                  </div>
                  <span className="text-white font-black">:</span>
                  <div className="flex items-center gap-1 flex-1 justify-end">
                    <input 
                      type="number" 
                      min="0"
                      max="9"
                      value={cheatFcRedScore}
                      onChange={(e) => setCheatFcRedScore(parseInt(e.target.value) || 0)}
                      className="bg-black text-white border border-red-500/40 rounded px-1 py-0.5 w-12 text-center font-bold"
                    />
                    <span className="text-red-400 font-bold">ĐỎ:</span>
                  </div>
                </div>
                <button 
                  onClick={() => { 
                    localStorage.setItem('s88_cheat_fcmobile_' + fcCycleId, JSON.stringify({ blueScore: cheatFcBlueScore, redScore: cheatFcRedScore })); 
                    window.dispatchEvent(new Event('storage'));
                    alert(`Đã ép tỉ số Bóng Đá: Xanh ${cheatFcBlueScore} - ${cheatFcRedScore} Đỏ`);
                  }} 
                  className="w-full bg-red-600 text-white font-bold p-1 rounded hover:bg-red-500 mt-1"
                >
                  ÁP DỤNG TỈ SỐ BÓNG ĐÁ (Tự chọn: {cheatFcBlueScore}-{cheatFcRedScore})
                </button>
              </div>
            </div>
          )}

          {activeTab === 'dragontiger' && (
            <div className="space-y-2 border-t border-red-500/20 pt-2 text-[10px]">
              <div className="flex justify-between">
                <span>Chu kỳ Rồng Hổ: {dtCycleId}</span>
                <span className="text-white font-bold">KQ gốc: Rồng [{getCardLabel(currentDtResult.dragonVal)}{currentDtResult.dragonSuit}] - Hổ [{getCardLabel(currentDtResult.tigerVal)}{currentDtResult.tigerSuit}]</span>
              </div>
              <div className="space-y-1.5 font-mono">
                <span className="text-white/60 block">Chọn lá bài Rồng & Hổ tự do:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-red-400 font-bold block">🐉 RỒNG:</span>
                    <div className="flex gap-1">
                      <select 
                        value={cheatDtDragonVal}
                        onChange={(e) => setCheatDtDragonVal(parseInt(e.target.value))}
                        className="bg-black text-white border border-red-500/40 rounded px-1 py-0.5 text-[9px] flex-1 text-center font-bold"
                      >
                        {[1,2,3,4,5,6,7,8,9,10,11,12,13].map(v => <option key={v} value={v}>{getCardLabel(v)}</option>)}
                      </select>
                      <select 
                        value={cheatDtDragonSuit}
                        onChange={(e) => setCheatDtDragonSuit(e.target.value)}
                        className="bg-black text-white border border-red-500/40 rounded px-1 py-0.5 text-[9px] w-12 text-center"
                      >
                        {['♠', '♣', '♦', '♥'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-yellow-500 font-bold block">🐯 HỔ:</span>
                    <div className="flex gap-1">
                      <select 
                        value={cheatDtTigerVal}
                        onChange={(e) => setCheatDtTigerVal(parseInt(e.target.value))}
                        className="bg-black text-white border border-red-500/40 rounded px-1 py-0.5 text-[9px] flex-1 text-center font-bold"
                      >
                        {[1,2,3,4,5,6,7,8,9,10,11,12,13].map(v => <option key={v} value={v}>{getCardLabel(v)}</option>)}
                      </select>
                      <select 
                        value={cheatDtTigerSuit}
                        onChange={(e) => setCheatDtTigerSuit(e.target.value)}
                        className="bg-black text-white border border-red-500/40 rounded px-1 py-0.5 text-[9px] w-12 text-center"
                      >
                        {['♠', '♣', '♦', '♥'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => { 
                    localStorage.setItem('s88_cheat_dragontiger_' + dtCycleId, JSON.stringify({ dragonVal: cheatDtDragonVal, dragonSuit: cheatDtDragonSuit, tigerVal: cheatDtTigerVal, tigerSuit: cheatDtTigerSuit })); 
                    window.dispatchEvent(new Event('storage'));
                    alert(`Đã ép bài Rồng Hổ: Rồng [${getCardLabel(cheatDtDragonVal)}${cheatDtDragonSuit}] - Hổ [${getCardLabel(cheatDtTigerVal)}${cheatDtTigerSuit}]`);
                  }} 
                  className="w-full bg-red-600 text-white font-bold p-1 rounded hover:bg-red-500 mt-1"
                >
                  ÁP DỤNG KẾT QUẢ RỒNG HỔ
                </button>
              </div>
            </div>
          )}

          <button onClick={() => {
            localStorage.removeItem('s88_cheat_taixiu_' + txCycleId);
            localStorage.removeItem('s88_cheat_crash_' + crashCycleId);
            localStorage.removeItem('s88_cheat_penalty_' + penCycleId);
            localStorage.removeItem('s88_cheat_horse_' + horseCycleId);
            localStorage.removeItem('s88_cheat_claw_' + clawCycleId);
            localStorage.removeItem('s88_cheat_fcmobile_' + fcCycleId);
            localStorage.removeItem('s88_cheat_dragontiger_' + dtCycleId);
            window.dispatchEvent(new Event('storage'));
          }} className="w-full mt-2 bg-white/10 p-1.5 rounded text-white hover:bg-white/20">CLEAR CHEAT</button>
        </div>
      )}

      {/* Rules Modal Overlay */}
      <AnimatePresence>
        {showRulesModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[6000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/30 rounded-2xl max-w-md w-full p-6 relative font-mono text-xs text-white shadow-[0_0_50px_rgba(234,179,8,0.15)]"
            >
              <button 
                onClick={() => setShowRulesModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-yellow-400 font-black text-sm uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
                <HelpCircle className="w-5 h-5 text-yellow-400" />
                Luật Chơi: {
                  activeTab === 'taixiu' ? '🎲 TÀI XỈU S88' :
                  activeTab === 'crash' ? '🚀 KHÔNG CHIẾN S88' :
                  activeTab === 'penalty' ? '⚽ SÚT PHẠT 3D' :
                  activeTab === 'horse' ? '🐎 ĐUA NGỰA LIVE' :
                  activeTab === 'claw' ? '🧸 GẮP THÚ LIVE' :
                  activeTab === 'dragontiger' ? '🐉 RỒNG HỔ LIVE' :
                  '🏟️ FC ARENA S88'
                }
              </h3>

              <div className="space-y-3 leading-relaxed text-slate-300 max-h-[300px] overflow-y-auto pr-1">
                {activeTab === 'taixiu' && (
                  <>
                    <p>• Người chơi đặt cược vào cửa <strong className="text-yellow-400">TÀI</strong> (tổng xúc xắc từ 11 đến 17) hoặc <strong className="text-yellow-400">XỈU</strong> (tổng xúc xắc từ 4 đến 10).</p>
                    <p>• Tỉ lệ ăn cược cực cao là <strong className="text-yellow-400">x2.0</strong> số tiền đặt cược.</p>
                    <p>• <strong className="text-red-400">Lưu ý luật đặc biệt (Bão)</strong>: Nếu cả 3 xúc xắc lắc ra cùng một mặt (ví dụ: ba xúc xắc 3, hoặc ba xúc xắc 6), tất cả người chơi cược cửa Tài và cửa Xỉu đều bị tính là <strong className="text-red-400">THUA CUỘC</strong>.</p>
                  </>
                )}

                {activeTab === 'crash' && (
                  <>
                    <p>• Phi thuyền S88 sẽ cất cánh bay cao và số nhân (multiplier) giải thưởng tăng dần liên tục theo đồ thị leo dốc.</p>
                    <p>• Người chơi có thể ấn nút <strong className="text-emerald-400">NHẢY DÙ / CHỐT LỜI</strong> bất cứ lúc nào khi phi thuyền đang bay để rút tiền ngay lập tức.</p>
                    <p>• <strong className="text-red-400">Luật tử vong (CRASH)</strong>: Phi thuyền sẽ bị chiến đấu cơ của quân địch bắn nổ ngẫu nhiên. Nếu phi thuyền phát nổ trước khi bạn kịp ấn nhảy dù, bạn sẽ mất trắng 100% số tiền cược.</p>
                    <p>• Số nhân nổ bí ẩn dao động từ <strong className="text-yellow-400">x0.01 cực nhanh</strong> cho tới cơ hội nổ ở số nhân cực khủng <strong className="text-cyan-400">x50, x100</strong>!</p>
                  </>
                )}

                {activeTab === 'penalty' && (
                  <>
                    <p>• Bạn đóng vai cầu thủ sút phạt đền và chọn sút bóng vào 1 trong 5 hướng cầu môn ngẫu nhiên.</p>
                    <p>• Thủ môn hệ thống cũng bay người cản phá ngẫu nhiên 1 trong 5 hướng.</p>
                    <p>• Nếu hướng sút của bạn <strong className="text-emerald-400">KHÔNG TRÙNG</strong> hướng bay người cản phá của thủ môn, bạn sút VÀO lưới và thắng cược <strong className="text-yellow-400">x2.0</strong>!</p>
                    <p>• Nếu trùng hướng, thủ môn cản phá thành công và bạn mất tiền cược.</p>
                  </>
                )}

                {activeTab === 'horse' && (
                  <>
                    <p>• Đấu trường có 4 ngựa đua dũng mãnh tranh tài khốc liệt.</p>
                    <p>• Bạn chọn đặt cược vào chú ngựa mình tin tưởng nhất: số 1, số 2, số 3, hoặc số 4.</p>
                    <p>• Cuộc đua diễn ra tự động. Chú ngựa bứt phá ngoạn mục cán mốc đích đầu tiên sẽ đem lại chiến thắng với tỉ lệ trả thưởng khổng lồ <strong className="text-yellow-400">x4.0</strong>!</p>
                  </>
                )}

                {activeTab === 'claw' && (
                  <>
                    <p>• Máy gắp thú tự động chạy qua lại theo chiều ngang liên tục.</p>
                    <p>• Bạn hãy căn thời điểm ngàm gắp thẳng hàng và bấm nút hạ để ngàm hạ sút xuống gắp lấy phần quà.</p>
                    <p>• Tỉ lệ gắp trúng ngẫu nhiên. Phần quà gắp trúng sẽ trả thưởng ngẫu nhiên theo hệ số nhân từ <strong className="text-yellow-400">x1.5 đến x10.0</strong> cực hấp dẫn!</p>
                  </>
                )}

                {activeTab === 'fcmobile' && (
                  <>
                    <p>• Đại chiến siêu kinh điển truyền hình trực tiếp giữa Đội Xanh (Blue) và Đội Đỏ (Red).</p>
                    <p>• Bạn có thể chọn đặt cược 1 trong 3 cửa:</p>
                    <p>&nbsp;&nbsp;- Đội Xanh Thắng: Tỉ lệ <strong className="text-yellow-400">x2.0</strong></p>
                    <p>&nbsp;&nbsp;- Đội Đỏ Thắng: Tỉ lệ <strong className="text-yellow-400">x2.0</strong></p>
                    <p>&nbsp;&nbsp;- Kết quả Hòa: Tỉ lệ trả thưởng cao <strong className="text-yellow-400">x4.0</strong></p>
                  </>
                )}

                {activeTab === 'dragontiger' && (
                  <>
                    <p>• Trò chơi chia bài so điểm kịch tính bậc nhất thế giới.</p>
                    <p>• Dealer chia 1 lá bài cho bên Rồng (Dragon) và 1 lá bài cho bên Hổ (Tiger). Bên nào có lá bài giá trị cao hơn sẽ chiến thắng.</p>
                    <p>• Điểm số bài tính theo thứ tự: A (1) &lt; 2 &lt; 3 &lt; ... &lt; J (11) &lt; Q (12) &lt; K (13). Suits chất bài không ảnh hưởng kết quả điểm số.</p>
                    <p>• Cửa đặt cược và tỉ lệ:</p>
                    <p>&nbsp;&nbsp;- Cược Rồng thắng: Nhận <strong className="text-yellow-400">x2.0</strong></p>
                    <p>&nbsp;&nbsp;- Cược Hổ thắng: Nhận <strong className="text-yellow-400">x2.0</strong></p>
                    <p>&nbsp;&nbsp;- Cược Hòa (Tie): Nhận <strong className="text-yellow-400">x8.0</strong></p>
                    <p>• <strong className="text-emerald-400">Chính sách bảo hiểm cửa Hòa</strong>: Nếu ván đấu có kết quả Hòa, người chơi đã đặt cược cửa Rồng hoặc cửa Hổ sẽ được <strong className="text-emerald-400">hoàn trả lại 50%</strong> số tiền đã đặt cược!</p>
                  </>
                )}
              </div>

              <div className="mt-5 border-t border-white/10 pt-4 flex justify-end">
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-1.5 rounded-xl font-bold cursor-pointer transition-all"
                >
                  ĐÃ HIỂU
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
