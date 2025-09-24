const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /commandes?client_id=&statut=&date_min=&date_max=
router.get('/', async (req, res, next) => {
  try {
    let { client_id, statut, date_min, date_max, page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];

    if (client_id) {
      conditions.push('c.client_id = ?');
      params.push(client_id);
    }
    if (statut) {
      conditions.push('c.statut = ?');
      params.push(statut);
    }
    if (date_min) {
      conditions.push('c.date >= ?');
      params.push(date_min);
    }
    if (date_max) {
      conditions.push('c.date <= ?');
      params.push(date_max);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const sql = `
      SELECT c.id, c.client_id, cl.nom AS client_nom, c.statut, c.date,
        SUM(l.quantite * l.prix_unit * (1 + l.tva/100)) AS total_ttc
      FROM commandes c
      JOIN clients cl ON c.client_id = cl.id
      JOIN commande_ligne l ON c.id = l.commande_id
      ${where}
      GROUP BY c.id
      ORDER BY c.date DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
    res.json({ page, limit, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /commandes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [commandes] = await pool.query(`
      SELECT c.id, c.client_id, cl.nom AS client_nom, c.statut, c.date
      FROM commandes c
      JOIN clients cl ON c.client_id = cl.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (!commandes.length) return res.status(404).json({ message: 'Commande non trouvée' });

    const commande = commandes[0];

    const [lignes] = await pool.query(`
      SELECT l.id, l.produit_id, p.titre, l.quantite, l.prix_unit, l.tva
      FROM commande_ligne l
      JOIN produits p ON l.produit_id = p.id
      WHERE l.commande_id = ?
    `, [req.params.id]);

    commande.lignes = lignes;
    res.json(commande);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
