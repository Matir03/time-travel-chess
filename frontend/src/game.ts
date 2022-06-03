import { GameState, GameEvent } from './commontypes';
import { h, VNode } from 'snabbdom';

export class Game {

    state: GameState;

    constructor(emitter: (event: GameEvent) => void) {

    }

    setState(state: GameState) {

    }

    update(event: GameEvent) {
        
    }

    view(): VNode {
        return h(
            'div'
        );
    }

}