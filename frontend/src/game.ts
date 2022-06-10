import Chessground from './chessground';
import { GameState, GameEvent, GameAction, 
    MakeMove, PerformMove, Move } from './commontypes';
import { attributesModule, classModule, eventListenersModule, h, 
    init, propsModule, styleModule, toVNode, VNode } from 'snabbdom';
import { Api } from './chessground/api';
import { Color } from './chessground/types';
import { promote, PromotionCtrl } from './promotion';

const patch = init([
    attributesModule,
    classModule,
    propsModule,
    styleModule,
    eventListenersModule
]);    

export class Game {

    pname: string;
    state: GameState;
    emit: (action: GameAction) => void;

    cg: Api;
    cgNode: HTMLElement;

    prom: PromotionCtrl;
    promNode: VNode;

    color: Color;
    other: Color;

    constructor(pname: string, 
        emit: (action: GameAction) => void) {
        this.pname = pname;
        this.emit = emit;

        this.cgNode = document.createElement('div');
        this.cgNode.id = "chessground";

        this.cg = Chessground(this.cgNode, {
            addDimensionsCssVars: true,
            movable: {events: {
                after: (orig, dest, meta) => {                    
                    const move: Move = {orig: orig, dest: dest};

                    if(!this.prom.start(orig, dest,
                        (po, pd, pr) => {
                            move.prom = pr;
                            console.log(`Made move ${JSON.stringify(move)}`);
                            this.emit(new MakeMove(move)); 
                        }, meta)) {
                        console.log(`Made move ${JSON.stringify(move)}`);
                        this.emit(new MakeMove(move));                            
                    }
                }
            }},
        });
        window['cg'] = this.cg;

        this.promNode = toVNode(document.createElement('div'));

        this.prom = new PromotionCtrl(
            f => f(this.cg),
            () => {},
            () => {
                this.cgNode.appendChild(this.promNode.elm);

                this.promNode = patch(this.promNode,
                    this.prom.view() || h('div'));
            }
        )
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
        });
    }

    update(event: GameEvent) {
        console.log(`Receiving game event ${JSON.stringify(event)}`);

        if(event.kind === "PerformMove") {
            const color = (event as PerformMove).color;
            
            if(color === this.color) return;

            const move = (event as PerformMove).move;

            this.cg.set({turnColor: this.color})
            this.cg.move(move.orig, move.dest);
            if(move.prom) {
                promote(this.cg, move.dest, move.prom);
            }
        }
    }

    view(): VNode {
        return h('div#root', {hook: {
            postpatch: (old, vnode) => {
                vnode.elm.appendChild(this.cgNode);
            }
        }});
    }
}