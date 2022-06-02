import { SOCKET_PORT } from './config.js';
import { Server } from 'socket.io';
import { ServerLobby } from './lobby.js';

const io = new Server(SOCKET_PORT, {
    serveClient: false,
    cors: {origin: '*'}
});

const lobby = new ServerLobby(io);

io.on("connection", (socket) => {
    socket.emit("join_lobby", lobby.state);
    socket.join("lobby");

    socket.on("lobby_event", lobby.on_event)
})