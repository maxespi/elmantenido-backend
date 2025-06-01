const express = require('express');
const { Usuario, Egreso, UsuarioEgreso, sequelize } = require('../models');
const router = express.Router();

// Dashboard principal
router.get('/', async (req, res) => {
    try {
        const stats = {
            usuarios: await Usuario.count(),
            egresos: await Egreso.count(),
            relaciones: await UsuarioEgreso.count(),
            totalMonto: await UsuarioEgreso.sum('monto_pagado') || 0
        };

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            stats
        });
    } catch (error) {
        res.render('admin/error', { error: error.message });
    }
});

// Listar tablas
router.get('/tables', (req, res) => {
    const tables = [
        { name: 'usuarios', displayName: 'Usuarios', icon: '👥' },
        { name: 'egresos', displayName: 'Egresos', icon: '💰' },
        { name: 'usuario_egresos', displayName: 'Usuario-Egresos', icon: '🔗' }
    ];

    res.render('admin/tables', {
        title: 'Tablas de Base de Datos',
        tables
    });
});

// Ver datos de una tabla
router.get('/table/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        let data, model, includeOptions = [];

        switch (tableName) {
            case 'usuarios':
                model = Usuario;
                data = await Usuario.findAndCountAll({
                    limit,
                    offset,
                    order: [['created_at', 'DESC']]
                });
                break;

            case 'egresos':
                model = Egreso;
                data = await Egreso.findAndCountAll({
                    limit,
                    offset,
                    order: [['created_at', 'DESC']]
                });
                break;

            case 'usuario_egresos':
                model = UsuarioEgreso;
                includeOptions = [
                    { model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido'] },
                    { model: Egreso, as: 'egreso', attributes: ['nombre'] }
                ];
                data = await UsuarioEgreso.findAndCountAll({
                    include: includeOptions,
                    limit,
                    offset,
                    order: [['created_at', 'DESC']]
                });
                break;

            default:
                return res.status(404).render('admin/error', {
                    error: 'Tabla no encontrada'
                });
        }

        const totalPages = Math.ceil(data.count / limit);

        res.render('admin/table-view', {
            title: `Tabla: ${tableName}`,
            tableName,
            data: data.rows,
            pagination: {
                currentPage: page,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            model: model.rawAttributes
        });
    } catch (error) {
        res.render('admin/error', { error: error.message });
    }
});

// Crear registro - GET
router.get('/table/:tableName/create', async (req, res) => {
    try {
        const { tableName } = req.params;
        let model, relatedData = {};

        switch (tableName) {
            case 'usuarios':
                model = Usuario;
                break;
            case 'egresos':
                model = Egreso;
                break;
            case 'usuario_egresos':
                model = UsuarioEgreso;
                relatedData.usuarios = await Usuario.findAll({ attributes: ['id', 'nombre', 'apellido'] });
                relatedData.egresos = await Egreso.findAll({ attributes: ['id', 'nombre'] });
                break;
            default:
                return res.status(404).render('admin/error', { error: 'Tabla no encontrada' });
        }

        res.render('admin/create', {
            title: `Crear en ${tableName}`,
            tableName,
            model: model.rawAttributes,
            relatedData
        });
    } catch (error) {
        res.render('admin/error', { error: error.message });
    }
});

// Procesar creación - POST
router.post('/table/:tableName/create', async (req, res) => {
    try {
        const { tableName } = req.params;
        let model;

        console.log('Datos recibidos:', req.body); // Debug

        switch (tableName) {
            case 'usuarios':
                model = Usuario;
                // Manejar contraseña
                if (req.body.password) {
                    const bcrypt = require('bcryptjs');
                    req.body.password_hash = await bcrypt.hash(req.body.password, 10);
                    delete req.body.password;
                }
                break;
            case 'egresos':
                model = Egreso;
                // Convertir monto a número
                if (req.body.monto_total) {
                    req.body.monto_total = parseFloat(req.body.monto_total);
                }
                break;
            case 'usuario_egresos':
                model = UsuarioEgreso;
                // Convertir campos numéricos
                if (req.body.monto_pagado) {
                    req.body.monto_pagado = parseFloat(req.body.monto_pagado);
                }
                if (req.body.id_usuario) {
                    req.body.id_usuario = parseInt(req.body.id_usuario);
                }
                if (req.body.id_egreso) {
                    req.body.id_egreso = parseInt(req.body.id_egreso);
                }
                break;
            default:
                return res.status(404).json({ error: 'Tabla no encontrada' });
        }

        // Limpiar campos vacíos
        Object.keys(req.body).forEach(key => {
            if (req.body[key] === '' || req.body[key] === null) {
                delete req.body[key];
            }
        });

        console.log('Datos procesados:', req.body); // Debug

        const newRecord = await model.create(req.body);
        console.log('Registro creado:', newRecord.id); // Debug

        res.redirect(`/admin/table/${tableName}?success=created`);
    } catch (error) {
        console.error('Error creando registro:', error);
        res.redirect(`/admin/table/${tableName}/create?error=${encodeURIComponent(error.message)}`);
    }
});

