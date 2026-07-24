/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { ref, push, update } from 'firebase/database';
import { db } from '../firebase';

export interface AIBot {
  id: string;
  name: string;
  avatar: string;
  level: number;
  title: string;
}

// 100 UNIQUE VIBRANT AI BOTS FOR THE ENTIRE SERVER
export const AI_BOTS: AIBot[] = [
  { id: 'bot_1', name: '🐉 Thần Bài Sài Gòn', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot1', level: 99, title: 'Bá Chủ Đặt Cược' },
  { id: 'bot_2', name: '🐽 Bé Heo Xinh', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot2', level: 18, title: 'Thánh Soi Cầu' },
  { id: 'bot_3', name: '💎 Đại Gia Quận 1', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot3', level: 88, title: 'Đại Gia S88' },
  { id: 'bot_4', name: '🔥 Nam Cương 88', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot4', level: 32, title: 'Vua Phi Thuyền' },
  { id: 'bot_5', name: '👑 Hoàng Tử Lắc Bát', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot5', level: 60, title: 'Cao Thủ Nặn Bát' },
  { id: 'bot_6', name: '🎯 Thánh Soi Cầu', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot6', level: 27, title: 'Chủ Lô Đề' },
  { id: 'bot_7', name: '🚀 Pro_Hunter_99', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot7', level: 50, title: 'Thợ Săn Rồng' },
  { id: 'bot_8', name: '⚡ Bá Chủ Tài Xỉu', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot8', level: 75, title: 'Trùm Bão Bát' },
  { id: 'bot_9', name: '🐉 Cửu Long Vương', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot9', level: 99, title: 'Huyền Thoại Casino' },
  { id: 'bot_10', name: '🌸 Bé Miu Miu', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot10', level: 12, title: 'Tân Thủ Mắn Lộc' },
  { id: 'bot_11', name: '🦊 Cáo Già Las Vegas', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot11', level: 82, title: 'Sát Thủ Bàn Cược' },
  { id: 'bot_12', name: '🦅 Đại Diêu S88', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot12', level: 41, title: 'Bậc Thầy Sút Phạt' },
  { id: 'bot_13', name: '⚽ Siêu Sao FC Mobile', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot13', level: 65, title: 'Thần Đá Phạt 3D' },
  { id: 'bot_14', name: '🎲 Bão Lộc 88', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot14', level: 39, title: 'Chiến Thần Nổ Hũ' },
  { id: 'bot_15', name: '🦄 Bé Thỏ Candy', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot15', level: 22, title: 'Thánh Gắp Thú' },
  { id: 'bot_16', name: '🎩 Bố Già Godfather', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot16', level: 95, title: 'Ông Trùm S88' },
  { id: 'bot_17', name: '🏎️ Tay Đua F1', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot17', level: 53, title: 'Chúa Tể Tốc Độ' },
  { id: 'bot_18', name: '🐎 Thần Mã Hoàng Gia', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot18', level: 68, title: 'Đua Ngựa Vô Địch' },
  { id: 'bot_19', name: '🃏 Vua Tiến Lên', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot19', level: 71, title: 'Tứ Quý Heo' },
  { id: 'bot_20', name: '💥 Xì Dách Blackjack', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot20', level: 84, title: 'Xì Dách 21 Điểm' },
  { id: 'bot_21', name: '✨ Cò Quay Roulette', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot21', level: 48, title: 'Thần may mắn' },
  { id: 'bot_22', name: '🎯 Thợ Săn Rồng Thần', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot22', level: 90, title: 'Dồn Dame QTE' },
  { id: 'bot_23', name: '🤖 AI Gia Sư Chăm Học', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot23', level: 100, title: 'Học Bả S88' },
  { id: 'bot_24', name: '💰 Tỷ Phú Bất Động Sản', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot24', level: 91, title: 'Trùm Ngân Hàng' },
  { id: 'bot_25', name: '🛡️ Đội Trưởng An Ninh', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot25', level: 77, title: 'Khung Rồng Vàng' },
  { id: 'bot_26', name: '🐯 Mãnh Hổ Đất Cảng', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot26', level: 63, title: 'Chiến Thần Đấu Thẻ' },
  { id: 'bot_27', name: '🐉 Rồng Thiêng Cổ Đại', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot27', level: 98, title: 'Săn Boss Hoàng Gia' },
  { id: 'bot_28', name: '🧸 Mèo Gắp Thú Pro', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot28', level: 35, title: 'Gắp Thú Siêu Hạng' },
  { id: 'bot_29', name: '🔥 Cao Thủ Nhảy Dù', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot29', level: 59, title: 'Húp x150 Phi Thuyền' },
  { id: 'bot_30', name: '💎 Công Chúa S88', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot30', level: 44, title: 'Nữ Hoàng Vòng Quay' },
  { id: 'bot_31', name: '⚔️ Sát Thủ Thẻ Bài', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot31', level: 86, title: 'Deck Huyền Thoại' },
  { id: 'bot_32', name: '🍀 Thần Tài Đáo Gia', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot32', level: 69, title: 'Nổ Hũ Bão Bát' },
  { id: 'bot_33', name: '⚽ Messi Sút Phạt', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot33', level: 93, title: 'Góc Chết 100%' },
  { id: 'bot_34', name: '🏆 Ronaldo Ăn Mừng', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot34', level: 94, title: 'Siuuuuu FC' },
  { id: 'bot_35', name: '🎮 Gamer Bách Chiến', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot35', level: 56, title: 'Cày Nhiệm Vụ 24/7' },
  { id: 'bot_36', name: '⚡ Lốc Xoáy Hà Nội', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot36', level: 47, title: 'Cược Xanh Chín' },
  { id: 'bot_37', name: '🔮 Pháp Sư Soi Cầu', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot37', level: 73, title: 'Cầu Chuẩn 99%' },
  { id: 'bot_38', name: '🎩 Bậc Thầy Oẳn Tù Tì', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot38', level: 51, title: 'Đoán Tâm Lý' },
  { id: 'bot_39', name: '🌟 Idol Học Đường', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot39', level: 62, title: 'Bát Vàng S88' },
  { id: 'bot_40', name: '🦊 Hồ Li Mắn Lộc', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot40', level: 30, title: 'Tân Khoa S88' },
  // Additional 60 Bots (41 to 100)
  { id: 'bot_41', name: '🐉 Long Vương Thất Sát', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot41', level: 89, title: 'Huyền Thoại World Hunting' },
  { id: 'bot_42', name: '⚡ Thần Lôi Bão Cược', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot42', level: 78, title: 'Đại Gia Sàn Vàng' },
  { id: 'bot_43', name: '👑 Nữ Hoàng Đỏ Đen', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot43', level: 85, title: 'Sòng Bài Thần Ký' },
  { id: 'bot_44', name: '🎮 Trùm Minigame', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot44', level: 66, title: 'Top 1 Server' },
  { id: 'bot_45', name: '🚀 Phi Công Vũ Trụ', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot45', level: 72, title: 'Chế Độ Crash Pro' },
  { id: 'bot_46', name: '🎯 Xạ Thủ Bắn Cá', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot46', level: 80, title: 'Thợ Săn Tiền Thưởng' },
  { id: 'bot_47', name: '🏆 Cao Thủ Bàn Cược', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot47', level: 92, title: 'S88 Master' },
  { id: 'bot_48', name: '🌸 Hoa Khôi S88', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot48', level: 43, title: 'Miu Miu Mắn Lộc' },
  { id: 'bot_49', name: '💰 Vua Tiết Kiệm', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot49', level: 57, title: 'Lãi Suất Ngân Hàng' },
  { id: 'bot_50', name: '🔥 Chiến Thần Đội Hình', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot50', level: 81, title: 'S Pass VIP' },
  { id: 'bot_51', name: '🎲 Thánh Lắc Bát', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot51', level: 67, title: 'Chủ Sảnh Tài Xỉu' },
  { id: 'bot_52', name: '🛡️ Hiệp Sĩ Rồng Vàng', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot52', level: 74, title: 'Khung Rồng Độc Quyền' },
  { id: 'bot_53', name: '⚡ Tia Chớp Đường Đua', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot53', level: 61, title: 'Chiến Mã Số 1' },
  { id: 'bot_54', name: '⚽ Vua Phá Lưới 3D', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot54', level: 87, title: 'Penalty King' },
  { id: 'bot_55', name: '🃏 Bố Già Tiến Lên', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot55', level: 96, title: 'Chăn Chặt Heo' },
  { id: 'bot_56', name: '💎 Đại Cường S88', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot56', level: 83, title: 'Đại Gia Phong Độ' },
  { id: 'bot_57', name: '🌟 Ngôi Sao Sân Cỏ', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot57', level: 58, title: 'FC Mobile Champion' },
  { id: 'bot_58', name: '🦊 Hồ Li Đặt Cược', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot58', level: 49, title: 'Thần May Mắn' },
  { id: 'bot_59', name: '🚀 Hạm Trưởng Crash', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot59', level: 79, title: 'Trùm x200' },
  { id: 'bot_60', name: '🍀 Lộc Phát 888', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot60', level: 38, title: 'Bảo Vệ Nổ Hũ' },
  { id: 'bot_61', name: '🎯 Xạ Thủ QTE', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot61', level: 88, title: 'Bá Chủ Boss Rồng' },
  { id: 'bot_62', name: '🤖 AI Chuyên Gia', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot62', level: 100, title: 'Trợ Lý Học Thuật' },
  { id: 'bot_63', name: '🏆 Siêu Cấp Gamer', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot63', level: 70, title: 'Cày PP Siêu Cấp' },
  { id: 'bot_64', name: '💥 Thánh Phá Bát', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot64', level: 52, title: 'Đội Trưởng Nặn Bát' },
  { id: 'bot_65', name: '🐉 Rồng Thiêng Bá Vương', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot65', level: 97, title: 'Thợ Săn Cổ Đại' },
  { id: 'bot_66', name: '🎩 Thầy Giáo S88', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot66', level: 90, title: 'Chủ Nhiệm Khoa' },
  { id: 'bot_67', name: '🧸 Bé Bông Đáng Yêu', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot67', level: 25, title: 'Fan Cuồng Minigame' },
  { id: 'bot_68', name: '⚡ Lốc Xoáy Bão Lộc', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot68', level: 64, title: 'Thần Bài Miền Tây' },
  { id: 'bot_69', name: '💰 Đại Phú Gia S88', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot69', level: 92, title: 'Tài Sản 100 Triệu PP' },
  { id: 'bot_70', name: '👑 Nữ Hoàng Sút Phạt', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot70', level: 76, title: 'Xạ Thủ Sút Phạt' },
  { id: 'bot_71', name: '🔥 Quái Kiệt Poker', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot71', level: 84, title: 'Royal Flush' },
  { id: 'bot_72', name: '🐎 Mãnh Mã Hoàng Gia', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot72', level: 55, title: 'Bật Tốc Đường Đua' },
  { id: 'bot_73', name: '🎯 Cao Thủ Cò Quay', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot73', level: 68, title: 'Ô Số 36 Đỏ' },
  { id: 'bot_74', name: '🌸 Bé Ly Ly', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot74', level: 20, title: 'Nhiệt Tình Chat' },
  { id: 'bot_75', name: '🐉 Hỏa Long S88', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot75', level: 85, title: 'Voi Rồng Cổ Đại' },
  { id: 'bot_76', name: '⚽ Siêu Hậu Vệ FC', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot76', level: 73, title: 'Lưới Thép S88' },
  { id: 'bot_77', name: '💎 Thiếu Gia Hà Thành', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot77', level: 87, title: 'Quên Đường Về' },
  { id: 'bot_78', name: '🚀 Thần Vũ Trụ Crash', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot78', level: 91, title: 'Cút Lộn x300' },
  { id: 'bot_79', name: '🎲 Bậc Thầy Lắc Bát', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot79', level: 79, title: 'Chủ Kèo Xanh Chín' },
  { id: 'bot_80', name: '✨ Tiên Nữ Vòng Quay', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot80', level: 63, title: 'Quay 50k PP' },
  { id: 'bot_81', name: '🏆 Vua Đấu Trường', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot81', level: 95, title: 'Arena 1v1 Master' },
  { id: 'bot_82', name: '💥 Xạ Thủ Đi Săn', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot82', level: 82, title: 'Crit Boost 2X' },
  { id: 'bot_83', name: '🎩 Giáo Sư AI', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot83', level: 100, title: 'Tiến Sĩ S88' },
  { id: 'bot_84', name: '🔥 Nam Vương S88', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot84', level: 71, title: 'Khung Hologram' },
  { id: 'bot_85', name: '🧸 Bé Na Đáng Yêu', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot85', level: 29, title: 'Mê Sút Phạt' },
  { id: 'bot_86', name: '⚡ Phong Bão Casino', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot86', level: 86, title: 'Bão Bát Lớn' },
  { id: 'bot_87', name: '💰 Hoàng Tử Sàn Vàng', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot87', level: 93, title: 'Giao Dịch Vàng Rồng' },
  { id: 'bot_88', name: '🐉 Sát Thủ Rồng Cổ', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot88', level: 89, title: 'Bảng Vàng World Hunting' },
  { id: 'bot_89', name: '🃏 Thần Bài Xì Dách', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot89', level: 84, title: 'Xì Bàn ' },
  { id: 'bot_90', name: '🌟 Ngôi Sao Đua Ngựa', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot90', level: 67, title: 'Chiến Mã Tốc Độ' },
  { id: 'bot_91', name: '⚽ Tiền Đạo Sút Phạt', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot91', level: 75, title: 'Vua Sút Bóng 3D' },
  { id: 'bot_92', name: '🎯 Bậc Thầy Oẳn Tù Tì', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot92', level: 60, title: 'Chủ Bàn Kéo Búa Bao' },
  { id: 'bot_93', name: '🚀 Phi Công Tốc Độ', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot93', level: 77, title: 'Trùm Nhảy Dù' },
  { id: 'bot_94', name: '👑 Nữ Vương Bàn Cược', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot94', level: 88, title: 'Đại Gia S88 Pro' },
  { id: 'bot_95', name: '🔥 Hỏa Thần Minigame', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot95', level: 90, title: 'Chuỗi Thắng 20' },
  { id: 'bot_96', name: '💎 Phú Ông S88', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot96', level: 94, title: 'Tài Khoản 50M PP' },
  { id: 'bot_97', name: '🌸 Miu Miu Yêu Game', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot97', level: 31, title: 'Chăm Nhận Quà' },
  { id: 'bot_98', name: '🐉 Rồng Thần S88', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot98', level: 99, title: 'Chúa Tể Đồ Độc Quyền' },
  { id: 'bot_99', name: '⚡ Chiến Thần Đấu Thẻ', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot99', level: 96, title: 'Vua Thẻ Bài SS' },
  { id: 'bot_100', name: '👑 Bố Già S88 VIP', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot100', level: 100, title: 'Huyền Thoại Server' }
];

const AI_CHAT_MESSAGES = [
  "Anh em ơi Tài tiếng này chắc như đinh đóng cột! 🎲🔥",
  "Vừa cất cánh Phi Thuyền húp x8.50 ngon ơ 🚀💸",
  "Bá Chủ Rồng Thần vừa xuất hiện bên Đấu Trường Săn Thú kìa ae ơi!",
  "Tiếng này theo Xỉu gấp đôi tay gỡ lại lẹ ⚡",
  "Hôm nay sảnh S88 nổ hũ đậm quá ae ơi 🎉",
  "Đại gia nào húp hũ bão 150x đỉnh vậy khao chè đê!",
  "Anh em ai đánh sút phạt penalty không gánh kèo với!",
  "Chào cả nhà S88 nhé, chúc ae nổ hũ rực rỡ!",
  "Xỉu 3 con 1 nổ Bão húp trọn 150x sướng rên 🎰",
  "Trận này rồng thần chảy nhiều máu quá ae tập trung dồn dame QTE!",
  "Mới nạp thẻ x2 lộc quất nốt tay Tài cuối nghỉ đêm",
  "Lên Phi Thuyền cất cánh x10.00 nhảy dù an toàn rồi nhé ae",
  "S88 nạp rút nhanh vãi chưởng chưa đầy 5s đã ting ting",
  "Chiến thần bắn cá khu 3 vừa diệt xong Rồng Thần Cổ Đại 🐉",
  "AE đã hoàn thành đủ 20 nhiệm vụ hằng ngày nhận PP chưa?",
  "Nhiệm vụ chơi game với chat hôm nay thưởng tận 25,000 PP ngon vl!",
  "S88 nâng cấp 100 AI sôi nổi cả server đông vui đỉnh thật!",
  "Có ai đá FC Mobile 3D không tạo phòng giao hữu đi!",
  "Xì Dách Blackjack vừa bốc trúng Xì Bàn húp trọn hũ 💸",
  "Tiến lên miền nam chặt 2 được cừu đen vui phết",
  "Gắp thú bằng bông vừa được em Kỳ Lân Pink x10 hên vãi",
  "Ngân Hàng S88 vừa cộng lãi tiết kiệm hàng giờ đã ghê",
  "Ai cần gia sư ôn bài hỏi AI S88 trả lời chuẩn 100% nha",
  "Đua ngựa chiến mã số 3 bứt tốc phút cuối đỉnh cao!",
  "Mới sắm Khung Rồng Vàng trông quý tộc hẳn ae ơi 👑",
  "Bảng xếp hạng đại gia S88 hôm nay top 1 tận 100M PP",
  "Cò quay Roulette quay trúng ô 36 Đỏ húp x36 nổ hũ!",
  "Oẳn tù tì thắng liền 3 ván nhận ngay danh hiệu Thần Đoán",
  "S88 News Portal cập nhật tin tức siêu hot mỗi ngày",
  "Đấu thẻ bài 1v1 xài card SS vừa hạ boss ngon lành"
];

const GAME_NAMES = ['Tài Xỉu', 'Phi Thuyền', 'Đi Săn Bắn Cá', 'Sút Phạt 3D', 'Xì Dách', 'FC Mobile', 'Cò Quay Roulette', 'Đua Ngựa'];

export default function AIBotSimulation() {
  useEffect(() => {
    // 1. AI Betting Simulator (Runs every 6 - 10 seconds)
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
    }, 8000);

    // 2. AI Chat Messages Simulator (Runs every 10 - 16 seconds)
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
    }, 12000);

    // 3. Dynamic Online AI Viewer Counter Fluctuation (Showing 100 AI Bots + 200+ online users)
    const onlineInterval = setInterval(() => {
      const baseAIViewers = Math.floor(Math.random() * 400) + 100; // 100 to 500
      const onlineUpdates: { [key: string]: any } = {};

      // Register active 100 AI bots in 'online' node
      AI_BOTS.forEach((b, idx) => {
        onlineUpdates[`bot_${idx}`] = {
          name: `${b.name} (${b.title})`,
          time: Date.now(),
          isAI: true
        };
      });

      // Add dynamic virtual viewers chunk
      for (let i = 0; i < Math.min(baseAIViewers, 40); i++) {
        onlineUpdates[`v_user_${i}`] = {
          name: `Khán Giả S88 #${1000 + i}`,
          time: Date.now(),
          isAI: true
        };
      }

      update(ref(db, 'online'), onlineUpdates).catch(() => {});
    }, 6000);

    return () => {
      clearInterval(betInterval);
      clearInterval(chatInterval);
      clearInterval(onlineInterval);
    };
  }, []);

  return null; // Invisible background simulation runner
}
