const express = require('express');
const { Egreso, Usuario, UsuarioEgreso, sequelize } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// Health check para egresos
router.get('/health', (req, res) => {
    res.json({ status: 'Egresos routes OK' });
});

module.exports = router;