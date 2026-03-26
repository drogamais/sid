require('dotenv').config();
const Fastify = require('fastify');
const path = require('path');

const fastify = Fastify({ logger: true, ignoreTrailingSlash: true });



// Registra plugins
fastify.register(require('@fastify/cors'), { origin: true, credentials: true });
fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/cookie'), {
  secret: process.env.COOKIE_SECRET || 'my-sid-secret',
  parseOptions: {}
});

fastify.register(require('@fastify/view'), {
  engine: { ejs: require('ejs') },
  root: path.join(__dirname, 'views'),
});

// Middleware genérico (opcional, hooks do fastify são melhores)
// O middleware de autenticação será registrado nas rotas.

// Banco de dados
const sequelize = require('./config/database');

// Rotas
fastify.register(require('./routes/api'), { prefix: '/api' });
fastify.register(require('./routes/pages'));

// Serve small static assets without extra dependency (logo)
const fs = require('fs');
fastify.get('/logo_drogamais.ico', async (request, reply) => {
  const logoPath = path.join(__dirname, '..', 'public', 'logo_drogamais.ico');
  try {
    const data = await fs.promises.readFile(logoPath);
    reply.type('image/x-icon').send(data);
  } catch (err) {
    reply.status(404).send('Not found');
  }
});

const start = async () => {
  try {
    // Sincroniza BD (apenas conecta e não altera tabelas em prod)
    await sequelize.authenticate();
    fastify.log.info('Conexão com MariaDB estabelecida para SID.');
    // await sequelize.sync(); // Opcional, descomentar se precisar criar tabelas
    
    const port = process.env.PORT || 8004;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 SID rodando em http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
