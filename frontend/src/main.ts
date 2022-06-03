import { SOCKET_ADDR } from './config';
import { Socket, io } from 'socket.io-client';
import { Lobby } from './lobby';
import { Game } from './game';
import { classModule, eventListenersModule, h, init, 
    propsModule, styleModule, VNode } from 'snabbdom';
import { ClientToServerEvents, ServerToClientEvents } from './commontypes';

const patch = init([
    classModule,
    propsModule,
    styleModule,
    eventListenersModule
])

let root = h('div');
patch(document.getElementById("root"), root);
const setView = (node: VNode) => root = patch(root, node);

setView(h('p', `Connecting to server at ${SOCKET_ADDR}`));

const socket: Socket<ServerToClientEvents, ClientToServerEvents>
    = io('ws://' + SOCKET_ADDR);

socket.on("connect", () => {
    console.log("Connected!");
});

socket.on("connect_error", (err) => {
    console.log(`Connection error: ${err.message}`);
})

socket.on("disconnect", (reason) => {
    console.log(`Disconnected from server because: ${reason}`);
});

const lobby = new Lobby(
    event => socket.emit("lobby_event", event));

socket.on("join_lobby", (state) => {
    lobby.setState(state);
    setView(lobby.view());
});
socket.on("lobby_event", (event) => {
    lobby.update(event);
    setView(lobby.view());
});

const game = new Game(
    event => socket.emit("game_event", event));

socket.on("join_game", (state) => {
    game.setState(state);
    setView(game.view());
});
socket.on("game_event", (event) => {
    game.update(event);
    setView(game.view());
});