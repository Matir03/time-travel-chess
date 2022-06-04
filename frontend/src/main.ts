import { SOCKET_ADDR } from './config';
import { Socket, io } from 'socket.io-client';
import { Lobby } from './lobby';
import { Game } from './game';
import { classModule, eventListenersModule, h, init, 
    propsModule, styleModule, toVNode, VNode } from 'snabbdom';
import { ClientToServerEvents, ServerToClientEvents } from './commontypes';

const patch = init([
    classModule,
    propsModule,
    styleModule,
    eventListenersModule
])

let root = toVNode(document.getElementById("root"));
const setView = (node: VNode) => root = patch(root, node);

let pname = prompt("Enter a player name");

setView(h('h1', `Connecting to server at ${SOCKET_ADDR}`));

const socket: Socket<ServerToClientEvents, ClientToServerEvents>
    = io('ws://' + SOCKET_ADDR);

socket.on("connect", () => {
    console.log("Connected!");
    socket.emit("player_join", pname);
});

socket.on("connect_error", (err) => {
    console.log(`Connection error: ${err.message}`);
})

socket.on("disconnect", (reason) => {
    console.log(`Disconnected from server because: ${reason}`);

    if(reason === "io server disconnect") {
        setView(h('h1', 'Disconnected by server'));
    }
});

const lobby = new Lobby(pname, action => {
    console.log(`Emitting action ${JSON.stringify(action)}`);
    socket.emit("lobby_action", action);
});

socket.on("join_lobby", (state) => {
    lobby.setState(state);
    setView(lobby.view());
});
socket.on("lobby_event", (event) => {
    lobby.update(event);
    setView(lobby.view());
});

const game = new Game(
    event => socket.emit("game_action", event));

socket.on("join_game", (state) => {
    game.setState(state);
    setView(game.view());
});
socket.on("game_event", (event) => {
    game.update(event);
    setView(game.view());
});