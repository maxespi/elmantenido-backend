const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const router = express.Router();

// Registro
router.post('/register', async (req, res) => {
    try {
        const { nombre, apellido, email, rut, telefono, password } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await Usuario.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { email },
                    { rut }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Usuario ya existe con ese email o RUT' });
        }

        // Hash de la contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Crear usuario
        const user = await Usuario.create({
            nombre,
            apellido,
            email,
            rut,
            telefono,
            password_hash: passwordHash
        });

        // Generar token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remover password del response
        const userResponse = user.toJSON();
        delete userResponse.password_hash;

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            token,
            user: userResponse
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario
        const user = await Usuario.findOne({ where: { email } });

        if (!user || !await bcrypt.compare(password, user.password_hash)) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remover password del response
        const userResponse = user.toJSON();
        delete userResponse.password_hash;

        res.json({ token, user: userResponse });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;