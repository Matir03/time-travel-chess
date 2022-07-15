import Chessground from './chessground';
import { ReceivedGameState, GameEvent, GameAction, 
    MakeMove, PerformMove } from './commontypes';
import { Move } from './ttc/types';
import { attributesModule, classModule, eventListenersModule, h, 
    init, propsModule, styleModule, toVNode, VNode } from 'snabbdom';
import { Api } from './chessground/api';
import { files, ranks, Color, Key, MoveMetadata, Role, Piece } from './chessground/types';
import { PieceSelector } from './selection';
import { opposite, pieceToChar, charToPiece } from './chessground/util';
import { unselect } from './chessground/board';
import { Game } from './ttc/game';
import { toCoord, toKey } from './ttc/board';

interface UIElement {
    vnode: VNode;
    update: () => VNode;
}

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
        tapped: {
            target: orig,
            role
        },
    });
    
    cg.set({
        selected: null,
        lastMove: [orig, dest],
    });

    cg.setAutoShapes([]);
    cg.endTurn();
}

function unblink(cg: Api, key: Key, piece: Piece) {
    const atk = cg.state.blinked.get(key);
    const p = pieceToChar(piece);
    const c = atk.get(p);
    atk.set(p, c - 1);

    cg.state.pieces.set(key, piece);

    cg.set({
        selected: null,
        lastMove: [key],
    });

    cg.setAutoShapes([]);
    cg.endTurn();
}

export class GameClient {

    pname: string;
    state: ReceivedGameState;
    game: Game;
    emit: (action: GameAction) => void;

    cg: Api;
    cgNode: HTMLElement;

    sel: PieceSelector;
    selNode: VNode;
    selecting: boolean;

    color: Color;
    other: Color;

    oldLastMove: Key[];
    selected: Key;

    ui: UIElement[];

    constructor(pname: string, 
        emit: (action: GameAction) => void) {
        
        this.pname = pname;
        
        this.emit = action => {
            this.updateView();
            emit(action);
        }

        this.cgNode = document.createElement('div');
        this.cgNode.id = "chessground";

        this.cg = Chessground(this.cgNode, {
            addDimensionsCssVars: true,

            movable: {
                free: false,
                showDests: true,
                events: {
                    after: (orig, dest, blinks, meta) =>
                        this.afterMove(orig, dest, blinks, meta)
                }
            },

            premovable: {enabled: false},

            blinkable: {
                onBlink: (key) => {
                    this.updateView();
                },

                unblinker: (key) => {
                    const roles = [...new Set(this.cg.state.blinked.get(key))]
                        .filter(([p, n]) => n > 0 && 
                            charToPiece(p).color === this.color)
                        .map(([p, n]) => charToPiece(p).role);

                    if(roles.length === 0) return;

                    const blinks = this.cg.getBlinks().map(toKey);

                    if(!this.game.board.isLegal({
                        orig: toKey(key),
                        target: roles.at(0),
                        blinks 
                    })) return;
                    
                    this.sel.start(key, roles, this.color,
                        sr => {
                            const move = {
                                orig: toKey(key),
                                target: sr,
                                blinks: this.cg.getBlinks().map(toKey)
                            };
                            
                            this.emit(new MakeMove(move));

                            unblink(this.cg, key, {
                                role: sr,
                                color: this.color
                            });

                            this.updateView();
                        },
                        () => {
                            this.selecting = false;
                        }
                    );
                }
            },

            events: {select: key => this.onSelect(key)},

            draggable: {showGhost: false},
        });

        this.selNode = toVNode(document.createElement('div'));

        this.sel = new PieceSelector(
            f => f(this.cg),
            () => this.drawSel()
        )
        
        this.selecting = false;

        this.ui = [
            {vnode: h('div'), update: () => this.blinkPanel('white')},
            {vnode: h('div'), update: () => this.blinkPanel('black')},
        ];
    }

    drawSel() {
        this.selecting = true;
        this.cgNode.appendChild(this.selNode.elm);

        this.selNode = patch(this.selNode,
            this.sel.view() || h('div'));
    }

