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

// ── CORS origin function ────────────────────────────────
const corsOriginFn = (origin, callback) => {
  if (env.NODE_ENV === 'production' && env.FRONTEND_URLS && env.FRONTEND_URLS.length > 0) {
    if (!origin || env.FRONTEND_URLS.includes(origin)) {
      callback(null, origin || true);
    } else {
      callback(null, origin); // permissive — allow all in case of misconfiguration
    }
  } else {
    callback(null, origin || true);
  }
};

// ── Socket.io — polling only (Vercel serverless compatible) ──
const io = new Server(server, {
  transports: ['polling'],
  cors: {
    origin: corsOriginFn,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  },
});

// ── Health check (top for diagnostics) ─────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'Live',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Request logger
app.use((req, res, next) => {
  if (req.url !== '/health') {
    console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// ── CORS ───────────────────────────────────────────────
app.use(cors({
  origin: corsOriginFn,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// ── Middleware ──────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// Make io available to controllers
app.set('io', io);

// ── Socket.io ──────────────────────────────────────────
setupSocket(io);

// ── Routes ─────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/themes', require('./routes/themes'));
app.use('/api/studio', require('./routes/studio'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/users', require('./routes/users'));

app.get('/', (req, res) => {
  res.json({ status: 'Jjikgo Photobooth API is running ✨', version: '2.0.0' });
});

// ── Error handler ──────────────────────────────────────
app.use(errorHandler);

// ── Start (only when run directly, not when imported by Vercel) ──
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

if (require.main === module) {
  const HOST = '0.0.0.0';
  server.listen(env.PORT, HOST, () => {
    console.log(`\n---------------------------------------------------`);
    console.log(`🚀 Jjikgo API running on ${HOST}:${env.PORT}`);
    console.log(`🌐 Environment: ${env.NODE_ENV}`);
    console.log(`📡 Socket.io: READY (polling only)`);
    console.log(`📡 Database: ${env.DATABASE_URL ? 'URL configured' : '⚠️  MISSING'}`);
    console.log(`---------------------------------------------------\n`);
  });
}

module.exports = app;
