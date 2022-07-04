import { State } from './state';
import { unselect, getKeyAtDomPos, whitePov } from './board';
import { eventPosition } from './util';
import { render } from './render';

export function blink(s: State, e: Event) {
    e.stopPropagation();
    e.preventDefault();
    unselect(s);

    if(s.turnColor !== s.movable.color) return;
    
    const pos = eventPosition(e)!,
        key = getKeyAtDomPos(pos, whitePov(s), s.dom.bounds()),
        piece = s.pieces.get(key);

    if(!piece) {
        s.blinkable.unblinker(key);
        
        return;
    }

    if(!s.blinkable.keys.includes(key)) return;

    piece.blinking = !piece.blinking;

    s.blinkable.onBlink(key);

    render(s);
}