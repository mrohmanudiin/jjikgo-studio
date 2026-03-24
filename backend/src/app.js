console.log('--- JJIKGO BACKEND BOOTING ---');
console.log('Node Version:', process.version);
console.log('Time:', new Date().toISOString());

const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const env = require('./config/env');
const { setupSocket } = require('./socket');
const { errorHandler } = require('./middleware/error');

const app = express();
const server = http.createServer(app);

// ── Health check (Top for Diagnostics) ─────────────────
app.get('/health', (req, res) => {
    console.log('💚 Health check ping received at:', new Date().toISOString());
    res.json({ 
        status: 'Live', 
        uptime: process.uptime(),
        timestamp: new Date().toISOString() 
    });
});

// Simple request logger to see if traffic hits the app
app.use((req, res, next) => {
    if (req.url !== '/health') {
        console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
});

// ── CORS ───────────────────────────────────────────────
const corsOptions = {
    origin: function (origin, callback) {
        // Always allow — sets Access-Control-Allow-Origin to the exact requesting origin
        callback(null, origin || true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
};

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            callback(null, origin || true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }
});

// ── Middleware ──────────────────────────────────────────
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Make io available to controllers
app.set('io', io);

// ── Socket.io ──────────────────────────────────────────
setupSocket(io);

// ── Routes ─────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const branchRoutes = require('./routes/branches');
const transactionRoutes = require('./routes/transactions');
const queueRoutes = require('./routes/queue');
const themeRoutes = require('./routes/themes');
const studioRoutes = require('./routes/studio');
const shiftRoutes = require('./routes/shifts');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/studio', studioRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/users', userRoutes);

// ── Health check ───────────────────────────────────────
app.get('/', (req, res) => {
    res.send({ status: 'Jjikgo Photobooth API is running ✨', version: '2.0.0' });
});

// ── Error handler ──────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────
console.log('🏁 Starting Jjikgo API boot sequence...');

// Handle uncaught errors to prevent silent crashes
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});

async function startServer() {
    try {
        const HOST = '0.0.0.0'; 
        server.listen(env.PORT, HOST, () => {
            console.log(`\n---------------------------------------------------`);
            console.log(`🚀 Jjikgo API is running on ${HOST}:${env.PORT}`);
            console.log(`🌐 Environment: ${env.NODE_ENV}`);
            console.log(`📡 Socket.io: READY`);
            console.log(`📡 Database: ${env.DATABASE_URL ? 'URL configured' : '⚠️  MISSING'}`);
            console.log(`---------------------------------------------------\n`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
