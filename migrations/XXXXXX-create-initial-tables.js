'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Crear tabla usuarios
        await queryInterface.createTable('usuarios', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            nombre: {
                type: Sequelize.STRING,
                allowNull: false
            },
            apellido: {
                type: Sequelize.STRING,
                allowNull: false
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            rut: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            telefono: {
                type: Sequelize.STRING,
                allowNull: true
            },
            password_hash: {
                type: Sequelize.STRING,
                allowNull: false
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            }
        });

        // Crear tabla egresos
        await queryInterface.createTable('egresos', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            nombre: {
                type: Sequelize.STRING,
                allowNull: false
            },
            categoria: {
                type: Sequelize.ENUM('alimentacion', 'transporte', 'entretenimiento', 'salud', 'educacion', 'hogar', 'servicios', 'otros'),
                allowNull: false
            },
            monto_total: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            divisa: {
                type: Sequelize.ENUM('CLP', 'USD', 'EUR'),
                defaultValue: 'CLP'
            },
            fecha: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            observaciones: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            }
        });

        // Crear tabla usuario_egresos
        await queryInterface.createTable('usuario_egresos', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            id_usuario: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'usuarios',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            id_egreso: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'egresos',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            rol: {
                type: Sequelize.ENUM('pagador', 'deudor'),
                allowNull: false
            },
            estado_pago: {
                type: Sequelize.ENUM('pendiente', 'pagado'),
                defaultValue: 'pendiente'
            },
            monto_pagado: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            fecha_pago: {
                type: Sequelize.DATEONLY,
                allowNull: true
            },
            forma_pago: {
                type: Sequelize.ENUM('efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito'),
                allowNull: false
            },
            entidad_pago: {
                type: Sequelize.STRING,
                allowNull: true
            },
            divisa: {
                type: Sequelize.ENUM('CLP', 'USD', 'EUR'),
                defaultValue: 'CLP'
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            }
        });

        // Agregar índices
        await queryInterface.addIndex('usuario_egresos', ['id_usuario']);
        await queryInterface.addIndex('usuario_egresos', ['id_egreso']);
        await queryInterface.addIndex('usuario_egresos', ['estado_pago']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('usuario_egresos');
        await queryInterface.dropTable('egresos');
        await queryInterface.dropTable('usuarios');
    }
};