    afterMove(orig: Key, dest: Key, blinks: Key[], meta: MoveMetadata) {
        const move: Move = {
            orig: toKey(orig), 
            dest: toKey(dest), 
            blinks: blinks.map(toKey)
        };

        const piece = this.cg.state.pieces.get(dest);

        if(piece.role === 'pawn' && 
            this.game.board.enpassant === toKey(dest)[0] &&
            dest[1] === (this.color === 'white' ? '6' : '3')) {
            this.cg.state.pieces.delete(dest[0] + (this.color === 'white' ?
                '5' : '4') as Key);
        }
        
        if(piece.role === 'pawn' && (
            (dest[1] === '8' && 
            this.color === 'white') || 
            (dest[1] === '1' && 
            this.color == 'black')
        )) {
            this.sel.start(dest,
                piece.tapped ? [piece.tapped.role] : PROMOTABLE_ROLES,
                this.color,
                sr => {
                    move.target = sr;
                    this.emit(new MakeMove(move)); 
                    promote(this.cg, dest, sr);
                    this.cg.endTurn();
                    this.updateView();
                },
                () => {
                    this.cg.state.pieces.set(orig, piece);
                    this.selecting = false;

                    if(meta.captured) {
                        this.cg.state.pieces.set(dest, meta.captured);
                    } else {
                        this.cg.state.pieces.delete(dest);
                    }

                    this.cg.state.lastMove = this.oldLastMove;
                    this.updateView();

                    this.cg.redrawAll();
                }
            );
        } else {
            this.emit(new MakeMove(move));
            this.cg.endTurn();
            this.updateView();
        }
    }

    onSelect(key: Key) {
        if(this.cg.state.turnColor === this.other ||
            (this.cg.state.selected && !this.selected)) return;

        const piece = this.cg.state.pieces.get(key);

        if(!this.cg.state.selected) 
            this.selected = null;
        
        if(piece) {
            if(this.selected) {             
                
                const move: Move = {
                    orig: toKey(this.selected),
                    dest: toKey(key),
                    blinks: this.cg.getBlinks().map(toKey)
                }

                if(piece.role === 'pawn') {                                
                    if(!this.game.board.isLegal({
                        orig: move.orig,
                        dest: move.dest,
                        blinks: move.blinks,
                        target: 'queen'
                        })) return;

                    const psq = `${key[0]}${
                        this.color === 'white' ?
                        '8' : '1'}` as Key;
                    
                    const maybeBishop: Role[] = 
                        sameColor(this.selected, psq) ?
                        ['bishop'] : [];

                    const maybePawn: Role[] = 
                        key[0] === this.selected[0] &&
                        (this. color === 'white' ? 
                            key[1] < this.selected[1] :
                            key[1] > this.selected[1]) &&
                        this.selected[1] !== psq ?
                        ['pawn'] : [];

                    const orig = this.selected;

                    this.sel.start(this.selected,
                        NON_BISHOP_ROLES.concat(maybeBishop, maybePawn),
                        this.color,
                        sr => { 
                            move.target = sr;
                            
                            this.emit(new MakeMove(move));
                            tap(this.cg, orig, key, sr);  
                            this.updateView();
                        },
                        () => {
                            this.selecting = false;
                            unselect(this.cg.state);
                            this.cg.redrawAll();
                        }
                    )
                } else { 
                    if(!this.game.board.isLegal(move))
                        return;
                    this.emit(new MakeMove(move)); 
                    tap(this.cg, this.selected, key);   
                    this.updateView();
                }                     

                this.selected = null;
                this.cg.state.selected = null;
            } 
        } else {
            if(this.selected === key || 
                this.game.board.legalTaps(toKey(key), 
                    this.cg.getBlinks().map(toKey))
                    .length === 0) {
                this.selected = null;
                this.cg.state.selected = null;
            } else {
                this.selected = key;
                this.cg.state.selected = key;
            }

            this.cg.redrawAll();
        }
    }

    setDestsMap() {
        const blinks = this.cg.getBlinks().map(toKey);

        this.cg.set({
            movable: {
                dests: coord =>  
                    (this.game.board.isEmpty(toKey(coord)) ?
                    this.game.board.legalTaps(toKey(coord), blinks) :
                    this.game.board.legalDests(toKey(coord), blinks)) 
                        .map(toCoord) as Key[]
            },
            blinkable: {
                keys: coord => 
                    this.game.board.canBlink(toKey(coord), blinks) 
            }
        });
    }

