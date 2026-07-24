import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Zap, Swords, Heart, Sparkles, Eye, Trophy, RefreshCw, Send, Volume2, Users, Bot, BarChart2, Layers, Clock, Info, History, Flag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../../firebase';
import { ref, onValue, set, update, push, remove, get } from 'firebase/database';
import { getCardImageSvg, getCardBackSvg } from './cardImages';
import { incrementMissionProgress } from '../../utils/missions';

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
  rarity: 'C' | 'B' | 'A' | 'S' | 'SS';
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

// FULL CARD POOL WITH ULTIMATE SS CARD
export const FULL_CARD_POOL: CardItem[] = [
  {
    id: 'c_ss1',
    name: 'S88 THẦN RỒNG TỐI THƯỢNG',
    role: 'SUPPORT',
    roleName: 'Thần Thoại Cực Bá',
    rarity: 'SS',
    rarityName: 'SS - TỐI THƯỢNG',
    atk: 260,
    def: 260,
    skillName: 'THẦN RỒNG DIỆT THẾ & TÁI TẠO',
    skillDesc: 'CỰC BÁ SS! Hồi +200 HP, nhận +200 Giáp, hồi +3 Năng Lượng & giáng 260 Sát Thương Bộc Phá Xuyên Giáp đối thủ!',
    energyCost: 2,
    color: 'from-amber-400 via-rose-500 via-fuchsia-600 to-cyan-500',
    avatarUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBTqMdNY-6PzCO9PpB4Sgx-mu5GaxCwMKK6Dm7Xs9WfQ&s=10'
  },
  {
    id: 'c_ss2',
    name: 'S88 CỬU THIÊN BÁ CHỦ',
    role: 'ATTACK',
    roleName: 'Tấn Công Cực Bá',
    rarity: 'SS',
    rarityName: 'SS - TỐI THƯỢNG',
    atk: 280,
    def: 240,
    skillName: 'CỬU THIÊN GIÁNG THẾ & VÔ ĐỊCH',
    skillDesc: 'CỰC BÁ SS! Hồi +200 HP, nhận +200 Giáp, hồi +3 Năng Lượng & giáng 280 Sát Thương Xuyên Giáp!',
    energyCost: 1,
    color: 'from-amber-300 via-yellow-400 via-rose-500 to-cyan-400',
    avatarUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYX4qYBWybNjFwM_0Y-GjhujHU_gmw5z4RztzuZE3d3Q&s=10'
  },
  {
    id: 'c_ss3',
    name: 'S88 VƯƠNG GIẢ TỐI THƯỢNG',
    role: 'SUPPORT',
    roleName: 'Chức Năng Cực Bá',
    rarity: 'SS',
    rarityName: 'SS - TỐI THƯỢNG',
    atk: 250,
    def: 250,
    skillName: 'VÔ CỰC DIỆT THẾ & TÁI TẠO',
    skillDesc: 'CỰC BÁ SS! Hồi +200 HP, nhận +200 Giáp, hồi +3 Năng Lượng & giáng 250 Sát Thương Bộc Phá Xuyên Giáp đối thủ!',
    energyCost: 2,
    color: 'from-amber-400 via-rose-500 via-fuchsia-600 to-cyan-500',
    avatarUrl: 'https://i.pinimg.com/736x/8f/c1/9d/8fc19d4b005612c6a0c20165b6f3796d.jpg'
  },
  {
    id: 'c_ss4',
    name: 'S88 THẦN MA BÁ CHỦ',
    role: 'ATTACK',
    roleName: 'Tấn Công Cực Bá',
    rarity: 'SS',
    rarityName: 'SS - TỐI THƯỢNG',
    atk: 300,
    def: 280,
    skillName: 'THẦN MA GIÁNG THẾ & VÔ ĐỊCH',
    skillDesc: 'CỰC BÁ SS! Hồi +200 HP, nhận +200 Giáp, hồi +3 Năng Lượng & giáng 250 Sát Thương Bộc Phá Xuyên Giáp đối thủ!',
    energyCost: 1,
    color: 'from-amber-300 via-yellow-400 via-rose-500 to-cyan-400',
    avatarUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ80tdgZOlw_GNH-QOddy5LJk7sAc9OsOOcRMaUnNn8KQ&s=10'
  },
  {
    id: 'c_s1',
    name: 'HỎA RỒNG HUYỀN THOẠI',
    role: 'ATTACK',
    roleName: 'Tấn Công Bá Đạo',
    rarity: 'S',
    rarityName: 'Huyền Thoại (S)',
    atk: 210,
    def: 150,
    skillName: 'HỒNG LIÊN NỔ TUNG',
    skillDesc: 'Phẩm Cấp S! Thiêu đốt đối thủ 180 sát thương & bộc phá giáp!',
    energyCost: 2,
    color: 'from-amber-500 via-rose-600 to-red-950',
    avatarUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSnWg9fl7FMqHc1uxJ4tp2B014PtgRWBS1wNhhnySE4cA&s=10'
  },
  {
    id: 'c_s2',
    name: 'THẦN THÚ BẢO VỆ',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ Cực Cao',
    rarity: 'S',
    rarityName: 'Huyền Thoại (S)',
    atk: 180,
    def: 210,
    skillName: 'THÁNH QUANG HOÀNG GIA',
    skillDesc: 'Phẩm Cấp S! Tạo +150 Giáp thánh bảo vệ & hồi 100 HP!',
    energyCost: 2,
    color: 'from-yellow-400 via-amber-600 to-purple-950',
    avatarUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVkq_5-tH5HMD06C6E7RP9mZz4Nut98p4EW9MgXU8eDg&s=10'
  },
  {
    id: 'c_a1',
    name: 'CHIẾN THẦN KIM CƯƠNG',
    role: 'ATTACK',
    roleName: 'Tấn Công Cực Nhanh',
    rarity: 'A',
    rarityName: 'Sử Thi (A)',
    atk: 160,
    def: 120,
    skillName: 'KIM CƯƠNG TRUY HỒN',
    skillDesc: 'Phẩm Cấp A! Tung 3 cú chém liên hoàn gây 160 sát thương!',
    energyCost: 2,
    color: 'from-cyan-400 via-sky-500 to-indigo-950',
    avatarUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIFJFU1gWSEusIfMbCAgLZBPli74dEJVHBZCVES6UpMQ&s=10'
  },
  {
    id: 'c_b1',
    name: 'MA KIẾM BĂNG GIÁ',
    role: 'ATTACK',
    roleName: 'Tấn Công Sắc Lẻm',
    rarity: 'B',
    rarityName: 'Hiếm (B)',
    atk: 120,
    def: 90,
    skillName: 'BĂNG PHONG TIỂU VŨ',
    skillDesc: 'Phẩm Cấp B! Đóng băng 120 sát thương & hồi 30 Giáp!',
    energyCost: 1,
    color: 'from-purple-500 via-fuchsia-700 to-slate-950',
    avatarUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQjNY3Ofk3SiCyxrGrLDpwvBX6eiS2NXILKnxnMO40vSg&s=10'
  },
  {
    id: 'c_b2',
    name: 'MÃNH HỔ TỐC ĐỘ',
    role: 'ATTACK',
    roleName: 'Tấn Công Tốc Độ',
    rarity: 'B',
    rarityName: 'Hiếm (B)',
    atk: 130,
    def: 80,
    skillName: 'MÃNH HỔ TRUY KÍCH',
    skillDesc: 'Phẩm Cấp B! Tăng tốc độ tấn công, gây 130 sát thương bộc phát!',
    energyCost: 1,
    color: 'from-blue-500 via-cyan-700 to-stone-900',
    avatarUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0Kxz7o94WZ6QXy4k48nv7SP5T7F2bd04Buw5u0zYQGQ&s=10'
  },
  {
    id: 'c_c1',
    name: 'DỆT MỘT KHIÊN ĐỒNG',
    role: 'DEFENSE',
    roleName: 'Phòng Thủ Cơ Bản',
    rarity: 'C',
    rarityName: 'Thường (C)',
    atk: 70,
    def: 100,
    skillName: 'KHIÊN ĐỒNG BẬT PHẢN',
    skillDesc: 'Phẩm Cấp C! Nhận +70 Giáp đồng & phản đòn 50 sát thương!',
    energyCost: 1,
    color: 'from-slate-600 via-emerald-600 to-slate-600',
    avatarUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSp2ywZ_mNGplQnT00GDzt8OUA9iBGbiheETDhzklOweg&s=10'
  },
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

// 100+ BALANCED CARDS ARENA DECK FOR MATCH PLAY
export const CARD_DECK: CardItem[] = FULL_CARD_POOL;

export const drawRandomCard = (): CardItem => {
  const card = CARD_DECK[Math.floor(Math.random() * CARD_DECK.length)];
  return { 
    ...card, 
    instanceId: `${card.id}_${Math.random().toString(36).substring(2, 8)}`,
    used: false
  };
};

export const getCardElement = (card?: CardItem): { key: string; name: string; icon: string; color: string } => {
  if (!card) return { key: 'PHYSICAL', name: 'Vật Lý', icon: '⚔️', color: 'text-amber-400' };
  const str = (card.name + ' ' + card.skillName + ' ' + card.skillDesc).toLowerCase();
  if (str.includes('lửa') || str.includes('hỏa') || str.includes('rồng') || str.includes('hồng liên') || str.includes('nổ')) {
    return { key: 'FIRE', name: 'Hỏa (Lửa)', icon: '🔥', color: 'text-red-400' };
  }
  if (str.includes('gió') || str.includes('phong') || str.includes('vũ') || str.includes('bão')) {
    return { key: 'WIND', name: 'Phong (Gió)', icon: '🌪️', color: 'text-teal-300' };
  }
  if (str.includes('sét') || str.includes('lôi') || str.includes('điện') || str.includes('sốc')) {
    return { key: 'LIGHTNING', name: 'Lôi (Sét)', icon: '⚡', color: 'text-yellow-300' };
  }
  if (str.includes('băng') || str.includes('tuyết') || str.includes('thủy') || str.includes('nước')) {
    return { key: 'ICE', name: 'Băng Thủy', icon: '❄️', color: 'text-cyan-300' };
  }
  if (str.includes('độc') || str.includes('hắc') || str.includes('ma') || str.includes('quỷ') || str.includes('âm')) {
    return { key: 'DARK', name: 'Hắc Âm', icon: '☠️', color: 'text-purple-400' };
  }
  if (str.includes('thánh') || str.includes('quang') || str.includes('thần') || str.includes('vương') || str.includes('dương')) {
    return { key: 'LIGHT', name: 'Thần Quang', icon: '👑', color: 'text-amber-300' };
  }
  return { key: 'PHYSICAL', name: 'Vật Lý', icon: '⚔️', color: 'text-amber-400' };
};

export const getComboEffect = (myCard?: CardItem, myHand: CardItem[] = []) => {
  if (!myCard) return null;
  const myElem = getCardElement(myCard);
  const handElements = myHand.map(c => getCardElement(c).key);

  if (myElem.key === 'FIRE' && (handElements.includes('WIND') || myCard.role === 'ATTACK')) {
    return {
      id: 'combo_fire_wind',
      title: '🔥🌪️ COMBO PHONG HỎA LIÊN THÀNH',
      subtitle: 'Bộc phá Sát Thương x1.40 & Xuyên 30% Giáp!',
      badge: '🔥🌪️ PHONG HỎA LIÊN THÀNH',
      color: 'from-orange-500 via-red-600 to-amber-500',
      dmgMult: 1.4,
      flash: 'GOLD' as const
    };
  }

  if (myElem.key === 'LIGHTNING' || handElements.includes('DARK')) {
    return {
      id: 'combo_elec_dark',
      title: '⚡☠️ COMBO L雷 ĐỘC BẠO KÍCH',
      subtitle: 'Sát Thương Bộc Phá x1.35 & Giảm -50% Giáp!',
      badge: '⚡☠️ L雷 ĐỘC BẠO KÍCH',
      color: 'from-yellow-400 via-purple-600 to-fuchsia-600',
      dmgMult: 1.35,
      flash: 'CYAN' as const
    };
  }

  if (myElem.key === 'ICE' || handElements.includes('ICE')) {
    return {
      id: 'combo_ice_water',
      title: '💧❄️ COMBO BĂNG PHONG TUYỆT ĐỐI',
      subtitle: 'Tăng +25% Sát Thương & Hồi +40 HP!',
      badge: '💧❄️ BĂNG PHONG TUYỆT ĐỐI',
      color: 'from-cyan-400 via-blue-600 to-indigo-600',
      dmgMult: 1.25,
      flash: 'CYAN' as const
    };
  }

  if (myElem.key === 'LIGHT' && myCard.rarity === 'SS') {
    return {
      id: 'combo_yin_yang',
      title: '☯️👑 COMBO ÂM DƯƠNG VƯƠNG GIẢ',
      subtitle: 'Sát Thương Tối Thượng x1.60 Xuyên Giáp Tuyệt Đối!',
      badge: '☯️👑 ÂM DƯƠNG VƯƠNG GIẢ',
      color: 'from-amber-300 via-rose-500 to-cyan-400',
      dmgMult: 1.6,
      flash: 'GOLD' as const
    };
  }

  if (myCard.role === 'ATTACK' && myHand.filter(c => c.role === 'ATTACK').length >= 2) {
    return {
      id: 'combo_double_strike',
      title: '⚔️⚔️ COMBO TRẢM LIÊN HOÀN',
      subtitle: 'Liên Hoàn Tấn Công: +25% Sát Thương Bộc Phá!',
      badge: '⚔️⚔️ TRẢM LIÊN HOÀN',
      color: 'from-rose-600 via-red-600 to-amber-600',
      dmgMult: 1.25,
      flash: 'RED' as const
    };
  }

  return null;
};

// STAT POWER BALANCE CALCULATOR
export const calculateCardPower = (card: CardItem): number => {
  const base = card.atk + card.def + (card.energyCost * 15);
  const rarityBonus = card.rarity === 'SS' ? 80 : card.rarity === 'S' ? 35 : card.rarity === 'A' ? 22 : card.rarity === 'B' ? 12 : 5;
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
    const highRarityCards = CARD_DECK.filter((c) => c.rarity === 'SS' || c.rarity === 'S' || c.rarity === 'A');

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

// DYNAMIC SKILL ENGINE FOR ALL CARDS INCLUDING ULTIMATE SS CARD
export const applyCardSkillEffect = (card: CardItem, me: any, opp: any, roleAdv: any) => {
  const desc = card.skillDesc || '';
  let logMsg = '';
  let hpDamage = 0;
  let newShield = opp?.shield || 0;
  let selfHeal = 0;
  let selfShield = me?.shield || 0;
  let energyRestore = 0;

  // EXTREME OVERPOWERED SS CARD LOGIC
  if (card.rarity === 'SS' || card.id === 'c_ss1') {
    energyRestore = 3;
    selfHeal = 200;
    selfShield = (me?.shield || 0) + 200;
    // Massive piercing damage ignoring shield!
    hpDamage = 250;
    logMsg = `👑 [CỰC BÁ SS - ${me.name}] BỘC PHÁ THẦN THOẠI [${card.skillName}]! Hồi +200 HP, +200 Giáp, +3 Năng Lượng & giáng 250 Sát thương Xuyên Giáp!`;
    if (roleAdv?.log) logMsg += ` ${roleAdv.log}`;

    const finalOppHp = Math.max(0, (opp?.hp || 300) - hpDamage);
    const finalSelfHp = Math.min(500, (me?.hp || 300) + selfHeal);
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
  }

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

const RenderRarityParticles = ({ rarity }: { rarity?: string }) => {
  if (rarity === 'SS') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-20">
        {/* SS Electric Discharge Arcs & Plasma Shockwave */}
        <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 via-cyan-500/10 to-purple-500/10 animate-pulse" />
        <div className="absolute -inset-1 border border-amber-300/60 rounded-xl animate-electric-discharge opacity-80" />
        {/* High-Voltage Electric Sparks */}
        <div className="absolute top-1 left-2 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-electric-spark-1 shadow-[0_0_8px_#facc15]" />
        <div className="absolute bottom-2 right-2 w-2 h-2 bg-cyan-300 rounded-full animate-electric-spark-2 shadow-[0_0_10px_#22d3ee]" />
        <div className="absolute top-1/2 left-1 w-1 h-2 bg-fuchsia-400 animate-electric-spark-3 shadow-[0_0_8px_#e879f9]" />
        <div className="absolute top-1/3 right-1 w-2 h-1 bg-amber-400 animate-electric-spark-1 shadow-[0_0_8px_#fbbf24]" />
      </div>
    );
  }

  if (rarity === 'S') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-20">
        {/* S Fire Sparks / Fiery Embers */}
        <div className="absolute inset-0 bg-gradient-to-t from-orange-600/15 via-rose-500/10 to-transparent" />
        {/* Rising Fiery Embers */}
        <div className="absolute bottom-1 left-3 w-1.5 h-1.5 bg-orange-400 rounded-full animate-fire-spark-1 shadow-[0_0_6px_#fb923c]" />
        <div className="absolute bottom-2 left-2/3 w-1 h-1 bg-yellow-400 rounded-full animate-fire-spark-2 shadow-[0_0_6px_#facc15]" />
        <div className="absolute bottom-3 right-3 w-1.5 h-1.5 bg-rose-500 rounded-full animate-fire-spark-3 shadow-[0_0_8px_#f43f5e]" />
        <div className="absolute bottom-1 left-1/2 w-1 h-1 bg-amber-300 rounded-full animate-fire-spark-1 shadow-[0_0_6px_#fde047]" />
      </div>
    );
  }

  if (rarity === 'A') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-20">
        {/* A Subtle Sparkles & Starbursts */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-600/10 via-fuchsia-500/5 to-transparent" />
        <div className="absolute top-2 right-2 text-[10px] text-fuchsia-300 animate-a-sparkle-1 opacity-80">✨</div>
        <div className="absolute bottom-3 left-2 text-[9px] text-purple-300 animate-a-sparkle-2 opacity-75">✦</div>
        <div className="absolute top-1/2 right-1 text-[8px] text-cyan-200 animate-a-sparkle-3 opacity-70">⭐</div>
      </div>
    );
  }

  return null;
};

