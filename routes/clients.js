const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /clients?search=&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    let { search = '', page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const sql = `
      SELECT id, nom, email, vip
      FROM clients
      WHERE nom LIKE ? OR email LIKE ?
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(sql, [`%${search}%`, `%${search}%`, limit, offset]);
    res.json({ page, limit, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /clients/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, nom, email, vip FROM clients WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Client non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /clients (JWT)
router.post('/', auth, async (req, res, next) => {
  try {
    const { nom, email, vip = 0 } = req.body;
    if (!nom || !email || ![0, 1].includes(vip)) return res.status(400).json({ message: 'Données invalides' });

    await pool.query('INSERT INTO clients (nom, email, vip) VALUES (?, ?, ?)', [nom, email, vip]);
    res.status(201).json({ message: 'Client créé' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email déjà utilisé' });
    next(err);
  }
});

// PUT /clients/:id (JWT)
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { nom, email, vip } = req.body;
    if (!nom || !email || ![0,1].includes(vip)) return res.status(400).json({ message: 'Données invalides' });

    const [result] = await pool.query(
      'UPDATE clients SET nom = ?, email = ?, vip = ? WHERE id = ?',
      [nom, email, vip, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Client non trouvé' });

    res.json({ message: 'Client mis à jour' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email déjà utilisé' });
    next(err);
  }
});

// DELETE /clients/:id (JWT)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    // Vérifier si le client a des commandes
    const [cmds] = await pool.query('SELECT id FROM commandes WHERE client_id = ?', [req.params.id]);
    if (cmds.length) return res.status(400).json({ message: 'Impossible de supprimer un client ayant des commandes' });

    const [result] = await pool.query('DELETE FROM clients WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Client non trouvé' });

    res.json({ message: 'Client supprimé' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
