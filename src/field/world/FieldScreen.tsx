import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { companionStart, type Dir, type FieldMap, type StepResult, safeStartPosition, tryStep } from '../../domain/field/movement';
import { displayName } from '../../domain/field/growth';
import { useSessionStore } from '../../store/useSessionStore';
import { companionImage } from '../art/companionImage';
import { creatureArt } from '../art/creatureArt';
import { STAGE_SCALE } from '../art/creatureSprite';
import { playFx, preloadFx, prefersReducedMotion } from '../fx/playFx';
import type { FieldId } from '../../domain/field/fields';
import { stepOnTile } from '../../domain/field/encounter';
import { ENCOUNTER_FLASH_MS, STEP_MS, TURN_TAP_MS } from '../../domain/field/tuning';
import { debugFlags } from '../debugFlags';
import { useGameStore } from '../../store/useGameStore';
import { Joystick } from './Joystick';
import { type Companion, drawField, viewScale } from './fieldRenderer';
import { FieldLoading } from './FieldLoading';
import { OFFLINE_MESSAGE, getLoadedField, loadField, travelTo } from './loadField';
import { TILE_PX } from './padDirection';
import { enterField, leaveBattleReturn, useFieldSession } from '../useFieldSession';
import './field.css';

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};
/** 글쇠 위치(code)로 읽는다 — 한글 자판에서도 WASD가 그대로 움직인다 */
const CODE_DIR: Record<string, Dir> = {
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};
const keyDir = (e: KeyboardEvent): Dir | undefined => KEY_DIR[e.key] ?? CODE_DIR[e.code];

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

/** 첫 구구몬을 아직 안 골랐으면 고르러 간다 */
export function FieldScreen(props: Props) {
  const starterChosen = useGameStore((s) => s.field.starterChosen);
  if (!starterChosen) return <Navigate to="/field/starter" replace />;
  return <FieldRoot {...props} />;
}

