const express = require('express');
const { Egreso, Usuario, UsuarioEgreso } = require('../models');
const { authenticateToken } = require('./auth');
const { Op } = require('sequelize');
const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /api/egresos/mis-deudas - Obtener deudas pendientes del usuario
router.get('/mis-deudas', async (req, res) => {
    try {
        const userId = req.user.id;

        // ✅ CORREGIDO: Incluir tanto pendientes como confirmadas por deudor
        const deudas = await UsuarioEgreso.findAll({
            where: {
                id_usuario: userId,
                rol: 'deudor',
                estado_pago: {
                    [Op.in]: ['pendiente', 'confirmado_por_deudor'] // ✅ CAMBIO PRINCIPAL
                }
            },
            include: [
                {
                    model: Egreso,
                    as: 'egreso'
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
            data: deudas
        });

    } catch (error) {
        console.error('Error getting debts:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/egresos/cobros-pendientes - Obtener cobros pendientes del usuario
router.get('/cobros-pendientes', async (req, res) => {
    try {
        const userId = req.user.id;

        // Encontrar egresos donde el usuario es pagador
        const misEgresos = await UsuarioEgreso.findAll({
            where: {
                id_usuario: userId,
                rol: 'pagador'
            },
            include: [{
                model: Egreso,
                as: 'egreso'
            }]
        });

        // Para cada egreso, obtener los deudores pendientes o confirmados
        const cobrosPendientes = await Promise.all(
            misEgresos.map(async (egresoRelacion) => {
                const deudores = await UsuarioEgreso.findAll({
                    where: {
                        id_egreso: egresoRelacion.id_egreso,
                        rol: 'deudor',
                        estado_pago: {
                            // ✅ CORREGIDO: Incluir tanto pendientes como confirmados por deudor
                            [Op.in]: ['pendiente', 'confirmado_por_deudor']
                        }
                    },
                    include: [{
                        model: Usuario,
                        as: 'usuario',
                        attributes: ['id', 'nombre', 'apellido', 'rut']
                    }]
                });

                if (deudores.length > 0) {
                    return {
                        egreso: egresoRelacion.egreso,
                        deudores,
                        id_usuario: userId,
                        id_egreso: egresoRelacion.id_egreso
                    };
                }
                return null;
            })
        );

        // Filtrar los null
        const cobrosConDeudores = cobrosPendientes.filter(cobro => cobro !== null);

        res.json({
            success: true,
            data: cobrosConDeudores
        });

    } catch (error) {
        console.error('Error getting pending charges:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/egresos/mis-pagos - Obtener egresos donde el usuario es pagador
router.get('/mis-pagos', async (req, res) => {
    try {
        const userId = req.user.id;

        const misPagos = await UsuarioEgreso.findAll({
            where: {
                id_usuario: userId,
                rol: 'pagador'
            },
            include: [
                {
                    model: Egreso,
                    as: 'egreso'
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
            data: misPagos
        });

    } catch (error) {
        console.error('Error getting payments:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/egresos/estadisticas - Obtener estadísticas del usuario
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
            totalGastado,
            totalDeudas,
            totalPorCobrar,
            balanceNeto: totalPorCobrar - totalDeudas,
            cantidadEgresos,
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

// GET /api/egresos/historial-deudas - Obtener historial completo de deudas
router.get('/historial-deudas', async (req, res) => {
    try {
        const userId = req.user.id;

        const historialDeudas = await UsuarioEgreso.findAll({
            where: {
                id_usuario: userId,
                rol: 'deudor'
                // Sin filtro de estado - obtener TODAS
            },
            include: [
                {
                    model: Egreso,
                    as: 'egreso'
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nombre', 'apellido', 'rut']
                }
            ],
            order: [['updated_at', 'DESC'], ['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: historialDeudas
        });

    } catch (error) {
        console.error('Error getting debt history:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/egresos/historial-cobros - Obtener historial completo de cobros
router.get('/historial-cobros', async (req, res) => {
    try {
        const userId = req.user.id;

        // Obtener egresos donde el usuario es pagador
        const misEgresos = await UsuarioEgreso.findAll({
            where: {
                id_usuario: userId,
                rol: 'pagador'
            },
            include: [{
                model: Egreso,
                as: 'egreso'
            }]
        });

        // Para cada egreso, obtener TODOS los deudores (sin filtrar por estado)
        const historialCobros = await Promise.all(
            misEgresos.map(async (egresoRelacion) => {
                const deudores = await UsuarioEgreso.findAll({
                    where: {
                        id_egreso: egresoRelacion.id_egreso,
                        rol: 'deudor'
                        // Sin filtro de estado
                    },
                    include: [{
                        model: Usuario,
                        as: 'usuario',
                        attributes: ['id', 'nombre', 'apellido', 'rut']
                    }],
                    order: [['updated_at', 'DESC']]
                });

                return {
                    egreso: egresoRelacion.egreso,
                    deudores,
                    id_usuario: userId,
                    id_egreso: egresoRelacion.id_egreso
                };
            })
        );

        res.json({
            success: true,
            data: historialCobros
        });

    } catch (error) {
        console.error('Error getting charges history:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/egresos/:id/marcar-recibido-directo - Pagador marca pago como recibido directamente
router.put('/:id/marcar-recibido-directo', async (req, res) => {
    try {
        const { id } = req.params;
        const { id_usuario } = req.body; // ID del deudor
        const currentUserId = req.user.id;

        // Verificar que el usuario actual es el pagador de este egreso
        const pagador = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                id_usuario: currentUserId,
                rol: 'pagador'
            }
        });

        if (!pagador) {
            return res.status(403).json({
                success: false,
                message: 'Solo el pagador puede marcar pagos como recibidos'
            });
        }

        // Buscar la deuda
        const deuda = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                id_usuario: id_usuario,
                rol: 'deudor'
            }
        });

        if (!deuda) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró la deuda especificada'
            });
        }

        // ✅ MARCAR directamente como pagado
        await deuda.update({
            estado_pago: 'pagado',
            fecha_pago: new Date().toISOString().split('T')[0]
        });

        // ✅ CREAR ingreso automático
        try {
            const { Ingreso, UsuarioIngreso } = require('../models');
            const egreso = await Egreso.findByPk(id);
            const deudor = await Usuario.findByPk(id_usuario);

            if (egreso && deudor) {
                // Crear ingreso
                const nuevoIngreso = await Ingreso.create({
                    nombre: `Pago recibido: ${egreso.nombre}`,
                    categoria: 'reembolso',
                    divisa: egreso.divisa,
                    es_recurrente: false,
                    observaciones: `Pago marcado como recibido de ${deudor.nombre} ${deudor.apellido} por el egreso "${egreso.nombre}"`
                });

                // Crear relación usuario-ingreso para el pagador
                await UsuarioIngreso.create({
                    id_usuario: currentUserId,
                    id_ingreso: nuevoIngreso.id,
                    monto_recibido: parseFloat(deuda.monto_pagado),
                    fecha_recibo: new Date().toISOString().split('T')[0],
                    comentarios: `Pago directo de ${deudor.nombre} ${deudor.apellido}`
                });

                console.log('✅ Ingreso automático creado para pago directo');
            }
        } catch (ingresoError) {
            console.error('Error creating automatic income:', ingresoError);
            // No fallar si no se puede crear el ingreso
        }

        res.json({
            success: true,
            message: 'Pago marcado como recibido exitosamente',
            data: {
                egreso: await Egreso.findByPk(id),
                usuarioEgreso: deuda
            }
        });

    } catch (error) {
        console.error('Error marking direct payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/egresos/:id/cambiar-estado - Cambiar estado de pago
router.put('/:id/cambiar-estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { id_usuario, nuevo_estado, es_deudor } = req.body;
        const currentUserId = req.user.id;

        // Validar estados permitidos
        const estadosPermitidos = ['pendiente', 'confirmado_por_deudor', 'pagado'];
        if (!estadosPermitidos.includes(nuevo_estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido'
            });
        }

        // Verificar permisos: solo el pagador puede cambiar estados de deudores
        // o el deudor puede cambiar su propio estado
        let relacionUsuario;

        if (es_deudor && id_usuario === currentUserId) {
            // El deudor está cambiando su propio estado
            relacionUsuario = await UsuarioEgreso.findOne({
                where: {
                    id_egreso: id,
                    id_usuario: currentUserId,
                    rol: 'deudor'
                }
            });
        } else {
            // Verificar que el usuario actual sea el pagador
            const esPagador = await UsuarioEgreso.findOne({
                where: {
                    id_egreso: id,
                    id_usuario: currentUserId,
                    rol: 'pagador'
                }
            });

            if (!esPagador) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para cambiar este estado'
                });
            }

            // Buscar la relación del deudor
            relacionUsuario = await UsuarioEgreso.findOne({
                where: {
                    id_egreso: id,
                    id_usuario: id_usuario,
                    rol: 'deudor'
                }
            });
        }

        if (!relacionUsuario) {
            return res.status(404).json({
                success: false,
                message: 'Relación usuario-egreso no encontrada'
            });
        }

        // Actualizar estado y fechas
        const updateData = {
            estado_pago: nuevo_estado
        };

        if (nuevo_estado === 'pagado') {
            updateData.fecha_pago = new Date().toISOString().split('T')[0];
        } else if (nuevo_estado === 'confirmado_por_deudor') {
            updateData.fecha_confirmacion_deudor = new Date().toISOString().split('T')[0];
            updateData.fecha_pago = null;
        } else if (nuevo_estado === 'pendiente') {
            updateData.fecha_pago = null;
            updateData.fecha_confirmacion_deudor = null;
        }

        await relacionUsuario.update(updateData);

        res.json({
            success: true,
            message: `Estado cambiado a: ${nuevo_estado}`,
            data: relacionUsuario
        });

    } catch (error) {
        console.error('Error changing payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/egresos/:id/confirmar-deuda - Deudor confirma que pagó
router.put('/:id/confirmar-deuda', async (req, res) => {
    try {
        const { id } = req.params;
        const { id_usuario } = req.body;
        const currentUserId = req.user.id;

        // Verificar que el usuario actual es quien está confirmando
        if (id_usuario && id_usuario !== currentUserId) {
            return res.status(403).json({
                success: false,
                message: 'Solo puedes confirmar tus propias deudas'
            });
        }

        // Buscar la relación usuario-egreso donde el usuario es deudor
        const usuarioEgreso = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                id_usuario: currentUserId,
                rol: 'deudor',
                estado_pago: 'pendiente'
            }
        });

        if (!usuarioEgreso) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró una deuda pendiente para este egreso'
            });
        }

        // ✅ CAMBIO: Solo confirmar por deudor, NO marcar como pagado
        await usuarioEgreso.update({
            estado_pago: 'confirmado_por_deudor',
            fecha_confirmacion_deudor: new Date().toISOString().split('T')[0]
        });

        // Obtener información del egreso para la respuesta
        const egreso = await Egreso.findByPk(id);

        res.json({
            success: true,
            message: 'Pago confirmado por deudor. Esperando confirmación del pagador.',
            data: {
                egreso,
                usuarioEgreso
            }
        });

    } catch (error) {
        console.error('Error confirming debt by debtor:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/egresos/:id/confirmar-recepcion - Pagador confirma que recibió el pago
router.put('/:id/confirmar-recepcion', async (req, res) => {
    try {
        const { id } = req.params;
        const { id_usuario } = req.body; // ID del deudor que pagó
        const currentUserId = req.user.id;

        // Verificar que el usuario actual es el pagador de este egreso
        const pagador = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                id_usuario: currentUserId,
                rol: 'pagador'
            }
        });

        if (!pagador) {
            return res.status(403).json({
                success: false,
                message: 'Solo el pagador puede confirmar la recepción del pago'
            });
        }

        // Buscar la deuda que fue confirmada por el deudor
        const deudaConfirmada = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                id_usuario: id_usuario,
                rol: 'deudor',
                estado_pago: 'confirmado_por_deudor'
            }
        });

        if (!deudaConfirmada) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró una deuda confirmada por el deudor'
            });
        }

        // ✅ AHORA SÍ marcar como pagado definitivamente
        await deudaConfirmada.update({
            estado_pago: 'pagado',
            fecha_pago: new Date().toISOString().split('T')[0]
        });

        // ✅ OPCIONAL: Crear ingreso automático
        try {
            const { Ingreso, UsuarioIngreso } = require('../models');
            const egreso = await Egreso.findByPk(id);
            const deudor = await Usuario.findByPk(id_usuario);

            if (egreso && deudor) {
                // Crear ingreso
                const nuevoIngreso = await Ingreso.create({
                    nombre: `Pago recibido: ${egreso.nombre}`,
                    categoria: 'reembolso',
                    divisa: egreso.divisa,
                    es_recurrente: false,
                    observaciones: `Pago recibido de ${deudor.nombre} ${deudor.apellido} por el egreso "${egreso.nombre}"`
                });

                // Crear relación usuario-ingreso para el pagador
                await UsuarioIngreso.create({
                    id_usuario: currentUserId,
                    id_ingreso: nuevoIngreso.id,
                    monto_recibido: parseFloat(deudaConfirmada.monto_pagado),
                    fecha_recibo: new Date().toISOString().split('T')[0],
                    comentarios: `Reembolso de ${deudor.nombre} ${deudor.apellido}`
                });

                console.log('✅ Ingreso automático creado para el pagador');
            }
        } catch (ingresoError) {
            console.error('Error creating automatic income:', ingresoError);
            // No fallar si no se puede crear el ingreso
        }

        res.json({
            success: true,
            message: 'Pago confirmado exitosamente por el pagador',
            data: {
                egreso: await Egreso.findByPk(id),
                usuarioEgreso: deudaConfirmada
            }
        });

    } catch (error) {
        console.error('Error confirming payment reception:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/egresos/:id/cancelar-recepcion - Cancelar confirmación de recepción
router.put('/:id/cancelar-recepcion', async (req, res) => {
    try {
        const { id } = req.params;
        const { id_usuario } = req.body; // ID del deudor
        const currentUserId = req.user.id;

        // Verificar que el usuario actual es el pagador
        const pagador = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                id_usuario: currentUserId,
                rol: 'pagador'
            }
        });

        if (!pagador) {
            return res.status(403).json({
                success: false,
                message: 'Solo el pagador puede cancelar la recepción'
            });
        }

        // Buscar la deuda pagada
        const deudaPagada = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                id_usuario: id_usuario,
                rol: 'deudor',
                estado_pago: 'pagado'
            }
        });

        if (!deudaPagada) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró un pago confirmado para cancelar'
            });
        }

        // Revertir a confirmado por deudor
        await deudaPagada.update({
            estado_pago: 'confirmado_por_deudor',
            fecha_pago: null
        });

        // ✅ OPCIONAL: Eliminar el ingreso automático si existe
        try {
            const { UsuarioIngreso } = require('../models');
            const egreso = await Egreso.findByPk(id);

            if (egreso) {
                await UsuarioIngreso.destroy({
                    where: {
                        id_usuario: currentUserId,
                        comentarios: {
                            [Op.like]: `%Reembolso de%${deudaPagada.id_usuario}%`
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error removing automatic income:', error);
        }

        res.json({
            success: true,
            message: 'Recepción cancelada. El pago vuelve a estar pendiente de confirmación.',
            data: deudaPagada
        });

    } catch (error) {
        console.error('Error canceling payment reception:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/egresos/:id/pagar - Marcar deuda como pagada
router.put('/:id/pagar', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Buscar la relación usuario-egreso donde el usuario es deudor
        const usuarioEgreso = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                id_usuario: userId,
                rol: 'deudor',
                estado_pago: 'pendiente'
            }
        });

        if (!usuarioEgreso) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró una deuda pendiente para este egreso'
            });
        }

        // Actualizar el estado a pagado
        await usuarioEgreso.update({
            estado_pago: 'pagado',
            fecha_pago: new Date().toISOString().split('T')[0]
        });

        // Obtener información del egreso para la respuesta
        const egreso = await Egreso.findByPk(id);

        res.json({
            success: true,
            message: 'Deuda marcada como pagada exitosamente',
            data: {
                egreso,
                usuarioEgreso
            }
        });

    } catch (error) {
        console.error('Error marking debt as paid:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/egresos/:id/remind - Enviar recordatorio de pago (placeholder)
router.post('/:id/remind', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { usuarioId } = req.body;

        // Verificar que el usuario sea el pagador
        const usuarioEgreso = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                id_usuario: userId,
                rol: 'pagador'
            }
        });

        if (!usuarioEgreso) {
            return res.status(403).json({
                success: false,
                message: 'Solo el pagador puede enviar recordatorios'
            });
        }

        // Verificar que existe la deuda pendiente
        const deuda = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                id_usuario: usuarioId,
                rol: 'deudor',
                estado_pago: 'pendiente'
            }
        });

        if (!deuda) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró deuda pendiente para este usuario'
            });
        }

        // Aquí podrías implementar el envío de notificación push, email, etc.
        // Por ahora solo respondemos exitosamente

        res.json({
            success: true,
            message: 'Recordatorio enviado exitosamente'
        });

    } catch (error) {
        console.error('Error sending reminder:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});



// GET /api/egresos/:id - Obtener egreso específico
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verificar que el usuario tenga acceso a este egreso
        const usuarioEgreso = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                id_usuario: userId
            }
        });

        if (!usuarioEgreso) {
            return res.status(403).json({
                success: false,
                message: 'No tienes acceso a este egreso'
            });
        }

        // Obtener el egreso con todos los participantes
        const egreso = await Egreso.findByPk(id);
        if (!egreso) {
            return res.status(404).json({
                success: false,
                message: 'Egreso no encontrado'
            });
        }

        const participantes = await UsuarioEgreso.findAll({
            where: { id_egreso: id },
            include: [{
                model: Usuario,
                as: 'usuario',
                attributes: ['id', 'nombre', 'apellido', 'rut']
            }],
            order: [['rol', 'DESC'], ['created_at', 'ASC']] // Pagadores primero, luego por fecha
        });

        res.json({
            success: true,
            data: {
                egreso,
                participantes
            }
        });

    } catch (error) {
        console.error('Error getting egreso:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/egresos/:id - Actualizar egreso
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const {
            nombre,
            categoria,
            monto_total,
            divisa,
            fecha,
            forma_pago,
            entidad_pago,
            observaciones,
            participantes = []
        } = req.body;

        console.log('📝 Actualizando egreso:', { id, userId, reqBody: req.body });

        // Verificar que el usuario sea el pagador de este egreso
        const usuarioEgreso = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                id_usuario: userId,
                rol: 'pagador'
            }
        });

        if (!usuarioEgreso) {
            return res.status(403).json({
                success: false,
                message: 'Solo el pagador puede actualizar este egreso'
            });
        }

        // Actualizar el egreso
        const egreso = await Egreso.findByPk(id);
        if (!egreso) {
            return res.status(404).json({
                success: false,
                message: 'Egreso no encontrado'
            });
        }

        // Actualizar campos del egreso
        await egreso.update({
            nombre: nombre || egreso.nombre,
            categoria: categoria || egreso.categoria,
            monto_total: monto_total ? parseFloat(monto_total) : egreso.monto_total,
            divisa: divisa || egreso.divisa,
            fecha: fecha || egreso.fecha,
            observaciones: observaciones !== undefined ? observaciones : egreso.observaciones
        });

        // ✅ NUEVO: Actualizar participantes si se proporcionan
        if (participantes && Array.isArray(participantes)) {
            console.log('🔄 Actualizando participantes:', participantes);

            // Eliminar participantes existentes (solo deudores, mantener pagador)
            await UsuarioEgreso.destroy({
                where: {
                    id_egreso: id,
                    rol: 'deudor'
                }
            });

            // Actualizar datos del pagador principal
            await usuarioEgreso.update({
                monto_pagado: parseFloat(monto_total),
                fecha_pago: fecha || usuarioEgreso.fecha_pago,
                forma_pago: forma_pago || usuarioEgreso.forma_pago,
                entidad_pago: entidad_pago || usuarioEgreso.entidad_pago,
                divisa: divisa || usuarioEgreso.divisa
            });

            // Crear nuevos participantes
            for (const participante of participantes) {
                console.log('👤 Creando participante:', participante);

                await UsuarioEgreso.create({
                    id_usuario: participante.id_usuario,
                    id_egreso: id,
                    rol: participante.rol || 'deudor',
                    estado_pago: participante.estado_pago || 'pendiente',
                    monto_pagado: parseFloat(participante.monto_asignado || 0),
                    fecha_pago: participante.estado_pago === 'pagado' ?
                        (participante.fecha_pago || fecha) : null,
                    forma_pago: participante.forma_pago || 'efectivo',
                    entidad_pago: participante.entidad_pago || '',
                    divisa: divisa || egreso.divisa
                });
            }
        }

        // Obtener el egreso actualizado con participantes
        const egresoActualizado = await Egreso.findByPk(id);
        const participantesActualizados = await UsuarioEgreso.findAll({
            where: { id_egreso: id },
            include: [{
                model: Usuario,
                as: 'usuario',
                attributes: ['id', 'nombre', 'apellido', 'rut']
            }]
        });

        console.log('✅ Egreso actualizado exitosamente');

        res.json({
            success: true,
            message: 'Egreso actualizado exitosamente',
            data: {
                egreso: egresoActualizado,
                participantes: participantesActualizados
            }
        });

    } catch (error) {
        console.error('❌ Error updating egreso:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor: ' + error.message
        });
    }
});

