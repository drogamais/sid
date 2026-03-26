const { authMiddleware } = require('../middleware/auth');
const { logoutAtHub } = require('../lib/hubClient');

async function pagesRoutes(fastify, options) {

  // Root route: Receives SSO redirect from Hub
  fastify.get('/', async (request, reply) => {
    // Check if URL has ?access_token
    const { access_token } = request.query;

    if (access_token) {
      // Logged in from Hub, save tokens inside HTTPOnly cookies
      reply.setCookie('sid_access_token', access_token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 // 15 minutes in seconds
      });
      // optional refresh_token in query: set as HTTPOnly long-lived cookie
      const { refresh_token } = request.query;
      if (refresh_token) {
        reply.setCookie('sid_refresh_token', refresh_token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 // 1 day
        });
      }
      // Redirect to home without token in URL
      return reply.redirect('/app/home');
    }

    // Se já estiver logado pelo authMiddleware, vai pra home, senão login
    const token = request.cookies.sid_access_token;
    if (token) {
      return reply.redirect('/app/home');
    }

    // Redireciona para login do hub
    const hubLogin = process.env.HUB_LOGIN_URL || 'http://localhost:8003/login';
    const redirectUrl = encodeURIComponent(`${request.protocol}://${request.headers.host}/`);
    return reply.redirect(`${hubLogin}?redirect=${redirectUrl}`);
  });

  // Protected SSR routes namespace (/app/*)
  fastify.register(async function (appRoutes) {
    appRoutes.addHook('preHandler', authMiddleware);

    appRoutes.get('/home', async (request, reply) => {
      const user = request.user;
      return reply.view('layout.ejs', { user, active: 'home', page: 'home' });
    });

    appRoutes.get('/lojas', async (request, reply) => {
      const user = request.user;
      return reply.view('layout.ejs', { user, active: 'lojas', page: 'lojas' });
    });

    appRoutes.get('/lojas/novo', async (request, reply) => {
      const user = request.user;
      if (user.role !== 'admin') return reply.redirect('/app/lojas');
      return reply.view('layout.ejs', { user, editId: null, active: 'lojas', page: 'loja_form' });
    });

    appRoutes.get('/lojas/:id', async (request, reply) => {
      const user = request.user;
      if (user.role !== 'admin') return reply.redirect('/app/lojas');
      return reply.view('layout.ejs', { user, editId: request.params.id, active: 'lojas', page: 'loja_form' });
    });

    // GET /app/logout → revoga refresh no Hub, limpa cookies e volta pro Hub
    appRoutes.get('/logout', async (request, reply) => {
      const refreshToken = request.cookies.sid_refresh_token;
      if (refreshToken) {
        // best-effort: ask Hub to revoke refresh token
        await logoutAtHub(refreshToken);
      }
      reply.clearCookie('sid_access_token', { path: '/' });
      reply.clearCookie('sid_refresh_token', { path: '/' });
      const hubLogin = process.env.HUB_LOGIN_URL || 'http://localhost:8003/login';
      return reply.redirect(hubLogin);
    });

  }, { prefix: '/app' });
}

module.exports = pagesRoutes;
