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
    const recaptchaKey = metaEnv.VITE_RECAPTCHA_SITE_KEY;
    if (recaptchaKey) {
      if (metaEnv.DEV) {
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaKey),
        isTokenAutoRefreshEnabled: true
      });
    }
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
  const trimmed = (identifier || '').trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  const clean = trimmed.replace(/[^a-z0-9_.-]/g, '');
  return `${clean || 'user'}@ayk8686.internal`;
}

import { handleClientApiFallback } from './services/clientApiFallback';

/**
 * Constructs absolute API URL respecting VITE_API_BASE for deployments (e.g. GitHub Pages -> Cloud Run)
 */
export function apiUrl(path: string): string {
  let base = (metaEnv.VITE_API_BASE || '').trim().replace(/\/$/, '');
  if (!base && typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem('s88_backend_url');
      if (custom) base = custom.trim().replace(/\/$/, '');
    } catch (_) {}
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
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
 * Centralized fetch helper attaching Firebase ID Token in Authorization header,
 * resolving API base, and falling back gracefully to client-side database handlers
 * on static hosts (like GitHub Pages) or when backend returns 401/404/500 errors.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const isHttp = url.startsWith('http://') || url.startsWith('https://');
  const targetUrl = isHttp ? url : apiUrl(url);
  const cleanPath = isHttp ? new URL(url).pathname : (url.startsWith('/') ? url : `/${url}`);

  const hasConfiguredBackend = Boolean(
    (metaEnv.VITE_API_BASE || '').trim() ||
    (typeof window !== 'undefined' && localStorage.getItem('s88_backend_url'))
  );

  const isStaticHost = typeof window !== 'undefined' && (
    window.location.hostname.endsWith('github.io') ||
    window.location.hostname.endsWith('web.app') ||
    window.location.hostname.endsWith('firebaseapp.com')
  );

  // If on GitHub Pages without a configured external backend URL, execute client fallback directly
  if (isStaticHost && !hasConfiguredBackend && !isHttp) {
    return handleClientApiFallback(cleanPath, options);
  }

  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Also include cached student UID if available in header for fallback auth
  try {
    const cachedUid = localStorage.getItem('s88_uid');
    if (cachedUid && !headers.has('X-User-Uid')) {
      headers.set('X-User-Uid', cachedUid);
    }
  } catch (_) {}

  try {
    const res = await fetch(targetUrl, {
      ...options,
      headers
    });

    const contentType = res.headers.get('content-type') || '';

    // If server responded with 404, 401, 500, or returned static HTML
    if ((res.status === 404 || res.status === 401 || res.status >= 500 || contentType.includes('text/html')) && !isHttp) {
      console.warn(`[fetchWithAuth] Endpoint ${cleanPath} returned ${res.status}. Routing to standalone client database fallback.`);
      return await handleClientApiFallback(cleanPath, options);
    }

    return res;
  } catch (err) {
    console.warn(`[fetchWithAuth] Network error reaching ${targetUrl}. Routing to client fallback:`, err);
    return await handleClientApiFallback(cleanPath, options);
  }
}

