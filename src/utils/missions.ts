/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ref, get, update, set } from 'firebase/database';
import { db } from '../firebase';

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: string;
  target: number;
  reward: number;
}

export interface UserMission extends Mission {
  current: number;
  claimed: boolean;
}

export const DEFAULT_MISSIONS_POOL: Mission[] = [
  {
    id: 'm_taixiu_win',
    title: 'Thần Tài Tài Xỉu',
    description: 'Chiến thắng 2 ván Tài Xỉu Thần Thú để nhận thưởng lớn.',
    type: 'taixiu_wins',
    target: 2,
    reward: 1200
  },
  {
    id: 'm_crash',
    title: 'Phi Công Cất Cánh',
    description: 'Tham gia cất cánh Phi Thuyền Crash 1 lần.',
    type: 'crash_rides',
    target: 1,
    reward: 800
  },
  {
    id: 'm_penalty',
    title: 'Vua Sút Phạt Penalty 3D',
    description: 'Sút tung lưới đối thủ thành công 2 quả Penalty.',
    type: 'penalty_goals',
    target: 2,
    reward: 1000
  },
  {
    id: 'm_chat',
    title: 'Chiến Hữu Giao Lưu',
    description: 'Gửi ít nhất 3 tin nhắn thảo luận ở Chat Toàn Trường.',
    type: 'chat_messages',
    target: 3,
    reward: 600
  },
  {
    id: 'm_wheel',
    title: 'Vòng Quay Nhân Phẩm',
    description: 'Quay Vòng Quay May Mắn Thần Tài 1 lần.',
    type: 'wheel_spins',
    target: 1,
    reward: 600
  },
  {
    id: 'm_ai',
    title: 'Trò Chuyện Gia Sư AI',
    description: 'Trò chuyện hỏi đáp với AI Gia Sư S88 2 câu hỏi.',
    type: 'ai_chat',
    target: 2,
    reward: 800
  },
  {
    id: 'm_horse',
    title: 'Kỵ Sĩ Đường Đua',
    description: 'Tham gia 1 trận cược Đua Ngựa Thần Tốc S88.',
    type: 'horse_rides',
    target: 1,
    reward: 800
  },
  {
    id: 'm_card',
    title: 'Đấu Thẻ Bài 1v1 Arena',
    description: 'Tham gia 1 trận Đấu Thẻ Bài Arena 1v1 hoặc Đấu với AI.',
    type: 'card_battle',
    target: 1,
    reward: 1200
  },
  {
    id: 'm_rps',
    title: 'Oẳn Tù Tì Xanh Chín',
    description: 'Thi đấu 1 trận Oẳn Tù Tì Xanh Chín với sinh viên khác.',
    type: 'rps_match',
    target: 1,
    reward: 800
  },
  {
    id: 'm_bj',
    title: 'Sòng Bài Xì Dách Blackjack',
    description: 'Thi đấu 1 ván Xì Dách Blackjack S88.',
    type: 'bj_match',
    target: 1,
    reward: 1000
  },
  {
    id: 'm_tienlen',
    title: 'Sát Thủ Tiến Lên Miền Nam',
    description: 'Thi đấu 1 ván Tiến Lên Miền Nam.',
    type: 'tienlen_match',
    target: 1,
    reward: 1000
  },
  {
    id: 'm_claw',
    title: 'Gắp Thú Bằng Bông S88',
    description: 'Trải nghiệm 1 ván Gắp Thú Bằng Bông săn quà.',
    type: 'claw_machine',
    target: 1,
    reward: 700
  },
  {
    id: 'm_fcmobile',
    title: 'Sân Cỏ FC Mobile S88',
    description: 'Thi đấu 1 trận FC Mobile Bóng Đa S88.',
    type: 'fcmobile_match',
    target: 1,
    reward: 900
  },
  {
    id: 'm_roulette',
    title: 'Vòng Quay Cò Quay Roulette',
    description: 'Đặt cược 1 ván Cò Quay Roulette.',
    type: 'roulette_spin',
    target: 1,
    reward: 800
  },
  {
    id: 'm_hunting',
    title: 'Thợ Săn World Hunting',
    description: 'Săn 1 quái vật hoặc Boss Thế Giới trong World Hunting.',
    type: 'world_hunting',
    target: 1,
    reward: 1200
  },
  {
    id: 'm_game_master',
    title: 'Cao Thủ Game S88',
    description: 'Chơi tổng cộng 3 ván minigame bất kỳ trên S88.',
    type: 'game_play',
    target: 3,
    reward: 1500
  },
  {
    id: 'm_taixiu_play',
    title: 'Thích Đỏ Đen Tài Xỉu',
    description: 'Đặt cược 2 ván Tài Xỉu Thần Thú.',
    type: 'taixiu_play',
    target: 2,
    reward: 800
  },
  {
    id: 'm_chat_active',
    title: 'Sôi Nổi Kênh Chat',
    description: 'Gửi 5 tin nhắn thảo luận sôi nổi trên Kênh Chat.',
    type: 'chat_messages',
    target: 5,
    reward: 1000
  },
  {
    id: 'm_hunting_boss',
    title: 'Chinh Phục Rồng Thần',
    description: 'Tấn công Boss Rồng Thần hoặc Quái Vật 2 lần.',
    type: 'world_hunting',
    target: 2,
    reward: 1500
  },
  {
    id: 'm_card_master',
    title: 'Chiến Thuật Gia Thẻ Bài',
    description: 'Tung thẻ bài chiến đấu 2 lần trong Arena 1v1.',
    type: 'card_battle',
    target: 2,
    reward: 1200
  }
];