/** 지금 있는 필드의 지도를 불러와 보여주고, 출구를 지나면 다음 필드를 불러온다 */
function FieldRoot(props: Props) {
  const navigate = useNavigate();
  const [map, setMap] = useState<FieldMap | null>(() => getLoadedField(useGameStore.getState().field.position.map) ?? null);
  const [loadingTo, setLoadingTo] = useState<FieldId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // 처음 들어올 때 지도가 아직 없으면 저장된 필드를 불러온다 (필드 사이 이동은 goTo가 한다)
  const needBoot = useRef(map === null);
  useEffect(() => {
    if (!needBoot.current) return;
    let alive = true;
    const id = useGameStore.getState().field.position.map;
    setLoadingTo(id);
    loadField(id).then(
      (m) => {
        if (!alive) return;
        needBoot.current = false;
        setLoadingTo(null);
        setMap(m);
      },
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const goTo = useCallback(
    (to: FieldId) => {
      const from = map;
      if (!from) return;
      setNotice(null);
      setLoadingTo(to);
      setMap(null);
      travelTo(from, to).then((r) => {
        if (!alive.current) return;
        // 필드 화면이 내려가며 저장한 출구 자리를 덮어쓴다
        useGameStore.getState().setFieldPosition(r.position);
        if (r.ok) setMap(r.map);
        else {
          setMap(from);
          setNotice(OFFLINE_MESSAGE);
        }
        setLoadingTo(null);
      });
    },
    [map],
  );

  if (failed)
    return (
      <section className="fieldmode floading">
        <div className="floading__name">{OFFLINE_MESSAGE}</div>
        <button type="button" className="btn" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }}>
          다시 해보기
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/')}>
          처음 화면
        </button>
      </section>
    );
  if (!map) return <FieldLoading field={loadingTo ?? useGameStore.getState().field.position.map} />;
  return <FieldView key={map.id + attempt + (notice ?? '')} map={map} onExit={goTo} notice={notice} {...props} />;
}

function FieldView({ map, onExit, notice, onStep }: Props & { map: FieldMap; onExit: (to: FieldId) => void; notice: string | null }) {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signText, setSignText] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  /** 전투로 넘어가는 별 조리개 (동작 줄이기면 예전처럼 번쩍임만) */
  const [iris, setIris] = useState(false);
  const irisRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => preloadFx('enter'), []);
  useEffect(() => {
    if (iris && irisRef.current) void playFx(irisRef.current, 'enter');
  }, [iris]);

  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

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
    /** 방금 부딪힌 칸과 그때 잡은 방향 — 같은 방향을 계속 눌러도 글이 다시 열리지 않게 */
    lastBump: null as { key: string; dir: Dir } | null,
    /** 만남이 정해지면 더 걷지 않는다 */
    frozen: false,
    /** 동행이 서 있는 칸 (걸음이 끝날 때마다 주인공이 방금 떠난 칸으로) */
    cx: 0,
    cy: 0,
    /** 알림 창이 떠 있으면 걷지 않는다 */
    noticeOpen: false,
  });
  const init = useRef(false);
  if (!init.current) {
    init.current = true;
    enterField();
    const p = safeStartPosition(map, useGameStore.getState().field.position);
    const c = companionStart(map, p, p.facing);
    Object.assign(st.current, { x: p.x, y: p.y, facing: p.facing, cx: c.x, cy: c.y });
  }

  const notice0 = useSessionStore((s) => s.pendingFieldNotices[0] ?? null);
  st.current.noticeOpen = notice0 !== null;
  const noticeStage = useGameStore((s) => (notice0 ? s.field.species[notice0.species]?.stage ?? 1 : 1));
  const dismissNotice = useCallback(() => {
    const ss = useSessionStore.getState();
    ss.set({ pendingFieldNotices: ss.pendingFieldNotices.slice(1) });
  }, []);
  const dismissRef = useRef(dismissNotice);
  dismissRef.current = dismissNotice;

  const save = useCallback(() => {
    const s = st.current;
    useGameStore.getState().setFieldPosition({ map: map.id, x: s.x, y: s.y, facing: s.facing });
  }, [map.id]);

  /** 화면을 가볍게 탭: 알림이 떠 있으면 닫고, 표지판 글이 떠 있으면 닫는다 */
  const onTap = useCallback((): boolean => {
    const s = st.current;
    if (s.noticeOpen) {
      dismissRef.current();
      return true;
    }
    if (s.signOpen) {
      s.signOpen = false;
      setSignText(null);
      return true;
    }
    return false;
  }, []);

  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  /** 걸음마다 만남 주사위(풀숲 30%·길 4%) → 만나면 멈추고 번쩍인 뒤 전투 화면으로 */
  const checkEncounter = useCallback((result: StepResult) => {
    leaveBattleReturn();
    if (!result.moved) return;
    const session = useFieldSession.getState();
    const { field, learning } = useGameStore.getState();
    const flags = debugFlags();
    const r = stepOnTile(Math.random, {
      tile: result.tile,
      field: map.id,
      stepsSinceBattle: session.stepsSinceBattle,
      challengeUnlocked: learning.challengeUnlocked,
      seen: field.seen,
      force: { grass: flags.encounter, path: flags.path, legend: flags.legend, noWild: flags.noWild },
    });
    session.set({ stepsSinceBattle: r.stepsSinceBattle, encounter: r.encounter });
    if (!r.encounter) return;
    st.current.frozen = true;
    if (prefersReducedMotion()) setFlash(true);
    else setIris(true);
    flashTimer.current = window.setTimeout(() => navigate('/field/battle'), ENCOUNTER_FLASH_MS);
  }, [navigate, map.id]);
  const flashTimer = useRef(0);
  useEffect(() => () => clearTimeout(flashTimer.current), []);
  const checkRef = useRef(checkEncounter);
  checkRef.current = checkEncounter;

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
      view = { tile: viewScale(r.width, r.height, map.width, map.height) * TILE_PX * dpr, w: canvas.width, h: canvas.height };
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
      const d = keyDir(e);
      if (d) {
        e.preventDefault();
        s.keys = [...s.keys.filter((k) => k !== d), d];
      } else if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
        // 버튼·입력칸에 포커스가 있으면 브라우저 기본 동작(Enter·Space로 누르기)을 그대로 둔다
        const t = e.target as HTMLElement | null;
        if (t?.closest?.('button, input, textarea, select, a') || t?.isContentEditable) return;
        // 글·알림을 실제로 닫았을 때만 기본 동작을 막는다
        if (onTapRef.current()) e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const d = keyDir(e);
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
      s.cx = m.fx;
      s.cy = m.fy;
      s.x = m.tx;
      s.y = m.ty;
      s.move = null;
      save();
      if (m.result.exitTo) {
        // 출구를 지났다: 더 걷지 않고 다음 필드로
        leaveBattleReturn();
        s.frozen = true;
        onStepRef.current?.(m.result);
        onExitRef.current(m.result.exitTo);
        return;
      }
      checkRef.current(m.result);
      onStepRef.current?.(m.result);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (paused) return;
      if (s.move && now - s.move.start >= STEP_MS) finishMove();
      if (!s.move) {
        // 부딪힘은 방향을 떼거나 바꿔야 다시 반응한다
        if (s.lastBump && held() !== s.lastBump.dir) s.lastBump = null;
        const h = s.signOpen || s.frozen || s.noticeOpen ? null : held();
        if (h !== s.lastHeld) {
          s.lastHeld = h;
          s.heldSince = now;
          s.needTurn = h !== null && h !== s.facing;
          if (h) s.facing = h;
        }
        if (h && (!s.needTurn || now - s.heldSince >= TURN_TAP_MS)) {
          const result = tryStep(map, { x: s.x, y: s.y }, h);
          if (result.moved) {
            s.lastBump = null;
            s.move = { fx: s.x, fy: s.y, tx: result.pos.x, ty: result.pos.y, start: now, result };
          } else if (result.bump) {
            const b = result.bump;
            const key = `${b.x},${b.y}`;
            if (s.lastBump?.key !== key) {
              s.lastBump = { key, dir: h };
              const sign = map.signs.find((g) => g.pos.x === b.x && g.pos.y === b.y);
              if (sign) {
                s.signOpen = true;
                setSignText(sign.text);
              }
            }
          }
        }
      }
      let hx = s.x;
      let hy = s.y;
      if (s.move) {
        const t = Math.min(1, (now - s.move.start) / STEP_MS);
        hx = s.move.fx + (s.move.tx - s.move.fx) * t;
        hy = s.move.fy + (s.move.ty - s.move.fy) * t;
      }
      let comp: Companion | undefined;
      const { companion: compId, species } = useGameStore.getState().field;
      if (compId) {
        const t = s.move ? Math.min(1, (now - s.move.start) / STEP_MS) : 0;
        const fromX = s.move ? s.cx + (s.move.fx - s.cx) * t : s.cx;
        const fromY = s.move ? s.cy + (s.move.fy - s.cy) * t : s.cy;
        const art = creatureArt(compId);
        comp = { x: fromX, y: fromY, img: companionImage(compId), scale: STAGE_SCALE[species[compId]?.stage ?? 1], fill: art.fill, foot: art.foot };
      }
      const stepT = s.move ? Math.min(1, (now - s.move.start) / STEP_MS) : null;
      drawField(ctx, map, view, hx, hy, s.facing, comp, { now, step: stepT });
      canvas.dataset.pos = `${s.x},${s.y}`;
      if (compId) canvas.dataset.companionPos = `${s.cx},${s.cy}`;
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
    <section className="fieldmode">
      <div className="fieldmode__view" ref={wrapRef}>
        <canvas ref={canvasRef} className="fieldmode__canvas" data-testid="field-canvas" />
        <Joystick onDir={setPadDir} onTap={onTap} />
        <button type="button" className="btn btn--ghost fieldmode__menu-btn" onClick={() => setMenuOpen((v) => !v)}>
          메뉴
        </button>
        {menuOpen && (
          <div className="fieldmode__menu" role="menu">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                leaveBattleReturn();
                navigate('/');
              }}
            >
              처음 화면
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                leaveBattleReturn();
                navigate('/field/dex');
              }}
            >
              구구몬 도감
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setMenuOpen(false)}>
              닫기
            </button>
          </div>
        )}
        {notice && (
          <div className="fieldmode__notice" role="alert">
            {notice}
          </div>
        )}
        {flash && <div className="fieldmode__flash" aria-hidden />}
        {iris && <canvas ref={irisRef} className="fieldmode__iris" aria-hidden />}
        {notice0 && (
          <button type="button" className="fieldmode__growth" role="dialog" aria-label="성장 알림" onClick={dismissNotice}>
            <span className="fieldmode__growth-title">{notice0.kind === 'levelUp' ? '레벨이 올랐어!' : '진화했어!'}</span>
            <span className="fieldmode__growth-body">
              {notice0.kind === 'levelUp'
                ? `${displayName(notice0.species, noticeStage)} Lv${notice0.level}`
                : displayName(notice0.species, notice0.stage)}
            </span>
            <span className="fieldmode__growth-hint">탭하면 닫혀요</span>
          </button>
        )}
        {signText && (
          <div className="fieldmode__text" role="dialog" aria-label="표지판" onClick={onTap}>
            {signText}
          </div>
        )}
      </div>
    </section>
  );
}
