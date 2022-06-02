import { LobbyEvent, LobbyState } from "./commontypes.js";
import { Server } from "socket.io";

export class ServerLobby {

    state: LobbyState; 
    
    constructor(io: Server) {
        
    }

    on_event(lobbyEvent : LobbyEvent) {

    }

}