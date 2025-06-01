require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkConnection() {
    try {
        console.log('🔍 Checking MySQL connection...');
        console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`Port: ${process.env.DB_PORT || 3306}`);
        console.log(`User: ${process.env.DB_USER || 'root'}`);
        console.log(`Database: ${process.env.DB_NAME || 'gastos_app'}`);
        console.log('');

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('✅ MySQL connection successful!');

        const [rows] = await connection.execute('SELECT VERSION() as version');
        console.log(`📊 MySQL Version: ${rows[0].version}`);

        // Verificar si la base de datos existe (sin usar parámetros preparados)
        const dbName = process.env.DB_NAME || 'gastos_app';
        const [databases] = await connection.execute(`SHOW DATABASES LIKE '${dbName}'`);

        if (databases.length > 0) {
            console.log(`✅ Database '${dbName}' exists`);

            // Conectar a la base de datos específica para verificar tablas
            await connection.execute(`USE \`${dbName}\``);
            const [tables] = await connection.execute('SHOW TABLES');

            if (tables.length > 0) {
                console.log(`📋 Found ${tables.length} table(s) in database:`);
                tables.forEach(table => {
                    console.log(`   - ${Object.values(table)[0]}`);
                });
            } else {
                console.log(`📋 Database '${dbName}' is empty (no tables found)`);
            }
        } else {
            console.log(`⚠️  Database '${dbName}' does not exist (will be created automatically)`);
        }

        await connection.end();
        console.log('🎉 Connection check completed successfully!');

    } catch (error) {
        console.error('❌ MySQL connection failed:');
        console.error(`   Error: ${error.message}`);
        console.log('');
        console.log('💡 Troubleshooting:');
        console.log('   1. Make sure MySQL server is running');
        console.log('   2. Check credentials in .env file');
        console.log('   3. Verify host and port are accessible');
        console.log('   4. Ensure MySQL user has proper permissions');
        console.log('');
        console.log('🔧 Common solutions:');
        console.log('   - Start MySQL: net start mysql (Windows) or brew services start mysql (Mac)');
        console.log('   - Check MySQL status: SHOW PROCESSLIST; in MySQL client');
        console.log('   - Grant permissions: GRANT ALL PRIVILEGES ON *.* TO "root"@"localhost";');
        console.log('');
        console.log('📝 Current .env settings:');
        console.log(`   DB_HOST=${process.env.DB_HOST || 'localhost'}`);
        console.log(`   DB_PORT=${process.env.DB_PORT || 3306}`);
        console.log(`   DB_USER=${process.env.DB_USER || 'root'}`);
        console.log(`   DB_NAME=${process.env.DB_NAME || 'gastos_app'}`);
    }
}

checkConnection();