// DELETE /api/egresos/:id - Eliminar egreso
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verificar que el usuario sea el pagador de este egreso
        const usuarioEgreso = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                id_usuario: userId,
                rol: 'pagador'
            }
        });

        if (!usuarioEgreso) {
            return res.status(403).json({
                success: false,
                message: 'Solo el pagador puede eliminar este egreso'
            });
        }

        // Verificar si hay pagos realizados
        const pagosRealizados = await UsuarioEgreso.findOne({
            where: {
                id_egreso: id,
                rol: 'deudor',
                estado_pago: 'pagado'
            }
        });

        if (pagosRealizados) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar un egreso que ya tiene pagos realizados'
            });
        }

        // Eliminar todas las relaciones usuario-egreso
        await UsuarioEgreso.destroy({
            where: { id_egreso: id }
        });

        // Eliminar el egreso
        await Egreso.destroy({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Egreso eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error deleting egreso:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/egresos - Obtener todos los egresos del usuario
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;

        // Obtener todas las relaciones usuario-egreso donde participa el usuario
        const usuarioEgresos = await UsuarioEgreso.findAll({
            where: { id_usuario: userId },
            include: [
                {
                    model: Egreso,
                    as: 'egreso'
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nombre', 'apellido', 'rut']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Obtener información completa de participantes para cada egreso
        const egresosConParticipantes = await Promise.all(
            usuarioEgresos.map(async (ue) => {
                const participantes = await UsuarioEgreso.findAll({
                    where: { id_egreso: ue.id_egreso },
                    include: [{
                        model: Usuario,
                        as: 'usuario',
                        attributes: ['id', 'nombre', 'apellido', 'rut']
                    }]
                });

                return {
                    ...ue.toJSON(),
                    participantes
                };
            })
        );

        res.json({
            success: true,
            data: egresosConParticipantes
        });

    } catch (error) {
        console.error('Error getting egresos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/egresos - Crear nuevo egreso
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            nombre,
            categoria,
            fecha,
            monto_total,
            divisa,
            forma_pago,
            entidad_pago,
            imagen_comprobante,
            participantes = []
        } = req.body;

        // Validar datos requeridos
        if (!nombre || !monto_total || monto_total <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Nombre y monto total son requeridos'
            });
        }

        // Crear el egreso
        const nuevoEgreso = await Egreso.create({
            nombre: nombre.trim(),
            categoria: categoria || 'otro',
            fecha: fecha || new Date().toISOString().split('T')[0],
            monto_total: parseFloat(monto_total),
            divisa: divisa || 'CLP',
            imagen_comprobante: imagen_comprobante || null
        });

        // Crear relación como pagador para el creador
        await UsuarioEgreso.create({
            id_usuario: userId,
            id_egreso: nuevoEgreso.id,
            rol: 'pagador',
            estado_pago: 'pagado',
            monto_pagado: nuevoEgreso.monto_total,
            fecha_pago: new Date().toISOString().split('T')[0],
            forma_pago: forma_pago || 'efectivo',
            entidad_pago: entidad_pago || '',
            divisa: nuevoEgreso.divisa
        });

        // Crear relaciones para participantes (deudores)
        if (participantes && participantes.length > 0) {
            const relacionesParticipantes = participantes.map(participante => ({
                id_usuario: participante.id_usuario,
                id_egreso: nuevoEgreso.id,
                rol: participante.rol || 'deudor',
                estado_pago: 'pendiente',
                monto_pagado: parseFloat(participante.monto_asignado || 0),
                fecha_pago: null,
                forma_pago: 'efectivo',
                entidad_pago: '',
                divisa: nuevoEgreso.divisa
            }));

            await UsuarioEgreso.bulkCreate(relacionesParticipantes);
        }

        // Obtener el egreso creado con participantes
        const egresoCompleto = await Egreso.findByPk(nuevoEgreso.id);
        const participantesCreados = await UsuarioEgreso.findAll({
            where: { id_egreso: nuevoEgreso.id },
            include: [{
                model: Usuario,
                as: 'usuario',
                attributes: ['id', 'nombre', 'apellido', 'rut']
            }]
        });

        res.status(201).json({
            success: true,
            message: 'Egreso creado exitosamente',
            data: {
                egreso: egresoCompleto,
                participantes: participantesCreados
            }
        });

    } catch (error) {
        console.error('Error creating egreso:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;