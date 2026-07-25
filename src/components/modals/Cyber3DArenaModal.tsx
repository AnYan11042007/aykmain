/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Zap, 
  Flame, 
  Trophy, 
  Crosshair, 
  Target, 
  Users, 
  HelpCircle, 
  Volume2, 
  VolumeX, 
  Radio, 
  Play, 
  Pause, 
  ShieldAlert,
  Coins,
  Award,
  Plus,
  LogIn,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Crown
} from 'lucide-react';
import { ref, update, push, onValue, set, remove, get } from 'firebase/database';
import { db } from '../../firebase';
import { User } from '../../types';
import confetti from 'canvas-confetti';

interface Cyber3DArenaModalProps {
  uid: string;
  user: User | null;
  onClose: () => void;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

// Room Data in Realtime DB
interface CyberRoom3D {
  id: string;
  name: string;
  hostUid: string;
  hostName: string;
  stakeMult: number; // 1x, 5x, 25x, 100x
  stakeName: string;
  createdAt: number;
  status: 'WAITING' | 'PLAYING';
  players: {
    [uid: string]: {
      uid: string;
      name: string;
      seatIndex: number; // 0 = Left, 1 = Center, 2 = Right
      gunTier: number;
      isReady: boolean;
      isHost: boolean;
    };
  };
}

// 3D Flying Monster Interface
interface FlyingMonster3D {
  id: string;
  name: string;
  type: 'DRAGON' | 'BAT' | 'MANTA' | 'BOSS';
  x: number; // -250 to 250
  y: number; // -120 to 120
  z: number; // 150 (close) to 600 (far)
  vx: number;
  vy: number;
  vz: number;
  hp: number;
  maxHp: number;
  baseBountyPP: number;
  color: string;
  size: number;
  rotation: number;
}

// 3D Laser Bullet
interface Bullet3D {
  id: string;
  shooterSeat: number; // 0 = Left, 1 = Center, 2 = Right
  shooterName: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  x: number;
  y: number;
  z: number;
  damage: number;
  costPP: number;
  color: string;
  isPlayer: boolean;
}

// Particle FX
interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

// Floating Damage Popup
interface DamagePop {
  id: string;
  x: number;
  y: number;
  damage: number;
  color: string;
}

interface RareToast3D {
  id: string;
  title: string;
  monsterName: string;
  rewardPP: number;
  color: string;
}

// Kill Feed Entry
interface KillLog {
  id: string;
  hunterName: string;
  monsterName: string;
  rewardPP: number;
  isPlayer: boolean;
  timeStr: string;
}

// Room Hunter Seat
interface HunterSeat {
  seatIndex: number; // 0 = Left, 1 = Center, 2 = Right
  seatName: string;
  uid: string;
  displayName: string;
  gunTier: number;
  isAI: boolean;
  angle: number; // turret angle
  lastShotTime: number;
}

const BULLET_TIERS = [
  { tier: 1, name: 'Súng Laser', baseCost: 100, damage: 25, color: '#00f0ff', desc: 'Đạn nhẹ, bắn liên tục' },
  { tier: 2, name: 'Pháo Plasma', baseCost: 500, damage: 130, color: '#ff00aa', desc: 'Sát thương khá, thích hợp diệt quái Manta' },
  { tier: 3, name: 'Railgun Siêu Cấp', baseCost: 2500, damage: 700, color: '#ffd700', desc: 'Sát thương cực đại diệt Rồng 3D' },
  { tier: 4, name: 'Thần Công Matrix', baseCost: 10000, damage: 3200, color: '#00ff66', desc: 'Hỏa lực tối thượng diệt Boss Thần Rồng' },
];

const STAKE_OPTIONS = [
  { mult: 1, name: 'Tập Sự (100 PP/đạn)', desc: 'Cược cơ bản nhẹ nhàng cho người mới' },
  { mult: 5, name: 'Cao Thủ (500 PP/đạn)', desc: 'Thưởng quái x5 lần - Kịch tính vừa phải' },
  { mult: 25, name: 'Đại Gia (2,500 PP/phát)', desc: 'Thưởng quái x25 lần - Săn thưởng cực đỉnh' },
  { mult: 100, name: 'Huyền Thoại (10,000 PP/phát)', desc: 'Sân chơi VIP thần rồng siêu cấp' },
];

const AI_NAMES = ['Gia Sư AI #01', 'Vua Bắn Cá AI', 'Thợ Săn Rồng 3D', 'AYK Bot Vàng', 'Chiến Thần Matrix'];

export default function Cyber3DArenaModal({ uid, user, onClose, onShowResult }: Cyber3DArenaModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // App Navigation States
  const [viewMode, setViewMode] = useState<'LOBBY' | 'WAITING_ROOM' | 'IN_GAME'>('LOBBY');
  const [rooms, setRooms] = useState<CyberRoom3D[]>([]);
  const [currentRoom, setCurrentRoom] = useState<CyberRoom3D | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  // Create Room Form State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>(`Phòng Săn 3D của ${user?.name || 'Thợ Săn'}`);
  const [selectedStakeMult, setSelectedStakeMult] = useState<number>(1);

  // In-Game Gun States
  const [playerSeat, setPlayerSeat] = useState<number>(1); // 0 = Left, 1 = Center, 2 = Right
  const [selectedTierIndex, setSelectedTierIndex] = useState<number>(0);
  const [showRules, setShowRules] = useState<boolean>(false);

  // Live Game Stats
  const [totalSpentPP, setTotalSpentPP] = useState<number>(0);
  const [totalWonPP, setTotalWonPP] = useState<number>(0);
  const [totalKills, setTotalKills] = useState<number>(0);
  const [rareToasts, setRareToasts] = useState<RareToast3D[]>([]);

  // 3 Seats in Room
  const [seats, setSeats] = useState<HunterSeat[]>([
    { seatIndex: 0, seatName: 'Súng Trái', uid: 'ai_0', displayName: AI_NAMES[0], gunTier: 1, isAI: true, angle: -0.3, lastShotTime: 0 },
    { seatIndex: 1, seatName: 'Súng Giữa (Bạn)', uid: uid, displayName: user?.name || 'Bạn', gunTier: 1, isAI: false, angle: 0, lastShotTime: 0 },
    { seatIndex: 2, seatName: 'Súng Phải', uid: 'ai_1', displayName: AI_NAMES[1], gunTier: 1, isAI: true, angle: 0.3, lastShotTime: 0 },
  ]);

  // Game Engine Refs
  const monstersRef = useRef<FlyingMonster3D[]>([]);
  const bulletsRef = useRef<Bullet3D[]>([]);
  const particlesRef = useRef<Particle3D[]>([]);
  const damagePopsRef = useRef<DamagePop[]>([]);
  const [killLogs, setKillLogs] = useState<KillLog[]>([]);

  const rotAngleRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // 1. Listen to Realtime DB Rooms List
  useEffect(() => {
    const roomsRef = ref(db, 'cyber3d_rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setRooms([]);
        return;
      }
      const roomList: CyberRoom3D[] = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
      setRooms(roomList);

      // If currently inside a room, update current room state
      if (currentRoomId && data[currentRoomId]) {
        setCurrentRoom({
          id: currentRoomId,
          ...data[currentRoomId],
        });
      }
    });

    return () => unsubscribe();
  }, [currentRoomId]);

  // 2. Cleanup player on unmount / exit room
  const leaveAndCleanupRoom = async (roomIdToLeave?: string) => {
    const targetRoomId = roomIdToLeave || currentRoomId;
    if (!targetRoomId) return;

    try {
      const playerRef = ref(db, `cyber3d_rooms/${targetRoomId}/players/${uid}`);
      await remove(playerRef);

      // Check remaining players in room
      const roomPlayersRef = ref(db, `cyber3d_rooms/${targetRoomId}/players`);
      const snap = await get(roomPlayersRef);
      const remainingPlayers = snap.val();

      // If no players left, delete the room node completely!
      if (!remainingPlayers || Object.keys(remainingPlayers).length === 0) {
        await remove(ref(db, `cyber3d_rooms/${targetRoomId}`));
      }
    } catch (err) {
      console.error('Lỗi khi rời phòng và dọn dẹp:', err);
    }

    setCurrentRoomId(null);
    setCurrentRoom(null);
    setViewMode('LOBBY');
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentRoomId) {
        leaveAndCleanupRoom(currentRoomId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      leaveAndCleanupRoom();
    };
  }, [currentRoomId]);

  // Create Room Action
  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      alert('Vui lòng nhập tên phòng!');
      return;
    }

    try {
      const newRoomRef = push(ref(db, 'cyber3d_rooms'));
      const roomId = newRoomRef.key;
      if (!roomId) return;

      const stakeObj = STAKE_OPTIONS.find((s) => s.mult === selectedStakeMult) || STAKE_OPTIONS[0];

      const roomData: Omit<CyberRoom3D, 'id'> = {
        name: newRoomName.trim(),
        hostUid: uid,
        hostName: user?.name || 'Chủ Phòng',
        stakeMult: selectedStakeMult,
        stakeName: stakeObj.name,
        createdAt: Date.now(),
        status: 'WAITING',
        players: {
          [uid]: {
            uid,
            name: user?.name || 'Bạn',
            seatIndex: 1, // Default center seat
            gunTier: 1,
            isReady: true,
            isHost: true,
          },
        },
      };

      await set(newRoomRef, roomData);
      setCurrentRoomId(roomId);
      setCurrentRoom({ id: roomId, ...roomData });
      setViewMode('WAITING_ROOM');
      setShowCreateModal(false);
    } catch (err) {
      alert('Lỗi khi tạo phòng mới!');
    }
  };

  // Join Existing Room
  const handleJoinRoom = async (room: CyberRoom3D) => {
    const playersCount = room.players ? Object.keys(room.players).length : 0;
    if (playersCount >= 3) {
      alert('Phòng đã đầy 3 người chơi!');
      return;
    }

    // Find first available seat (0, 1, or 2)
    const takenSeats = room.players ? Object.values(room.players).map((p) => p.seatIndex) : [];
    let freeSeat = 1;
    if (!takenSeats.includes(1)) freeSeat = 1;
    else if (!takenSeats.includes(0)) freeSeat = 0;
    else if (!takenSeats.includes(2)) freeSeat = 2;

    try {
      const playerPath = ref(db, `cyber3d_rooms/${room.id}/players/${uid}`);
      await set(playerPath, {
        uid,
        name: user?.name || 'Bạn',
        seatIndex: freeSeat,
        gunTier: 1,
        isReady: true,
        isHost: false,
      });

      setPlayerSeat(freeSeat);
      setCurrentRoomId(room.id);
      setCurrentRoom(room);
      setViewMode('WAITING_ROOM');
    } catch (err) {
      alert('Lỗi khi tham gia phòng!');
    }
  };

  // Start Game (Host or Player ready)
  const handleStartGameSession = () => {
    spawnMonsters();
    setViewMode('IN_GAME');
  };

  // Initialize 3D Flying Monsters Pool with Stake Multiplier
  const spawnMonsters = () => {
    const stakeMult = currentRoom?.stakeMult || 1;
    const list: FlyingMonster3D[] = [];
    const monsterTypes: Array<'DRAGON' | 'BAT' | 'MANTA' | 'BOSS'> = ['BAT', 'MANTA', 'DRAGON', 'BOSS'];
    const names = ['Quỷ Dạ Xoa 3D', 'Cá Manta Neon 3D', 'Rồng Thần Cyber 3D', 'CHÚ TỂ MATRIX BOSS 3D'];
    const colors = ['#00f0ff', '#ff00aa', '#00ff66', '#ffd700'];
    const hps = [200, 800, 3000, 15000];
    const baseBounties = [1500, 6000, 25000, 150000];

    for (let i = 0; i < 6; i++) {
      const typeIdx = i === 5 ? 3 : i % 3;
      list.push({
        id: `m_${i}_${Date.now()}`,
        name: names[typeIdx],
        type: monsterTypes[typeIdx],
        x: (Math.random() - 0.5) * 350,
        y: (Math.random() - 0.5) * 160,
        z: 200 + Math.random() * 350,
        vx: (Math.random() - 0.5) * 1.8,
        vy: (Math.random() - 0.5) * 1.2,
        vz: (Math.random() - 0.5) * 1.0,
        hp: hps[typeIdx],
        maxHp: hps[typeIdx],
        baseBountyPP: baseBounties[typeIdx] * stakeMult,
        color: colors[typeIdx],
        size: typeIdx === 3 ? 45 : 22 + typeIdx * 6,
        rotation: Math.random() * Math.PI * 2,
      });
    }
    monstersRef.current = list;
  };

  // Main 3D Canvas Game Loop
  useEffect(() => {
    if (viewMode !== 'IN_GAME') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 500);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const fov = 320;

    const render = () => {
      ctx.fillStyle = '#040712';
      ctx.fillRect(0, 0, width, height);

      rotAngleRef.current += 0.005;
      const rot = rotAngleRef.current;
      const centerX = width / 2;
      const centerY = height / 2 - 20;

      // 1. Draw 3D Grid Sky & Horizon
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.lineWidth = 1;

      for (let z = 100; z <= 650; z += 50) {
        const sy = centerY + (180 * fov) / z;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();
      }

      for (let x = -400; x <= 400; x += 80) {
        const sx1 = centerX + (x * fov) / 100;
        const sy1 = centerY + (180 * fov) / 100;
        const sx2 = centerX + (x * fov) / 650;
        const sy2 = centerY + (180 * fov) / 650;

        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
      }

      // 2. Render Flying 3D Monsters
      monstersRef.current.forEach((m) => {
        m.x += m.vx;
        m.y += m.vy;
        m.z += m.vz;
        m.rotation += 0.02;

        if (m.x < -200 || m.x > 200) m.vx *= -1;
        if (m.y < -120 || m.y > 120) m.vy *= -1;
        if (m.z < 150 || m.z > 550) m.vz *= -1;

        const rx = m.x * Math.cos(rot * 0.5) - m.z * Math.sin(rot * 0.5);
        const rz = m.x * Math.sin(rot * 0.5) + m.z * Math.cos(rot * 0.5) + 380;

        if (rz > 10) {
          const sx = centerX + (rx * fov) / rz;
          const sy = centerY + (m.y * fov) / rz;
          const screenRadius = Math.max(12, (m.size * fov) / rz);

          ctx.save();
          ctx.shadowColor = m.color;
          ctx.shadowBlur = 20;

          ctx.strokeStyle = m.color;
          ctx.lineWidth = m.type === 'BOSS' ? 3 : 2;

          ctx.beginPath();
          const sides = m.type === 'BOSS' ? 8 : m.type === 'DRAGON' ? 6 : 4;
          for (let s = 0; s < sides; s++) {
            const angle = m.rotation + (s / sides) * Math.PI * 2;
            const px = sx + Math.cos(angle) * screenRadius;
            const py = sy + Math.sin(angle) * screenRadius;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();

          ctx.fillStyle = m.color;
          ctx.globalAlpha = 0.25;
          ctx.fill();
          ctx.globalAlpha = 1.0;

          ctx.beginPath();
          ctx.arc(sx, sy, screenRadius * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.restore();

          // Name & Bounty Label
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${m.name}`, sx, sy - screenRadius - 12);

          ctx.fillStyle = '#ffd700';
          ctx.font = 'black 10px monospace';
          ctx.fillText(`THƯỞNG: +${m.baseBountyPP.toLocaleString()} PP`, sx, sy - screenRadius - 2);

          // HP Gauge Bar
          const barW = Math.max(40, screenRadius * 2);
          const barH = 5;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(sx - barW / 2, sy + screenRadius + 6, barW, barH);

          const hpPercent = Math.max(0, m.hp / m.maxHp);
          ctx.fillStyle = hpPercent > 0.5 ? '#00ff66' : hpPercent > 0.2 ? '#ffcc00' : '#ff0055';
          ctx.fillRect(sx - barW / 2, sy + screenRadius + 6, barW * hpPercent, barH);
        }
      });

      // 3. Render Bullets
      const nextBullets: Bullet3D[] = [];
      bulletsRef.current.forEach((b) => {
        const dx = b.targetX - b.startX;
        const dy = b.targetY - b.startY;
        const dz = b.targetZ - 50;

        b.x += dx * 0.12;
        b.y += dy * 0.12;
        b.z += dz * 0.12;

        const rz = b.z + 380;
        if (rz > 10) {
          const sx = centerX + (b.x * fov) / rz;
          const sy = centerY + (b.y * fov) / rz;
          const bulletSize = Math.max(3, (8 * fov) / rz);

          ctx.save();
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 12;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(sx, sy, bulletSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          let hitMonster: FlyingMonster3D | null = null;
          for (const monster of monstersRef.current) {
            const dist = Math.hypot(b.x - monster.x, b.y - monster.y, b.z - monster.z);
            if (dist <= monster.size + 15) {
              hitMonster = monster;
              break;
            }
          }

          if (hitMonster) {
            hitMonster.hp -= b.damage;

            damagePopsRef.current.push({
              id: `pop_${Date.now()}_${Math.random()}`,
              x: sx,
              y: sy - 10,
              damage: b.damage,
              color: b.color,
            });

            for (let p = 0; p < 12; p++) {
              particlesRef.current.push({
                x: hitMonster.x,
                y: hitMonster.y,
                z: hitMonster.z,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                vz: (Math.random() - 0.5) * 6,
                color: b.color,
                size: 3 + Math.random() * 3,
                life: 20,
                maxLife: 20,
              });
            }

            if (hitMonster.hp <= 0) {
              const bounty = hitMonster.baseBountyPP;
              const hunter = b.shooterName;
              const isMe = b.isPlayer;

              const newLog: KillLog = {
                id: `kill_${Date.now()}`,
                hunterName: hunter,
                monsterName: hitMonster.name,
                rewardPP: bounty,
                isPlayer: isMe,
                timeStr: new Date().toLocaleTimeString('vi-VN'),
              };
              setKillLogs((logs) => [newLog, ...logs.slice(0, 9)]);

              if (isMe) {
                setTotalWonPP((w) => w + bounty);
                setTotalKills((k) => k + 1);

                confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
                handleRewardKill(bounty, hitMonster.name);

                // Update Daily Leaderboard
                const todayStr = new Date().toISOString().slice(0, 10);
                const userStatRef = ref(db, `daily_hunting_leaderboard/${todayStr}/${uid}`);
                get(userStatRef).then((snap) => {
                  let currentKills = 0;
                  let currentTotalPP = 0;
                  if (snap.exists()) {
                    const val = snap.val();
                    currentKills = val.killCount || 0;
                    currentTotalPP = val.totalRewardPP || 0;
                  }
                  update(userStatRef, {
                    uid,
                    displayName: user?.name || 'Thợ Săn 3D',
                    killCount: currentKills + 1,
                    totalRewardPP: currentTotalPP + bounty,
                    lastKillTime: Date.now(),
                  });
                });

                // Rare Toast Notification
                if (hitMonster.type === 'BOSS' || hitMonster.type === 'DRAGON' || hitMonster.type === 'MANTA' || bounty >= 25000) {
                  const toastItem: RareToast3D = {
                    id: `toast_3d_${Date.now()}_${Math.random()}`,
                    title: hitMonster.type === 'BOSS' ? '👑 BOSS MATRIX 3D BỊ HẠ' : hitMonster.type === 'DRAGON' ? '🐉 RỒNG THẦN 3D BỊ BẮN HẠ' : '⚡ QUÁI MANTA 3D BỊ BẮN HẠ',
                    monsterName: hitMonster.name,
                    rewardPP: bounty,
                    color: hitMonster.color || '#00f0ff',
                  };
                  setRareToasts((prev) => [...prev.slice(-3), toastItem]);
                  setTimeout(() => {
                    setRareToasts((prev) => prev.filter((t) => t.id !== toastItem.id));
                  }, 3500);
                }
              }

              hitMonster.hp = hitMonster.maxHp * 1.2;
              hitMonster.maxHp = hitMonster.hp;
              hitMonster.x = (Math.random() - 0.5) * 350;
              hitMonster.y = (Math.random() - 0.5) * 160;
              hitMonster.z = 250 + Math.random() * 300;
            }
          } else if (b.z < b.targetZ) {
            nextBullets.push(b);
          }
        }
      });
      bulletsRef.current = nextBullets;

      // 4. Render Particles
      const nextParticles: Particle3D[] = [];
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.life -= 1;

        const rz = p.z + 380;
        if (rz > 10 && p.life > 0) {
          const sx = centerX + (p.x * fov) / rz;
          const sy = centerY + (p.y * fov) / rz;

          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life / p.maxLife;
          ctx.beginPath();
          ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;

          nextParticles.push(p);
        }
      });
      particlesRef.current = nextParticles;

      // 5. Render Damage Popups
      const nextPops: DamagePop[] = [];
      damagePopsRef.current.forEach((dp) => {
        dp.y -= 1.2;
        ctx.fillStyle = dp.color;
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`-${dp.damage}`, dp.x, dp.y);

        if (dp.y > 50) nextPops.push(dp);
      });
      damagePopsRef.current.forEach((dp) => nextPops.push(dp));
      damagePopsRef.current = nextPops;

      // 6. Render 3 Cannon Turrets
      const turretXs = [width * 0.2, width * 0.5, width * 0.8];
      const turretY = height - 15;

      seats.forEach((seat, idx) => {
        const tx = turretXs[idx];
        const isCurrentPlayer = idx === playerSeat;

        ctx.save();
        ctx.translate(tx, turretY);

        ctx.fillStyle = isCurrentPlayer ? '#00f0ff' : '#334155';
        ctx.beginPath();
        ctx.arc(0, 0, 24, Math.PI, 0);
        ctx.fill();

        ctx.rotate(seat.angle);
        ctx.fillStyle = isCurrentPlayer ? '#ff00aa' : '#64748b';
        ctx.fillRect(-6, -35, 12, 35);

        ctx.restore();

        ctx.fillStyle = isCurrentPlayer ? '#00f0ff' : '#94a3b8';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${seat.displayName} ${isCurrentPlayer ? '(BẠN)' : '[AI]'}`, tx, turretY - 32);
      });

      // AI Fire Loop
      const now = Date.now();
      seats.forEach((seat) => {
        if (seat.isAI && now - seat.lastShotTime > 1200 + Math.random() * 800) {
          seat.lastShotTime = now;

          if (monstersRef.current.length > 0) {
            const target = monstersRef.current[Math.floor(Math.random() * monstersRef.current.length)];
            seat.angle = Math.atan2(target.x, target.z) * 0.5;

            bulletsRef.current.push({
              id: `bullet_ai_${now}`,
              shooterSeat: seat.seatIndex,
              shooterName: seat.displayName,
              startX: (seat.seatIndex - 1) * 150,
              startY: 120,
              targetX: target.x,
              targetY: target.y,
              targetZ: target.z,
              x: (seat.seatIndex - 1) * 150,
              y: 120,
              z: 50,
              damage: 60,
              costPP: 0,
              color: '#94a3b8',
              isPlayer: false,
            });
          }
        }
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [viewMode, playerSeat, seats]);

  // Handle Player Award on Kill
  const handleRewardKill = async (rewardPP: number, monsterName: string) => {
    try {
      const userRef = ref(db, `users/${uid}`);
      const newPP = (user?.pp || 0) + rewardPP;
      await update(userRef, {
        pp: newPP,
      });

      const txRef = push(ref(db, `transactions/${uid}`));
      await update(txRef, {
        type: 'GAME_WIN',
        amount: rewardPP,
        title: `Săn Được 3D: ${monsterName}`,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Lỗi cộng thưởng săn 3D:', err);
    }
  };

  // Player Fires Shot (Supports Touch & Mouse)
  const handleFireShot = async (targetXPercentage?: number, targetYPercentage?: number) => {
    const stakeMult = currentRoom?.stakeMult || 1;
    const selectedGun = BULLET_TIERS[selectedTierIndex];
    const bulletCost = selectedGun.baseCost * stakeMult;
    const currentPP = user?.pp || 0;

    if (currentPP < bulletCost) {
      alert(`Bạn không đủ ${bulletCost.toLocaleString()} PP để bắn khẩu súng này! Vui lòng chọn súng cược thấp hơn.`);
      return;
    }

    try {
      const userRef = ref(db, `users/${uid}`);
      await update(userRef, {
        pp: currentPP - bulletCost,
      });

      setTotalSpentPP((s) => s + bulletCost);

      const canvas = canvasRef.current;
      const width = canvas?.width || 800;
      const height = canvas?.height || 500;

      const clickX = targetXPercentage !== undefined ? targetXPercentage * width : width / 2;
      const clickY = targetYPercentage !== undefined ? targetYPercentage * height : height / 3;

      const tX = (clickX - width / 2) * 0.8;
      const tY = (clickY - height / 2) * 0.8;
      const tZ = 250;

      setSeats((prev) =>
        prev.map((s) => (s.seatIndex === playerSeat ? { ...s, angle: Math.atan2(tX, tZ) * 0.5 } : s))
      );

      const startXOffset = (playerSeat - 1) * 150;
      bulletsRef.current.push({
        id: `bullet_player_${Date.now()}`,
        shooterSeat: playerSeat,
        shooterName: user?.name || 'Bạn',
        startX: startXOffset,
        startY: 120,
        targetX: tX,
        targetY: tY,
        targetZ: tZ,
        x: startXOffset,
        y: 120,
        z: 50,
        damage: selectedGun.damage,
        costPP: bulletCost,
        color: selectedGun.color,
        isPlayer: true,
      });
    } catch (err) {
      console.error('Lỗi bắn súng 3D:', err);
    }
  };

  // Touch and Mouse Pointer Input Event Handler
  const handleCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;

    handleFireShot(xPct, yPct);
  };

  // Keyboard Listener for Spacebar shooting in 3D arena
  useEffect(() => {
    if (viewMode !== 'IN_GAME') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        showRules
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleFireShot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, playerSeat, selectedTierIndex, showRules, currentRoom, user?.pp]);

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-4 font-mono select-none animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[900px] bg-[#050811] border border-cyan-500/40 rounded-3xl flex flex-col shadow-[0_0_100px_rgba(0,240,255,0.3)] overflow-hidden">
        
        {/* Top Glow Bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-pink-500 to-yellow-400" />

        {/* Modal Header */}
        <div className="relative z-10 p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <Crosshair className="w-6 h-6 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 border border-pink-500/40 text-[9px] font-black rounded-full uppercase tracking-wider">
                  PHÒNG 3 NGƯỜI MULTIPLAYER
                </span>
                {currentRoom && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black rounded-full uppercase tracking-wider">
                    {currentRoom.stakeName}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider text-glow-cyan flex items-center gap-2 mt-0.5">
                ĐẤU TRƯỜNG 3D: SẮN QUÁI BAY MULTIPLAYER
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRules(!showRules)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>LUẬT CHƠI</span>
            </button>

            <button
              onClick={() => {
                leaveAndCleanupRoom();
                onClose();
              }}
              className="w-9 h-9 rounded-xl bg-slate-900 border border-white/20 text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODE 1: ROOM LOBBY LIST */}
        {viewMode === 'LOBBY' && (
          <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto font-sans bg-[#080d1a]">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    DANH SÁCH PHÒNG CHỜ BẮN QUÁI 3D ({rooms.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Chọn phòng phù hợp hoặc tự tạo phòng mới cùng 3 người chơi cùng săn thưởng Rồng Thần 3D.
                  </p>
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-black font-black text-xs uppercase rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>TẠO PHÒNG MỚI</span>
                </button>
              </div>

              {/* Rooms Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {rooms.length === 0 ? (
                  <div className="col-span-full py-16 text-center bg-slate-950/60 border border-white/5 rounded-2xl">
                    <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <div className="text-slate-300 font-bold text-sm">Chưa có phòng nào đang mở</div>
                    <p className="text-slate-500 text-xs mt-1">Hãy tạo phòng mới đầu tiên để thi đấu cùng bạn bè!</p>
                  </div>
                ) : (
                  rooms.map((rm) => {
                    const pCount = rm.players ? Object.keys(rm.players).length : 0;
                    return (
                      <div
                        key={rm.id}
                        className="p-4 bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 rounded-2xl flex flex-col justify-between transition-all group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] font-black rounded-full uppercase">
                              {rm.stakeName}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-pink-400" />
                              {pCount} / 3 Súng
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {rm.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">
                            Chủ phòng: <strong className="text-slate-200">{rm.hostName}</strong>
                          </p>
                        </div>

                        <button
                          onClick={() => handleJoinRoom(rm)}
                          disabled={pCount >= 3}
                          className="mt-4 w-full py-2.5 bg-slate-900 hover:bg-cyan-500 hover:text-black border border-cyan-500/40 text-cyan-300 font-black text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>{pCount >= 3 ? 'PHÒNG ĐÃ ĐẦY' : 'VÀO PHÒNG BẮN'}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Create Room Modal Popup */}
            {showCreateModal && (
              <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#090e1f] border border-cyan-500/40 rounded-3xl p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-base font-black text-white uppercase flex items-center gap-2">
                      <Plus className="w-5 h-5 text-cyan-400" />
                      TẠO PHÒNG BẮN 3D MỚI
                    </h3>
                    <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">Tên phòng bắn:</label>
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/20 rounded-xl px-3 py-2 text-sm text-white font-bold focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1.5">Mức cược cược quái & đạn:</label>
                    <div className="space-y-2">
                      {STAKE_OPTIONS.map((stk) => (
                        <button
                          key={stk.mult}
                          onClick={() => setSelectedStakeMult(stk.mult)}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            selectedStakeMult === stk.mult
                              ? 'bg-cyan-500/20 border-cyan-400 text-white'
                              : 'bg-slate-950 border-white/10 text-slate-400'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{stk.name}</div>
                            <div className="text-[10px] text-slate-400">{stk.desc}</div>
                          </div>
                          {selectedStakeMult === stk.mult && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="w-1/2 py-2.5 bg-slate-900 border border-white/10 text-slate-400 font-bold text-xs uppercase rounded-xl"
                    >
                      HỦY BỎ
                    </button>
                    <button
                      onClick={handleCreateRoom}
                      className="w-1/2 py-2.5 bg-cyan-500 text-black font-black text-xs uppercase rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                    >
                      XÁC NHẬN TẠO
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: WAITING ROOM */}
        {viewMode === 'WAITING_ROOM' && currentRoom && (
          <div className="flex-1 p-6 flex flex-col justify-between font-sans bg-[#080d1a]">
            <div className="max-w-3xl mx-auto w-full space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black rounded-full uppercase">
                    {currentRoom.stakeName}
                  </span>
                  <h3 className="text-2xl font-black text-white uppercase tracking-wider mt-2">
                    {currentRoom.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Chủ phòng: <strong className="text-cyan-300">{currentRoom.hostName}</strong>
                  </p>
                </div>

                <button
                  onClick={() => leaveAndCleanupRoom()}
                  className="px-4 py-2 bg-slate-900 hover:bg-red-500/20 border border-white/10 text-slate-400 hover:text-red-400 font-bold text-xs uppercase rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>RỜI PHÒNG</span>
                </button>
              </div>

              {/* 3 Seats Grid */}
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((sIndex) => {
                  const playerList = currentRoom.players
                    ? (Object.values(currentRoom.players) as Array<{
                        uid: string;
                        name: string;
                        seatIndex: number;
                        gunTier: number;
                        isReady: boolean;
                        isHost: boolean;
                      }>)
                    : [];
                  const pInSeat = playerList.find((p) => p.seatIndex === sIndex) || null;
                  const isMySeat = pInSeat?.uid === uid;
                  const seatLabels = ['Súng Trái', 'Súng Giữa', 'Súng Phải'];

                  return (
                    <div
                      key={sIndex}
                      className={`p-5 rounded-3xl border flex flex-col items-center justify-between text-center min-h-[220px] transition-all ${
                        pInSeat
                          ? isMySeat
                            ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                            : 'bg-slate-950 border-white/20'
                          : 'bg-slate-950/40 border-dashed border-white/10'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold text-slate-400 uppercase">{seatLabels[sIndex]}</div>

                      {pInSeat ? (
                        <div className="my-auto space-y-2">
                          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-cyan-400/50 flex items-center justify-center mx-auto text-cyan-300 font-black text-xl shadow-md">
                            {pInSeat.name.charAt(0)}
                          </div>
                          <div className="text-sm font-bold text-white">{pInSeat.name}</div>
                          {pInSeat.isHost && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-[9px] font-black rounded-full uppercase flex items-center justify-center gap-1">
                              <Crown className="w-3 h-3 text-yellow-400" />
                              CHỦ PHÒNG
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="my-auto text-slate-600">
                          <Users className="w-8 h-8 mx-auto mb-1 opacity-40" />
                          <div className="text-xs font-bold">Chưa có người</div>
                        </div>
                      )}

                      {!pInSeat && (
                        <button
                          onClick={async () => {
                            setPlayerSeat(sIndex);
                            await update(ref(db, `cyber3d_rooms/${currentRoom.id}/players/${uid}`), {
                              seatIndex: sIndex,
                            });
                          }}
                          className="w-full py-2 bg-slate-900 hover:bg-cyan-500 hover:text-black border border-cyan-500/40 text-cyan-300 font-bold text-xs uppercase rounded-xl cursor-pointer"
                        >
                          ĐỔI SANG GHẾ NÀY
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>

            <div className="max-w-3xl mx-auto w-full pt-4 border-t border-white/10">
              <button
                onClick={handleStartGameSession}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 text-black font-black text-base uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(0,240,255,0.5)] cursor-pointer flex items-center justify-center gap-2"
              >
                <Crosshair className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
                <span>BẮT ĐẦU VÁN BẮN 3D SẮN QUÁI</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE 3: IN GAME STAGE */}
        {viewMode === 'IN_GAME' && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 overflow-hidden">
            
            {/* Main 3D Canvas Stage */}
            <div className="relative md:col-span-3 bg-slate-950 flex flex-col items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-white/10">
              <canvas
                ref={canvasRef}
                onPointerDown={handleCanvasPointer}
                className="w-full h-full cursor-crosshair active:scale-[0.99] transition-transform touch-none"
              />

              {/* Top Stats Overlay */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none font-mono z-20">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-900/90 border border-cyan-500/40 px-3 py-1.5 rounded-2xl backdrop-blur-md shadow-lg flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-[8px] text-slate-400 uppercase">Ví PP Hiện Tại</div>
                      <div className="text-sm font-black text-emerald-300">{(user?.pp || 0).toLocaleString()} PP</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-yellow-500/40 px-3 py-1.5 rounded-2xl backdrop-blur-md shadow-lg flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400 animate-bounce" />
                    <div>
                      <div className="text-[8px] text-slate-400 uppercase">Săn Được Ván Này</div>
                      <div className="text-sm font-black text-yellow-300">+{totalWonPP.toLocaleString()} PP</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-slate-900/90 border border-cyan-400/50 px-2.5 py-1.5 rounded-2xl backdrop-blur-md shadow-lg flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                    <span className="hidden sm:inline">⌨️ [Spacebar] = Bắn</span>
                    <span className="sm:hidden">🎯 Chạm / Chuột Để Bắn</span>
                  </div>
                </div>
              </div>

              {/* FLOATING RARE MONSTER TOAST NOTIFICATIONS */}
              <div className="absolute top-16 right-3 z-30 flex flex-col gap-2 max-w-xs pointer-events-none font-mono">
                {rareToasts.map((toast) => (
                  <div
                    key={toast.id}
                    style={{ borderColor: toast.color }}
                    className="bg-slate-950/95 border-2 rounded-2xl p-3 shadow-2xl backdrop-blur-md animate-bounce flex items-center gap-2.5 text-left pointer-events-auto"
                  >
                    <div className="w-8 h-8 rounded-xl bg-black/80 flex items-center justify-center text-lg shrink-0 border border-white/20">
                      🎯
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-wider" style={{ color: toast.color }}>
                        {toast.title}
                      </div>
                      <div className="text-xs font-bold text-white">
                        {toast.monsterName}
                      </div>
                      <div className="text-xs font-black text-emerald-400">
                        Thưởng +{toast.rewardPP.toLocaleString()} PP!
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Floating Rules Modal */}
              {showRules && (
                <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md p-6 flex flex-col justify-between overflow-y-auto font-sans animate-fadeIn">
                  <div className="space-y-4 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <h3 className="text-lg font-black text-cyan-300 uppercase flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-cyan-400" />
                        LUẬT CHƠI ĐẤU TRƯỜNG 3D
                      </h3>
                      <button onClick={() => setShowRules(false)} className="text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded-lg text-xs">
                        Đóng
                      </button>
                    </div>

                    <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                      <p className="bg-cyan-500/10 border border-cyan-500/30 p-3 rounded-xl text-cyan-200 font-bold">
                        🎯 Chạm Tay Trực Tiếp Trên Màn Hình Điện Thoại Hoặc Chuột Laptop Vào Mục Tiêu Quái Bay 3D Để Bắn!
                      </p>
                      
                      <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Mức Cược Đạn</strong>: Mỗi phát bắn tốn tiền cược PP tương ứng với cấp Súng x Hệ số cược Phòng.</li>
                        <li><strong>Thần Rồng & Boss Matrix</strong>: Tiêu diệt quái 3D để gom trọn phần thưởng Học Bổng PP cực khủng!</li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowRules(false)}
                    className="mt-4 max-w-2xl mx-auto w-full py-3 bg-cyan-500 text-black font-black text-xs uppercase rounded-xl cursor-pointer"
                  >
                    HIỂU RỒI - VÀO ĐẤU TRƯỜNG BẮN NGAY
                  </button>
                </div>
              )}
            </div>

            {/* Controls & Gun Selection Panel */}
            <div className="p-4 bg-[#080d1a] flex flex-col justify-between font-mono space-y-4 overflow-y-auto border-t md:border-t-0">
              
              <div className="space-y-4">
                
                {/* Select Gun Tier */}
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold block mb-1.5">
                    Chọn Loại Súng 3D:
                  </label>
                  <div className="space-y-2">
                    {BULLET_TIERS.map((gun, idx) => {
                      const stakeMult = currentRoom?.stakeMult || 1;
                      const bulletCost = gun.baseCost * stakeMult;

                      return (
                        <button
                          key={gun.tier}
                          onClick={() => setSelectedTierIndex(idx)}
                          className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            selectedTierIndex === idx
                              ? 'bg-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                              : 'bg-slate-950 border-white/10 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-black text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: gun.color }} />
                              {gun.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-sans mt-0.5">{gun.desc}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-amber-400">-{bulletCost.toLocaleString()} PP</div>
                            <div className="text-[9px] text-cyan-300 font-mono">Dmg: {gun.damage}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Kill Feed Logs */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Nhật Ký Săn Quái 3D Realtime:
                  </label>
                  <div className="bg-slate-950 border border-white/10 rounded-xl p-2 h-28 overflow-y-auto space-y-1 scrollbar-thin">
                    {killLogs.length === 0 ? (
                      <div className="text-[10px] text-slate-500 text-center py-8">Chưa có hạ gục nào...</div>
                    ) : (
                      killLogs.map((log) => (
                        <div key={log.id} className="text-[10px] font-sans flex items-center justify-between border-b border-white/5 pb-1">
                          <span className={log.isPlayer ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                            🎯 <strong>{log.hunterName}</strong> diệt {log.monsterName}
                          </span>
                          <span className="text-emerald-400 font-bold">+{log.rewardPP.toLocaleString()} PP</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleFireShot()}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Crosshair className="w-5 h-5 text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
                  BẮN SÚNG (-{(BULLET_TIERS[selectedTierIndex].baseCost * (currentRoom?.stakeMult || 1)).toLocaleString()} PP)
                </button>

                <button
                  onClick={() => setViewMode('WAITING_ROOM')}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-white font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  VỀ PHÒNG CHỜ
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
