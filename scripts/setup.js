require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
    try {
        console.log('🔧 Setting up database...');

        // Crear conexión sin especificar base de datos
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        const databaseName = process.env.DB_NAME || 'gastos_app';

        // Crear base de datos
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
        console.log(`✅ Database '${databaseName}' created/verified`);

        await connection.end();
        console.log('🎉 Database setup completed successfully!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Run: npm run dev');
        console.log('2. The server will auto-create tables on startup');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

setupDatabase();