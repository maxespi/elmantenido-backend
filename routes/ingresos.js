const express = require('express');
const { Ingreso, Usuario, UsuarioIngreso } = require('../models');
const { authenticateToken } = require('./auth');
const { Op } = require('sequelize');
const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET Obtener estadísticas de ingresos del usuario
router.get('/estadisticas', async (req, res) => {
    try {
        const userId = req.user.id;

        // Total de ingresos
        const totalIngresos = await UsuarioIngreso.sum('monto_recibido', {
            where: { id_usuario: userId }
        }) || 0;

        // Cantidad de ingresos
        const cantidadIngresos = await UsuarioIngreso.count({
            where: { id_usuario: userId }
        });

        // Ingresos por categoría
        const ingresosPorCategoria = await UsuarioIngreso.findAll({
            where: { id_usuario: userId },
            include: [{
                model: Ingreso,
                as: 'ingreso',
                attributes: ['categoria']
            }],
            attributes: [
                [require('sequelize').fn('SUM', require('sequelize').col('monto_recibido')), 'total'],
                [require('sequelize').col('ingreso.categoria'), 'categoria']
            ],
            group: ['ingreso.categoria'],
            raw: true
        });

        const estadisticas = {
            totalIngresos,
            cantidadIngresos,
            ingresosPorCategoria
        };

        res.json({
            success: true,
            data: estadisticas
        });

    } catch (error) {
        console.error('Error getting ingreso statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/ingresos - Obtener todos los ingresos del usuario
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;

        const usuarioIngresos = await UsuarioIngreso.findAll({
            where: { id_usuario: userId },
            include: [
                {
                    model: Ingreso,
                    as: 'ingreso'
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nombre', 'apellido', 'rut']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: usuarioIngresos
        });

    } catch (error) {
        console.error('Error getting ingresos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/ingresos/:id - Obtener ingreso específico
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verificar que el usuario tenga acceso a este ingreso
        const usuarioIngreso = await UsuarioIngreso.findOne({
            where: {
                id_ingreso: id,
                id_usuario: userId
            }
        });

        if (!usuarioIngreso) {
            return res.status(403).json({
                success: false,
                message: 'No tienes acceso a este ingreso'
            });
        }

        // Obtener el ingreso completo
        const ingreso = await Ingreso.findByPk(id);
        const relacion = await UsuarioIngreso.findOne({
            where: {
                id_ingreso: id,
                id_usuario: userId
            },
            include: [{
                model: Usuario,
                as: 'usuario',
                attributes: ['id', 'nombre', 'apellido', 'rut']
            }]
        });

        res.json({
            success: true,
            data: {
                ingreso,
                relacion
            }
        });

    } catch (error) {
        console.error('Error getting ingreso:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/ingresos - Crear nuevo ingreso
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            nombre,
            categoria,
            divisa,
            es_recurrente,
            observaciones,
            monto_recibido,
            fecha_recibo,
            comentarios
        } = req.body;

        // Validar datos requeridos
        if (!nombre || !monto_recibido || monto_recibido <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Nombre y monto recibido son requeridos'
            });
        }

        // Crear el ingreso
        const nuevoIngreso = await Ingreso.create({
            nombre: nombre.trim(),
            categoria: categoria || 'otro',
            divisa: divisa || 'CLP',
            es_recurrente: es_recurrente || false,
            observaciones: observaciones || null
        });

        // Crear la relación usuario-ingreso
        await UsuarioIngreso.create({
            id_usuario: userId,
            id_ingreso: nuevoIngreso.id,
            monto_recibido: parseFloat(monto_recibido),
            fecha_recibo: fecha_recibo || new Date().toISOString().split('T')[0],
            comentarios: comentarios || null
        });

        // Obtener el ingreso creado con la relación
        const ingresoCompleto = await Ingreso.findByPk(nuevoIngreso.id);
        const relacionCreada = await UsuarioIngreso.findOne({
            where: {
                id_ingreso: nuevoIngreso.id,
                id_usuario: userId
            },
            include: [{
                model: Usuario,
                as: 'usuario',
                attributes: ['id', 'nombre', 'apellido', 'rut']
            }]
        });

        res.status(201).json({
            success: true,
            message: 'Ingreso creado exitosamente',
            data: {
                ingreso: ingresoCompleto,
                relacion: relacionCreada
            }
        });

    } catch (error) {
        console.error('Error creating ingreso:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/ingresos/:id - Actualizar ingreso
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const updateData = req.body;

        // Verificar que el usuario tenga acceso a este ingreso
        const usuarioIngreso = await UsuarioIngreso.findOne({
            where: {
                id_ingreso: id,
                id_usuario: userId
            }
        });

        if (!usuarioIngreso) {
            return res.status(403).json({
                success: false,
                message: 'No tienes acceso a este ingreso'
            });
        }

        // Actualizar el ingreso
        const ingreso = await Ingreso.findByPk(id);
        if (!ingreso) {
            return res.status(404).json({
                success: false,
                message: 'Ingreso no encontrado'
            });
        }

        // Actualizar campos del ingreso
        await ingreso.update({
            nombre: updateData.nombre || ingreso.nombre,
            categoria: updateData.categoria || ingreso.categoria,
            divisa: updateData.divisa || ingreso.divisa,
            es_recurrente: updateData.es_recurrente !== undefined ? updateData.es_recurrente : ingreso.es_recurrente,
            observaciones: updateData.observaciones !== undefined ? updateData.observaciones : ingreso.observaciones
        });

        // Actualizar la relación usuario-ingreso
        await usuarioIngreso.update({
            monto_recibido: updateData.monto_recibido !== undefined ? parseFloat(updateData.monto_recibido) : usuarioIngreso.monto_recibido,
            fecha_recibo: updateData.fecha_recibo || usuarioIngreso.fecha_recibo,
            comentarios: updateData.comentarios !== undefined ? updateData.comentarios : usuarioIngreso.comentarios
        });

        res.json({
            success: true,
            message: 'Ingreso actualizado exitosamente',
            data: {
                ingreso,
                relacion: usuarioIngreso
            }
        });

    } catch (error) {
        console.error('Error updating ingreso:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// DELETE /api/ingresos/:id - Eliminar ingreso
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verificar que el usuario tenga acceso a este ingreso
        const usuarioIngreso = await UsuarioIngreso.findOne({
            where: {
                id_ingreso: id,
                id_usuario: userId
            }
        });

        if (!usuarioIngreso) {
            return res.status(403).json({
                success: false,
                message: 'No tienes acceso a este ingreso'
            });
        }

        // Eliminar la relación usuario-ingreso
        await UsuarioIngreso.destroy({
            where: { id_ingreso: id }
        });

        // Eliminar el ingreso
        await Ingreso.destroy({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Ingreso eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error deleting ingreso:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;