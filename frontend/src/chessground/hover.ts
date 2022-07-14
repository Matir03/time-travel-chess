import { render } from "./render";
import { State } from "./state";
import { Key, MouchEvent } from "./types";
import * as board from './board';
import * as util from './util';

let timeout: NodeJS.Timeout, 
    lastKey: Key;

export function handleHover(s: State, e: MouchEvent) {
    if(e.type !== 'mousemove' || e.buttons) {
        unhover(s);
        lastKey = null;
        return;
    }

    const bounds = s.dom.bounds(),
        position = util.eventPosition(e)!,
        orig = board.getKeyAtDomPos(position, board.whitePov(s), bounds),
        piece = s.pieces.get(orig);

    if(lastKey === orig) return;

    lastKey = orig;

    if (!piece?.tapped) {
        unhover(s);
        return;
    }

    s.hover = {
        target: piece.tapped.target,
        piece: {
            role: piece.tapped.role ?? piece.role,
            color: piece.color
        }
    }
    render(s);

    timeout = setTimeout(unhover, 3000, s);
}

export function unhover(s: State) {
    if(timeout) {
        clearTimeout(timeout);
        timeout = null; 
    }

    if(!s.hover) return;

    s.hover = null;
    render(s);
}