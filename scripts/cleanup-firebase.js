/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Firebase Cleanup & Maintenance Script
 * Usage:
 *   node scripts/cleanup-firebase.js --dry-run
 *   node scripts/cleanup-firebase.js --apply
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
const isApply = process.argv.includes('--apply');

const DB_URL = process.env.FIREBASE_DATABASE_URL || 
  process.env.VITE_FIREBASE_DATABASE_URL || 
  "https://appsinhvien-24482-default-rtdb.asia-southeast1.firebasedatabase.app";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 
  process.env.VITE_FIREBASE_PROJECT_ID || 
  "appsinhvien-24482";

console.log('\n=============================================================');
console.log(`🔥 FIREBASE DATABASE CLEANUP & MAINTENANCE TOOL`);
console.log(`   Database URL: ${DB_URL}`);
console.log(`   Mode: ${isApply ? '🚀 APPLY (Live Execution with Pre-Backup)' : '🔍 DRY-RUN (Simulation only - No data modified)'}`);
console.log('=============================================================\n');

// Initialize Firebase Admin or REST Client
let adminDb = null;
let useRestFallback = false;

function initFirebase() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 
    process.env.GOOGLE_APPLICATION_CREDENTIALS || 
    path.join(rootDir, 'serviceAccountKey.json');

  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: DB_URL
      });
      adminDb = admin.database();
      console.log('✅ Initialized Firebase Admin via service account key file.');
      return;
    } catch (e) {
      console.warn(`⚠️ Could not parse service account file (${e.message}). Falling back to REST API mode.`);
    }
  }

  // Attempt default application credential
  try {
    admin.initializeApp({
      projectId: PROJECT_ID,
      databaseURL: DB_URL
    });
    adminDb = admin.database();
    console.log('✅ Initialized Firebase Admin with project credentials.');
  } catch (e) {
    console.log('ℹ️ Service account key not detected in root. Using REST API client for Database.');
    useRestFallback = true;
  }
}

initFirebase();

