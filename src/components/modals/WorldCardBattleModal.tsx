import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Zap, Swords, Heart, Sparkles, Eye, Trophy, RefreshCw, Send, Volume2, Users, Bot, BarChart2, Layers, Clock, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../../firebase';
import { ref, onValue, set, update, push, remove, get } from 'firebase/database';
import { getCardImageSvg, getCardBackSvg } from './cardImages';

interface WorldCardBattleModalProps {
  uid: string;
  user: any;
  onClose: () => void;
  onShowResult?: (title: string, msg: string, isSuccess: boolean) => void;
}

export interface CardItem {
  id: string;
  name: string;
  role: 'ATTACK' | 'DEFENSE' | 'SPECIAL' | 'SUPPORT';
  roleName: string;
  rarity: 'C' | 'B' | 'A' | 'S';
  rarityName: string;
  atk: number;
  def: number;
  skillName: string;
  skillDesc: string;
  energyCost: number;
  color: string;
  avatarUrl: string;
  instanceId?: string;
  used?: boolean;
}

// 100 UNIQUE CARDS FULL POOL
export const FULL_CARD_POOL: CardItem[] = [
  {
    id: 'c1',
    name: 'Chiến Binh Gào Thét',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 80,
    def: 30,
    skillName: 'Tiếng Hét Chấn Động',
    skillDesc: 'Gây 80 sát thương chấn động & giảm phòng thủ đối thủ.',
    energyCost: 2,
    color: 'from-red-600 via-rose-700 to-amber-900',
    avatarUrl: getCardImageSvg('c1')
  },
  {
    id: 'c2',
    name: 'Lá Chắn Sốc',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 10,
    def: 90,
    skillName: 'Phản Pháo Giáp',
    skillDesc: 'Giảm 50% sát thương nhận vào & nhận +60 Giáp.',
    energyCost: 2,
    color: 'from-blue-600 via-indigo-700 to-sky-900',
    avatarUrl: getCardImageSvg('c2')
  },
  {
    id: 'c3',
    name: 'Kẻ Trêu Chọc Vô Tận',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 40,
    def: 40,
    skillName: 'Tráo Đổi Hỗn Loạn',
    skillDesc: 'Đảo ngược chỉ số Công/Thủ của 2 bên & hồi +20 HP.',
    energyCost: 3,
    color: 'from-purple-600 via-pink-600 to-yellow-600',
    avatarUrl: getCardImageSvg('c3')
  },
  {
    id: 'c4',
    name: 'Khiên Phòng Thủ',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 20,
    def: 90,
    skillName: 'Khiên Năng Lượng',
    skillDesc: 'Nhận +70 Giáp kiên cố bảo vệ tính mạng.',
    energyCost: 2,
    color: 'from-cyan-600 via-teal-700 to-purple-900',
    avatarUrl: getCardImageSvg('c4')
  },
  {
    id: 'c5',
    name: 'Thấy Mà Ghe',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 0,
    def: 60,
    skillName: 'Lập Trình Hỗn Loạn',
    skillDesc: 'Đổi vai trò Công-Thủ của 2 bên & nhận +40 Giáp.',
    energyCost: 3,
    color: 'from-amber-500 via-purple-600 to-emerald-900',
    avatarUrl: getCardImageSvg('c5')
  },
  {
    id: 'c6',
    name: 'Đấm Phát Chết Luôn',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 120,
    def: 40,
    skillName: 'Cú Đấm Năng Lượng',
    skillDesc: 'Bộc phá giáng 150 sát thương cực lớn lên đối thủ.',
    energyCost: 3,
    color: 'from-cyan-500 via-blue-600 to-slate-900',
    avatarUrl: getCardImageSvg('c6')
  },
  {
    id: 'c7',
    name: 'Kiểm Soát Thời Gian',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 0,
    def: 60,
    skillName: 'Đảo Ngược Thời Gian',
    skillDesc: 'Hồi +30 HP & hồi phục +2 Năng lượng thần tốc.',
    energyCost: 2,
    color: 'from-amber-600 via-yellow-700 to-stone-900',
    avatarUrl: getCardImageSvg('c7')
  },
  {
    id: 'c8',
    name: 'Điều Chỉnh Chỉ Số',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 0,
    def: 60,
    skillName: 'Lập Trình Đối Nghịch',
    skillDesc: 'Hồi +40 HP & nhận +40 Giáp phòng thủ kiên cố.',
    energyCost: 2,
    color: 'from-blue-500 via-indigo-600 to-cyan-900',
    avatarUrl: getCardImageSvg('c8')
  },
  {
    id: 'c9',
    name: 'Cuộc Gọi Toàn Cầu',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 160,
    def: 30,
    skillName: 'Gọi Đồng Đội Tấn Công',
    skillDesc: 'Triệu hồi đồng đội tấn công với 160 Sát thương.',
    energyCost: 3,
    color: 'from-slate-700 via-red-800 to-cyan-900',
    avatarUrl: getCardImageSvg('c9')
  },
  {
    id: 'c10',
    name: 'Hỏa Long Tế Điện',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 130,
    def: 30,
    skillName: 'Bộc Phá Hỏa Long',
    skillDesc: 'Phun lửa ma thuật gây 130 sát thương thiêu đốt.',
    energyCost: 3,
    color: 'from-red-700 via-orange-800 to-amber-950',
    avatarUrl: getCardImageSvg('c10')
  },
  {
    id: 'c11',
    name: 'Băng Giáp Vô Cực',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 20,
    def: 120,
    skillName: 'Đóng Băng Tuyệt Đối',
    skillDesc: 'Dựng tường băng kiên cố +100 Giáp & +20 HP.',
    energyCost: 2,
    color: 'from-sky-600 via-cyan-700 to-slate-900',
    avatarUrl: getCardImageSvg('c11')
  },
  {
    id: 'c12',
    name: 'Đạo Sĩ Hồi Sinh',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 40,
    def: 70,
    skillName: 'Trận Pháp Phù Đồ',
    skillDesc: 'Triệu hồi bùa chú hồi +60 HP & +1 Năng lượng.',
    energyCost: 2,
    color: 'from-emerald-600 via-green-700 to-teal-950',
    avatarUrl: getCardImageSvg('c12')
  },
  {
    id: 'c13',
    name: 'Phù Thủy Thời Gian',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 50,
    def: 50,
    skillName: 'Phù Phép Không Gian',
    skillDesc: 'Nhận +30 Giáp & Hồi +30 HP & trừ 1 NL đối thủ.',
    energyCost: 2,
    color: 'from-purple-700 via-fuchsia-800 to-slate-950',
    avatarUrl: getCardImageSvg('c13')
  },
  {
    id: 'c14',
    name: 'Sát Thủ Bóng Đêm',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 140,
    def: 25,
    skillName: 'Đâm Lén Bóng Đêm',
    skillDesc: 'Vòng sau lưng đâm lén gây 140 Sát thương bộc phá.',
    energyCost: 3,
    color: 'from-slate-900 via-rose-950 to-black',
    avatarUrl: getCardImageSvg('c14')
  },
  {
    id: 'c15',
    name: 'Thiên Thần Hộ Vệ',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 15,
    def: 110,
    skillName: 'Cánh Thần Bất Hoại',
    skillDesc: 'Mở cánh thần bảo hộ nhận +90 Giáp & +30 HP.',
    energyCost: 2,
    color: 'from-sky-500 via-blue-700 to-indigo-950',
    avatarUrl: getCardImageSvg('c15')
  },
  {
    id: 'c16',
    name: 'Lôi Thần Nộ Phóng',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 150,
    def: 20,
    skillName: 'Sấm Sét Cực Hạn',
    skillDesc: 'Kích hoạt lôi phạt giáng 150 sát thương điện giật.',
    energyCost: 3,
    color: 'from-yellow-600 via-amber-700 to-stone-950',
    avatarUrl: getCardImageSvg('c16')
  },
  {
    id: 'c17',
    name: 'Ma Trận Phản Chiếu',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 30,
    def: 100,
    skillName: 'Gương Phản Xạ',
    skillDesc: 'Dựng ma trận gương +80 Giáp & phản đòn tấn công.',
    energyCost: 2,
    color: 'from-indigo-600 via-violet-800 to-purple-950',
    avatarUrl: getCardImageSvg('c17')
  },
  {
    id: 'c18',
    name: 'Dược Sĩ Hoàng Gia',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 35,
    def: 65,
    skillName: 'Thuốc Độc & Hồi Sinh',
    skillDesc: 'Uống thần dược hồi +70 HP & +20 Giáp.',
    energyCost: 2,
    color: 'from-teal-600 via-emerald-700 to-slate-950',
    avatarUrl: getCardImageSvg('c18')
  },
  {
    id: 'c19',
    name: 'Trảm Hồn Kiếm Thánh',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 135,
    def: 35,
    skillName: 'Trảm Hồn Nhất Kiếm',
    skillDesc: 'Vung thánh kiếm gây 135 Sát thương sắc lẹm.',
    energyCost: 3,
    color: 'from-rose-700 via-red-800 to-pink-950',
    avatarUrl: getCardImageSvg('c19')
  },
  {
    id: 'c20',
    name: 'Pháo Băng Bất Hoại',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 25,
    def: 115,
    skillName: 'Bức Tường Băng Giá',
    skillDesc: 'Kiến tạo pháo đài băng giá +110 Giáp kiên cố.',
    energyCost: 2,
    color: 'from-blue-700 via-cyan-800 to-slate-950',
    avatarUrl: getCardImageSvg('c20')
  },
  {
    id: 'c21',
    name: 'Thần Ma Trảm',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 145,
    def: 35,
    skillName: 'Thần Ma Tuyệt Trảm',
    skillDesc: 'Giáng 145 sát thương thần ma & phá 50% Giáp đối thủ.',
    energyCost: 3,
    color: 'from-rose-800 via-red-900 to-black',
    avatarUrl: getCardImageSvg('c21')
  },
  {
    id: 'c22',
    name: 'Kim Cang Bộc Phá',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 30,
    def: 125,
    skillName: 'Kim Cang Bất Hoại',
    skillDesc: 'Kích hoạt giáp kim cang +120 Giáp & hồi +20 HP.',
    energyCost: 2,
    color: 'from-slate-800 via-sky-800 to-blue-950',
    avatarUrl: getCardImageSvg('c22')
  },
  {
    id: 'c23',
    name: 'Thiên Biến Vạn Hóa',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 45,
    def: 65,
    skillName: 'Ảo Mảnh Tráo Đổi',
    skillDesc: 'Trao đổi năng lượng, hồi +50 HP & nhận +30 Giáp.',
    energyCost: 2,
    color: 'from-purple-800 via-fuchsia-900 to-black',
    avatarUrl: getCardImageSvg('c23')
  },
  {
    id: 'c24',
    name: 'Độc Ma Xâm Nhập',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 135,
    def: 40,
    skillName: 'Kịch Độc Bộc Phá',
    skillDesc: 'Phun kịch độc gây 135 Sát thương & hút 20 HP đối thủ.',
    energyCost: 3,
    color: 'from-emerald-800 via-green-900 to-black',
    avatarUrl: getCardImageSvg('c24')
  },
  {
    id: 'c25',
    name: 'Bát Quái Trận Đồ',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 25,
    def: 120,
    skillName: 'Bát Quái Hộ Thể',
    skillDesc: 'Mở trận đồ bát quái +100 Giáp & phản 30 Sát thương.',
    energyCost: 2,
    color: 'from-indigo-800 via-blue-900 to-slate-950',
    avatarUrl: getCardImageSvg('c25')
  },
  {
    id: 'c26',
    name: 'Lôi Đình Vô Cực',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 155,
    def: 25,
    skillName: 'Cuồng Sấm Lôi Phạt',
    skillDesc: 'Trút mưa sấm sét cực hạn gây 155 Sát thương bộc phát.',
    energyCost: 3,
    color: 'from-amber-600 via-yellow-700 to-black',
    avatarUrl: getCardImageSvg('c26')
  },
  {
    id: 'c27',
    name: 'Thánh Quang Hộ Thể',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 35,
    def: 75,
    skillName: 'Thánh Quang Phục Sinh',
    skillDesc: 'Tỏa hào quang thánh hồi +80 HP & gia tăng +1 Năng lượng.',
    energyCost: 2,
    color: 'from-sky-600 via-blue-700 to-slate-950',
    avatarUrl: getCardImageSvg('c27')
  },
  {
    id: 'c28',
    name: 'Nhiệt Diệm Hồn',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 140,
    def: 30,
    skillName: 'Hỏa Thiêu Vô Tận',
    skillDesc: 'Kích hoạt bão lửa thiêu đốt giáng 140 Sát thương bộc phá.',
    energyCost: 3,
    color: 'from-orange-700 via-red-800 to-amber-950',
    avatarUrl: getCardImageSvg('c28')
  },
  {
    id: 'c29',
    name: 'Địa Lô Cuồng Nộ',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 35,
    def: 110,
    skillName: 'Thành Trì Nham Thạch',
    skillDesc: 'Dựng thành trì nham thạch +90 Giáp & +25 HP.',
    energyCost: 2,
    color: 'from-lime-800 via-emerald-900 to-stone-950',
    avatarUrl: getCardImageSvg('c29')
  },
  {
    id: 'c30',
    name: 'Thần Dược Bất Tử',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 20,
    def: 80,
    skillName: 'Thần Dược Tái Sinh',
    skillDesc: 'Mở hũ thần dược tái sinh hồi +100 HP siêu bộc phá.',
    energyCost: 3,
    color: 'from-teal-700 via-cyan-800 to-slate-950',
    avatarUrl: getCardImageSvg('c30')
  },
  {
    id: 'c31',
    name: 'Ánh Sáng Vô Cực',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 100,
    def: 100,
    skillName: 'Thánh Quang Vô Tận',
    skillDesc: 'Gây 110 Sát thương & Hồi +50 HP đồng thời gia tăng +2 Năng lượng.',
    energyCost: 3,
    color: 'from-yellow-500 via-amber-600 to-fuchsia-950',
    avatarUrl: getCardImageSvg('c31')
  },
  {
    id: 'c32',
    name: 'Bão Tuyết Băng Giá',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 135,
    def: 45,
    skillName: 'Băng Trảm Bão Phong',
    skillDesc: 'Phóng luồng băng bão tuyết giáng 135 Sát thương & làm chậm đối thủ.',
    energyCost: 3,
    color: 'from-blue-600 via-cyan-700 to-indigo-950',
    avatarUrl: getCardImageSvg('c32')
  },
  {
    id: 'c33',
    name: 'Khiên Thái Cực',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 30,
    def: 120,
    skillName: 'Thái Cực Phản Chuyển',
    skillDesc: 'Dựng trận đồ thái cực nhận +100 Giáp & phản lại 40 Sát thương.',
    energyCost: 2,
    color: 'from-slate-700 via-indigo-900 to-black',
    avatarUrl: getCardImageSvg('c33')
  },
  {
    id: 'c34',
    name: 'Đao Phủ Địa Ngục',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 160,
    def: 30,
    skillName: 'Trảm Liêm Địa Ngục',
    skillDesc: 'Chém lưỡi liêm địa ngục cực đại giáng 160 Sát thương xuyên giáp.',
    energyCost: 3,
    color: 'from-red-800 via-rose-950 to-black',
    avatarUrl: getCardImageSvg('c34')
  },
  {
    id: 'c35',
    name: 'Thầy Pháp Công Nghệ',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 50,
    def: 60,
    skillName: 'Thuật Lập Trình',
    skillDesc: 'Rút ngay 1 thẻ hỗ trợ mới & tăng +1 Năng lượng tức thì.',
    energyCost: 2,
    color: 'from-purple-700 via-fuchsia-800 to-slate-950',
    avatarUrl: getCardImageSvg('c35')
  },
  {
    id: 'c36',
    name: 'Tường Đá Bất Hoại',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 20,
    def: 115,
    skillName: 'Thành Trì Cổ Đại',
    skillDesc: 'Củng cố hàng phòng thủ kiên cố tăng ngay +110 Giáp bảo vệ.',
    energyCost: 2,
    color: 'from-amber-800 via-stone-900 to-black',
    avatarUrl: getCardImageSvg('c36')
  },
  {
    id: 'c37',
    name: 'Lửa Thiêng Diệt Quỷ',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 110,
    def: 40,
    skillName: 'Hỏa Diệm Phạt',
    skillDesc: 'Giáng ngọn lửa thiêng trừng phạt gây 110 Sát thương thiêu đốt.',
    energyCost: 2,
    color: 'from-orange-600 via-red-700 to-yellow-950',
    avatarUrl: getCardImageSvg('c37')
  },
  {
    id: 'c38',
    name: 'Vũ Điệu Cuồng Phong',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 125,
    def: 50,
    skillName: 'Đấm Liên Hoàn Cuồng Phong',
    skillDesc: 'Tấn công liên hoàn 2 nhịp giáng tổng cộng 125 Sát thương.',
    energyCost: 2,
    color: 'from-emerald-600 via-teal-800 to-slate-950',
    avatarUrl: getCardImageSvg('c38')
  },
  {
    id: 'c39',
    name: 'Gương Phản Chiếu',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 60,
    def: 80,
    skillName: 'Gương Thái Cực Hoán Đổi',
    skillDesc: 'Sao chép giáp của đối thủ đồng thời gây 80 Sát thương.',
    energyCost: 3,
    color: 'from-violet-700 via-purple-900 to-black',
    avatarUrl: getCardImageSvg('c39')
  },
  {
    id: 'c40',
    name: 'Rồng Lửa Bão Tố',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 165,
    def: 35,
    skillName: 'Long Diệt Thiên Hạ',
    skillDesc: 'Triệu hồi long thần bộc phát 165 Sát thương diệt vong.',
    energyCost: 3,
    color: 'from-red-700 via-amber-600 to-rose-950',
    avatarUrl: getCardImageSvg('c40')
  },
  {
    id: 'c41',
    name: 'Giáp Kim Cương',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 40,
    def: 150,
    skillName: 'Bất Hoại Kim Cương',
    skillDesc: 'Cường hóa kim cương tuyệt đối tăng +130 Giáp & Hồi +30 HP.',
    energyCost: 3,
    color: 'from-cyan-500 via-blue-800 to-slate-950',
    avatarUrl: getCardImageSvg('c41')
  },
  {
    id: 'c42',
    name: 'Thánh Cầu Hồi Sinh',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 30,
    def: 90,
    skillName: 'Thánh Quang Đại Phục Sinh',
    skillDesc: 'Hồi ngay +120 HP cực đại & xóa sạch hiệu ứng bất lợi.',
    energyCost: 3,
    color: 'from-emerald-500 via-green-700 to-teal-950',
    avatarUrl: getCardImageSvg('c42')
  },
  {
    id: 'c43',
    name: 'Cú Đấm Sấm Sét',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 75,
    def: 35,
    skillName: 'Đấm Chớp Nhoáng',
    skillDesc: 'Cú đấm chớp nhoáng giáng 75 Sát thương cơ bản.',
    energyCost: 1,
    color: 'from-yellow-600 via-amber-700 to-black',
    avatarUrl: getCardImageSvg('c43')
  },
  {
    id: 'c44',
    name: 'Vạn Lý Trường Thành',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 25,
    def: 75,
    skillName: 'Dựng Khiên Đá',
    skillDesc: 'Dựng khiên đá kiên cố tăng +60 Giáp phòng thủ.',
    energyCost: 1,
    color: 'from-stone-600 via-zinc-800 to-black',
    avatarUrl: getCardImageSvg('c44')
  },
  {
    id: 'c45',
    name: 'Chú Thuật Tăng Lực',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 30,
    def: 40,
    skillName: 'Nạp Tốc Năng Lượng',
    skillDesc: 'Nạp ngay +2 Năng lượng thần tốc.',
    energyCost: 1,
    color: 'from-teal-600 via-emerald-800 to-black',
    avatarUrl: getCardImageSvg('c45')
  },
  {
    id: 'c46',
    name: 'Ma Tộc Bóng Đêm',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 105,
    def: 45,
    skillName: 'Hút Máu Âm Hồn',
    skillDesc: 'Gây 105 Sát thương & Hút +35 HP từ đối thủ.',
    energyCost: 2,
    color: 'from-fuchsia-800 via-purple-950 to-black',
    avatarUrl: getCardImageSvg('c46')
  },
  {
    id: 'c47',
    name: 'Tấm Chắn Vũ Tiên',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 35,
    def: 130,
    skillName: 'Khiên Vũ Tiên Chặn Đứng',
    skillDesc: 'Nhận ngay +100 Giáp & hồi +30 HP kiên cố.',
    energyCost: 2,
    color: 'from-indigo-600 via-sky-800 to-black',
    avatarUrl: getCardImageSvg('c47')
  },
  {
    id: 'c48',
    name: 'Sấm Truyền Thượng Cổ',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 150,
    def: 40,
    skillName: 'Sấm Giội Thần Tốc',
    skillDesc: 'Oanh kích sấm sét bộc phá 150 Sát thương phá vỡ phòng thủ.',
    energyCost: 3,
    color: 'from-amber-500 via-yellow-600 to-red-950',
    avatarUrl: getCardImageSvg('c48')
  },
  {
    id: 'c49',
    name: 'Mưa Sao Băng',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 140,
    def: 60,
    skillName: 'Tinh Hà Bão Tố',
    skillDesc: 'Trút mưa sao băng giáng 140 Sát thương & hồi +40 HP.',
    energyCost: 3,
    color: 'from-purple-600 via-pink-600 to-indigo-950',
    avatarUrl: getCardImageSvg('c49')
  },
  {
    id: 'c50',
    name: 'Linh Hồn Bảo Hộ',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 45,
    def: 85,
    skillName: 'Linh Hồn Hỗ Trợ',
    skillDesc: 'Tạo +80 Giáp & hồi +50 HP kiên định.',
    energyCost: 2,
    color: 'from-teal-600 via-cyan-800 to-black',
    avatarUrl: getCardImageSvg('c50')
  },
  {
    id: 'c51',
    name: 'Long Thần Bạo Vũ',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 170,
    def: 40,
    skillName: 'Mưa Lửa Long Thần',
    skillDesc: 'Xối xả bão lửa giáng 170 Sát thương thiêu đốt cực đại.',
    energyCost: 3,
    color: 'from-amber-500 via-red-600 to-rose-950',
    avatarUrl: getCardImageSvg('c51')
  },
  {
    id: 'c52',
    name: 'Khiên Thái Cực Cương',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 45,
    def: 160,
    skillName: 'Thái Cực Bất Hoại',
    skillDesc: 'Dựng tường thái cực +140 Giáp kiên cố & hồi +40 HP.',
    energyCost: 3,
    color: 'from-cyan-600 via-blue-800 to-slate-950',
    avatarUrl: getCardImageSvg('c52')
  },
  {
    id: 'c53',
    name: 'Ma Trận Hồi Sinh',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 30,
    def: 95,
    skillName: 'Vô Cực Tái Sinh',
    skillDesc: 'Hồi ngay +120 HP cực đại & tăng +2 Năng Lượng.',
    energyCost: 3,
    color: 'from-emerald-500 via-teal-700 to-black',
    avatarUrl: getCardImageSvg('c53')
  },
  {
    id: 'c54',
    name: 'Thiên Thần Diệt Thế',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 130,
    def: 110,
    skillName: 'Diệt Thế Phạt',
    skillDesc: 'Xả 140 Sát thương, hồi +60 HP & tạo +60 Giáp bảo hộ.',
    energyCost: 3,
    color: 'from-fuchsia-600 via-purple-700 to-yellow-500',
    avatarUrl: getCardImageSvg('c54')
  },
  {
    id: 'c55',
    name: 'Hoạt Họa Bộc Phá',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 140,
    def: 45,
    skillName: 'Cú Đấm Hạt Nhân',
    skillDesc: 'Tấn công dồn nén giáng 140 Sát thương bộc phát.',
    energyCost: 3,
    color: 'from-red-600 via-orange-700 to-black',
    avatarUrl: getCardImageSvg('c55')
  },
  {
    id: 'c56',
    name: 'Tường Băng Vô Cực',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 35,
    def: 135,
    skillName: 'Băng Giáp Bảo Hộ',
    skillDesc: 'Nhận +110 Giáp băng giá & hồi +30 HP.',
    energyCost: 2,
    color: 'from-sky-600 via-blue-700 to-slate-950',
    avatarUrl: getCardImageSvg('c56')
  },
  {
    id: 'c57',
    name: 'Thuật Sĩ Thời Không',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 50,
    def: 75,
    skillName: 'Đảo Ngược Dòng Thời Gian',
    skillDesc: 'Hồi +80 HP & gia tăng +1 Năng Lượng thần tốc.',
    energyCost: 2,
    color: 'from-purple-600 via-indigo-700 to-slate-950',
    avatarUrl: getCardImageSvg('c57')
  },
  {
    id: 'c58',
    name: 'Bão Vũ Sao Băng',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 100,
    def: 90,
    skillName: 'Bão Tố Tinh Hà',
    skillDesc: 'Oanh kích sao băng gây 100 Sát thương & hồi +40 HP.',
    energyCost: 2,
    color: 'from-yellow-500 via-amber-600 to-purple-900',
    avatarUrl: getCardImageSvg('c58')
  },
  {
    id: 'c59',
    name: 'Đao Phủ Ma Thần',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 135,
    def: 40,
    skillName: 'Trảm Liêm Ma Vương',
    skillDesc: 'Lưỡi liêm ma sát gây 135 Sát thương & phá 30% Giáp đối thủ.',
    energyCost: 3,
    color: 'from-rose-700 via-red-900 to-black',
    avatarUrl: getCardImageSvg('c59')
  },
  {
    id: 'c60',
    name: 'Giáp Thạch Anh',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 30,
    def: 130,
    skillName: 'Kiên Cố Thạch Anh',
    skillDesc: 'Kích hoạt giáp thạch anh tăng +105 Giáp bảo vệ.',
    energyCost: 2,
    color: 'from-emerald-700 via-teal-800 to-slate-950',
    avatarUrl: getCardImageSvg('c60')
  },
  {
    id: 'c61',
    name: 'Huyết Tế Ma Trận',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 55,
    def: 65,
    skillName: 'Hút Hồn Tế Điện',
    skillDesc: 'Hồi +70 HP & trừ 1 Năng Lượng của đối thủ.',
    energyCost: 2,
    color: 'from-red-800 via-fuchsia-900 to-black',
    avatarUrl: getCardImageSvg('c61')
  },
  {
    id: 'c62',
    name: 'Hào Quang Hoàng Kim',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 95,
    def: 95,
    skillName: 'Thánh Quang Bộc Phá',
    skillDesc: 'Gây 95 Sát thương & gia tăng +50 Giáp hộ thể.',
    energyCost: 2,
    color: 'from-amber-400 via-yellow-500 to-stone-900',
    avatarUrl: getCardImageSvg('c62')
  },
  {
    id: 'c63',
    name: 'Cú Đấm Hạt Nhân',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 115,
    def: 45,
    skillName: 'Nổ Tung Hạt Nhân',
    skillDesc: 'Đấm bộc phá giáng 115 Sát thương thiêu đốt.',
    energyCost: 2,
    color: 'from-amber-600 via-orange-700 to-black',
    avatarUrl: getCardImageSvg('c63')
  },
  {
    id: 'c64',
    name: 'Tấm Chắn Vô Hình',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 25,
    def: 110,
    skillName: 'Trận Đồ Vô Hình',
    skillDesc: 'Tạo +90 Giáp bảo vệ & hồi +20 HP.',
    energyCost: 2,
    color: 'from-blue-600 via-cyan-700 to-slate-950',
    avatarUrl: getCardImageSvg('c64')
  },
  {
    id: 'c65',
    name: 'Linh Dược Hồi Sinh',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 40,
    def: 60,
    skillName: 'Uống Thần Dược',
    skillDesc: 'Hồi +60 HP & nhận +30 Giáp kiên cố.',
    energyCost: 2,
    color: 'from-green-600 via-emerald-700 to-black',
    avatarUrl: getCardImageSvg('c65')
  },
  {
    id: 'c66',
    name: 'Tia Sét Cực Hạn',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 85,
    def: 75,
    skillName: 'Sấm Phạt Ngân Hà',
    skillDesc: 'Gây 85 Sát thương & hồi +30 HP tức thì.',
    energyCost: 2,
    color: 'from-yellow-500 via-amber-600 to-cyan-950',
    avatarUrl: getCardImageSvg('c66')
  },
  {
    id: 'c67',
    name: 'Kiếm Thánh Trảm Hồn',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 110,
    def: 40,
    skillName: 'Trảm Hồn Nhất Kiếm',
    skillDesc: 'Vung thánh kiếm giáng 110 Sát thương sắc lẹm.',
    energyCost: 2,
    color: 'from-rose-600 via-red-700 to-slate-950',
    avatarUrl: getCardImageSvg('c67')
  },
  {
    id: 'c68',
    name: 'Pháo Đài Thép',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 30,
    def: 115,
    skillName: 'Dựng Pháo Đài',
    skillDesc: 'Củng cố hàng phòng thủ tăng +95 Giáp.',
    energyCost: 2,
    color: 'from-slate-700 via-zinc-800 to-black',
    avatarUrl: getCardImageSvg('c68')
  },
  {
    id: 'c69',
    name: 'Bùa Hộ Mệnh',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 35,
    def: 65,
    skillName: 'Bùa Chú Bảo Vệ',
    skillDesc: 'Hồi +55 HP & nạp +1 Năng Lượng.',
    energyCost: 2,
    color: 'from-indigo-600 via-purple-700 to-black',
    avatarUrl: getCardImageSvg('c69')
  },
  {
    id: 'c70',
    name: 'Bão Tuyết Âm Hồn',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 80,
    def: 80,
    skillName: 'Băng Trảm Bão Phong',
    skillDesc: 'Gây 80 Sát thương & nhận +40 Giáp bảo hộ.',
    energyCost: 2,
    color: 'from-blue-500 via-sky-600 to-indigo-950',
    avatarUrl: getCardImageSvg('c70')
  },
  {
    id: 'c71',
    name: 'Cuồng Sấm Bão Tố',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 80,
    def: 35,
    skillName: 'Sấm Phạt Cơ Bản',
    skillDesc: 'Oanh kích sấm giáng 80 Sát thương cơ bản.',
    energyCost: 1,
    color: 'from-yellow-600 via-amber-700 to-black',
    avatarUrl: getCardImageSvg('c71')
  },
  {
    id: 'c72',
    name: 'Khiên Đá Cổ Đại',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 20,
    def: 80,
    skillName: 'Dựng Khiên Đá',
    skillDesc: 'Dựng tường đá kiên cố nhận +65 Giáp.',
    energyCost: 1,
    color: 'from-stone-600 via-zinc-700 to-black',
    avatarUrl: getCardImageSvg('c72')
  },
  {
    id: 'c73',
    name: 'Trà Đạo Hồi Phục',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 25,
    def: 50,
    skillName: 'Uống Trà Hồi Sinh',
    skillDesc: 'Hồi +40 HP thần tốc.',
    energyCost: 1,
    color: 'from-emerald-600 via-green-700 to-black',
    avatarUrl: getCardImageSvg('c73')
  },
  {
    id: 'c74',
    name: 'Đấm Chớp Nhoáng',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 85,
    def: 30,
    skillName: 'Quyền Tốc Độ',
    skillDesc: 'Giáng cú đấm thần tốc 85 Sát thương.',
    energyCost: 1,
    color: 'from-orange-600 via-red-700 to-black',
    avatarUrl: getCardImageSvg('c74')
  },
  {
    id: 'c75',
    name: 'Giáp Gỗ Thượng Cổ',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 15,
    def: 85,
    skillName: 'Giáp Gỗ Kiên Cố',
    skillDesc: 'Nhận +70 Giáp bảo hộ.',
    energyCost: 1,
    color: 'from-amber-800 via-stone-900 to-black',
    avatarUrl: getCardImageSvg('c75')
  },
  {
    id: 'c76',
    name: 'Thuốc Tăng Lực',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 30,
    def: 40,
    skillName: 'Nạp Năng Lượng',
    skillDesc: 'Gia tăng +2 Năng Lượng tức thì.',
    energyCost: 1,
    color: 'from-cyan-600 via-teal-700 to-black',
    avatarUrl: getCardImageSvg('c76')
  },
  {
    id: 'c77',
    name: 'Hỏa Long Cuồng Nộ',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 165,
    def: 35,
    skillName: 'Long Phún Hỏa Bão',
    skillDesc: 'Phun lửa ma thuật giáng 165 Sát thương cực lớn.',
    energyCost: 3,
    color: 'from-red-600 via-amber-600 to-rose-950',
    avatarUrl: getCardImageSvg('c77')
  },
  {
    id: 'c78',
    name: 'Vĩnh Cửu Kim Cang',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 40,
    def: 155,
    skillName: 'Kim Cang Bất Hoại',
    skillDesc: 'Kích hoạt giáp bất tử +135 Giáp & +35 HP.',
    energyCost: 3,
    color: 'from-blue-600 via-indigo-800 to-black',
    avatarUrl: getCardImageSvg('c78')
  },
  {
    id: 'c79',
    name: 'Thánh Nhẫn Phục Sinh',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 25,
    def: 90,
    skillName: 'Thánh Quang Tái Sinh',
    skillDesc: 'Hồi ngay +115 HP & nạp +2 Năng Lượng.',
    energyCost: 3,
    color: 'from-emerald-500 via-teal-700 to-black',
    avatarUrl: getCardImageSvg('c79')
  },
  {
    id: 'c80',
    name: 'Thần Thoại Khai Thiên',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 135,
    def: 105,
    skillName: 'Khai Thiên Lực',
    skillDesc: 'Oanh kích 135 Sát thương, hồi +50 HP & +50 Giáp.',
    energyCost: 3,
    color: 'from-yellow-400 via-amber-500 to-fuchsia-950',
    avatarUrl: getCardImageSvg('c80')
  },
  {
    id: 'c81',
    name: 'Huyết Sát Kiếm',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 138,
    def: 38,
    skillName: 'Huyết Trảm Bộc Phá',
    skillDesc: 'Hút 35 HP & giáng 138 Sát thương sắc lẹm.',
    energyCost: 3,
    color: 'from-red-800 via-rose-900 to-black',
    avatarUrl: getCardImageSvg('c81')
  },
  {
    id: 'c82',
    name: 'Bức Tường Pha Lê',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 30,
    def: 128,
    skillName: 'Khiên Pha Lê Phản Xạ',
    skillDesc: 'Dựng tường pha lê +105 Giáp & phản 35 Sát thương.',
    energyCost: 2,
    color: 'from-purple-600 via-indigo-700 to-black',
    avatarUrl: getCardImageSvg('c82')
  },
  {
    id: 'c83',
    name: 'Ảo Ảnh Tráo Đổi',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 48,
    def: 72,
    skillName: 'Thuật Hoán Đổi',
    skillDesc: 'Tráo đổi vai trò, hồi +75 HP & +35 Giáp.',
    energyCost: 2,
    color: 'from-fuchsia-700 via-purple-800 to-slate-950',
    avatarUrl: getCardImageSvg('c83')
  },
  {
    id: 'c84',
    name: 'Vũ Điệu Bộc Phá',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 105,
    def: 85,
    skillName: 'Vũ Điệu Lửa',
    skillDesc: 'Tấn công 105 Sát thương & tăng +45 Giáp kiên cố.',
    energyCost: 2,
    color: 'from-orange-500 via-red-600 to-black',
    avatarUrl: getCardImageSvg('c84')
  },
  {
    id: 'c85',
    name: 'Cuồng Pháo Bão Tố',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 112,
    def: 42,
    skillName: 'Bắn Pháo Liên Hoàn',
    skillDesc: 'Bắn 2 đợt pháo gây tổng cộng 112 Sát thương.',
    energyCost: 2,
    color: 'from-amber-600 via-red-700 to-black',
    avatarUrl: getCardImageSvg('c85')
  },
  {
    id: 'c86',
    name: 'Giáp Nham Thạch',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 28,
    def: 112,
    skillName: 'Nham Thạch Hộ Thể',
    skillDesc: 'Tạo +92 Giáp bảo vệ & hồi +22 HP.',
    energyCost: 2,
    color: 'from-amber-800 via-stone-900 to-black',
    avatarUrl: getCardImageSvg('c86')
  },
  {
    id: 'c87',
    name: 'Chú Thuật Tăng Tốc',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 38,
    def: 62,
    skillName: 'Tăng Tốc Chiến Đấu',
    skillDesc: 'Hồi +58 HP & tăng +1 Năng Lượng.',
    energyCost: 2,
    color: 'from-emerald-600 via-teal-700 to-black',
    avatarUrl: getCardImageSvg('c87')
  },
  {
    id: 'c88',
    name: 'Sấm Giội Hoàng Kim',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'B',
    rarityName: 'Hiếm',
    atk: 88,
    def: 78,
    skillName: 'Oanh Kích Hoàng Kim',
    skillDesc: 'Gây 88 Sát thương & nhận +35 Giáp.',
    energyCost: 2,
    color: 'from-yellow-500 via-amber-600 to-black',
    avatarUrl: getCardImageSvg('c88')
  },
  {
    id: 'c89',
    name: 'Quyền Vương Lôi Điện',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 82,
    def: 32,
    skillName: 'Đấm Lôi Điện',
    skillDesc: 'Cú đấm tích điện giáng 82 Sát thương.',
    energyCost: 1,
    color: 'from-yellow-600 via-amber-700 to-black',
    avatarUrl: getCardImageSvg('c89')
  },
  {
    id: 'c90',
    name: 'Khiên Cắt Sóng',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 22,
    def: 82,
    skillName: 'Dựng Khiên Sóng',
    skillDesc: 'Nhận +68 Giáp phòng thủ.',
    energyCost: 1,
    color: 'from-blue-600 via-cyan-700 to-black',
    avatarUrl: getCardImageSvg('c90')
  },
  {
    id: 'c91',
    name: 'Bình Máu Tốc Hành',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'C',
    rarityName: 'Thường',
    atk: 28,
    def: 48,
    skillName: 'Uống Bình Máu',
    skillDesc: 'Hồi +45 HP thần tốc.',
    energyCost: 1,
    color: 'from-red-600 via-rose-700 to-black',
    avatarUrl: getCardImageSvg('c91')
  },
  {
    id: 'c92',
    name: 'Lưỡi Liêm Địa Ngục',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 168,
    def: 32,
    skillName: 'Chém Địa Ngục',
    skillDesc: 'Vung liêm địa ngục cực đại gây 168 Sát thương.',
    energyCost: 3,
    color: 'from-red-800 via-rose-950 to-black',
    avatarUrl: getCardImageSvg('c92')
  },
  {
    id: 'c93',
    name: 'Giáp Thiên Thần',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 42,
    def: 152,
    skillName: 'Cánh Thần Bất Tử',
    skillDesc: 'Kích hoạt cánh thần nhận +130 Giáp & +32 HP.',
    energyCost: 3,
    color: 'from-cyan-500 via-blue-700 to-slate-950',
    avatarUrl: getCardImageSvg('c93')
  },
  {
    id: 'c94',
    name: 'Thần Dược Đại Phục Sinh',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 28,
    def: 88,
    skillName: 'Đại Phục Sinh',
    skillDesc: 'Hồi +125 HP cực đại & xóa sạch hiệu ứng bất lợi.',
    energyCost: 3,
    color: 'from-emerald-500 via-green-700 to-black',
    avatarUrl: getCardImageSvg('c94')
  },
  {
    id: 'c95',
    name: 'Bão Tố Ngân Hà',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 142,
    def: 98,
    skillName: 'Bão Tố Vũ Trụ',
    skillDesc: 'Trút mưa ngân hà giáng 142 Sát thương & hồi +45 HP.',
    energyCost: 3,
    color: 'from-purple-600 via-pink-600 to-indigo-950',
    avatarUrl: getCardImageSvg('c95')
  },
  {
    id: 'c96',
    name: 'Trảm Thần Kiếm',
    role: 'ATTACK',
    roleName: 'Tấn Công',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 136,
    def: 36,
    skillName: 'Thánh Kiếm Trảm',
    skillDesc: 'Giáng thánh kiếm gây 136 Sát thương.',
    energyCost: 3,
    color: 'from-rose-700 via-red-800 to-black',
    avatarUrl: getCardImageSvg('c96')
  },
  {
    id: 'c97',
    name: 'Vạn Lý Bất Hoại',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 32,
    def: 126,
    skillName: 'Thành Trì Vạn Lý',
    skillDesc: 'Củng cố thành trì tăng ngay +102 Giáp.',
    energyCost: 2,
    color: 'from-stone-700 via-zinc-800 to-black',
    avatarUrl: getCardImageSvg('c97')
  },
  {
    id: 'c98',
    name: 'Phù Thủy Thời Gian',
    role: 'SUPPORT',
    roleName: 'Chức Năng',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 46,
    def: 76,
    skillName: 'Phù Phép Thời Gian',
    skillDesc: 'Hồi +72 HP & nhận +32 Giáp.',
    energyCost: 2,
    color: 'from-purple-700 via-fuchsia-800 to-black',
    avatarUrl: getCardImageSvg('c98')
  },
  {
    id: 'c99',
    name: 'Thiên Biến Vạn Hóa',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'A',
    rarityName: 'Sử Thi',
    atk: 102,
    def: 88,
    skillName: 'Ảo Mảnh Vô Cực',
    skillDesc: 'Gây 102 Sát thương & tráo đổi chỉ số.',
    energyCost: 2,
    color: 'from-violet-700 via-purple-900 to-black',
    avatarUrl: getCardImageSvg('c99')
  },
  {
    id: 'c100',
    name: 'Vô Cực Thánh Phạt',
    role: 'SPECIAL',
    roleName: 'Đặc Biệt',
    rarity: 'S',
    rarityName: 'Huyền Thoại',
    atk: 150,
    def: 100,
    skillName: 'Thánh Phạt Vô Cực',
    skillDesc: 'Bộc phá 150 Sát thương thần thánh, hồi +60 HP & +60 Giáp.',
    energyCost: 3,
    color: 'from-yellow-400 via-amber-500 to-rose-950',
    avatarUrl: getCardImageSvg('c100')
  }
];

