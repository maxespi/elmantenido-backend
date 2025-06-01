const express = require('express');
const { Usuario } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// Obtener todos los usuarios (excepto el actual)
router.get('/', auth, async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            where: {
                id: {
                    [require('sequelize').Op.ne]: req.userId
                }
            },
            attributes: ['id', 'nombre', 'apellido', 'email', 'rut', 'telefono']
        });

        res.json(usuarios);
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener perfil del usuario actual
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await Usuario.findByPk(req.userId, {
            attributes: ['id', 'nombre', 'apellido', 'email', 'rut', 'telefono']
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;