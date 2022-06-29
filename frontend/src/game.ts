import Chessground from './chessground';
import { GameState, GameEvent, GameAction, 
    MakeMove, PerformMove, Move } from './commontypes';
import { attributesModule, classModule, eventListenersModule, h, 
    init, propsModule, styleModule, toVNode, VNode } from 'snabbdom';
import { Api } from './chessground/api';
import { Color, Key, MoveMetadata, Role, Piece, BasicPiece } from './chessground/types';
import { PieceSelector } from './promotion';
import { opposite,  } from './chessground/util';
import { unselect } from './chessground/board';

const patch = init([
    attributesModule,
    classModule,
    propsModule,
    styleModule,
    eventListenersModule
]);    

const PROMOTABLE_ROLES: Role[] = ['queen', 'knight', 'rook', 'bishop'];
const NON_BISHOP_ROLES: Role[] = ['queen', 'knight', 'rook'];

function sameColor(key1: Key, key2: Key): boolean {
    const parity = (key: Key) => key.charCodeAt(0) + key.charCodeAt(1);
    return ((parity(key1) + parity(key2)) % 2) === 0;
}

function promote(cg: Api, key: Key, role: Role): void {
    cg.state.pieces.get(key).role = role;
}

function tap(cg: Api, orig: Key, dest: Key, role?: Role) {
    const piece = cg.state.pieces.get(dest);
    
    if(role) {
        cg.state.pieces.set(orig, {
            color: piece.color, role
        });
    } else {
        cg.state.pieces.set(orig, piece);
    }

    cg.state.pieces.set(dest, {
        color: piece.color,
        role: piece.role,
        tapped: orig,
    });
    
    cg.set({
        selected: null,
        lastMove: [orig, dest],
    });

    cg.setAutoShapes([]);
    cg.endTurn();
}

function unblink(cg: Api, key: Key, piece: Piece) {
    const atk: Map<BasicPiece, number> = cg.state.blinked.get(key);
    const c = atk.get(piece);
    atk.set(piece, c - 1);

    cg.state.pieces.set(key, piece);

    cg.set({
        selected: null,
        lastMove: [key],
    });

    cg.setAutoShapes([]);
    cg.endTurn();
}

export class Game {

    pname: string;
    state: GameState;
    emit: (action: GameAction) => void;

    cg: Api;
    cgNode: HTMLElement;

    sel: PieceSelector;
    selNode: VNode;

    selected: Key;
    color: Color;
    other: Color;

    oldLastMove: Key[];

    constructor(pname: string, 
        emit: (action: GameAction) => void) {
        this.pname = pname;
        this.emit = emit;

        this.cgNode = document.createElement('div');
        this.cgNode.id = "chessground";

        this.cg = Chessground(this.cgNode, {
            addDimensionsCssVars: true,

            movable: {events: {
                after: (orig, dest, blinks, meta) =>
                    this.afterMove(orig, dest, blinks, meta)
            }},

            blinkable: {
                unblinker: (key) => {
                    const roles = [...new Set(this.cg.state.blinked.get(key))]
                        .filter(([p, n]) => n > 0 && 
                            p.color === this.color)
                        .map(([p, n]) => p.role);

                    if(roles.length === 0) return null;
                    
                    this.sel.start(key, roles, this.color,
                        sr => {
                            this.emit(new MakeMove({
                                orig: 'a0',
                                dest: key,
                                sel: sr,
                                blinks: this.cg.getBlinks()
                            }));

                            unblink(this.cg, key, {
                                role: sr,
                                color: this.color
                            });
                        },
                    );
                }
            },

            events: {select: key => this.onSelect(key)},

            draggable: {showGhost: false},
        });

        this.selNode = toVNode(document.createElement('div'));

        this.sel = new PieceSelector(
            f => f(this.cg),
            () => {
                this.cgNode.appendChild(this.selNode.elm);

                this.selNode = patch(this.selNode,
                    this.sel.view() || h('div'));
            }
        )
    }

    afterMove(orig: Key, dest: Key, blinks: Key[], meta: MoveMetadata) {
        const move: Move = {orig, dest, blinks};

        const piece = this.cg.state.pieces.get(dest);
        
        if(piece.role === 'pawn' && (
            (dest[1] == '8' && 
            this.color === 'white') || 
            (dest[1] == '1' && 
            this.color == 'black')
        )) {
            this.sel.start(dest, 
                PROMOTABLE_ROLES,
                this.color,
                sr => {
                    move.sel = sr;
                    this.emit(new MakeMove(move)); 
                    promote(this.cg, dest, sr);
                    this.cg.endTurn();
                },
                () => {
                    this.cg.state.pieces.set(orig, piece);

                    if(meta.captured) {
                        this.cg.state.pieces.set(dest, meta.captured);
                    } else {
                        this.cg.state.pieces.delete(dest);
                    }

                    this.cg.state.lastMove = this.oldLastMove;

                    this.cg.redrawAll();
                }
            );
        } else {
            this.emit(new MakeMove(move));
            this.cg.endTurn();
        }
    }

    onSelect(key: Key) {
        if(this.cg.state.turnColor === this.other) return;

        const piece = this.cg.state.pieces.get(key);
        
        if(piece) {
            if(this.selected) {
                if(!piece.tapped && 
                   !piece.blinking &&
                    piece.color === this.color &&
                    piece.role !== 'king' && (
                    piece.role !== 'bishop' ||
                    sameColor(this.selected, key)
                )) {                    
                    const move: Move = {
                        orig: this.selected,
                        dest: key,
                        blinks: this.cg.getBlinks()
                    }

                    if(piece.role === 'pawn') {
                        const maybeBishop: Role[] = 
                            sameColor(this.selected, `${key[0]}${
                                this.color === 'white' ?
                                '8' : '1'}` as Key) ?
                            ['bishop'] : [];

                        const maybePawn: Role[] = 
                            key[0] === this.selected[0] &&
                            key[1]  <  this.selected[1] &&
                            this.selected[1] < '8' ?
                            ['pawn'] : [];

                        const orig = this.selected;

                        this.sel.start(this.selected,
                            NON_BISHOP_ROLES.concat(maybeBishop, maybePawn),
                            this.color,
                            sr => { 
                                move.sel = sr;  
                                this.emit(new MakeMove(move));
                                tap(this.cg, orig, key, sr);  
                            },
                            () => {
                                unselect(this.cg.state);
                                this.cg.redrawAll();
                            }
                        )
                    } else { 
                        this.emit(new MakeMove(move)); 
                        tap(this.cg, this.selected, key);   
                    }                     
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

            this.oldLastMove = [move.orig, move.dest]
            
            move.blinks.forEach(key => 
                this.cg.state.pieces.get(key).blinking = true
            )

            if(move.orig === 'a0') {
                unblink(this.cg, move.dest, {
                    role: move.sel,
                    color: this.other
                });
            } else if(this.cg.state.pieces.has(move.orig)) {
                this.cg.move(move.orig, move.dest);
                
                if(move.sel) {
                    promote(this.cg, move.dest, move.sel);
                }

                this.cg.endTurn();
            } else {
                tap(this.cg, move.orig, move.dest, move.sel);
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