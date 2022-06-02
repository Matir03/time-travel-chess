import { LobbyState, LobbyEvent } from './commontypes';

export class Lobby implements LobbyState {

    constructor(state: LobbyState, 
        seeker: (seek: LobbyEvent) => void) {

    }

    on_event(lobbyEvent: LobbyEvent) {

    }

}