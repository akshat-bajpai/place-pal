const socketIo = require('socket.io');
const env = require('../config/env');

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: env.allowedOrigins,
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        socket.on('join', (userId) => {
            if (userId) {
                socket.join(`user_${userId}`);
            }
        });

        socket.on('disconnect', () => {});
    });
};

// Emit only to the specific user's room so other users don't receive each other's updates
const emitJobUpdate = (userId, data) => {
    if (io) {
        io.to(`user_${userId}`).emit('job_update', data);
    }
};

module.exports = { initSocket, emitJobUpdate };
