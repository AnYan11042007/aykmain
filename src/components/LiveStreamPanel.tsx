/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { get, ref, push, update, onValue } from 'firebase/database';
import { db } from '../firebase';
import { User } from '../types';
import { incrementMissionProgress } from '../utils/missions';
import { getTodayVNString, getVNTimeString } from '../utils/date';
import { 
  Tv, Users, Send, Coins, Flame, Trophy, Play, Info, AlertCircle, AlertTriangle,
  Sparkles, Volume2, Compass, Maximize2, Minimize2, ExternalLink, X, HelpCircle, Clock,
  MessageSquare, Zap, Crown, Award, Heart, ThumbsUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LiveStreamPanelProps {
  uid: string;
  user: User | null;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

type GameType = 'taixiu' | 'crash' | 'penalty' | 'horse' | 'claw' | 'fcmobile' | 'dragontiger';

const BOT_NAMES = [
  'ĐạiGiaQuận1', 'HọcThầnAYK', 'LắcKinhKông', 'ThầnBàiĐấtCảng', 
  'HípPro99', 'BạchThủLô', 'KiềuNữBếnTre', 'MạnhThườngQuân',
  'CậuCảHảiPhòng', 'CòBayLả', 'TùngSơnBóngĐá', 'LuffyXìDách',
  'HeoConLonTon', 'DũngSĩGồngLãi', 'ThầyHuấnDạyVăn', 'GiaCátDự',
  'NamCương88', 'HoàngTửLắcBát', 'ThánhSoiCầu', 'ThợSănRồng',
  'BáChủTàiXỉu', 'BéMiuMiu', 'CáoGiàVegas', 'BãoLộc88',
  'BốGiàAYK', 'TayĐuaF1', 'VuaTiếnLên', 'PhápSưSoiCầu',
  'MãnhHổCầnThơ', 'CửuLongVương', 'TỷPhúĐấtBắc', 'VuaPháLưới3D',
  'XạThủSútPhạt', 'ChủSảnhCasino', 'ThiếuGiaHàThành', 'BáChủKhánĐài',
  'QuânVươngRồng', 'ĐạiCườngVIP', 'AnAnXinhGái', 'BéBôngXìDách',
  'SharkBình_S88', 'SếpTùng_MTP', 'KhánhThầnThánh', 'ThầnKêChợGạo',
  'MinhCôngTử', 'DũngGiaoLưu', 'HoàngKimTự', 'TiếnDũng999',
  'VuaSănHũ_HN', 'HoàngThầnLô', 'CậuBéChămChỉ', 'CôNàngTiềnTỷ',
  'ThánhTấtTay', 'HùngCầuBệt', 'LongRồngThần', 'BìnhDươngStar',
  'LanKiều_VIP', 'ThầyGiaoDịch', 'TríTuệMới', 'CaoThủ102'
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
    'Không chiến sinh tử gồng lãi né đạn đỉnh cao quá!',
    'Gồng x50 giàu sang luôn.',
    'Tên lửa này né đạn dồn dập đỉnh quá ae ơi 🚀',
    'Rút sớm ăn chắc mặc bền ae ạ.',
    'Kỷ lục ván trước ai gồng x88 không?',
    'Mạnh mẽ lên phi thuyền ơi, né đạn vút bay nào 🚀'
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

// High-entropy deterministic PRNG based on cycle and game type (eliminates predictable sin RNG and cheats)
function hashCycleRNG(seed: number) {
  let t = (seed + 0x6D2B79F5) | 0;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Get fair synchronized outcomes based on cycle index
const getSyncResultForCycle = (cycleId: number, type: GameType) => {
  const typeOffsets: Record<GameType, number> = {
    taixiu: 1013904223,
    crash: 1664525,
    penalty: 22695477,
    horse: 2147483647,
    claw: 48271,
    dragontiger: 65537,
    fcmobile: 134775813
  };

  const seed = (cycleId * 1664525 + (typeOffsets[type] || 0)) | 0;
  const rand = hashCycleRNG(seed);
  
  const r1 = rand();
  const r2 = rand();
  const r3 = rand();
  
  if (type === 'taixiu') {
    const d1 = Math.floor(r1 * 6) + 1;
    const d2 = Math.floor(r2 * 6) + 1;
    const d3 = Math.floor(r3 * 6) + 1;
    return { dices: [d1, d2, d3] };
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
    const dVal = Math.floor(r1 * 13) + 1;
    const tVal = Math.floor(r2 * 13) + 1;
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
  const [activeViewerCount, setActiveViewerCount] = useState<number>(2850);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [chatInput, setChatInput] = useState<string>('');
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  
  // Synchronized Realtime Chat Messages from Firebase DB 'live_arena_chat'
  interface LiveChatMessage {
    id?: string;
    uid?: string;
    sender: string;
    message: string;
    time: string;
    timestamp: number;
    isUser?: boolean;
    isSystem?: boolean;
    isBet?: boolean;
    isWin?: boolean;
    betAmount?: number;
    betChoice?: string;
    game?: string;
    role?: string;
    level?: number;
    badge?: string;
  }

  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);

  useEffect(() => {
    const chatRef = ref(db, 'live_arena_chat');
    const unsubscribe = onValue(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: LiveChatMessage[] = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
          isUser: val.uid === uid
        }));
        list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setChatMessages(list.slice(-50)); // Keep latest 50 real-time chat messages
      } else {
        setChatMessages([]);
      }
    });

    return () => unsubscribe();
  }, [uid]);

  // Track Picture-in-Picture mode
  const [isPipActive, setIsPipActive] = useState<boolean>(() => {
    return localStorage.getItem('s88_live_pip_active') === 'true';
  });


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

  const crashCycleId = Math.floor(currentTime / crashCycleDuration);
  const crashTimeElapsed = currentTime % crashCycleDuration;
  const crashSecondsElapsed = crashTimeElapsed / 1000;

  const currentCrashPoint = getSyncResultForCycle(crashCycleId, 'crash') as number;

  const targetFlightSecs = Math.min(
    18,
    parseFloat((3.5 * Math.pow(Math.max(0.01, currentCrashPoint - 1.0), 1 / 2.2)).toFixed(2))
  );

  let crashPhase: 'BETTING' | 'FLIGHT' | 'COOLDOWN' = 'BETTING';
  let crashTimerText = '';
  let crashCountdown = 0;

  if (crashSecondsElapsed < crashBettingSecs) {
    crashPhase = 'BETTING';
    crashCountdown = Math.ceil(crashBettingSecs - crashSecondsElapsed);
    crashTimerText = `Đặt cược: ${crashCountdown}s`;
  } else if (crashSecondsElapsed < crashBettingSecs + targetFlightSecs) {
    crashPhase = 'FLIGHT';
    crashTimerText = 'PHI THUYỀN ĐANG BAY & NÉ ĐẠN!';
  } else {
    crashPhase = 'COOLDOWN';
    crashCountdown = Math.ceil(crashCycleDuration / 1000 - crashSecondsElapsed);
    crashTimerText = `Chuẩn bị phóng: ${crashCountdown}s`;
  }

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
        const diff = Math.floor(Math.random() * 9) - 4;
        const next = prev + diff;
        return next < 2450 ? 2450 : next > 3850 ? 3850 : next;
      });
    }, 100);

    // Initial warm greetings
    setChatMessages([
      { sender: 'HỆ THỐNG', message: 'Hệ thống Live Stream S-System 88 đã trực tuyến. Bố cục tối ưu, mượt mà tuyệt đối!', isSystem: true, time: 'Now' },
      { sender: 'Dealer Vy Vy 💖', message: 'Em chào anh chị ạ! Chúc cả nhà chơi live vui vẻ, đại thắng rực rỡ nhé!', isSystem: true, time: 'Now' }
    ]);

    return () => clearInterval(timer);
  }, []);

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

  // Synchronized Real-Time Firebase Bets Board Subscription
  useEffect(() => {
    let currentCycle = 0;
    if (activeTab === 'taixiu') currentCycle = txCycleId;
    else if (activeTab === 'crash') currentCycle = crashCycleId;
    else if (activeTab === 'penalty') currentCycle = penCycleId;
    else if (activeTab === 'horse') currentCycle = horseCycleId;
    else if (activeTab === 'claw') currentCycle = clawCycleId;
    else if (activeTab === 'fcmobile') currentCycle = fcCycleId;
    else if (activeTab === 'dragontiger') currentCycle = dtCycleId;

    const betsRef = ref(db, `live_arena_bets/${activeTab}/${currentCycle}`);
    const unsubscribe = onValue(betsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: LiveBet[] = Object.values(data).map((val: any) => ({
          sender: val.sender,
          amount: val.amount,
          choice: val.choice,
          isUser: val.uid === uid,
          isBot: val.isBot
        }));
        setLiveBets(list);
      } else {
        setLiveBets([]);
      }
    });

    return () => unsubscribe();
  }, [activeTab, txCycleId, crashCycleId, penCycleId, horseCycleId, clawCycleId, fcCycleId, dtCycleId, uid]);




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




  // Auto-evaluation logic on phase change
  useEffect(() => {
    if (!currentBetPlaced || currentBetPlaced.game !== 'taixiu') return;
    if (txPhase === 'BETTING') {
      if (currentBetPlaced && currentBetPlaced.cycleId !== txCycleId) {
        setCurrentBetPlaced(null);
      }
      return;
    }

    if ((txPhase === 'COOLDOWN' || (txPhase === 'REVEAL' && txSecondsElapsed >= txBettingSecs + txShakingSecs + 4)) && currentBetPlaced && currentBetPlaced.cycleId === txCycleId && !currentBetPlaced.evaluated) {
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
          }

          if (uid) {
            await incrementMissionProgress(uid, 'taixiu_play', 1);
            if (won) {
              await incrementMissionProgress(uid, 'taixiu_wins', 1);
            }
            await incrementMissionProgress(uid, 'game_play', 1);
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
      if (currentBetPlaced && currentBetPlaced.cycleId !== crashCycleId) {
        setCurrentBetPlaced(null);
      }
      return;
    }

    if (crashPhase === 'COOLDOWN' && currentBetPlaced && currentBetPlaced.cycleId === crashCycleId && !currentBetPlaced.evaluated) {
      const handleCrashBoom = async () => {
        try {
          if (uid) {
            await incrementMissionProgress(uid, 'game_play', 1);
          }

          await push(ref(db, 'game_logs'), {
            uid,
            name: user?.name || 'Sinh Viên',
            game: 'Live Phi Thuyền Crash',
            bet: currentBetPlaced.amount,
            pnl: -currentBetPlaced.amount,
            result: 'Thua',
            time: new Date().toLocaleString('vi-VN'),
            timestamp: Date.now()
          });

          onShowResult(
            'PHI THUYỀN NỔ TUNG - THẤT BẠI 💥',
            `Phi thuyền đã bị đạn nổ tung tại mốc ${currentCrashPoint}x trước khi bạn kịp nhảy dù!\n\nMất cược: -${currentBetPlaced.amount.toLocaleString()} PP.`,
            false
          );

          setCurrentBetPlaced((prev) => prev ? { ...prev, evaluated: true } : null);
        } catch (err) {
          console.error(err);
        }
      };

      handleCrashBoom();
    }
  }, [crashPhase, currentBetPlaced, crashCycleId, uid, user]);

  const handleCrashCashout = async () => {
    if (!currentBetPlaced || currentBetPlaced.game !== 'crash' || currentBetPlaced.evaluated) return;
    if (crashPhase !== 'FLIGHT') {
      alert('Không thể chốt lãi lúc này!');
      return;
    }

    const mult = currentCrashMultiplier;
    const payout = Math.floor(currentBetPlaced.amount * mult);
    const netProfit = payout - currentBetPlaced.amount;

    try {
      const uSnap = await get(ref(db, `users/${uid}`));
      const freshPP = uSnap.val()?.pp || 0;

      await update(ref(db, `users/${uid}`), { pp: freshPP + payout });

      if (uid) {
        await incrementMissionProgress(uid, 'game_play', 1);
      }

      await push(ref(db, 'game_logs'), {
        uid,
        name: user?.name || 'Sinh Viên',
        game: 'Live Phi Thuyền Crash',
        bet: currentBetPlaced.amount,
        pnl: netProfit,
        result: 'Thắng',
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      });

      onShowResult(
        'PHI THUYỀN - CHỐT LÃI THÀNH CÔNG 🚀',
        `Bạn đã nhảy dù né đạn thành công ở mốc [ ${mult}x ]!\n\nThắng lớn: +${payout.toLocaleString()} PP (Lãi thuần: +${netProfit.toLocaleString()} PP).`,
        true
      );

      setCurrentBetPlaced((prev) => prev ? { ...prev, evaluated: true } : null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!currentBetPlaced || currentBetPlaced.game !== 'penalty') return;
    if (penPhase === 'BETTING') {
      if (currentBetPlaced && currentBetPlaced.cycleId !== penCycleId) {
        setCurrentBetPlaced(null);
      }
      return;
    }

    if (penPhase === 'COOLDOWN' && currentBetPlaced && currentBetPlaced.cycleId === penCycleId && !currentBetPlaced.evaluated) {
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

          if (uid) {
            if (res.isGoal) {
              await incrementMissionProgress(uid, 'penalty_goals', 1);
            }
            await incrementMissionProgress(uid, 'game_play', 1);
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

    if (horsePhase === 'COOLDOWN' && currentBetPlaced && currentBetPlaced.cycleId === horseCycleId && !currentBetPlaced.evaluated) {
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

          if (uid) {
            await incrementMissionProgress(uid, 'horse_rides', 1);
            await incrementMissionProgress(uid, 'game_play', 1);
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

    if (clawPhase === 'COOLDOWN' && currentBetPlaced && currentBetPlaced.cycleId === clawCycleId && !currentBetPlaced.evaluated) {
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

          if (uid) {
            await incrementMissionProgress(uid, 'claw_machine', 1);
            await incrementMissionProgress(uid, 'game_play', 1);
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

    if (fcPhase === 'COOLDOWN' && currentBetPlaced && currentBetPlaced.cycleId === fcCycleId && !currentBetPlaced.evaluated) {
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

          if (uid) {
            await incrementMissionProgress(uid, 'fcmobile_match', 1);
            await incrementMissionProgress(uid, 'game_play', 1);
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

    if ((dtPhase === 'COOLDOWN' || (dtPhase === 'REVEAL' && dtSecondsElapsed >= dtBettingSecs + 5)) && currentBetPlaced && currentBetPlaced.cycleId === dtCycleId && !currentBetPlaced.evaluated) {
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

          if (uid) {
            await incrementMissionProgress(uid, 'game_play', 1);
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
        const todayStr = getTodayVNString();
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

      // Push user bet to synchronized Realtime Database 'live_arena_bets'
      await push(ref(db, `live_arena_bets/${activeTab}/${currentCycle}`), {
        uid: uid,
        sender: user?.name || 'Sếp AYK',
        amount: amt,
        choice: betChoice,
        timestamp: Date.now(),
        isBot: false
      });

      // Push bet to synchronized live_arena_chat
      const betChoiceText = betChoice.startsWith('HORSE_') ? `Ngựa #${betChoice.split('_')[1]}` : betChoice;
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      await push(ref(db, 'live_arena_chat'), {
        uid: uid,
        sender: user?.name || 'Sếp AYK',
        message: `🎯 Chốt cược ${amt.toLocaleString()} PP vào [${betChoiceText}]!`,
        isBet: true,
        betAmount: amt,
        betChoice: betChoiceText,
        game: activeTab,
        time,
        timestamp: Date.now(),
        role: user?.role || 'STUDENT',
        level: user?.level || 1,
        badge: 'PRO'
      });
    } catch (err) {
      alert('Lỗi kết nối máy chủ sòng bài!');
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');

    try {
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      await push(ref(db, 'live_arena_chat'), {
        uid: uid,
        sender: user?.name || 'Sếp AYK',
        message: userMsg,
        time,
        timestamp: Date.now(),
        role: user?.role || 'STUDENT',
        level: user?.level || 1,
        badge: 'VIP'
      });

      if (userMsg.toLowerCase().includes('lắc') || userMsg.toLowerCase().includes('tài') || userMsg.toLowerCase().includes('xỉu')) {
        setTimeout(async () => {
          try {
            await push(ref(db, 'live_arena_chat'), {
              sender: 'Dealer Vy Vy 💖',
              message: 'Cầu đang chạy đẹp lắm nè sếp, đặt cược đi ạ!',
              isSystem: true,
              time: 'Now',
              timestamp: Date.now()
            });
          } catch (e) {}
        }, 1000);
      }
    } catch (err) {
      console.error('Lỗi gửi chat:', err);
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
            <h4 className="text-white font-black text-[10px] uppercase tracking-wider">🎲 TÀI XỈU AYK</h4>
            <p className="text-[8px] text-slate-300 mt-0.5">Dealer Vy Vy lắc bát</p>
          </div>
        </motion.button>

        {/* Phi Thuyền Crash Stream Thumbnail */}
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
              1,980 xem
            </span>
          </div>

          <div className="z-10 text-left">
            <h4 className="text-white font-black text-[10px] uppercase tracking-wider">🚀 KHÔNG CHIẾN NÉ ĐẠN</h4>
            <p className="text-[8px] text-slate-300 mt-0.5">Phi thuyền bay & né đạn x100</p>
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
            <h4 className="text-white font-black text-[10px] uppercase tracking-wider">🏟️ FC ARENA AYK</h4>
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
        
        {/* Stream Player (Span 8) */}
        <div className="lg:col-span-8 relative aspect-video w-full rounded-2xl bg-black border border-white/5 overflow-hidden flex flex-col justify-between p-4 shadow-2xl group">
            
            {/* Stream HUD */}
            <div className="z-10 flex justify-between items-start w-full">
              <div className="flex items-center gap-2">
                <span className="py-1 px-2.5 bg-red-600 text-white font-black text-[9px] uppercase tracking-wider rounded-md flex items-center gap-1.5 shadow-md">
                  <motion.span 
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-white inline-block"
                  />
                  LIVE STREAM AYK
                </span>
                <span className="py-1 px-2.5 bg-black/80 border border-white/10 text-white font-mono text-[9px] rounded-md flex items-center gap-1.5 backdrop-blur-md">
                  <Users className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  {activeViewerCount} người xem
                </span>
                
                <button
                  onClick={() => setShowRulesModal(true)}
                  className="py-1 px-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-mono text-[9px] font-black rounded-md flex items-center gap-1 cursor-pointer transition-all uppercase tracking-wider shadow-md"
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
                      : 'bg-black/60 border border-white/10 text-white hover:bg-white/10 backdrop-blur-md'
                  }`}
                  title="Bật/Tắt chế độ xem thu nhỏ góc màn hình (PIP)"
                >
                  <Maximize2 className="w-3 h-3" />
                  {isPipActive ? 'PIP: BẬT' : 'CHẾ ĐỘ PIP'}
                </button>
                <span className="py-1 px-2.5 bg-black/80 border border-white/10 text-white font-mono text-[9px] rounded-md backdrop-blur-md font-bold">
                  1080P HD 60FPS
                </span>
              </div>
            </div>

            {/* Simulated Stream stage area */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
              
              {/* TAI XIU STAGE */}
              {activeTab === 'taixiu' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-[#090b14] via-[#111425] to-[#1a1e36]">
                  {/* Cyber Casino grid lines & glowing radial overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] opacity-60" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,180,0,0.08)_0%,transparent_70%)]" />

                  {/* Audio Equalizer bars to signal live dealer audio */}
                  <div className="absolute top-4 right-4 flex items-end gap-0.5 h-4 bg-slate-950/70 py-1 px-2 rounded-full border border-white/10 backdrop-blur-md">
                    <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-[bounce_0.6s_infinite]" />
                    <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-[bounce_0.4s_infinite_delay-100]" />
                    <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_delay-200]" />
                    <span className="text-[7px] text-emerald-400 font-mono font-bold ml-1">AUDIO LIVE</span>
                  </div>

                  {/* Dealer Info HUD */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-slate-950/85 backdrop-blur-md border border-amber-500/30 py-1.5 px-3 rounded-2xl shadow-2xl">
                    <div className="relative">
                      <img 
                        src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&h=80" 
                        alt="Dealer" 
                        className="w-9 h-9 rounded-full border-2 border-amber-400 object-cover shadow-md"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-amber-300 font-black uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" /> DEALER LYNA
                      </span>
                      <span className="text-[9px] text-white font-medium">
                        {txPhase === 'BETTING' ? '🎲 Đặt Tài hay Xỉu nào các sếp ơi!' : txPhase === 'SHAKING' ? '🔥 Em lắc tay thật đều đây ạ...' : '🎉 Chúc mừng các sếp thắng lớn!'}
                      </span>
                    </div>
                  </div>

                  {/* VIP Table Center Ring */}
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    {/* Golden luxury felt ring with outer glow */}
                    <div className="absolute w-44 h-44 rounded-full border-4 border-amber-400/40 bg-gradient-to-br from-emerald-950/80 to-slate-950/90 shadow-[0_0_40px_rgba(245,158,11,0.25)] flex items-center justify-center">
                      <div className="w-36 h-36 rounded-full border border-amber-400/20 bg-emerald-900/20 flex items-center justify-center">
                        <div className="w-28 h-28 rounded-full border border-dashed border-amber-400/30" />
                      </div>
                    </div>
                    
                    {/* Golden plate pedestal */}
                    <div className="absolute w-40 h-9 bg-gradient-to-b from-amber-600 via-amber-800 to-amber-950 rounded-full border-2 border-amber-300 bottom-3 shadow-2xl flex items-center justify-center">
                      <div className="w-32 h-1 bg-amber-300/40 rounded-full" />
                    </div>
                    
                    {/* Shaker cup with luxury golden 3D design and Framer Motion bounce */}
                    <motion.div 
                      animate={txPhase === 'SHAKING' ? {
                        y: [0, -22, 0, -22, 0],
                        rotate: [0, 16, -16, 16, 0],
                        scale: [1, 1.05, 1, 1.05, 1]
                      } : txPhase === 'REVEAL' ? {
                        y: -65,
                        opacity: 0.15,
                        scale: 0.75,
                        rotate: 20
                      } : txPhase === 'COOLDOWN' ? {
                        y: -85,
                        opacity: 0
                      } : {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        rotate: 0
                      }}
                      transition={{
                        duration: txPhase === 'SHAKING' ? 0.22 : 0.6,
                        repeat: txPhase === 'SHAKING' ? Infinity : 0,
                        ease: "easeInOut"
                      }}
                      className="absolute bottom-6 w-24 h-26 bg-gradient-to-b from-yellow-300 via-yellow-500 to-amber-800 border-2 border-yellow-200 rounded-t-full shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center z-20 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.6)_0%,transparent_65%)]" />
                      <div className="w-full h-1.5 bg-amber-200/50 my-1 z-10" />
                      <span className="text-slate-950 font-black text-[9px] font-sans tracking-widest z-10 drop-shadow-sm uppercase">AYK VIP 88</span>
                      <div className="w-full h-1.5 bg-amber-200/50 my-1 z-10" />
                    </motion.div>

                    {/* Highly authentic Asian 3D dices with bevels and red dots */}
                    {(txPhase === 'REVEAL' || txPhase === 'COOLDOWN') && (
                      <div className="absolute bottom-9 flex gap-3 z-10 bg-black/80 p-2.5 rounded-2xl border-2 border-amber-400/50 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-md">
                        {currentTxResult.dices.map((dieVal, idx) => (
                          <motion.div 
                            initial={{ scale: 0, rotate: -180, y: 30 }}
                            animate={{ scale: 1, rotate: idx * 10 - 5, y: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 15, delay: idx * 0.12 }}
                            key={idx} 
                            className="w-9 h-9 bg-gradient-to-br from-slate-50 to-slate-200 border-2 border-slate-300 rounded-xl flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_6px_12px_rgba(0,0,0,0.5)] font-black text-slate-900 text-base relative overflow-hidden"
                          >
                            <div className="relative font-mono flex items-center justify-center w-full h-full">
                              {dieVal === 1 ? (
                                <span className="text-red-600 text-2xl font-black drop-shadow-xs">🔴</span>
                              ) : dieVal === 4 ? (
                                <span className="text-red-600 text-lg font-black drop-shadow-xs">4</span>
                              ) : (
                                <span className="text-slate-950 font-black text-lg">{dieVal}</span>
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
                      initial={{ opacity: 0, scale: 0.8, y: -20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="absolute top-10 py-2 px-5 bg-slate-950/95 border-2 border-amber-400 rounded-full text-[11px] font-mono font-black uppercase tracking-wider text-white flex items-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.4)]"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                      KẾT QUẢ: <span className="text-amber-400 font-black text-glow-gold text-sm">{currentTxResult.dices.reduce((a, b) => a + b, 0)} NÚT</span> 
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${currentTxResult.dices.reduce((a, b) => a + b, 0) >= 11 ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]'}`}>
                        {currentTxResult.dices.reduce((a, b) => a + b, 0) >= 11 ? 'TÀI (CHẴN)' : 'XỈU (LẺ)'}
                      </span>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ROCKET CRASH STAGE WITH BULLET DODGING */}
              {activeTab === 'crash' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-[#02050e] overflow-hidden">
                  {/* Space stardust grid & futuristic warp lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.15)_0%,transparent_65%)]" />

                  {/* Dynamic Speed Grid / Altitude Axis lines */}
                  <div className="absolute left-6 bottom-6 top-6 w-0.5 bg-gradient-to-t from-cyan-500/40 via-cyan-500/10 to-transparent" />
                  <div className="absolute left-6 bottom-6 right-6 h-0.5 bg-gradient-to-r from-cyan-500/40 via-cyan-500/10 to-transparent" />

                  {/* Incoming Lasers & Asteroid Bullets - Rocket Dodging Animations */}
                  {crashPhase === 'FLIGHT' && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                      {/* Laser Bullet 1 */}
                      <div className="absolute top-[15%] right-[-10%] w-36 h-2 bg-gradient-to-l from-red-500 via-rose-400 to-transparent rounded-full filter blur-xs animate-pulse"
                        style={{
                          transform: `translate(-${((currentTime / 18) % 130)}%, ${((currentTime / 14) % 80)}%) rotate(-22deg)`
                        }}
                      />
                      {/* Laser Bullet 2 */}
                      <div className="absolute top-[40%] right-[-10%] w-48 h-2 bg-gradient-to-l from-cyan-400 via-sky-300 to-transparent rounded-full filter blur-xs"
                        style={{
                          transform: `translate(-${((currentTime / 14) % 140)}%, ${((currentTime / 10) % 90)}%) rotate(-15deg)`
                        }}
                      />
                      {/* Laser Bullet 3 */}
                      <div className="absolute top-[65%] right-[-10%] w-40 h-2 bg-gradient-to-l from-yellow-400 via-amber-300 to-transparent rounded-full filter blur-xs"
                        style={{
                          transform: `translate(-${((currentTime / 16) % 150)}%, -${((currentTime / 12) % 70)}%) rotate(12deg)`
                        }}
                      />
                      {/* Floating DODGED! badges */}
                      <motion.div 
                        animate={{ opacity: [0, 1, 0], scale: [0.8, 1.25, 0.9], y: [-10, -45] }}
                        transition={{ repeat: Infinity, duration: 1.1, ease: "easeOut" }}
                        className="absolute bottom-1/3 left-1/3 text-[10px] font-mono font-black text-yellow-300 bg-red-950/90 border border-yellow-400 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.8)] flex items-center gap-1.5"
                      >
                        <span>🛡️ NÉ ĐẠN THẦN TỐC! (+DODGE!)</span>
                      </motion.div>
                    </div>
                  )}

                  {/* Floating Rocket with high-energy jet fire trail & dynamic dodging motion */}
                  {crashPhase === 'FLIGHT' && (
                    <motion.div 
                      animate={{ 
                        y: [0, -22, 6, -15, 0],
                        x: [0, 10, -8, 6, 0],
                        rotate: [45, 54, 38, 50, 45]
                      }}
                      transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
                      className="absolute bottom-1/4 left-1/4 z-10"
                      style={{
                        transform: `translate(${Math.min((crashSecondsElapsed - crashBettingSecs) * 22, 210)}px, -${Math.min((crashSecondsElapsed - crashBettingSecs) * 14, 130)}px) rotate(45deg)`
                      }}
                    >
                      <div className="relative flex flex-col items-center">
                        <span className="text-6xl filter drop-shadow-[0_0_22px_rgba(6,182,212,0.9)]">🚀</span>
                        {/* Shield bubble protection while dodging */}
                        <div className="absolute inset-[-12px] border-2 border-cyan-400/70 rounded-full animate-ping pointer-events-none shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
                        {/* Double Fire booster trail */}
                        <div className="absolute bottom-[-24px] w-6 h-12 bg-gradient-to-t from-red-500 via-orange-400 to-transparent rounded-full filter blur-xs animate-pulse origin-top scale-y-150" />
                        <div className="absolute bottom-[-14px] w-4 h-7 bg-yellow-300 rounded-full filter blur-xs animate-ping" />
                      </div>
                    </motion.div>
                  )}

                  {/* Instant crash explosion */}
                  {crashPhase === 'COOLDOWN' && (
                    <div className="absolute flex flex-col items-center justify-center animate-[shake_0.5s_infinite] z-10">
                      <motion.div 
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: [1, 1.7, 1.3], opacity: 1 }}
                        className="text-8xl filter drop-shadow-[0_0_35px_rgba(239,68,68,0.95)]"
                      >
                        💥
                      </motion.div>
                      <span className="text-white font-mono text-xs uppercase bg-red-950/95 py-2.5 px-6 border-2 border-red-500 rounded-2xl mt-4 font-black shadow-[0_0_30px_rgba(239,68,68,0.7)] tracking-wider flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
                        BÙMM! CRASHED @ <span className="text-red-400 text-glow-red font-black text-base">{currentCrashPoint}x</span>
                      </span>
                    </div>
                  )}

                  {/* High contrast HUD displays */}
                  {crashPhase === 'FLIGHT' && (
                    <div className="absolute flex flex-col items-center justify-center z-10">
                      <span className="text-glow-cyan text-cyan-400 text-6xl font-mono font-black tracking-wider drop-shadow-[0_0_30px_rgba(6,182,212,0.7)]">
                        {currentCrashMultiplier}x
                      </span>
                      <span className="text-[9px] text-cyan-200 font-mono tracking-widest mt-3 uppercase bg-slate-950/90 border border-cyan-500/50 py-1.5 px-4 rounded-full flex items-center gap-2 shadow-xl">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        🛡️ PHI THUYỀN ĐANG NÉ ĐẠN PLASMA & TĂNG TỐC...
                      </span>
                    </div>
                  )}

                  {crashPhase === 'BETTING' && (
                    <div className="absolute flex flex-col items-center justify-center z-10">
                      <span className="text-glow-cyan text-cyan-400 text-2xl sm:text-3xl font-mono font-black animate-pulse flex items-center gap-2 tracking-wide">
                        🚀 PHI THUYỀN NÉ ĐẠN CHUẨN BỊ BAY
                      </span>
                      <span className="text-[10px] text-white font-mono tracking-widest mt-3 bg-slate-950/95 py-2 px-5 border border-cyan-500/50 rounded-2xl flex items-center gap-2 shadow-xl">
                        <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
                        CỔNG CƯỢC MỞ: <b className="text-[#00f0ff] font-black text-sm text-glow-blue">{crashCountdown}S</b>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ROCKET CRASH STAGE */}
              {/* PENALTY STAGE */}
              {activeTab === 'penalty' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-[#011406] via-[#02240b] to-[#010a03] overflow-hidden">
                  {/* Soccer stadium pitch patterns with perspective grid */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.08)_1.5px,transparent_1.5px)] bg-[size:18px_18px]" />
                  <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-emerald-950/50 via-emerald-950/20 to-transparent border-t-2 border-emerald-500/30" />

                  {/* ESPN-Style Sports HUD score bug */}
                  <div className="absolute top-10 z-10 flex items-center bg-slate-950/95 border border-emerald-500/30 px-5 py-2 rounded-full font-mono text-[10px] shadow-[0_4px_30px_rgba(0,0,0,0.9)] gap-3">
                    <span className="text-emerald-400 font-black tracking-wider">STUDENT</span>
                    <span className="text-white font-black bg-emerald-900/70 px-2.5 py-0.5 rounded-md border border-emerald-500/50 text-xs">1</span>
                    <span className="text-slate-500 font-bold">:</span>
                    <span className="text-white font-black bg-red-900/70 px-2.5 py-0.5 rounded-md border border-red-500/50 text-xs">1</span>
                    <span className="text-red-400 font-black tracking-wider">S-BOT</span>
                    <span className="text-yellow-400 font-black animate-pulse px-2 border border-yellow-500/40 rounded text-[9px]">90'</span>
                  </div>

                  {/* Stadium Spotlights representation */}
                  <div className="absolute top-0 inset-x-0 flex justify-between px-8 pointer-events-none opacity-25">
                    <div className="w-40 h-72 bg-gradient-to-br from-white/20 to-transparent origin-top rotate-12 blur-lg" />
                    <div className="w-40 h-72 bg-gradient-to-bl from-white/20 to-transparent origin-top -rotate-12 blur-lg" />
                  </div>

                  {/* Goal and Goalpost Net with neon-glow targets */}
                  <div className="relative w-88 h-40 border-4 border-slate-100 border-b-0 rounded-t-xl flex justify-center items-end bottom-1 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.12)_1.5px,transparent_1.5px)] bg-[size:10px_10px] rounded-t-lg" />
                    
                    {/* Glowing yellow target corner indicators */}
                    <div className="absolute inset-x-4 top-2 bottom-2 grid grid-cols-2 grid-rows-2 gap-x-32 gap-y-14 opacity-60 pointer-events-none z-10">
                      <div className="border-2 border-dashed border-yellow-400 rounded-xl flex items-center justify-center text-[8px] text-yellow-300 font-mono font-bold bg-yellow-500/10 animate-pulse">G1 GÓC CAO TRÁI</div>
                      <div className="border-2 border-dashed border-yellow-400 rounded-xl flex items-center justify-center text-[8px] text-yellow-300 font-mono font-bold bg-yellow-500/10 animate-pulse">G2 GÓC CAO PHẢI</div>
                      <div className="border-2 border-dashed border-yellow-400 rounded-xl flex items-center justify-center text-[8px] text-yellow-300 font-mono font-bold bg-yellow-500/10 animate-pulse">G3 GÓC THẤP TRÁI</div>
                      <div className="border-2 border-dashed border-yellow-400 rounded-xl flex items-center justify-center text-[8px] text-yellow-300 font-mono font-bold bg-yellow-500/10 animate-pulse">G4 GÓC THẤP PHẢI</div>
                    </div>

                    {/* Goalkeeper styled with gloves and jersey */}
                    <div className="absolute bottom-0 w-18 h-24 bg-gradient-to-b from-orange-400 via-orange-600 to-amber-700 rounded-t-full border-2 border-white flex flex-col items-center justify-center shadow-2xl transition-all duration-300 z-10"
                      style={
                        penPhase === 'SHOOTING'
                          ? {
                              transform: `translate(${
                                currentPenResult.dive === 0 ? '-95px' :
                                currentPenResult.dive === 1 ? '95px' :
                                currentPenResult.dive === 2 ? '-70px, 15px' :
                                currentPenResult.dive === 3 ? '70px, 15px' : '0'
                              })`
                            }
                          : {}
                      }
                    >
                      <span className="text-3xl filter drop-shadow-md">🧤</span>
                      <span className="text-[7px] font-mono font-black text-white bg-black/90 px-2 py-0.5 rounded border border-white/30 uppercase tracking-widest mt-1">AYK-GK</span>
                    </div>

                    {/* Soccer ball with glowing speed trails */}
                    {penPhase === 'SHOOTING' && (
                      <motion.div 
                        animate={{ rotate: 720 }}
                        transition={{ repeat: Infinity, duration: 0.12, ease: "linear" }}
                        className="absolute bottom-[-32px] w-10 h-10 rounded-full bg-white border border-slate-900 flex items-center justify-center text-base shadow-[0_0_25px_rgba(255,255,255,0.9)] transition-all duration-500 z-20"
                        style={{
                          transform: `translate(${
                            currentPenResult.target === 0 ? '-105px, -120px' :
                            currentPenResult.target === 1 ? '105px, -120px' :
                            currentPenResult.target === 2 ? '-85px, -50px' :
                            currentPenResult.target === 3 ? '85px, -50px' : '0px, -75px'
                          }) scale(0.6)`
                        }}
                      >
                        ⚽
                      </motion.div>
                    )}
                  </div>

                  {/* Cinematic goal or save alerts */}
                  {penPhase === 'COOLDOWN' && (
                    <div className="absolute bottom-14 text-center z-20 bg-slate-950/95 px-6 py-3 rounded-2xl border border-emerald-500/40 shadow-2xl backdrop-blur-md">
                      <span className={`font-black font-mono text-base text-glow tracking-widest block ${
                        currentPenResult.isGoal ? 'text-emerald-400 text-glow-emerald animate-bounce' : 'text-red-500 text-glow-red'
                      }`}>
                        {currentPenResult.isGoal ? '⚽ GOOOAL! BÓNG VÀO LƯỚI!' : '🧤 CẢN PHÁ XUẤT THẦN!'}
                      </span>
                      <span className="text-[9px] text-[#8b949e] font-mono block mt-1 uppercase font-bold">
                        {currentPenResult.isGoal ? 'Cú sút phạt hiểm hóc xé toạc mành lưới thủ môn!' : 'Thủ môn đoán chuẩn hướng bóng ôm gọn ngoạn mục'}
                      </span>
                    </div>
                  )}

                  {penPhase === 'BETTING' && (
                    <div className="absolute bottom-14 text-center z-10">
                      <span className="text-glow-emerald text-emerald-400 text-[10px] font-mono font-black bg-slate-950/95 py-2 px-5 rounded-full border border-emerald-500/40 tracking-wider animate-pulse uppercase shadow-lg">
                        ⚽ LƯỢT SÚT PHẠT ĐANG MỞ ĐẶT CƯỢC ⚽
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* HORSE RACING STAGE */}
              {activeTab === 'horse' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-[#0e160d] to-[#1a2818] p-4">
                  {/* Cyber race track stardust overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,128,0.04)_1.5px,transparent_1.5px)] bg-[size:18px_18px]" />
                  
                  {/* High Tech Neon Dirt Track */}
                  <div className="w-[96%] h-40 bg-amber-950/20 border-2 border-yellow-500/30 rounded-2xl relative overflow-hidden p-2.5 flex flex-col justify-between shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xs">
                    
                    {/* Glowing lanes */}
                    {[1, 2, 3, 4].map((num) => {
                      let xOffset = 10; // default start
                      if (horsePhase === 'RACING') {
                        const elapsed = horseSecondsElapsed - horseBettingSecs;
                        const progress = elapsed / horseRacingSecs; // 0 to 1
                        
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
                        <div key={num} className="h-7 border-b border-dashed border-white/15 last:border-0 flex items-center relative w-full">
                          <span className="absolute left-1 text-[9px] font-mono text-[#00ff80] font-black">L.{num}</span>
                          
                          {/* Running horse emoji with dust effect */}
                          <div
                            style={{ left: `${xOffset}%` }}
                            className="absolute flex items-center gap-1.5 transition-all duration-300"
                          >
                            <span className="text-2xl filter drop-shadow-md animate-[bounce_0.25s_infinite_alternate]">🐎</span>
                            {/* Dust cloud representation */}
                            {horsePhase === 'RACING' && (
                              <div className="w-2 h-2 bg-yellow-600/40 rounded-full filter blur-xs animate-ping shrink-0" />
                            )}
                            <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded border ${
                              currentHorseResult.winner === num && horsePhase === 'COOLDOWN' ? 'border-amber-400 bg-amber-400 text-black shadow-[0_0_12px_rgba(234,179,8,0.6)] font-bold' : 'border-white/20 text-white bg-slate-900/80'
                            }`}>
                              #{num}
                            </span>
                          </div>
                          
                          {/* Finish Line checkerboard */}
                          <div className="absolute right-12 top-0 bottom-0 w-2 bg-[repeating-linear-gradient(45deg,#fff,#fff_4px,#000_4px,#000_8px)] opacity-70 border-x border-amber-400" />
                        </div>
                      );
                    })}
                  </div>

                  {/* High contrast announcements */}
                  {horsePhase === 'BETTING' && (
                    <div className="absolute top-10 py-1.5 px-5 bg-slate-950/95 border border-yellow-500/50 rounded-full text-[10px] font-mono font-black uppercase text-white animate-pulse shadow-lg">
                      🏁 CHUẨN BỊ XUẤT PHÁT: <span className="text-yellow-400 text-glow-gold font-bold">{horseCountdown}S</span>
                    </div>
                  )}

                  {horsePhase === 'COOLDOWN' && (
                    <div className="absolute bottom-14 text-center z-10 bg-slate-950/95 px-6 py-3 rounded-2xl border-2 border-yellow-500/40 shadow-2xl animate-[bounce_1s_infinite_alternate]">
                      <span className="font-black font-mono text-sm text-yellow-400 text-glow-gold tracking-wider block">
                        🏆 CHIẾN MÃ SỐ {currentHorseResult.winner} VÔ ĐỊCH!
                      </span>
                      <span className="text-[9px] text-[#8b949e] font-mono block mt-1 uppercase font-bold">
                        Sải bước thần tốc, giành cúp vinh quang vàng ròng
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* CLAW MACHINE STAGE */}
              {activeTab === 'claw' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-[#130b1a] via-[#1f102b] to-[#2c143c] p-4">
                  {/* Neon retro grid background */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(236,72,153,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(236,72,153,0.025)_1px,transparent_1px)] bg-[size:20px_20px]" />
                  
                  {/* Dynamic Conveyor Belt with neon reflection */}
                  <div className="absolute bottom-8 w-full h-14 bg-purple-950/40 border-y-2 border-purple-500/30 flex items-center overflow-hidden">
                    <div className="flex gap-10 text-2xl animate-[marquee_12s_linear_infinite]">
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
                        <div className="w-1 bg-gradient-to-b from-slate-200 to-slate-400 shadow-[0_0_10px_rgba(255,255,255,0.6)]" style={{ height: `${clawY}%` }} />
                        
                        {/* Mechanical Claw with drop shadows */}
                        <div className="absolute flex flex-col items-center transition-all duration-200" style={{ top: `${clawY}%` }}>
                          <span className="text-4xl filter drop-shadow-[0_0_15px_rgba(236,72,153,0.7)]">
                            {clawPhase === 'DROPPING' && clawSecondsElapsed - clawBettingSecs > 4.5 && grabbedToy ? '🤏' : '🎣'}
                          </span>
                          
                          {/* Snatched Toy inside claw claw */}
                          {grabbedToy && (
                            <span className="text-2xl mt-[-6px] animate-[bounce_0.5s_infinite_alternate] filter drop-shadow-md">
                              {grabbedToy}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* High contrast headers */}
                  {clawPhase === 'BETTING' && (
                    <div className="absolute top-10 py-1.5 px-5 bg-slate-950/95 border border-pink-500/50 rounded-full text-[10px] font-mono font-black uppercase text-white animate-pulse shadow-lg">
                      🧸 MỞ GẮP THÚ LIVE: <span className="text-pink-400 text-glow-pink font-bold">{clawCountdown}S</span>
                    </div>
                  )}

                  {clawPhase === 'COOLDOWN' && (
                    <div className="absolute bottom-20 text-center z-20 bg-slate-950/95 px-6 py-2.5 rounded-2xl border border-pink-500/50 shadow-2xl backdrop-blur-md">
                      <span className={`font-black font-mono text-xs block tracking-wider ${
                        currentClawResult.success ? 'text-pink-400 text-glow-pink animate-bounce' : 'text-slate-400'
                      }`}>
                        {currentClawResult.success ? '🎉 GẮP TRÚNG THÀNH CÔNG!' : '💔 HỤT MẤT TIẾC QUÁ!'}
                      </span>
                      {currentClawResult.success && (
                        <span className="text-[9px] text-white/80 font-mono block mt-0.5 uppercase font-bold">
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
                  <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-[#050c18] via-[#0b1629] to-[#121f36] p-3 sm:p-4">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06)_1.5px,transparent_1.5px)] bg-[size:18px_18px]" />
                    
                    {/* Realistic Lush Soccer Pitch Pattern */}
                    <div className="w-[96%] h-58 sm:h-66 border-2 border-white/30 rounded-2xl relative overflow-hidden bg-gradient-to-b from-[#0e481c] via-[#145724] to-[#1b632b] shadow-2xl flex items-center justify-center">
                      {/* Lines & markings */}
                      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/30" />
                      <div className="absolute w-20 h-20 sm:w-24 sm:h-24 border-2 border-white/20 rounded-full" />
                      <div className="absolute inset-y-0 left-0 w-[15%] border-2 border-white/20 border-l-0" />
                      <div className="absolute inset-y-0 right-0 w-[15%] border-2 border-white/20 border-r-0" />

                      {/* Render Players as sleek dynamic shirts */}
                      {sim.players.map((p) => {
                        const isBallCarrier = sim.activePlayerId === p.id;
                        return (
                          <div
                            key={p.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none transition-all duration-300"
                            style={{ left: `${p.x}%`, top: `${p.y}%` }}
                          >
                            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[9px] sm:text-[11px] font-mono font-black border-2 shadow-xl ${
                              p.team === 'blue' 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-700 border-blue-300 text-white' 
                                : 'bg-gradient-to-br from-red-500 to-red-700 border-red-300 text-white'
                            }`}>
                              {p.number}
                            </div>
                            
                            <span className="text-[7px] sm:text-[9px] font-mono text-white bg-slate-950/90 px-1.5 rounded-sm scale-90 whitespace-nowrap -mt-0.5 select-none font-bold shadow-md">
                              {p.label === 'GK' ? `GK` : p.name.split(' ')[1] || p.name}
                            </span>

                            {isBallCarrier && (
                              <span className="absolute -top-5 text-[7px] sm:text-[9px] text-yellow-300 font-black animate-bounce whitespace-nowrap uppercase tracking-wider bg-slate-950 border border-yellow-400/50 px-1.5 py-0.5 rounded shadow">
                                {sim.action}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Glowing soccer ball */}
                      <div 
                        className="absolute z-30 text-sm transition-all duration-200 pointer-events-none -translate-x-1/2 -translate-y-1/2 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]" 
                        style={{ left: `${sim.ball.x}%`, top: `${sim.ball.y}%` }}
                      >
                        ⚽
                      </div>
                    </div>

                    {/* TV Commentary box with audio waves */}
                    <div className="w-[96%] mt-2 bg-slate-950/95 border border-blue-500/30 px-3.5 py-1.5 rounded-2xl flex gap-3 items-center shadow-2xl">
                      <div className="w-7 h-7 rounded-full bg-blue-950 border border-blue-400/40 flex items-center justify-center shrink-0 text-xs shadow-md">
                        🎙️
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[7px] font-mono font-black text-blue-400 block tracking-wider uppercase">BÌNH LUẬN TRỰC TIẾP 🎤</span>
                        <p className="text-[9px] text-slate-100 mt-0.5 italic truncate font-semibold font-sans">
                          "{sim.commentary}"
                        </p>
                      </div>
                    </div>

                    {/* Live Scorebug */}
                    <div className="absolute top-7 flex items-center bg-slate-950/95 border border-blue-500/30 px-4 py-1.5 rounded-full font-mono text-[9px] sm:text-[10px] shadow-2xl gap-3 z-10">
                      <span className="text-blue-400 font-black">BLUE</span>
                      <span className="text-white font-black bg-blue-900/70 px-2.5 py-0.5 rounded border border-blue-500/40 text-xs">
                        {fcRealtimeScore.blue}
                      </span>
                      <span className="text-slate-500 font-bold">:</span>
                      <span className="text-white font-black bg-red-900/70 px-2.5 py-0.5 rounded border border-red-500/40 text-xs">
                        {fcRealtimeScore.red}
                      </span>
                      <span className="text-red-400 font-black">RED</span>
                      <span className="text-yellow-400 font-black px-1 animate-pulse">
                        {fcPhase === 'BETTING' ? "PRE-MATCH" : fcPhase === 'PLAYING' ? `${Math.min(Math.floor((fcSecondsElapsed - fcBettingSecs) / fcPlayingSecs * 90), 90)}'` : "FT"}
                      </span>
                    </div>

                    {fcPhase === 'BETTING' && (
                      <div className="absolute top-18 py-1.5 px-4 bg-slate-950/95 border border-blue-500/50 rounded-full text-[10px] font-mono font-black uppercase text-white animate-pulse z-10 shadow-lg">
                        🏟️ TRẬN ĐẤU BẮT ĐẦU TRONG: {fcCountdown}S
                      </div>
                    )}

                    {fcPhase === 'COOLDOWN' && (
                      <div className="absolute bottom-18 text-center z-10 bg-slate-950/95 px-6 py-2.5 rounded-2xl border border-blue-500/50 shadow-2xl backdrop-blur-md">
                        <span className="font-black font-mono text-xs text-blue-400 text-glow-blue tracking-wider block">
                          🏟️ TRẬN ĐẤU KẾT THÚC!
                        </span>
                        <span className="text-[9px] text-white/80 font-mono block mt-0.5 uppercase font-bold">
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
                  <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-[#180606] via-[#090303] to-[#06160d] p-3 sm:p-4">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.06)_1.5px,transparent_1.5px)] bg-[size:18px_18px]" />
                    
                    {/* Golden Casino Felt Grid Arena */}
                    <div className="w-[96%] h-58 sm:h-66 border-2 border-yellow-500/40 rounded-3xl relative overflow-hidden bg-gradient-to-b from-[#140909] via-[#0a0505] to-[#091a0e] shadow-[0_6px_35px_rgba(0,0,0,0.95)] flex items-center justify-between px-6 sm:px-14">
                      
                      {/* Left Side: Dragon Area with gold embroidery border */}
                      <div className={`flex flex-col items-center gap-4 transition-all duration-300 ${
                        dtPhase === 'COOLDOWN' && winner === 'DRAGON' ? 'scale-110 filter drop-shadow-[0_0_25px_rgba(239,68,68,0.7)]' : 'opacity-90'
                      }`}>
                        <span className="text-glow-red text-red-500 font-black text-sm sm:text-base tracking-widest uppercase flex items-center gap-1.5">🐉 RỒNG</span>
                        
                        {/* Card Slot */}
                        <div className={`w-18 h-26 sm:w-22 sm:h-30 rounded-2xl border-2 flex flex-col items-center justify-center relative bg-slate-950 transition-all duration-500 shadow-2xl ${
                          dtPhase === 'COOLDOWN' && winner === 'DRAGON' 
                            ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.7)] bg-red-950/40 ring-2 ring-red-400' 
                            : 'border-red-500/30'
                        }`}>
                          {showCards ? (
                            <motion.div 
                              initial={{ rotateY: 90 }}
                              animate={{ rotateY: 0 }}
                              transition={{ duration: 0.4 }}
                              className="flex flex-col items-center justify-between h-full p-2.5 w-full bg-slate-50 rounded-xl shadow-lg border border-slate-200"
                            >
                              <span className={`text-xs font-black self-start ${res.dragonSuit === '♠' || res.dragonSuit === '♣' ? 'text-slate-950' : 'text-red-600'}`}>
                                {getCardLabel(dVal)}
                              </span>
                              <span className={`text-3xl sm:text-4xl filter drop-shadow-xs ${res.dragonSuit === '♠' || res.dragonSuit === '♣' ? 'text-slate-950' : 'text-red-600'}`}>
                                {res.dragonSuit}
                              </span>
                              <span className={`text-xs font-black self-end rotate-180 ${res.dragonSuit === '♠' || res.dragonSuit === '♣' ? 'text-slate-950' : 'text-red-600'}`}>
                                {getCardLabel(dVal)}
                              </span>
                            </motion.div>
                          ) : (
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-red-800 to-red-950 flex items-center justify-center border border-red-500/50 p-1">
                              <div className="w-full h-full border border-red-500/30 rounded-lg flex flex-col items-center justify-center bg-black/60">
                                <span className="text-2xl sm:text-3xl animate-pulse">🐉</span>
                                <span className="text-[7px] font-mono font-bold text-red-400 mt-1 uppercase tracking-wider">AYK DRAGON</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {dtPhase === 'COOLDOWN' && winner === 'DRAGON' && (
                          <span className="py-1 px-3 bg-red-600 text-white font-black text-[8px] uppercase tracking-wider rounded-lg animate-bounce shadow-lg">
                            WINNER 🏆
                          </span>
                        )}
                      </div>

                      {/* Center: Tie Area & Status */}
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex flex-col items-center justify-center bg-slate-950 transition-all duration-300 ${
                          dtPhase === 'COOLDOWN' && winner === 'TIE' 
                            ? 'border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.7)] scale-110 ring-2 ring-yellow-400' 
                            : 'border-yellow-500/30'
                        }`}>
                          <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest block leading-none">HÒA</span>
                          <span className="text-[9px] text-slate-400 font-mono font-bold mt-0.5">x8.0</span>
                        </div>
                        {dtPhase === 'COOLDOWN' && winner === 'TIE' && (
                          <span className="py-1 px-3 bg-yellow-500 text-black font-black text-[8px] uppercase tracking-wider rounded-lg animate-pulse shadow-md">
                            TIE GAME 🤝
                          </span>
                        )}
                      </div>

                      {/* Right Side: Tiger Area with gold embroidery border */}
                      <div className={`flex flex-col items-center gap-4 transition-all duration-300 ${
                        dtPhase === 'COOLDOWN' && winner === 'TIGER' ? 'scale-110 filter drop-shadow-[0_0_25px_rgba(59,130,246,0.7)]' : 'opacity-90'
                      }`}>
                        <span className="text-glow-blue text-blue-400 font-black text-sm sm:text-base tracking-widest uppercase flex items-center gap-1.5">🐯 HỔ</span>
                        
                        {/* Card Slot */}
                        <div className={`w-18 h-26 sm:w-22 sm:h-30 rounded-2xl border-2 flex flex-col items-center justify-center relative bg-slate-950 transition-all duration-500 shadow-2xl ${
                          dtPhase === 'COOLDOWN' && winner === 'TIGER' 
                            ? 'border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.7)] bg-blue-950/40 ring-2 ring-blue-400' 
                            : 'border-blue-500/30'
                        }`}>
                          {showCards ? (
                            <motion.div 
                              initial={{ rotateY: 90 }}
                              animate={{ rotateY: 0 }}
                              transition={{ duration: 0.4 }}
                              className="flex flex-col items-center justify-between h-full p-2.5 w-full bg-slate-50 rounded-xl shadow-lg border border-slate-200"
                            >
                              <span className={`text-xs font-black self-start ${res.tigerSuit === '♠' || res.tigerSuit === '♣' ? 'text-slate-950' : 'text-red-600'}`}>
                                {getCardLabel(tVal)}
                              </span>
                              <span className={`text-3xl sm:text-4xl filter drop-shadow-xs ${res.tigerSuit === '♠' || res.tigerSuit === '♣' ? 'text-slate-950' : 'text-red-600'}`}>
                                {res.tigerSuit}
                              </span>
                              <span className={`text-xs font-black self-end rotate-180 ${res.tigerSuit === '♠' || res.tigerSuit === '♣' ? 'text-slate-950' : 'text-red-600'}`}>
                                {getCardLabel(tVal)}
                              </span>
                            </motion.div>
                          ) : (
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-800 to-blue-950 flex items-center justify-center border border-blue-500/50 p-1">
                              <div className="w-full h-full border border-blue-500/30 rounded-lg flex flex-col items-center justify-center bg-black/60">
                                <span className="text-2xl sm:text-3xl animate-pulse">🐯</span>
                                <span className="text-[7px] font-mono font-bold text-blue-400 mt-1 uppercase tracking-wider">AYK TIGER</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {dtPhase === 'COOLDOWN' && winner === 'TIGER' && (
                          <span className="py-1 px-3 bg-blue-600 text-white font-black text-[8px] uppercase tracking-wider rounded-lg animate-bounce shadow-lg">
                            WINNER 🏆
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Header overlay title */}
                    <div className="absolute top-7 py-1.5 px-5 bg-slate-950/95 border border-yellow-500/40 rounded-full text-[10px] font-mono font-black uppercase text-yellow-400 tracking-widest z-10 shadow-md">
                      🐅 ĐẤU TRƯỜNG LONG TRANH HỔ ĐẤU AYK
                    </div>

                    {dtPhase === 'BETTING' && (
                      <div className="absolute top-18 py-1.5 px-4 bg-slate-950/95 border border-red-500/50 rounded-full text-[10px] font-mono font-black uppercase text-white animate-pulse z-10 shadow-lg">
                        🔔 ĐẶT CƯỢC: {dtCountdown}S
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>

            {/* Bottom HUD */}
            <div className="z-10 flex flex-col w-full font-mono text-[10px] gap-1.5">
              <div className="flex justify-between items-center w-full">
                <span className="flex items-center gap-1 font-bold text-white uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                  {activeTab === 'taixiu' ? txTimerText : 
                   activeTab === 'crash' ? crashTimerText : 
                   activeTab === 'penalty' ? penTimerText : 
                   activeTab === 'horse' ? horseTimerText : 
                   activeTab === 'claw' ? clawTimerText : 
                   activeTab === 'fcmobile' ? fcTimerText : dtTimerText}
                </span>
                <span className="text-white/40">Phát trực tiếp #AYK-LIV-0{
                  activeTab === 'taixiu' ? txCycleId : 
                  activeTab === 'crash' ? crashCycleId : 
                  activeTab === 'penalty' ? penCycleId : 
                  activeTab === 'horse' ? horseCycleId : 
                  activeTab === 'claw' ? clawCycleId : 
                  activeTab === 'fcmobile' ? fcCycleId : dtCycleId}</span>
              </div>

              {/* ACTION BUTTON UNDER PHÁT TRỰC TIẾP #AYK FOR AIR COMBAT (NÉ ĐẠN) */}
              {activeTab === 'crash' && (
                <div className="w-full pt-1.5 border-t border-cyan-500/30 flex items-center justify-center">
                  {crashPhase === 'BETTING' ? (
                    currentBetPlaced && currentBetPlaced.game === 'crash' && currentBetPlaced.cycleId === crashCycleId ? (
                      <div className="w-full py-2 px-3 bg-emerald-950/90 border border-emerald-400 text-emerald-300 font-mono font-black text-[11px] uppercase tracking-wider rounded-xl text-center shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2">
                        <span>✅ ĐÃ ĐẶT CƯỢC LIVE ({currentBetPlaced.amount.toLocaleString()} PP) - CHỜ CẤT CÁNH NÉ ĐẠN!</span>
                      </div>
                    ) : (
                      <button
                        disabled={currentBetPlaced !== null && currentBetPlaced.cycleId === crashCycleId}
                        onClick={handlePlaceBet}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-600 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-mono font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-pulse hover:scale-[1.01] active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Coins className="w-4 h-4" />
                        <span>🚀 [ XÁC NHẬN CƯỢC LIVE - KHÔNG CHIẾN NÉ ĐẠN ]</span>
                      </button>
                    )
                  ) : crashPhase === 'FLIGHT' ? (
                    currentBetPlaced && currentBetPlaced.game === 'crash' && currentBetPlaced.cycleId === crashCycleId && !currentBetPlaced.evaluated ? (
                      <button
                        onClick={handleCrashCashout}
                        className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-mono font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.9)] animate-bounce hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2 border-2 border-emerald-300"
                      >
                        <span>🪂 BẤM DỪNG & CHỐT LÃI</span>
                        <span className="bg-black/40 text-emerald-200 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold">
                          (+{Math.floor(currentBetPlaced.amount * currentCrashMultiplier).toLocaleString()} PP @ {currentCrashMultiplier}x)
                        </span>
                      </button>
                    ) : (
                      <div className="w-full py-2 px-3 bg-slate-950/90 border border-cyan-500/40 text-cyan-300 font-mono font-black text-[11px] uppercase tracking-wider rounded-xl text-center flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>🚀 PHI THUYỀN ĐANG NÉ ĐẠN... BẬT SỐ NHÂN: <strong className="text-glow-cyan text-white text-xs">{currentCrashMultiplier}x</strong></span>
                      </div>
                    )
                  ) : (
                    <div className="w-full py-2 px-3 bg-red-950/90 border border-red-500/50 text-red-300 font-mono font-black text-[11px] uppercase tracking-wider rounded-xl text-center flex items-center justify-center gap-2">
                      <span>💥 PHI THUYỀN BỊ BẮN NỔ TẠI MỐC {currentCrashPoint}x! CHỜ VÒNG MỚI...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
          </div>

        {/* RIGHT COLUMN: VIP Pro Synchronized Live Chat Sidebar (Span 4) */}
        <div className="lg:col-span-4 flex flex-col glass-box border-amber-500/20 overflow-hidden bg-slate-950/90 shadow-[0_0_25px_rgba(245,158,11,0.1)] rounded-2xl">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-red-950/60 border-b border-amber-500/20 py-2.5 px-3 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Crown className="w-3.5 h-3.5 animate-pulse" />
              </span>
              <span className="font-mono text-[11px] font-black text-amber-300 tracking-wider flex items-center gap-1 uppercase">
                CHAT DÂN CHƠI VIP
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[9px] font-mono text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{Math.floor(1280 + Math.random() * 45)} ONLINE</span>
            </div>
          </div>

          {/* Quick Reaction Emojis Bar */}
          <div className="px-2 py-1.5 bg-black/40 border-b border-white/5 flex gap-1 overflow-x-auto scrollbar-none shrink-0 text-[10px]">
            {[
              { emoji: '🔥', label: 'Tất Tay' },
              { emoji: '🎉', label: 'Lượm Tiền' },
              { emoji: '🚀', label: 'Lên Bờ' },
              { emoji: '💎', label: 'Mãi Đỉnh' },
              { emoji: '💔', label: 'Bẻ Cầu' },
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={async () => {
                  try {
                    const now = new Date();
                    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                    await push(ref(db, 'live_arena_chat'), {
                      uid: uid,
                      sender: user?.name || 'Sếp AYK',
                      message: `${item.emoji} ${item.label}`,
                      time,
                      timestamp: Date.now(),
                      badge: 'VIP'
                    });
                  } catch (e) {}
                }}
                className="px-2 py-1 bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 rounded-lg text-white font-mono font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer flex items-center gap-1 text-[9px]"
              >
                <span>{item.emoji}</span>
                <span className="text-amber-200/80">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Messages container - compact, auto-scroll, live sync */}
          <div 
            ref={chatContainerRef}
            className="flex-1 p-2.5 overflow-y-auto space-y-2 font-sans scrollbar-thin bg-slate-950/60 max-h-[420px] lg:max-h-[500px]"
          >
            {chatMessages.map((msg, index) => {
              // System Win Announcement
              if (msg.isWin) {
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={msg.id || index} 
                    className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 rounded-xl p-2 text-amber-200 font-mono text-[10px] leading-snug shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-300 font-black text-[8px] rounded uppercase border border-amber-400/40 flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5 text-yellow-400" /> WINNER
                      </span>
                      <span className="text-[8px] text-amber-400/60 font-mono">{msg.time}</span>
                    </div>
                    <div className="font-bold text-yellow-300 flex items-center gap-1">
                      {msg.message}
                    </div>
                  </motion.div>
                );
              }

              // Realtime Bet Announcement Card
              if (msg.isBet) {
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={msg.id || index} 
                    className="bg-purple-950/60 border border-purple-500/40 rounded-xl p-2 text-purple-200 font-mono text-[10px] leading-snug shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.2 bg-purple-500/30 text-purple-300 font-black text-[8px] rounded uppercase border border-purple-400/40">
                          🎯 ĐẶT CƯỢC
                        </span>
                        <strong className="font-bold text-white text-[10px]">{msg.sender}</strong>
                      </div>
                      <span className="text-[8px] text-purple-300/60">{msg.time}</span>
                    </div>
                    <div className="text-purple-300 font-bold">
                      {msg.message}
                    </div>
                  </motion.div>
                );
              }

              // System Dealer Message
              if (msg.isSystem) {
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={msg.id || index} 
                    className="bg-pink-950/50 border border-pink-500/30 rounded-xl p-2 text-pink-200 font-mono text-[10px] leading-snug"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="px-1.5 py-0.2 bg-pink-500/20 text-pink-300 font-black text-[8px] rounded uppercase border border-pink-400/30">
                        Dealer Vy Vy 💖
                      </span>
                      <span className="text-[8px] text-pink-300/60">{msg.time}</span>
                    </div>
                    <div className="text-white/90 font-medium">{msg.message}</div>
                  </motion.div>
                );
              }

              // Standard User Chat Message
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id || index} 
                  className={`flex flex-col gap-0.5 max-w-[92%] ${
                    msg.isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[8px] text-slate-400 font-mono">
                    <span className={`px-1 py-0.2 rounded font-black text-[7px] ${
                      msg.role === 'BOT' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                      msg.isUser ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {msg.badge || (msg.role === 'BOT' ? 'BOT AI' : 'VIP')}
                    </span>
                    <strong className={`font-bold ${msg.isUser ? 'text-amber-400' : 'text-slate-200'}`}>{msg.sender}</strong>
                    <span className="text-slate-500 text-[7px]">{msg.time}</span>
                  </div>
                  <div className={`py-1.5 px-2.5 rounded-xl leading-relaxed text-[11px] font-medium whitespace-pre-line shadow-sm ${
                    msg.isUser 
                      ? 'bg-gradient-to-r from-amber-600 to-red-600 text-white rounded-tr-none font-semibold' 
                      : msg.role === 'BOT'
                      ? 'bg-slate-900 border border-cyan-500/30 text-cyan-100 rounded-tl-none'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-none'
                  }`}>
                    {msg.message}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Compact Input Form */}
          <form 
            onSubmit={handleSendChat}
            className="p-2 bg-slate-950 border-t border-amber-500/20 flex gap-1.5 shrink-0 font-mono text-xs"
          >
            <input
              type="text"
              placeholder="Nhập nội dung gáy cùng anh em..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button
              type="submit"
              className="px-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-lg active:scale-95"
            >
              <Send className="w-3.5 h-3.5 text-slate-950" />
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
                      <span className="text-red-400">🔴 TỔNG TÀI ({liveBets.filter(b => b.choice === 'TAI').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'TAI').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-400">🔵 TỔNG XỈU ({liveBets.filter(b => b.choice === 'XIU').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'XIU').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                  </>
                )}
                {activeTab === 'crash' && (
                  <div className="flex justify-between">
                    <span className="text-cyan-400">🚀 TỔNG TIỀN PHI THUYỀN ({liveBets.length} phi công):</span>
                    <span className="font-bold text-white">
                      {liveBets.reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                    </span>
                  </div>
                )}
                {activeTab === 'penalty' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-emerald-400">⚽ TỔNG VÀO ({liveBets.filter(b => b.choice === 'GOAL').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'GOAL').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-400">🧤 TỔNG THỦ MÔN CẢN ({liveBets.filter(b => b.choice === 'MISS').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'MISS').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                  </>
                )}
                {activeTab === 'dragontiger' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-red-400">🐉 TỔNG RỒNG ({liveBets.filter(b => b.choice === 'DRAGON').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'DRAGON').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400">🐯 TỔNG HỔ ({liveBets.filter(b => b.choice === 'TIGER').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'TIGER').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-400">⚖️ TỔNG HÒA ({liveBets.filter(b => b.choice === 'TIE').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'TIE').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                  </>
                )}
                {activeTab === 'horse' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-amber-400">🐎 NGỰA 1 ({liveBets.filter(b => b.choice === 'HORSE_1').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'HORSE_1').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rose-400">🐎 NGỰA 2 ({liveBets.filter(b => b.choice === 'HORSE_2').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'HORSE_2').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sky-400">🐎 NGỰA 3 ({liveBets.filter(b => b.choice === 'HORSE_3').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'HORSE_3').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-400">🐎 NGỰA 4 ({liveBets.filter(b => b.choice === 'HORSE_4').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'HORSE_4').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                  </>
                )}
                {activeTab === 'fcmobile' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-blue-400">🔵 ĐỘI XANH ({liveBets.filter(b => b.choice === 'FC_BLUE').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'FC_BLUE').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-400">🔴 ĐỘI ĐỎ ({liveBets.filter(b => b.choice === 'FC_RED').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'FC_RED').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-400">🤝 TỶ SỐ HÒA ({liveBets.filter(b => b.choice === 'FC_DRAW').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'FC_DRAW').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                  </>
                )}
                {activeTab === 'claw' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-pink-400">🧸 CỬA TRÚNG ({liveBets.filter(b => b.choice === 'CLAW_WIN').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'CLAW_WIN').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-400">❌ CỬA TRƯỢT ({liveBets.filter(b => b.choice === 'CLAW_LOSE').length} người):</span>
                      <span className="font-bold text-white">
                        {liveBets.filter(b => b.choice === 'CLAW_LOSE').reduce((sum, b) => sum + b.amount, 0).toLocaleString()} PP
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
                <div className="space-y-2">
                  <div className="p-2.5 bg-cyan-950/20 border border-cyan-500/30 rounded-xl text-[10px] font-mono text-cyan-300 leading-relaxed text-center">
                    🚀 Đặt cược vào Phi Thuyền Né Đạn. Bấm <b>NHẢY DÙ & CHỐT LÃI</b> bất cứ lúc nào khi bay để thanh toán TIỀN THẮNG LẬP TỨC!
                  </div>
                  <button
                    disabled={crashPhase !== 'BETTING' || (currentBetPlaced !== null && currentBetPlaced.cycleId === crashCycleId)}
                    onClick={() => setBetChoice('CRASH_RIDE')}
                    className={`w-full py-3.5 rounded-xl border font-mono text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      betChoice === 'CRASH_RIDE'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span>🚀 LÊN PHI THUYỀN KHÔNG CHIẾN NÉ ĐẠN</span>
                    <span className="text-[10px] text-cyan-300 font-bold">(CƯỢC GỒNG LÃI X100)</span>
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

                {activeTab === 'crash' && crashPhase === 'FLIGHT' && currentBetPlaced && currentBetPlaced.game === 'crash' && currentBetPlaced.cycleId === crashCycleId && !currentBetPlaced.evaluated ? (
                  <button
                    onClick={handleCrashCashout}
                    className="py-3.5 px-6 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-mono font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.7)] animate-pulse hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 border-2 border-emerald-300"
                  >
                    <span>🪂 NHẢY DÙ & CHỐT LÃI</span>
                    <span className="bg-black/30 text-emerald-200 px-2 py-0.5 rounded text-[10px] font-mono">
                      (+{Math.floor(currentBetPlaced.amount * currentCrashMultiplier).toLocaleString()} PP)
                    </span>
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
                  activeTab === 'taixiu' ? '🎲 TÀI XỈU AYK' :
                  activeTab === 'crash' ? '🚀 KHÔNG CHIẾN AYK' :
                  activeTab === 'penalty' ? '⚽ SÚT PHẠT 3D' :
                  activeTab === 'horse' ? '🐎 ĐUA NGỰA LIVE' :
                  activeTab === 'claw' ? '🧸 GẮP THÚ LIVE' :
                  activeTab === 'dragontiger' ? '🐉 RỒNG HỔ LIVE' :
                  '🏟️ FC ARENA AYK'
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
                    <p>• Phi thuyền AYK sẽ cất cánh bay cao và số nhân (multiplier) giải thưởng tăng dần liên tục theo đồ thị leo dốc.</p>
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
