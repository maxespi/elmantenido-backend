const express = require('express');
const { Usuario, UsuarioEgreso } = require('../models');
const { authenticateToken } = require('./auth');
const { Op } = require('sequelize');
const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /api/usuarios - Obtener todos los usuarios (excepto el actual)
router.get('/', async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            where: {
                id: {
                    [Op.ne]: req.user.id // Excluir el usuario actual
                }
            },
            attributes: ['id', 'nombre', 'apellido', 'email', 'rut', 'telefono'],
            order: [['nombre', 'ASC']]
        });

        res.json({
            success: true,
            data: usuarios
        });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/usuarios/profile - Obtener perfil del usuario actual
router.get('/profile', async (req, res) => {
    try {
        const user = await Usuario.findByPk(req.user.id, {
            attributes: ['id', 'nombre', 'apellido', 'email', 'rut', 'telefono', 'created_at']
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/usuarios/search - Buscar usuarios por RUT, nombre o email
router.get('/search', async (req, res) => {
    try {
        const { rut, q } = req.query;

        let whereClause = {
            id: {
                [Op.ne]: req.user.id // Excluir el usuario actual
            }
        };

        if (rut) {
            whereClause.rut = { [Op.like]: `%${rut}%` };
        } else if (q) {
            whereClause[Op.or] = [
                { nombre: { [Op.like]: `%${q}%` } },
                { apellido: { [Op.like]: `%${q}%` } },
                { email: { [Op.like]: `%${q}%` } },
                { rut: { [Op.like]: `%${q}%` } }
            ];
        }

        const usuarios = await Usuario.findAll({
            where: whereClause,
            attributes: ['id', 'nombre', 'apellido', 'email', 'rut'],
            limit: 10
        });

        res.json({
            success: true,
            data: usuarios
        });
    } catch (error) {
        console.error('Error buscando usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/usuarios/estadisticas - Obtener estadísticas del usuario
router.get('/estadisticas', async (req, res) => {
    try {
        const userId = req.user.id;

        // Total gastado (como pagador)
        const totalGastado = await UsuarioEgreso.sum('monto_pagado', {
            where: {
                id_usuario: userId,
                rol: 'pagador'
            }
        }) || 0;

        // Total de deudas pendientes
        const totalDeudas = await UsuarioEgreso.sum('monto_pagado', {
            where: {
                id_usuario: userId,
                rol: 'deudor',
                estado_pago: 'pendiente'
            }
        }) || 0;

        // Total por cobrar
        const egresosPorCobrar = await UsuarioEgreso.findAll({
            where: {
                id_usuario: userId,
                rol: 'pagador'
            },
            attributes: ['id_egreso']
        });

        const idEgresosPorCobrar = egresosPorCobrar.map(e => e.id_egreso);

        const totalPorCobrar = await UsuarioEgreso.sum('monto_pagado', {
            where: {
                id_egreso: { [Op.in]: idEgresosPorCobrar },
                rol: 'deudor',
                estado_pago: 'pendiente'
            }
        }) || 0;

        // Contadores
        const cantidadEgresos = await UsuarioEgreso.count({
            where: {
                id_usuario: userId,
                rol: 'pagador'
            }
        });

        const cantidadDeudas = await UsuarioEgreso.count({
            where: {
                id_usuario: userId,
                rol: 'deudor',
                estado_pago: 'pendiente'
            }
        });

        const cantidadCobros = await UsuarioEgreso.count({
            where: {
                id_egreso: { [Op.in]: idEgresosPorCobrar },
                rol: 'deudor',
                estado_pago: 'pendiente'
            }
        });

        const estadisticas = {
            totalIngresos: 0, // Por implementar cuando tengas ingresos en backend
            totalEgresos: totalGastado,
            totalDeudas,
            totalPorCobrar,
            balanceNeto: totalPorCobrar - totalDeudas,
            cantidadEgresos,
            cantidadIngresos: 0, // Por implementar
            cantidadDeudas,
            cantidadCobros
        };

        res.json({
            success: true,
            data: estadisticas
        });

    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/usuarios/profile - Actualizar perfil del usuario
router.put('/profile', async (req, res) => {
    try {
        const { nombre, apellido, telefono } = req.body;

        const usuario = await Usuario.findByPk(req.user.id);
        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        await usuario.update({
            nombre: nombre?.trim() || usuario.nombre,
            apellido: apellido?.trim() || usuario.apellido,
            telefono: telefono?.trim() || usuario.telefono
        });

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            data: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                rut: usuario.rut,
                telefono: usuario.telefono
            }
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;