// Editar registro - GET
router.get('/table/:tableName/edit/:id', async (req, res) => {
    try {
        const { tableName, id } = req.params;
        let model, record, relatedData = {};

        switch (tableName) {
            case 'usuarios':
                model = Usuario;
                record = await Usuario.findByPk(id);
                break;
            case 'egresos':
                model = Egreso;
                record = await Egreso.findByPk(id);
                break;
            case 'usuario_egresos':
                model = UsuarioEgreso;
                record = await UsuarioEgreso.findByPk(id);
                relatedData.usuarios = await Usuario.findAll({ attributes: ['id', 'nombre', 'apellido'] });
                relatedData.egresos = await Egreso.findAll({ attributes: ['id', 'nombre'] });
                break;
            default:
                return res.status(404).render('admin/error', { error: 'Tabla no encontrada' });
        }

        if (!record) {
            return res.status(404).render('admin/error', { error: 'Registro no encontrado' });
        }

        res.render('admin/edit', {
            title: `Editar ${tableName} #${id}`,
            tableName,
            record: record.toJSON(),
            model: model.rawAttributes,
            relatedData
        });
    } catch (error) {
        res.render('admin/error', { error: error.message });
    }
});

// Procesar edición - POST
router.post('/table/:tableName/edit/:id', async (req, res) => {
    try {
        const { tableName, id } = req.params;
        let model;

        console.log('Editando registro:', id, 'con datos:', req.body); // Debug

        switch (tableName) {
            case 'usuarios':
                model = Usuario;
                // Manejar contraseña solo si se proporciona
                if (req.body.password && req.body.password.trim() !== '') {
                    const bcrypt = require('bcryptjs');
                    req.body.password_hash = await bcrypt.hash(req.body.password, 10);
                }
                delete req.body.password; // Siempre eliminar el campo password
                break;
            case 'egresos':
                model = Egreso;
                if (req.body.monto_total) {
                    req.body.monto_total = parseFloat(req.body.monto_total);
                }
                break;
            case 'usuario_egresos':
                model = UsuarioEgreso;
                if (req.body.monto_pagado) {
                    req.body.monto_pagado = parseFloat(req.body.monto_pagado);
                }
                if (req.body.id_usuario) {
                    req.body.id_usuario = parseInt(req.body.id_usuario);
                }
                if (req.body.id_egreso) {
                    req.body.id_egreso = parseInt(req.body.id_egreso);
                }
                break;
            default:
                return res.status(404).json({ error: 'Tabla no encontrada' });
        }

        // Limpiar campos vacíos (excepto password_hash si existe)
        Object.keys(req.body).forEach(key => {
            if (key !== 'password_hash' && (req.body[key] === '' || req.body[key] === null)) {
                delete req.body[key];
            }
        });

        console.log('Datos finales para actualizar:', req.body); // Debug

        const [affectedRows] = await model.update(req.body, { where: { id } });

        if (affectedRows === 0) {
            throw new Error('No se encontró el registro para actualizar');
        }

        res.redirect(`/admin/table/${tableName}?success=updated`);
    } catch (error) {
        console.error('Error actualizando registro:', error);
        res.redirect(`/admin/table/${tableName}/edit/${id}?error=${encodeURIComponent(error.message)}`);
    }
});

// Eliminar registro
router.post('/table/:tableName/delete/:id', async (req, res) => {
    try {
        const { tableName, id } = req.params;
        let model;

        switch (tableName) {
            case 'usuarios':
                model = Usuario;
                break;
            case 'egresos':
                model = Egreso;
                break;
            case 'usuario_egresos':
                model = UsuarioEgreso;
                break;
            default:
                return res.status(404).json({ error: 'Tabla no encontrada' });
        }

        await model.destroy({ where: { id } });
        res.redirect(`/admin/table/${tableName}?success=deleted`);
    } catch (error) {
        res.redirect(`/admin/table/${tableName}?error=${encodeURIComponent(error.message)}`);
    }
});