    setState(state: ReceivedGameState) {
        this.state = state;

        this.color = state.white === this.pname?
            "white" : "black";

        this.other = opposite(this.color);

        this.game = new Game(state.game);

        this.syncCg();
    }

    syncCg() {
        this.cg.set({
            fen: "8/8/8/8/8/8/8/8",
            orientation: this.color,
            turnColor: this.game.board.turn,
            movable: {
                color: this.color
            }
        });

        this.game.board.squares.forEach((sq, coord) => {
            this.cg.state.blinked.set(coord as Key, new Map(sq.blinks));

            if(sq.piece)
                this.cg.state.pieces.set(coord as Key, {
                    role: sq.piece.role, 
                    color: sq.piece.color,
                    tapped: sq.piece.tapped ? {
                        target: toCoord(sq.piece.tapped.target) as Key,
                        role: sq.piece.tapped.role
                    } : null,
                });
        });

        const lastMove = this.state.game.at(-1);

        if(lastMove) {
            this.cg.state.lastMove = [toCoord(lastMove.orig) as Key];

            if(lastMove.dest) 
                this.cg.state.lastMove.push(toCoord(lastMove.dest) as Key);
        }
    }

    update(event: GameEvent) {
        console.log(`Receiving game event ${JSON.stringify(event)}`);

        if(event.kind === "PerformMove") {
            const color = (event as PerformMove).color;

            const move = (event as PerformMove).move;

            if(!this.game.makeMove(move)) {
                console.log("Illegal move!");
                return;
            }

            this.updateView();
            
            if(color === this.color) return;

            this.oldLastMove = [toCoord(move.orig) as Key].concat(
                move.dest ? toCoord(move.dest) as Key : []);
            
            move.blinks.forEach(key => 
                this.cg.state.pieces.get(toCoord(key) as Key).blinking = true
            )

            if(!move.dest) {
                unblink(this.cg, toCoord(move.orig) as Key, {
                    role: move.target,
                    color: this.other
                });
            } else if(this.cg.state.pieces.has(toCoord(move.orig) as Key)) {
                this.cg.move(toCoord(move.orig) as Key, toCoord(move.dest) as Key);
                
                if(move.target) {
                    promote(this.cg, toCoord(move.dest) as Key, move.target);
                }

                this.cg.endTurn();
            } else {
                tap(this.cg, toCoord(move.orig) as Key, 
                    toCoord(move.dest) as Key, move.target);
            }
        }
    }

    blinkPanel (color: Color): VNode {
        const wakeUp = () => {
            this.cgNode.classList.remove('dream');
            this.syncCg();      
            this.cg.redrawAll();        
            if(this.selecting) this.drawSel();
        };

        const pieceTag = (role: Role) => {
            const blinks = [...this.game.board.blinks
                .get(pieceToChar({role, color}))];
            
            const count = blinks
                .map(([s, n]) => n)
                .reduce((m, n) => m + n, 0);
            
            return h('div.blink-wrap', [h('piece', {
                class: {
                    [color] : true,
                    [role] : true,
                    "active": !!count
                }, 
                attrs: {
                    "data-nb": count,
                },
                on: count ? {
                    mouseenter: () => {
                        this.cgNode.classList.add('dream');

                        this.cg.state.lastMove = [];
                        this.cg.state.pieces.clear();
                        
                        blinks.forEach(([k, quantity]) => 
                            this.cg.state.pieces.set(
                                k as Key, {
                                    role, color, quantity
                                }
                            )
                        )
                        
                        this.cg.redrawAll();
                    },
                    mouseleave: () => wakeUp()
                } : {}
            })])
        }

        return h('div', {class: {
            ['blink'] : true,
            [`blink-${color}`] : true, 
            [`blink-top`] : color !== this.color,
            [`blink-bot`] : color === this.color,
        }}, ['pawn', 'knight', 'bishop', 'rook', 'queen']
            .map(pieceTag)
        )
    }

    updateView() {
        this.setDestsMap();
        
        this.ui.forEach(({vnode, update}, i) => 
            this.ui[i].vnode = patch(vnode, update()))
    }

    view(): VNode { 
        return h('div#root.game', {
            hook: {
                insert: (vnode) => {
                    vnode.elm.appendChild(this.cgNode);
                    this.updateView();
                }
            }
        }, this.ui.map(elm => elm.vnode = elm.update()));
    }
}