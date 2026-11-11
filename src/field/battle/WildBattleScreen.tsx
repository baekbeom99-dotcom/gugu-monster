/** 야생 전투 화면 — 설계서 5-1~5-4. 문제가 떠 있는 동안에만 시간이 흐른다 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DAN_COLORS } from '../../art/colors';
import type { MonsterMood } from '../../art/MonsterSprite';
import { HintPanel } from '../../components/HintPanel';
import { QuestionView } from '../../components/QuestionView';
import { STARTERS, speciesDef, type SpeciesId } from '../../domain/field/creatures';
import { createAnswerTimer, elapsedMs, pauseTimer, resumeTimer, startTimer } from '../../domain/field/answerTimer';
import { displayName } from '../../domain/field/growth';
import type { Encounter } from '../../domain/field/encounter';
import { CAPSULE_SHAKE_MS, CAPSULE_SHAKES, WILD_END_MS, WILD_HIT_ANIM_MS, WILD_INTRO_MS } from '../../domain/field/tuning';
import {
  answerWild,
  createWild,
  fleeTimeMs,
  resumeWild,
  throwCapsule,
  tick,
  WILD_MAX_HP,
  type WildState,
} from '../../domain/field/wildBattle';
import type { FactId } from '../../domain/facts';
import { fastThresholdMs } from '../../domain/mastery';
import type { Rng } from '../../domain/random';
import { useGameStore } from '../../store/useGameStore';
import { useSessionStore } from '../../store/useSessionStore';
import { creatureSprite } from '../art/creatureSprite';
import { GachaCapsule } from '../art/GachaCapsule';
import { debugFlags } from '../debugFlags';
import { type FxName, playFx, preloadFx } from '../fx/playFx';
import { endWildBattle, useFieldSession } from '../useFieldSession';
import { battleText } from './battleText';
import { useQuestionFeed } from './useQuestionFeed';
import '../../screens/battle.css';
import './wildBattle.css';

const rng: Rng = Math.random;
/** 동행이 없거나 잡지 않은 종일 때(옛 저장 등): 처음 잡은 종, 그것도 없으면 첫 후보 */
function pickCompanion(s: { field: { companion: SpeciesId | null; species: Record<string, unknown> } }): SpeciesId {
  const c = s.field.companion;
  if (c && s.field.species[c]) return c;
  return (Object.keys(s.field.species)[0] as SpeciesId | undefined) ?? STARTERS[0];
}
const COMPANION_COLOR = DAN_COLORS[5];

export function WildBattleScreen() {
  const encounter = useFieldSession((s) => s.encounter);
  // 새로고침 등으로 만남이 사라졌으면 필드로
  if (!encounter) return <Navigate to="/field" replace />;
  return <WildBattle encounter={encounter} />;
}

type Ending = 'fled' | 'caught' | 'quit';

