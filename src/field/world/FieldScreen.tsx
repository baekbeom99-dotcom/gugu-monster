import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { companionStart, type Dir, type FieldMap, type StepResult, safeStartPosition, tryStep } from '../../domain/field/movement';
import { displayName } from '../../domain/field/growth';
import { useSessionStore } from '../../store/useSessionStore';
import { companionImage } from '../art/companionImage';
import { creatureArt } from '../art/creatureArt';
import { STAGE_SCALE } from '../art/creatureSprite';
import { playFx, preloadFx, prefersReducedMotion } from '../fx/playFx';
import type { FieldId, MapId } from '../../domain/field/fields';
import { stepOnTile } from '../../domain/field/encounter';
import { ENCOUNTER_FLASH_MS, ROAM_BUBBLE_MS, STEP_MS, TURN_TAP_MS } from '../../domain/field/tuning';
import { type Roamer, createRoamers, habitatOf, pokeRoamer, stepRoamers } from '../../domain/field/roam';
import type { SpeciesId } from '../../domain/field/creatures';
import { debugFlags } from '../debugFlags';
import { useGameStore } from '../../store/useGameStore';
import { Joystick } from './Joystick';
import { type Companion, drawField, viewScale } from './fieldRenderer';
import { FieldLoading } from './FieldLoading';
import { OFFLINE_MESSAGE, getLoadedField, loadField, travelTo } from './loadField';
import { TILE_PX } from './padDirection';
import { bubblePosition, buildSprites, roamerAt, tileAtScreen } from './roamerLayer';
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
  const [loadingTo, setLoadingTo] = useState<MapId | null>(null);
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
    (to: MapId) => {
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
  if (!map) return <FieldLoading map={loadingTo ?? useGameStore.getState().field.position.map} />;
  return <FieldView key={map.id + attempt + (notice ?? '')} map={map} onExit={goTo} notice={notice} {...props} />;
}

