import { h, Hooks, VNode } from 'snabbdom';
import { Api as CgApi } from './chessground/api';
import * as cgUtil from './chessground/util';
import * as cg from './chessground/types';

type Key = cg.Key;
type Color = cg.Color;

function onInsert<A extends HTMLElement>(f: (element: A) => void): Hooks {
    return {
        insert: vnode => f(vnode.elm as A),
    };
}

function bind(eventName: string, f: (e: Event) => any, 
    redraw?: () => void, passive = true): Hooks {
    return onInsert(el =>
        el.addEventListener(
        eventName,
        e => {
            const res = f(e);
            if (res === false) e.preventDefault();
            redraw?.();
            return res;
        },
        { passive }
        )
    );
}

export type Callback = (role: cg.Role) => void;

interface Selecting {
  dest: Key
  roles: cg.Role[];
  color: cg.Color;
  callback: Callback;
  onCancel: () => void;
}

export class PieceSelector {
  private selecting?: Selecting;

  constructor(
    private withGround: <A>(f: (cg: CgApi) => A) => A,
    private redraw: () => void,
  ) {}

  start = (dest: Key, roles: cg.Role[], color: cg.Color, callback: Callback, 
      onCancel: () => void = () => {}) : boolean =>
    this.withGround(g => {
        this.selecting = { dest, roles, color, callback, onCancel };
        this.redraw();
        return true;
     }) || false;

  cancel = (): void => {
    if (this.selecting) {
      this.selecting.onCancel();
      this.selecting = undefined;
      this.redraw();
    }
  };

  view = (): VNode => {
    const selecting = this.selecting;
    if (!selecting) return;
    return (
      this.withGround(g =>
        this.renderSelection(
          selecting.dest,
          selecting.roles,
          selecting.color,
          g.state.orientation
        )
      )
    );
  };

  private finish(role: cg.Role): void {
    const selecting = this.selecting;
    if (selecting) {
      this.selecting = undefined;
      selecting.callback(role);
      this.redraw();
    }
  }

  private renderSelection(dest: Key, pieces: cg.Role[], 
    color: Color, orientation: Color): VNode {
    let left = (7 - cgUtil.key2pos(dest)[0]) * 12.5;
    if (orientation === 'white') left = 87.5 - left;

    const vertical = color === orientation ? 'top' : 'bottom';

    return h(
      'div#promotion-choice.' + vertical,
      {
        hook: onInsert(el => {
          el.addEventListener('click', this.cancel);
          el.oncontextmenu = () => false;
        }),
      },
      pieces.map((serverRole, i) => {
        const top = (color === orientation ? i : 7 - i) * 12.5;
        return h(
          'square',
          {
            attrs: {
              style: 'top: ' + top + '%;left: ' + left + '%',
            },
            hook: bind('click', e => {
              e.stopPropagation();
              this.finish(serverRole);
            }),
          },
          [h('piece.' + serverRole + '.' + color)]
        );
      })
    );
  }
}