// 50 BALANCED CARDS ARENA DECK FOR MATCH PLAY
export const CARD_DECK: CardItem[] = FULL_CARD_POOL.slice(0, 50);

export const drawRandomCard = (): CardItem => {
  const card = CARD_DECK[Math.floor(Math.random() * CARD_DECK.length)];
  return { 
    ...card, 
    instanceId: `${card.id}_${Math.random().toString(36).substring(2, 8)}`,
    used: false
  };
};

// STAT POWER BALANCE CALCULATOR
export const calculateCardPower = (card: CardItem): number => {
  const base = card.atk + card.def + (card.energyCost * 15);
  const rarityBonus = card.rarity === 'S' ? 35 : card.rarity === 'A' ? 22 : card.rarity === 'B' ? 12 : 5;
  return base + rarityBonus;
};

export const calculateHandPower = (hand: CardItem[]): number => {
  return hand.reduce((acc, c) => acc + calculateCardPower(c), 0);
};

// BALANCED STAT ALGORITHM: Generates a 5-card hand whose total power score is balanced (~480 to 520 points)
export const generateRandomHand = (count = 5): CardItem[] => {
  let bestHand: CardItem[] = [];
  let minDiff = Infinity;
  const TARGET_POWER = 500; // Standardized target power score for a fair 5-card deck

  for (let attempt = 0; attempt < 25; attempt++) {
    const attackCards = CARD_DECK.filter((c) => c.role === 'ATTACK');
    const defenseCards = CARD_DECK.filter((c) => c.role === 'DEFENSE');
    const supportCards = CARD_DECK.filter((c) => c.role === 'SUPPORT' || c.role === 'SPECIAL');
    const highRarityCards = CARD_DECK.filter((c) => c.rarity === 'S' || c.rarity === 'A');

    const pickedAttack = attackCards[Math.floor(Math.random() * attackCards.length)];
    const pickedDefense = defenseCards[Math.floor(Math.random() * defenseCards.length)];
    const pickedSupport = supportCards[Math.floor(Math.random() * supportCards.length)];
    const pickedHigh = highRarityCards[Math.floor(Math.random() * highRarityCards.length)];

    const usedIds = new Set([pickedAttack.id, pickedDefense.id, pickedSupport.id, pickedHigh.id]);
    const remaining = CARD_DECK.filter((c) => !usedIds.has(c.id));
    const pickedWild = remaining[Math.floor(Math.random() * remaining.length)] || CARD_DECK[0];

    const candidate = [pickedAttack, pickedDefense, pickedSupport, pickedHigh, pickedWild];
    const handPower = calculateHandPower(candidate);
    const diff = Math.abs(handPower - TARGET_POWER);

    if (diff < minDiff) {
      minDiff = diff;
      bestHand = candidate;
      if (diff <= 15) break; // Perfect balance reached!
    }
  }

  const shuffled = bestHand.sort(() => 0.5 - Math.random());
  return shuffled.map((card) => ({
    ...card,
    instanceId: `${card.id}_${Math.random().toString(36).substring(2, 8)}`,
    used: false
  }));
};

