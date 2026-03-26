const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'db_sid',
  process.env.DB_USER || 'drogamais',
  process.env.DB_PASSWORD || 'dB$$MYSql@2119',
  {
    host: process.env.DB_HOST || '10.48.12.20',
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
