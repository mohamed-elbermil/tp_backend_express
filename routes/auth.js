const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
require('dotenv').config();

// Login
router.post('/login', async (req, res, next) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    });
    await schema.validateAsync(req.body);

    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ message: 'Email ou mot de passe invalide' });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(401).json({ message: 'Email ou mot de passe invalide' });

    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

// Register (optionnel pour TP)
router.post('/register', async (req, res, next) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required()
    });
    await schema.validateAsync(req.body);

    const { email, password } = req.body;
    const [exists] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (exists.length > 0) return res.status(400).json({ message: 'Email déjà utilisé' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO admins (email, password_hash) VALUES (?, ?)', [email, hash]);
    res.status(201).json({ message: 'Admin créé' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