export const getRoleAdvantage = (attackerRoleRaw: string, defenderRoleRaw: string) => {
  const normalizeRole = (r: string) => (r === 'SPECIAL' ? 'SUPPORT' : r);
  const att = normalizeRole(attackerRoleRaw || 'ATTACK');
  const def = normalizeRole(defenderRoleRaw || 'ATTACK');

  // Rock-Paper-Scissors: Attack > Support > Defense > Attack
  if (att === 'ATTACK' && def === 'SUPPORT') {
    return {
      dmgMult: 1.5,
      bonusShield: 0,
      bonusHeal: 0,
      isWin: true,
      log: '⚡ [KHẮC CHẾ VAI TRÒ]: Tấn Công áp đảo Chức Năng! (x1.5 Sát Thương - 150% Công lực)'
    };
  }
  if (att === 'SUPPORT' && def === 'DEFENSE') {
    return {
      dmgMult: 1.5,
      bonusShield: 0,
      bonusHeal: 25,
      isWin: true,
      log: '✨ [KHẮC CHẾ VAI TRÒ]: Chức Năng xuyên thủng Phòng Thủ! (x1.5 Sát Thương & Hồi +25 HP)'
    };
  }
  if (att === 'DEFENSE' && def === 'ATTACK') {
    return {
      dmgMult: 1.5,
      bonusShield: 30,
      bonusHeal: 0,
      isWin: true,
      log: '🛡️ [KHẮC CHẾ VAI TRÒ]: Phòng Thủ phản pháo Tấn Công! (x1.5 Sát Thương & Tăng +30 Giáp)'
    };
  }

  // Disadvantage matchup cases (0.7x damage)
  if (att === 'SUPPORT' && def === 'ATTACK') {
    return {
      dmgMult: 0.7,
      bonusShield: 0,
      bonusHeal: 0,
      isWin: false,
      log: '⚠️ [BỊ KHẮC CHẾ]: Chức Năng thất thế trước Tấn Công! (Giảm 30% Sát thương)'
    };
  }
  if (att === 'DEFENSE' && def === 'SUPPORT') {
    return {
      dmgMult: 0.7,
      bonusShield: 0,
      bonusHeal: 0,
      isWin: false,
      log: '⚠️ [BỊ KHẮC CHẾ]: Phòng Thủ bị Chức Năng vô hiệu hóa! (Giảm 30% Sát thương)'
    };
  }
  if (att === 'ATTACK' && def === 'DEFENSE') {
    return {
      dmgMult: 0.7,
      bonusShield: 0,
      bonusHeal: 0,
      isWin: false,
      log: '⚠️ [BỊ KHẮC CHẾ]: Tấn Công bị Giáp Phòng Thủ chặn đứng! (Giảm 30% Sát thương)'
    };
  }

  return {
    dmgMult: 1.0,
    bonusShield: 0,
    bonusHeal: 0,
    isWin: false,
    log: ''
  };
};

