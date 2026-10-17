/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyCfrD1iS1yjfjuaPIKvGb-iWcirBg1lXJE",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "appsinhvien-24482.firebaseapp.com",
  databaseURL: metaEnv.VITE_FIREBASE_DATABASE_URL || "https://appsinhvien-24482-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "appsinhvien-24482"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

/**
 * Maps a username or student numeric ID to a secure system virtual email.
 * e.g. "student_1" -> "student_1@ayk8686.internal"
 */
export function formatVirtualEmail(identifier: string): string {
  const clean = identifier.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return `${clean || 'user'}@ayk8686.internal`;
}
