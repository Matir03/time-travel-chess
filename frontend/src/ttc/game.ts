import * as ttc from './types';
import { Board } from './board';

export class Game {

    board: Board;
    ply: number;

    constructor(public moves: ttc.Move[]) {
        this.board = new Board();
        this.ply = 0;

        moves.forEach(move => this.makeMove(move));
    }

    makeMove(move: ttc.Move) {
        this.moves.splice(this.ply);
        this.moves.concat(move);

        this.ply += 1;

        this.board.makeMove(move);
    }

    gotoPly(newPly: number) {
        this.moves
            .slice(newPly >= this.ply ? this.ply : 0, newPly)
            .forEach(move => this.makeMove(move));

        this.ply = newPly;
    }
}