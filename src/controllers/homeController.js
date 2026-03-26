const { Op } = require('sequelize');
const { Loja } = require('../models');

async function summary(req, reply) {
  try {
    // Only count records where loja_numero is not null
    const associadas = await Loja.count({ 
      where: { 
        ativo: true,
        loja_numero: { [Op.ne]: null }
      } 
    });

    const inauguradas = await Loja.count({ 
      where: { 
        inaugurada: true,
        ativo: true,
        loja_numero: { [Op.ne]: null }
      } 
    });

    const layoutzacao = await Loja.count({ 
      where: { 
        ativo: true,
        [Op.or]: [
          { inaugurada: false },
          { inaugurada: null }
        ],
        loja_numero: { [Op.ne]: null }
      } 
    });

    return reply.send({ associadas, inauguradas, layoutzacao });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ detail: 'Erro ao carregar resumo.' });
  }
}

module.exports = { summary };
