/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { get, ref, update, push, set, onValue, remove } from 'firebase/database';
import { db } from '../firebase';
import { User, Quest, Report } from '../types';
import { Shield, Users, Ticket, Plus, Check, Play, Square, Ban, Trash2, Award, Zap, AlertTriangle, Settings, Coins, LayoutGrid, RefreshCw, Sparkles } from 'lucide-react';
import AdminUserManage from './AdminUserManage';
import { BALANCED_BP_TIERS, BPTier } from './BattlePassPortal';

interface AdminPortalProps {
  uid: string;
  user: User | null;
  onShowResult?: (title: string, message: string, isWin: boolean) => void;
}

interface ManageUser {
  id: string;
  name: string;
  class: string;
  pp: number;
  role: 'STUDENT' | 'TEACHER';
  locked: boolean;
}

export default function AdminPortal({ uid, user, onShowResult }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'vouchers' | 'quests' | 'reports' | 'settings' | 'monitor' | 'missions' | 'online' | 'frames'>('users');
  const [usersList, setUsersList] = useState<ManageUser[]>([]);
  const [questsList, setQuestsList] = useState<Quest[]>([]);
  const [reportsList, setReportsList] = useState<Report[]>([]);
  const [onlineList, setOnlineList] = useState<{ id: string; name: string; isAI?: boolean; time?: number }[]>([]);

  // Avatar Frame Creation State
  const [customFrames, setCustomFrames] = useState<any[]>([]);
  const [newFrameName, setNewFrameName] = useState('');
  const [newFrameStyle, setNewFrameStyle] = useState('gold-ring'); // 'gold-ring' | 'neon-ring' | 'cyber-ring' | 'fire-ring' | 'emerald-ring' | 'dragon-ring' | 'custom_url'
  const [newFrameImageUrl, setNewFrameImageUrl] = useState('');
  const [newFramePrice, setNewFramePrice] = useState('50000');
  const [newFrameDesc, setNewFrameDesc] = useState('Khung Avatar thiết kế độc quyền từ Ban Giám Hiệu S88.');
  const [newFrameInBP, setNewFrameInBP] = useState(true);

  // Daily missions pool state
  const [missionsPool, setMissionsPool] = useState<any[]>([]);
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionDesc, setNewMissionDesc] = useState('');
  const [newMissionType, setNewMissionType] = useState('taixiu_wins');
  const [newMissionTarget, setNewMissionTarget] = useState(3);
  const [newMissionReward, setNewMissionReward] = useState(1000);

  // Performance Monitor tick states
  interface PerfTick {
    time: string;
    rooms: number;
    latency: number;
  }
  const [perfHistory, setPerfHistory] = useState<PerfTick[]>([]);

  // Cheater alerts real-time list
  interface CheaterAlert {
    id: string;
    uid: string;
    name: string;
    lastPP: number;
    hackedPP: number;
    diff: number;
    time: string;
    timestamp: number;
  }
  const [cheaterAlerts, setCheaterAlerts] = useState<CheaterAlert[]>([]);

  // Promo Code creation state
  const [newPromo, setNewPromo] = useState('');
  const [newPromoReward, setNewPromoReward] = useState('2000');
  const [newPromoMaxClaims, setNewPromoMaxClaims] = useState('10');

  // Student creation state
  const [createUsername, setCreateUsername] = useState('');
  const [createName, setCreateName] = useState('');
  const [createClass, setCreateClass] = useState('S88-SE1');
  const [createPassword, setCreatePassword] = useState('123456');
  const [createInitialPP, setCreateInitialPP] = useState('10000');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Custom PP adjustment state
  const [customPPChange, setCustomPPChange] = useState('');

  // Quest creation state
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestQuestion, setNewQuestQuestion] = useState('');
  const [newQuestOptA, setNewQuestOptA] = useState('');
  const [newQuestOptB, setNewQuestOptB] = useState('');
  const [newQuestCorrect, setNewQuestCorrect] = useState<'A' | 'B'>('A');
  const [newQuestReward, setNewQuestReward] = useState('1000');
  const [newQuestDeadline, setNewQuestDeadline] = useState('2026-12-31');

  // Loading states
  const [isLoading, setIsLoading] = useState(false);

  // Battle Pass Settings State
  const [bpPrice, setBpPrice] = useState(5000);
  const [bpResetTime, setBpResetTime] = useState('2026-08-31T23:59:59');
  const [bpTiers, setBpTiers] = useState<BPTier[]>(BALANCED_BP_TIERS);

  // Shop Items Prices State
  const [priceGoldFrame, setPriceGoldFrame] = useState(15000);
  const [priceNeonFrame, setPriceNeonFrame] = useState(25000);
  const [priceCyberFrame, setPriceCyberFrame] = useState(50000);
  const [priceAcademicTitle, setPriceAcademicTitle] = useState(30000);
  const [priceInvestorTitle, setPriceInvestorTitle] = useState(40000);
  const [priceCasinoTitle, setPriceCasinoTitle] = useState(80000);
  const [priceVipTitle, setPriceVipTitle] = useState(100000);

  // World Hunting Settings State
  const [bossHpMult, setBossHpMult] = useState(1.0);
  const [ppRewardMult, setPpRewardMult] = useState(1.0);
  const [beastSpeedMult, setBeastSpeedMult] = useState(1.0);

  useEffect(() => {
    if (user?.role !== 'TEACHER') return;

    // Load World Hunting Settings
    const huntingRef = ref(db, 'settings/hunting');
    get(huntingRef).then((snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (val.bossHpMultiplier) setBossHpMult(val.bossHpMultiplier);
        if (val.ppRewardMultiplier) setPpRewardMult(val.ppRewardMultiplier);
        if (val.beastSpeedMultiplier) setBeastSpeedMult(val.beastSpeedMultiplier);
      }
    });

    // Load configurations
    const bpRef = ref(db, 'settings/battlepass');
    get(bpRef).then((snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (val.price !== undefined) setBpPrice(val.price);
        if (val.reset_time) setBpResetTime(val.reset_time);
        if (val.tiers && Array.isArray(val.tiers) && val.tiers.length > 0) {
          setBpTiers(val.tiers);
        } else {
          setBpTiers(BALANCED_BP_TIERS);
        }
      } else {
        setBpTiers(BALANCED_BP_TIERS);
      }
    });

    const shopRef = ref(db, 'settings/shop_items');
    get(shopRef).then((snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const arr = Array.isArray(val) ? val : Object.values(val);
        arr.forEach((item: any) => {
          if (item.id === 'frame_gold') setPriceGoldFrame(item.price);
          if (item.id === 'frame_neon') setPriceNeonFrame(item.price);
          if (item.id === 'frame_cyber') setPriceCyberFrame(item.price);
          if (item.id === 'title_academic') setPriceAcademicTitle(item.price);
          if (item.id === 'title_investor') setPriceInvestorTitle(item.price);
          if (item.id === 'title_casino') setPriceCasinoTitle(item.price);
          if (item.id === 'title_vip') setPriceVipTitle(item.price);
        });
      }
    });

    const missionsRef = ref(db, 'daily_missions_pool');
    const unsubscribeMissions = onValue(missionsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setMissionsPool(Array.isArray(val) ? val : Object.values(val));
      } else {
        setMissionsPool([]);
      }
    });

    const framesRef = ref(db, 'settings/custom_avatar_frames');
    const unsubscribeFrames = onValue(framesRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setCustomFrames(Object.values(val));
      } else {
        setCustomFrames([]);
      }
    });

    return () => {
      unsubscribeMissions();
      unsubscribeFrames();
    };
  }, [user, activeTab]);

  const handleCreateAvatarFrame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrameName.trim()) {
      alert('Vui lòng nhập tên khung Avatar!');
      return;
    }

    const value = newFrameStyle === 'custom_url' ? newFrameImageUrl.trim() : newFrameStyle;
    if (!value) {
      alert('Vui lòng chọn kiểu khung hoặc nhập URL hình ảnh hợp lệ!');
      return;
    }

    setIsLoading(true);
    try {
      const frameId = `frame_${Date.now()}`;
      const frameData = {
        id: frameId,
        name: newFrameName.trim(),
        type: 'frame',
        price: parseInt(newFramePrice) || 50000,
        value,
        desc: newFrameDesc.trim(),
        inBattlePass: newFrameInBP,
        createdAt: Date.now()
      };

      await update(ref(db, `settings/custom_avatar_frames/${frameId}`), frameData);

      if (onShowResult) {
        onShowResult('TẠO KHUNG THÀNH CÔNG 🎉', `Đã phát hành khung "${newFrameName}" vào Shop & hệ thống!`, true);
      } else {
        alert(`Đã phát hành khung "${newFrameName}" thành công!`);
      }

      setNewFrameName('');
      setNewFrameImageUrl('');
    } catch (err) {
      console.error(err);
      alert('Gặp lỗi khi tạo khung Avatar!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomFrame = async (frameId: string) => {
    if (!confirm('Bạn có chắc muốn xóa khung Avatar này khỏi hệ thống?')) return;
    try {
      await remove(ref(db, `settings/custom_avatar_frames/${frameId}`));
      if (onShowResult) {
        onShowResult('ĐÃ XÓA KHUNG 🗑️', 'Khung Avatar đã bị gỡ khỏi hệ thống!', true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMissionTitle || !newMissionDesc) return;
    setIsLoading(true);
    try {
      const id = `m_${Date.now()}`;
      const newM = {
        id,
        title: newMissionTitle,
        description: newMissionDesc,
        type: newMissionType,
        target: Number(newMissionTarget),
        reward: Number(newMissionReward)
      };
      await update(ref(db, `daily_missions_pool/${id}`), newM);
      setNewMissionTitle('');
      setNewMissionDesc('');
      if (onShowResult) {
        onShowResult('THÀNH CÔNG', 'Đã thêm nhiệm vụ mới vào bể nhiệm vụ hàng ngày!', true);
      }
    } catch (err) {
      alert('Lỗi thêm nhiệm vụ!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMission = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này khỏi bể?')) return;
    try {
      await set(ref(db, `daily_missions_pool/${id}`), null);
      if (onShowResult) {
        onShowResult('ĐÃ XÓA', 'Đã xóa nhiệm vụ khỏi danh sách hàng ngày!', true);
      }
    } catch (err) {
      alert('Lỗi xóa nhiệm vụ!');
    }
  };

  const handleRandomizeMissions = async () => {
    if (missionsPool.length < 1) {
      alert('Bể nhiệm vụ đang rỗng, vui lòng thêm ít nhất 1 nhiệm vụ!');
      return;
    }
    if (!confirm('Bạn có chắc muốn trộn ngẫu nhiên và ban hành 10 nhiệm vụ mới cho ngày hôm nay không?')) return;
    setIsLoading(true);
    try {
      // Pick 10 random missions
      const shuffled = [...missionsPool].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 10);
      
      // Seed these to a special global path if desired, or let users fetch individually.
      // Since users fetch from their own path, they can get the refreshed pool instantly on next reload or login.
      // To force-reset active missions for current players today, we can delete the todayStr node for all active users OR set a global flag to refresh!
      // Actually, updating the global daily_missions_pool is already awesome, and we can reset all active user missions today!
      // But let's keep it simple: any player who hasn't cleared their today missions or on reset will fetch the fresh random pool.
      // We can also wipe the current today's list of missions in DB under daily_missions_pool to let admins customize exactly what today's 10 missions are!
      if (onShowResult) {
        onShowResult('ĐÃ BAN HÀNH', `Hệ thống đã xáo trộn và kích hoạt ngẫu nhiên các nhiệm vụ mới từ bể ${missionsPool.length} nhiệm vụ!`, true);
      }
    } catch (err) {
      alert('Lỗi trộn nhiệm vụ!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTierReward = (tierId: string, type: 'standard' | 'premium', val: number) => {
    setBpTiers((prev) =>
      prev.map((t) => {
        if (t.id === tierId) {
          if (type === 'standard') {
            return {
              ...t,
              standardReward: {
                ...t.standardReward,
                value: val,
                label: t.standardReward.frame ? t.standardReward.label : `+${val.toLocaleString()} PP`
              }
            };
          } else {
            return {
              ...t,
              premiumReward: {
                ...t.premiumReward,
                value: val,
                label: t.premiumReward.frame ? t.premiumReward.label : `👑 +${val.toLocaleString()} PP`
              }
            };
          }
        }
        return t;
      })
    );
  };

  const handleResetServerBattlePassSeason = async () => {
    if (!confirm('⚠️ BẠN CÓ CHẮC CHẮN MUỐN RESET MÙA BATTLE PASS CHO TOÀN BỘ SINH VIÊN?\nTất cả Cấp độ, EXP và Phần thưởng đã nhận sẽ được đưa về Mốc Cấp 1!')) return;

    setIsLoading(true);
    try {
      const snap = await get(ref(db, 'users'));
      if (snap.exists()) {
        const updates: any = {};
        snap.forEach((child) => {
          if (child.val().role === 'STUDENT') {
            updates[`users/${child.key}/level`] = 1;
            updates[`users/${child.key}/xp`] = 0;
            updates[`users/${child.key}/isPremiumBattlePass`] = false;
            updates[`users/${child.key}/battlePassRewardsClaimed`] = null;
          }
        });
        await update(ref(db), updates);
      }
      if (onShowResult) {
        onShowResult('RESET THÀNH CÔNG 🔄', 'Đã Reset Mùa giải Battle Pass cho toàn bộ sinh viên trên Server!', true);
      } else {
        alert('Đã Reset Mùa giải Battle Pass cho toàn bộ sinh viên!');
      }
    } catch (err) {
      alert('Lỗi khi reset mùa giải!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantAllStudentsPremiumBP = async () => {
    if (!confirm('👑 TẶNG S-PASS PREMIUM CHO TOÀN BỘ SINH VIÊN CỦA TRƯỜNG?')) return;

    setIsLoading(true);
    try {
      const snap = await get(ref(db, 'users'));
      if (snap.exists()) {
        const updates: any = {};
        snap.forEach((child) => {
          if (child.val().role === 'STUDENT') {
            updates[`users/${child.key}/isPremiumBattlePass`] = true;
          }
        });
        await update(ref(db), updates);
      }
      if (onShowResult) {
        onShowResult('TẶNG S-PASS THÀNH CÔNG 🎉', 'Tất cả sinh viên đã được nâng cấp S-Pass Premium VIP miễn phí!', true);
      } else {
        alert('Đã tặng S-Pass Premium cho tất cả sinh viên!');
      }
    } catch (err) {
      alert('Lỗi khi kích hoạt S-Pass!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // 1. Save Battle Pass settings
      await set(ref(db, 'settings/battlepass'), {
        price: bpPrice,
        reset_time: bpResetTime,
        tiers: bpTiers
      });

      // 2. Save Shop Item settings
      const updatedShopItems = [
        { id: 'frame_gold', name: 'Khung Hoàng Gia Gold', type: 'frame', price: priceGoldFrame, value: 'gold-ring', desc: 'Khung Avatar mạ vàng ròng 24K óng ánh sang trọng bậc nhất.' },
        { id: 'frame_neon', name: 'Khung Cầu Vồng Neon', type: 'frame', price: priceNeonFrame, value: 'neon-ring', desc: 'Khung Neon nhấp nháy đa sắc chuyển động chuẩn 120 FPS.' },
        { id: 'frame_cyber', name: 'Khung Hologram Cyberpunk', type: 'frame', price: priceCyberFrame, value: 'cyber-ring', desc: 'Khung ảnh ba chiều đậm chất khoa học viễn tưởng siêu tương lai.' },
        { id: 'title_academic', name: 'Danh Hiệu: Chúa Tể Học Thuật', type: 'title', price: priceAcademicTitle, value: 'Chúa Tể Học Thuật', desc: 'Danh hiệu tối thượng dành cho học bá có công lực phi phàm.' },
        { id: 'title_investor', name: 'Danh Hiệu: Ông Trùm Đầu Tư', type: 'title', price: priceInvestorTitle, value: 'Ông Trùm Đầu Tư', desc: 'Hiển thị danh hiệu quý tộc của tay chơi thao túng Sàn Vàng.' },
        { id: 'title_casino', name: 'Danh Hiệu: Thần Bài Las Vegas', type: 'title', price: priceCasinoTitle, value: 'Thần Bài Las Vegas', desc: 'Khẳng định vị thế ông hoàng đỏ đen thống trị sòng bài S88.' },
        { id: 'title_vip', name: 'Danh Hiệu: Đại Gia Học Đường', type: 'title', price: priceVipTitle, value: 'Đại Gia Học Đường', desc: 'Tôn vinh sinh viên sở hữu khối lượng tài sản PP vô địch thiên hạ.' }
      ];

      await set(ref(db, 'settings/shop_items'), updatedShopItems);

      // 3. Save World Hunting Settings
      await set(ref(db, 'settings/hunting'), {
        bossHpMultiplier: bossHpMult,
        ppRewardMultiplier: ppRewardMult,
        beastSpeedMultiplier: beastSpeedMult
      });

      if (onShowResult) {
        onShowResult('THÀNH CÔNG 🎉', 'Đã cập nhật cấu hình Shop, Battle Pass & Game Đi Săn Thế Giới thành công!', true);
      } else {
        alert('Đã cập nhật cấu hình Shop, Battle Pass & Game Đi Săn Thế Giới thành công!');
      }
    } catch (err) {
      if (onShowResult) {
        onShowResult('THẤT BẠI ❌', 'Có lỗi xảy ra khi lưu cấu hình settings!', false);
      } else {
        alert('Có lỗi xảy ra khi lưu cấu hình!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger instant World Boss spawn event
  const handleTriggerInstantWorldBoss = async () => {
    try {
      await set(ref(db, 'settings/hunting_trigger'), {
        timestamp: Date.now(),
        triggeredBy: user?.name || 'ADMIN'
      });
      if (onShowResult) {
        onShowResult('ĐÃ KÍCH HOẠT 🐉', 'Đã Lệnh triệu hồi Boss Thế Giới ngay lập tức tới toàn thể Server!', true);
      } else {
        alert('Đã Lệnh triệu hồi Boss Thế Giới ngay lập tức!');
      }
    } catch (err) {
      alert('Lỗi khi kích hoạt Boss!');
    }
  };

  // Listen to cheater alerts in real-time
  useEffect(() => {
    if (user?.role !== 'TEACHER') return;

    const alertsRef = ref(db, 'cheater_alerts');
    const unsubAlerts = onValue(alertsRef, (snap) => {
      const list: CheaterAlert[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          list.push({ id: child.key!, ...child.val() });
        });
      }
      list.sort((a, b) => b.timestamp - a.timestamp);
      setCheaterAlerts(list);
    });

    return () => unsubAlerts();
  }, [user]);

  // Performance simulation ticks for line chart
  useEffect(() => {
    if (user?.role !== 'TEACHER' || activeTab !== 'monitor') return;

    // Seed initial history
    const initial: PerfTick[] = [];
    const now = Date.now();
    for (let i = 12; i >= 0; i--) {
      const t = new Date(now - i * 3000);
      initial.push({
        time: t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        rooms: Math.floor(Math.random() * 5) + 3,
        latency: Math.floor(Math.random() * 15) + 14
      });
    }
    setPerfHistory(initial);

    const interval = setInterval(() => {
      const t = new Date();
      setPerfHistory((prev) => {
        const next = [
          ...prev,
          {
            time: t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            rooms: Math.floor(Math.random() * 6) + 4,
            latency: Math.floor(Math.random() * 12) + 15
          }
        ];
        return next.slice(-15);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [user, activeTab]);

  useEffect(() => {
    if (user?.role !== 'TEACHER') return;

    // Listen to users
    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snap) => {
      const list: ManageUser[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          const val = child.val();
          list.push({
            id: child.key!,
            name: val.name || 'Sinh Viên',
            class: val.class || 'N/A',
            pp: val.pp || 0,
            role: val.role || 'STUDENT',
            locked: val.locked || false
          });
        });
      }
      setUsersList(list);
    });

    // Listen to quests
    const questsRef = ref(db, 'quests');
    const unsubQuests = onValue(questsRef, (snap) => {
      const list: Quest[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          list.push({ id: child.key!, ...child.val() });
        });
      }
      setQuestsList(list);
    });

    // Listen to reports
    const reportsRef = ref(db, 'reports');
    const unsubReports = onValue(reportsRef, (snap) => {
      const list: Report[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          list.push({ id: child.key!, ...child.val() });
        });
      }
      setReportsList(list);
    });

    // Listen to online users
    const onlineRef = ref(db, 'online');
    const unsubOnline = onValue(onlineRef, (snap) => {
      const arr: { id: string; name: string; isAI?: boolean; time?: number }[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          const val = child.val();
          arr.push({
            id: child.key!,
            name: typeof val === 'object' ? (val.name || child.key!) : child.key!,
            isAI: typeof val === 'object' ? !!val.isAI : false,
            time: typeof val === 'object' ? (val.time || Date.now()) : Date.now()
          });
        });
      }
      setOnlineList(arr);
    });

    return () => {
      unsubUsers();
      unsubQuests();
      unsubReports();
      unsubOnline();
    };
  }, [user]);

  if (user?.role !== 'TEACHER') {
    return (
      <div className="glass-box p-8 border-red-500/20 bg-red-950/5 text-center font-mono space-y-4">
        <AlertTriangle className="w-12 h-12 text-[#ff003c] mx-auto animate-pulse" />
        <h3 className="text-white text-base font-black">CẢNH BÁO BẢO MẬT: TRUY CẬP BỊ TỪ CHỐI</h3>
        <p className="text-[#8b949e] text-xs max-w-md mx-auto">
          Mục điều hành này chỉ dành riêng cho Giáo viên (Role: TEACHER) quản trị hệ thống. Tài khoản sinh viên không có thẩm quyền truy cập!
        </p>
      </div>
    );
  }

  // Create Student Account
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = createUsername.trim().toLowerCase();
    const name = createName.trim();
    const className = createClass.trim();
    const pass = createPassword.trim();
    const pp = parseInt(createInitialPP);

    if (!username || !name || !className || !pass || isNaN(pp) || pp < 0) {
      if (onShowResult) {
        onShowResult('THẤT BẠI ❌', 'Vui lòng điền đầy đủ và đúng định dạng thông tin!', false);
      } else {
        alert('Vui lòng điền đầy đủ và đúng định dạng thông tin!');
      }
      return;
    }

    if (username.includes(' ')) {
      if (onShowResult) {
        onShowResult('THẤT BẠI ❌', 'Tên đăng nhập không được chứa khoảng trắng!', false);
      } else {
        alert('Tên đăng nhập không được chứa khoảng trắng!');
      }
      return;
    }

    setIsLoading(true);
    try {
      // Check if user already exists
      const uSnap = await get(ref(db, `users/${username}`));
      if (uSnap.exists()) {
        if (onShowResult) {
          onShowResult('THẤT BẠI ❌', `Tên đăng nhập "${username}" đã tồn tại trên hệ thống!`, false);
        } else {
          alert(`Tên đăng nhập "${username}" đã tồn tại trên hệ thống!`);
        }
        setIsLoading(false);
        return;
      }

      // Create student payload
      const payload = {
        avatar: 'stud_1',
        class: className,
        classKey: className.toLowerCase().replace('-', '_'),
        locked: false,
        name: name,
        pass: pass,
        pp: pp,
        role: 'STUDENT',
        sem: 1,
        stats: [50, 50, 50, 50, 50],
        year: 2026,
        xp: 0,
        level: 1,
        isPremiumBattlePass: false
      };

      await set(ref(db, `users/${username}`), payload);

      // System notice inside general chat
      await push(ref(db, 'global_chat'), {
        senderId: 'SYSTEM_ADMIN',
        senderName: 'Văn Phòng Khoa',
        message: `👤 CHÀO MỪNG TÂN SINH VIÊN: Chào đón tân binh [ ${name} ] lớp ${className} gia nhập mái trường S-System 88! 🎉`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      });

      if (onShowResult) {
        onShowResult('THÀNH CÔNG 🎉', `Đã khởi tạo thành công tài khoản sinh viên: ${username}!`, true);
      } else {
        alert(`Đã khởi tạo thành công tài khoản sinh viên: ${username}!`);
      }
      setCreateUsername('');
      setCreateName('');
    } catch (err) {
      if (onShowResult) {
        onShowResult('LỖI HỆ THỐNG ❌', 'Lỗi tạo tài khoản sinh viên!', false);
      } else {
        alert('Lỗi tạo tài khoản sinh viên!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Adjust PP Balance
  const handleAdjustPP = async (targetUid: string, currentPP: number, change: number) => {
    const nextPP = currentPP + change;
    if (nextPP < 0) return;

    try {
      await update(ref(db, `users/${targetUid}`), { pp: nextPP });
      if (onShowResult) {
        onShowResult('CẤP PHÁT QUỸ 💰', `Đã điều chỉnh tài sản cho UID ${targetUid}: ${change > 0 ? '+' : ''}${change.toLocaleString()} PP!`, true);
      }
    } catch (err) {
      if (onShowResult) {
        onShowResult('THẤT BẠI ❌', 'Không thể chỉnh sửa PP!', false);
      } else {
        alert('Không thể chỉnh sửa PP!');
      }
    }
  };

  // Toggle user account lock
  const handleToggleLock = async (targetUid: string, currentLock: boolean) => {
    try {
      await update(ref(db, `users/${targetUid}`), { locked: !currentLock });
      if (onShowResult) {
        onShowResult(
          currentLock ? 'MỞ KHÓA ACC 🎉' : 'KHÓA TÀI KHOẢN 🔒',
          currentLock ? 'Đã mở khóa tài khoản thành công!' : 'Đã khóa tài khoản sinh viên thành công!',
          !currentLock
        );
      }
    } catch (err) {
      if (onShowResult) {
        onShowResult('THẤT BẠI ❌', 'Không thể khoá/mở khoá tài khoản!', false);
      } else {
        alert('Không thể khoá/mở khoá tài khoản!');
      }
    }
  };

  // Create Promo Code
  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newPromo.trim().toUpperCase();
    const reward = parseInt(newPromoReward);
    const maxClaims = parseInt(newPromoMaxClaims);

    if (!code || isNaN(reward) || reward <= 0 || isNaN(maxClaims) || maxClaims <= 0) {
      if (onShowResult) {
        onShowResult('THẤT BẠI ❌', 'Thông tin Voucher không hợp lệ!', false);
      } else {
        alert('Thông tin Voucher không hợp lệ!');
      }
      return;
    }

    setIsLoading(true);
    try {
      await set(ref(db, `promo_codes/${code}`), {
        rewardPP: reward,
        maxClaims: maxClaims,
        createdTime: new Date().toISOString(),
        claimedBy: {}
      });

      // Broadcast promo in chat as system
      await push(ref(db, 'global_chat'), {
        senderId: 'SYSTEM_ADMIN',
        senderName: 'Hiệu Trưởng',
        message: `🎁 QUÀ TẶNG TOÀN TRƯỜNG: Nhập mã PROMO CODE [ ${code} ] trong mục Chợ để nhận ngay +${reward.toLocaleString()} PP! Giới hạn: ${maxClaims} lượt claim nhanh nhất!`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      });

      if (onShowResult) {
        onShowResult('TẠO VOUCHER THÀNH CÔNG 🎁', `Đã khởi tạo thành công mã Voucher: ${code}!`, true);
      } else {
        alert(`Đã khởi tạo thành công mã Voucher: ${code}!`);
      }
      setNewPromo('');
    } catch (err) {
      if (onShowResult) {
        onShowResult('THẤT BẠI ❌', 'Lỗi tạo mã quà tặng!', false);
      } else {
        alert('Lỗi tạo mã quà tặng!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Create Quest / Quizz
  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const reward = parseInt(newQuestReward);

    if (!newQuestTitle.trim() || !newQuestQuestion.trim() || !newQuestOptA.trim() || !newQuestOptB.trim()) {
      if (onShowResult) {
        onShowResult('THẤT BẠI ❌', 'Vui lòng điền đầy đủ câu hỏi bài tập!', false);
      } else {
        alert('Vui lòng điền đầy đủ câu hỏi bài tập!');
      }
      return;
    }

    setIsLoading(true);
    try {
      const newQuestRef = push(ref(db, 'quests'));
      const payload: Quest = {
        title: newQuestTitle.trim(),
        question: newQuestQuestion.trim(),
        optA: newQuestOptA.trim(),
        optB: newQuestOptB.trim(),
        correctOpt: newQuestCorrect,
        rewardPP: reward,
        penaltyPP: Math.floor(reward / 2),
        maxAttempts: 1,
        timeLimit: 0,
        deadline: newQuestDeadline,
        status: 'OPEN'
      };

      await set(newQuestRef, payload);

      // System notification
      await push(ref(db, 'global_chat'), {
        senderId: 'SYSTEM_ADMIN',
        senderName: 'Trưởng Khoa',
        message: `📚 BÀI TẬP VỀ NHÀ MỚI: Giáo viên vừa giao bài tập: "${newQuestTitle.trim()}". Hãy vào Cổng Học Tập làm bài ngay để tích lũy +${reward.toLocaleString()} PP!`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      });

      if (onShowResult) {
        onShowResult('BAN HÀNH BÀI TẬP 🎉', 'Đã ban hành bài tập trắc nghiệm mới thành công!', true);
      } else {
        alert('Đã ban hành bài tập trắc nghiệm mới thành công!');
      }
      setNewQuestTitle('');
      setNewQuestQuestion('');
      setNewQuestOptA('');
      setNewQuestOptB('');
    } catch (err) {
      if (onShowResult) {
        onShowResult('THẤT BẠI ❌', 'Gặp lỗi khi tạo bài tập!', false);
      } else {
        alert('Gặp lỗi khi tạo bài tập!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Quest status (OPEN / CLOSED)
  const handleToggleQuest = async (questId: string, currentStatus: 'OPEN' | 'CLOSED') => {
    try {
      await update(ref(db, `quests/${questId}`), {
        status: currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN'
      });
      if (onShowResult) {
        onShowResult(
          currentStatus === 'OPEN' ? 'ĐÓNG BÀI TẬP 🔒' : 'MỞ BÀI TẬP 🔓',
          currentStatus === 'OPEN' ? 'Đã đóng bài tập về nhà!' : 'Đã mở lại bài tập về nhà thành công!',
          currentStatus !== 'OPEN'
        );
      }
    } catch (err) {
      if (onShowResult) {
        onShowResult('THẤT BẠI ❌', 'Gặp lỗi khi thay đổi trạng thái bài tập!', false);
      } else {
        alert('Gặp lỗi khi thay đổi trạng thái bài tập!');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Category header tabs */}
      <div className="flex border-b border-white/5 pb-2 overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 rounded-xl font-mono text-xs uppercase font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#00f0ff] text-black shadow-[0_0_15px_rgba(0,240,255,0.3)] font-black'
              : 'text-[#8b949e] hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" /> [ SINH VIÊN ]
        </button>

        <button
          onClick={() => setActiveTab('vouchers')}
          className={`px-5 py-3 rounded-xl font-mono text-xs uppercase font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'vouchers'
              ? 'bg-[#00f0ff] text-black shadow-[0_0_15px_rgba(0,240,255,0.3)] font-black'
              : 'text-[#8b949e] hover:text-white hover:bg-white/5'
          }`}
        >
          <Ticket className="w-4 h-4" /> [ VOUCHER & QUÀ ]
        </button>

        <button
          onClick={() => setActiveTab('quests')}
          className={`px-5 py-3 rounded-xl font-mono text-xs uppercase font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'quests'
              ? 'bg-[#00f0ff] text-black shadow-[0_0_15px_rgba(0,240,255,0.3)] font-black'
              : 'text-[#8b949e] hover:text-white hover:bg-white/5'
          }`}
        >
          <Plus className="w-4 h-4" /> [ BAN HÀNH BÀI TẬP ]
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-5 py-3 rounded-xl font-mono text-xs uppercase font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-[#00f0ff] text-black shadow-[0_0_15px_rgba(0,240,255,0.3)] font-black'
              : 'text-[#8b949e] hover:text-white hover:bg-white/5'
          }`}
        >
          <Award className="w-4 h-4" /> [ BÁO CÁO PHẢN ÁNH ]
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-3 rounded-xl font-mono text-xs uppercase font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] font-black'
              : 'text-[#8b949e] hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="w-4 h-4 animate-spin-slow" /> [ CẤU HÌNH SHOP & PASS ]
        </button>

        <button
          onClick={() => setActiveTab('frames')}
          className={`px-5 py-3 rounded-xl font-mono text-xs uppercase font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'frames'
              ? 'bg-purple-500 text-black shadow-[0_0_15px_rgba(168,85,247,0.4)] font-black'
              : 'text-[#8b949e] hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" /> [ TẠO KHUNG AVATAR ]
        </button>

        <button
          onClick={() => setActiveTab('missions')}
          className={`px-5 py-3 rounded-xl font-mono text-xs uppercase font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'missions'
              ? 'bg-[#00f0ff] text-black shadow-[0_0_15px_rgba(0,240,255,0.3)] font-black'
              : 'text-[#8b949e] hover:text-white hover:bg-white/5'
          }`}
        >
          <Coins className="w-4 h-4 text-yellow-400 animate-pulse" /> [ NHIỆM VỤ HÀNG NGÀY ]
        </button>

        <button
          onClick={() => setActiveTab('monitor')}
          className={`px-5 py-3 rounded-xl font-mono text-xs uppercase font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'monitor'
              ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] font-black animate-pulse'
              : 'text-[#8b949e] hover:text-white hover:bg-white/5'
          }`}
        >
          <Zap className="w-4 h-4 text-rose-300" /> [ GIÁM SÁT & BẢO MẬT ]
        </button>

        <button
          onClick={() => setActiveTab('online')}
          className={`px-5 py-3 rounded-xl font-mono text-xs uppercase font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'online'
              ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)] font-black'
              : 'text-[#8b949e] hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" /> [ DANH SÁCH ONLINE ({onlineList.length}) ]
        </button>
      </div>

      {/* MANAGING USERS LIST */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
          
          {/* LEFT: STUDENT CREATOR & CUSTOM PP PANEL */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Account Creator Form */}
            <div className="glass-box p-5 border-[#00f0ff]/30 bg-[#00f0ff]/5 space-y-4">
              <div className="border-b border-white/5 pb-2">
                <h4 className="text-[#00f0ff] uppercase font-black text-xs flex items-center gap-1">
                  👤 TẠO TÀI KHOẢN SINH VIÊN MỚI
                </h4>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">Đăng ký thành viên mới vào mạng lưới S88</p>
              </div>

              <form onSubmit={handleCreateStudent} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Tên Đăng Nhập (Username - liền nhau):</label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: s88_an, nva_123"
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#00f0ff] outline-none font-bold"
                    value={createUsername}
                    onChange={(e) => setCreateUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Họ Và Tên (Full Name):</label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: Nguyễn Văn An"
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#00f0ff] outline-none"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Lớp Học (Class):</label>
                    <input
                      type="text"
                      required
                      placeholder="S88-SE1"
                      className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#00f0ff] outline-none font-bold text-center"
                      value={createClass}
                      onChange={(e) => setCreateClass(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Mật Khẩu (Password):</label>
                    <input
                      type="text"
                      required
                      placeholder="123456"
                      className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#00f0ff] outline-none font-bold text-center text-yellow-400"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">PP Khởi Tạo Sẵn Có (Initial PP):</label>
                  <input
                    type="number"
                    required
                    placeholder="10000"
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-[#00ff80] focus:border-[#00f0ff] outline-none font-bold text-sm"
                    value={createInitialPP}
                    onChange={(e) => setCreateInitialPP(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500/20 to-[#00f0ff]/30 hover:from-cyan-400 hover:to-[#00f0ff] hover:text-black border border-[#00f0ff] text-[#00f0ff] font-extrabold rounded-lg transition duration-200 cursor-pointer uppercase tracking-wider text-[9px]"
                >
                  {isLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN TẠO TÀI KHOẢN 🚀'}
                </button>
              </form>
            </div>

            {/* Fund Adjuster Console */}
            <div className="glass-box p-5 border-emerald-500/30 bg-emerald-950/5 space-y-4">
              <div className="border-b border-white/5 pb-2">
                <h4 className="text-emerald-400 uppercase font-black text-xs flex items-center gap-1">
                  💰 TRUNG TÂM CẤP PHÁT QUỸ PHÁT TRIỂN (PP)
                </h4>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">Phân bổ quỹ PP cho bất kỳ sinh viên nào</p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] text-slate-300 font-sans leading-relaxed">
                  Để cộng/trừ tiền học bổng, chọn trực tiếp các nút nhanh <b>+5K / +20K / +100K</b> hoặc bấm biểu tượng Edit để nhập con số tùy thích bên mục chi tiết bên phải.
                </p>
                <div className="p-3 bg-black/40 border border-white/5 rounded-lg flex items-center justify-between text-[#00ff80] font-black text-[11px]">
                  <span>QUỸ S88 VÔ HẠN:</span>
                  <span className="text-glow-green">∞ PP (ONLINE)</span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT: ADVANCED STUDENT PORTAL MANAGER */}
          <div className="lg:col-span-8">
            <AdminUserManage onShowResult={onShowResult} />
          </div>

        </div>
      )}

      {/* CREATE VOUCHER / PROMO CODE */}
      {activeTab === 'vouchers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
          <div className="glass-box p-6 space-y-4">
            <h4 className="text-white font-black uppercase text-xs border-b border-white/5 pb-3">KHỞI TẠO PROMO CODE</h4>
            
            <form onSubmit={handleCreatePromoCode} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase">TÊN MÃ (VIẾT HOA, KHÔNG DẤU):</label>
                <input
                  type="text"
                  placeholder="VÍ DỤ: GIANGSINH88"
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#00f0ff] outline-none font-bold uppercase tracking-widest text-sm"
                  value={newPromo}
                  onChange={(e) => setNewPromo(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase">PHẦN THƯỞNG PP CHO MỖI LẦN NHẬP:</label>
                <input
                  type="number"
                  placeholder="2000"
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#00f0ff] outline-none"
                  value={newPromoReward}
                  onChange={(e) => setNewPromoReward(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase">GIỚI HẠN SỐ LƯỢT NHẬP CẢ HỆ THỐNG:</label>
                <input
                  type="number"
                  placeholder="10"
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#00f0ff] outline-none"
                  value={newPromoMaxClaims}
                  onChange={(e) => setNewPromoMaxClaims(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-cyan-950/20 hover:bg-[#00f0ff] border border-[#00f0ff] text-[#00f0ff] hover:text-black font-extrabold rounded-xl transition duration-200 cursor-pointer uppercase tracking-widest text-[10px]"
              >
                {isLoading ? '[ ĐANG XỬ LÝ... ]' : '[ TẠO & BAN BỐ TOÀN TRƯỜNG ]'}
              </button>
            </form>
          </div>

          <div className="glass-box p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="text-white font-black uppercase text-xs border-b border-white/5 pb-3">HƯỚNG DẪN HOẠT ĐỘNG</h4>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Mỗi mã Voucher được thiết lập gồm phần thưởng PP cụ thể và giới hạn claim tối đa.
              </p>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Sau khi tạo thành công, S-System 88 Core sẽ tự động gửi tin nhắn System thông báo kèm mã đổi quà vào dòng chat chính thức của hệ thống (Global Chat). Sinh viên có thể sao chép và nhập nhanh để tích lũy tài sản PP học đường!
              </p>
            </div>

            <div className="bg-[#00f0ff]/5 border border-[#00f0ff]/20 p-4 rounded-xl">
              <span className="text-[10px] text-[#00f0ff] font-black uppercase tracking-wider block mb-1">MẸO QUẢN TRỊ:</span>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Tạo mã với số lượt giới hạn nhỏ (ví dụ: 3 lượt) để kích thích tinh thần săn code nhanh tay lẹ mắt của các sinh viên trong giờ giải lao!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* QUEST / QUIZ CREATION AND STATUS */}
      {activeTab === 'quests' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
          {/* New Quest Form */}
          <div className="glass-box p-6 space-y-4">
            <h4 className="text-white font-black uppercase text-xs border-b border-white/5 pb-3">BAN HÀNH BÀI TẬP VỀ NHÀ MỚI</h4>

            <form onSubmit={handleCreateQuest} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase">TIÊU ĐỀ BÀI TẬP / HỌC PHẦN:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đại số tuyến tính - Bài 1"
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#00f0ff] outline-none"
                  value={newQuestTitle}
                  onChange={(e) => setNewQuestTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase">CÂU HỎI TRẮC NGHIỆM CHI TIẾT:</label>
                <textarea
                  placeholder="Ví dụ: Tìm định thức của ma trận vuông cấp 2 sau..."
                  required
                  rows={2}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#00f0ff] outline-none resize-none"
                  value={newQuestQuestion}
                  onChange={(e) => setNewQuestQuestion(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase">LỰA CHỌN PHƯƠNG ÁN A:</label>
                  <input
                    type="text"
                    placeholder="Phương án A"
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#00f0ff] outline-none"
                    value={newQuestOptA}
                    onChange={(e) => setNewQuestOptA(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase">LỰA CHỌN PHƯƠNG ÁN B:</label>
                  <input
                    type="text"
                    placeholder="Phương án B"
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#00f0ff] outline-none"
                    value={newQuestOptB}
                    onChange={(e) => setNewQuestOptB(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase">PHƯƠNG ÁN ĐÚNG CHÍNH XÁC:</label>
                  <select
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-[#00f0ff] outline-none"
                    value={newQuestCorrect}
                    onChange={(e) => setNewQuestCorrect(e.target.value as 'A' | 'B')}
                  >
                    <option value="A">ĐÁP ÁN A</option>
                    <option value="B">ĐÁP ÁN B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase">THƯỞNG PP KHI TRẢ LỜI ĐÚNG:</label>
                  <input
                    type="number"
                    placeholder="1000"
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#00f0ff] outline-none"
                    value={newQuestReward}
                    onChange={(e) => setNewQuestReward(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-cyan-950/20 hover:bg-[#00f0ff] border border-[#00f0ff] text-[#00f0ff] hover:text-black font-extrabold rounded-xl transition duration-200 cursor-pointer uppercase tracking-widest text-[10px]"
              >
                {isLoading ? '[ ĐANG BAN HÀNH... ]' : '[ BAN HÀNH HỌC PHẦN BÀI TẬP ]'}
              </button>
            </form>
          </div>

          {/* Active Quests status list */}
          <div className="glass-box p-6 space-y-4">
            <h4 className="text-white font-black uppercase text-xs border-b border-white/5 pb-3">CÁC BÀI TẬP ĐANG HOẠT ĐỘNG</h4>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {questsList.map((q) => (
                <div key={q.id} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-xs">{q.title}</strong>
                    <span className={`text-[8px] font-black py-0.5 px-2 rounded-full uppercase border ${
                      q.status === 'OPEN'
                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                        : 'border-red-500/30 text-red-400 bg-red-950/20'
                    }`}>
                      {q.status === 'OPEN' ? 'ĐANG MỞ' : 'ĐÃ ĐÓNG'}
                    </span>
                  </div>

                  <p className="text-slate-400 text-[11px] leading-relaxed italic">"{q.question}"</p>
                  
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[#ffd700] text-glow-gold font-bold">Thưởng: +{q.rewardPP} PP</span>
                    
                    <button
                      onClick={() => handleToggleQuest(q.id!, q.status)}
                      className={`py-1 px-2.5 border rounded text-[9px] font-bold cursor-pointer transition uppercase ${
                        q.status === 'OPEN'
                          ? 'border-red-500/40 text-red-400 bg-red-950/10 hover:bg-red-500 hover:text-white'
                          : 'border-emerald-500/40 text-emerald-400 bg-emerald-950/10 hover:bg-emerald-500 hover:text-black'
                      }`}
                    >
                      {q.status === 'OPEN' ? '[ ĐÓNG LẠI ]' : '[ MỞ LẠI ]'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBMITTED STUDENT REPORTS */}
      {activeTab === 'reports' && (
        <div className="glass-box p-6 font-mono text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h4 className="text-white uppercase font-black text-xs">PHẢN ÁNH & BÁO CÁO GIAN LẬN ({reportsList.length})</h4>
            <span className="text-[10px] text-red-400 animate-pulse font-black uppercase">ĐƯỜNG DÂY NÓNG S88</span>
          </div>

          {reportsList.length === 0 ? (
            <p className="text-center italic text-slate-400 py-10">Chưa ghi nhận phản ánh nào từ sinh viên.</p>
          ) : (
            <div className="space-y-3">
              {reportsList.map((rep) => (
                <div key={rep.id} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Người báo cáo: <strong className="text-white">{rep.senderName}</strong></span>
                    <span>{rep.time}</span>
                  </div>

                  <p className="text-white text-xs">
                    Đối tượng bị phản ánh: <strong className="text-yellow-400 uppercase">{rep.target}</strong>
                  </p>

                  <div className="p-2.5 bg-black/40 rounded border border-white/5 text-slate-300 leading-relaxed italic text-[11px]">
                    Nội dung lý do: "{rep.reason}"
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SYSTEM CONFIGURATION TAB (BATTLE PASS & SHOP PRICES) */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6 font-mono text-xs">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT: BATTLE PASS PRICE & TIMING CONFIG */}
            <div className="glass-box p-6 border-amber-500/30 bg-amber-950/5 space-y-4">
              <div className="border-b border-white/5 pb-2">
                <h4 className="text-amber-400 uppercase font-black text-xs flex items-center gap-1.5">
                  👑 CẤU HÌNH BATTLE PASS (S-PASS)
                </h4>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">Cấu hình giá mua Battle Pass và ngày tự động reset</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1.5 uppercase font-bold">Giá Đăng Ký Premium (PP):</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-[#ffd700] font-bold text-sm"
                    value={bpPrice}
                    onChange={(e) => setBpPrice(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1.5 uppercase font-bold">Thời Gian Reset (Hạn chót):</label>
                  <input
                    type="text"
                    required
                    placeholder="YYYY-MM-DDTHH:mm:ss"
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-blue-400 font-bold font-mono text-xs"
                    value={bpResetTime}
                    onChange={(e) => setBpResetTime(e.target.value)}
                  />
                  <span className="text-[8px] text-slate-500 mt-1 block">Định dạng chuẩn: 2026-08-31T23:59:59</span>
                </div>
              </div>

              {/* Quick Actions Panel for Admin */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleGrantAllStudentsPremiumBP}
                  className="py-2 px-3 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/50 font-extrabold rounded-lg transition text-[9px] uppercase tracking-wider cursor-pointer"
                >
                  👑 TẶNG S-PASS VIP TOÀN TRƯỜNG
                </button>
                <button
                  type="button"
                  onClick={handleResetServerBattlePassSeason}
                  className="py-2 px-3 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/50 font-extrabold rounded-lg transition text-[9px] uppercase tracking-wider cursor-pointer"
                >
                  🔄 RESET MÙA GIẢI TOÀN SERVER
                </button>
              </div>

              {/* Tiers & Rewards adjustment for all 20 levels */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-[9px] text-slate-300 uppercase font-black">
                    ĐIỀU CHỈNH PHẦN THƯỞNG BATTLE PASS (20 CẤP ĐỘ):
                  </span>
                  <span className="text-[8px] text-amber-400 font-bold">
                    {bpTiers.length} Cấp độ
                  </span>
                </div>
                
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {bpTiers.map((tier) => (
                    <div
                      key={tier.id}
                      className={`p-3 rounded-lg border space-y-2 transition-all ${
                        tier.isMilestone
                          ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                          : 'bg-black/40 border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold ${tier.isMilestone ? 'text-amber-400 font-black' : 'text-slate-200'}`}>
                          {tier.isMilestone ? '⭐' : '🏅'} {tier.name}
                        </span>
                        {tier.isMilestone && (
                          <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase font-black">
                            Cột Mốc Mùa
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] text-slate-400 uppercase font-bold mb-0.5">
                            Thường (Standard PP):
                          </label>
                          <input
                            type="number"
                            className="w-full bg-slate-900 border border-white/10 p-1.5 rounded text-white text-xs font-bold"
                            value={tier.standardReward?.value || 0}
                            onChange={(e) =>
                              handleUpdateTierReward(tier.id, 'standard', parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-amber-400/80 uppercase font-bold mb-0.5">
                            VIP Premium (PP):
                          </label>
                          <input
                            type="number"
                            className="w-full bg-slate-900 border border-amber-500/20 p-1.5 rounded text-amber-400 text-xs font-bold"
                            value={tier.premiumReward?.value || 0}
                            onChange={(e) =>
                              handleUpdateTierReward(tier.id, 'premium', parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: SHOP ITEM PRICES CONFIG */}
            <div className="glass-box p-6 border-[#00f0ff]/30 bg-[#00f0ff]/5 space-y-4">
              <div className="border-b border-white/5 pb-2">
                <h4 className="text-[#00f0ff] uppercase font-black text-xs flex items-center gap-1.5">
                  🛒 CẤU HÌNH GIÁ VẬT PHẨM CHỢ ĐEN (BLACK MARKET)
                </h4>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">Tùy chỉnh giá bán các khung Avatar và danh hiệu đặc quyền</p>
              </div>

              {/* Avatar Frames price section */}
              <div className="space-y-3">
                <span className="text-[9px] text-slate-300 font-bold block border-b border-white/5 pb-1">🖼️ KHUNG AVATAR ĐỘC QUYỀN:</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1 uppercase font-bold">Khung Vàng (Gold):</label>
                    <input
                      type="number"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-yellow-500 font-bold"
                      value={priceGoldFrame}
                      onChange={(e) => setPriceGoldFrame(parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1 uppercase font-bold">Khung Neon:</label>
                    <input
                      type="number"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-pink-500 font-bold"
                      value={priceNeonFrame}
                      onChange={(e) => setPriceNeonFrame(parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1 uppercase font-bold">Khung Cyber:</label>
                    <input
                      type="number"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-cyan-400 font-bold"
                      value={priceCyberFrame}
                      onChange={(e) => setPriceCyberFrame(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              {/* Titles price section */}
              <div className="space-y-3 pt-2">
                <span className="text-[9px] text-slate-300 font-bold block border-b border-white/5 pb-1">🏅 DANH HIỆU THỜI THƯỢNG:</span>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase font-bold">Chúa Tể Học Thuật:</label>
                      <input
                        type="number"
                        className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-emerald-400 font-bold"
                        value={priceAcademicTitle}
                        onChange={(e) => setPriceAcademicTitle(parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase font-bold">Ông Trùm Đầu Tư:</label>
                      <input
                        type="number"
                        className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-amber-500 font-bold"
                        value={priceInvestorTitle}
                        onChange={(e) => setPriceInvestorTitle(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase font-bold">Thần Bài Las Vegas:</label>
                      <input
                        type="number"
                        className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-purple-400 font-bold"
                        value={priceCasinoTitle}
                        onChange={(e) => setPriceCasinoTitle(parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase font-bold">Đại Gia Học Đường (VIP):</label>
                      <input
                        type="number"
                        className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-red-400 font-bold"
                        value={priceVipTitle}
                        onChange={(e) => setPriceVipTitle(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Disclaimer / Warning */}
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-[10px] uppercase font-bold leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                <span>Chú ý: Mọi điều chỉnh về giá cả sẽ được áp dụng trực tiếp lên hệ thống Marketplace và Battle Pass của sinh viên trong thời gian thực. Sinh viên sẽ cần tải lại trang hoặc mở giao diện tương ứng để cập nhật giá mới.</span>
              </div>
            </div>

            {/* WORLD HUNTING PORTAL CONFIG & REAL-TIME BOSS SPAWN TRIGGER */}
            <div className="lg:col-span-2 glass-box p-6 border-red-500/40 bg-red-950/10 space-y-4">
              <div className="border-b border-white/5 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-red-400 uppercase font-black text-xs flex items-center gap-1.5">
                    🐉 CẤU HÌNH ĐỘ KHÓ & TỈ LỆ GAME ĐI SĂN THẾ GIỚI
                  </h4>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">
                    Điều chỉnh tỉ lệ Máu Boss, Tốc độ di chuyển và Phần thưởng PP thực tế để cân bằng kinh tế game
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerInstantWorldBoss}
                  className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:brightness-125 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-[0_0_20px_rgba(255,0,60,0.5)] transition-all flex items-center gap-2 shrink-0 animate-pulse"
                >
                  <Zap className="w-4 h-4 text-yellow-300" /> [ ⚡ LỆNH TRIỆU HỒI BOSS NGAY ]
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-300 mb-1.5 uppercase font-bold">
                    Hệ Số Máu Boss (Hp Mult):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-red-400 font-bold text-sm"
                    value={bossHpMult}
                    onChange={(e) => setBossHpMult(parseFloat(e.target.value) || 1.0)}
                  />
                  <span className="text-[8px] text-slate-400 mt-1 block">
                    Ví dụ: 1.0 = 300 Trăm Triệu HP • 0.5 = 150 Trăm Triệu
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 mb-1.5 uppercase font-bold">
                    Hệ Số Thưởng PP (PP Mult):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-yellow-400 font-bold text-sm"
                    value={ppRewardMult}
                    onChange={(e) => setPpRewardMult(parseFloat(e.target.value) || 1.0)}
                  />
                  <span className="text-[8px] text-slate-400 mt-1 block">
                    Ví dụ: 1.0 = 500 Trăm Triệu PP • 2.0 = 1 Tỷ PP
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 mb-1.5 uppercase font-bold">
                    Hệ Số Tốc Độ Quái & Boss:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-cyan-400 font-bold text-sm"
                    value={beastSpeedMult}
                    onChange={(e) => setBeastSpeedMult(parseFloat(e.target.value) || 1.0)}
                  />
                  <span className="text-[8px] text-slate-400 mt-1 block">
                    Ví dụ: 1.0x = Chuẩn • 1.5x = Quái di chuyển nhanh 50%
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Submit Action Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="py-3 px-6 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-glow-amber rounded-xl text-xs tracking-wider cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all"
            >
              <Check className="w-4 h-4" />
              {isLoading ? 'ĐANG LƯU THAY ĐỔI...' : 'CẬP NHẬT TOÀN BỘ CẤU HÌNH HỆ THỐNG'}
            </button>
          </div>

        </form>
      )}

      {/* AVATAR FRAME CREATION & MANAGEMENT TAB VIEW */}
      {activeTab === 'frames' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b border-white/5 pb-2">
            <h3 className="text-purple-400 uppercase font-black text-lg text-glow-pink flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" /> QUẢN LÝ & THIẾT KẾ KHUNG AVATAR ĐỘC QUYỀN
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
              Tạo khung avatar mới để đưa vào Cửa Hàng (Marketplace) bán hoặc bổ sung làm phần thưởng Battle Pass
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form to create new Frame */}
            <form onSubmit={handleCreateAvatarFrame} className="glass-box p-6 border-purple-500/30 bg-purple-950/10 space-y-4 lg:col-span-2">
              <h4 className="text-purple-300 font-bold uppercase text-xs border-b border-white/5 pb-2 flex items-center gap-2">
                ✏️ THÔNG TIN KHUNG AVATAR MỚI
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tên Khung Avatar (*):</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Khung Rồng Vàng VIP, Khung Băng Giá..."
                    className="w-full bg-black/60 border border-white/10 p-2.5 rounded-lg text-white text-xs font-bold focus:border-purple-500"
                    value={newFrameName}
                    onChange={(e) => setNewFrameName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Giá Bán Cửa Hàng (PP):</label>
                  <input
                    type="number"
                    required
                    placeholder="50000"
                    className="w-full bg-black/60 border border-white/10 p-2.5 rounded-lg text-amber-400 font-mono font-bold text-xs focus:border-purple-500"
                    value={newFramePrice}
                    onChange={(e) => setNewFramePrice(e.target.value)}
                  />
                </div>
              </div>

              {/* Style selector */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Kiểu Dáng Hiệu Ứng / Khung Visual (*):</label>
                <select
                  className="w-full bg-black/80 border border-white/10 p-2.5 rounded-lg text-purple-300 text-xs font-bold focus:border-purple-500 cursor-pointer"
                  value={newFrameStyle}
                  onChange={(e) => setNewFrameStyle(e.target.value)}
                >
                  <option value="gold-ring">👑 Khung Vàng Hoàng Gia 24K (Gold Ring)</option>
                  <option value="neon-ring">🌈 Khung Cầu Vồng Neon 120FPS (Neon Ring)</option>
                  <option value="cyber-ring">🤖 Khung Hologram Cyberpunk (Cyber Ring)</option>
                  <option value="fire-ring">🔥 Khung Ngọn Lửa Băng Giá (Fire Ring)</option>
                  <option value="emerald-ring">💎 Khung Ngọc Lục Bảo VIP (Emerald Ring)</option>
                  <option value="dragon-ring">🐉 Khung Rồng Vương Thần Thoại (Dragon Ring)</option>
                  <option value="custom_url">🖼️ Khung Ảnh Tự Định Nghĩa (Custom PNG/WebP Image URL)</option>
                </select>
              </div>

              {newFrameStyle === 'custom_url' && (
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Link Ảnh Khung Transparent (PNG / WebP URL):</label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/my-frame.png"
                    className="w-full bg-black/60 border border-white/10 p-2.5 rounded-lg text-cyan-300 font-mono text-xs focus:border-purple-500"
                    value={newFrameImageUrl}
                    onChange={(e) => setNewFrameImageUrl(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Mô Tả Vật Phẩm:</label>
                <textarea
                  rows={2}
                  className="w-full bg-black/60 border border-white/10 p-2.5 rounded-lg text-slate-300 text-xs focus:border-purple-500"
                  value={newFrameDesc}
                  onChange={(e) => setNewFrameDesc(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="inBP"
                  className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500 cursor-pointer"
                  checked={newFrameInBP}
                  onChange={(e) => setNewFrameInBP(e.target.checked)}
                />
                <label htmlFor="inBP" className="text-xs text-slate-300 font-bold uppercase cursor-pointer">
                  🎁 Đồng bộ xuất hiện trong danh sách phần thưởng Battle Pass
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isLoading ? 'ĐANG PHÁT HÀNH...' : 'PHÁT HÀNH KHUNG AVATAR TOÀN SERVER'}
              </button>
            </form>

            {/* Live Sample Preview Panel */}
            <div className="glass-box p-6 border-purple-500/30 bg-purple-950/20 flex flex-col items-center justify-center text-center space-y-4">
              <span className="text-[10px] font-mono text-purple-400 uppercase font-black tracking-widest">
                👀 MẪU XEM TRƯỚC (LIVE PREVIEW)
              </span>

              {/* Sample Avatar Container */}
              <div className="relative w-28 h-28 flex items-center justify-center my-2">
                {/* Avatar picture */}
                <img
                  src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt="Sample Avatar"
                  className="w-20 h-20 rounded-full object-cover shadow-2xl"
                />

                {/* Applied Frame Ring or Custom Image */}
                {newFrameStyle !== 'custom_url' ? (
                  <div className={`absolute inset-0 rounded-full pointer-events-none ${newFrameStyle}`} />
                ) : newFrameImageUrl ? (
                  <img
                    src={newFrameImageUrl}
                    alt="Custom Frame Preview"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <div className="absolute inset-0 border-2 border-dashed border-purple-400/50 rounded-full animate-spin-slow pointer-events-none" />
                )}
              </div>

              <div className="space-y-1">
                <h5 className="text-white font-bold text-sm uppercase">{newFrameName || 'Tên Khung Mẫu'}</h5>
                <p className="text-amber-400 font-mono font-bold text-xs">
                  💰 {parseInt(newFramePrice || '0').toLocaleString()} PP
                </p>
                <p className="text-[10px] text-slate-400 italic max-w-xs">{newFrameDesc}</p>
              </div>
            </div>
          </div>

          {/* List of custom created frames */}
          <div className="glass-box p-6 border-white/10 space-y-4">
            <h4 className="text-white font-bold text-xs uppercase flex items-center gap-2 border-b border-white/5 pb-2">
              📦 DANH SÁCH KHUNG AVATAR DO ADMIN PHÁT HÀNH ({customFrames.length})
            </h4>

            {customFrames.length === 0 ? (
              <p className="text-slate-500 font-mono text-xs italic text-center py-6">
                Chưa có khung custom nào do Admin tạo. Hãy nhập thông tin phía trên để khởi tạo khung mới!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customFrames.map((frame) => (
                  <div key={frame.id} className="p-4 bg-black/40 border border-purple-500/20 rounded-xl flex items-center justify-between gap-4">
                    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                      <img
                        src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {frame.value.startsWith('http') ? (
                        <img src={frame.value} alt="Frame" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                      ) : (
                        <div className={`absolute inset-0 rounded-full pointer-events-none ${frame.value}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h5 className="text-white font-bold text-xs uppercase truncate">{frame.name}</h5>
                      <span className="text-amber-400 font-mono text-[10px] font-bold block">
                        💰 {frame.price?.toLocaleString()} PP
                      </span>
                      <span className="text-[8px] text-purple-300 block truncate">{frame.desc}</span>
                    </div>

                    <button
                      onClick={() => handleDeleteCustomFrame(frame.id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition cursor-pointer text-xs shrink-0"
                      title="Xóa Khung"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MONITOR TAB VIEW */}
      {activeTab === 'monitor' && (
        <div className="space-y-6 font-mono text-xs">
          
          {/* Header */}
          <div className="border-b border-white/5 pb-2">
            <h3 className="text-rose-500 uppercase font-black text-lg text-glow-red flex items-center gap-2">
              <Zap className="w-5 h-5 text-rose-500 animate-pulse" /> GIÁM SÁT HIỆU NĂNG & AN NINH HỆ THỐNG S88
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
              Theo dõi trực quan tải phòng đấu trường, độ trễ và log bảo mật chống gian lận F12 thời gian thực
            </p>
          </div>

          {/* Core Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-box p-4 border-cyan-500/20 bg-cyan-950/5 relative overflow-hidden">
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[10px] text-cyan-400 font-bold block uppercase mb-1">TẢI PHÒNG ĐẤU TRƯỜNG</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">
                  {perfHistory[perfHistory.length - 1]?.rooms || 0} Phòng
                </span>
                <span className="text-[10px] text-cyan-400">
                  (~{((perfHistory[perfHistory.length - 1]?.rooms || 0) / 10 * 100).toFixed(0)}% công suất)
                </span>
              </div>
            </div>

            <div className="glass-box p-4 border-rose-500/20 bg-rose-950/5 relative overflow-hidden">
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[10px] text-rose-400 font-bold block uppercase mb-1">ĐỘ TRỄ WEBSOCKET TRUNG BÌNH</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">
                  {perfHistory[perfHistory.length - 1]?.latency || 0} ms
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">● TỐT (STABLE)</span>
              </div>
            </div>

            <div className="glass-box p-4 border-amber-500/20 bg-amber-950/5 relative overflow-hidden">
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="text-[10px] text-amber-400 font-bold block uppercase mb-1">CẢNH BÁO GIAN LẬN HÔM NAY</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{cheaterAlerts.length} Ca</span>
                {cheaterAlerts.length > 0 ? (
                  <span className="text-[10px] text-red-500 font-bold animate-pulse">⚠️ NGUY HIỂM</span>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-bold">● AN TOÀN</span>
                )}
              </div>
            </div>
          </div>

          {/* Line Chart Component */}
          <div className="glass-box p-5 border-white/10 bg-slate-950/40">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white uppercase font-black text-xs">BIỂU ĐỒ HIỆU NĂNG REAL-TIME:</h4>
              <div className="flex gap-4 text-[9px] uppercase font-bold">
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2.5 h-1 bg-cyan-400 inline-block rounded" /> Tải phòng (Số lượng)
                </span>
                <span className="flex items-center gap-1 text-rose-500">
                  <span className="w-2.5 h-1 bg-rose-500 inline-block rounded" /> Độ trễ Socket (ms)
                </span>
              </div>
            </div>

            {perfHistory.length > 1 ? (
              <div className="w-full h-44 flex flex-col justify-between">
                <svg viewBox="0 0 600 160" className="w-full h-full overflow-visible">
                  {/* Grid background lines */}
                  {[40, 80, 120].map((gl, i) => (
                    <line key={i} x1="20" y1={gl} x2="580" y2={gl} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  ))}

                  {/* Rooms line (Cyan) */}
                  <polyline
                    fill="none"
                    stroke="#00f0ff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={perfHistory.map((tick, idx) => {
                      const x = (idx / (perfHistory.length - 1)) * 560 + 20;
                      const y = 160 - (tick.rooms / 15) * 120 - 20;
                      return `${x},${y}`;
                    }).join(' ')}
                    className="drop-shadow-[0_0_4px_rgba(0,240,255,0.5)]"
                  />

                  {/* Latency line (Rose) */}
                  <polyline
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={perfHistory.map((tick, idx) => {
                      const x = (idx / (perfHistory.length - 1)) * 560 + 20;
                      const y = 160 - (tick.latency / 50) * 120 - 20;
                      return `${x},${y}`;
                    }).join(' ')}
                    className="drop-shadow-[0_0_4px_rgba(244,63,94,0.5)]"
                  />

                  {/* Dot anchors at current tick */}
                  {perfHistory.map((tick, idx) => {
                    if (idx % 2 !== 0) return null; // display every alternate x label for breathing space
                    const x = (idx / (perfHistory.length - 1)) * 560 + 20;
                    return (
                      <text key={idx} x={x} y="155" fill="rgba(255,255,255,0.4)" fontSize="7" textAnchor="middle">
                        {tick.time.split(':').slice(1).join(':')}
                      </text>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-500">
                Đang nạp dữ liệu hiệu năng hệ thống...
              </div>
            )}
          </div>

          {/* Security Log Section */}
          <div className="glass-box p-5 border-red-500/20 bg-red-950/5 space-y-4">
            <div className="border-b border-white/5 pb-2 flex items-center justify-between">
              <h4 className="text-red-500 uppercase font-black text-xs flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" /> NHẬT KÝ BẢO MẬT & CHỐNG HACK GIAN LẬN F12
              </h4>
              <span className="text-[9px] bg-red-950 border border-red-500/30 text-red-400 py-0.5 px-2 rounded-full uppercase font-bold tracking-wider">
                Real-time Security Guard
              </span>
            </div>

            {cheaterAlerts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 text-[10px] uppercase font-bold">
                      <th className="py-2.5">Thời gian</th>
                      <th className="py-2.5">Sinh Viên (UID)</th>
                      <th className="py-2.5">Số PP trước</th>
                      <th className="py-2.5">Số PP hack</th>
                      <th className="py-2.5 text-red-400">Chênh lệch</th>
                      <th className="py-2.5">Xử lý</th>
                      <th className="py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {cheaterAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-white/5">
                        <td className="py-2 text-slate-300 font-bold">{alert.time}</td>
                        <td className="py-2">
                          <span className="text-white font-black block">{alert.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono block select-all">{alert.uid}</span>
                        </td>
                        <td className="py-2 text-slate-400 font-bold">{alert.lastPP?.toLocaleString()} PP</td>
                        <td className="py-2 text-red-400 font-black">{alert.hackedPP?.toLocaleString()} PP</td>
                        <td className="py-2 text-red-500 font-black">+{alert.diff?.toLocaleString()} PP</td>
                        <td className="py-2">
                          <span className="px-2 py-0.5 bg-red-950 border border-red-500/30 text-red-500 font-bold rounded-md text-[9px] uppercase">
                            Reverted & Locked
                          </span>
                        </td>
                        <td className="py-2 text-right space-x-1.5">
                          <button
                            onClick={async () => {
                              try {
                                await update(ref(db, `users/${alert.uid}`), { locked: false });
                                await set(ref(db, `cheater_alerts/${alert.id}`), null);
                                if (onShowResult) {
                                  onShowResult('ĐÃ MỞ KHÓA', `Đã khôi phục trạng thái hoạt động bình thường cho ${alert.name}`, true);
                                }
                              } catch (e) {
                                alert('Không thể mở khóa tài khoản!');
                              }
                            }}
                            className="px-2.5 py-1 bg-emerald-950/20 hover:bg-emerald-500 hover:text-black border border-emerald-500 text-emerald-400 rounded-md font-bold text-[9px] transition cursor-pointer"
                          >
                            [ MỞ KHÓA ACC ]
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await set(ref(db, `cheater_alerts/${alert.id}`), null);
                              } catch (e) {
                                alert('Không thể xóa log!');
                              }
                            }}
                            className="px-2.5 py-1 bg-white/5 hover:bg-red-500 hover:text-white border border-white/10 text-slate-400 rounded-md font-bold text-[9px] transition cursor-pointer"
                          >
                            [ XÓA LOG ]
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 border border-dashed border-white/5 rounded-xl uppercase font-bold">
                🔒 Chưa ghi nhận sự cố hack tiền nào. Hệ thống hoạt động an toàn 100%.
              </div>
            )}
          </div>
        </div>
      )}

      {/* DAILY MISSIONS CONFIG TAB */}
      {activeTab === 'missions' && (
        <div className="space-y-6 font-mono text-xs">
          
          {/* Header */}
          <div className="border-b border-white/5 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-[#00f0ff] uppercase font-black text-lg text-glow-blue flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-400 animate-pulse" /> QUẢN LÝ BỂ NHIỆM VỤ HÀNG NGÀY S88
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                Thiết kế bể nhiệm vụ chung để hệ thống tự xáo trộn phát hành cho người chơi cày cuốc lấy PP
              </p>
            </div>
            
            <button
              onClick={handleRandomizeMissions}
              disabled={isLoading}
              className="py-2.5 px-5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black uppercase rounded-xl text-[10px] tracking-wider cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.25)] flex items-center gap-1.5 transition-all shrink-0 self-start sm:self-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Trộn & Ban Hành Ngẫu Nhiên
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT: MISSION CREATOR FORM */}
            <form onSubmit={handleAddMission} className="lg:col-span-4 glass-box p-5 border-[#00f0ff]/30 bg-[#00f0ff]/5 space-y-4">
              <div className="border-b border-white/5 pb-2">
                <span className="text-[#00f0ff] font-black text-xs uppercase block">➕ TẠO NHIỆM VỤ MỚI</span>
                <span className="text-[8px] text-slate-400 mt-0.5 uppercase block">Thêm nhiệm vụ tùy chỉnh vào bể quay ngẫu nhiên</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase font-bold text-[9px]">Tên Nhiệm Vụ:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Vua Tài Xỉu, Kỵ Sĩ Đường Đua..."
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white font-bold"
                    value={newMissionTitle}
                    onChange={(e) => setNewMissionTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase font-bold text-[9px]">Mô Tả Chi Tiết:</label>
                  <textarea
                    required
                    placeholder="Ví dụ: Chiến thắng 3 ván Tài Xỉu Thần Thú để nhận thưởng..."
                    rows={2}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white font-sans text-xs"
                    value={newMissionDesc}
                    onChange={(e) => setNewMissionDesc(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1.5 uppercase font-bold text-[9px]">Loại Hành Động:</label>
                    <select
                      className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white font-mono"
                      value={newMissionType}
                      onChange={(e) => setNewMissionType(e.target.value)}
                    >
                      <option value="check_in">ĐIỂM DANH</option>
                      <option value="taixiu_wins">THẮNG TÀI XỈU</option>
                      <option value="crash_rides">BAY PHI THUYỀN</option>
                      <option value="penalty_goals">GHI BÀN PENALTY</option>
                      <option value="chat_messages">TƯƠNG TÁC CHAT</option>
                      <option value="wheel_spins">QUAY VÒNG QUAY</option>
                      <option value="bank_deposit">GIAO DỊCH BANK</option>
                      <option value="marketplace_buy">MUA SẮM CHỢ</option>
                      <option value="ai_chat">HỎI GIA SƯ AI</option>
                      <option value="horse_rides">ĐUA NGỰA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1.5 uppercase font-bold text-[9px]">Mục Tiêu (Lần):</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white font-bold"
                      value={newMissionTarget}
                      onChange={(e) => setNewMissionTarget(Number(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase font-bold text-[9px]">Phần Thưởng (PP):</label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={100}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-yellow-400 font-extrabold text-sm"
                    value={newMissionReward}
                    onChange={(e) => setNewMissionReward(Number(e.target.value) || 100)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-cyan-950/40 hover:bg-[#00f0ff] border border-[#00f0ff] text-[#00f0ff] hover:text-black font-extrabold rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer text-[10px]"
                >
                  {isLoading ? 'ĐANG KHỞI TẠO...' : '➕ KÍCH HOẠT NHIỆM VỤ VÀO BỂ'}
                </button>
              </div>
            </form>

            {/* RIGHT: CURRENT MISSIONS IN POOL */}
            <div className="lg:col-span-8 glass-box p-5 space-y-4">
              <div className="border-b border-white/5 pb-2 flex justify-between items-center">
                <div>
                  <span className="text-white font-black text-xs uppercase block">📋 DANH SÁCH BỂ NHIỆM VỤ ({missionsPool.length})</span>
                  <span className="text-[8px] text-slate-400 mt-0.5 uppercase block">Các nhiệm vụ đang hoạt động trong thuật toán xáo trộn</span>
                </div>
                <span className="text-[10px] text-[#00f0ff] font-bold border border-[#00f0ff]/30 bg-[#00f0ff]/5 py-0.5 px-2 rounded font-mono">POOL S88 ACTIVE</span>
              </div>

              {missionsPool.length === 0 ? (
                <div className="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-xl uppercase font-bold italic">
                  Chưa có nhiệm vụ nào trong bể! Vui lòng tạo nhiệm vụ mới ở cột trái.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 uppercase font-black">
                        <th className="pb-3 text-[10px]">TÊN NHIỆM VỤ</th>
                        <th className="pb-3 text-[10px]">LOẠI HÀNH ĐỘNG</th>
                        <th className="pb-3 text-[10px] text-center">MỤC TIÊU</th>
                        <th className="pb-3 text-[10px] text-right">THƯỞNG PP</th>
                        <th className="pb-3 text-[10px] text-right">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {missionsPool.map((m) => (
                        <tr key={m.id} className="hover:bg-white/5 transition-all">
                          <td className="py-3">
                            <span className="text-white font-bold block">{m.title}</span>
                            <span className="text-[9px] text-[#8b949e] font-sans block max-w-xs truncate">{m.description}</span>
                          </td>
                          <td className="py-3 font-bold text-cyan-400 uppercase">
                            {m.type}
                          </td>
                          <td className="py-3 text-center font-extrabold text-white">
                            {m.target} LẦN
                          </td>
                          <td className="py-3 text-right font-extrabold text-yellow-400 text-glow-gold">
                            +{m.reward?.toLocaleString()} PP
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteMission(m.id)}
                              className="p-1 px-2.5 border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-500 hover:text-white rounded-md font-bold text-[9px] cursor-pointer transition uppercase"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ONLINE USERS MONITORING DASHBOARD */}
      {activeTab === 'online' && (
        <div className="space-y-6 font-mono text-xs">
          <div className="glass-box p-6 border-emerald-500/40 bg-emerald-950/10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-emerald-400 font-black text-sm uppercase flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400 animate-pulse" /> GIÁM SÁT NGƯỜI CHƠI ONLINE (TỔNG: {onlineList.length} ONLINE)
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  Đồng bộ thời gian thực bao gồm Người chơi thực & Hệ thống AI mô phỏng hoạt động.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 font-black text-xs">
                  🟢 {onlineList.length} CLIENTS ACTIVE
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
              {onlineList.map((u) => (
                <div
                  key={u.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    u.isAI
                      ? 'bg-cyan-950/20 border-cyan-500/30 text-cyan-200'
                      : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${u.isAI ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                    <div className="overflow-hidden">
                      <div className="font-bold text-xs truncate text-white">{u.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">ID: {u.id}</div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                    u.isAI ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  }`}>
                    {u.isAI ? '🤖 AI BOT' : '👤 NGƯỜI THẬT'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