// DYNAMIC SKILL ENGINE FOR ALL 100 CARDS WITH ACCURATE ENERGY RECOVERY & EFFECTS
export const applyCardSkillEffect = (card: CardItem, me: any, opp: any, roleAdv: any) => {
  const desc = card.skillDesc || '';
  let logMsg = '';
  let hpDamage = 0;
  let newShield = opp?.shield || 0;
  let selfHeal = 0;
  let selfShield = me?.shield || 0;
  let energyRestore = 0;

  // 1. Check Energy Restore (+1 or +2 NL)
  if (desc.includes('2 Năng') || desc.includes('+2 NL') || desc.includes('+2 Năng')) {
    energyRestore = 2;
  } else if (desc.includes('Năng') || desc.includes('NL') || card.id === 'c7' || card.id === 'c12' || card.id === 'c45' || card.id === 'c76') {
    energyRestore = 1;
  }

  // 2. Attack Skill Damage
  if (card.role === 'ATTACK' || desc.includes('Sát thương') || desc.includes('giáng') || desc.includes('chém') || desc.includes('bộc phá')) {
    let baseDmg = card.atk > 0 ? Math.floor(card.atk * 1.15) : 100;
    if (card.rarity === 'S') baseDmg += 30;
    const rawDmg = Math.floor(baseDmg * (roleAdv?.dmgMult || 1));
    
    if (newShield > 0) {
      if (newShield >= rawDmg) {
        newShield -= rawDmg;
        hpDamage = 0;
      } else {
        hpDamage = rawDmg - newShield;
        newShield = 0;
      }
    } else {
      hpDamage = rawDmg;
    }
    logMsg = `💥 [${me.name}] thi triển tuyệt kỹ [${card.skillName}]! Giáng ${rawDmg} Sát thương bộc phá lên [${opp.name}]!`;
  }

  // 3. Defense Shield Skill
  if (card.role === 'DEFENSE' || desc.includes('Giáp')) {
    const shieldGain = card.def > 0 ? Math.floor(card.def * 0.95) : 80;
    selfShield += shieldGain;
    if (!logMsg) {
      logMsg = `🛡️ [${me.name}] kích hoạt [${card.skillName}]! Tăng ngay +${shieldGain} Giáp kiên cố!`;
    } else {
      logMsg += ` (Tăng +${shieldGain} Giáp)`;
    }
  }

  // 4. Healing Skill
  if (desc.includes('HP') || desc.includes('Hồi') || card.role === 'SUPPORT') {
    if (desc.includes('120 HP') || desc.includes('125 HP') || desc.includes('100 HP')) {
      selfHeal = 110;
    } else if (desc.includes('80 HP') || desc.includes('70 HP')) {
      selfHeal = 75;
    } else {
      selfHeal = 45;
    }
    if (!logMsg) {
      logMsg = `✨ [${me.name}] thi triển thần dược [${card.skillName}]! Hồi phục +${selfHeal} HP!`;
    } else {
      logMsg += ` (Hồi +${selfHeal} HP)`;
    }
  }

  // Add Energy Restore Log
  if (energyRestore > 0) {
    logMsg += ` [⚡ Hồi +${energyRestore} Năng Lượng!]`;
  }

  if (roleAdv?.log) {
    logMsg += ` ${roleAdv.log}`;
  }

  const finalOppHp = Math.max(0, (opp?.hp || 300) - hpDamage);
  const finalSelfHp = Math.min(300, (me?.hp || 300) + selfHeal);
  const currentEnergyAfterCost = Math.max(0, (me?.energy || 0) - card.energyCost);
  const finalEnergy = Math.min(5, currentEnergyAfterCost + energyRestore);

  return {
    logMsg,
    oppHp: finalOppHp,
    oppShield: newShield,
    selfHp: finalSelfHp,
    selfShield: selfShield,
    selfEnergy: finalEnergy,
    isOpponentDead: finalOppHp <= 0
  };
};

