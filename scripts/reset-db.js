require('dotenv').config();
const mysql = require('mysql2/promise');

async function resetDatabase() {
    try {
        console.log('⚠️  WARNING: This will DELETE ALL DATA!');
        console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');

        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('🗑️  Resetting database...');

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        const databaseName = process.env.DB_NAME || 'gastos_app';

        // Eliminar y recrear base de datos
        await connection.execute(`DROP DATABASE IF EXISTS \`${databaseName}\``);
        await connection.execute(`CREATE DATABASE \`${databaseName}\``);
        console.log(`✅ Database '${databaseName}' reset successfully`);

        await connection.end();
        console.log('🎉 Database reset completed!');
        console.log('Run: npm run dev to recreate tables');

    } catch (error) {
        console.error('❌ Reset failed:', error.message);
        process.exit(1);
    }
}

resetDatabase();