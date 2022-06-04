import { SOCKET_PORT } from './config.js';
import { Server } from 'socket.io';
import { AddSeek, MappedLobbyState, RemoveSeek } from './commontypes.js';
const io = new Server(SOCKET_PORT, {
    serveClient: false,
    cors: { origin: '*' }
});
const lobby = new MappedLobbyState({ seeks: [] });
const socketByName = new Map();
let highestID = 1;
io.on("connection", (socket) => {
    console.log(`Socket ${socket.id} connected`);
    socket.on("player_join", (pname) => {
        socket.data.name = pname;
        console.log(`Socket ${socket.id} has name ${socket.data.name}`);
        if (socketByName.has(pname)) {
            socketByName.get(pname).disconnect();
            console.log(`Socket ${socketByName.get(pname).id} disconnected`);
            console.log("Reason: name collision");
        }
        socketByName.set(pname, socket);
        socket.emit("join_lobby", lobby.toLobbyState());
        console.log(`Lobby state ${JSON.stringify(lobby.toLobbyState())} 
            sent to socket ${socket.id}`);
        socket.join("lobby");
        socket.on("lobby_action", (action) => {
            console.log(`Receiving action ${JSON.stringify(action)}`);
            if (action.kind === "MakeSeek") {
                const seek = {
                    id: highestID++,
                    player: socket.data.name,
                    color: action.color
                };
                console.log(`New seek: ${JSON.stringify(seek)}`);
                lobby.insert(seek);
                io.to("lobby").emit("lobby_event", new AddSeek(seek));
            }
            else if (action.kind === "DeleteSeek") {
                const id = action.id;
                console.log(`Deleting seek ${id}`);
                lobby.remove(id);
                io.to("lobby").emit("lobby_event", new RemoveSeek(id));
            }
            else if (action.kind === "AcceptSeek") {
                const id = action.id;
                const socket2 = socketByName.get(lobby.seeker(id));
                console.log(`${socket.data.name} accepted seek 
                    ${JSON.stringify(lobby.seeks.get(id))}`);
                socket.emit("join_game", {});
                socket2.emit("join_game", {});
                socket.leave("lobby");
                socket2.leave("lobby");
                const removals = [];
                lobby.seeks.forEach(seek => {
                    if ([socket.data.name, socket2.data.name]
                        .includes(seek.player)) {
                        removals.push(seek.id);
                        io.to("lobby").emit("lobby_event", new RemoveSeek(seek.id));
                    }
                });
                removals.forEach(id => lobby.remove(id));
            }
            console.log(`New lobby state: 
                ${JSON.stringify(lobby.toLobbyState())}`);
        });
    });
});