export default function WorldCardBattleModal({ uid, user, onClose, onShowResult }: WorldCardBattleModalProps) {
  const [roomId, setRoomId] = useState<string>('arena_1');
  const [roomInput, setRoomInput] = useState<string>('arena_1');
  const [roomData, setRoomData] = useState<any>(null);
  const [activeCardIdx, setActiveCardIdx] = useState<number>(0);
  const [isAttacking, setIsAttacking] = useState<boolean>(false);
  const [cardRevealed, setCardRevealed] = useState<boolean>(false);
  const [floatingEffects, setFloatingEffects] = useState<Array<{ id: string; text: string; emoji: string }>>([]);
  const [showCompendium, setShowCompendium] = useState<boolean>(false);
  const [compendiumFilter, setCompendiumFilter] = useState<'ALL' | 'ATTACK' | 'DEFENSE' | 'SUPPORT'>('ALL');
  const [turnSeconds, setTurnSeconds] = useState<number>(20);
  const [inspectedCard, setInspectedCard] = useState<CardItem | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchSeconds, setSearchSeconds] = useState<number>(60);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'attack' | 'skill' | 'heal' | 'stun' | 'victory') => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'attack') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'skill') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.35);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'heal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'victory') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.15);
        osc.frequency.setValueAtTime(783.99, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch (e) {
      console.warn('Web Audio error:', e);
    }
  };

  // Sync Room State from Firebase Realtime DB
  useEffect(() => {
    const roomRef = ref(db, `matches/${roomId}`);
    const unsub = onValue(roomRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setRoomData(val);
      } else {
        const initialRoom = {
          id: roomId,
          p1: null,
          p2: null,
          spectators: {},
          turn: 'p1',
          turnCount: 1,
          status: 'WAITING',
          combatLogs: ['⚔️ Đấu Trường Thẻ Thế Giới đã mở! Hãy tham gia bàn thi đấu.'],
          createdAt: Date.now()
        };
        set(roomRef, initialRoom);
        setRoomData(initialRoom);
      }
    });

    return () => unsub();
  }, [roomId]);

  // AI Bot Auto Response Hook
  useEffect(() => {
    if (!roomData || roomData.status !== 'PLAYING') return;

    if (roomData.turn === 'p2' && roomData.p2?.isBot) {
      const timer = setTimeout(() => {
        executeAiTurn();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [roomData?.turn, roomData?.status, roomData?.p2?.isBot]);

  // Victory Confetti Celebration Hook
  useEffect(() => {
    if (roomData?.status === 'FINISHED' && roomData?.winnerId) {
      playSound('victory');
      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#00f0ff', '#facc15', '#ef4444', '#a855f7', '#ffffff']
      });
      setTimeout(() => {
        confetti({ particleCount: 70, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 70, angle: 120, spread: 55, origin: { x: 1 } });
      }, 350);
    }
  }, [roomData?.status, roomData?.winnerId]);

  // 60-Second Solo Matchmaking Countdown Hook with Auto AI Fallback
  useEffect(() => {
    if (!isSearching) return;

    if (roomData?.status === 'PLAYING' && roomData?.p2) {
      setIsSearching(false);
      playSound('victory');
      return;
    }

    const interval = setInterval(() => {
      setSearchSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleJoinMatchWithAi();
          setIsSearching(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSearching, roomData?.status, roomData?.p2]);

  // --- REALTIME CHAT ROOM HOOK ---
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; timestamp: number }>>([]);
  const [chatInput, setChatInput] = useState<string>('');

  useEffect(() => {
    if (!roomId) return;
    const msgRef = ref(db, `matches/${roomId}/messages`);
    const unsub = onValue(msgRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list = Object.entries(val).map(([k, v]: [string, any]) => ({
          id: k,
          ...v
        }));
        list.sort((a, b) => a.timestamp - b.timestamp);
        setChatMessages(list);
      } else {
        setChatMessages([]);
      }
    });
    return () => unsub();
  }, [roomId]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !roomId) return;
    const msgRef = ref(db, `matches/${roomId}/messages`);
    await push(msgRef, {
      sender: user?.name || 'Võ Sĩ Đấu Trường',
      uid: uid || 'user_anon',
      text: chatInput.trim(),
      timestamp: Date.now()
    });
    setChatInput('');
  };

  // --- REALTIME BETTING POOL HOOK ---
  const [bettingPool, setBettingPool] = useState<{ totalPot: number; userContributions: Record<string, number> }>({
    totalPot: 0,
    userContributions: {}
  });

  useEffect(() => {
    if (!roomId) return;
    const potRef = ref(db, `matches/${roomId}/pot`);
    const unsub = onValue(potRef, (snap) => {
      if (snap.exists()) {
        setBettingPool(snap.val());
      } else {
        setBettingPool({ totalPot: 0, userContributions: {} });
      }
    });
    return () => unsub();
  }, [roomId]);

  const handlePlaceBet = async (amount: number) => {
    if (!roomId || amount <= 0) return;
    const potRef = ref(db, `matches/${roomId}/pot`);
    const currentPot = bettingPool.totalPot || 0;
    const currentContrib = bettingPool.userContributions?.[uid] || 0;

    await update(potRef, {
      totalPot: currentPot + amount,
      [`userContributions/${uid}`]: currentContrib + amount
    });

    // Log in combat logs
    const roomRef = ref(db, `matches/${roomId}`);
    const logMsg = `💰 [${user?.name || 'Khán giả'}] vừa đặt cược +${amount.toLocaleString('vi-VN')} Vàng vào Quỹ Trận Đấu! Tổng Quỹ: ${(currentPot + amount).toLocaleString('vi-VN')} Vàng!`;
    await update(roomRef, {
      combatLogs: [...(roomData?.combatLogs || []).slice(-15), logMsg]
    });
  };

  // --- REALTIME MATCH EVENTS HOOK (SPECIAL CARD ANIMATIONS FOR SPECTATORS & PLAYERS) ---
  const [activeSpecialEvent, setActiveSpecialEvent] = useState<{ id?: string; cardName: string; playerName: string; role: string } | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const eventsRef = ref(db, `matches/${roomId}/events`);
    const unsub = onValue(eventsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const eventsList = Object.entries(val).map(([k, v]: [string, any]) => ({ id: k, ...v }));
        eventsList.sort((a, b) => b.timestamp - a.timestamp);
        const latestEvent = eventsList[0];
        if (latestEvent && (Date.now() - latestEvent.timestamp < 3500)) {
          setActiveSpecialEvent(latestEvent);
          playSound('skill');
          setTimeout(() => {
            setActiveSpecialEvent(null);
          }, 2500);
        }
      }
    });
    return () => unsub();
  }, [roomId]);

  const triggerMatchEvent = async (cardName: string, role: string, playerName: string) => {
    if (!roomId) return;
    const eventsRef = ref(db, `matches/${roomId}/events`);
    await push(eventsRef, {
      cardName,
      role,
      playerName,
      timestamp: Date.now()
    });
  };

  // 20-Second Selection Timer Loop for PvP & AI Matches
  useEffect(() => {
    if (!roomData || roomData.status !== 'PLAYING') return;

    setTurnSeconds(20);

    const interval = setInterval(() => {
      setTurnSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isMyTurn && !isAttacking) {
            handleNormalAttack();
          } else if (roomData.turn === 'p2' && roomData.p2?.isBot) {
            executeAiTurn();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [roomData?.turn, roomData?.status, roomData?.turnCount]);

  const executeAiTurn = async () => {
    if (!roomData || roomData.turn !== 'p2' || !roomData.p2?.isBot || roomData.status !== 'PLAYING') return;

    const me = roomData.p2;
    const opp = roomData.p1;
    if (!me || !opp) return;

    const roomRef = ref(db, `matches/${roomId}`);

    // AI card selection among available unused cards in hand
    let aiHand = me.hand && me.hand.length > 0 ? me.hand : generateRandomHand(5);
    let unusedIndices = aiHand.map((c: any, i: number) => (!c.used ? i : -1)).filter((i: number) => i !== -1);
    
    // If all cards used, deal new hand for AI
    if (unusedIndices.length === 0) {
      aiHand = generateRandomHand(5);
      unusedIndices = [0, 1, 2, 3, 4];
    }

    const aiCardIdx = unusedIndices[Math.floor(Math.random() * unusedIndices.length)];
    const aiCard = aiHand[aiCardIdx] || CARD_DECK[0];

    // Mark AI card as used
    aiHand[aiCardIdx] = { ...aiCard, used: true };

    if (aiCard.role === 'SPECIAL' || aiCard.rarity === 'S') {
      triggerMatchEvent(aiCard.name, aiCard.role, me.name);
    }

    const oppHand = opp.hand && opp.hand.length > 0 ? opp.hand : CARD_DECK;
    const oppCard = oppHand[opp.activeCardIdx || 0] || CARD_DECK[0];

    const roleAdv = getRoleAdvantage(aiCard.role, oppCard.role);
    const canSkill = me.energy >= aiCard.energyCost;
    const useSkill = canSkill && Math.random() < 0.55;

    let logMsg = '';
    const updates: any = {
      'p2/hand': aiHand,
      'p2/activeCardIdx': aiCardIdx,
      turn: 'p1',
      turnCount: (roomData.turnCount || 1) + 1
    };

    if (useSkill) {
      playSound('skill');
      const skillRes = applyCardSkillEffect(aiCard, me, opp, roleAdv);
      logMsg = skillRes.logMsg;
      updates['p1/hp'] = skillRes.oppHp;
      updates['p1/shield'] = skillRes.oppShield;
      updates['p2/hp'] = skillRes.selfHp;
      updates['p2/shield'] = skillRes.selfShield;
      updates['p2/energy'] = skillRes.selfEnergy;

      if (skillRes.isOpponentDead) {
        updates.status = 'FINISHED';
        updates.winnerId = me.id;
        updates.combatLogs = [...(roomData.combatLogs || []).slice(-15), logMsg, `💀 [🤖 AI Bot Tối Thượng] đã chiến thắng trận đấu!`];
        playSound('victory');
        await update(roomRef, updates);
        return;
      }
    } else {
      playSound('attack');
      let myAtk = aiCard.atk;
      let oppDef = oppCard.def;
      if (me.swapped) myAtk = aiCard.def;
      if (opp.swapped) oppDef = oppCard.atk;

      let rawDmg = Math.max(15, Math.floor((myAtk - Math.floor(oppDef / 2)) * roleAdv.dmgMult));
      let actualDmg = rawDmg;
      let newShield = opp.shield || 0;

      if (newShield > 0) {
        if (newShield >= actualDmg) {
          newShield -= actualDmg;
          actualDmg = 0;
        } else {
          actualDmg -= newShield;
          newShield = 0;
        }
      }

      const newOppHp = Math.max(0, opp.hp - actualDmg);
      const newEnergy = Math.min(5, me.energy + 1);

      logMsg = `⚔️ [🤖 ${me.name}] dùng [${aiCard.name}] (${aiCard.roleName}) tấn công gây -${actualDmg} Sát thương lên [${opp.name}]!`;
      if (roleAdv.log) logMsg += ` ${roleAdv.log}`;

      updates['p1/hp'] = newOppHp;
      updates['p1/shield'] = newShield;
      updates['p2/energy'] = newEnergy;
      if (roleAdv.bonusShield > 0) updates['p2/shield'] = (me.shield || 0) + roleAdv.bonusShield;
      if (roleAdv.bonusHeal > 0) updates['p2/hp'] = Math.min(300, me.hp + roleAdv.bonusHeal);

      if (newOppHp <= 0) {
        updates.status = 'FINISHED';
        updates.winnerId = me.id;
        logMsg += ` 🏆 [🤖 AI Bot Tối Thượng] CHIẾN THẮNG BẢO VỆ DANH HIỆU!`;
        playSound('victory');
      }
    }

    // Check if AI hand is fully used -> deal 5 new cards
    if (aiHand.every((c: any) => c.used)) {
      updates['p2/hand'] = generateRandomHand(5);
      updates['p2/activeCardIdx'] = 0;
      logMsg += ` 🎴 [🤖 AI Bot] đã dùng hết 5 thẻ bài & rút 5 thẻ bài mới!`;
    }

    updates.combatLogs = [...(roomData.combatLogs || []).slice(-15), logMsg];
    await update(roomRef, updates);
  };

  // Determine current player role (p1, p2, or spectator)
  const isP1 = roomData?.p1?.id === uid;
  const isP2 = roomData?.p2?.id === uid;
  const isSpectator = !isP1 && !isP2;

  const myPlayerKey = isP1 ? 'p1' : isP2 ? 'p2' : null;
  const oppPlayerKey = isP1 ? 'p2' : isP2 ? 'p1' : null;

  const isMyTurn = myPlayerKey && roomData?.turn === myPlayerKey && roomData?.status === 'PLAYING';

  // Create AI Bot Testing Room
  const handleCreateAiMatch = async () => {
    const aiRoomId = `ai_arena_${Math.floor(1000 + Math.random() * 9000)}`;
    setRoomId(aiRoomId);
    setRoomInput(aiRoomId);

    const player1Obj = {
      id: uid,
      name: user?.name || 'Võ Sĩ Thẻ',
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      hp: 300,
      maxHp: 300,
      energy: 3,
      shield: 0,
      activeCardIdx: 0,
      hand: generateRandomHand(5)
    };

    const aiBotObj = {
      id: 'bot_ai_master',
      name: '🤖 AI Bot Tối Thượng',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
      hp: 300,
      maxHp: 300,
      energy: 3,
      shield: 0,
      activeCardIdx: 0,
      isBot: true,
      hand: generateRandomHand(5)
    };

    const roomRef = ref(db, `matches/${aiRoomId}`);
    await set(roomRef, {
      id: aiRoomId,
      p1: player1Obj,
      p2: aiBotObj,
      spectators: {},
      turn: 'p1',
      turnCount: 1,
      status: 'PLAYING',
      combatLogs: [
        '🤖 [PHÒNG ĐẤU THỬ NGHIỆM AI BOT]: AI Bot Tối Thượng đã sẵn sàng nghênh chiến!',
        `⚡ Lượt đầu tiên thuộc về [${player1Obj.name}]. Mỗi bên sở hữu 5 thẻ ngẫu nhiên độc nhất!`
      ],
      createdAt: Date.now()
    });
  };

  // Add AI Bot into current waiting room
  const handleJoinMatchWithAi = async () => {
    if (!roomData) return;
    const roomRef = ref(db, `matches/${roomId}`);

    const player1Obj = roomData.p1 || {
      id: uid,
      name: user?.name || 'Võ Sĩ Thẻ',
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      hp: 300,
      maxHp: 300,
      energy: 3,
      shield: 0,
      activeCardIdx: 0,
      hand: generateRandomHand(5)
    };

    const aiBotObj = {
      id: 'bot_ai_master',
      name: '🤖 AI Bot Tối Thượng',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
      hp: 300,
      maxHp: 300,
      energy: 3,
      shield: 0,
      activeCardIdx: 0,
      isBot: true,
      hand: generateRandomHand(5)
    };

    await update(roomRef, {
      p1: player1Obj,
      p2: aiBotObj,
      status: 'PLAYING',
      combatLogs: [
        ...(roomData.combatLogs || []),
        `🤖 [AI BOT] đã gia nhập Đấu Trường nghênh chiến [${player1Obj.name}]!`
      ]
    });
  };

  // Find Real Player Solo 1v1 Matchmaking
  const handleFindPlayer = async () => {
    setIsSearching(true);
    setSearchSeconds(60);

    try {
      const gamesRef = ref(db, 'matches');
      const snap = await get(gamesRef);

      const playerObj = {
        id: uid,
        name: user?.name || 'Võ Sĩ Thẻ',
        avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        hp: 300,
        maxHp: 300,
        energy: 3,
        shield: 0,
        activeCardIdx: 0,
        hand: generateRandomHand(5)
      };

      let matchedRoomId: string | null = null;

      if (snap.exists()) {
        const rooms = snap.val();
        for (const rId of Object.keys(rooms)) {
          const room = rooms[rId];
          // Look for an active WAITING room with Player 1, no Player 2, and not created by current user
          if (room && room.status === 'WAITING' && room.p1 && room.p1.id !== uid && !room.p2) {
            matchedRoomId = rId;
            break;
          }
        }
      }

      if (matchedRoomId) {
        // Found active waiting room -> Join as Player 2
        const roomRef = ref(db, `matches/${matchedRoomId}`);
        await update(roomRef, {
          p2: playerObj,
          status: 'PLAYING',
          combatLogs: [
            `⚔️ [${playerObj.name}] đã gia nhập phòng #${matchedRoomId}! Trận đấu Solo 1v1 chính thức BẮT ĐẦU!`
          ]
        });
        setRoomId(matchedRoomId);
        setRoomInput(matchedRoomId);
        setIsSearching(false);
        playSound('victory');
      } else {
        // Create new active room waiting for Player 2
        const newPvpRoomId = `pvp_${uid.slice(0, 5)}_${Math.floor(1000 + Math.random() * 9000)}`;
        const roomRef = ref(db, `matches/${newPvpRoomId}`);
        await set(roomRef, {
          id: newPvpRoomId,
          p1: playerObj,
          p2: null,
          spectators: {},
          turn: 'p1',
          turnCount: 1,
          status: 'WAITING',
          combatLogs: [
            `⏳ [${playerObj.name}] đang chờ đối thủ tham gia Solo 1v1...`
          ],
          createdAt: Date.now()
        });
        setRoomId(newPvpRoomId);
        setRoomInput(newPvpRoomId);
      }
    } catch (err) {
      console.error('Matchmaking error:', err);
    }
  };

  const handleCancelSearchAndPlayAi = () => {
    setIsSearching(false);
    handleJoinMatchWithAi();
  };

  // Switch/Join room by custom room ID
  const handleSwitchRoom = (targetRoomId: string) => {
    if (!targetRoomId.trim()) return;
    setRoomId(targetRoomId.trim());
    setRoomInput(targetRoomId.trim());
  };

  // Join match as Player 1 or Player 2
  const handleJoinMatch = async () => {
    if (!roomData) return;
    const roomRef = ref(db, `matches/${roomId}`);

    const playerObj = {
      id: uid,
      name: user?.name || 'Võ Sĩ Thẻ',
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      hp: 300,
      maxHp: 300,
      energy: 3,
      shield: 0,
      activeCardIdx: 0,
      hand: generateRandomHand(5)
    };

    if (!roomData.p1) {
      await update(roomRef, {
        p1: playerObj,
        status: roomData.p2 ? 'PLAYING' : 'WAITING',
        combatLogs: [...(roomData.combatLogs || []), `🔥 [${playerObj.name}] gia nhập NGƯỜI CHƠI 1 với 5 thẻ bài ngẫu nhiên!`]
      });
    } else if (!roomData.p2 && roomData.p1.id !== uid) {
      await update(roomRef, {
        p2: playerObj,
        status: 'PLAYING',
        combatLogs: [...(roomData.combatLogs || []), `⚔️ [${playerObj.name}] gia nhập NGƯỜI CHƠI 2. TRẬN ĐẤU BẮT ĐẦU!`]
      });
    } else {
      await update(ref(db, `matches/${roomId}/spectators/${uid}`), {
        id: uid,
        name: user?.name || 'Khán Giả',
        avatar: user?.avatar || ''
      });
    }
  };

  // Reset Match
  const handleResetMatch = async () => {
    const roomRef = ref(db, `matches/${roomId}`);

    if (roomData?.p2?.isBot || roomId.startsWith('ai_')) {
      const p1Obj = {
        id: uid,
        name: user?.name || 'Võ Sĩ Thẻ',
        avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        hp: 300,
        maxHp: 300,
        energy: 3,
        shield: 0,
        activeCardIdx: 0,
        hand: generateRandomHand(5)
      };
      const aiBotObj = {
        id: 'bot_ai_master',
        name: '🤖 AI Bot Tối Thượng',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
        hp: 300,
        maxHp: 300,
        energy: 3,
        shield: 0,
        activeCardIdx: 0,
        isBot: true,
        hand: generateRandomHand(5)
      };

      await set(roomRef, {
        id: roomId,
        p1: p1Obj,
        p2: aiBotObj,
        spectators: {},
        turn: 'p1',
        turnCount: 1,
        status: 'PLAYING',
        combatLogs: [
          '🔄 [TÁI ĐẤU AI BOT]: Trận đấu đã được làm mới hoàn toàn!',
          '⚡ Đã chia 5 thẻ ngẫu nhiên mới từ bộ 20 thẻ bài cho bạn và AI Bot!'
        ],
        createdAt: Date.now()
      });
      setActiveCardIdx(0);
    } else {
      await set(roomRef, {
        id: roomId,
        p1: null,
        p2: null,
        spectators: roomData?.spectators || {},
        turn: 'p1',
        turnCount: 1,
        status: 'WAITING',
        combatLogs: ['🔄 Đấu Trường đã được khởi tạo lại!']
      });
    }
  };

  // Leave AI Room
  const handleLeaveAiRoom = async () => {
    if (roomId.startsWith('ai_')) {
      const roomRef = ref(db, `matches/${roomId}`);
      await remove(roomRef).catch(() => {});
    }
    setRoomId('arena_1');
    setRoomInput('arena_1');
  };

  // Perform Normal Attack
  const handleNormalAttack = async () => {
    if (!isMyTurn || !myPlayerKey || !oppPlayerKey || isAttacking) return;
    setIsAttacking(true);
    setCardRevealed(true);
    playSound('attack');

    const me = roomData[myPlayerKey];
    const opp = roomData[oppPlayerKey];
    if (!me || !opp) return;

    let myHand = me.hand && me.hand.length > 0 ? me.hand : generateRandomHand(5);
    const myCard = myHand[activeCardIdx] || CARD_DECK[0];

    // Mark card as used
    myHand[activeCardIdx] = { ...myCard, used: true };

    const oppHand = opp.hand && opp.hand.length > 0 ? opp.hand : CARD_DECK;
    const oppCard = oppHand[opp.activeCardIdx || 0] || CARD_DECK[0];

    // Check Role Advantage
    const roleAdv = getRoleAdvantage(myCard.role, oppCard.role);

    let myAtk = myCard.atk;
    let oppDef = oppCard.def;
    if (me.swapped) myAtk = myCard.def;
    if (opp.swapped) oppDef = oppCard.atk;

    let rawDmg = Math.max(15, Math.floor((myAtk - Math.floor(oppDef / 2)) * roleAdv.dmgMult));
    let actualDmg = rawDmg;
    let newShield = opp.shield || 0;

    if (newShield > 0) {
      if (newShield >= actualDmg) {
        newShield -= actualDmg;
        actualDmg = 0;
      } else {
        actualDmg -= newShield;
        newShield = 0;
      }
    }

    if (myCard.role === 'SPECIAL' || myCard.rarity === 'S') {
      triggerMatchEvent(myCard.name, myCard.role, me.name);
    }

    const newOppHp = Math.max(0, opp.hp - actualDmg);
    const newMyEnergy = Math.min(5, me.energy + 1);

    let logMsg = `⚔️ [${me.name}] chọn [${myCard.name}] (${myCard.roleName}) tấn công [${opp.name}] (${oppCard.roleName}), gây -${actualDmg} Sát thương!`;
    if (roleAdv.log) logMsg += ` ${roleAdv.log}`;

    const newMyShield = (me.shield || 0) + roleAdv.bonusShield;
    const newMyHp = Math.min(300, me.hp + roleAdv.bonusHeal);

    // Auto find next unused card index in my hand
    let nextUnusedIdx = myHand.findIndex((c: any) => !c.used);

    // If all 5 cards in hand have been used, deal 5 new cards automatically!
    if (myHand.every((c: any) => c.used)) {
      myHand = generateRandomHand(5);
      nextUnusedIdx = 0;
      logMsg += ` 🎴 [HỆ THỐNG]: Bạn đã dùng hết 5 thẻ bài! Đã rút 5 thẻ ngẫu nhiên mới!`;
    }

    const updates: any = {
      [`${myPlayerKey}/hand`]: myHand,
      [`${myPlayerKey}/activeCardIdx`]: nextUnusedIdx !== -1 ? nextUnusedIdx : 0,
      [`${oppPlayerKey}/hp`]: newOppHp,
      [`${oppPlayerKey}/shield`]: newShield,
      [`${myPlayerKey}/energy`]: newMyEnergy,
      [`${myPlayerKey}/shield`]: newMyShield,
      [`${myPlayerKey}/hp`]: newMyHp,
      turn: oppPlayerKey,
      turnCount: (roomData.turnCount || 1) + 1,
      combatLogs: [...(roomData.combatLogs || []).slice(-15), logMsg]
    };

    if (newOppHp <= 0) {
      updates.status = 'FINISHED';
      updates.winnerId = me.id;
      updates.combatLogs.push(`🏆 TRẬN ĐẤU KẾT THÚC! [${me.name}] ĐÃ CHIẾN THẮNG BỎNG MẮT!`);
      playSound('victory');
    }

    await update(ref(db, `matches/${roomId}`), updates);
    setActiveCardIdx(nextUnusedIdx !== -1 ? nextUnusedIdx : 0);
    setIsAttacking(false);
  };

  // Perform Card Unique Skill
  const handleUseSkill = async () => {
    if (!isMyTurn || !myPlayerKey || !oppPlayerKey || isAttacking) return;
    const me = roomData[myPlayerKey];
    const opp = roomData[oppPlayerKey];
    if (!me || !opp) return;

    let myHand = me.hand && me.hand.length > 0 ? me.hand : generateRandomHand(5);
    const myCard = myHand[activeCardIdx] || CARD_DECK[0];

    if (me.energy < myCard.energyCost) {
      alert(`Bạn cần tối thiểu ${myCard.energyCost} Năng lượng để thi triển [${myCard.skillName}]!`);
      return;
    }

    setIsAttacking(true);
    setCardRevealed(true);
    playSound('skill');

    // Mark card as used
    myHand[activeCardIdx] = { ...myCard, used: true };

    if (myCard.role === 'SPECIAL' || myCard.rarity === 'S') {
      triggerMatchEvent(myCard.name, myCard.role, me.name);
    }

    const oppCard = opp.hand[opp.activeCardIdx || 0] || CARD_DECK[0];
    const roleAdv = getRoleAdvantage(myCard.role, oppCard.role);

    const skillRes = applyCardSkillEffect(myCard, me, opp, roleAdv);
    let logMsg = skillRes.logMsg;

    const updates: any = {
      [`${myPlayerKey}/energy`]: skillRes.selfEnergy,
      [`${myPlayerKey}/hp`]: skillRes.selfHp,
      [`${myPlayerKey}/shield`]: skillRes.selfShield,
      [`${oppPlayerKey}/hp`]: skillRes.oppHp,
      [`${oppPlayerKey}/shield`]: skillRes.oppShield,
      turn: oppPlayerKey,
      turnCount: (roomData.turnCount || 1) + 1
    };

    if (skillRes.isOpponentDead) {
      updates.status = 'FINISHED';
      updates.winnerId = me.id;
      logMsg += ` 🏆 [${me.name}] CHIẾN THẮNG TRẬN ĐẤU!`;
      playSound('victory');
    }

    let nextUnusedIdx = myHand.findIndex((c: any) => !c.used);
    if (myHand.every((c: any) => c.used)) {
      myHand = generateRandomHand(5);
      nextUnusedIdx = 0;
      logMsg += ` 🎴 [HỆ THỐNG]: Bạn đã dùng hết 5 thẻ bài! Đã rút 5 thẻ ngẫu nhiên mới!`;
    }

    updates[`${myPlayerKey}/hand`] = myHand;
    updates[`${myPlayerKey}/activeCardIdx`] = nextUnusedIdx !== -1 ? nextUnusedIdx : 0;
    updates.combatLogs = [...(roomData.combatLogs || []).slice(-15), logMsg];

    await update(ref(db, `matches/${roomId}`), updates);
    setActiveCardIdx(nextUnusedIdx !== -1 ? nextUnusedIdx : 0);
    setIsAttacking(false);
  };

  // Select card in hand
  const handleSelectCard = async (index: number) => {
    if (!myPlayerKey) return;
    const myHand = roomData[myPlayerKey]?.hand || [];
    if (myHand[index]?.used) return; // Cannot re-select used card in current round

    setActiveCardIdx(index);
    await update(ref(db, `matches/${roomId}/${myPlayerKey}`), {
      activeCardIdx: index
    });
  };

  const handleSendEmoji = (emoji: string) => {
    const id = `ef_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setFloatingEffects((prev) => [...prev, { id, text: user?.name || 'Khán giả', emoji }]);
    setTimeout(() => {
      setFloatingEffects((prev) => prev.filter((item) => item.id !== id));
    }, 2500);
  };

  const handleCloseModal = async () => {
    setIsSearching(false);
    if (roomData?.status === 'WAITING' && roomData?.p1?.id === uid && !roomData?.p2) {
      await remove(ref(db, `matches/${roomId}`)).catch(() => {});
    } else if (roomId.startsWith('ai_') || (roomData?.status === 'FINISHED' && roomId.startsWith('pvp_'))) {
      await remove(ref(db, `matches/${roomId}`)).catch(() => {});
    }
    onClose();
  };

  const p1 = roomData?.p1;
  const p2 = roomData?.p2;
  const p1Hand = p1?.hand && p1.hand.length > 0 ? p1.hand : CARD_DECK.slice(0, 5);
  const p2Hand = p2?.hand && p2.hand.length > 0 ? p2.hand : CARD_DECK.slice(5, 10);
  
  const p1Card = p1Hand[p1?.activeCardIdx || 0] || p1Hand[0];
  const p2Card = p2Hand[p2?.activeCardIdx || 0] || p2Hand[0];

  const myHand = isP1 ? p1Hand : isP2 ? p2Hand : CARD_DECK.slice(0, 5);
  const oppHand = isP1 ? p2Hand : isP2 ? p1Hand : CARD_DECK.slice(5, 10);

  const currentSelectedCard = myHand[activeCardIdx] || myHand[0];
  const myPlayerObj = roomData?.[myPlayerKey || 'p1'];
  const myEnergy = myPlayerObj?.energy || 0;

  const filteredCompendiumDeck = CARD_DECK.filter((c) => {
    if (compendiumFilter === 'ALL') return true;
    if (compendiumFilter === 'SUPPORT') return c.role === 'SUPPORT' || c.role === 'SPECIAL';
    if (compendiumFilter === 'ATTACK' || compendiumFilter === 'DEFENSE') return c.role === compendiumFilter;
    if (['S', 'A', 'B', 'C'].includes(compendiumFilter)) return c.rarity === compendiumFilter;
    return true;
  });

  const getRarityBadgeStyle = (rarity: 'C' | 'B' | 'A' | 'S' | string) => {
    switch (rarity) {
      case 'S':
        return 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black border-yellow-200 font-black shadow-[0_0_8px_rgba(250,204,21,0.8)]';
      case 'A':
        return 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 text-white border-fuchsia-300 font-bold shadow-[0_0_6px_rgba(217,70,239,0.6)]';
      case 'B':
        return 'bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white border-cyan-300 font-bold';
      case 'C':
      default:
        return 'bg-gradient-to-r from-slate-600 via-emerald-600 to-slate-600 text-white border-emerald-300 font-bold';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      
      {/* BALANCED LAPTOP & MOBILE RESPONSIVE CONTAINER */}
      <div className="glass-box w-full max-w-xl lg:max-w-6xl p-3 sm:p-5 border-[#00f0ff]/40 bg-[#050608]/95 max-h-[95vh] overflow-y-auto flex flex-col justify-between space-y-3 relative mx-auto my-auto rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.25)] select-none">
        
        {/* Custom CSS Keyframes for 3D Card Flip, Lien Quan Mobile Aura Effects & Combat Animations */}
        <style>{`
          .perspective-1000 {
            perspective: 1000px;
          }
          .transform-style-3d {
            transform-style: preserve-3d;
          }
          .backface-hidden {
            backface-visibility: hidden;
          }
          .rotate-y-180 {
            transform: rotateY(180deg);
          }

          @keyframes lienQuanAuraGold {
            0% { box-shadow: 0 0 10px rgba(250, 204, 21, 0.7), inset 0 0 10px rgba(250, 204, 21, 0.4); border-color: #facc15; }
            50% { box-shadow: 0 0 28px rgba(250, 204, 21, 1), inset 0 0 20px rgba(250, 204, 21, 0.8); border-color: #fef08a; }
            100% { box-shadow: 0 0 10px rgba(250, 204, 21, 0.7), inset 0 0 10px rgba(250, 204, 21, 0.4); border-color: #facc15; }
          }

          @keyframes lienQuanAuraPurple {
            0% { box-shadow: 0 0 10px rgba(168, 85, 247, 0.7), inset 0 0 10px rgba(168, 85, 247, 0.4); border-color: #c084fc; }
            50% { box-shadow: 0 0 24px rgba(217, 70, 239, 1), inset 0 0 18px rgba(217, 70, 239, 0.8); border-color: #f0abfc; }
            100% { box-shadow: 0 0 10px rgba(168, 85, 247, 0.7), inset 0 0 10px rgba(168, 85, 247, 0.4); border-color: #c084fc; }
          }

          @keyframes lienQuanShimmer {
            0% { transform: translateX(-150%) rotate(25deg); }
            100% { transform: translateX(250%) rotate(25deg); }
          }

          .animate-lq-gold {
            animation: lienQuanAuraGold 2s infinite ease-in-out;
          }

          .animate-lq-purple {
            animation: lienQuanAuraPurple 2s infinite ease-in-out;
          }

          @keyframes cardFlip {
            0% { transform: perspective(1000px) rotateY(0deg); }
            100% { transform: perspective(1000px) rotateY(180deg); }
          }

          @keyframes attackSlash {
            0% { transform: scale(0.85) translateY(-20px) rotate(-8deg); opacity: 0; }
            40% { transform: scale(1.15) translateY(10px) rotate(4deg); opacity: 1; filter: drop-shadow(0 0 25px rgba(239, 68, 68, 1)); }
            100% { transform: scale(1) translateY(0) rotate(0deg); opacity: 1; }
          }

          @keyframes defenseShield {
            0% { transform: scale(0.75); opacity: 0; }
            50% { transform: scale(1.12); opacity: 1; filter: drop-shadow(0 0 30px rgba(56, 189, 248, 1)); }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes supportMagic {
            0% { transform: scale(0.8) rotate(-12deg); opacity: 0; }
            50% { transform: scale(1.1) rotate(4deg); filter: drop-shadow(0 0 25px rgba(250, 204, 21, 1)); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }

          @keyframes resultDisplay {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          .animate-card-flip {
            animation: cardFlip 0.4s ease-in-out forwards;
          }

          .animate-attack-slash {
            animation: attackSlash 0.45s ease-out 0.35s forwards;
          }

          .animate-defense-shield {
            animation: defenseShield 0.5s ease-out 0.35s forwards;
          }

          .animate-support-magic {
            animation: supportMagic 0.45s ease-out 0.35s forwards;
          }

          .animate-result-display {
            animation: resultDisplay 0.4s ease-out 0.75s forwards;
          }

          @keyframes screenFlashSpecial {
            0% { opacity: 0; transform: scale(0.95); }
            25% { opacity: 0.9; transform: scale(1.02); }
            50% { opacity: 1; transform: scale(1.05); filter: drop-shadow(0 0 35px #facc15); }
            100% { opacity: 0; transform: scale(1); }
          }

          @keyframes particleBurstSpecial {
            0% { transform: scale(0.3) rotate(0deg); opacity: 0; }
            50% { transform: scale(1.3) rotate(180deg); opacity: 1; filter: drop-shadow(0 0 40px #a855f7); }
            100% { transform: scale(2.2) rotate(360deg); opacity: 0; }
          }

          @keyframes glowTrailSpecial {
            0% { box-shadow: 0 0 20px #00f0ff, 0 0 40px #facc15; }
            50% { box-shadow: 0 0 55px #a855f7, 0 0 80px #ef4444, 0 0 100px #00f0ff; }
            100% { box-shadow: 0 0 20px #00f0ff, 0 0 40px #facc15; }
          }

          .animate-screen-flash {
            animation: screenFlashSpecial 1s ease-out forwards;
          }

          .animate-particle-burst {
            animation: particleBurstSpecial 1.2s ease-out forwards;
          }

          .animate-glow-trail {
            animation: glowTrailSpecial 1.8s infinite ease-in-out;
          }
        `}</style>

        {/* HEADER TOP BAR */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg shadow-[0_0_12px_rgba(0,240,255,0.4)]">
              <Swords className="w-4 h-4 text-black" />
            </div>
            <div>
              <h2 className="text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                🃏 ĐẤU THẺ THẾ GIỚI 1V1
              </h2>
              <div className="flex items-center gap-2 text-[9px] text-cyan-400 font-mono">
                <span>Phòng: <strong className="text-yellow-300">#{roomId}</strong></span>
                <span>• Lượt #{roomData?.turnCount || 1}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleFindPlayer}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:brightness-125 text-black font-black rounded-lg text-[9px] font-mono transition cursor-pointer flex items-center gap-1 border border-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
              title="Tìm đối thủ người chơi thật (60s tự động ghép AI Bot)"
            >
              <Users className="w-3.5 h-3.5" /> TÌM NGƯỜI CHƠI (SOLO 1V1)
            </button>
            <button
              onClick={() => setShowCompendium(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:brightness-125 text-white rounded-lg text-[9px] font-mono font-bold transition cursor-pointer flex items-center gap-1 border border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
              title="Xem Thư Viện 50 Thẻ Bài & Kĩ Năng"
            >
              <Layers className="w-3.5 h-3.5 text-yellow-300" /> THƯ VIỆN THẺ (50 THẺ)
            </button>
            <button
              onClick={handleResetMatch}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs transition cursor-pointer"
              title="Tải lại / Đấu lại"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCloseModal}
              className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAIN GAME ARENA */}
        {isSearching ? (
          <div
            className="my-auto p-6 glass-box border-2 border-cyan-400/80 text-center space-y-4 rounded-2xl max-w-md mx-auto w-full shadow-[0_0_50px_rgba(0,240,255,0.4)] animate-fadeIn relative overflow-hidden bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(5, 6, 12, 0.85), rgba(10, 15, 30, 0.95)), url('https://shareviet.net/wp-content/uploads/2024/06/65243-background-phong-nen-the-duc-the-thao-file-CDR.jpg')`
            }}
          >
            {/* Animated Radar Pulse */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-ping" />
              <div className="absolute inset-2 rounded-full border border-cyan-300/80 animate-pulse" />
              <Users className="w-10 h-10 text-cyan-300 relative z-10 drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
            </div>

            <div className="relative z-10 space-y-1">
              <h3 className="text-white font-black text-sm uppercase tracking-wider drop-shadow">ĐANG TÌM NGƯỜI CHƠI SOLO 1V1...</h3>
              <p className="text-xs text-amber-300 font-mono font-bold">
                Thời gian chờ: {searchSeconds}s (Tối đa 60s)
              </p>
              <p className="text-[10px] text-slate-300 leading-relaxed max-w-xs mx-auto pt-1">
                Đang quét phòng trực tuyến trên Firebase. Nếu sau 60s không tìm thấy đối thủ người chơi thật, bạn sẽ tự động được ghép đấu với AI Bot Tối Thượng!
              </p>
            </div>

            {/* Matchmaking Timer Progress Bar */}
            <div className="w-full bg-slate-900/90 h-2.5 rounded-full overflow-hidden border border-white/20 relative z-10">
              <div
                className="bg-gradient-to-r from-cyan-400 via-yellow-400 to-rose-500 h-full transition-all duration-1000"
                style={{ width: `${(searchSeconds / 60) * 100}%` }}
              />
            </div>

            <div className="flex flex-col gap-2 pt-2 relative z-10">
              <button
                onClick={() => setIsSearching(false)}
                className="w-full py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase rounded-xl transition cursor-pointer border border-white/10"
              >
                ✖ HỦY TÌM KIẾM PHÒNG
              </button>
            </div>
          </div>
        ) : roomData?.status === 'WAITING' ? (
          <div
            className="my-auto p-6 glass-box border-2 border-cyan-500/40 text-center space-y-4 rounded-2xl max-w-md mx-auto w-full bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(5, 6, 12, 0.88), rgba(10, 15, 30, 0.95)), url('https://shareviet.net/wp-content/uploads/2024/06/65243-background-phong-nen-the-duc-the-thao-file-CDR.jpg')`
            }}
          >
            <Users className="w-10 h-10 text-cyan-400 mx-auto animate-pulse" />
            <h3 className="text-white font-black text-xs sm:text-sm uppercase tracking-wider">TÌM TRẬN ĐẤU THẺ 1V1</h3>
            <p className="text-[10px] text-slate-300 leading-relaxed max-w-xs mx-auto">
              Nhấn nút tìm người chơi bên dưới. Hệ thống sẽ đếm 60s tìm đối thủ thực tế, tự động ghép AI Bot nếu hết thời gian!
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleFindPlayer}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:brightness-125 text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center gap-1.5 border border-cyan-300"
              >
                <Users className="w-4 h-4" /> TÌM NGƯỜI CHƠI SOLO 1V1 (GHÉP AI SAU 1 PHÚT)
              </button>

              <button
                onClick={handleJoinMatch}
                className="w-full py-2 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Swords className="w-3.5 h-3.5" /> THAM GIA PHÒNG HIỆN TẠI (#{roomId})
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative">
            
            {/* MATCH FINISHED OVERLAY BANNER WITH INSTANT RESET */}
            {roomData?.status === 'FINISHED' && (
              <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fadeIn border-2 border-yellow-400/60 shadow-[0_0_50px_rgba(250,204,21,0.5)]">
                <div className="p-4 bg-gradient-to-br from-yellow-500/20 to-amber-600/30 border border-yellow-400/50 rounded-full animate-bounce">
                  <Trophy className="w-12 h-12 text-yellow-300 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
                </div>
                
                <div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 drop-shadow">
                    {roomData?.winnerId === uid ? '🏆 BẠN ĐÃ CHIẾN THẮNG RỰC RỠ!' : roomData?.p2?.isBot && roomData?.winnerId === roomData?.p2?.id ? '💀 AI BOT TỐI THƯỢNG CHIẾN THẮNG!' : '🏆 TRẬN ĐẤU KẾT THÚC!'}
                  </h3>
                  <p className="text-xs text-cyan-300 font-mono mt-1">
                    {roomData?.winnerId === uid ? 'Chúc mừng bạn đã chinh phục Đấu Trường 1v1 AYK8686!' : 'Hãy chọn chiến thuật và loại thẻ thích hợp để tái đấu thắng AI Bot!'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full max-w-md">
                  <button
                    onClick={handleResetMatch}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:brightness-125 text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.6)] transition-all flex items-center justify-center gap-2 border border-cyan-300"
                  >
                    <RefreshCw className="w-4 h-4 text-black animate-spin-slow" /> ⚔️ TÁI ĐẤU NGAY VỚI AI BOT
                  </button>

                  <button
                    onClick={() => setShowCompendium(true)}
                    className="py-3 px-4 bg-purple-600/80 hover:bg-purple-500 text-white font-bold text-xs uppercase rounded-xl cursor-pointer border border-purple-400/50 flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-4 h-4 text-yellow-300" /> BỘ BÀI (50 THẺ)
                  </button>
                </div>
              </div>
            )}

            {/* DESKTOP RESPONSIVE GRID LAYOUT (lg:grid lg:grid-cols-12 lg:gap-4) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
              
              {/* LEFT COLUMN: 1V1 CENTRAL BATTLE SHOWDOWN & ACTIVE SKILL BANNER (lg:col-span-7) */}
              <div className="lg:col-span-7 space-y-3">
                
                {/* 1v1 Battle Arena Card Showdown Box */}
                <div className="relative glass-box p-3 border border-purple-500/30 bg-gradient-to-b from-purple-950/20 via-black to-slate-950 rounded-xl space-y-2 overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                  
                  {/* Turn Banner Indicator with 20s Selection Countdown Timer */}
                  <div className="flex items-center justify-between text-[10px] font-mono border-b border-purple-500/20 pb-1.5 gap-2">
                    <span className={`font-bold px-2 py-0.5 rounded text-[9px] uppercase flex items-center gap-1.5 ${
                      isMyTurn ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 animate-pulse' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      <Clock className="w-3 h-3 text-amber-400 animate-spin-slow" />
                      {isMyTurn ? `⚡ LƯỢT CHỌN BẠN (${turnSeconds}s)` : `⏳ ĐỐI THỦ CHỌN (${turnSeconds}s)`}
                    </span>

                    {/* 20s Timer Progress Bar */}
                    <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden border border-white/10 max-w-[120px]">
                      <div
                        className="bg-gradient-to-r from-amber-400 via-yellow-400 to-rose-500 h-full transition-all duration-1000"
                        style={{ width: `${(turnSeconds / 20) * 100}%` }}
                      />
                    </div>

                    <span className="text-slate-400 font-bold hidden sm:inline">
                      1V1 ARENA
                    </span>
                  </div>

                  {/* 1v1 Battle Arena Cards Display */}
                  <div className="grid grid-cols-2 gap-3 my-1">
                    
                    {/* Player 1 Card (Your / P1 Active Card) */}
                    <div className={`p-2 rounded-xl border bg-black/70 relative overflow-hidden flex flex-col items-center justify-between space-y-1 transition-all ${
                      roomData?.turn === 'p1' && isAttacking ? 'animate-attack-slash ring-2 ring-cyan-400' : 'border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                    }`}>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[8px] font-mono font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300 px-1.5 py-0.2 rounded uppercase truncate">
                          {p1Card?.role === 'ATTACK' ? '🔴 TẤN CÔNG' : p1Card?.role === 'DEFENSE' ? '🔵 PHÒNG THỦ' : '🟢 CHỨC NĂNG'}
                        </span>
                        <span className={`text-[7.5px] px-1 py-0.2 rounded border uppercase font-mono ${getRarityBadgeStyle(p1Card?.rarity || 'C')}`}>
                          {p1Card?.rarity || 'C'}
                        </span>
                      </div>

                      <div className="aspect-[3/4] h-32 sm:h-36 lg:h-40 w-full rounded-lg overflow-hidden bg-slate-950 border border-cyan-500/30 flex items-center justify-center relative">
                        <img
                          src={p1Card?.avatarUrl}
                          alt={p1Card?.name}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="w-full text-center">
                        <strong className="block text-[10px] uppercase font-bold text-white truncate">{p1Card?.name}</strong>
                        <span className="text-[8.5px] font-mono text-yellow-400 font-bold block">ATK: {p1Card?.atk} | DEF: {p1Card?.def}</span>
                      </div>
                    </div>

                    {/* Player 2 Card (Opponent / P2 Active Card) */}
                    <div className={`p-2 rounded-xl border bg-black/70 relative overflow-hidden flex flex-col items-center justify-between space-y-1 transition-all ${
                      roomData?.turn === 'p2' && isAttacking ? 'animate-attack-slash ring-2 ring-rose-400' : 'border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                    }`}>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[8px] font-mono font-bold bg-rose-950 border border-rose-500/40 text-rose-300 px-1.5 py-0.2 rounded uppercase truncate">
                          {p2Card?.role === 'ATTACK' ? '🔴 TẤN CÔNG' : p2Card?.role === 'DEFENSE' ? '🔵 PHÒNG THỦ' : '🟢 CHỨC NĂNG'}
                        </span>
                        <span className={`text-[7.5px] px-1 py-0.2 rounded border uppercase font-mono ${getRarityBadgeStyle(p2Card?.rarity || 'C')}`}>
                          {p2Card?.rarity || 'C'}
                        </span>
                      </div>

                      <div className="aspect-[3/4] h-32 sm:h-36 lg:h-40 w-full rounded-lg overflow-hidden bg-slate-950 border border-rose-500/30 flex items-center justify-center relative">
                        <img
                          src={p2Card?.avatarUrl}
                          alt={p2Card?.name}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="w-full text-center">
                        <strong className="block text-[10px] uppercase font-bold text-white truncate">{p2Card?.name}</strong>
                        <span className="text-[8.5px] font-mono text-yellow-400 font-bold block">ATK: {p2Card?.atk} | DEF: {p2Card?.def}</span>
                      </div>
                    </div>

                  </div>

                  {/* Combat Log Live Ticker */}
                  <div className="p-2 bg-black/80 rounded-lg border border-white/10 text-[9.5px] font-mono text-slate-300 line-clamp-2 leading-relaxed">
                    <span className="text-yellow-400 font-bold">📜 Nhật Ký: </span>
                    {roomData?.combatLogs?.[roomData.combatLogs.length - 1] || 'Đấu Trường đã sẵn sàng...'}
                  </div>

                </div>

                {/* SELECTED CARD SKILL BANNER & DESCRIPTION */}
                {!isSpectator && (
                  <div className="p-2.5 bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 border border-cyan-500/40 rounded-xl text-[10px] font-mono space-y-1 shadow-[0_0_12px_rgba(0,240,255,0.15)]">
                    <div className="flex items-center justify-between text-yellow-300 font-bold">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Kỹ Năng: {currentSelectedCard?.skillName}
                      </span>
                      <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-[9px]">
                        Chi phí: {currentSelectedCard?.energyCost} NL
                      </span>
                    </div>
                    <p className="text-slate-300 text-[9.5px] leading-relaxed">
                      {currentSelectedCard?.skillDesc}
                    </p>
                  </div>
                )}

                {/* Big Prominent Action Buttons */}
                {!isSpectator && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleNormalAttack}
                      disabled={!isMyTurn || isAttacking || currentSelectedCard?.used}
                      className={`py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isMyTurn && !currentSelectedCard?.used
                          ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:brightness-125 text-white shadow-[0_0_15px_rgba(255,0,60,0.5)] active:scale-95'
                          : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      <Swords className="w-4 h-4" /> TẤN CÔNG THƯỜNG
                    </button>

                    <button
                      onClick={handleUseSkill}
                      disabled={!isMyTurn || isAttacking || currentSelectedCard?.used || myEnergy < (currentSelectedCard?.energyCost || 2)}
                      className={`py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isMyTurn && !currentSelectedCard?.used && myEnergy >= (currentSelectedCard?.energyCost || 2)
                          ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:brightness-125 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-95'
                          : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      <Zap className="w-4 h-4" /> KĨ NĂNG ({currentSelectedCard?.energyCost || 2} NL)
                    </button>
                  </div>
                )}

              </div>

              {/* RIGHT COLUMN: OPPONENT & YOUR HAND CARDS + STATUS (lg:col-span-5) */}
              <div className="lg:col-span-5 space-y-3">
                
                {/* 1. OPPONENT STATUS & 5 FACE-DOWN HAND CARDS */}
                <div className="bg-gradient-to-b from-rose-950/40 via-black to-slate-950 p-2.5 rounded-xl border border-rose-500/30 space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={p2?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt=""
                        className="w-7 h-7 rounded-full border border-rose-400 object-cover"
                      />
                      <div>
                        <strong className="text-white text-xs block uppercase font-bold truncate max-w-[120px] sm:max-w-[160px]">
                          {p2?.name || 'Đối Thủ (P2)'}
                        </strong>
                        <span className="text-[8px] text-rose-400 font-mono uppercase">
                          Lượt: {roomData?.turn === 'p2' ? '⚡ LƯỢT ĐẤU ĐỐI THỦ' : 'Chờ...'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-amber-400 font-mono font-bold text-xs">⚡ {p2?.energy || 0}/5 NL</div>
                      {p2?.shield > 0 && <span className="text-blue-400 text-[9px] font-bold">🛡️ +{p2?.shield}</span>}
                    </div>
                  </div>

                  {/* Opponent HP Bar */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[9px] font-mono text-slate-300">
                      <span>❤️ HP: {p2?.hp || 0}/300</span>
                      <span className="text-rose-400 font-bold">{Math.round(((p2?.hp || 0) / 300) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/10">
                      <div
                        className="bg-gradient-to-r from-red-600 to-rose-400 h-full transition-all duration-300"
                        style={{ width: `${Math.max(0, ((p2?.hp || 0) / 300) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Opponent's 5 Hand Cards (Rendered as 3D Flippable Face-Down Cards) */}
                  <div className="pt-1">
                    <span className="text-[8px] text-slate-400 font-mono uppercase block mb-1">
                      🎴 THẺ TRÊN TAY ĐỐI THỦ (MẶT SAU AYK8686):
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1.5 snap-x scrollbar-thin scrollbar-thumb-rose-500/30">
                      {oppHand.map((card: any, idx: number) => (
                        <div
                          key={card.instanceId || `opp_${idx}`}
                          className={`w-14 sm:w-16 shrink-0 snap-center perspective-1000 aspect-[3/4] h-14 sm:h-16 rounded-lg overflow-hidden border transition-all relative flex items-center justify-center ${
                            card.used
                              ? 'opacity-30 grayscale border-slate-700 bg-slate-950'
                              : p2?.activeCardIdx === idx
                              ? 'border-rose-400 ring-2 ring-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                              : 'border-purple-500/40 bg-slate-900'
                          }`}
                        >
                          {card.used ? (
                            <span className="text-[7px] text-slate-500 font-mono uppercase font-bold text-center">
                              ĐÃ DÙNG
                            </span>
                          ) : (
                            <img
                              src={getCardBackSvg()}
                              alt="Face Down Card"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. YOUR STATUS HEADER */}
                {!isSpectator && (
                  <div className="bg-gradient-to-b from-cyan-950/40 via-black to-slate-950 p-2.5 rounded-xl border border-cyan-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={roomData[myPlayerKey || 'p1']?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt=""
                          className="w-7 h-7 rounded-full border border-cyan-400 object-cover"
                        />
                        <div>
                          <strong className="text-white text-xs block uppercase font-bold truncate max-w-[120px] sm:max-w-[160px]">
                            {roomData[myPlayerKey || 'p1']?.name || 'Bạn'} (BẠN)
                          </strong>
                          <span className="text-[8px] text-cyan-400 font-mono uppercase">
                            Thẻ chọn: {currentSelectedCard?.name}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-amber-400 font-mono font-bold text-xs">⚡ {myEnergy}/5 NL</div>
                        {roomData[myPlayerKey || 'p1']?.shield > 0 && (
                          <span className="text-blue-400 text-[9px] font-bold">🛡️ +{roomData[myPlayerKey || 'p1']?.shield}</span>
                        )}
                      </div>
                    </div>

                    {/* Your HP Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[9px] font-mono text-slate-300">
                        <span>❤️ HP BẠN: {roomData[myPlayerKey || 'p1']?.hp || 0}/300</span>
                        <span className="text-cyan-300 font-bold">{Math.round(((roomData[myPlayerKey || 'p1']?.hp || 0) / 300) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-white/10">
                        <div
                          className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-300 h-full transition-all duration-300"
                          style={{ width: `${Math.max(0, ((roomData[myPlayerKey || 'p1']?.hp || 0) / 300) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. YOUR 5 HAND CARDS SELECTION (HORIZONTAL SCROLLABLE ROW ON MOBILE) */}
                {!isSpectator && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-300">
                      <span className="font-bold text-cyan-300 uppercase flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" /> 5 THẺ TRÊN TAY BẠN (CUỘN NGANG):
                      </span>
                      <span className="text-[8px] text-slate-400 font-bold">
                        Chạm để chọn / ℹ️ xem chi tiết
                      </span>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 pt-1 px-1 snap-x scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-slate-950">
                      {myHand.map((card: any, idx: number) => {
                        const isUsed = card.used;
                        const isSelected = activeCardIdx === idx;
                        const isEnergyLocked = myEnergy < card.energyCost;

                        return (
                          <div
                            key={card.instanceId || `my_card_${idx}`}
                            className="w-20 sm:w-24 md:w-28 shrink-0 snap-center relative"
                          >
                            <div
                              onClick={() => !isUsed && handleSelectCard(idx)}
                              role="button"
                              tabIndex={isUsed ? -1 : 0}
                              className={`w-full p-1.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-between select-none ${
                                isUsed
                                  ? 'opacity-30 grayscale border-slate-800 bg-slate-950 pointer-events-none'
                                  : isSelected
                                  ? 'bg-gradient-to-b from-purple-900/60 to-black border-cyan-300 text-white ring-2 ring-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.8)] scale-[1.03]'
                                  : card.rarity === 'S'
                                  ? 'bg-gradient-to-b from-amber-950/60 to-black animate-lq-gold text-white'
                                  : card.rarity === 'A'
                                  ? 'bg-gradient-to-b from-purple-950/60 to-black animate-lq-purple text-white'
                                  : 'bg-black/80 border-white/10 text-slate-400 hover:border-cyan-400/50'
                              }`}
                            >
                              {/* Lien Quan Mobile Shiny Shimmer Effect Overlay */}
                              {(card.rarity === 'S' || card.rarity === 'A') && !isUsed && (
                                <div className="absolute inset-0 overflow-hidden pointer-events-none z-10 rounded-xl">
                                  <div className={`w-1/2 h-full bg-gradient-to-r ${
                                    card.rarity === 'S' ? 'from-transparent via-amber-300/50 to-transparent' : 'from-transparent via-fuchsia-300/50 to-transparent'
                                  } animate-[lienQuanShimmer_2s_infinite]`} />
                                </div>
                              )}

                              {/* Luxury LIMITED Animated Badge for S & A Cards */}
                              {(card.rarity === 'S' || card.rarity === 'A') && (
                                <div className="absolute top-0.5 left-1/2 -translate-x-1/2 z-20 px-1 py-0.2 rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 border border-yellow-200 text-black font-black text-[6px] tracking-tighter uppercase shadow-[0_0_8px_rgba(250,204,21,0.8)] animate-pulse flex items-center gap-0.5">
                                  <span>✨ LIMITED</span>
                                </div>
                              )}

                              {/* Card Rarity Badge */}
                              <span className={`absolute top-0.5 right-0.5 z-20 text-[6.5px] px-1 py-0.2 rounded border uppercase font-mono ${getRarityBadgeStyle(card.rarity || 'C')}`}>
                                {card.rarity || 'C'}
                              </span>

                              {/* Inspect Card Detail Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectedCard(card);
                                }}
                                className="absolute top-0.5 left-0.5 z-20 p-0.5 bg-cyan-950/90 border border-cyan-400/60 rounded text-[8px] text-cyan-300 hover:scale-110 transition cursor-pointer"
                                title="Xem chi tiết kỹ năng"
                              >
                                <Info className="w-2.5 h-2.5" />
                              </button>

                              {/* Card Image & 3D Container */}
                              <div className="perspective-1000 aspect-[3/4] h-20 sm:h-24 w-full rounded-lg overflow-hidden bg-slate-950 mb-0.5 flex items-center justify-center relative">
                                <img
                                  src={card.avatarUrl}
                                  alt={card.name}
                                  className={`w-full h-full object-contain transition-transform duration-500 ${
                                    isSelected ? 'scale-105' : ''
                                  }`}
                                />

                                {/* Used Card Overlay */}
                                {isUsed && (
                                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-[7px] font-mono font-bold text-red-400 uppercase text-center px-0.5">
                                    ĐÃ DÙNG
                                  </div>
                                )}

                                {/* Energy Lock Overlay */}
                                {!isUsed && isEnergyLocked && (
                                  <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-0.5">
                                    <span className="text-xs">🔒</span>
                                    <span className="text-[7px] font-mono font-bold text-amber-400 leading-tight">
                                      KHÓA NL
                                    </span>
                                    <span className="text-[6.5px] font-mono text-slate-400">
                                      ({card.energyCost} NL)
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Card Role & Stats */}
                              <div className="w-full text-center leading-none">
                                <strong className="block text-[8px] uppercase font-bold truncate text-white">{card.name}</strong>
                                <span className="text-[7px] font-mono text-yellow-400 block font-bold mt-0.5">
                                  {card.atk}/{card.def}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* REAL-TIME MATCH CHAT & LIVE BETTING POOL (Firebase Synced) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10">
              
              {/* 1. Live Betting Pool Box */}
              <div className="p-3 bg-slate-950/90 border border-yellow-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-yellow-400 font-bold text-xs uppercase font-mono">
                  <span className="flex items-center gap-1">
                    💰 QUỸ ĐẶT CƯỢC LIVE
                  </span>
                  <span className="text-amber-300 font-mono text-xs font-bold">
                    {(bettingPool.totalPot || 0).toLocaleString('vi-VN')} Vàng
                  </span>
                </div>

                <p className="text-[9.5px] text-slate-300 leading-tight font-mono">
                  Đặt cược vào chiến thắng trận đấu! Tất cả người xem đồng bộ theo thời gian thực.
                </p>

                <div className="flex gap-1.5 pt-1">
                  {[100, 500, 1000, 5000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handlePlaceBet(amt)}
                      className="flex-1 py-1.5 bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-600/20 hover:bg-yellow-500 hover:text-black border border-yellow-500/50 text-yellow-300 font-bold text-[10px] rounded-lg transition-all cursor-pointer font-mono shadow-[0_0_8px_rgba(250,204,21,0.2)]"
                    >
                      +{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Real-time Live Chat Room Box */}
              <div className="p-3 bg-slate-950/90 border border-cyan-500/40 rounded-xl space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between text-cyan-400 font-bold text-xs uppercase font-mono border-b border-cyan-500/20 pb-1">
                  <span className="flex items-center gap-1">
                    💬 PHÒNG CHAT TRỰC TIẾP LIVE
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {chatMessages.length} Tin nhắn
                  </span>
                </div>

                <div className="h-20 overflow-y-auto space-y-1.5 text-[9.5px] font-mono pr-1 scrollbar-thin scrollbar-thumb-cyan-500/30">
                  {chatMessages.length === 0 ? (
                    <p className="text-slate-500 text-center py-3 text-[9px] italic">Chưa có tin nhắn... Hãy bình luận ngay!</p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="p-1 bg-white/5 rounded border border-white/5 flex gap-1">
                        <span className="text-cyan-300 font-bold truncate max-w-[80px]">{msg.sender}:</span>
                        <span className="text-slate-200 flex-1 break-words">{msg.text}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-1 pt-1">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Nhập lời nhắn khán giả..."
                    className="flex-1 bg-black/80 border border-cyan-500/30 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] rounded-lg transition cursor-pointer font-mono"
                  >
                    GỬI
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* SPECIAL CARD PARTICLES BURST & SCREEN FLASH OVERLAY FOR ALL Connected SPECTATORS & PLAYERS */}
      {activeSpecialEvent && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm animate-screen-flash">
          <div className="relative flex flex-col items-center justify-center space-y-3">
            {/* Burst Glow Keyframe Circle */}
            <div className="absolute w-72 h-72 rounded-full bg-gradient-to-r from-yellow-400 via-fuchsia-500 to-cyan-400 animate-particle-burst opacity-80 blur-xl" />
            
            <div className="relative z-10 bg-slate-950/90 border-2 border-yellow-400 p-6 rounded-3xl text-center space-y-2 shadow-[0_0_80px_rgba(250,204,21,0.8)] animate-glow-trail max-w-sm mx-auto">
              <div className="text-3xl animate-bounce">⚡💥✨</div>
              <span className="text-[10px] text-amber-300 font-mono font-bold uppercase tracking-widest block">
                TUNG THẺ BÀI ĐẶC BIỆT THẦN THOẠI!
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 uppercase drop-shadow">
                {activeSpecialEvent.cardName}
              </h2>
              <p className="text-xs text-cyan-300 font-bold font-mono">
                [ {activeSpecialEvent.playerName} ] vừa thi triển chiêu thức đặc biệt!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 50 CARDS DECK COMPENDIUM & SKILLS GALLERY MODAL WITH RARITY FILTER */}
      {showCompendium && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="glass-box w-full max-w-4xl p-4 sm:p-6 border border-cyan-500/40 bg-[#080b12] max-h-[90vh] overflow-y-auto rounded-2xl space-y-4 shadow-[0_0_60px_rgba(0,240,255,0.3)]">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/20 border border-cyan-400/50 rounded-xl text-cyan-300">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm sm:text-base uppercase tracking-wider flex items-center gap-2">
                    📚 THƯ VIỆN BỘ BÀI (50 THẺ & PHẨM CẤP C, B, A, S)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Xem toàn bộ 50 thẻ bài Công, Thủ, Chức năng, Đặc biệt và kĩ năng độc quyền
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCompendium(false)}
                className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs by Role and Rarity */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { key: 'ALL', label: 'TẤT CẢ (50)' },
                { key: 'S', label: '💎 S - HUYỀN THOẠI' },
                { key: 'A', label: '💜 A - SỬ THI' },
                { key: 'B', label: '🔷 B - HIẾM' },
                { key: 'C', label: '☘️ C - THƯỜNG' },
                { key: 'ATTACK', label: '🔴 TẤN CÔNG' },
                { key: 'DEFENSE', label: '🔵 PHÒNG THỦ' },
                { key: 'SUPPORT', label: '🟢 CHỨC NĂNG' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setCompendiumFilter(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer whitespace-nowrap ${
                    compendiumFilter === tab.key
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 30 Cards Grid Display */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredCompendiumDeck.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setInspectedCard(card)}
                  className="p-2.5 bg-slate-950 border border-white/10 hover:border-cyan-400/60 rounded-xl space-y-2 transition-all flex flex-col justify-between group hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] relative cursor-pointer"
                >
                  {/* Rarity Badge */}
                  <span className={`absolute top-3 right-3 z-10 text-[8px] px-1.5 py-0.5 rounded uppercase font-mono ${getRarityBadgeStyle(card.rarity || 'C')}`}>
                    {card.rarityName || card.rarity}
                  </span>

                  <div className="aspect-[3/4] h-32 w-full rounded-lg overflow-hidden bg-black/60 border border-white/5 flex items-center justify-center relative">
                    <img src={card.avatarUrl} alt={card.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                    <span className="absolute bottom-1 left-1 text-[8px] font-mono font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded shadow">
                      {card.energyCost} NL
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[8px] font-mono font-bold mb-0.5">
                      <span className={card.role === 'ATTACK' ? 'text-red-400' : card.role === 'DEFENSE' ? 'text-blue-400' : 'text-emerald-400'}>
                        {card.roleName}
                      </span>
                      <span className="text-yellow-400">ATK {card.atk} | DEF {card.def}</span>
                    </div>

                    <h4 className="text-white font-bold text-xs uppercase truncate group-hover:text-cyan-300 transition-colors">
                      {card.name}
                    </h4>

                    <div className="mt-1.5 p-1.5 bg-black/80 rounded border border-cyan-500/20 text-[9px] font-mono space-y-0.5">
                      <div className="text-cyan-300 font-bold">✨ {card.skillName}</div>
                      <p className="text-slate-300 text-[8.5px] leading-tight line-clamp-3">
                        {card.skillDesc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Close Button */}
            <div className="pt-2 text-center">
              <button
                onClick={() => setShowCompendium(false)}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-xs uppercase rounded-xl cursor-pointer hover:brightness-125 transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              >
                ĐÓNG THƯ VIỆN THẺ BÀI
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CARD INSPECTOR DETAIL OVERLAY MODAL */}
      {inspectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setInspectedCard(null)}
        >
          <div
            className="glass-box w-full max-w-sm sm:max-w-md p-5 border-2 border-cyan-400/80 bg-[#080b12] rounded-2xl space-y-4 shadow-[0_0_60px_rgba(0,240,255,0.4)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setInspectedCard(null)}
              className="absolute top-3 right-3 p-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Card Large Portrait */}
            <div className="aspect-[3/4] h-48 sm:h-56 w-full mx-auto rounded-xl overflow-hidden bg-slate-950 border border-cyan-500/40 relative shadow-inner flex items-center justify-center">
              <img src={inspectedCard.avatarUrl} alt={inspectedCard.name} className="w-full h-full object-contain" />
              <span className={`absolute top-2 right-2 text-xs font-mono font-bold px-2 py-0.5 rounded uppercase border ${getRarityBadgeStyle(inspectedCard.rarity || 'C')}`}>
                {inspectedCard.rarityName || inspectedCard.rarity}
              </span>
              <span className="absolute bottom-2 left-2 text-xs font-mono font-bold bg-amber-500 text-black px-2 py-0.5 rounded shadow">
                ⚡ {inspectedCard.energyCost} Năng Lượng
              </span>
            </div>

            {/* Card Title & Role */}
            <div className="text-center space-y-1">
              <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded border inline-block ${
                inspectedCard.role === 'ATTACK' ? 'bg-red-500/20 text-red-400 border-red-500/40' : inspectedCard.role === 'DEFENSE' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                {inspectedCard.roleName || inspectedCard.role}
              </span>
              <h3 className="text-lg font-black uppercase text-white tracking-wide">{inspectedCard.name}</h3>
            </div>

            {/* Stat Bars */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold bg-black/60 p-2.5 rounded-xl border border-white/10">
              <div className="text-center text-red-400">
                <span>⚔️ TẤN CÔNG: {inspectedCard.atk}</span>
              </div>
              <div className="text-center text-blue-400">
                <span>🛡️ PHÒNG THỦ: {inspectedCard.def}</span>
              </div>
            </div>

            {/* Full Skill Description Box */}
            <div className="p-3 bg-black/90 rounded-xl border border-cyan-500/40 text-xs font-mono space-y-1">
              <div className="text-yellow-300 font-bold flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Kỹ Năng: {inspectedCard.skillName}
              </div>
              <p className="text-slate-200 leading-relaxed font-sans text-xs pt-1">
                {inspectedCard.skillDesc}
              </p>
            </div>

            <button
              onClick={() => setInspectedCard(null)}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-xs uppercase rounded-xl cursor-pointer hover:brightness-125 transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)]"
            >
              ĐÓNG CHI TIẾT THẺ BÀI
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

