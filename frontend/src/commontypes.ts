export type SeekColor = "White" | "Black" | "Random";
export const colors: Array<SeekColor> = ["White", "Black", "Random"];

export interface Seek {
    id: number;
    player: string;
    color: SeekColor;
}

export interface LobbyState {
    seeks: Seek[];
}

export class MappedLobbyState {
    seeks: Map<number, Seek>;

    constructor(state: LobbyState) {
        this.seeks = new Map(state.seeks.map(
            seek => [seek.id, seek]
        ));
    }

    insert(seek: Seek) {
        this.seeks.set(seek.id, seek);
    }

    remove(id: number) {
        this.seeks.delete(id);
    }

    seeker(id: number) {
        return this.seeks.get(id).player;
    }

    toLobbyState(): LobbyState {
        return {
            seeks: Array.from(this.seeks,
                ([id, seek]) => seek
            )
        }
    }
}

export interface GameState {

}

export interface LobbyAction {
    kind: string;
}

export class MakeSeek implements LobbyAction {
    kind = "MakeSeek";
    color: SeekColor;

    constructor(color: SeekColor) {
        this.color = color;
    }
}

export class DeleteSeek {
    kind = "DeleteSeek";
    id: number;

    constructor(id: number) {
        this.id = id;
    }
}

export class AcceptSeek {
    kind = "AcceptSeek";
    id: number;
    
    constructor(id: number) {
        this.id = id;
    }
}

export interface LobbyEvent {
    kind: string;
}

export class AddSeek implements LobbyEvent {
    kind = "AddSeek";
    seek: Seek; 

    constructor(seek: Seek) {
        this.seek = seek;
    }
}

export class RemoveSeek {
    kind = "RemoveSeek";
    id: number;

    constructor(id: number) {
        this.id = id;
    }
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
    player_join:  (pname:  string)      => void;
    lobby_action: (action: LobbyAction) => void;
    game_action:  (action: GameEvent)   => void;
}