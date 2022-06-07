import { SOCKET_PORT } from './config.js';
import { Server } from 'socket.io';
import { AcceptSeek, AddSeek, DeleteSeek, GameAction, GameState, LobbyAction, 
    MakeMove, 
    MakeSeek, MappedLobbyState, PerformMove, RemoveSeek, Seek } from './commontypes.js';
import { TTCServer, TTCSocket } from './servertypes.js';

const io: TTCServer = new Server(SOCKET_PORT, {
    serveClient: false,
    cors: {origin: '*'}
});

let maxPID = 0, maxGID = 0;
const sockets = new Map<string, TTCSocket>();
const lobby = new MappedLobbyState({seeks: []});
const games = new Map<string, GameState>();

io.on("connection", (socket) => {
    console.log(`Socket ${socket.id} connected`);

    socket.on("player_join", (pname) => {
        socket.data.name = pname
        console.log(`Socket ${socket.id} has name ${socket.data.name}`);

        if(sockets.has(pname)) {
            const oldsocket = sockets.get(pname);
            
            console.log(`Old socket ${oldsocket.id} with same name`);
            console.log(`Sending socket ${socket.id} 
                to room ${oldsocket.data.room}`);

            updateRoom(socket, oldsocket.data.room);
            
            oldsocket.disconnect();
            console.log(`Socket ${oldsocket.id} disconnected`);
        } else {
            console.log(`Sending new socket ${socket.id} to lobby`);
            updateRoom(socket, "lobby");
        }

        sockets.set(pname, socket);

        socket.on("lobby_action", lobbyActionHandler(socket));
        socket.on("game_action", gameActionHandler(socket));
    });
});

function updateRoom(socket: TTCSocket, room: string) {

    if(room === "lobby") { 
        const state = lobby.toLobbyState();
        socket.emit("join_lobby", state);
        console.log(`Lobby state ${JSON.stringify(state)} 
            sent to socket ${socket.id}`);
    } else {
        const state = games.get(room);
        socket.emit("join_game", state);
        console.log(`Game state ${JSON.stringify(state)}
            sent to socket ${socket.id}`);
    }
    
    if(socket.data.room)
        socket.leave(socket.data.room);

    socket.data.room = room;
    socket.join(room);
}

function lobbyActionHandler(socket: TTCSocket) {
    return (action: LobbyAction) => {

        console.log(`Receiving lobby action ${JSON.stringify(action)}`);

        if(action.kind === "MakeSeek") {

            const seek: Seek = {
                id: maxPID++,
                player: socket.data.name,
                color: (action as MakeSeek).color
            };

            console.log(`New seek: ${JSON.stringify(seek)}`);

            lobby.insert(seek);

            io.to("lobby").emit("lobby_event", new AddSeek(seek));

        } else if(action.kind === "DeleteSeek") {

            const id = (action as DeleteSeek).id;
            
            console.log(`Deleting seek ${id}`);

            lobby.remove(id);

            io.to("lobby").emit("lobby_event", new RemoveSeek(id));

        } else if(action.kind === "AcceptSeek") {

            const id = (action as AcceptSeek).id;
            const seek = lobby.seeks.get(id);
            const socket2 = sockets.get(seek.player);

            console.log(`${socket.data.name} accepted seek 
                ${JSON.stringify(seek)}`);
                
            const white = (seek.color === "Black") ||
                (seek.color === "Random" && Math.random() < 0.5);
            
            if(white) {
                newGame(socket, socket2);
            } else {
                newGame(socket2, socket);
            }
        }

        console.log(`New lobby state: 
            ${JSON.stringify(lobby.toLobbyState())}`);
    };
}

function newGame(wSocket: TTCSocket, bSocket: TTCSocket) {
    const gid = maxGID++;
    const room = "game" + gid;
    
    games.set(room, {
        white: wSocket.data.name,
        black: bSocket.data.name,
        turnColor: "white",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moves: []
    });

    console.log(`Creating new game ${JSON.stringify(games.get(room))} 
        in room ${room}`);

    updateRoom(wSocket, room);
    updateRoom(bSocket, room);

    const removals: number[] = [];

    lobby.seeks.forEach(seek => {
        if([wSocket.data.name, bSocket.data.name]
            .includes(seek.player)) {        
            removals.push(seek.id);
            io.to("lobby").emit("lobby_event", 
                new RemoveSeek(seek.id));
        }
    })

    removals.forEach(id => lobby.remove(id));
}

function gameActionHandler(socket: TTCSocket) {
    return (action: GameAction) => {
        const game = socket.data.room;
        console.log(`Receiving game action ${JSON.stringify(action)}
        from ${socket.data.name} in ${game}`);
        
        if(action.kind === "MakeMove") {
            const move = (action as MakeMove).move;
            const color = 
                socket.data.name === games.get(game).white ?
                "white" : "black";

            console.log(`Making move ${JSON.stringify(move)} 
                in ${game}`);

            games.get(game).moves.push(move);

            io.to(game).emit("game_event", 
                new PerformMove(move, color));
        }
    };
}