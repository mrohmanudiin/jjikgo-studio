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
// ── Dynamic CORS origin (allows any localhost in dev + Railway/Vercel in prod) ──
const corsOriginFn = (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Normalize origin: remove trailing slash if present
    const cleanOrigin = origin.replace(/\/$/, '');

    // Allow any localhost/127.0.0.1 port
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) return callback(null, true);
    
    // Allow all Railway/Vercel domains and subdomains
    if (cleanOrigin.endsWith('.up.railway.app') || cleanOrigin.endsWith('.vercel.app')) {
        return callback(null, true);
    }
    
    // Allow explicit production origins from env var
    if (env.FRONTEND_URLS && env.FRONTEND_URLS.some(u => u.replace(/\/$/, '') === cleanOrigin)) {
        return callback(null, true);
    }
    
    console.warn('CORS blocked origin:', origin);
    callback(new Error(`CORS blocked: ${origin}`));
};

const io = new Server(server, {
    cors: {
        origin: corsOriginFn,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
    }
});

// ── Middleware ──────────────────────────────────────────
app.use(cors({
    origin: corsOriginFn,
    credentials: true,
}));
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
server.listen(env.PORT, () => {
    console.log(`\n---------------------------------------------------`);
    console.log(`🚀 Jjikgo API is running on port ${env.PORT}`);
    console.log(`🌐 Environment: ${env.NODE_ENV}`);
    console.log(`🔗 Backend URL: https://backend-production-d3fc.up.railway.app`);
    console.log(`📡 Socket.io: READY`);
    console.log(`📜 Allowed Origins: ${env.FRONTEND_URLS.join(', ')}`);
    console.log(`---------------------------------------------------\n`);
});
