import { SOCKET_ADDR } from './config';
import { io } from 'socket.io-client';
import { Lobby } from './lobby';
import { Game } from './game';

document.body.innerHTML = `Connecting to server at ${SOCKET_ADDR}`

const socket = io('ws://' + SOCKET_ADDR);

socket.on("connect", () => {
    console.log("Connected!");
});

socket.on("connect_error", (err) => {
    console.log(`Connection error: ${err.message}`);
})

socket.on("disconnect", (reason) => {
    console.log(`Disconnected from server because: ${reason}\n`);
});

socket.on("join_lobby", (lobbyState) => {
    socket.removeAllListeners("game_event");

    let lobby = new Lobby(lobbyState, 
        lobbyEvent => socket.emit("lobby_event", lobbyEvent));
    
    socket.on("lobby_event", lobby.on_event);
})

socket.on("join_game", (gameState) => {
    socket.removeAllListeners("lobby_event");

    let game = new Game(gameState,
        gameEvent => socket.emit("game_event", gameEvent));

    socket.on("game_event", game.on_event);    
})