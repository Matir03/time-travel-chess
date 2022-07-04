export const roles = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'] as const;
export const syms = ['K', 'Q', 'R', 'B', 'N', 'P'] as const;

export type Role = typeof roles[number];
export type Sym = typeof syms[number];

export const role2sym: Record<Role, Sym> = {
    king: 'K',
    queen: 'Q',
    rook: 'R',
    bishop: 'B',
    knight: 'N',
    pawn: 'P'
}

export const sym2role: Record<Sym, Role> = {
    K: 'king',
    Q: 'queen',
    R: 'rook',
    B: 'bishop',
    N: 'knight',
    P: 'pawn'
}

const colors = ['white', 'black'] as const;

export type Color = typeof colors[number];
export type Key = [number, number];

export interface Piece {
    role: Role;
    color: Color;
    tapped?: {
        target: Key,
        role: Role 
    }
}

export type Blinks = Map<string, number>;

export interface Square {
    piece?: Piece;
    blinks: Blinks;
}

export interface Move {
    orig: Key;
    dest?: Key;
    target?: Role;
    blinks: Key[];
}

export type Castling = Record<'short' | 'long', Record<Color, boolean>>;