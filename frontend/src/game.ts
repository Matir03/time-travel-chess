import Chessground from './chessground';
import { GameState, GameEvent, GameAction, 
    MakeMove, PerformMove, Move } from './commontypes';
import { attributesModule, classModule, eventListenersModule, h, 
    init, propsModule, styleModule, toVNode, VNode } from 'snabbdom';
import { Api } from './chessground/api';
import { Color, Key, Role } from './chessground/types';
import { promote, PromotionCtrl } from './promotion';
import { opposite } from './chessground/util';

const patch = init([
    attributesModule,
    classModule,
    propsModule,
    styleModule,
    eventListenersModule
]);    

const PROMOTABLE_ROLES: Role[] = ['queen', 'knight', 'rook', 'bishop'];

function tap(cg: Api, orig: Key, dest: Key) {
    const piece = cg.state.pieces.get(dest);
    
    cg.state.pieces.set(orig, piece);
    cg.state.pieces.set(dest, {
        color: piece.color,
        role: piece.role,
        tapped: true,
        promoted: piece.promoted
    });
    cg.setAutoShapes([]);
    cg.set({
        selected: null,
        lastMove: [orig, dest],
        turnColor: opposite(cg.state.turnColor)
    });
    cg.redrawAll();
    
}

export class Game {

    pname: string;
    state: GameState;
    emit: (action: GameAction) => void;

    cg: Api;
    cgNode: HTMLElement;

    prom: PromotionCtrl;
    promNode: VNode;

    selected: Key;
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
                        PROMOTABLE_ROLES,
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
            events: {select: key => {
                if(this.cg.state.turnColor === this.other) return;

                const piece = this.cg.state.pieces.get(key);
                
                if(piece) {
                    if(this.selected) {
                        if(!piece.tapped) {
                            tap(this.cg, this.selected, key);
                            
                            emit(new MakeMove({
                                orig: this.selected,
                                dest: key,
                            }));
                        }
                        this.cg.setAutoShapes([]);
                        this.selected = null;
                    }
                } else {
                    if(this.selected === key) {
                        this.selected = null;
                        this.cg.setAutoShapes([]);
                    } else {
                        this.selected = key;
                        this.cg.setAutoShapes([{
                            orig: key,
                            brush: 'red'
                        }]);
                    }
                }
            }},
        });

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

        this.other = opposite(this.color);
        
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
            
            if(this.cg.state.pieces.has(move.orig)) {
                this.cg.move(move.orig, move.dest);
                
                if(move.prom) {
                    promote(this.cg, move.dest, move.prom);
                }

                this.cg.set({turnColor: this.color});
            } else {
                tap(this.cg, move.orig, move.dest);
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