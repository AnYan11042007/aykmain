/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

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

// ----------------- FIREBASE APP CHECK -----------------
if (typeof window !== 'undefined') {
  try {
    const recaptchaKey = metaEnv.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
    if (metaEnv.DEV) {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (err) {
    // Graceful skip if App Check already initialized or in restricted sandbox
    console.warn('[Firebase App Check] Init notice:', err);
  }
}

/**
 * Maps a username or student numeric ID to a secure system virtual email.
 * e.g. "student_1" -> "student_1@ayk8686.internal"
 */
export function formatVirtualEmail(identifier: string): string {
  const clean = identifier.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return `${clean || 'user'}@ayk8686.internal`;
}

/**
 * Retrieve current user's Firebase ID token
 */
export async function getAuthToken(): Promise<string | null> {
  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch (e) {
      console.warn('[Auth Token Error]:', e);
    }
  }
  // Fallback to local stored session token if available
  try {
    const token = localStorage.getItem('s88_id_token') || localStorage.getItem('s88_sessionToken');
    if (token) return token;
  } catch (e) {}
  return null;
}

/**
 * Centralized fetch helper attaching Firebase ID Token in Authorization header
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, {
    ...options,
    headers
  });
}

