import * as ttc from './types';

export function inBounds(key: ttc.Key) {
    return key && key.every(k => k >= 1 && k <= 8);
}

export function opposite(color: ttc.Color): ttc.Color { 
    return color === 'black' ? 'white' : 'black';
}

export function sameKey(key1: ttc.Key, key2: ttc.Key): boolean {
    return key1[0] === key2[0] && key1[1] === key2[1];
}

export function sameColor(key1: ttc.Key, key2: ttc.Key): boolean {
    return (key1[0] + key2[0] + key1[1] + key2[1]) % 2 === 0;
}

function incrementBlinks(blinks: ttc.Blinks, piece: ttc.Piece) {
    const pname = pieceToChar(piece); 

    const k = blinks.get(pname) ?? 0;

    blinks.set(pname, k + 1);       
}

function pieceToChar(piece: ttc.Piece): string {
    return String.fromCharCode(
        ttc.role2sym[piece.role].charCodeAt(0) + 
        (piece.color === 'white' ? 0 : 
        ('a'.charCodeAt(0) - 'A'.charCodeAt(0))));
}

function charToPiece(c : string): ttc.Piece {
    const C = c.toUpperCase();
    
    return {
        color: c === C ? 'white' : 'black',
        role: ttc.sym2role[C]
    }
}

export function toKey(sq: string): ttc.Key {
    return [sq.charCodeAt(0) - 'a'.charCodeAt(0) + 1,
        sq.charCodeAt(1) - '0'.charCodeAt(0)];
}

export function toCoord(key: ttc.Key): string {
    return `${String.fromCharCode(
        'a'.charCodeAt(0) + key[0] - 1)}${
            String.fromCharCode(
        '0'.charCodeAt(0) + key[1])}`
}

export class Board {
    
    squares: Map<string, ttc.Square>;
    turn: ttc.Color;
    castling: ttc.Castling;
    enpassant: number;
    killer?: ttc.Color;
    halfmoves: number;
    fullmoves: number;

    static fromFEN(fen: string): Board {
        const board = new Board();

        const records = fen.split(' ');

        board.squares = new Map();

        for(let x = 1; x <= 8; x++) 
            for(let y = 1; y <= 8; y++) 
                board.squares.set(toCoord([x, y]), {blinks: new Map()});

        const ranks = records[0].split('/');

        for(let y = 8; y >= 1; y--) {
            const rank = ranks[8-y];

            let x = 0;
            let tapped = '';
            let tap = false, blink = false;

            for(const c of rank) {

                if(c === '(') {
                    tap = true;
                    continue;
                }

                if(c === ')') {
                    const piece = board.squares.get(toCoord([x, y])).piece;

                    piece.tapped =
                        tapped.length === 3 ? 
                        {
                            role: ttc.sym2role[tapped[0]],
                            target: toKey(tapped.slice(1))
                        } :
                        {
                            role: piece.role,
                            target: toKey(tapped)
                        }

                    tap = false;
                    tapped = '';

                    continue;
                }

                if(c === '[') {
                    blink = true;
                    continue;
                }

                if(c === ']') {
                    blink = false;
                    continue;
                }
                
                if(tap) {
                    tapped += c;
                    continue;
                }

                const C = c.toUpperCase();

                if((ttc.syms as readonly string[]).includes(C)) {
                    const piece = charToPiece(c);

                    if(blink) {
                        incrementBlinks(board.squares.get(toCoord([x, y])).blinks,
                            piece)
                    } else {
                        x += 1;
                        board.squares.get(toCoord([x, y])).piece = piece;
                    }

                    continue;
                }

                const n = c.charCodeAt(0) - '0'.charCodeAt(0);

                if(1 <= n && n <= 8) {
                    x += n;
                    continue;
                }
            }
        }

        board.turn = records[1] === 'w' ? 'white' : 'black';

        board.castling = {
            short: {
                white: records[2].includes('K'),
                black: records[2].includes('k')
            }, 
            long: {
                white: records[2].includes('Q'),
                black: records[2].includes('q')
            }
        }

        board.enpassant = records[3] === '-' ?
            0 : records[3].charCodeAt(0) - 'a'.charCodeAt(0) + 1;

        if(records[4] !== '-') 
            board.killer = records[4] === 'w' ?
                'white' : 'black';
        
        board.halfmoves = parseInt(records[5]);

        board.fullmoves = parseInt(records[6]);

        return board;
    }

