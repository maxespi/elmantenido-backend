require('dotenv').config();
const { Usuario, Egreso, UsuarioEgreso } = require('../models');

async function testCreate() {
    try {
        console.log('🧪 Probando creación de registros...');

        // Crear usuario de prueba
        const testUser = await Usuario.create({
            nombre: 'Test',
            apellido: 'Usuario',
            email: 'test@example.com',
            rut: '12345678-9',
            telefono: '+56912345678',
            password_hash: 'hash_temporal'
        });
        console.log('✅ Usuario creado:', testUser.id);

        // Crear egreso de prueba
        const testEgreso = await Egreso.create({
            nombre: 'Egreso de Prueba',
            categoria: 'alimentacion',
            monto_total: 10000,
            divisa: 'CLP',
            fecha: new Date(),
            observaciones: 'Esto es una prueba'
        });
        console.log('✅ Egreso creado:', testEgreso.id);

        // Crear relación
        const testRelacion = await UsuarioEgreso.create({
            id_usuario: testUser.id,
            id_egreso: testEgreso.id,
            rol: 'pagador',
            estado_pago: 'pagado',
            monto_pagado: 10000,
            fecha_pago: new Date(),
            forma_pago: 'efectivo',
            divisa: 'CLP'
        });
        console.log('✅ Relación creada:', testRelacion.id);

        console.log('🎉 Todas las pruebas pasaron!');
    } catch (error) {
        console.error('❌ Error en prueba:', error);
    }
}

testCreate();