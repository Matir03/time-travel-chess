import { Chessground } from 'chessground';
import { GameState, GameEvent, GameAction, MakeMove, PerformMove } from './commontypes';
import { h, toVNode, VNode } from 'snabbdom';
import { Api } from 'chessground/api';
import { Color } from 'chessground/types';

export class Game {

    pname: string;
    state: GameState;
    emit: (action: GameAction) => void;

    cg: Api;
    cgNode: HTMLElement;

    color: Color;
    other: Color;


    constructor(pname: string, 
        emit: (action: GameAction) => void) {
        this.pname = pname;
        this.emit = emit;

        this.cgNode = document.createElement('div');
        this.cgNode.id = "chessground";
        this.cg = Chessground(this.cgNode);
    }

    setState(state: GameState) {
        this.state = state;

        this.color = state.white === this.pname?
            "white" : "black";

        this.other = this.color === "white" ?
            "black" : "white";
        
        this.cg.set({
            fen: state.fen,
            orientation: this.color,
            turnColor: state.turnColor,
            movable: {color: this.color},
            events: {
                move: (orig, dest) => {
                    const move = {orig: orig, dest: dest};
                    console.log(`Made move ${move}`);
                    this.emit(new MakeMove(move));
                }
            }
        });
    }

    update(event: GameEvent) {
        console.log(`Receiving game event ${JSON.stringify(event)}`);

        if(event.kind === "PerformMove") {
            const color = (event as PerformMove).color;
            
            if(color === this.color) return;

            const move = (event as PerformMove).move;

            this.cg.move(move.orig, move.dest);
            this.cg.set({turnColor: this.color});
        }
    }

    view(): VNode {
        return h('div', {
            props: {id: 'cg-root'}
        });
    }

    cgView() {
        document
            .getElementById('cg-root')
            .appendChild(this.cgNode);
    }

}