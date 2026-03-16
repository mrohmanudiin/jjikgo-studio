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
// ── CORS: Allow all origins (required for Railway + Vercel cross-origin) ──
const corsOptions = {
    origin: (origin, callback) => {
        // Allow all origins — frontend is on Vercel, backend on Railway
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    }
});

// ── Middleware ──────────────────────────────────────────
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight for all routes
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
async function startServer() {
    // Try to push the database schema before starting
    try {
        const { execSync } = require('child_process');
        console.log('📦 Pushing database schema...');
        execSync('npx drizzle-kit push --force', { stdio: 'inherit' });
        console.log('✅ Database schema is up to date.');
    } catch (err) {
        console.warn('⚠️  db:push failed (schema may already be up to date):', err.message);
    }

    server.listen(env.PORT, () => {
        console.log(`\n---------------------------------------------------`);
        console.log(`🚀 Jjikgo API is running on port ${env.PORT}`);
        console.log(`🌐 Environment: ${env.NODE_ENV}`);
        console.log(`📡 Socket.io: READY`);
        console.log(`---------------------------------------------------\n`);
    });
}

startServer();