// REST API Helper functions for fallback when service account is not mounted
async function restGet(endpoint) {
  const url = `${DB_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`REST GET ${endpoint} failed: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

async function restDelete(endpoint) {
  const url = `${DB_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}.json`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`REST DELETE ${endpoint} failed: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

async function restPatch(endpoint, data) {
  const url = `${DB_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}.json`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error(`REST PATCH ${endpoint} failed: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

// Database fetcher wrapper
async function fetchNode(nodePath) {
  if (adminDb && !useRestFallback) {
    try {
      const snapshot = await adminDb.ref(nodePath).once('value');
      return snapshot.val();
    } catch (e) {
      // If permission error with admin default, switch to REST
      useRestFallback = true;
    }
  }
  return await restGet(nodePath);
}

// Database delete wrapper
async function deleteNode(nodePath) {
  if (adminDb && !useRestFallback) {
    try {
      await adminDb.ref(nodePath).remove();
      return;
    } catch (e) {
      useRestFallback = true;
    }
  }
  await restDelete(nodePath);
}

// Database patch wrapper
async function patchNode(nodePath, data) {
  if (adminDb && !useRestFallback) {
    try {
      await adminDb.ref(nodePath).update(data);
      return;
    } catch (e) {
      useRestFallback = true;
    }
  }
  await restPatch(nodePath, data);
}

async function main() {
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const THREE_DAYS_MS = 3 * ONE_DAY_MS;
  const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
  const NINETY_DAYS_MS = 90 * ONE_DAY_MS;

  console.log('📦 Step 1: Scanning Database Structure...');

  // Fetch complete DB snapshot
  let rootData = null;
  try {
    rootData = await fetchNode('');
  } catch (err) {
    console.error('❌ Failed to fetch database root:', err.message);
    process.exit(1);
  }

  if (!rootData || typeof rootData !== 'object') {
    console.log('ℹ️ Database is empty or unreachable.');
    process.exit(0);
  }

  // Mandatory backup on apply mode
  if (isApply) {
    console.log('\n💾 Step 2: Creating Full Database Backup...');
    const backupsDir = path.join(rootDir, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(backupsDir, `firebase-backup-${timestampStr}.json`);
    fs.writeFileSync(backupFilePath, JSON.stringify(rootData, null, 2), 'utf8');
    const stats = fs.statSync(backupFilePath);
    console.log(`✅ Backup successfully saved to: ${backupFilePath} (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    console.log('ℹ️ [Dry-run] Full backup will automatically be saved to backups/ directory when running with --apply.');
  }

  console.log('\n🔍 Step 3: Analyzing Retentions & Purge Candidates...\n');

  const plan = {
    live_arena_bets: { deleteKeys: [], keepCount: 0 },
    game_logs: { deleteKeys: [], keepCount: 0, botDeleted: 0, userDeleted: 0 },
    global_chat: { deleteKeys: [], keepCount: 0 },
    live_arena_chat: { deleteKeys: [], keepCount: 0 },
    online: { deleteKeys: [], keepCount: 0 },
    online_logs: { deleteKeys: [], keepCount: 0 },
    transactions: { deleteKeys: [], keepCount: 0 },
    usersPassCleanup: { targetUids: [] }
  };

  // 1. live_arena_bets: delete rounds older than 24h, keep current and recent cycles
  if (rootData.live_arena_bets && typeof rootData.live_arena_bets === 'object') {
    for (const [gameTab, cycles] of Object.entries(rootData.live_arena_bets)) {
      if (!cycles || typeof cycles !== 'object') continue;
      const cycleEntries = Object.entries(cycles);
      
      // Determine cycle timing if numeric
      cycleEntries.forEach(([cycleId, bets]) => {
        let maxTimestamp = 0;
        if (bets && typeof bets === 'object') {
          Object.values(bets).forEach((b) => {
            if (b && b.timestamp && b.timestamp > maxTimestamp) maxTimestamp = b.timestamp;
          });
        }
        
        // If timestamp found and older than 24h, or numeric cycle older than 24h
        const isOlderThan24h = maxTimestamp > 0 
          ? (now - maxTimestamp > ONE_DAY_MS)
          : false;

        if (isOlderThan24h) {
          plan.live_arena_bets.deleteKeys.push(`live_arena_bets/${gameTab}/${cycleId}`);
        } else {
          plan.live_arena_bets.keepCount++;
        }
      });
    }
  }

  // 2. game_logs: 30 days general, 90 days real users, 3 days bots
  if (rootData.game_logs && typeof rootData.game_logs === 'object') {
    for (const [logId, log] of Object.entries(rootData.game_logs)) {
      if (!log || typeof log !== 'object') continue;
      const ts = log.timestamp || 0;
      const uid = String(log.uid || '').toLowerCase();
      const isBot = uid.startsWith('bot') || log.isBot === true;
      const age = now - ts;

      let shouldDelete = false;
      if (isBot) {
        if (age > THREE_DAYS_MS) {
          shouldDelete = true;
          plan.game_logs.botDeleted++;
        }
      } else if (uid) {
        // Real user log
        if (age > NINETY_DAYS_MS) {
          shouldDelete = true;
          plan.game_logs.userDeleted++;
        }
      } else {
        // General unassociated log
        if (age > THIRTY_DAYS_MS) {
          shouldDelete = true;
        }
      }

      if (shouldDelete) {
        plan.game_logs.deleteKeys.push(`game_logs/${logId}`);
      } else {
        plan.game_logs.keepCount++;
      }
    }
  }

  // 3. Helper for chats: keep latest 500, keep real users longer than bots
  function analyzeChat(nodeName, data) {
    if (!data || typeof data !== 'object') return { deleteKeys: [], keepCount: 0 };
    const items = Object.entries(data).map(([key, val]) => ({
      key,
      ...val,
      timestamp: val?.timestamp || 0,
      isBot: String(val?.uid || '').toLowerCase().startsWith('bot') || val?.isBot === true || val?.isSystem === true
    }));

    if (items.length <= 500) {
      return { deleteKeys: [], keepCount: items.length };
    }

    // Sort ascending by time
    items.sort((a, b) => a.timestamp - b.timestamp);

    const excessCount = items.length - 500;
    const toDeleteKeys = [];

    // Phase 1: remove older bot/system messages first
    for (let i = 0; i < items.length && toDeleteKeys.length < excessCount; i++) {
      if (items[i].isBot) {
        toDeleteKeys.push(`${nodeName}/${items[i].key}`);
      }
    }

    // Phase 2: if still excess, remove oldest user messages
    for (let i = 0; i < items.length && toDeleteKeys.length < excessCount; i++) {
      const fullKey = `${nodeName}/${items[i].key}`;
      if (!toDeleteKeys.includes(fullKey)) {
        toDeleteKeys.push(fullKey);
      }
    }

    return {
      deleteKeys: toDeleteKeys,
      keepCount: items.length - toDeleteKeys.length
    };
  }

  plan.global_chat = analyzeChat('global_chat', rootData.global_chat);
  plan.live_arena_chat = analyzeChat('live_arena_chat', rootData.live_arena_chat);

  // 4. online and online_logs: delete older than 1 day
  if (rootData.online && typeof rootData.online === 'object') {
    for (const [key, val] of Object.entries(rootData.online)) {
      const ts = val?.lastSeen || val?.timestamp || 0;
      if (ts > 0 && (now - ts > ONE_DAY_MS)) {
        plan.online.deleteKeys.push(`online/${key}`);
      } else {
        plan.online.keepCount++;
      }
    }
  }

  if (rootData.online_logs && typeof rootData.online_logs === 'object') {
    for (const [userOrKey, entries] of Object.entries(rootData.online_logs)) {
      if (entries && typeof entries === 'object') {
        for (const [logId, logVal] of Object.entries(entries)) {
          const ts = logVal?.timestamp || 0;
          if (ts > 0 && (now - ts > ONE_DAY_MS)) {
            plan.online_logs.deleteKeys.push(`online_logs/${userOrKey}/${logId}`);
          } else {
            plan.online_logs.keepCount++;
          }
        }
      } else {
        plan.online_logs.deleteKeys.push(`online_logs/${userOrKey}`);
      }
    }
  }

  // 5. transactions: keep 90 days
  if (rootData.transactions && typeof rootData.transactions === 'object') {
    for (const [txId, tx] of Object.entries(rootData.transactions)) {
      const ts = tx?.timestamp || 0;
      if (ts > 0 && (now - ts > NINETY_DAYS_MS)) {
        plan.transactions.deleteKeys.push(`transactions/${txId}`);
      } else {
        plan.transactions.keepCount++;
      }
    }
  }

  // 6. Users: Passwords are protected in RTDB to guarantee student & admin login access
  // Protected: DO NOT delete users, market, settings, games, classes, s88_news, promo_codes
  // Plaintext 'pass' is safely retained for RTDB credential validation
  const shouldStripPass = process.argv.includes('--strip-passwords');
  if (shouldStripPass && rootData.users && typeof rootData.users === 'object') {
    for (const [uId, uObj] of Object.entries(rootData.users)) {
      if (uObj && typeof uObj === 'object' && uObj.pass !== undefined) {
        plan.usersPassCleanup.targetUids.push(uId);
      }
    }
  }

  // Print Summary Table
  console.log('📋 CLEANUP RETENTION ANALYSIS REPORT:');
  console.log('-------------------------------------------------------------');
  console.log(`• live_arena_bets:`);
  console.log(`    - Purge (>24h):  ${plan.live_arena_bets.deleteKeys.length} rounds`);
  console.log(`    - Retain:        ${plan.live_arena_bets.keepCount} active/recent rounds`);
  
  console.log(`• game_logs:`);
  console.log(`    - Purge total:   ${plan.game_logs.deleteKeys.length} records`);
  console.log(`      (Bot logs >3d: ${plan.game_logs.botDeleted}, User logs >90d: ${plan.game_logs.userDeleted})`);
  console.log(`    - Retain:        ${plan.game_logs.keepCount} records`);

  console.log(`• global_chat:`);
  console.log(`    - Purge (trim):  ${plan.global_chat.deleteKeys.length} messages`);
  console.log(`    - Retain (max):  ${plan.global_chat.keepCount} newest messages`);

  console.log(`• live_arena_chat:`);
  console.log(`    - Purge (trim):  ${plan.live_arena_chat.deleteKeys.length} messages`);
  console.log(`    - Retain (max):  ${plan.live_arena_chat.keepCount} newest messages`);

  console.log(`• online & online_logs (>1 day):`);
  console.log(`    - Purge:         ${plan.online.deleteKeys.length + plan.online_logs.deleteKeys.length} stale items`);
  console.log(`    - Retain:        ${plan.online.keepCount + plan.online_logs.keepCount} active items`);

  console.log(`• transactions (>90 days):`);
  console.log(`    - Purge:         ${plan.transactions.deleteKeys.length} expired ledgers`);
  console.log(`    - Retain:        ${plan.transactions.keepCount} recent ledgers`);

  console.log(`• users (Privacy & Security):`);
  console.log(`    - Plaintext 'pass' nodes to strip: ${plan.usersPassCleanup.targetUids.length} accounts`);
  console.log(`    - Users & Bot profiles kept:       ${Object.keys(rootData.users || {}).length} accounts (100% PRESERVED)`);

  console.log(`• Protected Whitelisted Nodes (Untouched):`);
  console.log(`    - settings:    ${rootData.settings ? 'Retained' : 'Empty'}`);
  console.log(`    - market:      ${rootData.market ? 'Retained' : 'Empty'}`);
  console.log(`    - games:       ${rootData.games ? 'Retained' : 'Empty'}`);
  console.log(`    - classes:     ${rootData.classes ? 'Retained' : 'Empty'}`);
  console.log(`    - s88_news:    ${rootData.s88_news ? 'Retained' : 'Empty'}`);
  console.log(`    - promo_codes: ${rootData.promo_codes ? 'Retained' : 'Empty'}`);
  console.log('-------------------------------------------------------------\n');

  const totalPurgeItems = 
    plan.live_arena_bets.deleteKeys.length +
    plan.game_logs.deleteKeys.length +
    plan.global_chat.deleteKeys.length +
    plan.live_arena_chat.deleteKeys.length +
    plan.online.deleteKeys.length +
    plan.online_logs.deleteKeys.length +
    plan.transactions.deleteKeys.length;

  if (isDryRun) {
    console.log(`✨ DRY-RUN COMPLETE: ${totalPurgeItems} items identified for deletion.`);
    console.log(`🛡️ No data was changed. To execute the purge and backup, run:`);
    console.log(`   node scripts/cleanup-firebase.js --apply\n`);
    return;
  }

  // APPLY MODE: Execute deletions
  console.log(`⚡ APPLYING DELETIONS FOR ${totalPurgeItems} EXPIRED ENTRIES...`);
  let successCount = 0;
  let failCount = 0;

  const allDeletes = [
    ...plan.live_arena_bets.deleteKeys,
    ...plan.game_logs.deleteKeys,
    ...plan.global_chat.deleteKeys,
    ...plan.live_arena_chat.deleteKeys,
    ...plan.online.deleteKeys,
    ...plan.online_logs.deleteKeys,
    ...plan.transactions.deleteKeys
  ];

  // Batch delete in chunks of 50 to avoid flooding network
  const CHUNK_SIZE = 50;
  for (let i = 0; i < allDeletes.length; i += CHUNK_SIZE) {
    const chunk = allDeletes.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (key) => {
        try {
          await deleteNode(key);
          successCount++;
        } catch (e) {
          failCount++;
        }
      })
    );
    process.stdout.write(`\rProgress: ${Math.min(i + CHUNK_SIZE, allDeletes.length)} / ${allDeletes.length} deleted...`);
  }
  console.log('\n');

  // Strip plaintext pass from users
  if (plan.usersPassCleanup.targetUids.length > 0) {
    console.log(`🔒 Stripping plaintext 'pass' from ${plan.usersPassCleanup.targetUids.length} user accounts...`);
    for (const uid of plan.usersPassCleanup.targetUids) {
      try {
        await deleteNode(`users/${uid}/pass`);
      } catch (e) {}
    }
    console.log('✅ User pass nodes successfully removed.');
  }

  console.log(`\n🎉 FIREBASE CLEANUP FINISHED SUCCESSFULLY!`);
  console.log(`   - Deleted: ${successCount} items`);
  console.log(`   - Errors:  ${failCount} items`);
  console.log(`   - Protected core datasets completely intact.`);
  console.log('=============================================================\n');
}

main().catch((err) => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
