import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DIR_DELTA, type Dir, type StepResult, parseMap, safeStartPosition, tryStep } from '../domain/field/movement';
import { useGameStore } from '../store/useGameStore';
import { TouchPad } from './TouchPad';
import { drawField, viewScale } from './fieldRenderer';
import { MEADOW_ROWS, MEADOW_SIGNS } from './maps/meadow';
import { STEP_MS, TILE_PX, TURN_TAP_MS } from './padDirection';
import './field.css';

const MEADOW = parseMap('meadow', MEADOW_ROWS, { exits: { '<': 'waterside', '>': 'desert' }, signTexts: MEADOW_SIGNS });

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right',
};

interface Props {
  /** 걸음이 끝날 때마다 불린다 (나중에 만남 연결에 쓴다) */
  onStep?: (result: StepResult) => void;
}

interface Move {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  start: number;
  result: StepResult;
}

export function FieldScreen({ onStep }: Props) {
  const navigate = useNavigate();
  const map = MEADOW;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signText, setSignText] = useState<string | null>(null);

  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;

  // 입력·걸음 상태는 React 밖(ref)에 둔다
  const st = useRef({
    x: 0,
    y: 0,
    facing: 'down' as Dir,
    move: null as Move | null,
    padDir: null as Dir | null,
    keys: [] as Dir[],
    lastHeld: null as Dir | null,
    heldSince: 0,
    needTurn: false,
    signOpen: false,
  });
  const init = useRef(false);
  if (!init.current) {
    init.current = true;
    const p = safeStartPosition(map, useGameStore.getState().field.position);
    Object.assign(st.current, { x: p.x, y: p.y, facing: p.facing });
  }

  const save = useCallback(() => {
    const s = st.current;
    useGameStore.getState().setFieldPosition({ map: 'meadow', x: s.x, y: s.y, facing: s.facing });
  }, []);

  const press = useCallback(
    (kind: 'A' | 'B') => {
      const s = st.current;
      if (s.signOpen) {
        s.signOpen = false;
        setSignText(null);
        return;
      }
      if (kind === 'B' || s.move) return;
      const d = DIR_DELTA[s.facing];
      const sign = map.signs.find((g) => g.pos.x === s.x + d.x && g.pos.y === s.y + d.y);
      if (sign) {
        s.signOpen = true;
        setSignText(sign.text);
      }
    },
    [map],
  );
  const pressRef = useRef(press);
  pressRef.current = press;

  const setPadDir = useCallback((d: Dir | null) => {
    st.current.padDir = d;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext('2d')!;
    const s = st.current;
    let raf = 0;
    let view = { tile: TILE_PX, w: 1, h: 1 };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      view = { tile: viewScale(r.width) * TILE_PX * dpr, w: canvas.width, h: canvas.height };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const held = (): Dir | null => s.padDir ?? s.keys[s.keys.length - 1] ?? null;
    const clearInput = () => {
      s.padDir = null;
      s.keys = [];
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const d = KEY_DIR[e.key];
      if (d) {
        e.preventDefault();
        s.keys = [...s.keys.filter((k) => k !== d), d];
      } else if (e.key === 'z' || e.key === 'Z') pressRef.current('A');
      else if (e.key === 'x' || e.key === 'X') pressRef.current('B');
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const d = KEY_DIR[e.key];
      if (d) s.keys = s.keys.filter((k) => k !== d);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInput);

    let paused = document.hidden;
    const onVis = () => {
      paused = document.hidden;
      if (paused) clearInput();
    };
    document.addEventListener('visibilitychange', onVis);

    const finishMove = () => {
      const m = s.move!;
      s.x = m.tx;
      s.y = m.ty;
      s.move = null;
      save();
      onStepRef.current?.(m.result);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (paused) return;
      if (s.move && now - s.move.start >= STEP_MS) finishMove();
      if (!s.move) {
        const h = s.signOpen ? null : held();
        if (h !== s.lastHeld) {
          s.lastHeld = h;
          s.heldSince = now;
          s.needTurn = h !== null && h !== s.facing;
          if (h) s.facing = h;
        }
        if (h && (!s.needTurn || now - s.heldSince >= TURN_TAP_MS)) {
          const result = tryStep(map, { x: s.x, y: s.y }, h);
          if (result.moved) s.move = { fx: s.x, fy: s.y, tx: result.pos.x, ty: result.pos.y, start: now, result };
        }
      }
      let hx = s.x;
      let hy = s.y;
      if (s.move) {
        const t = Math.min(1, (now - s.move.start) / STEP_MS);
        hx = s.move.fx + (s.move.tx - s.move.fx) * t;
        hy = s.move.fy + (s.move.ty - s.move.fy) * t;
      }
      drawField(ctx, map, view, hx, hy, s.facing);
      canvas.dataset.pos = `${s.x},${s.y}`;
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInput);
      document.removeEventListener('visibilitychange', onVis);
      if (s.move) {
        s.x = s.move.tx;
        s.y = s.move.ty;
        s.move = null;
      }
      save();
    };
  }, [map, save]);

  return (
    <section className="field">
      <div className="field__view" ref={wrapRef}>
        <canvas ref={canvasRef} className="field__canvas" data-testid="field-canvas" />
        <button type="button" className="btn btn--ghost field__menu-btn" onClick={() => setMenuOpen((v) => !v)}>
          메뉴
        </button>
        {menuOpen && (
          <div className="field__menu" role="menu">
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/')}>
              처음 화면
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setMenuOpen(false)}>
              닫기
            </button>
          </div>
        )}
        {signText && (
          <div className="field__text" role="dialog" aria-label="표지판">
            {signText}
          </div>
        )}
      </div>
      <TouchPad onDir={setPadDir} onA={() => pressRef.current('A')} onB={() => pressRef.current('B')} />
    </section>
  );
}