function FieldView({ map, onExit, notice, onStep }: Props & { map: FieldMap; onExit: (to: MapId) => void; notice: string | null }) {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signText, setSignText] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  /** 구구몬 말풍선(부딪히거나 탭한 구구몬) */
  const [bubble, setBubble] = useState<SpeciesId | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const bubbleTimer = useRef(0);
  useEffect(() => () => clearTimeout(bubbleTimer.current), []);
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
    /** 마을에서 돌아다니는 구구몬 (마을이 아니면 비어 있다) */
    roamers: [] as Roamer[],
    /** 마지막으로 그린 카메라(화면 픽셀)·칸 크기 — 탭한 칸을 알아내는 데 쓴다 */
    camX: 0,
    camY: 0,
    tile: TILE_PX,
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
  const bubbleStage = useGameStore((s) => (bubble ? s.field.species[bubble]?.stage ?? 1 : 1));
  const bubbleLevel = useGameStore((s) => (bubble ? s.field.species[bubble]?.level ?? 1 : 1)); // 체력은 전투 개편(M3) 전까지 100으로 보인다
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

  /** 구구몬을 깨워 점프시키고 말풍선을 띄운다 */
  const pokeAt = useCallback((p: { x: number; y: number }): boolean => {
    const s = st.current;
    const target = roamerAt(s.roamers, p);
    if (!target) return false;
    const now = performance.now();
    s.roamers = s.roamers.map((r) => (r === target ? pokeRoamer(r, now) : r));
    setBubble(target.species);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setBubble(null), ROAM_BUBBLE_MS);
    return true;
  }, []);
  const pokeRef = useRef(pokeAt);
  pokeRef.current = pokeAt;

  /** 화면을 가볍게 탭: 알림이 떠 있으면 닫고, 표지판 글이 떠 있으면 닫고, 아니면 탭한 칸의 구구몬을 깨운다 */
  const onTap = useCallback((clientX?: number, clientY?: number): boolean => {
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
    const canvas = canvasRef.current;
    if (canvas && clientX !== undefined && clientY !== undefined && s.roamers.length > 0) {
      const p = tileAtScreen(clientX, clientY, canvas.getBoundingClientRect(), canvas.width, s.tile, s.camX, s.camY);
      return pokeRef.current(p);
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
      map: map.id,
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

    // 마을에서만: 잡은 구구몬(동행 빼고)이 서식지를 돌아다닌다
    if (map.id === 'town') {
      const { species, companion } = useGameStore.getState().field;
      const list = (Object.keys(species) as SpeciesId[]).filter((id) => id !== companion).map((id) => ({ species: id, fainted: false }));
      // 주인공·동행이 서 있는 칸에는 세우지 않는다
      const free = (f: FieldId) => (map.zones[f] ?? []).filter((z) => !(z.x === s.x && z.y === s.y) && !(z.x === s.cx && z.y === s.cy));
      const zones = { meadow: free('meadow'), waterside: free('waterside'), desert: free('desert') };
      s.roamers = createRoamers({ ...map, zones }, list, Math.random, performance.now());
    }
    const zoneSets = new Map<string, Set<string>>();
    const inHabitat = (id: SpeciesId, p: { x: number; y: number }) => {
      const f = habitatOf(id);
      let set = zoneSets.get(f);
      if (!set) {
        set = new Set((map.zones[f] ?? []).map((z) => `${z.x},${z.y}`));
        zoneSets.set(f, set);
      }
      return set.has(`${p.x},${p.y}`);
    };
    /** 주인공·동행(가는 칸 포함)이 서 있는 칸 */
    const crowded = (p: { x: number; y: number }) => {
      const at = (x: number, y: number) => x === p.x && y === p.y;
      if (at(s.x, s.y) || at(s.cx, s.cy)) return true;
      return !!s.move && (at(s.move.tx, s.move.ty) || at(s.move.fx, s.move.fy));
    };

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
      if (s.roamers.length > 0) {
        s.roamers = stepRoamers(s.roamers, now, Math.random, (r, others, p) => inHabitat(r.species, p) && !crowded(p) && !roamerAt(others, p));
      }
      const isRoamerAt = (p: { x: number; y: number }) => roamerAt(s.roamers, p) !== undefined;
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
          const result = tryStep(map, { x: s.x, y: s.y }, h, s.roamers.length > 0 ? isRoamerAt : undefined);
          if (result.moved) {
            s.lastBump = null;
            s.move = { fx: s.x, fy: s.y, tx: result.pos.x, ty: result.pos.y, start: now, result };
          } else if (result.bump) {
            const b = result.bump;
            const key = `${b.x},${b.y}`;
            if (s.lastBump?.key !== key) {
              s.lastBump = { key, dir: h };
              const sign = map.signs.find((g) => g.pos.x === b.x && g.pos.y === b.y);
              const isDoor = map.doors.some((d) => d.x === b.x && d.y === b.y);
              if (!sign && !isDoor) pokeRef.current(b);
              else {
                s.signOpen = true;
                setSignText(sign ? sign.text : '상점은 곧 열려요!'); // 문 반응은 상점 팝업(M3·M4)이 바꾼다
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
      const sprites = s.roamers.length > 0 ? buildSprites(s.roamers, (r) => useGameStore.getState().field.species[r.species]?.stage ?? 1) : undefined;
      const cam = drawField(ctx, map, view, hx, hy, s.facing, comp, { now, step: stepT }, sprites);
      s.camX = cam.cx;
      s.camY = cam.cy;
      s.tile = view.tile;
      if (s.roamers.length > 0) {
        canvas.dataset.cam = `${cam.cx / view.tile},${cam.cy / view.tile},${view.tile}`; // 카메라 왼쪽 위(칸 단위)와 한 칸의 화면 픽셀 (E2E용)
        canvas.dataset.roamers = s.roamers.map((r) => `${r.species}:${r.x},${r.y}`).join(';');
        const el = bubbleRef.current;
        const target = el && s.roamers.find((r) => r.species === el.dataset.species);
        if (el && target) {
          const rect = wrap.getBoundingClientRect();
          const pos = bubblePosition(target, now, view.tile, cam.cx, cam.cy, rect.width / canvas.width);
          el.style.left = `${pos.left}px`;
          el.style.top = `${pos.top}px`;
        }
      }
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
            <span className="fieldmode__growth-title">
              {notice0.kind === 'levelUp' ? '레벨이 올랐어!' : notice0.kind === 'evolve' ? '진화했어!' : '쓰러졌어…'}
            </span>
            <span className="fieldmode__growth-body">
              {notice0.kind === 'levelUp'
                ? `${displayName(notice0.species, noticeStage)} Lv${notice0.level}`
                : notice0.kind === 'evolve'
                  ? displayName(notice0.species, notice0.stage)
                  : displayName(notice0.species, noticeStage)}
            </span>
            <span className="fieldmode__growth-hint">탭하면 닫혀요</span>
          </button>
        )}
        {bubble && (
          <div className="roam-bubble" role="dialog" aria-label="구구몬 말풍선" data-species={bubble} ref={bubbleRef}>
            <span className="roam-bubble__name">{displayName(bubble, bubbleStage)}</span>
            <span className="roam-bubble__meta">Lv{bubbleLevel} · 체력 100</span>
          </div>
        )}
        {signText && (
          <div className="fieldmode__text" role="dialog" aria-label="표지판" onClick={() => onTap()}>
            {signText}
          </div>
        )}
      </div>
    </section>
  );
}