export default function WorldCardBattleModal({ uid, user, onClose, onShowResult }: WorldCardBattleModalProps) {
  const [roomId, setRoomId] = useState<string>('arena_1');
  const [roomInput, setRoomInput] = useState<string>('arena_1');
  const [roomData, setRoomData] = useState<any>(null);
  const [activeCardIdx, setActiveCardIdx] = useState<number>(0);
  const [isAttacking, setIsAttacking] = useState<boolean>(false);
  const [cardRevealed, setCardRevealed] = useState<boolean>(false);
  const [floatingEffects, setFloatingEffects] = useState<Array<{ id: string; text: string; emoji: string }>>([]);
  const [damageFloats, setDamageFloats] = useState<Array<{ id: string; damage: number; target: 'p1' | 'p2'; isCritical?: boolean }>>([]);
  const [matchHistory, setMatchHistory] = useState<Array<{ id: string; opponentName: string; opponentAvatar: string; result: 'WIN' | 'LOSS'; timestamp: number }>>([]);
  const [activeRoomsList, setActiveRoomsList] = useState<any[]>([]);
  const recordedMatchIdsRef = useRef<Set<string>>(new Set());

  // Fetch all active rooms list from Firebase DB for Lobby
  useEffect(() => {
    const matchesRef = ref(db, 'matches');
    const unsub = onValue(matchesRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data)
          .map(([id, room]: [string, any]) => ({ id, ...room }))
          .filter(r => r && r.p1 && !r.p2?.isBot && !r.id?.startsWith('ai_') && (r.status === 'WAITING' || r.status === 'BETTING' || r.status === 'PLAYING'))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setActiveRoomsList(list);
      } else {
        setActiveRoomsList([]);
      }
    });

    return () => unsub();
  }, []);

  // --- FAST & SATISFYING VISUAL IMPACT EFFECTS (SHAKE, FLASH, ZOOM, COMBO POPUP) ---
  const [battleTab, setBattleTab] = useState<'log' | 'combo' | 'buff' | 'chat'>('log');
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);
  const [criticalFlashType, setCriticalFlashType] = useState<'RED' | 'GOLD' | 'CYAN' | null>(null);
  const [impactZoom, setImpactZoom] = useState<boolean>(false);
  const [comboPopup, setComboPopup] = useState<{ title: string; subtitle: string; damage: number; rarity?: string } | null>(null);

  const triggerDamageFloat = (target: 'p1' | 'p2', damage: number, isCritical: boolean = false) => {
    if (damage <= 0) return;
    const id = `dmg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setDamageFloats((prev) => [...prev, { id, damage, target, isCritical }]);
    setTimeout(() => {
      setDamageFloats((prev) => prev.filter((item) => item.id !== id));
    }, 1600);
  };

  const triggerImpactEffects = (damage: number, isCritical: boolean = false, cardRarity: string = 'C', cardName: string = '') => {
    // 1. Screen Shake
    setIsScreenShaking(true);
    setTimeout(() => setIsScreenShaking(false), 450);

    // 2. Zoom Impact
    setImpactZoom(true);
    setTimeout(() => setImpactZoom(false), 450);

    // 3. Screen Flash & Combo Popup
    if (isCritical || damage >= 70 || cardRarity === 'S' || cardRarity === 'SS') {
      const flashColor = cardRarity === 'SS' ? 'CYAN' : isCritical ? 'RED' : 'GOLD';
      setCriticalFlashType(flashColor);
      setTimeout(() => setCriticalFlashType(null), 550);

      playSound('critical');

      let title = '💥 CRITICAL HIT!';
      let subtitle = `SÁT THƯƠNG CHÍ MẠNG -${damage} HP!`;
      if (cardRarity === 'SS') {
        title = '👑 SIÊU COMBO SS-RANK!';
        subtitle = `TUYỆT KỸ TỐI THƯỢNG [${cardName}] -${damage} HP!`;
      } else if (cardRarity === 'S') {
        title = '🔥 COMBO S-RANK HUYỀN THOẠI!';
        subtitle = `BỘC PHÁ [${cardName}] -${damage} HP!`;
      } else if (damage >= 100) {
        title = '⚡ SÁT THƯƠNG SIÊU CẤP!';
        subtitle = `TRUY HỒN ĐOẠT MỆNH -${damage} HP!`;
      }

      setComboPopup({ title, subtitle, damage, rarity: cardRarity });
      setTimeout(() => setComboPopup(null), 1300);
    } else {
      playSound('attack');
    }
  };

  const [showCompendium, setShowCompendium] = useState<boolean>(false);
  const [compendiumFilter, setCompendiumFilter] = useState<'ALL' | 'ATTACK' | 'DEFENSE' | 'SUPPORT'>('ALL');
  const [turnSeconds, setTurnSeconds] = useState<number>(50);
  const [inspectedCard, setInspectedCard] = useState<CardItem | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchSeconds, setSearchSeconds] = useState<number>(60);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'attack' | 'skill' | 'heal' | 'stun' | 'victory' | 'critical' | 'card' | 'turn') => {
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

      if (type === 'critical') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'card') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'turn') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(500, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'attack') {
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

  // Reset and clean up room state on modal mount
  useEffect(() => {
    setRoomId('arena_1');
    setRoomInput('arena_1');
    setRoomData(null);
    setIsSearching(false);

    // Ensure arena_1 default room is cleanly reset to WAITING state
    set(ref(db, 'matches/arena_1'), {
      id: 'arena_1',
      p1: null,
      p2: null,
      spectators: {},
      turn: 'p1',
      turnCount: 1,
      status: 'WAITING',
      combatLogs: ['🏠 Sảnh phòng chờ Đấu Trường Thẻ 1v1 đã sẵn sàng!'],
      createdAt: Date.now()
    }).catch(() => {});

    // Thoroughly clean up any stale AI or temporary rooms for this user
    const matchesRef = ref(db, 'matches');
    get(matchesRef).then((snap) => {
      if (snap.exists()) {
        const rooms = snap.val();
        Object.keys(rooms).forEach((rId) => {
          const room = rooms[rId];
          if (!room || rId === 'arena_1') return;
          // Delete any finished or active AI room belonging to this user
          if (
            rId.startsWith('ai_') ||
            room.p2?.isBot ||
            room.p1?.id === uid ||
            room.p2?.id === uid ||
            room.status === 'FINISHED'
          ) {
            remove(ref(db, `matches/${rId}`)).catch(() => {});
          }
        });
      }
    }).catch(() => {});
  }, [uid]);

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
      }, 600);
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

  // Sync Match History from Firebase for Current User
  useEffect(() => {
    if (!uid) return;
    const histRef = ref(db, `match_history/${uid}`);
    const unsub = onValue(histRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list = Object.entries(val).map(([k, v]: [string, any]) => ({
          id: k,
          ...v
        }));
        list.sort((a, b) => b.timestamp - a.timestamp);
        setMatchHistory(list.slice(0, 5));
      } else {
        setMatchHistory([]);
      }
    });
    return () => unsub();
  }, [uid]);

  // Record Match Outcome to Firebase & Update User PP (+ for Win, - for Loss)
  useEffect(() => {
    if (roomData?.status === 'FINISHED' && roomData?.winnerId && roomData?.id) {
      if (uid && roomData.processedUsers?.[uid]) return;
      const recordKey = `${roomData.id}_${uid}`;
      if (recordedMatchIdsRef.current.has(recordKey)) return;
      recordedMatchIdsRef.current.add(recordKey);

      if (uid) {
        update(ref(db, `matches/${roomData.id}/processedUsers`), {
          [uid]: true
        }).catch(() => {});
      }

      const winnerId = roomData?.winnerId;
      const p1Obj = roomData?.p1;
      const p2Obj = roomData?.p2;

      const betAmt = p1Obj?.bet || p2Obj?.bet || (roomData.totalPot ? Math.floor(roomData.totalPot / 2) : 5000);

      // Update local user's PP in Firebase
      if (uid) {
        const isWin = winnerId === uid;
        const userRef = ref(db, `users/${uid}`);
        get(userRef).then((snap) => {
          if (snap.exists()) {
            const currentPP = snap.val().pp || 0;
            const newPP = isWin ? currentPP + betAmt : Math.max(0, currentPP - betAmt);
            update(userRef, { pp: newPP }).catch(() => {});
          }
        }).catch(() => {});

        // Log transaction history to user's financial ledger
        push(ref(db, `transactions/${uid}`), {
          id: `tx_card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: isWin ? 'INCOME' : 'EXPENSE',
          title: isWin ? 'Thắng Đấu Thẻ 1v1' : 'Thua / Đầu Hàng Đấu Thẻ 1v1',
          amount: isWin ? +betAmt : -betAmt,
          unit: 'PP',
          timestamp: Date.now()
        }).catch(() => {});

        if (onShowResult) {
          onShowResult(
            isWin ? '🏆 BẠN THẮNG TRẬN ĐẤU THẺ!' : '💀 BẠN THẤT BẠI ĐẤU THẺ!',
            isWin ? `Thưởng chiến thắng: +${betAmt.toLocaleString('vi-VN')} PP!` : `Tiền cược đã mất: -${betAmt.toLocaleString('vi-VN')} PP!`,
            isWin
          );
        }
      }

      if (p1Obj && p2Obj) {
        if (p1Obj.id && !p1Obj.isBot) {
          const isP1Win = winnerId === p1Obj.id;
          push(ref(db, `match_history/${p1Obj.id}`), {
            matchId: roomData.id,
            opponentName: p2Obj.name || 'Đối Thủ',
            opponentAvatar: p2Obj.avatar || '',
            result: isP1Win ? 'WIN' : 'LOSS',
            ppChange: isP1Win ? +betAmt : -betAmt,
            timestamp: Date.now()
          }).catch(() => {});
        }
        if (p2Obj.id && !p2Obj.isBot) {
          const isP2Win = winnerId === p2Obj.id;
          push(ref(db, `match_history/${p2Obj.id}`), {
            matchId: roomData.id,
            opponentName: p1Obj.name || 'Đối Thủ',
            opponentAvatar: p1Obj.avatar || '',
            result: isP2Win ? 'WIN' : 'LOSS',
            ppChange: isP2Win ? +betAmt : -betAmt,
            timestamp: Date.now()
          }).catch(() => {});
        }
      }
    }
  }, [roomData?.status, roomData?.winnerId, roomData?.id, roomData?.processedUsers, uid]);

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

  // --- 30-SECOND MATCH WAGER / BET SELECTION HOOK ---
  const [wagerSeconds, setWagerSeconds] = useState<number>(30);

  const handleSelectBet = async (amount: number) => {
    if (!roomId || !myPlayerKey) return;
    const roomRef = ref(db, `matches/${roomId}`);
    await update(roomRef, {
      [`${myPlayerKey}/bet`]: amount
    });
  };

  const handleConfirmBet = async () => {
    if (!roomId || !myPlayerKey) return;
    const roomRef = ref(db, `matches/${roomId}`);
    await update(roomRef, {
      [`${myPlayerKey}/betConfirmed`]: true
    });
  };

  useEffect(() => {
    if (roomData?.status !== 'BETTING') return;

    setWagerSeconds(30);

    // AI Bot auto confirms bet if opponent is bot
    if (roomData?.p2?.isBot && !roomData?.p2?.betConfirmed) {
      const aiTimer = setTimeout(() => {
        const myBet = roomData?.p1?.bet || 5000;
        const roomRef = ref(db, `matches/${roomId}`);
        update(roomRef, {
          'p2/bet': myBet,
          'p2/betConfirmed': true
        });
      }, 1200);
      return () => clearTimeout(aiTimer);
    }

    const p1Conf = roomData?.p1?.betConfirmed;
    const p2Conf = roomData?.p2?.betConfirmed;

    if (p1Conf && p2Conf) {
      const p1Bet = roomData?.p1?.bet || 5000;
      const p2Bet = roomData?.p2?.bet || 5000;
      const totalPot = p1Bet + p2Bet;
      const roomRef = ref(db, `matches/${roomId}`);
      update(roomRef, {
        status: 'PLAYING',
        totalPot: totalPot,
        combatLogs: [
          ...(roomData.combatLogs || []).slice(-10),
          `💰 [CHỐT CƯỢC THÀNH CÔNG]: P1 (${p1Bet.toLocaleString('vi-VN')} PP) + P2 (${p2Bet.toLocaleString('vi-VN')} PP) = Tổng Quỹ Thưởng Bài Vương ${totalPot.toLocaleString('vi-VN')} PP! BẮT ĐẦU ĐẤU YU-GI-OH!`
        ]
      });
      return;
    }

    const interval = setInterval(() => {
      setWagerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          const p1Bet = roomData?.p1?.bet || 5000;
          const p2Bet = roomData?.p2?.bet || 5000;
          const totalPot = p1Bet + p2Bet;
          const roomRef = ref(db, `matches/${roomId}`);
          update(roomRef, {
            'p1/betConfirmed': true,
            'p2/betConfirmed': true,
            status: 'PLAYING',
            totalPot: totalPot,
            combatLogs: [
              ...(roomData.combatLogs || []).slice(-10),
              `⏱️ [HẾT 30S ĐẶT CƯỢC]: Tự động chốt cược! Tổng Tiền Thưởng = ${totalPot.toLocaleString('vi-VN')} PP! BẮT ĐẦU ĐẤU YU-GI-OH!`
            ]
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [roomData?.status, roomData?.p1?.betConfirmed, roomData?.p2?.betConfirmed, roomData?.p1?.bet, roomId]);

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

  // 50-Second Selection Timer Loop for Turn Play (Auto AI response in 800ms)
  useEffect(() => {
    if (!roomData || roomData.status !== 'PLAYING') return;

    setTurnSeconds(50);

    // Fast AI Bot Response in 800ms for fast action
    if (roomData.turn === 'p2' && roomData.p2?.isBot) {
      const aiTimer = setTimeout(() => {
        executeAiTurn();
      }, 800);
      return () => clearTimeout(aiTimer);
    }

    const interval = setInterval(() => {
      setTurnSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isMyTurn && !isAttacking) {
            handleNormalAttack();
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

      const aiSkillDmg = Math.max(0, (opp?.hp || 300) - skillRes.oppHp);
      if (aiSkillDmg > 0) {
        triggerDamageFloat('p1', aiSkillDmg, true);
        triggerImpactEffects(aiSkillDmg, true, aiCard.rarity, aiCard.skillName);
      }

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

      if (actualDmg > 0) {
        triggerDamageFloat('p1', actualDmg, aiCard.rarity === 'SS' || aiCard.rarity === 'S');
        triggerImpactEffects(actualDmg, aiCard.rarity === 'SS' || aiCard.rarity === 'S', aiCard.rarity, aiCard.name);
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

  // Determine current player role (p1 or p2)
  const isP1 = roomData?.p1?.id === uid || (!roomData?.p1 && !roomData?.p2);
  const isP2 = roomData?.p2?.id === uid;

  const myPlayerKey = isP2 ? 'p2' : 'p1';
  const oppPlayerKey = myPlayerKey === 'p1' ? 'p2' : 'p1';

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
      bet: 5000,
      betConfirmed: false,
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
      bet: 5000,
      betConfirmed: true,
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
      status: 'BETTING',
      combatLogs: [
        '🎰 [GIAI ĐOẠN ĐẶT CƯỢC 30S]: Hãy chọn mức cược Vàng / PP cho trận đấu! Thắng ăn trọn tổng quỹ thưởng kép.'
      ],
      createdAt: Date.now()
    });
  };

  // Add AI Bot into dedicated AI room
  const handleJoinMatchWithAi = async () => {
    const aiRoomId = `ai_${uid || 'user'}_${Date.now()}`;

    const player1Obj = {
      id: uid,
      name: user?.name || 'Võ Sĩ Thẻ',
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      hp: 300,
      maxHp: 300,
      energy: 3,
      shield: 0,
      activeCardIdx: 0,
      bet: 5000,
      betConfirmed: false,
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
      bet: 5000,
      betConfirmed: true,
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
      status: 'BETTING',
      combatLogs: [
        '🤖 [AI BOT] đã gia nhập Đấu Trường AI! Bắt đầu giai đoạn chốt mức cược 30s!'
      ],
      createdAt: Date.now()
    });

    setRoomId(aiRoomId);
    setRoomInput(aiRoomId);
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
        bet: 5000,
        betConfirmed: false,
        hand: generateRandomHand(5)
      };

      let matchedRoomId: string | null = null;

      if (snap.exists()) {
        const rooms = snap.val();
        for (const rId of Object.keys(rooms)) {
          const room = rooms[rId];
          // Look for an active WAITING room with Player 1, no Player 2, and not created by current user
          if (room && room.status === 'WAITING' && room.p1 && room.p1?.id !== uid && !room.p2) {
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
          status: 'BETTING',
          combatLogs: [
            `⚔️ [${playerObj.name}] đã gia nhập phòng #${matchedRoomId}! Bắt đầu 30s chốt mức cược kép!`
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

    if (!roomData?.p1) {
      await update(roomRef, {
        p1: playerObj,
        status: roomData?.p2 ? 'PLAYING' : 'WAITING',
        combatLogs: [...(roomData?.combatLogs || []), `🔥 [${playerObj.name}] gia nhập NGƯỜI CHƠI 1 với 5 thẻ bài ngẫu nhiên!`]
      });
    } else if (!roomData?.p2 && roomData?.p1?.id !== uid) {
      await update(roomRef, {
        p2: playerObj,
        status: 'PLAYING',
        combatLogs: [...(roomData?.combatLogs || []), `⚔️ [${playerObj.name}] gia nhập NGƯỜI CHƠI 2. TRẬN ĐẤU BẮT ĐẦU!`]
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

  // Join a specific room from the lobby list
  const handleJoinSpecificRoom = async (targetRoomId: string) => {
    try {
      const roomRef = ref(db, `matches/${targetRoomId}`);
      const snap = await get(roomRef);
      if (!snap.exists()) return;
      const room = snap.val();

      const playerObj = {
        id: uid,
        name: user?.name || 'Võ Sĩ Thẻ',
        avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        hp: 300,
        maxHp: 300,
        energy: 3,
        shield: 0,
        activeCardIdx: 0,
        bet: 5000,
        betConfirmed: false,
        hand: generateRandomHand(5)
      };

      if (!room?.p2 && room?.p1?.id !== uid) {
        await update(roomRef, {
          p2: playerObj,
          status: 'BETTING',
          combatLogs: [
            ...(room.combatLogs || []),
            `⚔️ [${playerObj.name}] đã gia nhập phòng #${targetRoomId}! Bắt đầu chốt cược 1v1!`
          ]
        });
        setRoomId(targetRoomId);
        setRoomInput(targetRoomId);
        setIsSearching(false);
        playSound('victory');
      } else {
        setRoomId(targetRoomId);
        setRoomInput(targetRoomId);
      }
    } catch (err) {
      console.error('Error joining room:', err);
    }
  };

  // Return to Lobby Waiting Room & Cleanup Room Document
  const handleReturnToLobby = async () => {
    try {
      if (roomId) {
        if (roomId === 'arena_1') {
          await set(ref(db, `matches/arena_1`), {
            id: 'arena_1',
            p1: null,
            p2: null,
            spectators: {},
            turn: 'p1',
            turnCount: 1,
            status: 'WAITING',
            combatLogs: ['🏠 Bạn đã quay lại phòng chờ arena_1! Sẵn sàng thách đấu trận mới.']
          }).catch(() => {});
        } else {
          await remove(ref(db, `matches/${roomId}`)).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Return to lobby error:', err);
    }
    setRoomId('arena_1');
    setRoomInput('arena_1');
    setRoomData(null);
    setIsSearching(false);
    playSound('victory');
  };

  // Surrender / Forfeit Match (Guaranteed Instant Sync & Auto Return)
  const handleSurrender = async () => {
    if (!roomData) return;
    if (roomData.status !== 'PLAYING' && roomData.status !== 'BETTING') {
      return;
    }

    const currentMyKey = roomData?.p2?.id === uid ? 'p2' : 'p1';
    const currentOppKey = currentMyKey === 'p1' ? 'p2' : 'p1';
    const oppObj = roomData?.[currentOppKey];
    const meObj = roomData?.[currentMyKey];

    const winnerId = oppObj?.id || (currentOppKey === 'p2' ? 'bot_ai_master' : 'opponent');

    const roomRef = ref(db, `matches/${roomId}`);
    await update(roomRef, {
      status: 'FINISHED',
      winnerId: winnerId,
      surrenderedBy: uid,
      combatLogs: [
        ...(roomData.combatLogs || []),
        `🏳️ [${meObj?.name || user?.name || 'Người chơi'}] đã đầu hàng! [${oppObj?.name || 'Đối thủ'}] giành chiến thắng!`
      ]
    });
    playSound('victory');

    // Auto return to clean lobby after surrender
    setTimeout(() => {
      handleReturnToLobby();
    }, 1000);
  };

  // Swap / Switch Active Card in Hand
  const handleSwapActiveCard = async () => {
    if (!isMyTurn || isAttacking || !myHand || myHand.length === 0) return;
    const unusedIndices = myHand.map((c: any, i: number) => (!c.used ? i : -1)).filter((i: number) => i !== -1);
    if (unusedIndices.length <= 1) return;

    const currentPos = unusedIndices.indexOf(activeCardIdx);
    const nextPos = (currentPos + 1) % unusedIndices.length;
    const nextIdx = unusedIndices[nextPos];

    setActiveCardIdx(nextIdx);
    const roomRef = ref(db, `matches/${roomId}`);
    await update(roomRef, {
      [`${myPlayerKey}/activeCardIdx`]: nextIdx
    }).catch(() => {});
    playSound('card');
  };

  // Pass Turn to Opponent
  const handleEndTurn = async () => {
    if (!isMyTurn || isAttacking) return;
    const roomRef = ref(db, `matches/${roomId}`);
    const nextTurn = oppPlayerKey;

    await update(roomRef, {
      turn: nextTurn,
      turnCount: (roomData.turnCount || 1) + 1,
      combatLogs: [
        ...(roomData.combatLogs || []),
        `⏭ [${myPlayerObj?.name || user?.name || 'Bạn'}] đã kết thúc lượt! Lượt đấu chuyển sang [${oppPlayerObj?.name || 'Đối thủ'}]!`
      ]
    }).catch(() => {});
    setTurnSeconds(20);
    playSound('turn');
  };

  // Clean all lobby rooms on Firebase DB & reset arena_1
  const handleCleanAllRooms = async () => {
    try {
      await remove(ref(db, 'matches'));
      await set(ref(db, 'matches/arena_1'), {
        id: 'arena_1',
        p1: null,
        p2: null,
        spectators: {},
        turn: 'p1',
        turnCount: 1,
        status: 'WAITING',
        combatLogs: ['🧹 Tất cả phòng chờ và trận AI đã được làm sạch hoàn toàn! Sẵn sàng thách đấu mới.'],
        createdAt: Date.now()
      });
      setActiveRoomsList([]);
      setRoomId('arena_1');
      setRoomInput('arena_1');
      setRoomData(null);
      setIsSearching(false);
      playSound('victory');
      if (onShowResult) {
        onShowResult(
          '🧹 ĐÃ LÀM SẠCH PHÒNG CHỜ',
          'Tất cả phòng chờ và trận đấu cũ đã được dọn dẹp hoàn toàn!',
          true
        );
      }
    } catch (e) {
      console.warn('Clear rooms error:', e);
    }
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

    // Check Active Combo Multiplier
    const activeCombo = getComboEffect(myCard, myHand);

    let myAtk = myCard.atk;
    let oppDef = oppCard.def;
    if (me.swapped) myAtk = myCard.def;
    if (opp.swapped) oppDef = oppCard.atk;

    let rawDmg = Math.max(15, Math.floor((myAtk - Math.floor(oppDef / 2)) * roleAdv.dmgMult));
    if (activeCombo) {
      rawDmg = Math.floor(rawDmg * activeCombo.dmgMult);
    }
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

    if (myCard.role === 'SPECIAL' || myCard.rarity === 'S' || activeCombo) {
      triggerMatchEvent(activeCombo ? activeCombo.title : myCard.name, myCard.role, me.name);
    }

    const newOppHp = Math.max(0, opp.hp - actualDmg);
    const newMyEnergy = Math.min(5, me.energy + 1);

    if (actualDmg > 0 && oppPlayerKey) {
      triggerDamageFloat(oppPlayerKey as 'p1' | 'p2', actualDmg, myCard.rarity === 'SS' || myCard.rarity === 'S' || !!activeCombo);
      triggerImpactEffects(actualDmg, myCard.rarity === 'SS' || myCard.rarity === 'S' || roleAdv.dmgMult > 1 || !!activeCombo, myCard.rarity, activeCombo ? activeCombo.badge : myCard.name);
    }

    let logMsg = `⚔️ [${me.name}] chọn [${myCard.name}] (${myCard.roleName}) tấn công [${opp.name}], gây -${actualDmg} Sát thương!`;
    if (activeCombo) logMsg += ` ⚡ [${activeCombo.badge}]!`;
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
    const activeCombo = getComboEffect(myCard, myHand);

    const skillRes = applyCardSkillEffect(myCard, me, opp, roleAdv);
    let logMsg = skillRes.logMsg;

    let skillDmgDealt = Math.max(0, (opp?.hp || 300) - skillRes.oppHp);
    if (activeCombo && skillDmgDealt > 0) {
      skillDmgDealt = Math.floor(skillDmgDealt * activeCombo.dmgMult);
      skillRes.oppHp = Math.max(0, (opp?.hp || 300) - skillDmgDealt);
      logMsg += ` ⚡ [${activeCombo.badge}]!`;
    }

    if (skillDmgDealt > 0 && oppPlayerKey) {
      triggerDamageFloat(oppPlayerKey as 'p1' | 'p2', skillDmgDealt, true);
      triggerImpactEffects(skillDmgDealt, true, myCard.rarity, activeCombo ? activeCombo.badge : myCard.skillName);
    }

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

    incrementMissionProgress(uid, 'card_battle');
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
    if (roomId) {
      try {
        const roomRef = ref(db, `matches/${roomId}`);
        if (roomData?.status === 'PLAYING' || roomData?.status === 'BETTING') {
          const currentMyKey = roomData?.p2?.id === uid ? 'p2' : 'p1';
          const currentOppKey = currentMyKey === 'p1' ? 'p2' : 'p1';
          const oppObj = roomData?.[currentOppKey];
          const winnerId = oppObj?.id || 'bot_ai_master';

          await update(roomRef, {
            status: 'FINISHED',
            winnerId: winnerId,
            surrenderedBy: uid,
            combatLogs: [
              ...(roomData.combatLogs || []),
              `🚪 [${user?.name || 'Người chơi'}] đã thoát khỏi trận đấu (tính thua cuộc)!`
            ]
          });
        }
        
        if (roomId === 'arena_1') {
          await set(ref(db, `matches/arena_1`), {
            id: 'arena_1',
            p1: null,
            p2: null,
            spectators: {},
            turn: 'p1',
            turnCount: 1,
            status: 'WAITING',
            combatLogs: ['🏠 Sảnh phòng chờ Đấu Trường Thẻ 1v1 đã sẵn sàng!']
          }).catch(() => {});
        } else if (
          roomId.startsWith('ai_') ||
          roomId.startsWith('pvp_') ||
          roomData?.status === 'WAITING' ||
          roomData?.status === 'FINISHED'
        ) {
          // Delay deletion slightly so outcome listener finishes settlement
          setTimeout(() => {
            remove(roomRef).catch(() => {});
          }, 800);
        }
      } catch (e) {
        console.warn('Error deleting room on modal exit:', e);
      }
    }
    setRoomId('arena_1');
    setRoomInput('arena_1');
    setRoomData(null);
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

  const myActiveCard = isP1 ? p1Card : p2Card;
  const oppActiveCard = isP1 ? p2Card : p1Card;

  const currentSelectedCard = myHand[activeCardIdx] || myHand[0];
  const myPlayerObj = roomData?.[myPlayerKey || 'p1'];
  const oppPlayerObj = roomData?.[oppPlayerKey || 'p2'];
  const myEnergy = myPlayerObj?.energy || 0;

  const filteredCompendiumDeck = CARD_DECK.filter((c) => {
    if (compendiumFilter === 'ALL') return true;
    if (compendiumFilter === 'SUPPORT') return c.role === 'SUPPORT' || c.role === 'SPECIAL';
    if (compendiumFilter === 'ATTACK' || compendiumFilter === 'DEFENSE') return c.role === compendiumFilter;
    if (['SS', 'S', 'A', 'B', 'C'].includes(compendiumFilter)) return c.rarity === compendiumFilter;
    return true;
  });

  const getRarityBadgeStyle = (rarity: 'C' | 'B' | 'A' | 'S' | 'SS' | string) => {
    switch (rarity) {
      case 'SS':
        return 'bg-gradient-to-r from-amber-300 via-rose-500 via-fuchsia-500 to-cyan-300 text-black border-amber-200 font-black shadow-[0_0_15px_rgba(251,191,36,0.9)] animate-pulse ring-1 ring-amber-300';
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
      <div className={`glass-box w-full max-w-xl lg:max-w-6xl p-3 sm:p-5 border-[#00f0ff]/40 bg-[#050608]/95 max-h-[95vh] overflow-y-auto flex flex-col justify-between space-y-3 relative mx-auto my-auto rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.25)] select-none ${
        isScreenShaking ? 'animate-shake' : ''
      }`}>
        
        {/* Custom CSS Keyframes for Shake, Flash, Zoom, Combo & 3D Animations */}
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

          /* 3D Interactive Card Tilt, Rotation & Hover Effects */
          .card-3d-hover {
            transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease, filter 0.3s ease;
            transform-style: preserve-3d;
            will-change: transform;
            perspective: 1000px;
          }
          .card-3d-hover:hover {
            transform: perspective(1000px) rotateX(12deg) rotateY(-10deg) rotate(2.5deg) translateZ(20px) scale(1.08);
            box-shadow: 0 20px 35px -5px rgba(0, 240, 255, 0.6), 0 0 25px rgba(234, 179, 8, 0.4);
            filter: brightness(1.18) contrast(1.08);
            z-index: 35;
          }

          .ss-card-3d-hover {
            transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.35s ease, filter 0.35s ease;
            transform-style: preserve-3d;
            will-change: transform;
            perspective: 1000px;
          }
          .ss-card-3d-hover:hover {
            transform: perspective(1000px) rotateX(15deg) rotateY(-12deg) rotate(-3deg) translateZ(30px) scale(1.12);
            box-shadow: 0 25px 50px -5px rgba(250, 204, 21, 0.9), 0 0 40px rgba(236, 72, 153, 0.7);
            filter: brightness(1.28) contrast(1.12);
            z-index: 45;
          }

          /* --- RARITY DISTINCT PARTICLE ANIMATIONS & AURAS --- */
          /* Rarity A Sparkles */
          @keyframes aSparkleFloat1 {
            0%, 100% { transform: translateY(0) scale(0.8); opacity: 0.4; }
            50% { transform: translateY(-6px) scale(1.2); opacity: 1; filter: drop-shadow(0 0 4px #e879f9); }
          }
          @keyframes aSparkleFloat2 {
            0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
            50% { transform: translateY(-8px) scale(1.3); opacity: 1; filter: drop-shadow(0 0 6px #a855f7); }
          }
          @keyframes aSparkleFloat3 {
            0%, 100% { transform: translateY(0) scale(0.9); opacity: 0.3; }
            50% { transform: translateY(-5px) scale(1.1); opacity: 0.9; filter: drop-shadow(0 0 5px #38bdf8); }
          }
          .animate-a-sparkle-1 { animation: aSparkleFloat1 2.2s ease-in-out infinite; }
          .animate-a-sparkle-2 { animation: aSparkleFloat2 2.8s ease-in-out infinite 0.5s; }
          .animate-a-sparkle-3 { animation: aSparkleFloat3 2.5s ease-in-out infinite 1.1s; }

          /* Rarity S Fire Sparks */
          @keyframes fireSparkRise1 {
            0% { transform: translateY(0) scale(0.5); opacity: 0; }
            50% { transform: translateY(-12px) scale(1.2); opacity: 1; filter: drop-shadow(0 0 6px #fb923c); }
            100% { transform: translateY(-25px) scale(0.3); opacity: 0; }
          }
          @keyframes fireSparkRise2 {
            0% { transform: translateY(0) scale(0.6); opacity: 0; }
            50% { transform: translateY(-16px) scale(1.3); opacity: 1; filter: drop-shadow(0 0 8px #ef4444); }
            100% { transform: translateY(-30px) scale(0.2); opacity: 0; }
          }
          @keyframes fireSparkRise3 {
            0% { transform: translateY(0) scale(0.4); opacity: 0; }
            50% { transform: translateY(-10px) scale(1.1); opacity: 0.9; filter: drop-shadow(0 0 6px #eab308); }
            100% { transform: translateY(-20px) scale(0.2); opacity: 0; }
          }
          .animate-fire-spark-1 { animation: fireSparkRise1 1.6s ease-out infinite; }
          .animate-fire-spark-2 { animation: fireSparkRise2 2.1s ease-out infinite 0.4s; }
          .animate-fire-spark-3 { animation: fireSparkRise3 1.8s ease-out infinite 0.8s; }

          /* Rarity SS Electric Discharge */
          @keyframes ssElectricDischarge {
            0% { box-shadow: 0 0 15px rgba(250, 204, 21, 0.8), inset 0 0 10px rgba(34, 211, 238, 0.6); border-color: #facc15; }
            25% { box-shadow: 0 0 30px rgba(34, 211, 238, 0.9), inset 0 0 20px rgba(236, 72, 153, 0.8); border-color: #38bdf8; }
            50% { box-shadow: 0 0 45px rgba(250, 204, 21, 1), 0 0 15px rgba(168, 85, 247, 0.9), inset 0 0 25px rgba(250, 204, 21, 0.9); border-color: #f43f5e; }
            75% { box-shadow: 0 0 25px rgba(236, 72, 153, 0.8), inset 0 0 15px rgba(34, 211, 238, 0.7); border-color: #c084fc; }
            100% { box-shadow: 0 0 15px rgba(250, 204, 21, 0.8), inset 0 0 10px rgba(34, 211, 238, 0.6); border-color: #facc15; }
          }

          @keyframes electricSparkPulse1 {
            0%, 100% { opacity: 0.2; transform: scale(0.8) translate(0, 0); }
            20% { opacity: 1; transform: scale(1.5) translate(2px, -3px); filter: drop-shadow(0 0 8px #facc15); }
            40% { opacity: 0.3; transform: scale(0.9) translate(-1px, 2px); }
            70% { opacity: 1; transform: scale(1.6) translate(-2px, -2px); filter: drop-shadow(0 0 10px #22d3ee); }
          }
          @keyframes electricSparkPulse2 {
            0%, 100% { opacity: 0.3; transform: scale(0.9); }
            30% { opacity: 1; transform: scale(1.7) translate(-3px, 1px); filter: drop-shadow(0 0 10px #e879f9); }
            60% { opacity: 0.2; transform: scale(0.7); }
            85% { opacity: 1; transform: scale(1.4) translate(2px, 3px); filter: drop-shadow(0 0 8px #facc15); }
          }

          .animate-electric-discharge { animation: ssElectricDischarge 1.2s ease-in-out infinite; }
          .animate-electric-spark-1 { animation: electricSparkPulse1 0.8s ease-in-out infinite; }
          .animate-electric-spark-2 { animation: electricSparkPulse2 1.1s ease-in-out infinite 0.2s; }
          .animate-electric-spark-3 { animation: electricSparkPulse1 0.9s ease-in-out infinite 0.4s; }

          /* Glow classes for cards */
          .ss-card-glow { animation: ssElectricDischarge 1.5s ease-in-out infinite; }
          .s-card-glow { box-shadow: 0 0 18px rgba(249, 115, 22, 0.7), inset 0 0 10px rgba(245, 158, 11, 0.4); border-color: #f97316; }
          .a-card-glow { box-shadow: 0 0 14px rgba(168, 85, 247, 0.6), inset 0 0 8px rgba(217, 70, 239, 0.3); border-color: #c084fc; }

          @keyframes screenShake {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            15% { transform: translate(-10px, 6px) rotate(-1.5deg); }
            30% { transform: translate(10px, -6px) rotate(1.5deg); }
            45% { transform: translate(-8px, -4px) rotate(-1deg); }
            60% { transform: translate(8px, 4px) rotate(1deg); }
            75% { transform: translate(-4px, 2px) rotate(-0.5deg); }
          }
          .animate-shake {
            animation: screenShake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
          }

          @keyframes criticalFlashRed {
            0% { opacity: 0.9; background: radial-gradient(circle, rgba(239,68,68,0.85) 0%, rgba(0,0,0,0) 80%); }
            50% { opacity: 0.95; background: radial-gradient(circle, rgba(255,0,60,0.9) 0%, rgba(0,0,0,0) 85%); }
            100% { opacity: 0; }
          }
          .animate-critical-flash-red {
            animation: criticalFlashRed 0.5s ease-out forwards;
          }

          @keyframes criticalFlashGold {
            0% { opacity: 0.9; background: radial-gradient(circle, rgba(250,204,21,0.85) 0%, rgba(0,0,0,0) 80%); }
            50% { opacity: 0.95; background: radial-gradient(circle, rgba(245,158,11,0.9) 0%, rgba(0,0,0,0) 85%); }
            100% { opacity: 0; }
          }
          .animate-critical-flash-gold {
            animation: criticalFlashGold 0.55s ease-out forwards;
          }

          @keyframes criticalFlashCyan {
            0% { opacity: 0.9; background: radial-gradient(circle, rgba(0,240,255,0.85) 0%, rgba(0,0,0,0) 80%); }
            50% { opacity: 0.95; background: radial-gradient(circle, rgba(168,85,247,0.9) 0%, rgba(0,0,0,0) 85%); }
            100% { opacity: 0; }
          }
          .animate-critical-flash-cyan {
            animation: criticalFlashCyan 0.55s ease-out forwards;
          }

          @keyframes impactZoomKey {
            0% { transform: scale(1); }
            35% { transform: scale(1.08) rotate(0.5deg); filter: brightness(1.2); }
            100% { transform: scale(1); }
          }
          .animate-impact-zoom {
            animation: impactZoomKey 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
          }

          @keyframes comboPopIn {
            0% { transform: scale(0.2) rotate(-10deg); opacity: 0; }
            50% { transform: scale(1.2) rotate(3deg); opacity: 1; }
            75% { transform: scale(1) rotate(0deg); opacity: 1; }
            100% { transform: scale(0.9) translateY(-20px); opacity: 0; }
          }
          .animate-combo-pop {
            animation: comboPopIn 1.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }

          @keyframes lienQuanAuraSS {
            0% { box-shadow: 0 0 15px rgba(244, 63, 94, 0.9), 0 0 35px rgba(251, 191, 36, 0.9), inset 0 0 15px rgba(244, 63, 94, 0.6); border-color: #f43f5e; }
            33% { box-shadow: 0 0 25px rgba(251, 191, 36, 1), 0 0 45px rgba(217, 70, 239, 1), inset 0 0 25px rgba(251, 191, 36, 0.8); border-color: #fbbf24; }
            66% { box-shadow: 0 0 25px rgba(168, 85, 247, 1), 0 0 45px rgba(6, 182, 212, 1), inset 0 0 25px rgba(168, 85, 247, 0.8); border-color: #a855f7; }
            100% { box-shadow: 0 0 15px rgba(244, 63, 94, 0.9), 0 0 35px rgba(251, 191, 36, 0.9), inset 0 0 15px rgba(244, 63, 94, 0.6); border-color: #f43f5e; }
          }

          .animate-aura-ss {
            animation: lienQuanAuraSS 1.8s infinite ease-in-out;
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

          @keyframes glideHandCard {
            0% {
              opacity: 0;
              transform: translateY(45px) scale(0.85);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .animate-glide-hand-card {
            animation: glideHandCard 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          }

          @keyframes floatDamage {
            0% {
              opacity: 0;
              transform: translate(-50%, 15px) scale(0.6);
            }
            20% {
              opacity: 1;
              transform: translate(-50%, -10px) scale(1.3);
            }
            75% {
              opacity: 1;
              transform: translate(-50%, -35px) scale(1);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -50px) scale(0.8);
            }
          }

          .animate-float-damage {
            animation: floatDamage 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
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
                {roomData?.status === 'PLAYING' && (
                  <span className={`px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                    turnSeconds <= 10
                      ? 'bg-red-500/30 border-red-400 text-red-300 animate-bounce'
                      : 'bg-cyan-950/80 border-cyan-400/50 text-yellow-300'
                  }`}>
                    ⏱️ {turnSeconds}s
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {(roomData?.status === 'PLAYING' || roomData?.status === 'BETTING') && (
              <button
                onClick={handleSurrender}
                className="px-2.5 py-1.5 bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/50 rounded-lg text-[9px] font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.3)] z-30"
                title="Đầu hàng và nhận thua trận này"
              >
                🏳️ ĐẦU HÀNG
              </button>
            )}
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
              title="Xem Thư Viện 100+ Thẻ Bài & Kĩ Năng"
            >
              <Layers className="w-3.5 h-3.5 text-yellow-300" /> THƯ VIỆN THẺ (100+ THẺ)
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
            className="my-auto p-5 sm:p-6 glass-box border-2 border-cyan-500/40 text-center space-y-4 rounded-2xl max-w-xl mx-auto w-full bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(5, 6, 12, 0.88), rgba(10, 15, 30, 0.95)), url('https://shareviet.net/wp-content/uploads/2024/06/65243-background-phong-nen-the-duc-the-thao-file-CDR.jpg')`
            }}
          >
            <Users className="w-10 h-10 text-cyan-400 mx-auto animate-pulse" />
            <h3 className="text-white font-black text-xs sm:text-sm uppercase tracking-wider">SẢNH PHÒNG CHỜ ĐẤU THẺ 1V1</h3>
            <p className="text-[10px] text-slate-300 leading-relaxed max-w-sm mx-auto">
              Nhấn nút tìm người chơi hoặc chọn trực tiếp một phòng chờ đang mở trong danh sách bên dưới để gia nhập thi đấu 1v1!
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleFindPlayer}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:brightness-125 text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center gap-1.5 border border-cyan-300"
              >
                <Users className="w-4 h-4" /> TÌM NGƯỜI CHƠI (SOLO 1V1)
              </button>

              <button
                onClick={handleJoinMatchWithAi}
                className="py-2.5 px-4 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-200 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                🤖 ĐẤU VỚI AI BOT NGAY
              </button>
            </div>

            {/* 🏠 DANH SÁCH PHÒNG CHỜ ĐẤU THẺ 1V1 (CARD BATTLE LOBBY) */}
            <div className="space-y-2 pt-3 border-t border-cyan-500/30 text-left">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-mono font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <Users className="w-4 h-4 text-cyan-400 shrink-0" /> PHÒNG CHỜ ĐANG MỞ ({activeRoomsList.length})
                </h4>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleCleanAllRooms}
                    className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-400/50 rounded-lg text-[8.5px] font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1"
                    title="Xóa tất cả các phòng chờ thử nghiệm hiện tại"
                  >
                    🧹 LÀM SẠCH PHÒNG CHỜ
                  </button>
                  <button
                    onClick={handleFindPlayer}
                    className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-400/50 rounded-lg text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                  >
                    + TẠO PHÒNG MỚI
                  </button>
                </div>
              </div>

              {activeRoomsList.length === 0 ? (
                <div className="p-3 bg-black/60 rounded-xl border border-white/10 text-center text-[10px] text-slate-400 font-mono">
                  Chưa có phòng chờ nào. Hãy nhấn <strong className="text-cyan-300">"TÌM NGƯỜI CHƠI (SOLO 1V1)"</strong> để mở phòng!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {activeRoomsList.map((room) => {
                    const isSelfRoom = room.p1?.id === uid;
                    const isWaiting = room.status === 'WAITING' && !room.p2;
                    const isBetting = room.status === 'BETTING';

                    return (
                      <div
                        key={room.id}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          room.id === roomId
                            ? 'bg-purple-950/60 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                            : 'bg-black/70 border-cyan-500/30 hover:border-cyan-400/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={room.p1?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                            alt=""
                            className="w-7 h-7 rounded-full border border-cyan-400 object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-white truncate font-mono">
                              {room.p1?.name || 'Võ Sĩ Thẻ'}
                            </div>
                            <div className="flex items-center gap-1 text-[8px] font-mono">
                              <span className="text-yellow-400">#{room.id.slice(0, 8)}</span>
                              <span className={`px-1 rounded font-black uppercase ${
                                isWaiting ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                                isBetting ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                                'bg-red-500/20 text-red-300 border border-red-500/40'
                              }`}>
                                {isWaiting ? '⏳ Đang Chờ' : isBetting ? '🎰 Cược PP' : '⚔️ Thi Đấu'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelfRoom ? (
                            <span className="text-[8.5px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-1 rounded-lg">
                              Phòng Bạn
                            </span>
                          ) : isWaiting ? (
                            <button
                              onClick={() => handleJoinSpecificRoom(room.id)}
                              className="px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-125 text-black font-black text-[9px] font-mono rounded-lg transition cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.4)]"
                            >
                              ⚔️ THAM GIA
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSwitchRoom(room.id)}
                              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-[8.5px] font-mono rounded-lg transition cursor-pointer"
                            >
                              VÀO PHÒNG
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 📜 LỊCH SỬ THI ĐẤU (5 TRẬN GẦN NHẤT) TRONG SẢNH PHÒNG CHỜ */}
            <div className="space-y-2 pt-3 border-t border-cyan-500/30 text-left">
              <div className="flex items-center justify-between font-mono font-bold text-xs uppercase text-cyan-300">
                <span className="flex items-center gap-1.5">
                  <History className="w-4 h-4 text-cyan-400" />
                  📜 LỊCH SỬ THI ĐẤU (5 TRẬN GẦN NHẤT)
                </span>
                <span className="text-[9px] text-slate-400 font-normal">
                  Đồng bộ Realtime Firebase
                </span>
              </div>

              {matchHistory.length === 0 ? (
                <div className="p-3 bg-black/60 rounded-xl border border-white/10 text-center text-[10px] text-slate-400 font-mono">
                  Chưa có lịch sử thi đấu nào. Hãy nhấn <strong className="text-cyan-300">"TÌM NGƯỜI CHƠI (SOLO 1V1)"</strong> để bắt đầu!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {matchHistory.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2 rounded-xl border flex items-center justify-between font-mono text-[10px] transition-all ${
                        item.result === 'WIN'
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                          : 'bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={item.opponentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt=""
                          className="w-6 h-6 rounded-full border border-white/20 object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="truncate font-bold text-white text-[10px] block">
                            {item.opponentName}
                          </span>
                          <span className="text-[8px] text-slate-400 block font-mono">
                            {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase inline-block ${
                          item.result === 'WIN'
                            ? 'bg-emerald-500 text-black shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                            : 'bg-rose-600 text-white shadow-[0_0_6px_rgba(225,29,72,0.8)]'
                        }`}>
                          {item.result === 'WIN' ? 'THẮNG' : 'THUA'}
                        </span>
                        <div className={`text-[9px] font-bold mt-0.5 ${item.result === 'WIN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.result === 'WIN' ? `+${((item as any).ppChange || 5000).toLocaleString('vi-VN')} PP` : `${((item as any).ppChange || -5000).toLocaleString('vi-VN')} PP`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : roomData?.status === 'BETTING' ? (
          <div
            className="my-auto p-5 sm:p-6 glass-box border-2 border-yellow-500/60 text-center space-y-4 rounded-2xl max-w-lg mx-auto w-full shadow-[0_0_60px_rgba(250,204,21,0.3)] animate-fadeIn relative overflow-hidden bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(5, 6, 12, 0.9), rgba(15, 12, 35, 0.95)), url('https://shareviet.net/wp-content/uploads/2024/06/65243-background-phong-nen-the-duc-the-thao-file-CDR.jpg')`
            }}
          >
            {/* Floating Golden Trophy Header */}
            <div className="relative z-10 space-y-1">
              <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-400/50 px-3 py-1 rounded-full text-yellow-300 font-mono font-bold text-xs uppercase shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>GIAI ĐOẠN ĐẶT CƯỢC MỨC CƯỢC THẦN BÀI (30S)</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 uppercase drop-shadow pt-1">
                CHỌN MỨC CƯỢC VÀNG / PP BÀI VƯƠNG
              </h3>
              <p className="text-[11px] text-slate-300">
                Hai bên cùng chốt mức cược. Tổng phần thưởng người thắng nhận được = <strong className="text-yellow-300 font-mono">2 Bên Cộng Lại</strong>!
              </p>
            </div>

            {/* Countdown 30s Bar */}
            <div className="space-y-1.5 relative z-10 bg-black/60 p-3 rounded-xl border border-yellow-500/30">
              <div className="flex justify-between items-center text-xs font-mono font-bold">
                <span className="text-yellow-400">⏱️ Thời gian chốt mức cược:</span>
                <span className="text-rose-400 text-sm animate-pulse">{wagerSeconds}s</span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-yellow-500 via-amber-400 to-rose-500 h-full transition-all duration-1000"
                  style={{ width: `${(wagerSeconds / 30) * 100}%` }}
                />
              </div>
            </div>

            {/* Live Match Players Wager Status */}
            <div className="grid grid-cols-2 gap-3 relative z-10">
              {/* P1 Box */}
              <div className={`p-3 rounded-xl border font-mono text-left space-y-1 transition-all ${
                roomData?.p1?.betConfirmed
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/80 border-cyan-500/30 text-cyan-200'
              }`}>
                <div className="flex items-center gap-1.5">
                  <img src={roomData?.p1?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} alt="" className="w-5 h-5 rounded-full object-cover border border-cyan-400" />
                  <span className="font-bold text-xs truncate max-w-[100px] text-white">
                    {roomData?.p1?.name || 'Player 1'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-300">
                  Cược: <strong className="text-yellow-300">{(roomData?.p1?.bet || 5000).toLocaleString()} PP</strong>
                </div>
                <div className="text-[9px] font-bold uppercase">
                  {roomData?.p1?.betConfirmed ? '✅ Đã Chốt Cược' : '⏳ Đang Chọn...'}
                </div>
              </div>

              {/* P2 Box */}
              <div className={`p-3 rounded-xl border font-mono text-left space-y-1 transition-all ${
                roomData?.p2?.betConfirmed
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/80 border-rose-500/30 text-rose-200'
              }`}>
                <div className="flex items-center gap-1.5">
                  <img src={roomData?.p2?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} alt="" className="w-5 h-5 rounded-full object-cover border border-rose-400" />
                  <span className="font-bold text-xs truncate max-w-[100px] text-white">
                    {roomData?.p2?.name || 'Player 2'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-300">
                  Cược: <strong className="text-yellow-300">{(roomData?.p2?.bet || 5000).toLocaleString()} PP</strong>
                </div>
                <div className="text-[9px] font-bold uppercase">
                  {roomData?.p2?.betConfirmed ? '✅ Đã Chốt Cược' : '⏳ Đang Chọn...'}
                </div>
              </div>
            </div>

            {/* Combined Total Pot Preview */}
            <div className="p-3 bg-gradient-to-r from-amber-950/80 via-black to-yellow-950/80 rounded-xl border border-yellow-400/60 text-center relative z-10 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
              <span className="text-[10px] text-yellow-300 font-mono font-bold uppercase block">
                💰 TỔNG NỒI CƯỢC THẦN BÀI (2 BÊN CỘNG LẠI):
              </span>
              <div className="text-2xl font-black font-mono text-amber-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                {((roomData?.p1?.bet || 5000) + (roomData?.p2?.bet || 5000)).toLocaleString('vi-VN')} PP
              </div>
            </div>

            {/* Wager Selection Buttons */}
            <div className="space-y-2 relative z-10 pt-1">
              <div className="text-[10px] text-slate-300 font-mono font-bold text-left">Chọn Mức Cược Của Bạn:</div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1000, 5000, 10000, 50000, 100000].map((amt) => {
                  const isSelected = (myPlayerObj?.bet || 5000) === amt;
                  return (
                    <button
                      key={amt}
                      onClick={() => handleSelectBet(amt)}
                      disabled={myPlayerObj?.betConfirmed}
                      className={`py-2 px-1 rounded-lg border font-mono font-bold text-[10px] transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-yellow-400 text-black border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.8)] scale-105'
                          : 'bg-black/60 border-white/20 text-yellow-300 hover:border-yellow-400 hover:bg-yellow-500/20'
                      }`}
                    >
                      {amt >= 1000 ? `${amt / 1000}k` : amt} PP
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleConfirmBet}
                disabled={myPlayerObj?.betConfirmed}
                className={`w-full py-3 mt-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
                  myPlayerObj?.betConfirmed
                    ? 'bg-emerald-600 text-black border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)] cursor-default'
                    : 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 hover:brightness-125 text-black border-yellow-200 shadow-[0_0_20px_rgba(250,204,21,0.6)] cursor-pointer'
                }`}
              >
                {myPlayerObj?.betConfirmed ? '✅ ĐÃ CHỐT MỨC CƯỢC (CHỜ ĐỐI THỦ...)' : '⚡ XÁC NHẬN CHỐT MỨC CƯỢC & BẮT ĐẦU VÀO TRẬN'}
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

                <div className="flex flex-col sm:flex-row gap-2 pt-2 w-full max-w-md">
                  <button
                    onClick={handleReturnToLobby}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-125 text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all flex items-center justify-center gap-2 border border-emerald-300"
                  >
                    <Users className="w-4 h-4 text-black" /> 🏠 QUAY LẠI PHÒNG CHỜ
                  </button>

                  <button
                    onClick={handleResetMatch}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:brightness-125 text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.6)] transition-all flex items-center justify-center gap-2 border border-cyan-300"
                  >
                    <RefreshCw className="w-4 h-4 text-black" /> ⚔️ TÁI ĐẤU NGAY
                  </button>

                  <button
                    onClick={() => setShowCompendium(true)}
                    className="py-3 px-4 bg-purple-600/80 hover:bg-purple-500 text-white font-bold text-xs uppercase rounded-xl cursor-pointer border border-purple-400/50 flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-4 h-4 text-yellow-300" /> BỘ BÀI
                  </button>
                </div>
              </div>
            )}

            {/* DESKTOP & MOBILE RESPONSIVE BATTLE FIELD LAYOUT */}
            <div className="space-y-3">
              
              {/* 1. TOP HEADER BAR: Opponent Avatar, HP, Energy, Turn, Ping & Surrender Button */}
              <div className="bg-slate-950/90 border border-purple-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                {/* Left: Opponent Avatar, Name, HP, Energy, Turn, Ping */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <img
                    src={oppPlayerObj?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt=""
                    className="w-9 h-9 rounded-full border-2 border-rose-400 object-cover shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-xs text-white uppercase truncate font-mono max-w-[120px]">
                        {oppPlayerObj?.name || 'Đối Thủ'}
                      </span>
                      <span className="text-amber-400 font-mono font-bold text-xs shrink-0">
                        ⚡{oppPlayerObj?.energy || 0}/5
                      </span>
                      <span className="bg-purple-900/80 text-purple-200 border border-purple-400/40 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0">
                        Turn {roomData?.turnCount || 1}
                      </span>
                      <span className="text-emerald-400 text-[9px] font-mono shrink-0 hidden sm:inline">
                        📶 Ping 28ms
                      </span>
                    </div>

                    {/* Opponent HP bar */}
                    <div className="flex items-center gap-2 max-w-xs">
                      <span className="text-[9px] font-mono text-slate-300 font-bold shrink-0">
                        HP: {oppPlayerObj?.hp || 0}/300
                      </span>
                      <div className="flex-1 bg-slate-900 h-2.5 rounded-full overflow-hidden border border-white/10">
                        <div
                          className="bg-gradient-to-r from-red-600 to-rose-400 h-full transition-all duration-300"
                          style={{ width: `${Math.max(0, ((oppPlayerObj?.hp || 0) / 300) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Prominent Surrender Button */}
                <button
                  onClick={handleSurrender}
                  className="py-2 px-3 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:brightness-125 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_15px_rgba(225,29,72,0.6)] border border-rose-400 flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
                >
                  <Flag className="w-3.5 h-3.5 animate-pulse" />
                  <span>ĐẦU HÀNG</span>
                </button>
              </div>

              {/* 2. CENTER BATTLE ARENA FIELD: Opponent Active Card -> Skill Animation Zone -> Your Active Card */}
              <div className="bg-gradient-to-b from-purple-950/20 via-black to-slate-950 border border-purple-500/30 rounded-2xl p-3 space-y-3 relative overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                
                {/* OPPONENT ACTIVE CARD */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Swords className="w-3 h-3 text-rose-500" /> THẺ ĐỐI THỦ (Active Card)
                  </span>
                  
                  <div className={`p-2 rounded-xl border bg-black/80 relative overflow-hidden flex flex-col items-center justify-between space-y-1 w-32 sm:w-36 transition-all cursor-pointer ${
                    oppActiveCard?.rarity === 'SS'
                      ? 'ss-card-glow ss-card-3d-hover text-white ring-2 ring-amber-300'
                      : oppActiveCard?.rarity === 'S'
                      ? 's-card-glow card-3d-hover text-white ring-1 ring-orange-400'
                      : oppActiveCard?.rarity === 'A'
                      ? 'a-card-glow card-3d-hover text-white ring-1 ring-purple-400'
                      : roomData?.turn === oppPlayerKey && isAttacking
                      ? 'animate-attack-slash card-3d-hover ring-2 ring-rose-400'
                      : 'card-3d-hover border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  }`}>
                    <RenderRarityParticles rarity={oppActiveCard?.rarity} />
                    {/* Floating Damage Overlay for Opponent */}
                    {damageFloats.filter((f) => f.target === oppPlayerKey).map((f) => (
                      <div
                        key={f.id}
                        className="absolute -top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-float-damage font-black font-mono text-base text-red-500 drop-shadow-[0_0_12px_rgba(255,0,0,1)] tracking-wider flex items-center gap-1 bg-black/90 px-2 py-0.5 rounded-full border border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                      >
                        <span>💥 -{f.damage}</span>
                        {f.isCritical && <span className="text-[8px] text-yellow-300 font-bold uppercase">CRIT!</span>}
                      </div>
                    ))}

                    <div className="flex items-center justify-between w-full relative z-10 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/30">
                      <span className="text-[8px] font-bold text-rose-300 uppercase truncate">
                        {oppActiveCard?.name || 'Thẻ Đối Thủ'}
                      </span>
                      <span className={`text-[7px] px-1 py-0.2 rounded border uppercase font-mono ${getRarityBadgeStyle(oppActiveCard?.rarity || 'C')}`}>
                        {oppActiveCard?.rarity || 'C'}
                      </span>
                    </div>

                    <div className="aspect-[3/4] h-24 sm:h-28 w-full rounded-lg overflow-hidden bg-slate-950 border border-rose-500/30 flex items-center justify-center relative z-10">
                      <img
                        src={oppActiveCard?.avatarUrl}
                        alt={oppActiveCard?.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getCardImageSvg(oppActiveCard?.id || 'c1');
                        }}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <span className="text-[8.5px] font-mono text-yellow-400 font-bold block">ATK: {oppActiveCard?.atk} | DEF: {oppActiveCard?.def}</span>
                  </div>
                </div>

                {/* ⚔ KHU VỰC ANIMATION KỸ NĂNG, COMBOS & DAMAGE FLOATS */}
                <div className="p-2.5 bg-black/80 border border-cyan-500/30 rounded-xl text-center space-y-1 relative min-h-[50px] flex flex-col items-center justify-center overflow-hidden">
                  {/* Combo Synergy Badge */}
                  {(() => {
                    const activeCombo = getComboEffect(currentSelectedCard, myHand);
                    if (!activeCombo) return null;
                    return (
                      <div className="animate-bounce">
                        <span className="px-3 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 text-black font-black text-[10px] uppercase font-mono border border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.8)]">
                          🔥 COMBO: {activeCombo.badge} (+{Math.round((activeCombo.dmgMult - 1) * 100)}% DMG)
                        </span>
                      </div>
                    );
                  })()}

                  <p className="text-[10px] font-mono text-cyan-200 leading-relaxed max-w-lg mx-auto">
                    {roomData?.combatLogs?.[(roomData?.combatLogs?.length || 0) - 1] || '⚔️ Đấu Trường đã sẵn sàng... Hãy chọn kỹ năng tấn công!'}
                  </p>
                </div>

                {/* YOUR ACTIVE CARD */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono font-bold text-cyan-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" /> THẺ CỦA BẠN (Active Card)
                  </span>

                  <div className={`p-2 rounded-xl border bg-black/80 relative overflow-hidden flex flex-col items-center justify-between space-y-1 w-32 sm:w-36 transition-all cursor-pointer ${
                    myActiveCard?.rarity === 'SS'
                      ? 'ss-card-glow ss-card-3d-hover text-white ring-2 ring-amber-300'
                      : myActiveCard?.rarity === 'S'
                      ? 's-card-glow card-3d-hover text-white ring-1 ring-orange-400'
                      : myActiveCard?.rarity === 'A'
                      ? 'a-card-glow card-3d-hover text-white ring-1 ring-purple-400'
                      : roomData?.turn === myPlayerKey && isAttacking
                      ? 'animate-attack-slash card-3d-hover ring-2 ring-cyan-400'
                      : 'card-3d-hover border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                  }`}>
                    <RenderRarityParticles rarity={myActiveCard?.rarity} />
                    {/* Floating Damage Overlay for Player */}
                    {damageFloats.filter((f) => f.target === myPlayerKey).map((f) => (
                      <div
                        key={f.id}
                        className="absolute -top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-float-damage font-black font-mono text-base text-red-500 drop-shadow-[0_0_12px_rgba(255,0,0,1)] tracking-wider flex items-center gap-1 bg-black/90 px-2 py-0.5 rounded-full border border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                      >
                        <span>💥 -{f.damage}</span>
                        {f.isCritical && <span className="text-[8px] text-yellow-300 font-bold uppercase">CRIT!</span>}
                      </div>
                    ))}

                    <div className="flex items-center justify-between w-full relative z-10 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                      <span className="text-[8px] font-bold text-cyan-300 uppercase truncate">
                        {myActiveCard?.name || 'Thẻ Của Bạn'}
                      </span>
                      <span className={`text-[7px] px-1 py-0.2 rounded border uppercase font-mono ${getRarityBadgeStyle(myActiveCard?.rarity || 'C')}`}>
                        {myActiveCard?.rarity || 'C'}
                      </span>
                    </div>

                    <div className="aspect-[3/4] h-24 sm:h-28 w-full rounded-lg overflow-hidden bg-slate-950 border border-cyan-500/30 flex items-center justify-center relative z-10">
                      <img
                        src={myActiveCard?.avatarUrl}
                        alt={myActiveCard?.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getCardImageSvg(myActiveCard?.id || 'c1');
                        }}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <span className="text-[8.5px] font-mono text-yellow-400 font-bold block">ATK: {myActiveCard?.atk} | DEF: {myActiveCard?.def}</span>
                  </div>
                </div>

              </div>

              {/* 3. YOUR STATUS & 5 HAND CARDS SELECTION AREA */}
              <div className="bg-slate-950/90 border border-cyan-500/40 rounded-xl p-3 space-y-2 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                
                {/* HP, Energy, Shield Bar */}
                <div className="space-y-1 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <img src={myPlayerObj?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} alt="" className="w-6 h-6 rounded-full border border-cyan-400 object-cover" />
                      <span className="font-bold text-white uppercase">{myPlayerObj?.name || 'Bạn'} (BẠN)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 font-black text-xs">⚡ {myEnergy}/5 NL</span>
                      {myPlayerObj?.shield > 0 && <span className="text-blue-400 text-xs font-black">🛡️ {myPlayerObj?.shield}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-300 font-bold shrink-0">HP BẠN: {myPlayerObj?.hp || 0}/300</span>
                    <div className="flex-1 bg-slate-900 h-2.5 rounded-full overflow-hidden border border-white/10">
                      <div
                        className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-300 h-full transition-all duration-300"
                        style={{ width: `${Math.max(0, ((myPlayerObj?.hp || 0) / 300) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 5 HAND CARDS SELECTION ROW */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-300">
                    <span className="font-bold text-cyan-300 uppercase flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" /> [Card1][Card2][Card3][Card4][Card5] THẺ TRÊN TAY
                    </span>
                    <span className="text-[8px] text-slate-400 font-bold">Chạm để đổi bài</span>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1.5 pt-1 px-0.5 snap-x scrollbar-thin scrollbar-thumb-cyan-500/50">
                    {myHand.map((card: any, idx: number) => {
                      const isUsed = card.used;
                      const isSelected = activeCardIdx === idx;
                      const isEnergyLocked = myEnergy < card.energyCost;

                      return (
                        <div
                          key={card.instanceId || `my_card_${idx}`}
                          className="w-20 sm:w-24 shrink-0 snap-center relative"
                        >
                          <div
                            onClick={() => !isUsed && handleSelectCard(idx)}
                            role="button"
                            tabIndex={isUsed ? -1 : 0}
                            className={`w-full p-1.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-between select-none ${
                              isUsed
                                ? 'opacity-30 grayscale border-slate-800 bg-slate-950 pointer-events-none'
                                : isSelected
                                ? 'bg-gradient-to-b from-purple-900/60 to-black border-cyan-300 text-white ring-2 ring-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.8)] scale-[1.03] card-3d-hover'
                                : card.rarity === 'SS'
                                ? 'ss-card-glow ss-card-3d-hover bg-slate-950 text-white ring-1 ring-amber-300'
                                : card.rarity === 'S'
                                ? 's-card-glow card-3d-hover bg-slate-950 text-white ring-1 ring-orange-400'
                                : card.rarity === 'A'
                                ? 'a-card-glow card-3d-hover bg-slate-950 text-white ring-1 ring-purple-400'
                                : 'bg-black/80 border-white/10 text-slate-400 hover:border-cyan-400/50 card-3d-hover'
                            }`}
                          >
                            <RenderRarityParticles rarity={card.rarity} />
                            <span className={`absolute top-0.5 right-0.5 z-20 text-[6.5px] px-1 py-0.2 rounded border uppercase font-mono ${getRarityBadgeStyle(card.rarity || 'C')}`}>
                              {card.rarity || 'C'}
                            </span>

                            <div className="aspect-[3/4] h-16 sm:h-20 w-full rounded-lg overflow-hidden bg-slate-950 mb-0.5 flex items-center justify-center relative">
                              <img
                                src={card.avatarUrl}
                                alt={card.name}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getCardImageSvg(card.id);
                                }}
                                className="w-full h-full object-contain"
                              />
                            </div>

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

                {/* READ CARD SKILL DESCRIPTION */}
                <div className="p-2.5 bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 border border-cyan-500/40 rounded-xl text-[10px] font-mono space-y-1">
                  <div className="flex items-center justify-between text-yellow-300 font-bold">
                    <span>📖 Đọc kỹ năng thẻ: {currentSelectedCard?.skillName}</span>
                    <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-[9px]">
                      Tốn: {currentSelectedCard?.energyCost || 2} NL
                    </span>
                  </div>
                  <p className="text-slate-300 text-[9.5px] leading-relaxed">
                    {currentSelectedCard?.skillDesc}
                  </p>
                </div>

                {/* 4 MAIN ACTION BUTTONS: [⚔ Đánh] [✨ Skill] [🔄 Đổi bài] [⏭ Kết thúc lượt] */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    onClick={handleNormalAttack}
                    disabled={!isMyTurn || isAttacking || currentSelectedCard?.used}
                    className={`py-2.5 px-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isMyTurn && !currentSelectedCard?.used
                        ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:brightness-125 text-white shadow-[0_0_15px_rgba(255,0,60,0.5)] active:scale-95'
                        : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5" /> ⚔️ Đánh
                  </button>

                  <button
                    onClick={handleUseSkill}
                    disabled={!isMyTurn || isAttacking || currentSelectedCard?.used || myEnergy < (currentSelectedCard?.energyCost || 2)}
                    className={`py-2.5 px-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isMyTurn && !currentSelectedCard?.used && myEnergy >= (currentSelectedCard?.energyCost || 2)
                        ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:brightness-125 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-95'
                        : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" /> ✨ Skill ({currentSelectedCard?.energyCost || 2} NL)
                  </button>

                  <button
                    onClick={handleSwapActiveCard}
                    disabled={!isMyTurn || isAttacking}
                    className={`py-2.5 px-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isMyTurn
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-125 text-white shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-95'
                        : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> 🔄 Đổi bài
                  </button>

                  <button
                    onClick={handleEndTurn}
                    disabled={!isMyTurn || isAttacking}
                    className={`py-2.5 px-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isMyTurn
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-125 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] active:scale-95'
                        : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" /> ⏭ Kết thúc lượt
                  </button>
                </div>

              </div>

              {/* 4. BOTTOM MULTI-TAB PANEL: Log trận | Combo | Buff | Chat */}
              <div className="bg-slate-950/90 border border-cyan-500/40 rounded-xl p-3 space-y-2">
                <div className="flex border-b border-cyan-500/30 gap-1 pb-1.5 overflow-x-auto">
                  <button
                    onClick={() => setBattleTab('log')}
                    className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs transition cursor-pointer shrink-0 ${
                      battleTab === 'log' ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,240,255,0.5)]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📜 Log trận
                  </button>
                  <button
                    onClick={() => setBattleTab('combo')}
                    className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs transition cursor-pointer shrink-0 ${
                      battleTab === 'combo' ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔥 Combo
                  </button>
                  <button
                    onClick={() => setBattleTab('buff')}
                    className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs transition cursor-pointer shrink-0 ${
                      battleTab === 'buff' ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🛡️ Buff
                  </button>
                  <button
                    onClick={() => setBattleTab('chat')}
                    className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs transition cursor-pointer shrink-0 ${
                      battleTab === 'chat' ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    💬 Chat ({chatMessages.length})
                  </button>
                </div>

                {/* TAB 1: LOG TRẬN */}
                {battleTab === 'log' && (
                  <div className="h-28 overflow-y-auto space-y-1 text-[10px] font-mono pr-1 scrollbar-thin scrollbar-thumb-cyan-500/30">
                    {roomData?.combatLogs?.length > 0 ? (
                      roomData.combatLogs.map((log: string, idx: number) => (
                        <div key={idx} className="p-1 bg-black/60 rounded border border-white/5 text-slate-300 leading-relaxed">
                          {log}
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-center py-4">Chưa có nhật ký combat...</p>
                    )}
                  </div>
                )}

                {/* TAB 2: COMBO */}
                {battleTab === 'combo' && (
                  <div className="p-2 bg-black/80 rounded-lg text-[10px] font-mono text-slate-200 space-y-1.5">
                    <div className="text-yellow-400 font-bold uppercase">⚡ DANH SÁCH TƯƠNG TÁC COMBO THẺ:</div>
                    <ul className="space-y-1 text-slate-300 leading-tight">
                      <li>• <strong className="text-red-400">Tấn Công + Chức Năng</strong>: 🔥 Lốc Lửa (+30% Sát thương)</li>
                      <li>• <strong className="text-amber-400">Tấn Công + Phòng Thủ</strong>: 🛡️ Phản Pháo (+20% Giáp + 15% Dmg)</li>
                      <li>• <strong className="text-cyan-300">Phòng Thủ + Hỗ Trợ</strong>: ✨ Hồi Phục Bất Tử (+25 HP + Shield)</li>
                      <li>• <strong className="text-purple-400">Thẻ SS Vương Giả</strong>: 👑 Cực Bá Tối Thượng (+50% Dmg)</li>
                    </ul>
                  </div>
                )}

                {/* TAB 3: BUFF */}
                {battleTab === 'buff' && (
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="p-2 bg-cyan-950/60 rounded border border-cyan-500/30 space-y-1">
                      <div className="text-cyan-300 font-bold">BẠN:</div>
                      <div>🛡️ Giáp bảo hộ: {myPlayerObj?.shield || 0}</div>
                      <div>⚡ Năng lượng: {myEnergy}/5 NL</div>
                    </div>
                    <div className="p-2 bg-rose-950/60 rounded border border-rose-500/30 space-y-1">
                      <div className="text-rose-300 font-bold">ĐỐI THỦ:</div>
                      <div>🛡️ Giáp bảo hộ: {oppPlayerObj?.shield || 0}</div>
                      <div>⚡ Năng lượng: {oppPlayerObj?.energy || 0}/5 NL</div>
                    </div>
                  </div>
                )}

                {/* TAB 4: CHAT */}
                {battleTab === 'chat' && (
                  <div className="space-y-2">
                    <div className="h-24 overflow-y-auto space-y-1 text-[10px] font-mono pr-1 scrollbar-thin scrollbar-thumb-cyan-500/30">
                      {chatMessages.length === 0 ? (
                        <p className="text-slate-500 text-center py-4 italic">Chưa có tin nhắn...</p>
                      ) : (
                        chatMessages.map((msg) => (
                          <div key={msg.id} className="p-1 bg-white/5 rounded border border-white/5 flex items-start gap-2">
                            <span className="text-cyan-300 font-bold shrink-0">{msg.sender}:</span>
                            <span className="text-slate-200 flex-1 break-words">{msg.text}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 bg-black/90 border border-cyan-500/30 rounded-xl px-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-cyan-400 font-mono"
                      />
                      <button
                        onClick={handleSendMessage}
                        className="px-4 py-1.5 bg-cyan-500 text-black font-black text-xs rounded-xl transition cursor-pointer font-mono uppercase"
                      >
                        GỬI
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

      </div>

      {/* CRITICAL / COMBO SCREEN FLASH OVERLAY */}
      {criticalFlashType && (
        <div className={`fixed inset-0 z-[95] pointer-events-none ${
          criticalFlashType === 'CYAN'
            ? 'animate-critical-flash-cyan'
            : criticalFlashType === 'GOLD'
            ? 'animate-critical-flash-gold'
            : 'animate-critical-flash-red'
        }`} />
      )}

      {/* COMBO / CRITICAL IMPACT POPUP OVERLAY */}
      {comboPopup && (
        <div className="fixed inset-0 z-[98] pointer-events-none flex flex-col items-center justify-center p-4">
          <div className="animate-combo-pop bg-black/90 border-2 border-yellow-400 p-5 sm:p-7 rounded-3xl text-center space-y-1 shadow-[0_0_80px_rgba(250,204,21,0.9)] backdrop-blur-md">
            <span className="text-3xl sm:text-5xl block animate-bounce">⚡💥🔥</span>
            <h2 className="text-2xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-rose-400 uppercase drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] tracking-wider">
              {comboPopup.title}
            </h2>
            <p className="text-xs sm:text-base font-mono font-bold text-cyan-300 drop-shadow">
              {comboPopup.subtitle}
            </p>
          </div>
        </div>
      )}

      {/* SPECIAL CARD PARTICLES BURST & SCREEN FLASH OVERLAY FOR ALL CONNECTED PLAYERS */}
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

      {/* FULL CARD POOL COMPENDIUM & SKILLS GALLERY MODAL WITH RARITY FILTER */}
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
                    📚 THƯ VIỆN BỘ BÀI TOÀN NĂNG (PHẨM CẤP C, B, A, S, SS)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Xem toàn bộ kho thẻ bài Công, Thủ, Chức năng, Tối thượng và kĩ năng độc quyền
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
                { key: 'ALL', label: `TẤT CẢ (${FULL_CARD_POOL.length})` },
                { key: 'SS', label: '👑 SS - TỐI THƯỢNG CỰC BÁ' },
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
                  className={`p-2.5 rounded-xl space-y-2 transition-all flex flex-col justify-between group relative cursor-pointer overflow-hidden ${
                    card.rarity === 'SS'
                      ? 'bg-slate-950 ss-card-glow ss-card-3d-hover text-white ring-1 ring-amber-300'
                      : card.rarity === 'S'
                      ? 'bg-slate-950 s-card-glow card-3d-hover text-white ring-1 ring-orange-400'
                      : card.rarity === 'A'
                      ? 'bg-slate-950 a-card-glow card-3d-hover text-white ring-1 ring-purple-400'
                      : 'bg-slate-950 border border-white/10 card-3d-hover hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                  }`}
                >
                  <RenderRarityParticles rarity={card.rarity} />
                  {card.rarity === 'SS' && <div className="ss-shimmer-overlay" />}

                  {/* Rarity Badge */}
                  <span className={`absolute top-3 right-3 z-10 text-[8px] px-1.5 py-0.5 rounded uppercase font-mono ${getRarityBadgeStyle(card.rarity || 'C')}`}>
                    {card.rarityName || card.rarity}
                  </span>

                  <div className="aspect-[3/4] h-32 w-full rounded-lg overflow-hidden bg-black/60 border border-white/5 flex items-center justify-center relative">
                    <img
                      src={card.avatarUrl}
                      alt={card.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getCardImageSvg(card.id);
                      }}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
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
            <div className={`aspect-[3/4] h-48 sm:h-56 w-full mx-auto rounded-xl overflow-hidden bg-slate-950 relative shadow-inner flex items-center justify-center ${
              inspectedCard.rarity === 'SS'
                ? 'ss-card-glow ring-2 ring-amber-300 border-amber-200'
                : inspectedCard.rarity === 'S'
                ? 's-card-glow ring-2 ring-orange-400 border-orange-300'
                : inspectedCard.rarity === 'A'
                ? 'a-card-glow ring-2 ring-purple-400 border-purple-300'
                : 'border border-cyan-500/40'
            }`}>
              <RenderRarityParticles rarity={inspectedCard.rarity} />
              {inspectedCard.rarity === 'SS' && <div className="ss-shimmer-overlay" />}

              <img
                src={inspectedCard.avatarUrl}
                alt={inspectedCard.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getCardImageSvg(inspectedCard.id);
                }}
                className="w-full h-full object-contain"
              />
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

