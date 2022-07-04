import { Board } from './board.js';
export const startingFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - - 0 1";
export class Game {
    constructor(moves = []) {
        this.moves = [];
        this.fens = [startingFEN];
        this.board = Board.fromFEN(startingFEN);
        this.ply = 0;
        moves.forEach(move => this.makeMove(move));
    }
    makeMove(move) {
        if (!this.board.isLegal(move))
            return false;
        this.board.makeMove(move);
        this.moves.splice(this.ply);
        this.fens.splice(this.ply + 1);
        this.ply += 1;
        this.moves.push(move);
        this.fens.push(this.board.toFEN());
        return true;
    }
    gotoPly(newPly) {
        this.board = Board.fromFEN(this.fens[newPly]);
        this.ply = newPly;
    }
    toJSON() {
        return this.moves;
    }
}
