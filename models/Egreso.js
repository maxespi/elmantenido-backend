'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Egreso extends Model {
        static associate(models) {
            Egreso.hasMany(models.UsuarioEgreso, {
                foreignKey: 'id_egreso',
                as: 'participantes'
            });
        }
    }

    Egreso.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre: {
            type: DataTypes.STRING,
            allowNull: false
        },
        categoria: {
            type: DataTypes.ENUM('alimentacion', 'transporte', 'entretenimiento', 'salud', 'educacion', 'hogar', 'servicios', 'otros'),
            allowNull: false
        },
        monto_total: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        divisa: {
            type: DataTypes.ENUM('CLP', 'USD', 'EUR'),
            defaultValue: 'CLP'
        },
        fecha: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        observaciones: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Egreso',
        tableName: 'egresos',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Egreso;
};