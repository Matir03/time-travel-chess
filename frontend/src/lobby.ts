import { Seek, LobbyState, LobbyEvent } from './commontypes';
import { h, VNode } from 'snabbdom';
import { join } from 'path';

export class Lobby {

    state: LobbyState;
    outSeeks: Seek[];

    emitter: (event: LobbyEvent) => void;

    constructor(emitter: (event: LobbyEvent) => void) {
        this.emitter = emitter;
    }

    setState(state: LobbyState) {
        this.state = state;    
    }

    update(event: LobbyEvent) {
    }

    view(): VNode {
        return h('div', [
            this.incoming(),
            this.outgoing(),
            this.seekMaker()
        ]);
    }

    incoming(): VNode {
        return h('div'
        );
    }

    outgoing(): VNode {
        return h('div'
        );
    }

    seekMaker(): VNode {
        return h('div'
        );
    }

}