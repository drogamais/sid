const sequelize = require('../config/database');
const Loja = require('./Loja');

const db = {
  sequelize,
  Loja,
};

module.exports = db;
