const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

app.set('io', io);

const setupSockets = require('./src/socket');
setupSockets(io);

const themeRoutes = require('./src/routes/themes');
const transactionRoutes = require('./src/routes/transactions');
const queueRoutes = require('./src/routes/queue');
const studioRoutes = require('./src/routes/studio');

app.use('/api/themes', themeRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/studio', studioRoutes);

app.get('/', (req, res) => {
    res.send({ status: 'Photobooth API is running' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
