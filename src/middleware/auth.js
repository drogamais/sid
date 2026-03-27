const jwt = require('jsonwebtoken');
const { refreshWithHub } = require('../lib/hubClient');

// A mesma secret do Hub
const JWT_SECRET = process.env.JWT_SECRET || 'sid-drogamais-jwt-secret-2026-secure-sso';

async function authMiddleware(request, reply) {
  // Bypass auth se DISABLE_AUTH=true
  if (process.env.DISABLE_AUTH === 'true') {
    // Em modo dev, permite forçar um papel via DEV_USER_ROLE (admin|user)
    const role = process.env.DEV_USER_ROLE || 'admin';
    request.user = { dev: true, role };
    return;
  }
  try {
    const token = request.cookies.sid_access_token;
    
    if (!token) {
      console.log('[Auth] No access token cookie found. Redirecting to Hub.');
      // Se não tem cookie, redireciona para o login do Hub com a URL de retorno
      const hubLogin = process.env.HUB_LOGIN_URL || 'http://localhost:8003/login';
      const redirectUrl = encodeURIComponent(`${request.protocol}://${request.headers.host}/`);
      return reply.redirect(`${hubLogin}?redirect=${redirectUrl}`);
    }

    console.log('[Auth] Verifying access token...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[Auth] Token valid for user:', decoded.userId);

    // Mapeia permissões do Hub para o papel local do SID
    // SuperAdmin do Hub ganha 'admin' em tudo. 
    // Outros usuários dependem do que está no match de appPermissions
    const perms = decoded.appPermissions || {};
    // Procuramos por "SID", "SID Lojas" ou qualquer app que tenha 'admin'
    let role = 'normal';
    if (perms['SID'] === 'admin' || perms['SID Lojas'] === 'admin') {
      role = 'admin';
    } else if (Object.values(perms).every(v => v === 'admin')) {
      // Provável Super Admin (tem admin em todos os apps carregados)
      role = 'admin';
    } else if (perms['SID'] === 'normal' || perms['SID Lojas'] === 'normal') {
      role = 'normal';
    }

    request.user = { ...decoded, role };
    console.log('[Auth] Resolved role:', role);
    
  } catch (err) {
    console.log('[Auth] Access token invalid or expired. Attempting refresh...');
    // Cookie inválido ou expirado → tenta usar refresh token
    const refreshToken = request.cookies.sid_refresh_token;
    if (refreshToken) {
      const newAccess = await refreshWithHub(refreshToken);
      if (newAccess) {
        console.log('[Auth] Refresh successful. Setting new cookie.');
        // atualiza cookie e prossegue
        reply.setCookie('sid_access_token', newAccess, {
          path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 1 * 60
        });
        try {
          const decoded = jwt.verify(newAccess, JWT_SECRET);
          request.user = decoded;
          return;
        } catch (e) {
          console.error('[Auth] Failed to verify newly refreshed token:', e.message);
        }
      } else {
        console.warn('[Auth] Hub denied refresh. Session likely revoked.');
      }
    } else {
      console.log('[Auth] No refresh token found.');
    }
    // Não foi possível renovar: limpa e redireciona para Hub
    console.log('[Auth] Logout global triggered. Redirecting to Hub Login with error=expired');
    reply.clearCookie('sid_access_token', { path: '/' });
    reply.clearCookie('sid_refresh_token', { path: '/' });
    const hubLogin = process.env.HUB_LOGIN_URL || 'http://localhost:8003/login';
    const redirectUrl = encodeURIComponent(`${request.protocol}://${request.headers.host}/`);
    return reply.redirect(`${hubLogin}?redirect=${redirectUrl}&error=expired`);
  }
}

// Middleware opcional se quiser retornar apenas 401 (para rotas de API puras vs rotas de página)
async function authApiMiddleware(request, reply) {
  // Bypass auth se DISABLE_AUTH=true
  if (process.env.DISABLE_AUTH === 'true') {
    const role = process.env.DEV_USER_ROLE || 'admin';
    request.user = { dev: true, role };
    return;
  }
  try {
    const token = request.cookies.sid_access_token;
    if (!token) return reply.status(401).send({ error: 'Não autorizado' });
    const decoded = jwt.verify(token, JWT_SECRET);
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: 'Token inválido ou expirado' });
  }
}

module.exports = { authMiddleware, authApiMiddleware };
