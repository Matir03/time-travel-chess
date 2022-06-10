import { State } from './state';
import { unselect, getKeyAtDomPos, whitePov } from './board';
import { eventPosition } from './util';
import { render } from './render';

export function blink(s: State, e: Event) {
    e.stopPropagation();
    e.preventDefault();
    unselect(s);
    
    const pos = eventPosition(e)!,
        orig = getKeyAtDomPos(pos, whitePov(s), s.dom.bounds()),
        piece = s.pieces.get(orig);

    if(!piece) return;

    if(piece.color !== s.turnColor) return;

    piece.blinking = !piece.blinking;

    render(s);
}