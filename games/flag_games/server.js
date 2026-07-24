const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Allows your GitHub Pages site to connect
});

const rooms = {}; // Stores room state: { "ABCD": { host: socketId, players: [...] } }

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on('connection', (socket) => {
    // 1. Host creates a room
    socket.on('createRoom', ({ playerName }) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            host: socket.id,
            players: [{ id: socket.id, name: playerName, score: 0 }],
            started: false
        };

        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, players: rooms[roomCode].players });
    });

    // 2. Player joins an existing room code
    socket.on('joinRoom', ({ roomCode, playerName }) => {
        const code = roomCode.toUpperCase();
        if (!rooms[code]) {
            socket.emit('errorMsg', 'Room code not found!');
            return;
        }

        const player = { id: socket.id, name: playerName, score: 0 };
        rooms[code].players.push(player);
        socket.join(code);

        // Notify everyone in the room about the new player list
        io.to(code).emit('updatePlayerList', rooms[code].players);
        socket.emit('joinedSuccess', { roomCode: code });
    });

    // 3. Host starts game for everyone in room
    socket.on('startGame', ({ roomCode }) => {
        if (rooms[roomCode] && rooms[roomCode].host === socket.id) {
            rooms[roomCode].started = true;
            io.to(roomCode).emit('gameStarted');
        }
    });

    // 4. Handle Player Disconnects
    socket.on('disconnect', () => {
        for (const code in rooms) {
            rooms[code].players = rooms[code].players.filter(p => p.id !== socket.id);
            io.to(code).emit('updatePlayerList', rooms[code].players);
        }
    });
});

server.listen(3000, () => console.log('Multiplayer server running on port 3000'));