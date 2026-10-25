import { useEffect, useMemo, useSyncExternalStore } from "react";

const API: string =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:5001/api";

export interface User { id: number; username: string; role: string }
export interface LoginResponse { token: string; user: User }

// localStorage keys: check them in DevTools → Application → Local Storage
export const TOKEN_KEY = "token";
export const USER_KEY = "user";
const AUTH_EVENT = "auth-change";
const MAX_TIMEOUT = 2 ** 31 - 1;

/* ───────────── Plain functions (usable anywhere, no React needed) ───────────── */

/** Read the expiry (ms) from a JWT. Only a convenience; the server is the real authority. */
function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const exp = JSON.parse(atob(payload)).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** The saved JWT, or null if there is none or it has expired. */
export function getToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const exp = tokenExpiry(token);
    return exp !== null && exp <= Date.now() ? null : token;
  } catch {
    return null;
  }
}

/** The saved user, or null when signed out. */
export function getUser(): User | null {
  if (!getToken()) return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? "null") as User | null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getToken() !== null && getUser() !== null;
}

function notify() {
  window.dispatchEvent(new Event(AUTH_EVENT)); // tells every useAuth() to re-check
}

/** Call after a successful login: stores the JWT and user in localStorage. */
export function saveSession(data: LoginResponse) {
  try {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  } catch { /* storage blocked */ }
  notify();
}

/** Removes the JWT and user from localStorage. */
export function logout() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch { /* storage blocked */ }
  notify();
}

/** fetch() against your API that adds "Authorization: Bearer <token>" and signs out on a 401. Use paths like "/teams". */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (res.status === 401) logout(); // token rejected or expired on the server
  return res;
}

/* ───────────── React hook (re-renders when the session changes) ───────────── */

function subscribe(onChange: () => void) {
  window.addEventListener(AUTH_EVENT, onChange); // login/logout in this tab
  window.addEventListener("storage", onChange);  // login/logout in another tab
  return () => {
    window.removeEventListener(AUTH_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useAuth() {
  // The token string is the snapshot: it's a primitive, so React only re-renders when it really changes
  const token = useSyncExternalStore(subscribe, getToken, () => null);
  const user = useMemo(() => (token ? getUser() : null), [token]);

  // Sign out automatically when the token expires
  useEffect(() => {
    if (!token) return;
    const exp = tokenExpiry(token);
    if (exp === null) return;
    const ms = exp - Date.now();
    if (ms <= 0) { logout(); return; }
    if (ms > MAX_TIMEOUT) return; // longer than a timer allows; re-checked on the next page load
    const id = setTimeout(logout, ms);
    return () => clearTimeout(id);
  }, [token]);

  return { token, user, isLoggedIn: !!token && !!user, isAdmin: user?.role === "admin" };
}