const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'dbteste',
  process.env.DB_USER || 'usuario',
  process.env.DB_PASSWORD || 'senha',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql', // mysql2
    logging: false,
    dialectOptions: {
      connectTimeout: 60000,
    },
    pool: {
      max: 20,
      min: 0,
      acquire: 60000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
