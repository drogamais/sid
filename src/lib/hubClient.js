const fetch = global.fetch || require('node-fetch');

const HUB_REFRESH_URL = process.env.HUB_REFRESH_URL || (process.env.HUB_BASE_URL || 'http://localhost:8003') + '/api/auth/refresh';
const HUB_LOGOUT_URL = process.env.HUB_LOGOUT_URL || (process.env.HUB_BASE_URL || 'http://localhost:8003') + '/api/auth/logout';

async function refreshWithHub(refreshToken) {
  if (!refreshToken) return null;
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