function WildBattle({ encounter }: { encounter: Encounter }) {
  const { recordAnswer, markSeen } = useGameStore.getState();
  const fleeScale = useGameStore((s) => s.settings.fieldFleeScale);
  const companion = useGameStore(pickCompanion);
  const companionStage = useGameStore((s) => s.field.species[companion]?.stage ?? 1);
  const wildDef = speciesDef(encounter.species);
  const moves = speciesDef(companion).moves;

  const { item, fact, question, key, next } = useQuestionFeed(encounter, rng);

  const wildRef = useRef<WildState>(createWild());
  const [wild, setWildState] = useState<WildState>(wildRef.current);
  // ref를 바로 바꿔 두면 같은 순간의 두 번째 클릭은 'question'이 아니라서 무시된다
  const setWild = useCallback((w: WildState) => {
    if (w === wildRef.current) return;
    wildRef.current = w;
    setWildState(w);
  }, []);

  const [intro, setIntro] = useState(true);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [quit, setQuit] = useState(false);
  const [message, setMessage] = useState(battleText.appear(wildDef.name, wildDef.legend));
  const [hitCount, setHitCount] = useState(0);
  /** 캡슐이 흔들리는 중: 결과가 나올 때까지 아무것도 흐르지 않는다 */
  const [throwing, setThrowing] = useState(false);
  const correctRef = useRef(0);
  const settledRef = useRef(false);
  const [battleStartedAt] = useState(() => Date.now());
  const answeredFacts = useRef(new Set<FactId>());
  /** 답하는 데 걸린 시간: 도망 확인창·가려진 화면 동안은 멈춘다 */
  const timerRef = useRef(createAnswerTimer());
  const timers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  // 효과(명중·잡기): 야생 구구몬 발치에서 틀어 준다. 보기만 하는 것이라 시간·결과와 상관없다
  const stageRef = useRef<HTMLElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => preloadFx('hit', 'catch'), []);
  const fxAtFoe = useCallback((name: FxName) => {
    const stage = stageRef.current;
    const canvas = fxRef.current;
    const foe = stage?.querySelector('.wild__foe');
    if (!stage || !canvas || !foe) return;
    const s = stage.getBoundingClientRect();
    const f = foe.getBoundingClientRect();
    void playFx(canvas, name, { x: f.left - s.left + f.width / 2, y: f.top - s.top + f.height * 0.8 });
  }, []);

  useEffect(() => {
    markSeen(encounter.species);
  }, [markSeen, encounter.species]);

  // 도망 시간은 지금 떠 있는 문제로 정한다 (상자는 문제가 뜬 때의 것)
  const fleeMs = useMemo(() => {
    const box = useGameStore.getState().learning.facts[fact.id].box;
    return fleeTimeMs(fact, box, item.type, fleeScale);
  }, [key, fleeScale]);
  const fleeRef = useRef(fleeMs);
  fleeRef.current = fleeMs;

  // 시작 글: 1.2초 뒤 자동으로 넘어간다
  useEffect(() => {
    if (!intro) {
      setMessage(battleText.choose);
      return;
    }
    const t = window.setTimeout(() => setIntro(false), WILD_INTRO_MS);
    return () => clearTimeout(t);
  }, [intro]);

  const ending: Ending | null = quit ? 'quit' : wild.phase === 'fled' ? 'fled' : wild.phase === 'caught' ? 'caught' : null;
  const running = !intro && !confirmQuit && !ending;

  // 시계: 화면이 가려져 있으면 흐르지 않는다
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = document.hidden ? 0 : now - last;
      last = now;
      setWild(tick(wildRef.current, dt, fleeRef.current));
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, setWild]);

  const asking = !intro && wild.phase === 'question';
  useEffect(() => {
    if (asking) timerRef.current = startTimer(timerRef.current, performance.now());
  }, [key, asking]);
  useEffect(() => {
    const sync = () => {
      const now = performance.now();
      timerRef.current = document.hidden || confirmQuit ? pauseTimer(timerRef.current, now) : resumeTimer(timerRef.current, now);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [confirmQuit, key, asking]);

  // 끝: 결과를 저장하고(전투당 한 번), 글을 잠깐 보여 준 뒤 필드로 (만남이 지워지면 화면이 알아서 돌아간다)
  useEffect(() => {
    if (!ending) return;
    let newSpecies = false;
    if (!settledRef.current) {
      settledRef.current = true;
      const r = useGameStore.getState().finishWildBattle({
        species: encounter.species,
        level: encounter.level,
        caught: ending === 'caught',
        fled: ending !== 'caught',
        correct: correctRef.current,
        now: Date.now(),
      });
      newSpecies = r.newSpecies;
      if (r.evolvedTo) useSessionStore.getState().set({ pendingEvolution: r.evolvedTo });
      if (r.levelUp) useSessionStore.getState().set({ pendingLevelUp: r.levelUp });
      if (r.notices.length) {
        const ss = useSessionStore.getState();
        ss.set({ pendingFieldNotices: [...ss.pendingFieldNotices, ...r.notices] });
      }
    }
    setMessage(
      ending === 'fled' ? battleText.fled(wildDef.name) : ending === 'quit' ? battleText.quit : battleText.caught(wildDef.name, newSpecies),
    );
    const t = window.setTimeout(endWildBattle, WILD_END_MS);
    return () => clearTimeout(t);
  }, [ending, wildDef.name, encounter.species, encounter.level]);

  // B 버튼(키보드 X·Esc) → 도망칠지 묻기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyX' || e.key === 'Escape') setConfirmQuit((v) => v || !(ending || throwing));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ending, throwing]);

  const pick = (moveIndex: number) => {
    const w = wildRef.current;
    if (intro || confirmQuit || throwing || w.phase !== 'question') return;
    const value = question.choices[moveIndex];
    const correct = value === question.answer;
    const ms = Math.round(elapsedMs(timerRef.current, performance.now()));
    const fast = ms <= fastThresholdMs(fact, 'choice');
    const after = answerWild(w, correct, fast);
    setWild(after);
    // 고르는 순간 바로 저장한다 (전투 중 앱을 닫아도 기록이 남게)
    recordAnswer({
      factId: item.factId,
      type: item.type,
      correct,
      ms,
      inputMode: 'choice',
      isRetry: item.isRetry,
      firstAttemptInBattle: !answeredFacts.current.has(item.factId),
      battleStartedAt,
      now: Date.now(),
      source: 'field',
    });
    answeredFacts.current.add(item.factId);

    if (correct) {
      correctRef.current += 1;
      setHitCount((n) => n + 1);
      fxAtFoe('hit');
      setMessage(battleText.hit(moves[moveIndex], fast));
    } else {
      setMessage(battleText.miss(moves[moveIndex]));
    }
    if (after.phase === 'anim') {
      later(() => {
        setWild(resumeWild(wildRef.current));
        next(false);
      }, WILD_HIT_ANIM_MS);
    } else if (after.phase === 'dizzy') {
      setMessage(battleText.dizzy(wildDef.name, after.asleep));
      next(false);
    }
  };

  const onHintPick = () => {
    if (wildRef.current.phase !== 'hint') return;
    setWild(resumeWild(wildRef.current));
    setMessage(battleText.retry);
    next(true);
  };

  const onCapsule = () => {
    const w = wildRef.current;
    if (w.phase !== 'dizzy' || throwing) return;
    // 결과는 던지는 순간 정해 두고, 흔들림이 끝난 뒤에 보여 준다 (E2E에서는 언제나 잡힌다)
    const after = throwCapsule(w, debugFlags().encounter ? () => 0 : rng);
    setThrowing(true);
    setMessage(battleText.throwCapsule);
    later(() => {
      setThrowing(false);
      setWild(after);
      if (after.phase === 'caught') fxAtFoe('catch');
      setMessage(after.phase === 'caught' ? battleText.caught(wildDef.name) : battleText.brokeFree);
    }, CAPSULE_SHAKES * CAPSULE_SHAKE_MS);
  };

  const hpShown = Math.round(wild.hp);
  const full = asking && wild.hp >= WILD_MAX_HP;
  const fleeLeft = Math.max(0, fleeMs - wild.fullMs);
  const inHint = wild.phase === 'hint';
  const dizzy = wild.phase === 'dizzy';
  const wildMood: MonsterMood =
    wild.phase === 'anim' ? 'hit' : dizzy ? 'sleep' : wild.phase === 'caught' ? 'happy' : 'idle';

  return (
    <div className={`wild ${wildDef.legend ? 'wild--legend' : ''}`}>
      <header className="wild__top">
        <button
          type="button"
          className="btn btn--ghost wild__run"
          aria-label="도망치기"
          disabled={!!ending || throwing}
          onClick={() => setConfirmQuit(true)}
        >
          🏃 도망
        </button>
        <div className="wild__card">
          <div className="wild__name">
            {wildDef.name} <small>Lv{encounter.level}</small>
          </div>
          <div
            className={`wild__hp ${full ? 'wild__hp--full' : ''}`}
            role="img"
            aria-label={`야생 체력 ${hpShown}`}
          >
            <span className="wild__hp-fill" style={{ width: `${(wild.hp / WILD_MAX_HP) * 100}%` }} />
          </div>
          {full && (
            <div className="wild__hourglass" aria-label={`도망가기까지 ${Math.ceil(fleeLeft / 1000)}초`}>
              <span aria-hidden>⏳</span>
              <span className="wild__hourglass-bar">
                <span style={{ width: `${(fleeLeft / fleeMs) * 100}%` }} />
              </span>
            </div>
          )}
        </div>
      </header>

      <section ref={stageRef} data-species={encounter.species} className={`wild__stage ${wildDef.legend ? 'wild__stage--legend' : ''} ${intro ? 'wild__stage--intro' : ''} ${intro && wildDef.legend ? 'wild__stage--sparkle' : ''}`}>
        {asking || inHint ? (
          <div className="wild__bubble" data-fact={item.factId}>
            <QuestionView display={question.display} />
          </div>
        ) : null}
        {inHint ? (
          <div className="wild__hint">
            <HintPanel fact={fact} type={item.type} />
          </div>
        ) : (
          <>
            <div key={`w${hitCount}`} className={`wild__foe ${wild.phase === 'anim' ? 'wild__foe--hit' : ''} ${ending === 'fled' || ending === 'quit' ? 'wild__foe--gone' : ''} ${throwing ? 'wild__foe--capsule' : ''}`}>
              {creatureSprite(encounter.species, { view: 'front', mood: wildMood, color: DAN_COLORS[encounter.dan], size: 150 })}
            </div>
            {throwing && (
              <div className="wild__capsule-ball" aria-hidden style={{ animationDuration: `${CAPSULE_SHAKE_MS}ms`, animationIterationCount: CAPSULE_SHAKES }}>
                <GachaCapsule size={64} />
              </div>
            )}
            <div key={`a${hitCount}`} className={`wild__ally ${wild.phase === 'anim' ? 'wild__ally--attack' : ''}`}>
              {creatureSprite(companion, { view: 'back', stage: companionStage, color: COMPANION_COLOR, size: 150 })}
              <small className="wild__ally-name" style={{ display: 'block', textAlign: 'center', fontWeight: 800 }}>
                {displayName(companion, companionStage)}
              </small>
            </div>
          </>
        )}
        <canvas ref={fxRef} className="wild__fx" aria-hidden />
      </section>

      <p className="wild__message" role="status" onClick={() => intro && setIntro(false)}>
        {message}
      </p>

      <section className="wild__actions">
        {intro ? (
          <button type="button" className="btn btn--primary wild__next" onClick={() => setIntro(false)}>
            싸우자!
          </button>
        ) : dizzy ? (
          <button type="button" className="btn btn--primary wild__capsule" aria-label="캡슐 던지기" disabled={throwing} onClick={onCapsule}>
            <GachaCapsule size={28} /> 캡슐 던지기
          </button>
        ) : ending ? null : (
          <>
            {inHint && <p className="hint-instruction">빛나는 기술을 눌러 보세요</p>}
            {moves.map((move, i) => {
              const num = question.choices[i];
              const glow = inHint && num === question.answer;
              return (
                <button
                  key={move}
                  type="button"
                  className={`wild-move ${glow ? 'wild-move--glow' : ''}`}
                  aria-label={`${move} ${num}`}
                  disabled={inHint ? !glow : !asking}
                  onClick={() => (inHint ? onHintPick() : pick(i))}
                >
                  <span className="wild-move__name">{move}</span>
                  <span className="wild-move__num">{num}</span>
                </button>
              );
            })}
          </>
        )}
      </section>

      {confirmQuit && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="도망치기">
          <div className="modal__card">
            <p className="modal__title">도망칠까요?</p>
            <p className="modal__body">맞힌 문제 기록은 저장돼요.</p>
            <div className="modal__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setConfirmQuit(false);
                  setQuit(true);
                }}
              >
                도망갈래
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setConfirmQuit(false)}>
                계속 싸우기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
