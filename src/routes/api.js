const lojasController = require('../controllers/lojasController');
const homeController = require('../controllers/homeController');
const { authApiMiddleware } = require('../middleware/auth');

async function apiRoutes(fastify, options) {
  
  // Applica auth globalmente nesta prefix (/api)
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