// Helper to seed pool if missing or update with valid pool
export async function seedMissionsPool() {
  const poolRef = ref(db, 'daily_missions_pool');
  const snap = await get(poolRef);
  const initialPool: { [id: string]: Mission } = {};
  DEFAULT_MISSIONS_POOL.forEach((m) => {
    initialPool[m.id] = m;
  });
  await set(poolRef, initialPool);
}

// Fetch all missions in the global pool
export async function getMissionsPool(): Promise<Mission[]> {
  await seedMissionsPool();
  const poolRef = ref(db, 'daily_missions_pool');
  const poolSnap = await get(poolRef);
  if (poolSnap.exists()) {
    const val = poolSnap.val();
    const list: Mission[] = Array.isArray(val) ? val : Object.values(val);
    const validList = list.filter((m) => m && m.type !== 'bank_deposit' && m.type !== 'check_in' && m.type !== 'marketplace_buy');
    if (validList.length >= 5) return validList;
  }
  return DEFAULT_MISSIONS_POOL;
}

// Add a new mission to the global pool (for teachers/admins)
export async function addMissionToPool(missionData: Omit<Mission, 'id'>): Promise<Mission> {
  await seedMissionsPool();
  const newId = `m_custom_${Date.now()}`;
  const newMission: Mission = {
    ...missionData,
    id: newId
  };
  const missionRef = ref(db, `daily_missions_pool/${newId}`);
  await set(missionRef, newMission);
  return newMission;
}

// Delete a mission from the global pool
export async function deleteMissionFromPool(missionId: string): Promise<void> {
  const missionRef = ref(db, `daily_missions_pool/${missionId}`);
  await set(missionRef, null);
}

// Re-randomize 20 daily missions for a specific user for today
export async function rerandomizeUserMissions(uid: string): Promise<UserMission[]> {
  const todayStr = getTodayString();
  const userMissionsRef = ref(db, `users/${uid}/daily_missions/${todayStr}/missions_list`);
  
  const pool = await getMissionsPool();
  
  // Shuffle and pick 20
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 20);

  const userMissions: UserMission[] = selected.map((m, index) => ({
    ...m,
    id: m.id || `m_rand_${index}_${Date.now()}`,
    current: 0,
    claimed: false
  }));

  await set(userMissionsRef, userMissions);
  return userMissions;
}

// Get the standardized current date string YYYY-MM-DD
export function getTodayString(): string {
  return new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
}

// Ensure and retrieve user missions of today (20 random missions)
export async function getOrInitializeUserMissions(uid: string): Promise<UserMission[]> {
  const todayStr = getTodayString();
  const userMissionsRef = ref(db, `users/${uid}/daily_missions/${todayStr}/missions_list`);
  const snap = await get(userMissionsRef);

  if (snap.exists()) {
    const data = snap.val();
    const existingList: UserMission[] = Array.isArray(data) ? data : Object.values(data);
    // Filter out obsolete non-playable mission types like bank_deposit and check_in
    const cleanedList = existingList.filter(
      (m) => m && m.type !== 'bank_deposit' && m.type !== 'check_in' && m.type !== 'marketplace_buy'
    );
    if (cleanedList.length === existingList.length && cleanedList.length > 0) {
      return cleanedList;
    }
    // If invalid missions were removed, replace missing ones with valid default pool
    const missingCount = 20 - cleanedList.length;
    if (missingCount > 0) {
      const unusedPool = DEFAULT_MISSIONS_POOL.filter(
        (defM) => !cleanedList.some((ex) => ex.type === defM.type)
      );
      const shuffled = [...unusedPool, ...DEFAULT_MISSIONS_POOL].sort(() => 0.5 - Math.random());
      for (let i = 0; i < missingCount; i++) {
        const m = shuffled[i % shuffled.length];
        cleanedList.push({
          ...m,
          id: `m_rand_clean_${i}_${Date.now()}`,
          current: 0,
          claimed: false
        });
      }
      await set(userMissionsRef, cleanedList);
    }
    return cleanedList;
  }

  // Seed pool if it doesn't exist
  await seedMissionsPool();

  // Load missions from database pool
  const poolRef = ref(db, 'daily_missions_pool');
  const poolSnap = await get(poolRef);
  let pool: Mission[] = [];
  if (poolSnap.exists()) {
    pool = Object.values(poolSnap.val() as { [id: string]: Mission });
    pool = pool.filter((m) => m && m.type !== 'bank_deposit' && m.type !== 'check_in' && m.type !== 'marketplace_buy');
  }
  if (pool.length < 5) {
    pool = DEFAULT_MISSIONS_POOL;
  }

  // Shuffle and pick up to 20
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 20);

  // Map to UserMission structure
  const userMissions: UserMission[] = selected.map((m, index) => ({
    ...m,
    id: m.id || `m_rand_${index}_${Date.now()}`,
    current: 0,
    claimed: false
  }));

  // Save in database
  await set(userMissionsRef, userMissions);
  return userMissions;
}

