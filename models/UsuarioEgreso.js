'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class UsuarioEgreso extends Model {
        static associate(models) {
            UsuarioEgreso.belongsTo(models.Usuario, {
                foreignKey: 'id_usuario',
                as: 'usuario'
            });

            UsuarioEgreso.belongsTo(models.Egreso, {
                foreignKey: 'id_egreso',
                as: 'egreso'
            });
        }
    }

    UsuarioEgreso.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_usuario: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'usuarios',
                key: 'id'
            }
        },
        id_egreso: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'egresos',
                key: 'id'
            }
        },
        rol: {
            type: DataTypes.ENUM('pagador', 'deudor'),
            allowNull: false
        },
        estado_pago: {
            type: DataTypes.ENUM('pendiente', 'confirmado_por_deudor', 'pagado'), // ✅ AGREGAR 'confirmado_por_deudor'
            defaultValue: 'pendiente'
        },
        monto_pagado: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        fecha_pago: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        fecha_confirmacion_deudor: {  // ✅ NUEVO CAMPO
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        forma_pago: {
            type: DataTypes.ENUM('efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito'),
            allowNull: false
        },
        entidad_pago: {
            type: DataTypes.STRING,
            allowNull: true
        },
        divisa: {
            type: DataTypes.ENUM('CLP', 'USD', 'EUR'),
            defaultValue: 'CLP'
        }
    }, {
        sequelize,
        modelName: 'UsuarioEgreso',
        tableName: 'usuario_egresos',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return UsuarioEgreso;
};