    toFEN(): string {        
        return [
            [8, 7, 6, 5, 4, 3, 2, 1].map(y => {
                let rank = '';
                let nulls = 0;

                for(let x = 1; x <= 8; x++) {
                    let entry = '';

                    const square = this.squares.get(toCoord([x, y]));
                    const piece = square.piece;

                    if(piece) {
                        entry += pieceToChar(piece);

                        if(piece.tapped)
                            entry += `(${
                                piece.role === piece.tapped.role ? '' : 
                                pieceToChar({
                                role: piece.tapped.role,
                                color: piece.color
                            })}${toCoord(piece.tapped.target)})`
                    }

                    const blinkstr = 'PNBRQpnbrq'
                        .split('')
                        .map(c => c.repeat(
                            square.blinks.get(c)))
                        .join('');

                    if(blinkstr) entry += `[${blinkstr}]`;

                    if(entry) {
                        if(nulls) rank += String.fromCharCode(nulls + 
                            '0'.charCodeAt(0));

                        nulls = 0;

                        rank += entry;
                    } else {
                        nulls += 1;
                    }
                }

                if(nulls) rank += String.fromCharCode(nulls + 
                    '0'.charCodeAt(0));

                return rank;
            }).join('/'),
            this.turn.charAt(0),
            [
                this.castling.short.white ? 'K' : '',
                this.castling.long.white  ? 'Q' : '',
                this.castling.short.black ? 'k' : '',
                this.castling.long.black  ? 'q' : '',
            ].join('') || '-',
            this.enpassant ? toCoord([this.enpassant, 
                this.turn === 'white' ? 6 : 3]) : '-',
            this.killer?.charAt(0) || '-',
            this.halfmoves,
            this.fullmoves,
        ].join(' ');
    }

    copy(): Board {
        const board = new Board();
        
        board.turn = this.turn;
        
        board.squares = new Map();

        for(let x = 1; x <= 8; x++) {
            for(let y = 1; y <= 8; y++) {
                const c = toCoord([x, y]);
                const sq = this.squares.get(c);

                board.squares.set(c, {
                    blinks: new Map(sq.blinks),
                    piece: sq.piece
                })
            }
        }

        board.castling = {
            short: {...this.castling.short},
            long: {...this.castling.long}
        };

        board.enpassant = this.enpassant;

        board.killer = this. killer;

        board.halfmoves = this.halfmoves;

        board.fullmoves = this.fullmoves;

        return board;
    }

    isEmpty(key: ttc.Key): boolean {
        return inBounds(key) &&
            !this.squares.get(toCoord(key)).piece;
    }

