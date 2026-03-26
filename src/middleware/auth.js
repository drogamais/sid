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
      // Se não tem cookie, redireciona para o login do Hub com a URL de retorno
      const hubLogin = process.env.HUB_LOGIN_URL || 'http://localhost:8003/login';
      const redirectUrl = encodeURIComponent(`${request.protocol}://${request.headers.host}/`);
      return reply.redirect(`${hubLogin}?redirect=${redirectUrl}`);
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    request.user = decoded;
    
  } catch (err) {
    // Cookie inválido ou expirado → tenta usar refresh token
    const refreshToken = request.cookies.sid_refresh_token;
    if (refreshToken) {
      const newAccess = await refreshWithHub(refreshToken);
      if (newAccess) {
        // atualiza cookie e prossegue
        reply.setCookie('sid_access_token', newAccess, {
          path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60
        });
        try {
          const decoded = jwt.verify(newAccess, JWT_SECRET);
          request.user = decoded;
          return;
        } catch (e) {
          // segue para limpeza abaixo
        }
      }
    }
    // Não foi possível renovar: limpa e redireciona para Hub
    reply.clearCookie('sid_access_token', { path: '/' });
    reply.clearCookie('sid_refresh_token', { path: '/' });
    const hubLogin = process.env.HUB_LOGIN_URL || 'http://localhost:8003/login';
    const redirectUrl = encodeURIComponent(`${request.protocol}://${request.headers.host}/`);
    return reply.redirect(`${hubLogin}?redirect=${redirectUrl}`);
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
