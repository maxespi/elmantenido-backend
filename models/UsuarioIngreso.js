'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class UsuarioIngreso extends Model {
        static associate(models) {
            UsuarioIngreso.belongsTo(models.Usuario, {
                foreignKey: 'id_usuario',
                as: 'usuario'
            });

            UsuarioIngreso.belongsTo(models.Ingreso, {
                foreignKey: 'id_ingreso',
                as: 'ingreso'
            });
        }
    }

    UsuarioIngreso.init({
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
        id_ingreso: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'ingresos',
                key: 'id'
            }
        },
        monto_recibido: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },
        fecha_recibo: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        comentarios: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'UsuarioIngreso',
        tableName: 'usuario_ingresos',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return UsuarioIngreso;
};