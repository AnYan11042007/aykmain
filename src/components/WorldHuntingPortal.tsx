/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { get, ref, update, push, onValue } from 'firebase/database';
import { db } from '../firebase';
import { User } from '../types';
import { 
  Crosshair, 
  Flame, 
  Trophy, 
  Zap, 
  Sparkles, 
  Target, 
  Users, 
  Activity,
  History,
  BookOpen,
  X,
  Coins,
  BatteryCharging,
  ShieldAlert,
  Edit3,
  MapPin,
  Brain,
  Clock
} from 'lucide-react';

interface WorldHuntingPortalProps {
  uid: string;
  user: User | null;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

interface Beast {
  id: string;
  name: string;
  icon: string;
  hp: number;
  maxHp: number;
  rewardPP: number;
  x: number; // percentage 5-90%
  y: number; // percentage 10-65%
  vx: number;
  vy: number;
  tier: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'BOSS';
  zoneId: number; // 1, 2, or 3
}

interface Bullet {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  angle: number; // degrees
  speed: number;
  shooterName: string;
  isPlayer: boolean;
  bulletCost: number;
  isCritical?: boolean;
}

interface DamagePop {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

interface KillLog {
  id: string;
  hunter: string;
  beastName: string;
  rewardStr: string;
  isPlayer: boolean;
  time: string;
}

interface PersonalHuntHistory {
  id: string;
  beastName: string;
  icon: string;
  rewardPP: number;
  costPP: number;
  timestamp: number;
  timeStr: string;
}

const AI_BOT_NAMES = [
  'Thợ Săn AI #01', 'Gia Sư Toán AI', 'AYK Bot Vàng', 'Thánh Săn Thú',
  'Tân Sinh Viên AI', 'Bé Heo Bot', 'Vua Bắn Cá AI', 'Thợ Săn Rồng',
  'VIP Master #86', 'Gia Sư Tin AI', 'Thần Săn Đêm', 'Pro Gamer 2026',
  'Hắc Sư Bot', 'AI Siêu Cấp', 'Chiến Thần AYK8686', 'Thợ Săn Kỳ Lân',
  'AYK Auto Bot', 'Phượng Hoàng AI', 'Hải Săn Thú', 'Kẻ Diệt Boss',
  'Thiên Tài AI', 'Thủ Khoa AYK'
];

// Expanded Fish & Mythic Beast Templates divided by Zones
const BEAST_TEMPLATES_ZONE1 = [
  { name: 'Cá Thần Tài AYK', icon: '🐠', maxHp: 15000, rewardPP: 45000, tier: 'COMMON' },
  { name: 'Cá Mập Sát Thủ', icon: '🦈', maxHp: 60000, rewardPP: 250000, tier: 'COMMON' },
  { name: 'Mực Khổng Lồ Kraken', icon: '🦑', maxHp: 250000, rewardPP: 1200000, tier: 'UNCOMMON' },
];

const BEAST_TEMPLATES_ZONE2 = [
  { name: 'Cá Voi Xanh Đại Dương', icon: '🐋', maxHp: 1000000, rewardPP: 6000000, tier: 'UNCOMMON' },
  { name: 'Bạch Hoa Xà Thần', icon: '🐍', maxHp: 4000000, rewardPP: 30000000, tier: 'RARE' },
  { name: 'Rùa Thần Kim Cương', icon: '🐢', maxHp: 12000000, rewardPP: 100000000, tier: 'RARE' },
];

const BEAST_TEMPLATES_ZONE3 = [
  { name: 'Phượng Hoàng Lửa AYK', icon: '🦅', maxHp: 40000000, rewardPP: 400000000, tier: 'EPIC' },
  { name: 'CUA HOÀNG GIA KIM CƯƠNG', icon: '🦀', maxHp: 90000000, rewardPP: 900000000, tier: 'EPIC' },
  { name: 'BÁ CHỦ RỒNG THẦN CỔ ĐẠI AYK8686', icon: '🐉', maxHp: 300000000, rewardPP: 3000000000, tier: 'BOSS' }
];

// Web Audio API Synthesizers for QTE Reflex Mini-Game & World Boss Events
const playQTEKeySound = (stepIndex = 0) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Major scale progression for ascending pitch satisfaction on correct QTE key hits
    const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51]; 
    const freq = scale[stepIndex % scale.length] || 523.25;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.35, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch (err) {}
};

const playQTEErrorSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(75, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch (err) {}
};

const playQTEExplosionSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (err) {}
};

const playWorldBossSpawnSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Warning siren oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + 0.3);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.6);
    osc.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + 1.0);
    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);

    // Sub-bass Dragon Roar Rumble
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(85, ctx.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 1.2);
    subGain.gain.setValueAtTime(0.65, ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start();
    subOsc.stop(ctx.currentTime + 1.2);
  } catch (err) {}
};

const playQTESuccessSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.35, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
    });
  } catch (err) {}
};

const playShopPurchaseSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [659.25, 987.77, 1318.51]; // E5, B5, E6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.07 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.2);
    });
  } catch (err) {}
};