    basicDests(orig: ttc.Key): ttc.Key[] {
        const [x0, y0] = orig;
        const piece = this.squares.get(toCoord(orig)).piece;

        if(!piece || piece.color !== this.turn) 
            return [];

        let dests: ttc.Key[] = [];

        const farscan = (dx: number, dy: number) => {
            const gen: (prev: ttc.Key) => ttc.Key 
                = ([x, y]) => [x + dx, y + dy];

            for(let dest = gen(orig); inBounds(dest); dest = gen(dest)) {
                const piece = this.squares.get(toCoord(dest)).piece;
                
                if(piece) {
                    if(piece.color !== this.turn) 
                        dests.push(dest);

                    return;
                }

                dests.push(dest);
            }
        }

        const nearscan = (deltas: [number, number][]) => {
            deltas.forEach(([dx, dy]) => {
                const dest: ttc.Key = [x0 + dx, y0 + dy];
                
                if(!inBounds(dest)) return;
                
                const piece = this.squares.get(toCoord(dest)).piece;

                if(!piece || piece.color !== this.turn) 
                    dests.push(dest);
            });
        }

        if(piece.role === 'king') {
            nearscan([     
                [-1, -1], [0, -1], [1, -1],
                [-1,  0],          [1,  0],
                [-1,  1], [0,  1], [1,  1],
            ]);

            if(this.castling.short[this.turn] &&
                [[6, y0], [7, y0]].every(
                    (key: ttc.Key) => this.isEmpty(key)))
            dests.push([7, y0]);
            
            if(this.castling.long[this.turn] &&
                [[2, y0], [3, y0], [4, y0]].every(
                    (key: ttc.Key) => this.isEmpty(key)))
            dests.push([3, y0]);
        }

        if(['queen', 'rook'].includes(piece.role)) {
            farscan(1, 0);
            farscan(-1, 0);
            farscan(0, 1);
            farscan(0, -1);
        }

        if(['queen', 'bishop'].includes(piece.role)) {
            farscan(1, 1);
            farscan(1, -1);
            farscan(-1, 1);
            farscan(-1, -1);
        }

        if(piece.role === 'knight') {
            nearscan([
                [-2, -1], [-2, 1],
                [-1, -2], [-1, 2],
                [ 1, -2], [ 1, 2],
                [ 2, -1], [ 2, 1],
            ]);
        }

        if(piece.role === 'pawn') {
            const dir = piece.color === 'white' ?
                1 : -1;

            if(this.isEmpty([x0, y0 + dir]) && 
               (!piece.tapped || piece.tapped.role !== 'pawn' ||
                (piece.tapped.target[1] - y0) * dir >= 1)) {
                dests.push([x0, y0 + dir]);

                if((dir === -1 && y0 === 7) || 
                    (dir === 1 && y0 === 2)) {
                    if(this.isEmpty([x0, y0 + 2 * dir]) &&
                       (!piece.tapped || piece.tapped.role !== 'pawn' ||
                        (piece.tapped.target[1] - y0) * dir >= 2)) 
                        dests.push([x0, y0 + 2 * dir]);
                } 
            }

            const capscan = (target: ttc.Key) => {
                if(!inBounds(target)) return;

                if(this.squares.get(toCoord(target))?.piece?.color  
                    === opposite(this.turn) || 
                    (y0 === (piece.color === 'white' ? 5 : 4) &&
                        this.enpassant === target[0]))
                    dests.push(target);
            }

            capscan([x0 - 1, y0 + dir]);
            capscan([x0 + 1, y0 + dir]);
        }

        return dests;
    }

