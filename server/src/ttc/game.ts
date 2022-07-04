import * as ttc from './types.js';
import { Board } from './board.js';

export const startingFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - - 0 1";

export class Game {

    board: Board;
    ply: number;
    fens: string[];
    moves: ttc.Move[];

    constructor(moves: ttc.Move[] = []) {
        this.moves = [];
        this.fens = [startingFEN];
        this.board = Board.fromFEN(startingFEN);
        this.ply = 0;

        moves.forEach(move => this.makeMove(move));
    }

    makeMove(move: ttc.Move): boolean {
        if(!this.board.isLegal(move)) 
            return false;
        
        this.board.makeMove(move);

        this.moves.splice(this.ply);
        this.fens.splice(this.ply + 1);
        
        this.ply += 1;
        this.moves.push(move);
        this.fens.push(this.board.toFEN());

        return true;
    }

    gotoPly(newPly: number) {
        this.board = Board.fromFEN(this.fens[newPly]);
        this.ply = newPly;
    }

    toJSON() {
        return this.moves;
    }
}