const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const router = express.Router();

// Clave secreta para JWT (debería estar en .env)
const JWT_SECRET = process.env.JWT_SECRET || 'tu-clave-secreta-super-segura';

// Middleware para validar token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acceso requerido'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Token inválido'
            });
        }
        req.user = user;
        next();
    });
};

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar datos requeridos
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        // Buscar usuario por email
        const usuario = await Usuario.findOne({
            where: { email: email.toLowerCase().trim() }
        });

        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        // Verificar contraseña
        const passwordValid = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        // Generar JWT token
        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email,
                rut: usuario.rut
            },
            JWT_SECRET,
            { expiresIn: '7d' } // Token válido por 7 días
        );

        // Respuesta exitosa (sin incluir password_hash)
        const userResponse = {
            id: usuario.id,
            rut: usuario.rut,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            telefono: usuario.telefono,
            fecha_nacimiento: usuario.fecha_nacimiento,
            created_at: usuario.createdAt,
            updated_at: usuario.updatedAt
        };

        res.json({
            success: true,
            message: 'Login exitoso',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/auth/register - Registrar nuevo usuario
router.post('/register', async (req, res) => {
    try {
        const {
            rut,
            nombre,
            apellido,
            email,
            password,
            telefono,
            fecha_nacimiento
        } = req.body;

        // Validar datos requeridos
        if (!rut || !nombre || !apellido || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos obligatorios deben ser completados'
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }

        // Verificar si el usuario ya existe (por email o RUT)
        const existingUser = await Usuario.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { email: email.toLowerCase().trim() },
                    { rut: rut.trim() }
                ]
            }
        });

        if (existingUser) {
            const field = existingUser.email === email.toLowerCase().trim() ? 'email' : 'RUT';
            return res.status(409).json({
                success: false,
                message: `Ya existe un usuario con ese ${field}`
            });
        }

        // Encriptar contraseña
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Crear nuevo usuario
        const nuevoUsuario = await Usuario.create({
            rut: rut.trim(),
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            email: email.toLowerCase().trim(),
            password_hash,
            telefono: telefono?.trim() || null,
            fecha_nacimiento: fecha_nacimiento || null
        });

        // Generar JWT token
        const token = jwt.sign(
            {
                id: nuevoUsuario.id,
                email: nuevoUsuario.email,
                rut: nuevoUsuario.rut
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Respuesta exitosa
        const userResponse = {
            id: nuevoUsuario.id,
            rut: nuevoUsuario.rut,
            nombre: nuevoUsuario.nombre,
            apellido: nuevoUsuario.apellido,
            email: nuevoUsuario.email,
            telefono: nuevoUsuario.telefono,
            fecha_nacimiento: nuevoUsuario.fecha_nacimiento,
            created_at: nuevoUsuario.createdAt,
            updated_at: nuevoUsuario.updatedAt
        };

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/auth/me - Obtener información del usuario autenticado
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.user.id, {
            attributes: { exclude: ['password_hash'] }
        });

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            user: usuario
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/auth/logout - Cerrar sesión (opcional - principalmente del lado cliente)
router.post('/logout', authenticateToken, (req, res) => {
    // En un sistema más complejo, podrías agregar el token a una blacklist
    res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
    });
});

// POST /api/auth/refresh - Renovar token
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        // Generar nuevo token
        const newToken = jwt.sign(
            {
                id: req.user.id,
                email: req.user.email,
                rut: req.user.rut
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token: newToken
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/auth/change-password - Cambiar contraseña
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Contraseña actual y nueva contraseña son requeridas'
            });
        }

        // Buscar usuario
        const usuario = await Usuario.findByPk(req.user.id);
        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar contraseña actual
        const passwordValid = await bcrypt.compare(currentPassword, usuario.password_hash);
        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña actual incorrecta'
            });
        }

        // Encriptar nueva contraseña
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Actualizar contraseña
        await usuario.update({
            password_hash: newPasswordHash
        });

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;