// Increment user mission progress
export async function incrementMissionProgress(uid: string, missionType: string, amount: number = 1) {
  try {
    const todayStr = getTodayString();
    const userMissionsRef = ref(db, `users/${uid}/daily_missions/${todayStr}/missions_list`);
    const snap = await get(userMissionsRef);

    if (!snap.exists()) {
      // Lazy initialize if not already done
      await getOrInitializeUserMissions(uid);
      return;
    }

    const list: UserMission[] = Object.values(snap.val());
    let updated = false;

    // List of types considered minigame activities
    const gameTypes = [
      'taixiu_wins', 'taixiu_play', 'crash_rides', 'penalty_goals', 'horse_rides',
      'card_battle', 'rps_match', 'bj_match', 'tienlen_match', 'claw_machine',
      'fcmobile_match', 'roulette_spin', 'world_hunting', 'wheel_spins'
    ];

    const isGameActivity = gameTypes.includes(missionType) || missionType === 'game_play';

    const newList = list.map((m) => {
      const isTypeMatch = m.type === missionType;
      const isGenericGameMatch = m.type === 'game_play' && isGameActivity;

      if ((isTypeMatch || isGenericGameMatch) && !m.claimed && m.current < m.target) {
        updated = true;
        return {
          ...m,
          current: Math.min(m.current + amount, m.target)
        };
      }
      return m;
    });

    if (updated) {
      await set(userMissionsRef, newList);
    }
  } catch (err) {
    console.warn('Error incrementing mission progress:', err);
  }
}

// Admin / Teacher Broadcast: Push / update active daily missions to all users
export async function broadcastDailyMissionsToAllUsers(customMissions?: Mission[]): Promise<number> {
  const todayStr = getTodayString();
  const pool = customMissions || (await getMissionsPool());

  // Shuffle and pick up to 20
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 20);

  // Fetch all users
  const usersSnap = await get(ref(db, 'users'));
  if (!usersSnap.exists()) return 0;

  const usersData = usersSnap.val();
  const uids = Object.keys(usersData);
  let updatedCount = 0;

  for (const userUid of uids) {
    const userMissionsRef = ref(db, `users/${userUid}/daily_missions/${todayStr}/missions_list`);
    const userMissions: UserMission[] = selected.map((m, index) => ({
      ...m,
      id: m.id || `m_rand_${index}_${Date.now()}`,
      current: 0,
      claimed: false
    }));
    await set(userMissionsRef, userMissions);
    updatedCount++;
  }

  return updatedCount;
}

// Claim reward for a completed mission
export async function claimMissionReward(uid: string, missionId: string) {
  const todayStr = getTodayString();
  const userMissionsRef = ref(db, `users/${uid}/daily_missions/${todayStr}/missions_list`);
  const snap = await get(userMissionsRef);

  if (!snap.exists()) {
    throw new Error('Nhiệm vụ không tồn tại!');
  }

  const list: UserMission[] = Object.values(snap.val());
  const idx = list.findIndex((m) => m.id === missionId);

  if (idx === -1) {
    throw new Error('Không tìm thấy nhiệm vụ tương ứng!');
  }

  const mission = list[idx];
  if (mission.claimed) {
    throw new Error('Bạn đã nhận phần thưởng cho nhiệm vụ này rồi!');
  }

  if (mission.current < mission.target) {
    throw new Error('Chưa hoàn thành tiến độ yêu cầu!');
  }

  // Credit PP and optional XP to user
  const uRef = ref(db, `users/${uid}`);
  const uSnap = await get(uRef);
  const currentPP = uSnap.val()?.pp || 0;
  const currentXP = uSnap.val()?.xp || 0;
  const currentLevel = uSnap.val()?.level || 1;

  const newPP = currentPP + mission.reward;
  const newXP = currentXP + 40; // Gain 40 XP per completed mission
  const nextLevelXP = currentLevel * 100;

  const updates: any = { pp: newPP };

  if (newXP >= nextLevelXP) {
    updates.xp = newXP - nextLevelXP;
    updates.level = currentLevel + 1;
  } else {
    updates.xp = newXP;
  }

  await update(uRef, updates);

  // Mark mission as claimed
  const updatedList = [...list];
  updatedList[idx] = { ...mission, claimed: true };
  await set(userMissionsRef, updatedList);

  return {
    success: true,
    reward: mission.reward,
    levelUp: newXP >= nextLevelXP
  };
}