export default function WorldHuntingPortal({ uid, user, onShowResult }: WorldHuntingPortalProps) {
  // Selected Zone state (1: Tân Thủ, 2: Đại Dương, 3: Hang Rồng Boss)
  const [activeZone, setActiveZone] = useState<1 | 2 | 3>(1);

  // Arrow angle 0 to 180 degrees sweep
  const [arrowAngle, setArrowAngle] = useState(90);
  const [sweepDir, setSweepDir] = useState(1); // 1 clockwise, -1 counter

  // Bullet bet cost: standard or custom input
  const [bulletCost, setBulletCost] = useState('10000'); // default 10k
  const [customBulletCost, setCustomBulletCost] = useState('1000000'); // 1M custom default
  const [useCustomBet, setUseCustomBet] = useState(false);

  // Local state for fast PP display update
  const [localPP, setLocalPP] = useState<number>(user?.pp || 0);

  // QTE Combo particle pops feedback state
  const [qteComboPops, setQteComboPops] = useState<{ id: string; text: string; color: string }[]>([]);

  useEffect(() => {
    if (user?.pp !== undefined) {
      setLocalPP(user.pp);
    }
  }, [user?.pp]);

  // Real-time Spawn Timer (Wave Countdown 6s -> 0s)
  const [spawnCountdown, setSpawnCountdown] = useState(6);

  // Live Community Hunters Counter (Simulated / Real-time)
  const [onlineHuntersCount, setOnlineHuntersCount] = useState(28);

  // Hunting Energy System (Max 100)
  const [energy, setEnergy] = useState(100);
  const MAX_ENERGY = 100;
  const SHOT_ENERGY_COST = 10;

  // Real-Time Economy & Difficulty Settings from Admin Portal
  const [huntingSettings, setHuntingSettings] = useState({
    bossSpawnRate: 1.0,
    bossHpMultiplier: 1.0,
    ppRewardMultiplier: 1.0,
    beastSpeedMultiplier: 1.0
  });

  useEffect(() => {
    const huntConfigRef = ref(db, 'settings/hunting');
    const unsub = onValue(huntConfigRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setHuntingSettings({
          bossSpawnRate: val.bossSpawnRate || 1.0,
          bossHpMultiplier: val.bossHpMultiplier || 1.0,
          ppRewardMultiplier: val.ppRewardMultiplier || 1.0,
          beastSpeedMultiplier: val.beastSpeedMultiplier || 1.0
        });
      }
    });

    // Realtime trigger from admin to force Boss Spawn
    const triggerRef = ref(db, 'settings/hunting_trigger');
    const unsubTrigger = onValue(triggerRef, (snap) => {
      if (snap.exists() && snap.val()?.timestamp) {
        const trigTime = snap.val().timestamp;
        // Only trigger if happened in last 10 seconds
        if (Date.now() - trigTime < 10000) {
          triggerWorldBossSpawn();
        }
      }
    });

    return () => {
      unsub();
      unsubTrigger();
    };
  }, []);

  // Temporary Buffs & Energy Refills Shop State
  const [activeBuff, setActiveBuff] = useState<'NONE' | 'DMG_2X' | 'CRIT_BOOST'>('NONE');
  const [buffSecondsLeft, setBuffSecondsLeft] = useState(0);
  const [showShopModal, setShowShopModal] = useState(false);

  // Buff countdown timer effect
  useEffect(() => {
    if (buffSecondsLeft <= 0) {
      if (activeBuff !== 'NONE') setActiveBuff('NONE');
      return;
    }
    const timer = setInterval(() => {
      setBuffSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [buffSecondsLeft, activeBuff]);

  // Slash Impact Animation trigger state
  const [showSlashOverlay, setShowSlashOverlay] = useState(false);

  // Tab: Live Feed vs Personal Hunt History vs World Boss Top 10 Leaderboard
  const [sidebarTab, setSidebarTab] = useState<'LIVE' | 'HISTORY' | 'BOSS_TOP10'>('LIVE');
  const [personalHistory, setPersonalHistory] = useState<PersonalHuntHistory[]>([]);

  // World Boss Top 10 Damage Leaderboard State (Resets on Boss Death)
  const [bossDamageMap, setBossDamageMap] = useState<{ [name: string]: { name: string; damage: number; isPlayer?: boolean } }>({});

  const recordBossDamage = (name: string, dmg: number, isPlayer: boolean = false) => {
    if (dmg <= 0) return;
    setBossDamageMap((prev) => {
      const current = prev[name] || { name, damage: 0, isPlayer };
      return {
        ...prev,
        [name]: {
          name,
          damage: current.damage + dmg,
          isPlayer: current.isPlayer || isPlayer
        }
      };
    });
  };

  // Rules Modal
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Game Engine entities
  const [beasts, setBeasts] = useState<Beast[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [damagePops, setDamagePops] = useState<DamagePop[]>([]);
  const [killLogs, setKillLogs] = useState<KillLog[]>([]);

  // Boss Skill Mini-Game Modal State
  const [showBossChallenge, setShowBossChallenge] = useState(false);
  const [mathNum1, setMathNum1] = useState(12);
  const [mathNum2, setMathNum2] = useState(15);
  const [mathAnswer, setMathAnswer] = useState('');
  const [challengeTargetPos, setChallengeTargetPos] = useState({ x: 50, y: 50 });
  const [challengeTimer, setChallengeTimer] = useState(5);

  // 30-Minute World Boss Event & QTE Reflex Mini-Game State
  const [bossEventCountdown, setBossEventCountdown] = useState(1800); // 30 minutes in seconds
  const [showQTEModal, setShowQTEModal] = useState(false);
  const [qteSequence, setQteSequence] = useState<string[]>([]);
  const [qteIndex, setQteIndex] = useState(0);
  const [qteTimeLeft, setQteTimeLeft] = useState(5.0);
  const [qteStreak, setQteStreak] = useState(0);

  const QTE_KEYS = ['A', 'S', 'D', 'W', 'J', 'K', 'L', '7', '8', '9'];

  // Start QTE Reflex Mini-Game Sequence (3 seconds duration)
  const startQTEReflexChallenge = () => {
    const pLevel = user?.level || Math.floor((user?.pp || 0) / 100000) + 1;
    // High-level players require longer combos (6 to 8 keys), low-level players get 4 keys
    const seqLength = pLevel >= 10 ? Math.min(8, 5 + Math.floor(pLevel / 6)) : 4;
    const seq = Array.from({ length: seqLength }, () => QTE_KEYS[Math.floor(Math.random() * QTE_KEYS.length)]);
    setQteSequence(seq);
    setQteIndex(0);
    setQteTimeLeft(3.0); // 3 seconds reflex challenge
    setShowQTEModal(true);
  };

  // Trigger World Boss Spawn Event
  const triggerWorldBossSpawn = () => {
    playWorldBossSpawnSound();
    setActiveZone(3);
    setBossDamageMap({}); // Reset World Boss damage leaderboard for new Boss
    const calculatedHp = Math.floor(300000000 * (huntingSettings.bossHpMultiplier || 1.0));
    const bossBeast: Beast = {
      id: `world_boss_${Date.now()}`,
      name: 'BÁ CHỦ RỒNG THẦN CỔ ĐẠI',
      icon: '🐉',
      hp: calculatedHp,
      maxHp: calculatedHp,
      rewardPP: Math.floor(500000000 * (huntingSettings.ppRewardMultiplier || 1.0)),
      x: 45,
      y: 25,
      vx: 0.2 * (huntingSettings.beastSpeedMultiplier || 1.0),
      vy: 0.1 * (huntingSettings.beastSpeedMultiplier || 1.0),
      tier: 'BOSS',
      zoneId: 3
    };
    setBeasts((prev) => [...prev.filter((b) => b.tier !== 'BOSS'), bossBeast]);
    startQTEReflexChallenge();
  };

  // 30-Minute World Boss Timer Effect
  useEffect(() => {
    const bossTimer = setInterval(() => {
      setBossEventCountdown((prev) => {
        if (prev <= 1) {
          triggerWorldBossSpawn();
          return 1800; // Reset 30 mins
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(bossTimer);
  }, []);

  // QTE Countdown Timer
  useEffect(() => {
    if (!showQTEModal) return;
    const interval = setInterval(() => {
      setQteTimeLeft((prev) => {
        if (prev <= 0.1) {
          setShowQTEModal(false);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [showQTEModal]);

  // QTE Keyboard Listener
  useEffect(() => {
    if (!showQTEModal || qteSequence.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const pressed = e.key.toUpperCase();
      handleQTEKeyPress(pressed);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQTEModal, qteSequence, qteIndex]);

  const handleQTEKeyPress = (key: string) => {
    if (!showQTEModal || qteIndex >= qteSequence.length) return;

    const targetKey = qteSequence[qteIndex];
    if (key === targetKey) {
      // Play pitch-ascending sound for satisfying sequence progression
      playQTEKeySound(qteIndex);
      if (navigator.vibrate) try { navigator.vibrate(30); } catch (err) {}

      // Trigger colorful particle burst on correct key hit
      confetti({
        particleCount: 25 + qteIndex * 8,
        spread: 60 + qteIndex * 10,
        origin: { y: 0.55, x: 0.5 },
        colors: ['#ffd700', '#00f0ff', '#10b981', '#ff0055', '#a855f7']
      });

      // Spawn floating particle feedback pop
      const comboLabels = ['⚡ PERFECT!', '🔥 GREAT!', '💥 INSANE!', '🚀 SUPERB!', '👑 GODLIKE!'];
      const popText = comboLabels[qteIndex % comboLabels.length];
      const popId = `qte_combo_${Date.now()}_${Math.random()}`;
      setQteComboPops((prev) => [
        ...prev, 
        { id: popId, text: `${popText} (COMBO x${qteIndex + 1})`, color: qteIndex % 2 === 0 ? '#ffd700' : '#00f0ff' }
      ]);

      setTimeout(() => {
        setQteComboPops((prev) => prev.filter((p) => p.id !== popId));
      }, 700);

      if (qteIndex + 1 >= qteSequence.length) {
        executeQTEUltimateStrike();
      } else {
        setQteIndex((prev) => prev + 1);
      }
    } else {
      playQTEErrorSound();
      if (navigator.vibrate) try { navigator.vibrate([40, 40, 40]); } catch (err) {}
    }
  };

  const executeQTEUltimateStrike = () => {
    setShowQTEModal(false);
    playQTESuccessSound();
    playQTEExplosionSound();
    confetti({ particleCount: 220, spread: 100, origin: { y: 0.5 } });
    setTimeout(() => {
      confetti({ particleCount: 120, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 120, angle: 120, spread: 55, origin: { x: 1 } });
    }, 180);

    const pLevel = user?.level || Math.floor((user?.pp || 0) / 100000) + 1;
    // Support multiplier for low-level players (up to 3.0x multiplier)
    const supportMult = pLevel < 10 ? Math.max(1.8, 3.2 - pLevel * 0.12) : 1.0;
    // Combo scaling multiplier for high-level players based on sequence length
    const comboMult = 1 + (qteSequence.length - 4) * 0.25;

    const boss = beasts.find((b) => b.tier === 'BOSS');
    let ultDamage = 0;

    if (boss && boss.maxHp >= 100000000) {
      // 300M World Boss scale: 12M to 35M damage per successful QTE combo
      ultDamage = Math.floor((12000000 + Math.random() * 23000000) * supportMult * comboMult);
    } else {
      const baseDamage = 95000 + Math.floor(Math.random() * 35000);
      ultDamage = Math.floor(baseDamage * supportMult * comboMult);
    }

    if (boss) {
      recordBossDamage(user?.name || 'Sếp S88', ultDamage, true);
      const isKillHit = boss.hp <= ultDamage;
      setBeasts((prev) =>
        prev.map((b) => {
          if (b.id === boss.id) {
            const newHp = Math.max(0, b.hp - ultDamage);
            return { ...b, hp: newHp };
          }
          return b;
        })
      );

      if (isKillHit) {
        // Player got the LAST HIT on 300M World Boss!
        const grandReward = boss.rewardPP || 500000000;
        const dragonFrame = 'https://png.pngtree.com/png-clipart/20240319/original/pngtree-avatar-frame-dragon-round-animal-template-for-game-cartoon-empty-dragon-png-image_14623493.png';
        
        setLocalPP((prev) => prev + grandReward);
        const currentFrames = user?.inventory?.frames || [];
        const updatedFrames = Array.from(new Set([...currentFrames, dragonFrame]));

        update(ref(db, `users/${uid}`), { 
          pp: localPP + grandReward,
          'inventory/frames': updatedFrames,
          activeFrame: dragonFrame
        });

        onShowResult(
          '🎉 HẠ GỤC BOSS THẾ GIỚI! 🐉',
          `CHÚC MỪNG SẾP ĐÃ DỨT ĐIỂM BÁ CHỦ RỒNG THẦN CỔ ĐẠI!\nPhần thưởng: +${grandReward.toLocaleString()} PP & Mở khóa KHUNG RỒNG THẦN THƯỢNG CỔ!`,
          true
        );
      }
    }

    const reward = boss && boss.maxHp >= 100000000 ? Math.floor(5000000 * supportMult) : Math.floor(30000 * supportMult);
    setLocalPP((prev) => prev + reward);
    update(ref(db, `users/${uid}`), { pp: localPP + reward });

    setShowSlashOverlay(true);
    setTimeout(() => setShowSlashOverlay(false), 500);

    const levelBadgeText = pLevel < 10 
      ? ` [🛡️ HỖ TRỢ TÂN THỦ x${supportMult.toFixed(1)}]`
      : ` [👑 COMBO x${qteSequence.length} PHÍM]`;

    setDamagePops((prev) => [
      ...prev,
      {
        id: `qte_pop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        x: 50,
        y: 25,
        text: `⚡ SUPER QTE COMBO STRIKE -${ultDamage.toLocaleString()} HP! (+${reward.toLocaleString()} PP)${levelBadgeText}`,
        color: '#ffd700'
      }
    ]);

    setQteStreak((prev) => prev + 1);
  };

  // Purchase Buffs or Energy Refill from Hunting Shop
  const handleBuyHuntingItem = async (type: 'ENERGY_REFILL' | 'DMG_2X' | 'CRIT_BOOST') => {
    let cost = 0;
    let title = '';

    if (type === 'ENERGY_REFILL') {
      cost = 500000;
      title = 'Bình Nạp Năng Lượng (+100 Energy)';
    } else if (type === 'DMG_2X') {
      cost = 2000000;
      title = 'Thuốc Tăng Lực Sát Thương x2 (5 Phút)';
    } else if (type === 'CRIT_BOOST') {
      cost = 3000000;
      title = 'Thuốc Săn Boss Thượng Cổ (+50% Chí Mạng)';
    }

    if (localPP < cost) {
      onShowResult('THẤT BẠI ❌', `Bạn không có đủ ${cost.toLocaleString()} PP để mua ${title}!`, false);
      return;
    }

    try {
      const userRef = ref(db, `users/${uid}`);
      const userSnap = await get(userRef);
      if (!userSnap.exists()) return;
      const freshPP = userSnap.val()?.pp || 0;

      if (freshPP < cost) {
        onShowResult('THẤT BẠI ❌', `Tài khoản không đủ ${cost.toLocaleString()} PP!`, false);
        return;
      }

      const nextPP = freshPP - cost;
      await update(userRef, { pp: nextPP });
      setLocalPP(nextPP);

      playShopPurchaseSound();

      if (type === 'ENERGY_REFILL') {
        setEnergy(MAX_ENERGY);
        onShowResult('THÀNH CÔNG ⚡', `Đã mua ${title}! Năng lượng săn bắn đã hồi phục 100%!`, true);
      } else if (type === 'DMG_2X') {
        setActiveBuff('DMG_2X');
        setBuffSecondsLeft(300);
        onShowResult('THÀNH CÔNG 🔥', `Đã mua ${title}! Sát thương súng tăng x2 trong 5 phút!`, true);
      } else if (type === 'CRIT_BOOST') {
        setActiveBuff('CRIT_BOOST');
        setBuffSecondsLeft(300);
        onShowResult('THÀNH CÔNG ⚡', `Đã mua ${title}! Tỉ lệ Bạo Kích tăng 50% trong 5 phút!`, true);
      }

      setShowShopModal(false);
    } catch (err) {
      onShowResult('LỖI HỆ THỐNG ❌', 'Không thể hoàn tất giao dịch mua vật phẩm!', false);
    }
  };

  // AI Bot Hunters Attack World Boss & Beasts in Real-time
  useEffect(() => {
    const aiAttackInterval = setInterval(() => {
      setBeasts((prev) => {
        const bossIndex = prev.findIndex((b) => b.tier === 'BOSS');
        if (bossIndex === -1) return prev;
        const boss = prev[bossIndex];
        if (boss.hp <= 0) return prev;

        const botNames = [
          '🐉 Thần Bài Sài Gòn', '💎 Đại Gia Quận 1', '🔥 Nam Cương 88', 
          '👑 Hoàng Tử Lắc Bát', '🎯 Thánh Soi Cầu', '🚀 Pro_Hunter_99',
          '⚡ Thần Súng S88', '🏆 Cao Thủ Săn Boss', '💥 Lắc Là Húp'
        ];
        const randomBot = botNames[Math.floor(Math.random() * botNames.length)];
        
        let aiDmg = 0;
        if (boss.maxHp >= 100000000) {
          // Rapidly drain World Boss 300M HP down (3M to 10M HP chunks per tick)
          if (boss.hp > 50000000) {
            aiDmg = 3500000 + Math.floor(Math.random() * 8500000);
          } else if (boss.hp > 5000000) {
            aiDmg = 1200000 + Math.floor(Math.random() * 3800000);
          } else {
            aiDmg = 300000 + Math.floor(Math.random() * 1500000);
          }
        } else {
          aiDmg = 15000 + Math.floor(Math.random() * 25000);
        }

        recordBossDamage(randomBot, aiDmg, false);
        const newHp = Math.max(0, boss.hp - aiDmg);

        if (newHp === 0 && boss.hp > 0) {
          setTimeout(() => {
            onShowResult(
              '🤖 AI HẠ GỤC BOSS THẾ GIỚI!',
              `Đội quân AI (${randomBot}) đã kết liễu ${boss.name}! Sếp hãy nhanh tay canh Boss ván tiếp theo nhé!`,
              false
            );
          }, 100);
        }

        setDamagePops((dPrev) => [
          ...dPrev,
          {
            id: `ai_pop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            x: 35 + Math.random() * 30,
            y: 20 + Math.random() * 20,
            text: `🤖 [AI BOT] ${randomBot} GIẢM MÁU BOSS -${aiDmg.toLocaleString()} HP!`,
            color: '#00f0ff'
          }
        ]);

        const updated = [...prev];
        updated[bossIndex] = { ...boss, hp: newHp };
        return updated;
      });
    }, 2800);

    return () => clearInterval(aiAttackInterval);
  }, []);

  // Lock-on Target Beast ID
  const [targetBeastId, setTargetBeastId] = useState<string | null>(null);

  // Session stats
  const [sessionEarnings, setSessionEarnings] = useState(0);
  const [sessionKills, setSessionKills] = useState(0);

  // Mobile Auto-Fire Toggle State
  const [isAutoFiring, setIsAutoFiring] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-Fire Interval Effect for Mobile Optimization
  useEffect(() => {
    if (!isAutoFiring) return;
    const autoFireInterval = setInterval(() => {
      if (energy >= SHOT_ENERGY_COST) {
        fireShotInternal(false);
      }
    }, 380);
    return () => clearInterval(autoFireInterval);
  }, [isAutoFiring, energy, arrowAngle, bulletCost, useCustomBet, customBulletCost, localPP]);

  // Touch & Click Direct Aim & Fire on Mobile
  const handleCanvasTouchOrClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    // Turret base is centered at bottom (50% x, 92% y)
    const turretX = rect.width * 0.5;
    const turretY = rect.height * 0.92;

    const dx = relX - turretX;
    const dy = turretY - relY;

    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 10) angle = 10;
    if (angle > 170) angle = 170;

    setArrowAngle(angle);

    if (navigator.vibrate) {
      try { navigator.vibrate(20); } catch (err) {}
    }

    if (energy >= SHOT_ENERGY_COST) {
      fireShotInternal(false);
    }
  };

  // Energy Regeneration Timer (+3 Energy every 1.5 seconds)
  useEffect(() => {
    const energyTimer = setInterval(() => {
      setEnergy((prev) => Math.min(MAX_ENERGY, prev + 3));
    }, 1500);

    // Online hunters fluctuation
    const hunterTimer = setInterval(() => {
      setOnlineHuntersCount(24 + Math.floor(Math.random() * 12));
    }, 4000);

    return () => {
      clearInterval(energyTimer);
      clearInterval(hunterTimer);
    };
  }, []);

  // Spawn Timer Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSpawnCountdown((prev) => {
        if (prev <= 1) {
          spawnNewBeastWave();
          return 6;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeZone]);

  // Spawn beasts into the current active zone
  const spawnNewBeastWave = () => {
    const templates = activeZone === 1 ? BEAST_TEMPLATES_ZONE1 : activeZone === 2 ? BEAST_TEMPLATES_ZONE2 : BEAST_TEMPLATES_ZONE3;
    const template = templates[Math.floor(Math.random() * templates.length)];

    const newBeast: Beast = {
      id: `spawn_${Date.now()}_${Math.random()}`,
      name: template.name,
      icon: template.icon,
      hp: template.maxHp,
      maxHp: template.maxHp,
      rewardPP: template.rewardPP,
      x: 10 + Math.random() * 75,
      y: 10 + Math.random() * 55,
      vx: (Math.random() - 0.5) * (activeZone * 0.6),
      vy: (Math.random() - 0.5) * (activeZone * 0.5),
      tier: template.tier as any,
      zoneId: activeZone
    };

    setBeasts((prev) => [...prev.slice(-10), newBeast]);
  };

  // Initial Beasts spawn across zones
  useEffect(() => {
    const initial: Beast[] = [];
    
    // Zone 1
    BEAST_TEMPLATES_ZONE1.forEach((t, i) => {
      initial.push({
        id: `b_z1_${i}_${Date.now()}`,
        name: t.name,
        icon: t.icon,
        hp: t.maxHp,
        maxHp: t.maxHp,
        rewardPP: t.rewardPP,
        x: 10 + Math.random() * 75,
        y: 10 + Math.random() * 55,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.5,
        tier: t.tier as any,
        zoneId: 1
      });
    });

    // Zone 2
    BEAST_TEMPLATES_ZONE2.forEach((t, i) => {
      initial.push({
        id: `b_z2_${i}_${Date.now()}`,
        name: t.name,
        icon: t.icon,
        hp: t.maxHp,
        maxHp: t.maxHp,
        rewardPP: t.rewardPP,
        x: 10 + Math.random() * 75,
        y: 10 + Math.random() * 55,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.7,
        tier: t.tier as any,
        zoneId: 2
      });
    });

    // Zone 3 (Boss Hang Rồng)
    BEAST_TEMPLATES_ZONE3.forEach((t, i) => {
      initial.push({
        id: `b_z3_${i}_${Date.now()}`,
        name: t.name,
        icon: t.icon,
        hp: t.maxHp,
        maxHp: t.maxHp,
        rewardPP: t.rewardPP,
        x: 20 + i * 25,
        y: 15 + i * 15,
        vx: (Math.random() - 0.5) * 1.0,
        vy: (Math.random() - 0.5) * 0.8,
        tier: t.tier as any,
        zoneId: 3
      });
    });

    setBeasts(initial);
  }, []);

  // Main game loop (50ms tick)
  useEffect(() => {
    loopRef.current = setInterval(() => {
      // 1. Sweep Arrow 10deg -> 170deg
      setArrowAngle((prev) => {
        let next = prev + sweepDir * 3.8;
        if (next >= 170) {
          next = 170;
          setSweepDir(-1);
        } else if (next <= 10) {
          next = 10;
          setSweepDir(1);
        }
        return next;
      });

      // 2. Move beasts in active zone
      setBeasts((prev) =>
        prev.map((b) => {
          let nx = b.x + b.vx;
          let ny = b.y + b.vy;
          let nvx = b.vx;
          let nvy = b.vy;

          if (nx <= 5 || nx >= 90) nvx = -nvx;
          if (ny <= 6 || ny >= 68) nvy = -nvy;

          return { ...b, x: nx, y: ny, vx: nvx, vy: nvy };
        })
      );

      // 3. AI Bots active firing
      if (Math.random() < 0.4) {
        const botName = AI_BOT_NAMES[Math.floor(Math.random() * AI_BOT_NAMES.length)];
        const randomAngle = 15 + Math.random() * 150;
        const newBotBullet: Bullet = {
          id: `b_ai_${Date.now()}_${Math.random()}`,
          startX: 50,
          startY: 92,
          x: 50,
          y: 92,
          angle: randomAngle,
          speed: 4.8,
          shooterName: botName,
          isPlayer: false,
          bulletCost: 10000
        };
        setBullets((prev) => [...prev.slice(-30), newBotBullet]);
      }

      // 4. Bullets movement & collision
      setBullets((prevBullets) => {
        const remainingBullets: Bullet[] = [];

        prevBullets.forEach((bullet) => {
          const rad = (bullet.angle * Math.PI) / 180;
          const dx = Math.cos(rad) * bullet.speed;
          const dy = Math.sin(rad) * bullet.speed;

          const nx = bullet.x - dx;
          const ny = bullet.y - dy;

          if (nx < 0 || nx > 100 || ny < 0 || ny > 100) return;

          let hit = false;

          setBeasts((currentBeasts) => {
            return currentBeasts.map((beast) => {
              if (hit || beast.zoneId !== activeZone) return beast;

              const dist = Math.hypot(beast.x - nx, beast.y - ny);
              if (dist < 6.8) {
                hit = true;

                // Rebalanced Damage Formula scaling with User Role, Level & Randomized Crit Variance to prevent PP inflation
                const userRole = user?.role || 'STUDENT';
                const userLevel = user?.level || 1;
                const roleCritBonus = userRole === 'TEACHER' ? 2.2 : (1.0 + Math.min(1.5, userLevel * 0.1));
                const randomVariance = 0.75 + Math.random() * 0.5; // ±25% random skill variance
                
                // Crit multiplier applies when critical skill or random critical roll succeeds
                const critChance = activeBuff === 'CRIT_BOOST' ? 0.50 : 0.12;
                const isCritShot = bullet.isCritical || (Math.random() < critChance); 
                const critMultiplier = isCritShot ? (3.8 * roleCritBonus * randomVariance) : randomVariance;
                let calculatedDmg = Math.max(50, Math.floor((bullet.bulletCost / 250) * critMultiplier));
                if (activeBuff === 'DMG_2X') {
                  calculatedDmg *= 2;
                }
                const dmg = bullet.isPlayer ? calculatedDmg : 250;
                if (beast.tier === 'BOSS' || beast.maxHp >= 100000000) {
                  recordBossDamage(bullet.shooterName || 'Sếp S88', dmg, bullet.isPlayer);
                }
                const newHp = Math.max(0, beast.hp - dmg);

                setDamagePops((prevPops) => [
                  ...prevPops.slice(-15),
                  {
                    id: `pop_${Date.now()}_${Math.random()}`,
                    x: beast.x,
                    y: beast.y - 2,
                    text: isCritShot ? `⚡ CRITICAL -${dmg.toLocaleString()}` : `-${dmg.toLocaleString()}`,
                    color: isCritShot ? '#ffd700' : bullet.isPlayer ? '#00f0ff' : '#ff003c'
                  }
                ]);

                if (newHp === 0) {
                  handleBeastKilled(beast, bullet.shooterName, bullet.isPlayer, bullet.bulletCost);

                  // Respawn beast template
                  const zoneTemplates = activeZone === 1 ? BEAST_TEMPLATES_ZONE1 : activeZone === 2 ? BEAST_TEMPLATES_ZONE2 : BEAST_TEMPLATES_ZONE3;
                  const t = zoneTemplates[Math.floor(Math.random() * zoneTemplates.length)];
                  return {
                    id: `respawn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    name: t.name,
                    icon: t.icon,
                    hp: t.maxHp,
                    maxHp: t.maxHp,
                    rewardPP: t.rewardPP,
                    x: 10 + Math.random() * 75,
                    y: 10 + Math.random() * 55,
                    vx: (Math.random() - 0.5) * (activeZone * 0.6),
                    vy: (Math.random() - 0.5) * (activeZone * 0.5),
                    tier: t.tier as any,
                    zoneId: activeZone
                  };
                }

                return { ...beast, hp: newHp };
              }
              return beast;
            });
          });

          if (!hit) {
            remainingBullets.push({ ...bullet, x: nx, y: ny });
          }
        });

        return remainingBullets;
      });

    }, 50);

    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [sweepDir, activeZone]);

  // Damage pop cleanup
  useEffect(() => {
    const timer = setInterval(() => {
      setDamagePops((prev) => prev.slice(1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleBeastKilled = async (beast: Beast, hunterName: string, isPlayer: boolean, costUsed: number) => {
    const rewardStr = `${beast.rewardPP.toLocaleString()} PP`;
    const timeNowStr = new Date().toLocaleTimeString('vi-VN');

    // Add kill log feed
    setKillLogs((prev) => [
      {
        id: `kill_${Date.now()}_${Math.random()}`,
        hunter: hunterName,
        beastName: `${beast.icon} ${beast.name}`,
        rewardStr,
        isPlayer,
        time: timeNowStr
      },
      ...prev.slice(0, 19)
    ]);

    if (isPlayer) {
      setSessionKills((prev) => prev + 1);
      setSessionEarnings((prev) => prev + beast.rewardPP);

      // Add to personal history (max 20)
      const newHistoryItem: PersonalHuntHistory = {
        id: `ph_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        beastName: beast.name,
        icon: beast.icon,
        rewardPP: beast.rewardPP,
        costPP: costUsed,
        timestamp: Date.now(),
        timeStr: timeNowStr
      };

      setPersonalHistory((prev) => [newHistoryItem, ...prev.slice(0, 19)]);

      try {
        const uSnap = await get(ref(db, `users/${uid}`));
        const currentPP = uSnap.val()?.pp || 0;
        const newPP = currentPP + beast.rewardPP;

        setLocalPP(newPP);
        (window as any).__s88_last_legit_tx = Date.now();
        await update(ref(db, `users/${uid}`), { pp: newPP });

        await push(ref(db, 'transactions'), {
          sender: 'WORLD_HUNTING_AYK8686',
          senderName: `Đi Săn AYK8686 (Khu ${activeZone})`,
          receiver: uid,
          receiverName: user?.name || 'Sinh Viên',
          amount: beast.rewardPP,
          message: `Đi Săn AYK8686: Hạ gục ${beast.icon} ${beast.name} (+${rewardStr})`,
          time: new Date().toLocaleString('vi-VN'),
          timestamp: Date.now()
        });

        await push(ref(db, 'game_logs'), {
          uid,
          name: user?.name || 'Sinh Viên',
          game: `Đi Săn Thế Giới (Khu ${activeZone})`,
          bet: costUsed,
          pnl: beast.rewardPP - costUsed,
          result: `Thắng (Hạ gục ${beast.icon} ${beast.name})`,
          time: new Date().toLocaleString('vi-VN'),
          timestamp: Date.now()
        });

        if (beast.tier === 'BOSS' || beast.rewardPP >= 100000000) {
          onShowResult(
            'THIÊN HẠ ĐỆ NHẤT THỢ SĂN AYK8686 🎉🔥',
            `ĐÃ HẠ GỤC BÁ CHỦ ${beast.icon} ${beast.name} TẠI HANG RỒNG!\nKho Báu Khổng Lồ: +${beast.rewardPP.toLocaleString()} PP!`,
            true
          );
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Get active bullet cost numerical value
  const getActiveCostValue = (): number => {
    if (useCustomBet) {
      const parsed = parseInt(customBulletCost.replace(/\D/g, ''), 10);
      return isNaN(parsed) || parsed <= 0 ? 10000 : parsed;
    }
    const parsed = parseInt(bulletCost.replace(/\D/g, ''), 10);
    return isNaN(parsed) || parsed <= 0 ? 10000 : parsed;
  };

  // Trigger Boss Skill Challenge (Mini-Game for x5 Critical Damage)
  const handleOpenBossChallenge = () => {
    const n1 = Math.floor(10 + Math.random() * 40);
    const n2 = Math.floor(10 + Math.random() * 50);
    setMathNum1(n1);
    setMathNum2(n2);
    setMathAnswer('');
    setChallengeTargetPos({
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60
    });
    setChallengeTimer(5);
    setShowBossChallenge(true);
  };

  // Submit Boss Skill Challenge
  const handleSubmitChallenge = (isSuccess: boolean) => {
    setShowBossChallenge(false);
    if (isSuccess) {
      // Fire Critical Shot!
      fireShotInternal(true);
    } else {
      alert('Kỹ năng thất bại! Bắn sát thương thường.');
      fireShotInternal(false);
    }
  };

  // Internal Fire Shot function
  const fireShotInternal = async (isCritical: boolean) => {
    const cost = getActiveCostValue();
    if (localPP < cost) {
      alert(`Bạn không đủ PP! Số dư hiện tại: ${localPP.toLocaleString()} PP.`);
      return;
    }

    setEnergy((prev) => Math.max(0, prev - SHOT_ENERGY_COST));
    const nextPP = localPP - cost;
    setLocalPP(nextPP);

    setShowSlashOverlay(true);
    setTimeout(() => setShowSlashOverlay(false), 450);

    try {
      (window as any).__s88_last_legit_tx = Date.now();
      await update(ref(db, `users/${uid}`), { pp: nextPP });

      const playerBullet: Bullet = {
        id: `p_bullet_${Date.now()}`,
        startX: 50,
        startY: 92,
        x: 50,
        y: 92,
        angle: arrowAngle,
        speed: isCritical ? 8.5 : 6.8,
        shooterName: user?.name || 'Sinh Viên',
        isPlayer: true,
        bulletCost: cost,
        isCritical
      };

      setBullets((prev) => [...prev, playerBullet]);
    } catch (err) {
      console.error(err);
    }
  };

  // Standard Player Fire Shot
  const handleFirePlayerShot = () => {
    if (energy < SHOT_ENERGY_COST) {
      alert('Năng lượng săn bắn đã cạn! Vui lòng chờ 2-3 giây để năng lượng tự phục hồi.');
      return;
    }
    fireShotInternal(false);
  };

  // Filter beasts for active zone
  const activeZoneBeasts = beasts.filter((b) => b.zoneId === activeZone);

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-mono text-left">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 md:p-8 shadow-[0_0_50px_rgba(0,240,255,0.25)]">
        <div className="absolute inset-0 opacity-40 select-none pointer-events-none">
          <img
            src="https://png.pngtree.com/thumb_back/fh260/background/20240329/pngtree-sea-fishes-in-the-deep-aquarium-sea-life-image_15662666.jpg"
            alt="World Hunting Sea Aquarium AYK8686"
            className="w-full h-full object-cover brightness-110 contrast-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/40" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-400 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(255,0,60,0.3)]">
              <Flame className="w-4 h-4 animate-bounce text-[#ff003c]" /> ĐẤU TRƯỜNG BẮN CÁ ĐI SĂN THẾ GIỚI AYK8686
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Crosshair className="w-8 h-8 text-[#ff003c] animate-spin" style={{ animationDuration: '8s' }} />
              ĐI SĂN THẾ GIỚI (WORLD HUNTING)
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-sans max-w-2xl leading-relaxed">
              Chiến trường săn thú 3 Khu Vực! Kết hợp Kỹ Năng Giải Toán & Phản Xạ để tung đòn ⚡ CRITICAL x5 Sát Thương diệt Boss Rồng 300,000,000 HP!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live User PP Display */}
            <div className="flex items-center gap-2.5 bg-black/90 border-2 border-cyan-400/80 px-4 py-2.5 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              <Coins className="w-6 h-6 text-yellow-400 animate-pulse shrink-0" />
              <div>
                <div className="text-[9px] text-slate-300 uppercase font-bold">Số Dư PP Của Bạn:</div>
                <div className="text-cyan-300 font-black text-base md:text-lg">{localPP.toLocaleString()} PP</div>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(true)}
              className="py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#00f0ff]" /> LUẬT CHƠI
            </button>

            <div className="flex items-center gap-3 bg-black/80 border border-red-500/40 p-2.5 rounded-xl">
              <div className="text-right">
                <div className="text-[9px] text-slate-400 uppercase font-bold">Lãi Phiên Săn:</div>
                <div className="text-emerald-400 font-black text-xs">+{sessionEarnings.toLocaleString()} PP</div>
                <div className="text-[9px] text-cyan-400">Hạ: {sessionKills} quái</div>
              </div>
              <Trophy className="w-6 h-6 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
            </div>
          </div>
        </div>
      </div>

      {/* ZONE MAP SELECTOR & SPAWN TIMER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Zone 1 Switcher */}
        <button
          onClick={() => setActiveZone(1)}
          className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer ${
            activeZone === 1
              ? 'bg-gradient-to-r from-cyan-950 to-slate-900 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)]'
              : 'bg-slate-950/80 border-white/10 hover:border-white/30 text-slate-400'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-cyan-400">
              <MapPin className="w-4 h-4" /> KHU 1: BỜ BIỂN TÂN THỦ
            </div>
            <div className="text-[10px] text-slate-300 font-sans">
              Độ khó: DỄ • Cược: 1k - 100k PP
            </div>
          </div>
          {activeZone === 1 && <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />}
        </button>

        {/* Zone 2 Switcher */}
        <button
          onClick={() => setActiveZone(2)}
          className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer ${
            activeZone === 2
              ? 'bg-gradient-to-r from-amber-950 to-slate-900 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
              : 'bg-slate-950/80 border-white/10 hover:border-white/30 text-slate-400'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-400">
              <MapPin className="w-4 h-4" /> KHU 2: VỰC SÂU ĐẠI DƯƠNG
            </div>
            <div className="text-[10px] text-slate-300 font-sans">
              Độ khó: TRUNG BÌNH • Cược: 10k - 10M PP
            </div>
          </div>
          {activeZone === 2 && <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />}
        </button>

        {/* Zone 3 Switcher (Boss) */}
        <button
          onClick={() => setActiveZone(3)}
          className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer ${
            activeZone === 3
              ? 'bg-gradient-to-r from-red-950 to-slate-900 border-red-500 shadow-[0_0_25px_rgba(255,0,60,0.5)] animate-pulse'
              : 'bg-slate-950/80 border-white/10 hover:border-white/30 text-slate-400'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-red-500">
              <Flame className="w-4 h-4 text-red-500 animate-bounce" /> KHU 3: HANG RỒNG (SĂN BOSS)
            </div>
            <div className="text-[10px] text-slate-300 font-sans">
              Độ khó: SIÊU KHÓ • Tự do đến TỶ PP
            </div>
          </div>
          {activeZone === 3 && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />}
        </button>

      </div>

      {/* Energy, Real-Time Spawn Timer & Hunting Buff Shop Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Energy Bar */}
        <div className="bg-slate-900/90 border border-cyan-500/30 p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
          <div className="flex items-center gap-3">
            <BatteryCharging className={`w-6 h-6 ${energy < 20 ? 'text-red-500 animate-bounce' : 'text-cyan-400'}`} />
            <div>
              <div className="text-xs font-extrabold text-white uppercase flex items-center gap-2">
                ⚡ NĂNG LƯỢNG: <span className={energy < 20 ? 'text-red-400' : 'text-cyan-300'}>{energy} / {MAX_ENERGY}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans">Mỗi phát tốn {SHOT_ENERGY_COST} • Tự hồi +3/1.5s</div>
            </div>
          </div>

          <div className="w-24 bg-black/80 border border-white/20 h-3 rounded-full overflow-hidden p-0.5">
            <div 
              style={{ width: `${(energy / MAX_ENERGY) * 100}%` }}
              className={`h-full rounded-full transition-all duration-300 ${
                energy < 20 ? 'bg-gradient-to-r from-red-600 to-amber-500' : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
              }`}
            />
          </div>
        </div>

        {/* Real-time Spawn Timer Bar */}
        <div className="bg-slate-900/90 border border-amber-500/30 p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <div>
              <div className="text-xs font-extrabold text-white uppercase flex items-center gap-2">
                ⏳ SPAWN QUÁI KHU {activeZone}: <span className="text-amber-300 font-black">{spawnCountdown}s</span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans">Xuất hiện bầy sinh vật biển & quái mới!</div>
            </div>
          </div>

          <div className="w-24 bg-black/80 border border-white/20 h-3 rounded-full overflow-hidden p-0.5">
            <div 
              style={{ width: `${((6 - spawnCountdown) / 6) * 100}%` }}
              className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400"
            />
          </div>
        </div>

        {/* Hunting Buff Shop & Active Buff Status Card */}
        <div className="bg-slate-900/90 border border-emerald-500/40 p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <div className="flex items-center gap-2.5">
            <Zap className={`w-6 h-6 ${activeBuff !== 'NONE' ? 'text-yellow-400 animate-bounce' : 'text-emerald-400'}`} />
            <div>
              <div className="text-xs font-extrabold text-white uppercase flex items-center gap-1.5">
                🛒 BUFF: {activeBuff === 'DMG_2X' ? <span className="text-yellow-300 font-black">🔥 X2 DMG ({Math.floor(buffSecondsLeft / 60)}m{buffSecondsLeft % 60}s)</span> : activeBuff === 'CRIT_BOOST' ? <span className="text-cyan-300 font-black">⚡ +50% CRIT ({Math.floor(buffSecondsLeft / 60)}m{buffSecondsLeft % 60}s)</span> : <span className="text-slate-400">Chưa có</span>}
              </div>
              <div className="text-[10px] text-slate-400 font-sans">Dùng PP đổi Thuốc tăng lực & Hồi đạn!</div>
            </div>
          </div>

          <button
            onClick={() => setShowShopModal(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-black px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-1 shrink-0"
          >
            <Coins className="w-3.5 h-3.5" /> SHOP BUFF
          </button>
        </div>
      </div>

      {/* World Boss Spawn Flashing Red Alert Banner */}
      {(activeZone === 3 || beasts.some((b) => b.tier === 'BOSS')) && (
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-amber-950 border-2 border-red-500 text-red-100 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse shadow-[0_0_35px_rgba(255,0,60,0.8)] font-mono text-xs">
          <div className="flex items-center gap-2 font-black uppercase text-red-400 text-xs sm:text-sm">
            <ShieldAlert className="w-6 h-6 text-red-500 animate-bounce shrink-0" />
            <span>⚠️ CẢNH BÁO BOSS THẾ GIỚI: BÁ CHỦ RỒNG THẦN CỔ ĐẠI XUẤT HIỆN! TOÀN SERVER TẬP TRUNG TIÊU DIỆT!</span>
          </div>
          <span className="text-[10px] bg-red-600 text-white px-3 py-1 rounded-lg uppercase font-black shrink-0 tracking-widest shadow-md">
            🔥 GLOBAL BOSS LIVE
          </span>
        </div>
      )}

      {/* Main Game Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Expanded Radar Map Canvas (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div 
            ref={canvasRef}
            onClick={handleCanvasTouchOrClick}
            onTouchStart={handleCanvasTouchOrClick}
            style={{
              backgroundImage: "url('https://png.pngtree.com/thumb_back/fh260/background/20240329/pngtree-sea-fishes-in-the-deep-aquarium-sea-life-image_15662666.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            className={`relative w-full h-[380px] sm:h-[480px] md:h-[540px] border-2 border-cyan-500/60 rounded-2xl overflow-hidden shadow-[inset_0_0_80px_rgba(0,240,255,0.3)] select-none cursor-crosshair touch-manipulation ${
              (activeZone === 3 || beasts.some((b) => b.tier === 'BOSS')) ? 'screen-shake-effect border-red-500 shadow-[0_0_40px_rgba(255,0,60,0.6)]' : ''
            }`}
          >
            {/* Deep Ocean Aquarium Backdrop & Caustics */}
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-slate-950/20 to-slate-950/60 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(5,6,8,0.7)_100%)] pointer-events-none" />

            {/* Impact / Slash CSS Animation Overlay on fire */}
            {showSlashOverlay && <div className="slash-impact-effect" />}

            {/* Ocean Radar Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.08)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* Global Server-Wide World Boss HP Bar Overlay */}
            {beasts.find((b) => b.tier === 'BOSS') && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 w-[90%] sm:w-[65%] bg-black/90 border-2 border-amber-400 p-2.5 rounded-2xl text-center shadow-[0_0_30px_rgba(255,215,0,0.8)] backdrop-blur-md pointer-events-none">
                {(() => {
                  const boss = beasts.find((b) => b.tier === 'BOSS')!;
                  const bossHpPct = Math.max(0, (boss.hp / boss.maxHp) * 100);
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] sm:text-xs font-black text-amber-300 uppercase">
                        <span className="flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-red-500 animate-bounce" /> {boss.icon} {boss.name}
                        </span>
                        <span className="text-cyan-300">{boss.hp.toLocaleString()} / {boss.maxHp.toLocaleString()} HP</span>
                      </div>
                      <div className="w-full bg-slate-950 border border-white/20 h-3.5 rounded-full overflow-hidden p-0.5 shadow-inner">
                        <div 
                          style={{ width: `${bossHpPct}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-red-600 via-amber-400 to-yellow-300 transition-all duration-150"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Top Online Players & Real-time PP Indicator */}
            <div className="absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-none">
              <div className="bg-black/80 border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold text-cyan-400 flex items-center gap-2 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <Users className="w-3.5 h-3.5" /> {onlineHuntersCount} Thợ Săn Đang Đấu Trường Khu {activeZone}
              </div>
            </div>

            {/* Floating Live User Balance Box on Canvas */}
            <div className="absolute top-3 right-3 z-30 bg-black/90 border border-cyan-400/60 px-3.5 py-1.5 rounded-xl text-xs font-black text-white flex items-center gap-2 shadow-lg backdrop-blur-md pointer-events-none">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span>{localPP.toLocaleString()} PP</span>
            </div>

            {/* Active Zone Fish & Mythic Beasts */}
            {activeZoneBeasts.map((b) => {
              const hpPercent = Math.max(0, (b.hp / b.maxHp) * 100);
              const isBoss = b.tier === 'BOSS';
              const isTargeted = targetBeastId === b.id;

              return (
                <div
                  key={b.id}
                  onClick={() => setTargetBeastId(b.id)}
                  style={{
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-75 select-none z-10 cursor-pointer ${
                    isBoss ? 'scale-125' : ''
                  }`}
                >
                  <div className={`text-3xl md:text-4xl filter drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] animate-pulse ${
                    isBoss ? 'text-5xl md:text-6xl drop-shadow-[0_0_25px_rgba(255,215,0,1)]' : ''
                  }`}>
                    {b.icon}
                  </div>

                  {/* Targeted indicator circle */}
                  {isTargeted && (
                    <div className="absolute -inset-3 border-2 border-[#00f0ff] rounded-full animate-spin pointer-events-none" />
                  )}

                  {/* HP Bar */}
                  <div className="w-20 bg-black/90 border border-white/20 rounded-full h-2.5 overflow-hidden mt-1 p-0.5 shadow-md">
                    <div
                      style={{ width: `${hpPercent}%` }}
                      className={`h-full rounded-full transition-all ${
                        isBoss ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500' : 'bg-gradient-to-r from-red-500 to-emerald-400'
                      }`}
                    />
                  </div>

                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-0.5 shadow-md ${
                    isBoss ? 'bg-amber-400 text-black border border-white' : 'bg-black/80 text-white'
                  }`}>
                    {b.name}
                  </span>
                </div>
              );
            })}

            {/* Bullets */}
            {bullets.map((bullet) => (
              <div
                key={bullet.id}
                style={{
                  left: `${bullet.x}%`,
                  top: `${bullet.y}%`,
                }}
                className={`absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full z-20 pointer-events-none ${
                  bullet.isCritical
                    ? 'bg-amber-300 shadow-[0_0_20px_#ffd700] scale-150 animate-ping'
                    : bullet.isPlayer
                    ? 'bg-[#00f0ff] shadow-[0_0_15px_#00f0ff] scale-125'
                    : 'bg-[#ff003c] shadow-[0_0_10px_#ff003c]'
                }`}
              />
            ))}

            {/* Damage Pops */}
            {damagePops.map((pop) => (
              <div
                key={pop.id}
                style={{
                  left: `${pop.x}%`,
                  top: `${pop.y}%`,
                  color: pop.color
                }}
                className="absolute font-black text-xs md:text-sm -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none animate-bounce filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
              >
                {pop.text}
              </div>
            ))}

            {/* Player 180 DEGREE TURRET CANNON */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center z-30">
              <div
                style={{
                  transform: `rotate(${arrowAngle - 90}deg)`,
                }}
                className="w-2.5 h-32 bg-gradient-to-t from-red-600 via-yellow-400 to-[#00f0ff] origin-bottom shadow-[0_0_20px_rgba(0,240,255,1)] transition-transform duration-75 relative flex items-start justify-center"
              >
                <div className="w-4.5 h-4.5 bg-[#00f0ff] rounded-full -top-2 absolute shadow-[0_0_15px_#00f0ff] animate-ping" />
              </div>

              <div className="w-20 h-12 bg-gradient-to-t from-red-950 via-slate-900 to-red-600 border-2 border-red-500 rounded-t-full flex items-center justify-center shadow-[0_0_25px_rgba(255,0,60,0.8)] -mt-2">
                <span className="text-[9px] font-black text-white">AYK-CANON</span>
              </div>
            </div>
          </div>

          {/* Shooting Controls & Custom Bet Selection */}
          <div className="bg-slate-900/90 border border-red-500/40 p-4 rounded-2xl flex flex-col gap-4 backdrop-blur-md">
            
            {/* Bet Selection Row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-bold uppercase">CHỌN MỨC ĐẠN CƯỢC SĂN THÚ:</span>
                <button
                  onClick={() => setUseCustomBet(!useCustomBet)}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer underline"
                >
                  <Edit3 className="w-3.5 h-3.5" /> {useCustomBet ? 'Chọn mức có sẵn' : 'Tự nhập số tự do'}
                </button>
              </div>

              {!useCustomBet ? (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 font-mono text-xs">
                  {[
                    { label: '10k PP', val: '10000' },
                    { label: '100k PP', val: '100000' },
                    { label: '1M PP', val: '1000000' },
                    { label: '10M PP', val: '10000000' },
                    { label: '100M PP', val: '100000000' },
                    { label: '1 TỶ PP', val: '1000000000' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => setBulletCost(item.val)}
                      className={`py-2.5 px-2 rounded-xl font-black transition-all cursor-pointer text-center ${
                        bulletCost === item.val
                          ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-[0_0_12px_rgba(255,0,60,0.5)] border border-white/40'
                          : 'bg-black/60 text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={customBulletCost}
                      onChange={(e) => setCustomBulletCost(e.target.value)}
                      placeholder="Nhập số PP cược đạn..."
                      className="w-full bg-black/80 border border-cyan-500/50 text-cyan-300 font-black text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-cyan-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">PP</span>
                  </div>
                  <div className="text-xs text-slate-300 font-bold shrink-0">
                    Sát thương: <span className="text-emerald-400 font-black">{Math.max(50, Math.floor(getActiveCostValue() / 200)).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Fire Buttons Action Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={handleFirePlayerShot}
                disabled={energy < SHOT_ENERGY_COST}
                className={`col-span-2 py-3.5 px-4 font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border-2 ${
                  energy < SHOT_ENERGY_COST
                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-500 hover:from-cyan-300 hover:to-emerald-300 text-black shadow-[0_0_20px_rgba(0,240,255,0.7)] border-white cursor-pointer'
                }`}
              >
                <Target className="w-4 h-4 animate-spin" /> [ 🎯 BẮN ({getActiveCostValue().toLocaleString()} PP) ]
              </button>

              <button
                onClick={() => setIsAutoFiring(!isAutoFiring)}
                className={`py-3.5 px-3 font-black text-xs uppercase rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 border ${
                  isAutoFiring
                    ? 'bg-red-600 text-white border-yellow-400 shadow-[0_0_20px_rgba(255,0,60,0.8)] animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-400/50'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
                {isAutoFiring ? '🔥 ĐANG TỰ BẮN' : '⚡ TỰ BẮN'}
              </button>

              <button
                onClick={startQTEReflexChallenge}
                className="py-3.5 px-3 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 hover:from-red-500 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.8)] cursor-pointer animate-pulse"
              >
                <Sparkles className="w-4 h-4 text-white animate-spin" /> QTE REFLEX (BOSS)
              </button>

              <button
                onClick={handleOpenBossChallenge}
                disabled={energy < SHOT_ENERGY_COST}
                className="py-3.5 px-3 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-yellow-300 shadow-[0_0_15px_rgba(255,215,0,0.6)] cursor-pointer"
              >
                <Brain className="w-4 h-4 text-white animate-bounce" /> CRITICAL x5
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar: Feed vs Personal Hunt History vs Top Boss Damage */}
        <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-4 flex flex-col h-[520px] md:h-[610px] justify-between">
          <div>
            {/* Tab Header Selector */}
            <div className="grid grid-cols-3 gap-1 mb-3 pb-2 border-b border-white/10 font-mono text-[10px] font-bold">
              <button
                onClick={() => setSidebarTab('LIVE')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                  sidebarTab === 'LIVE'
                    ? 'bg-[#00f0ff] text-black shadow-[0_0_10px_rgba(0,240,255,0.4)] font-black'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3 h-3" /> FEED
              </button>

              <button
                onClick={() => setSidebarTab('HISTORY')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                  sidebarTab === 'HISTORY'
                    ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.4)] font-black'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3 h-3" /> LỊCH SỬ
              </button>

              <button
                onClick={() => setSidebarTab('BOSS_TOP10')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                  sidebarTab === 'BOSS_TOP10'
                    ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] font-black'
                    : 'bg-white/5 text-red-400 hover:text-white'
                }`}
              >
                <Trophy className="w-3 h-3 text-amber-300" /> TOP BOSS
              </button>
            </div>

            {/* LIVE FEED TAB */}
            {sidebarTab === 'LIVE' && (
              <div className="space-y-2 max-h-[420px] md:max-h-[500px] overflow-y-auto pr-1">
                {killLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Đang kết nối tín hiệu thợ săn...
                  </div>
                ) : (
                  killLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-xl border text-[11px] leading-relaxed transition-all ${
                        log.isPlayer
                          ? 'bg-cyan-950/40 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                          : 'bg-black/60 border-white/10 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className={log.isPlayer ? 'text-[#00f0ff]' : 'text-amber-400'}>
                          {log.isPlayer ? '🌟 ' : '🤖 '}{log.hunter}
                        </span>
                        <span className="text-[9px] text-slate-500">{log.time}</span>
                      </div>
                      <div className="mt-1">
                        Hạ gục <span className="font-extrabold text-white">{log.beastName}</span> nhận <span className="text-emerald-400 font-bold">+{log.rewardStr}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* PERSONAL HISTORY TAB (Last 20 Hunts) */}
            {sidebarTab === 'HISTORY' && (
              <div className="space-y-2 max-h-[420px] md:max-h-[500px] overflow-y-auto pr-1">
                {personalHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-mono">
                    Chưa có lịch sử săn quái nào trong phiên này!
                  </div>
                ) : (
                  personalHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-[11px] leading-relaxed space-y-1 font-mono"
                    >
                      <div className="flex items-center justify-between text-white font-bold">
                        <span>{item.icon} {item.beastName}</span>
                        <span className="text-[9px] text-slate-500">{item.timeStr}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Đạn: -{item.costPP.toLocaleString()} PP</span>
                        <span className="text-emerald-400 font-bold">Thưởng: +{item.rewardPP.toLocaleString()} PP</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* WORLD BOSS TOP 10 DAMAGE LEADERBOARD TAB */}
            {sidebarTab === 'BOSS_TOP10' && (
              <div className="space-y-2 max-h-[420px] md:max-h-[500px] overflow-y-auto pr-1 font-mono">
                <div className="p-2 bg-red-950/40 border border-red-500/40 rounded-xl text-[10px] text-red-300 font-bold text-center flex items-center justify-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  BXH SÁT THƯƠNG BOSS HIỆN TẠI (TỰ RESET KHI BOSS CHẾT)
                </div>

                {(Object.values(bossDamageMap) as { name: string; damage: number; isPlayer?: boolean }[]).length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Chưa có thợ săn nào gây sát thương cho Boss hiện tại!
                  </div>
                ) : (
                  (Object.values(bossDamageMap) as { name: string; damage: number; isPlayer?: boolean }[])
                    .sort((a, b) => b.damage - a.damage)
                    .slice(0, 10)
                    .map((item, index) => {
                      const rankIcons = ['🥇', '🥈', '🥉'];
                      const rankDisplay = rankIcons[index] || `#${index + 1}`;
                      const isMe = item.isPlayer || item.name === (user?.name || 'Sếp S88');

                      return (
                        <div
                          key={index}
                          className={`p-2.5 rounded-xl border text-[11px] transition-all flex items-center justify-between ${
                            isMe
                              ? 'bg-amber-950/50 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.3)] font-bold'
                              : index === 0
                              ? 'bg-red-950/40 border-red-500/50 text-white font-bold'
                              : 'bg-black/60 border-white/10 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-sm font-black shrink-0">{rankDisplay}</span>
                            <span className={`truncate font-mono ${isMe ? 'text-amber-300' : 'text-white'}`}>
                              {item.name} {isMe && '(BẠN)'}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-red-400 font-black text-xs">
                              -{item.damage.toLocaleString()} HP
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/10 text-[10px] text-slate-400 text-center">
            Kim xoay 180° tự động • Sử dụng Skill Giải Toán Săn Boss để gây Critical Strike x5!
          </div>
        </div>

      </div>

      {/* Modal: Boss Skill Mini-Game (Quick Math Challenge for CRITICAL DAMAGE) */}
      {showBossChallenge && (
        <div className="overlay z-[5000]">
          <div className="glass-box login-panel overflow-y-auto max-h-[90vh] w-[95vw] md:w-full max-w-[500px] p-6 border-amber-400 relative text-left font-mono bg-slate-950/95 shadow-[0_0_50px_rgba(255,215,0,0.4)]">
            <button
              onClick={() => setShowBossChallenge(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer transition p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 text-lg font-black uppercase mb-1">
              <Brain className="w-6 h-6 animate-pulse" /> THỬ THÁCH SĂN BOSS - CRITICAL x5
            </div>
            <p className="text-xs text-slate-300 font-sans mb-4">
              Giải nhanh phép tính toán học dưới đây để kích hoạt phát bắn ⚡ CRITICAL STRIKE x5 Sát Thương!
            </p>

            <div className="bg-black/80 border-2 border-amber-400 p-6 rounded-2xl text-center space-y-4">
              <div className="text-2xl md:text-3xl font-black text-amber-300 font-mono tracking-widest">
                {mathNum1} + {mathNum2} = ?
              </div>

              <input
                type="number"
                placeholder="Nhập kết quả..."
                value={mathAnswer}
                onChange={(e) => setMathAnswer(e.target.value)}
                autoFocus
                className="w-full bg-slate-900 border border-cyan-400 text-cyan-300 text-center font-black text-xl p-3 rounded-xl outline-none focus:border-amber-400"
              />

              <button
                onClick={() => {
                  const ans = parseInt(mathAnswer.trim(), 10);
                  if (ans === mathNum1 + mathNum2) {
                    handleSubmitChallenge(true);
                  } else {
                    handleSubmitChallenge(false);
                  }
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black font-black uppercase text-sm rounded-xl hover:brightness-110 cursor-pointer shadow-lg"
              >
                [ XÁC NHẬN BẮN CRITICAL x5 ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* World Boss QTE Reflex Mini-Game Challenge Modal */}
      {showQTEModal && (
        <div className="overlay z-[6000] bg-black/80 backdrop-blur-md">
          <div className="glass-box p-6 border-2 border-amber-400 max-w-lg w-[95vw] rounded-3xl text-center space-y-5 animate-pulse shadow-[0_0_50px_rgba(255,215,0,0.8)] font-mono">
            <div className="flex items-center justify-between border-b border-amber-400/30 pb-3">
              <span className="text-xs font-black uppercase tracking-widest text-amber-300 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-500 animate-spin" /> ⚡ THÁCH THỨC PHẢN XẠ QTE WORLD BOSS
              </span>
              <button
                onClick={() => setShowQTEModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Nhấn hoặc chạm đúng <strong className="text-amber-400">CHUỖI KÝ TỰ PHẢN XẠ</strong> bên dưới trước khi hết thời gian để giáng cú đòn <strong className="text-red-500 font-black">SUPER CRITICAL STRIKE!</strong>
            </p>

            {/* Level balancing indicator banner */}
            {((user?.level || Math.floor((user?.pp || 0) / 100000) + 1) < 10) ? (
              <div className="py-1.5 px-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-400 text-[11px] font-bold">
                🛡️ HỖ TRỢ TÂN THỦ (Level {user?.level || Math.floor((user?.pp || 0) / 100000) + 1}): Tăng x{(Math.max(1.8, 3.2 - (user?.level || Math.floor((user?.pp || 0) / 100000) + 1) * 0.12)).toFixed(1)} Sát thương & Thưởng PP!
              </div>
            ) : (
              <div className="py-1.5 px-3 bg-amber-500/10 border border-amber-500/40 rounded-xl text-amber-300 text-[11px] font-bold">
                👑 COMBO VƯƠNG GIẢ (Level {user?.level || Math.floor((user?.pp || 0) / 100000) + 1}): Thực hiện chuỗi {qteSequence.length} phím để tối ưu hóa sát thương cực đại!
              </div>
            )}

            {/* Timer Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-extrabold">
                <span className="text-slate-400">Thời gian còn lại:</span>
                <span className="text-red-400">{qteTimeLeft.toFixed(1)}s</span>
              </div>
              <div className="w-full bg-slate-950 border border-white/20 h-3 rounded-full overflow-hidden p-0.5">
                <div 
                  style={{ width: `${(qteTimeLeft / 5.0) * 100}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-400 transition-all duration-100"
                />
              </div>
            </div>

            {/* Target Sequence Display */}
            <div className="relative flex items-center justify-center gap-2 sm:gap-3 py-4 bg-slate-950 border-2 border-cyan-400/60 rounded-2xl shadow-inner overflow-hidden">
              
              {/* Floating QTE Combo Particle Pops */}
              {qteComboPops.map((pop) => (
                <div
                  key={pop.id}
                  style={{ color: pop.color }}
                  className="absolute inset-0 m-auto w-max h-max pointer-events-none text-base sm:text-lg font-black uppercase tracking-widest animate-in zoom-in-75 fade-out slide-out-to-top-12 duration-500 shadow-2xl z-20 flex items-center gap-2 bg-black/90 px-4 py-2 rounded-full border-2 border-amber-400 drop-shadow-[0_0_20px_rgba(255,215,0,1)]"
                >
                  <Sparkles className="w-5 h-5 text-amber-300 animate-spin" /> {pop.text}
                </div>
              ))}

              {qteSequence.map((char, idx) => {
                const isPassed = idx < qteIndex;
                const isCurrent = idx === qteIndex;
                return (
                  <div
                    key={idx}
                    className={`w-11 h-12 sm:w-14 sm:h-16 rounded-xl flex items-center justify-center font-black text-xl sm:text-2xl transition-all shadow-md ${
                      isPassed
                        ? 'bg-emerald-500 text-black border-2 border-emerald-300 scale-95 opacity-60'
                        : isCurrent
                          ? 'bg-amber-400 text-black border-4 border-white animate-bounce shadow-[0_0_20px_rgba(255,215,0,1)] scale-110'
                          : 'bg-slate-900 text-slate-400 border border-white/20'
                    }`}
                  >
                    {isPassed ? '✓' : char}
                  </div>
                );
              })}
            </div>

            {/* Mobile Touch Keypad Controls for Portrait Phone Players */}
            <div className="space-y-2 pt-2">
              <span className="block text-[10px] text-slate-400 uppercase font-bold">
                📱 BÀN PHÍM PHẢN XẠ NHANH CẢM ỨNG (CHỌN CHÍNH XÁC KÝ TỰ HIỆN TẠI):
              </span>
              <div className="grid grid-cols-5 gap-2">
                {QTE_KEYS.map((k) => (
                  <button
                    key={k}
                    onClick={() => handleQTEKeyPress(k)}
                    className="py-3 bg-slate-800 hover:bg-amber-400 hover:text-black border border-white/20 active:bg-cyan-400 active:scale-95 text-cyan-300 font-black text-sm rounded-xl transition-all shadow-md"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HUNTING BUFF & REFILL SHOP MODAL */}
      {showShopModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border-2 border-emerald-500/60 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-[0_0_50px_rgba(16,185,129,0.3)] font-mono text-left relative animate-in fade-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => setShowShopModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-white/10 pb-3 flex items-center gap-3">
              <Zap className="w-7 h-7 text-emerald-400 animate-pulse" />
              <div>
                <h3 className="text-white text-base font-black uppercase tracking-wider">CỬA HÀNG BUFF & NĂNG LƯỢNG ĐI SĂN</h3>
                <p className="text-[11px] text-emerald-400 font-sans">Dùng PP đổi lấy các bình thuốc tăng lực & năng lượng cấp tốc hỗ trợ diệt Boss!</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Item 1: Energy Refill */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/30 flex items-center justify-between gap-3 hover:border-cyan-400 transition-all">
                <div className="space-y-1">
                  <div className="text-xs font-black text-cyan-300 uppercase flex items-center gap-2">
                    ⚡ BÌNH NẠP NĂNG LƯỢNG CẤP TỐC (+100 ENERGY)
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans">
                    Hồi phục ngay lập tức 100% Năng Lượng săn bắn để tiếp tục xả đạn!
                  </div>
                  <div className="text-xs font-extrabold text-yellow-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> GIÁ: 500,000 PP
                  </div>
                </div>

                <button
                  onClick={() => handleBuyHuntingItem('ENERGY_REFILL')}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-xl text-xs font-black uppercase shrink-0 shadow-lg cursor-pointer transition-all"
                >
                  MUA NGAY
                </button>
              </div>

              {/* Item 2: Damage 2x */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 flex items-center justify-between gap-3 hover:border-amber-400 transition-all">
                <div className="space-y-1">
                  <div className="text-xs font-black text-amber-300 uppercase flex items-center gap-2">
                    🔥 THUỐC TĂNG LỰC SÁT THƯƠNG X2 (5 PHÚT)
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans">
                    Nhân đôi toàn bộ sát thương của từng viên đạn bắn ra trong 5 phút!
                  </div>
                  <div className="text-xs font-extrabold text-yellow-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> GIÁ: 2,000,000 PP
                  </div>
                </div>

                <button
                  onClick={() => handleBuyHuntingItem('DMG_2X')}
                  className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-xs font-black uppercase shrink-0 shadow-lg cursor-pointer transition-all"
                >
                  MUA NGAY
                </button>
              </div>

              {/* Item 3: Crit Boost */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/30 flex items-center justify-between gap-3 hover:border-purple-400 transition-all">
                <div className="space-y-1">
                  <div className="text-xs font-black text-purple-300 uppercase flex items-center gap-2">
                    ⚡ THUỐC SĂN BOSS THƯỢNG CỔ (+50% CHÍ MẠNG)
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans">
                    Tăng tỉ lệ đánh Bạo Kích x3.8 Sát thương lên 50% trong 5 phút!
                  </div>
                  <div className="text-xs font-extrabold text-yellow-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> GIÁ: 3,000,000 PP
                  </div>
                </div>

                <button
                  onClick={() => handleBuyHuntingItem('CRIT_BOOST')}
                  className="bg-purple-500 hover:bg-purple-400 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shrink-0 shadow-lg cursor-pointer transition-all"
                >
                  MUA NGAY
                </button>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-slate-400 text-center font-sans">
              Số dư PP hiện tại của bạn: <span className="text-yellow-400 font-bold">{localPP.toLocaleString()} PP</span>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="overlay z-[5000]">
          <div className="glass-box login-panel overflow-y-auto max-h-[90vh] w-[95vw] md:w-full max-w-[560px] p-6 border-red-500 relative text-left font-mono">
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-4 right-4 text-[#8b949e] hover:text-white cursor-pointer transition p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-[#ff003c] text-glow-red text-lg font-black uppercase tracking-widest mb-1 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#ff003c]" /> LUẬT CHƠI BẮN CÁ ĐI SĂN THẾ GIỚI AYK8686
            </h2>
            <p className="text-[10px] text-slate-400 uppercase mb-4">
              3 Khu Vực - Spawn Quái Theo Giây - Skill Giải Toán Săn Boss
            </p>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
              <div className="p-3 bg-black/60 rounded-xl border border-white/10 space-y-1">
                <h4 className="font-extrabold text-[#00f0ff] uppercase text-[11px]">1. 3 Khu Vực Săn Bắn Theo Độ Khó:</h4>
                <p>Chuyển đổi giữa Khu 1 (Tân Thủ), Khu 2 (Đại Dương), Khu 3 (Hang Rồng). Mỗi khu vực chứa những chủng loại quái riêng biệt!</p>
              </div>

              <div className="p-3 bg-black/60 rounded-xl border border-white/10 space-y-1">
                <h4 className="font-extrabold text-amber-400 uppercase text-[11px]">2. Skill Săn Boss (Critical x5 Sát Thương):</h4>
                <p>Nút "SKILL SĂN BOSS" kích hoạt thử thách giải toán nhanh. Giải đúng sẽ tung cú bắn Critical Strike x5 Sát Thương cực mạnh!</p>
              </div>

              <div className="p-3 bg-black/60 rounded-xl border border-white/10 space-y-1">
                <h4 className="font-extrabold text-emerald-400 uppercase text-[11px]">3. Hệ thống Spawn Quái Real-time:</h4>
                <p>Thanh đếm ngược Spawn Wave 6s sẽ liên tục cập nhật bầy sinh vật mới. Năng lượng tự phục hồi +3 mỗi 1.5 giây.</p>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="mt-5 w-full py-3 bg-gradient-to-r from-red-600 to-amber-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 cursor-pointer"
            >
              [ ĐÃ HIỂU LUẬT CHƠI ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