    canMakeMove(move: ttc.Move): boolean {
        if(!move.blinks.every(sq => {
            if(!inBounds(sq)) return false;

            const blink = this.squares.get(toCoord(sq)).piece;

            return blink && blink.color === this.turn 
                && blink.role !== 'king' && 
                (!blink.tapped || 
                    (sameKey(blink.tapped.target, 
                        sameKey(sq, move.orig) ? move.dest : sq) &&
                    blink.tapped.role === (
                        (blink.role === 'pawn' && 
                        sameKey(sq, move.orig) &&
                        move.target) ?
                        move.target : blink.role)
                    )
                )
            })) return false;

        if(!inBounds(move.orig)) return false;

        const piece = this.squares.get(toCoord(move.orig)).piece;

        const prom = this.turn === 'white' ? 8 : 1;

        if(piece) {
            return this.basicDests(move.orig).some(dest =>
                    sameKey(dest, move.dest)) &&
                ((!move.target && (piece.role !== 'pawn' || 
                    move.dest[1] !== prom)) || 
                    (piece.role === 'pawn' &&
                    ['queen', 'rook', 'bishop', 'knight']
                        .includes(move.target) &&
                    move.dest[1] === prom) &&
                    (!piece.tapped || 
                        piece.tapped.role === move.target));
        }

        if(move.dest) {
            if(!inBounds(move.dest)) return false;

            const piece = this.squares.get(toCoord(move.dest)).piece;

            return piece?.color === this.turn &&
                piece.role !== 'king' &&
                !piece.tapped && 
                (piece.role !== 'bishop' ||
                 sameColor(move.orig, move.dest)) &&
                !move.blinks.some(key => sameKey(key, move.dest)) &&
                (!move.target || 
                 (piece.role === 'pawn' &&
                  (['queen', 'rook', 'knight'].includes(move.target) ||
                   (move.target === 'pawn' && 
                    move.orig[0] === move.dest[0] &&
                    ((this.turn === 'white' && 
                      move.orig[1] > move.dest[1]) ||
                     (this.turn === 'black' &&
                      move.orig[1] < move.dest[1]))
                   ) ||
                   (move.target === 'bishop' && 
                    sameColor(move.orig, [move.dest[0], prom])
                   )
                  ) 
                 )
                );                        
        }

        return !!this.squares.get(toCoord(move.orig)).blinks.get(
            pieceToChar({role: move.target, color: this.turn}));
    }

    makeMove(move: ttc.Move): boolean {
        if(!this.canMakeMove(move))
            return false;

        const piece = this.squares.get(toCoord(move.orig)).piece;
        const basicTarget: ttc.Piece = {
            role: move.target ?? 'king',
            color: this.turn
        };

        if(piece?.tapped) 
            basicTarget.tapped = {
                target: piece.tapped.target,
                role: piece.tapped.role
            }

        const targetName = pieceToChar(basicTarget);

        const r = this.turn === 'white' ? 1 : 8;

        if(piece) {
            const cap = this.squares.get(toCoord(move.dest)).piece;

            if(piece.role === 'pawn' || cap) {
                this.halfmoves = 0;
            } else {
                this.halfmoves++;
            }

            if(cap?.role === 'king')
                this.killer ??= this.turn;

            this.squares.get(toCoord(move.orig)).piece = null;

            this.squares.get(toCoord(move.dest)).piece = 
                move.target ? basicTarget : piece;

            if(piece.role === 'pawn' &&
                move.dest[0] === this.enpassant && 
                move.dest[1] === (this.turn === 'white' ? 6 : 3)) {
                this.squares.get(toCoord([move.dest[0], move.orig[1]]))
                    .piece = null;
            }

            if(piece.role === 'king') {
                this.castling.short[this.turn] = false;
                this.castling.long[this.turn] = false;

                if(move.orig[0] - move.dest[0] === 2) {
                    this.squares.get(toCoord([4, r])).piece = 
                    this.squares.get(toCoord([1, r])).piece;

                    this.squares.get(toCoord([1, r])).piece = null;
                }

                if(move.dest[0] - move.orig[0] === 2) {
                    this.squares.get(toCoord([6, r])).piece = 
                    this.squares.get(toCoord([8, r])).piece;

                    this.squares.get(toCoord([8, r])).piece = null;
                }
            }

            if(move.orig === [8, r]) 
                this.castling.short[this.turn] = false;
        
            if(move.orig === [1, r]) 
                this.castling.long[this.turn] = false;

            if(piece.role === 'pawn' && 
                Math.abs(move.orig[1] - move.dest[1]) === 2 &&
                !move.blinks.includes(move.dest)) {
                this.enpassant = move.orig[0];
            } else {
                this.enpassant = 0;
            }
        } else {
            if(move.dest) {
                const piece = this.squares.get(toCoord(move.dest)).piece;
                
                this.squares.get(toCoord(move.orig)).piece = {
                    role: move.target ?? piece.role,
                    color: piece.color
                }

                this.squares.get(toCoord(move.dest)).piece = {
                    role: piece.role,
                    color: piece.color,
                    tapped: {
                        target: move.orig,
                        role: move.target ?? piece.role
                    }
                }

                if(piece.role === 'pawn') {
                    this.halfmoves = 0;
                } else {
                    this.halfmoves++;
                }
            } else {
                const k = this.squares.get(toCoord(move.orig))
                    .blinks.get(targetName);
                this.squares.get(toCoord(move.orig))
                    .blinks.set(targetName, k - 1);

                this.squares.get(toCoord(move.orig)).piece = basicTarget;
            }

            this.enpassant = 0;
        }

        move.blinks.forEach(key => {
            if(sameKey(key, move.orig)) 
                key = move.dest;

            const piece = this.squares.get(toCoord(key)).piece;
            
            this.squares.get(toCoord(key)).piece = null;

            if(piece.tapped) return;      

            incrementBlinks(this.squares.get(toCoord(key)).blinks,
                {role: piece.role, color: piece.color});
            
            if(key === [8, r]) 
                this.castling.short[this.turn] = false;
        
            if(key === [1, r]) 
                this.castling.long[this.turn] = false; 
        });

        this.turn = opposite(this.turn);
        if(this.turn === 'white') this.fullmoves++;

        return true;
    }