// API para búsqueda rápida
router.get('/api/search/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const { q } = req.query;

        if (!q) return res.json([]);

        let results = [];

        switch (tableName) {
            case 'usuarios':
                results = await Usuario.findAll({
                    where: {
                        [sequelize.Op.or]: [
                            { nombre: { [sequelize.Op.like]: `%${q}%` } },
                            { apellido: { [sequelize.Op.like]: `%${q}%` } },
                            { email: { [sequelize.Op.like]: `%${q}%` } }
                        ]
                    },
                    limit: 10
                });
                break;
            case 'egresos':
                results = await Egreso.findAll({
                    where: {
                        nombre: { [sequelize.Op.like]: `%${q}%` }
                    },
                    limit: 10
                });
                break;
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Vista detallada de usuario con sus relaciones
router.get('/user/:userId/details', async (req, res) => {
    try {
        const { userId } = req.params;

        // Obtener información del usuario
        const usuario = await Usuario.findByPk(userId, {
            attributes: ['id', 'nombre', 'apellido', 'email', 'rut', 'telefono', 'created_at']
        });

        if (!usuario) {
            return res.status(404).render('admin/error', {
                error: 'Usuario no encontrado'
            });
        }

        // Obtener todas las relaciones del usuario con egresos
        const relaciones = await UsuarioEgreso.findAll({
            where: { id_usuario: userId },
            include: [
                {
                    model: Egreso,
                    as: 'egreso',
                    attributes: ['id', 'nombre', 'categoria', 'monto_total', 'divisa', 'fecha', 'observaciones']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Separar por tipo de relación
        const comoPagedador = relaciones.filter(r => r.rol === 'pagador');
        const comoDeudor = relaciones.filter(r => r.rol === 'deudor');

        // Calcular estadísticas
        const stats = {
            totalEgresos: relaciones.length,
            comoPagador: comoPagedador.length,
            comoDeudor: comoDeudor.length,
            montoTotalPagado: comoPagedador.reduce((sum, r) => sum + parseFloat(r.monto_pagado || 0), 0),
            montoTotalDeuda: comoDeudor.reduce((sum, r) => sum + parseFloat(r.monto_pagado || 0), 0),
            deudasPendientes: comoDeudor.filter(r => r.estado_pago === 'pendiente').length,
            deudasPagadas: comoDeudor.filter(r => r.estado_pago === 'pagado').length
        };

        res.render('admin/user-details', {
            title: `Detalle de Usuario: ${usuario.nombre} ${usuario.apellido}`,
            usuario: usuario.toJSON(),
            relaciones,
            comoPagedador,
            comoDeudor,
            stats
        });

    } catch (error) {
        console.error('Error obteniendo detalle de usuario:', error);
        res.render('admin/error', { error: error.message });
    }
});

// Vista de lista de usuarios con enlaces a detalle
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        // Obtener usuarios con conteo de relaciones
        const usuarios = await Usuario.findAndCountAll({
            attributes: [
                'id', 'nombre', 'apellido', 'email', 'rut', 'telefono', 'created_at',
                [sequelize.fn('COUNT', sequelize.col('egresos.id')), 'total_relaciones']
            ],
            include: [
                {
                    model: UsuarioEgreso,
                    as: 'egresos',
                    attributes: [],
                    required: false
                }
            ],
            group: ['Usuario.id'],
            limit,
            offset,
            order: [['created_at', 'DESC']],
            subQuery: false
        });

        const totalPages = Math.ceil(usuarios.count.length / limit);

        res.render('admin/users-list', {
            title: 'Gestión de Usuarios',
            usuarios: usuarios.rows,
            pagination: {
                currentPage: page,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Error obteniendo lista de usuarios:', error);
        res.render('admin/error', { error: error.message });
    }
});

// API para buscar usuarios (autocompletado)
router.get('/api/users/search', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json([]);
        }

        const usuarios = await Usuario.findAll({
            where: {
                [sequelize.Op.or]: [
                    { nombre: { [sequelize.Op.like]: `%${q}%` } },
                    { apellido: { [sequelize.Op.like]: `%${q}%` } },
                    { email: { [sequelize.Op.like]: `%${q}%` } },
                    { rut: { [sequelize.Op.like]: `%${q}%` } }
                ]
            },
            attributes: ['id', 'nombre', 'apellido', 'email', 'rut'],
            limit: 10
        });

        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;