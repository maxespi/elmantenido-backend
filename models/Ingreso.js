'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Ingreso extends Model {
        static associate(models) {
            Ingreso.hasMany(models.UsuarioIngreso, {
                foreignKey: 'id_ingreso',
                as: 'relaciones'
            });
        }
    }

    Ingreso.init({
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
            type: DataTypes.ENUM(
                'sueldo',
                'freelance',
                'bonificacion',
                'inversion',
                'venta',
                'prestamo',
                'regalo',
                'otro'
            ),
            allowNull: false
        },
        divisa: {
            type: DataTypes.ENUM('CLP', 'USD', 'EUR'),
            defaultValue: 'CLP'
        },
        es_recurrente: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        observaciones: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Ingreso',
        tableName: 'ingresos',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Ingreso;
};