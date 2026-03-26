const { Op } = require('sequelize');
const { Loja } = require('../models');

const PAGE_SIZE = 20;

function buildOrderClause(ordering) {
  if (!ordering) return [['loja_numero', 'DESC']];
  const desc = ordering.startsWith('-');
  const field = desc ? ordering.slice(1) : ordering;

  const allowedFields = [
    'id_loja', 'loja_numero', 'fantasia', 'razao_social', 'cnpj',
    'cidade', 'responsavel', 'inaugurada', 'ativo', 'sistema_erp',
    'atendente', 'analista', 'cat', 'data_cadastro', 'data_inauguracao',
    'data_associacao', 'email', 'cep',
  ];
  if (!allowedFields.includes(field)) return [['loja_numero', 'DESC']];

  return [[field, desc ? 'DESC' : 'ASC']];
}

async function list(req, reply) {
  try {
    // listing endpoint
    // Listing endpoint (no ID handling here). Use `/api/lojas/get?id=123` for single loja.

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const search = req.query.search || '';
    const ordering = req.query.ordering || '-loja_numero';

    const where = {};
    if (search) {
      where[Op.or] = [
        { fantasia: { [Op.like]: `%${search}%` } },
        { razao_social: { [Op.like]: `%${search}%` } },
        { cnpj: { [Op.like]: `%${search}%` } },
        { cidade: { [Op.like]: `%${search}%` } },
        { responsavel: { [Op.like]: `%${search}%` } },
      ];
    }

    // Filters: inauguração e ativo (expecting 'true'|'false' strings)
    if (req.query.inaugurada === 'true') where.inaugurada = true;
    else if (req.query.inaugurada === 'false') where.inaugurada = false;

    if (req.query.ativo === 'true') where.ativo = true;
    else if (req.query.ativo === 'false') where.ativo = false;

    const offset = (page - 1) * PAGE_SIZE;
    const { count, rows } = await Loja.findAndCountAll({
      where,
      order: buildOrderClause(ordering),
      limit: PAGE_SIZE,
      offset,
    });

    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

    return reply.send({
      count,
      next: page < totalPages ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
      results: rows,
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ detail: 'Erro ao listar lojas.' });
  }
}

async function getById(req, reply) {
  try {
    const idRaw = req.params.id || req.query.id;
    const id = parseInt(idRaw, 10);
    if (!Number.isInteger(id) || id <= 0) return reply.status(400).send({ detail: 'ID inválido.' });

    const loja = await Loja.findByPk(id);
    if (!loja) return reply.status(404).send({ detail: 'Loja não encontrada.' });
    return reply.send(loja);
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ detail: 'Erro ao buscar loja.' });
  }
}

async function create(req, reply) {
  try {
    // Only admins
    if (req.user.role !== 'admin') return reply.status(403).send({ detail: 'Acesso negado.' });

    const data = req.body;
    if (!data.id_loja || !data.fantasia || !data.razao_social || !data.cnpj) {
      return reply.status(400).send({ detail: 'Campos obrigatórios: id_loja, fantasia, razao_social, cnpj.' });
    }

    const existing = await Loja.findByPk(data.id_loja);
    if (existing) return reply.status(400).send({ detail: 'Já existe uma loja com este ID.' });

    if (!data.data_cadastro) data.data_cadastro = new Date().toISOString().split('T')[0];

    const loja = await Loja.create(data);
    return reply.status(201).send(loja);
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ detail: 'Erro ao criar loja.' });
  }
}

async function update(req, reply) {
  try {
    if (req.user.role !== 'admin') return reply.status(403).send({ detail: 'Acesso negado.' });

    const idRaw = req.params.id || req.query.id;
    const id = parseInt(idRaw, 10);
    if (!Number.isInteger(id) || id <= 0) return reply.status(400).send({ detail: 'ID inválido.' });

    const loja = await Loja.findByPk(id);
    if (!loja) return reply.status(404).send({ detail: 'Loja não encontrada.' });

    const data = req.body;
    delete data.id_loja;

    await loja.update(data);
    return reply.send(loja);
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ detail: 'Erro ao atualizar loja.' });
  }
}

async function remove(req, reply) {
  try {
    if (req.user.role !== 'admin') return reply.status(403).send({ detail: 'Acesso negado.' });
    const idRaw = req.params.id || req.query.id;
    const id = parseInt(idRaw, 10);
    if (!Number.isInteger(id) || id <= 0) return reply.status(400).send({ detail: 'ID inválido.' });

    const loja = await Loja.findByPk(id);
    if (!loja) return reply.status(404).send({ detail: 'Loja não encontrada.' });

    await loja.destroy();
    return reply.status(204).send();
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ detail: 'Erro ao excluir loja.' });
  }
}

module.exports = { list, getById, create, update, remove };
