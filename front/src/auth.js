// Shared auth helpers — keep users signed in even when the backend briefly
// blips (sandbox/service restarts). We only treat an EXPLIC `loggedIn:false`
// from a successful response as logged out; network errors keep the session.
const STORAGE_KEY = "cai_session";

export function cacheSession(user) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (_) {}
}

export function getCachedSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function clearCachedSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

/**
 * Returns { loggedIn, user } when the server clearly answered, and
 * { transient: true } when the request failed (network/5xx) so callers can
 * keep the cached session instead of bouncing the user to the login page.
 */
export async function checkLogin() {
  try {
    const res = await fetch("/api/user/check-login", { credentials: "include" });
    if (!res.ok) return { transient: true }; // 5xx/4xx ≠ "logged out"
    const data = await res.json();
    if (data.loggedIn) {
      cacheSession(data.user);
      return { loggedIn: true, user: data.user };
    }
    return { loggedIn: false };
  } catch (err) {
    return { transient: true };
  }
}