    isResolved(color: ttc.Color): boolean {
        return ![...this.squares].some(([_, square]) => 
            [...square.blinks].some(([c, n]) => 
                charToPiece(c).color === color && n) ||
            (square.piece?.tapped &&
                square.piece.color === color)
        );
    }

    canWin(): boolean {
        const blinks = [...this.squares]
            .filter(([_, sq]) => sq.piece?.tapped &&
                sq.piece.color === this.turn)

        const wrongs = blinks.filter(([coord, sq]) => 
            coord !== toCoord(sq.piece.tapped.target) ||
            sq.piece.role !== sq.piece.tapped.role);

        const unblinks = [...this.squares]
            .flatMap(([coord, sq]) => [...sq.blinks]
                .flatMap(([p, n]) => charToPiece(p).color === this.turn ?
                    Array.from({length: n}, _ => coord) : []));

        if(unblinks.length + wrongs.length >= 2) return false;

        if(wrongs.length) {
            const [coord, sq] = wrongs.at(0);

            const dream = this.copy();

            return dream.makeMove({
                orig: toKey(coord),
                dest: sq.piece.tapped.target,
                target: sq.piece.tapped.role !== sq.piece.role ? 
                    sq.piece.tapped.role : null,
                blinks: blinks.map(([c, _]) => toKey(c))
            }) && dream.killer === this.turn;
        }

        if(unblinks.length) {
            const coord = unblinks.at(0)

            return this.isEmpty(toKey(coord)) && 
                this.killer === this.turn;
        }       

        const canKill = this.killer === this.turn || (!this.killer 
            && [...this.squares]
            .filter(([_, square]) => square.piece?.color === this.turn)
            .flatMap(([coord, _]) => this.basicDests(toKey(coord)))
            .some(dest => 
                this.squares.get(toCoord(dest)).piece?.role === 'king'));

        return canKill && [...this.squares].some(([coord, sq]) => 
            sq.piece && !sq.piece.tapped &&
            this.basicDests(toKey(coord)).length);
    }

    isLegal(move: ttc.Move): boolean {
        const dream = this.copy();

        if(!dream.makeMove(move))
            return false; 
        
        const castlePath: ttc.Key[] = (
            this.squares.get(toCoord(move.orig))?.piece?.role === 'king'
            && move.orig[1] === move.dest[1] 
            && Math.abs(move.orig[0] - move.dest[0]) === 2) ?
            [[move.orig[0], move.orig[1]], 
             [(move.orig[0] + move.dest[0]) >> 1, move.orig[1]],
             [move.dest[0], move.orig[1]]] : [];

        return !dream.canWin() && ![...dream.squares]
            .filter(([_, square]) => square.piece?.color === dream.turn)
            .flatMap(([coord, _]) => dream.basicDests(toKey(coord)))
            .some(dest => (piece => piece?.tapped || 
                    (piece?.role === 'king' && !dream.killer
                    && dream.isResolved(dream.turn))
                )(dream.squares.get(toCoord(dest)).piece) || 
                    castlePath.some(key => sameKey(key, dest)));
    }

