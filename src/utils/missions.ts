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
    id: 'm_checkin',
    title: 'Điểm Danh Học Đường',
    description: 'Báo danh hàng ngày tại S88 để tích lũy tài nguyên.',
    type: 'check_in',
    target: 1,
    reward: 500
  },
  {
    id: 'm_taixiu',
    title: 'Thần Tài Gõ Cửa',
    description: 'Chiến thắng 2 ván Tài Xỉu Thần Thú để nhận thưởng.',
    type: 'taixiu_wins',
    target: 2,
    reward: 1000
  },
  {
    id: 'm_crash',
    title: 'Phi Công Trụ Hạng',
    description: 'Tham gia cất cánh Phi Thuyền Không Chiến 1 lần.',
    type: 'crash_rides',
    target: 1,
    reward: 600
  },
  {
    id: 'm_penalty',
    title: 'Vua Sút Phạt Luân Lưu',
    description: 'Sút tung lưới đối thủ thành công 2 quả Penalty.',
    type: 'penalty_goals',
    target: 2,
    reward: 800
  },
  {
    id: 'm_chat',
    title: 'Chiến Hữu Giao Lưu',
    description: 'Gửi ít nhất 3 tin nhắn thảo luận ở Chat Toàn Trường.',
    type: 'chat_messages',
    target: 3,
    reward: 500
  },
  {
    id: 'm_wheel',
    title: 'Vòng Quay Nhân Phẩm',
    description: 'Quay vòng quay may mắn thần tài 1 lần.',
    type: 'wheel_spins',
    target: 1,
    reward: 500
  },
  {
    id: 'm_bank',
    title: 'Tài Chính Thượng Lưu',
    description: 'Gửi tiết kiệm hoặc rút tiền tại Ngân Hàng S88 1 lần.',
    type: 'bank_deposit',
    target: 1,
    reward: 500
  },
  {
    id: 'm_marketplace',
    title: 'Kinh Thương Giao Dịch',
    description: 'Mua sắm 1 vật phẩm tại Chợ Học Đường hoặc Rương Gacha.',
    type: 'marketplace_buy',
    target: 1,
    reward: 700
  },
  {
    id: 'm_ai',
    title: 'Hỏi Đáp Gia Sư AI',
    description: 'Trò chuyện học hỏi với AI Gia Sư S88 2 câu hỏi.',
    type: 'ai_chat',
    target: 2,
    reward: 600
  },
  {
    id: 'm_horse',
    title: 'Kỵ Sĩ Đường Đua',
    description: 'Tham gia đặt cược Đua Ngựa Thần Tốc 1 lần.',
    type: 'horse_rides',
    target: 1,
    reward: 600
  },
  {
    id: 'm_card',
    title: 'Đấu Thẻ Bài 1v1 Arena',
    description: 'Tham gia 1 trận Đấu Thẻ Bài 1v1 hoặc Đấu với AI.',
    type: 'card_battle',
    target: 1,
    reward: 1000
  },
  {
    id: 'm_rps',
    title: 'Oẳn Tù Tì Xanh Chín',
    description: 'Thi đấu 1 trận Oẳn Tù Tì với sinh viên khác.',
    type: 'rps_match',
    target: 1,
    reward: 600
  },
  {
    id: 'm_bj',
    title: 'Sòng Bài Xì Dách',
    description: 'Thi đấu 1 ván Xì Dách Blackjack.',
    type: 'bj_match',
    target: 1,
    reward: 700
  },
  {
    id: 'm_tienlen',
    title: 'Sát Thủ Tiến Lên',
    description: 'Thi đấu 1 ván Tiến Lên Miền Nam.',
    type: 'tienlen_match',
    target: 1,
    reward: 800
  },
  {
    id: 'm_rank',
    title: 'Vinh Danh Bảng Vàng',
    description: 'Xem Bảng Xếp Hạng Top Đại Gia S88.',
    type: 'view_leaderboard',
    target: 1,
    reward: 400
  },
  {
    id: 'm_news',
    title: 'Tin Tức Sinh Viên',
    description: 'Đọc thông báo cập nhật tại S88 News Portal.',
    type: 'news_read',
    target: 1,
    reward: 400
  },
  {
    id: 'm_profile',
    title: 'Cập Nhật Hồ Sơ',
    description: 'Kiểm tra thông tin thẻ sinh viên và hồ sơ cá nhân.',
    type: 'profile_update',
    target: 1,
    reward: 400
  },
  {
    id: 'm_bounty',
    title: 'Thợ Săn Tiền Thưởng',
    description: 'Vào Đấu Trường Săn Thưởng kiểm tra phần thưởng.',
    type: 'bounty_check',
    target: 1,
    reward: 500
  },
  {
    id: 'm_quiz',
    title: 'Thử Thách Trí Tuệ',
    description: 'Trả lời 1 câu hỏi ôn tập từ hệ thống gia sư.',
    type: 'quiz_answer',
    target: 1,
    reward: 600
  },
  {
    id: 'm_gacha',
    title: 'Sưu Tầm Khung Avatar',
    description: 'Trải nghiệm mở rương gacha hoặc trang bị khung avatar.',
    type: 'shop_avatar',
    target: 1,
    reward: 500
  }
];

// Helper to seed pool if missing
export async function seedMissionsPool() {
  const poolRef = ref(db, 'daily_missions_pool');
  const snap = await get(poolRef);
  if (!snap.exists()) {
    const initialPool: { [id: string]: Mission } = {};
    DEFAULT_MISSIONS_POOL.forEach((m) => {
      initialPool[m.id] = m;
    });
    await set(poolRef, initialPool);
  }
}

// Fetch all missions in the global pool
export async function getMissionsPool(): Promise<Mission[]> {
  await seedMissionsPool();
  const poolRef = ref(db, 'daily_missions_pool');
  const poolSnap = await get(poolRef);
  if (poolSnap.exists()) {
    const val = poolSnap.val();
    return Array.isArray(val) ? val : Object.values(val);
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
    return Array.isArray(data) ? data : Object.values(data);
  }

  // Seed pool if it doesn't exist
  await seedMissionsPool();

  // Load missions from database pool
  const poolRef = ref(db, 'daily_missions_pool');
  const poolSnap = await get(poolRef);
  let pool: Mission[] = [];
  if (poolSnap.exists()) {
    pool = Object.values(poolSnap.val() as { [id: string]: Mission });
  } else {
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

    const newList = list.map((m) => {
      if (m.type === missionType && !m.claimed && m.current < m.target) {
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
