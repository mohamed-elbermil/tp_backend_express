const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /produits?categorie=&minPrix=&maxPrix=&sort=prix|titre
router.get('/', async (req, res, next) => {
  try {
    let { categorie = '', minPrix = 0, maxPrix = 999999, sort = 'titre', page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // whitelist pour le tri
    const sortable = ['prix', 'titre'];
    if (!sortable.includes(sort)) sort = 'titre';

    const sql = `
      SELECT id, titre, categorie, prix, stock
      FROM produits
      WHERE categorie LIKE ? AND prix BETWEEN ? AND ?
      ORDER BY ${sort} ASC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(sql, [`%${categorie}%`, minPrix, maxPrix, limit, offset]);
    res.json({ page, limit, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /produits/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, titre, categorie, prix, stock FROM produits WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Produit non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /produits (JWT)
router.post('/', auth, async (req, res, next) => {
  try {
    const { titre, categorie, prix, stock } = req.body;
    if (!titre || !categorie || prix < 0 || stock < 0) return res.status(400).json({ message: 'Données invalides' });

    await pool.query('INSERT INTO produits (titre, categorie, prix, stock) VALUES (?, ?, ?, ?)', [titre, categorie, prix, stock]);
    res.status(201).json({ message: 'Produit créé' });
  } catch (err) {
    next(err);
  }
});

// PUT /produits/:id/stock (JWT)
router.put('/:id/stock', auth, async (req, res, next) => {
  try {
    const { ajustement } = req.body;
    if (typeof ajustement !== 'number') return res.status(400).json({ message: 'Ajustement invalide' });

    // vérifier stock actuel
    const [rows] = await pool.query('SELECT stock FROM produits WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Produit non trouvé' });

    const nouveauStock = rows[0].stock + ajustement;
    if (nouveauStock < 0) return res.status(400).json({ message: 'Stock insuffisant' });

    await pool.query('UPDATE produits SET stock = ? WHERE id = ?', [nouveauStock, req.params.id]);
    res.json({ message: 'Stock mis à jour', stock: nouveauStock });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
