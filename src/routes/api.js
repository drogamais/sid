const lojasController = require('../controllers/lojasController');
const homeController = require('../controllers/homeController');
const { authApiMiddleware } = require('../middleware/auth');
const { refreshWithHub } = require('../lib/hubClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sid-drogamais-jwt-secret-2026-secure-sso';

async function apiRoutes(fastify, options) {
  // Rota de refresh silencioso PROXY (não requer autenticação preHandler)
  fastify.post('/auth/refresh-session', async (request, reply) => {
    const refreshToken = request.cookies.sid_refresh_token;
    console.log('[SID API] Refresh session call. Has refresh token cookie:', !!refreshToken);
    
    if (!refreshToken) {
      console.warn('[SID API] No sid_refresh_token found in cookies.');
      return reply.code(401).send({ error: 'Nenhum refresh token encontrado' });
    }

    try {
      console.log('[SID API] Attempting to refresh token with Hub...');
      const newAccess = await refreshWithHub(refreshToken);
      
      if (newAccess) {
        console.log('[SID API] Successfully refreshed with Hub.');
        reply.setCookie('sid_access_token', newAccess, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 1 * 60 // 1 minuto, igual ao Hub
        });
        return reply.send({ success: true });
      } else {
        console.warn('[SID API] Hub refresh call returned failure (null). Check Hub logs or internal URL.');
        return reply.code(401).send({ error: 'Renovação negada pelo Hub' });
      }
    } catch (err) {
      console.error('[SID API] Internal error during refresh proxy:', err.message);
      return reply.code(500).send({ error: 'Erro interno ao tentar renovar' });
    }
  });

  // Applica auth globalmente nesta prefix (/api) DAQUI PRA BAIXO
  fastify.addHook('preHandler', authApiMiddleware);

  // Home API
  fastify.get('/home/summary', homeController.summary);

  // Lojas API
  // `list` will also return a single loja when `?id=123` is provided.
  fastify.get('/lojas', lojasController.list);
  // Single loja by query id (avoid path param)
  fastify.get('/lojas/get', lojasController.getById);
  fastify.post('/lojas', lojasController.create);
  // Update/delete accept `id` via querystring to avoid path param issues
  fastify.patch('/lojas', lojasController.update);
  fastify.delete('/lojas', lojasController.remove);

}

module.exports = apiRoutes;
