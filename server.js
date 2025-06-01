require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const path = require('path');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/egresos', require('./routes/egresos'));

// Routes Admin Panel
app.use('/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Redirect root to admin
app.get('/', (req, res) => {
    res.redirect('/admin');
});

// Función para crear la base de datos si no existe
async function createDatabaseIfNotExists() {
    try {
        // Conexión a MySQL sin especificar la base de datos
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        const databaseName = process.env.DB_NAME || 'gastos_app';

        // Crear la base de datos si no existe
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
        console.log(`✅ Database '${databaseName}' verified/created successfully`);

        await connection.end();
    } catch (error) {
        console.error('❌ Error creating database:', error);
        throw error;
    }
}

// Función para sincronizar modelos y crear tablas
async function syncDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        // Sincronizar modelos (crear tablas si no existen)
        await sequelize.sync({
            force: false, // No eliminar tablas existentes
            alter: true   // Actualizar estructura si hay cambios
        });
        console.log('✅ All models synchronized successfully.');

    } catch (error) {
        console.error('❌ Unable to sync database:', error);
        throw error;
    }
}

// Función para crear datos iniciales (opcional)
async function createInitialData() {
    try {
        const { Usuario } = require('./models');

        // Verificar si ya hay usuarios
        const userCount = await Usuario.count();

        if (userCount === 0) {
            console.log('📝 Creating initial admin user...');
            const bcrypt = require('bcryptjs');

            await Usuario.create({
                nombre: 'Admin',
                apellido: 'Sistema',
                email: 'admin@gastos.com',
                rut: '11111111-1',
                telefono: '+56912345678',
                password_hash: await bcrypt.hash('admin123', 10)
            });

            console.log('✅ Initial admin user created (admin@gastos.com / admin123)');
        }
    } catch (error) {
        console.error('❌ Error creating initial data:', error);
        // No lanzar error aquí, es opcional
    }
}

// Inicializar servidor con configuración automática
async function startServer() {
    try {
        console.log('🚀 Starting server initialization...');

        // Paso 1: Crear base de datos
        await createDatabaseIfNotExists();

        // Paso 2: Sincronizar modelos
        await syncDatabase();

        // Paso 3: Crear datos iniciales (opcional)
        await createInitialData();

        // Paso 4: Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🎉 Server running on port ${PORT}`);
            console.log(`📱 API available at: http://localhost:${PORT}/api`);
            console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🔗 Admin panel: http://localhost:${PORT}/admin`);
        });

    } catch (error) {
        console.error('💥 Failed to start server:', error);
        process.exit(1);
    }
}

startServer();