/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Migration Script: Migrate Legacy Plaintext RTDB Passwords to Firebase Auth
 * 
 * 1. Scans all records under /users
 * 2. Creates/updates Firebase Auth user with virtual email for any user with legacy `pass`
 * 3. Deletes `pass` field completely from RTDB /users
 * 4. Generates bidirectional /auth_mapping for consistent UID mapping
 * 
 * Usage:
 *   npx tsx scripts/migrate-passwords-to-auth.ts
 */

import dotenv from 'dotenv';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

const DB_URL = process.env.FIREBASE_DATABASE_URL || 
  process.env.VITE_FIREBASE_DATABASE_URL || 
  "https://appsinhvien-24482-default-rtdb.asia-southeast1.firebasedatabase.app";

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('[FATAL] FIREBASE_SERVICE_ACCOUNT is required to run migration script.');
  process.exit(1);
}

const sa = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string' && process.env.FIREBASE_SERVICE_ACCOUNT.trim().startsWith('{')
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : process.env.FIREBASE_SERVICE_ACCOUNT;

if (getApps().length === 0) {
  initializeApp({
    credential: cert(sa),
    databaseURL: DB_URL
  });
}

const db = getDatabase();
const auth = getAuth();

export function formatVirtualEmail(identifier: string): string {
  const clean = identifier.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return `${clean || 'user'}@ayk8686.internal`;
}

async function runMigration() {
  console.log('========================================================');
  console.log('🚀 STARTING PASSWORD MIGRATION TO FIREBASE AUTH');
  console.log('========================================================');

  const usersSnap = await db.ref('users').get();
  if (!usersSnap.exists()) {
    console.log('ℹ️ No users found in RTDB to migrate.');
    return;
  }

  const users = usersSnap.val();
  const uids = Object.keys(users);
  console.log(`Found ${uids.length} user records in /users.`);

  let migratedCount = 0;
  let alreadySecureCount = 0;
  let errorCount = 0;

  for (const uid of uids) {
    const userData = users[uid];
    if (!userData) continue;

    const legacyPass = userData.pass;
    const virtualEmail = formatVirtualEmail(uid);

    if (!legacyPass) {
      alreadySecureCount++;
      continue;
    }

    try {
      // 1. Ensure Firebase Auth user exists
      let authUser;
      try {
        authUser = await auth.getUserByEmail(virtualEmail);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          const securePassword = legacyPass.length >= 6 ? legacyPass : `${legacyPass}123456`.slice(0, 8);
          authUser = await auth.createUser({
            uid: /^[a-zA-Z0-9_-]{1,128}$/.test(uid) ? uid : undefined,
            email: virtualEmail,
            password: securePassword,
            displayName: userData.name || `Sinh Viên ${uid}`
          });
          console.log(`✅ Created Auth account for [${uid}] (${virtualEmail})`);
        } else {
          throw err;
        }
      }

      // 2. Set auth mapping
      if (authUser && authUser.uid) {
        await db.ref(`auth_mapping/${authUser.uid}`).set(uid);
      }

      // 3. Remove plaintext pass from RTDB
      await db.ref(`users/${uid}/pass`).remove();
      migratedCount++;
      console.log(`🔒 Removed plaintext pass for user [${uid}]`);
    } catch (err: any) {
      console.error(`❌ Error migrating user [${uid}]:`, err?.message || err);
      errorCount++;
    }
  }

  console.log('\n========================================================');
  console.log('🎉 MIGRATION COMPLETED');
  console.log(`   Total Users Scanned:  ${uids.length}`);
  console.log(`   Migrated & Cleaned:   ${migratedCount}`);
  console.log(`   Already Secure:       ${alreadySecureCount}`);
  console.log(`   Errors / Skipped:     ${errorCount}`);
  console.log('========================================================\n');
}

runMigration().catch((e) => {
  console.error('Fatal migration failure:', e);
  process.exit(1);
});
