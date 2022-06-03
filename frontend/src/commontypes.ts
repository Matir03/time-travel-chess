export interface Seek {
    player: string;
    color: "White" | "Black" | "Random";
}

export class LobbyState {
    seeks: Seek[];
}

export class GameState {

}

export class LobbyEvent {

}

export class GameEvent {

}

export interface ServerToClientEvents {
    join_lobby:  (state: LobbyState) => void;
    join_game:   (state: GameState)  => void;
    lobby_event: (event: LobbyEvent) => void;
    game_event:  (event: GameEvent)  => void;
}

export interface ClientToServerEvents {
    lobby_event: (event: LobbyEvent) => void;
    game_event:  (event: GameEvent)  => void;
}