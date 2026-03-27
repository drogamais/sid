const fetch = global.fetch || require('node-fetch');

const HUB_INTERNAL_BASE = process.env.HUB_INTERNAL_URL || 'http://hub:8003';
const HUB_REFRESH_URL = HUB_INTERNAL_BASE + '/api/auth/refresh';
const HUB_LOGOUT_URL = HUB_INTERNAL_BASE + '/api/auth/logout';

// Simple in-memory dedupe to avoid multiple concurrent refresh requests for the same refresh token
const pendingRefreshes = new Map();

async function refreshWithHub(refreshToken) {
  if (!refreshToken) return null;

  if (pendingRefreshes.has(refreshToken)) {
    try {
      return await pendingRefreshes.get(refreshToken);
    } catch (e) {
      return null;
    }
  }

  const p = (async () => {
    try {
      const res = await fetch(HUB_REFRESH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.access || null;
    } catch (err) {
      return null;
    } finally {
      // noop here; removal handled below
    }
  })();

  pendingRefreshes.set(refreshToken, p);
  try {
    const result = await p;
    return result;
  } finally {
    pendingRefreshes.delete(refreshToken);
  }
}

async function logoutAtHub(refreshToken) {
  try {
    const res = await fetch(HUB_LOGOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken })
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

module.exports = { refreshWithHub, logoutAtHub };
