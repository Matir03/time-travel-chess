import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, 
    ServerToClientEvents } from './commontypes.js';

interface InterServerEvents {}

interface SocketData {
    name: string;
    room: string;
}

export type TTCServer = Server<ClientToServerEvents, ServerToClientEvents, 
    InterServerEvents, SocketData>; 

export type TTCSocket = Socket<ClientToServerEvents, ServerToClientEvents,
    InterServerEvents, SocketData>;