    legalDests(orig: ttc.Key, blinks: ttc.Key[]): ttc.Key[] {
        const piece = this.squares.get(toCoord(orig))?.piece;
        
        if(!piece) return [];

        const target: ttc.Role = (piece.role === 'pawn' && 
            orig[1] === (piece.color === 'white' ? 7 : 2))? 
            (piece.tapped?.role ?? 'queen') : null;

        return this.basicDests(orig)
            .filter(dest => this.isLegal({
                orig, dest, target, blinks
            }))
    }

    legalTaps(orig: ttc.Key, blinks: ttc.Key[]): ttc.Key[] {
        if(!this.isEmpty(orig)) return [];
        
        return [...this.squares].filter(([coord, sq]) => 
            this.isLegal({orig, dest: toKey(coord), blinks,
                target: sq.piece?.role === 'pawn' ?
                'queen' : null}))
                .map(([coord, _]) => toKey(coord));
    }

    hasLegalPlays(blinks: ttc.Key[]): boolean {
        return [...this.squares].some(([coord, _]) => 
            this.legalDests(toKey(coord), blinks).length)
    }

    hasLegalTaps(blinks: ttc.Key[]): boolean {
        return [...this.squares].some(([coord, _]) => 
            this.legalTaps(toKey(coord), blinks).length)
    }

    hasLegalMoves(blinks: ttc.Key[]): boolean {
        const taps = [...this.squares]
            .filter(([_, sq]) => sq.piece?.tapped &&
                sq.piece.color === this.turn)

        const comBlinks = blinks.concat(taps.filter(([coord, sq]) => 
            coord === toCoord(sq.piece.tapped.target) &&
            sq.piece.role === sq.piece.tapped.role &&
            !blinks.some(key => toCoord(key) === coord)) 
                .map(([coord, _]) => toKey(coord)));

        const wrongs = taps.filter(([coord, sq]) => 
            coord !== toCoord(sq.piece.tapped.target) ||
            sq.piece.role !== sq.piece.tapped.role);

        return this.hasLegalPlays(comBlinks) ||
            this.hasLegalTaps(comBlinks) ||
            wrongs.some(([coord, sq]) => 
                this.isLegal({
                    orig: toKey(coord),
                    dest: sq.piece.tapped.target,
                    target: sq.piece.tapped.role !== sq.piece.role ? 
                        sq.piece.tapped.role : null,
                    blinks: comBlinks.concat([toKey(coord)])
                })
            );
    }

    canBlink(orig: ttc.Key, blinks: ttc.Key[]): boolean {
        return inBounds(orig) && 
            !blinks.some(key => sameKey(key, orig)) &&
            this.squares.get(toCoord(orig))?.piece?.color === this.turn &&
            this.hasLegalMoves(blinks.concat([orig]));
    }

    /*
    inCheck(): boolean {
        const dream = this.copy();

        dream.turn = opposite(this.turn);

        return ![...dream.squares]
            .filter(([_, square]) => square.piece?.color === dream.turn)
            .flatMap(([coord, _]) => dream.basicDests(toKey(coord)))
            .some(dest => (piece => piece?.tapped || 
                    (piece?.role === 'king' && dream.isResolved(dream.turn))
                )(dream.squares.get(toCoord(dest)).piece));
    }
    */

    result(): ttc.Color | 'draw' | 'none' {
        if(this.hasLegalMoves([])) return 'none';

        if(!this.isResolved) return opposite(this.turn);

        return 'draw';
    }
}