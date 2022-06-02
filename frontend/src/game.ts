import { GameState, GameEvent } from './commontypes';

export class Game implements GameState {

    constructor(game: GameState, 
        actor: (action: GameEvent) => void) {

    }

    on_event(gameEvent: GameEvent) {

    }

}