import { SOCKET_ADDR } from './config';
import { Socket, io } from 'socket.io-client';
import { Lobby } from './lobby';
import { Game } from './game';
import { attributesModule, classModule, eventListenersModule, h, init, 
    propsModule, styleModule, toVNode, VNode } from 'snabbdom';
import { ClientToServerEvents, ServerToClientEvents } from './commontypes';

const patch = init([
    attributesModule,
    classModule,
    propsModule,
    styleModule,
    eventListenersModule
]);
window['h'] = h;
window['patch'] = patch;

let root = toVNode(document.getElementById("root"));
const setView = (node: VNode) => root = patch(root, node);

let pname = prompt("Enter a player name");

setView(h('div#root', [
    h('h1', `Connecting to server at ${SOCKET_ADDR}`)
]));

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
    console.log(`Emitting lobby action ${JSON.stringify(action)}`);
    socket.emit("lobby_action", action);
});

socket.on("join_lobby", (state) => {
    console.log(`Joining lobby with state
        ${JSON.stringify(state)}`);
    lobby.setState(state);
    setView(lobby.view());
});
socket.on("lobby_event", (event) => {
    lobby.update(event);
    setView(lobby.view());
});

const game = new Game(pname, action => {
    console.log(`Emitting game action ${JSON.stringify(action)}`)
    socket.emit("game_action", action);
});
window['game'] = game;

socket.on("join_game", (state) => {
    console.log(`Joining game with state
        ${JSON.stringify(state)}`);
    game.setState(state);
    setView(game.view());
});

socket.on("game_event", (event) => {
    game.update(event);
});