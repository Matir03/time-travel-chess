import { Color, Key, Role } from "./chessground/types";

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

    toLobbyState(): LobbyState {
        return {
            seeks: Array.from(this.seeks,
                ([id, seek]) => seek
            )
        }
    }
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

export class DeleteSeek implements LobbyAction {
    kind = "DeleteSeek";
    id: number;

    constructor(id: number) {
        this.id = id;
    }
}

export class AcceptSeek implements LobbyAction {
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

export class RemoveSeek implements LobbyEvent {
    kind = "RemoveSeek";
    id: number;

    constructor(id: number) {
        this.id = id;
    }
}

export interface Move {
    orig: Key;
    dest: Key;
    prom?: Role;
    blinks: Key[];
}

export interface GameState {
    white: string;
    black: string;

    turnColor: 'white' | 'black';
    fen: string;
    moves: Move[];
}

export interface GameAction {
    kind: string;
}

export class MakeMove implements GameAction {
    kind = "MakeMove";
    move: Move;

    constructor(move: Move) {
        this.move = move;
    }
}

export interface GameEvent {
    kind: string;
}

export class PerformMove implements GameEvent {
    kind = "PerformMove";
    move: Move;
    color: Color;

    constructor(move: Move, color: Color) {
        this.move = move;
        this.color = color;
    }
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
    game_action:  (action: GameAction)  => void;
}