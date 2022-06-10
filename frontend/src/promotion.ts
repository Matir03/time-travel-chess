import { h, Hooks, VNode } from 'snabbdom';
import { Api as CgApi } from './chessground/api';
import { DrawShape } from './chessground/draw';
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

export type Callback = (orig: Key, dest: Key, role: cg.Role) => void;

interface Promoting {
  orig: Key;
  dest: Key;
  roles: cg.Role[];
  pre: boolean;
  callback: Callback;
}

export function promote(g: CgApi, key: Key, role: cg.Role): void {
  const piece = g.state.pieces.get(key);
  if (piece && piece.role == 'pawn') {
    g.setPieces(
      new Map([
        [
          key,
          {
            color: piece.color,
            role,
            tapped: piece.tapped,
            promoted: true,
          },
        ],
      ])
    );
  }
}

export class PromotionCtrl {
  private promoting?: Promoting;
  private prePromotionRole?: cg.Role;

  constructor(
    private withGround: <A>(f: (cg: CgApi) => A) => A,
    private onCancel: () => void,
    private redraw: () => void,
  ) {}

  start = (orig: Key, dest: Key, roles: cg.Role[], 
    callback: Callback, meta?: cg.MoveMetadata, forceAutoQueen = false): boolean =>
    this.withGround(g => {
      const premovePiece = g.state.pieces.get(orig);
      const piece = premovePiece || g.state.pieces.get(dest);
      if (
        piece?.role == 'pawn' &&
        ((dest[1] == '8' && g.state.turnColor == 'black') || (dest[1] == '1' && g.state.turnColor == 'white'))
      ) {
        if (this.prePromotionRole && meta?.premove) {
          this.doPromote({ orig, dest, callback, roles }, this.prePromotionRole);
          return true;
        }
        if (
          !meta?.ctrlKey &&
          !this.promoting &&
          forceAutoQueen
        ) {
          if (premovePiece) this.setPrePromotion(dest, 'queen');
          else this.doPromote({ orig, dest, callback, roles }, 'queen');
          return true;
        }
        this.promoting = { orig, dest, roles, pre: !!premovePiece, callback };
        this.redraw();
        return true;
      }
      return false;
    }) || false;

  cancel = (): void => {
    this.cancelPrePromotion();
    if (this.promoting) {
      this.promoting = undefined;
      this.onCancel();
      this.redraw();
    }
  };

  cancelPrePromotion = (): void => {
    if (this.prePromotionRole) {
      this.withGround(g => g.setAutoShapes([]));
      this.prePromotionRole = undefined;
      this.redraw();
    }
  };

  view = (): VNode => {
    const promoting = this.promoting;
    if (!promoting) return;
    return (
      this.withGround(g =>
        this.renderPromotion(
          promoting.dest,
          promoting.roles,
          cgUtil.opposite(g.state.turnColor),
          g.state.orientation
        )
      )
    );
  };

  private finish(role: cg.Role): void {
    const promoting = this.promoting;
    if (promoting) {
      this.promoting = undefined;
      if (promoting.pre) this.setPrePromotion(promoting.dest, role);
      else this.doPromote(promoting, role);
      this.redraw();
    }
  }

  private doPromote(promoting: Omit<Promoting, 'pre'>, role: cg.Role): void {
    this.withGround(g => promote(g, promoting.dest, role));
    promoting.callback(promoting.orig, promoting.dest, role);
  }

  private setPrePromotion(dest: cg.Key, role: cg.Role): void {
    this.prePromotionRole = role;
    this.withGround(g =>
      g.setAutoShapes([
        {
          orig: dest,
          piece: {
            color: cgUtil.opposite(g.state.turnColor),
            role,
            opacity: 0.8,
          },
          brush: '',
        } as DrawShape,
      ])
    );
  }

  private renderPromotion(dest: Key, pieces: cg.Role[], 
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