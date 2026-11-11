/**
 * 야생 전투 화면 — 설계서 6절·8절. 규칙은 domain/field/wildBattle.ts, 이 화면은 연출·저장·시간만 맡는다.
 * 문제가 떠 있을 때만 시간이 흐른다(인트로·명중·피격·힌트·어지러움·도망 확인창·가려진 탭에서는 멈춤).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DAN_COLORS } from '../../art/colors';
import type { MonsterMood } from '../../art/MonsterSprite';
import { HintPanel } from '../../components/HintPanel';
import { QuestionView } from '../../components/QuestionView';
import { speciesDef } from '../../domain/field/creatures';
import { createAnswerTimer, elapsedMs, pauseTimer, resumeTimer, startTimer } from '../../domain/field/answerTimer';
import { displayName } from '../../domain/field/growth';
import type { Encounter } from '../../domain/field/encounter';
import {
  CAPSULE_SHAKE_MS,
  CAPSULE_SHAKES,
  COMPANION_MAX_HP,
  TIER_RULES,
  TIMER_WARN_MS,
  WILD_END_MS,
  WILD_FOE_ATTACK_MS,
  WILD_HIT_ANIM_MS,
  WILD_INTRO_MS,
} from '../../domain/field/tuning';
import {
  answerWild,
  createWild,
  damageOf,
  releaseWild,
  resumeWild,
  throwCapsule,
  tick,
  wildHpRatio,
  type WildState,
} from '../../domain/field/wildBattle';
import type { FactId } from '../../domain/facts';
import type { Rng } from '../../domain/random';
import { useGameStore, type WildEnd } from '../../store/useGameStore';
import { useSessionStore } from '../../store/useSessionStore';
import { creatureSprite } from '../art/creatureSprite';
import { GachaCapsule } from '../art/GachaCapsule';
import { pickCompanion } from '../companion';
import { debugFlags } from '../debugFlags';
import { type FxName, playFx, preloadFx } from '../fx/playFx';
import { endWildBattle, useFieldSession } from '../useFieldSession';
import { HpBar, TimerBar } from './BattleBars';
import { battleText } from './battleText';
import { useQuestionFeed } from './useQuestionFeed';
import '../../screens/battle.css';
import './wildBattle.css';

const rng: Rng = Math.random;
const COMPANION_COLOR = DAN_COLORS[5];

/** 남은 캡슐 수. M3에서는 캡슐이 무제한(R17) — M4(Task 14)에서 저장된 개수로 바꾼다 */
function capsulesLeft(): number {
  return Infinity;
}

/** 끝난 단계 → 정산의 끝 모양 (직접 도망치기는 quit) */
function endOf(w: WildState, quit: boolean): WildEnd | null {
  if (quit) return 'quit';
  if (w.phase === 'caught' || w.phase === 'escaped' || w.phase === 'released' || w.phase === 'fainted') return w.phase;
  return null;
}

/** 시간 막대를 다시 그려야 하는 변화(초가 바뀜·빨개짐)인가 */
function timerChanged(a: WildState, b: WildState): boolean {
  return Math.ceil(a.timeLeftMs / 1000) !== Math.ceil(b.timeLeftMs / 1000) || a.timeLeftMs <= TIMER_WARN_MS !== b.timeLeftMs <= TIMER_WARN_MS;
}

export function WildBattleScreen() {
  const encounter = useFieldSession((s) => s.encounter);
  // 새로고침 등으로 만남이 사라졌으면 필드로
  if (!encounter) return <Navigate to="/field" replace />;
  return <WildBattle encounter={encounter} />;
}

function WildBattle({ encounter }: { encounter: Encounter }) {
  const { recordAnswer, markSeen } = useGameStore.getState();
  // 싸우는 구구몬은 전투 내내 같은 종 (만남 레벨을 굴린 종과 같은 헬퍼)
  const [companion] = useState(() => pickCompanion(useGameStore.getState()));
  const companionStage = useGameStore((s) => s.field.species[companion]?.stage ?? 1);
  const companionLevel = useGameStore((s) => s.field.species[companion]?.level ?? 1);
  const wildDef = speciesDef(encounter.species);
  const moves = speciesDef(companion).moves;
  const allyName = displayName(companion, companionStage);

  const { item, fact, question, key, next } = useQuestionFeed(encounter, rng);
  const itemRef = useRef(item);
  itemRef.current = item;

  const wildRef = useRef<WildState | null>(null);
  if (!wildRef.current) {
    wildRef.current = createWild(encounter.tier, encounter.level, useGameStore.getState().field.species[companion]?.hp ?? COMPANION_MAX_HP);
  }
  const [wild, setWildState] = useState<WildState>(wildRef.current);
  // ref를 바로 바꿔 두면 같은 순간의 두 번째 클릭은 'question'이 아니라서 무시된다
  const setWild = useCallback((w: WildState) => {
    if (w === wildRef.current) return;
    wildRef.current = w;
    setWildState(w);
  }, []);

  const [intro, setIntro] = useState(() => wildRef.current!.phase !== 'fainted');
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [quit, setQuit] = useState(false);
  const wildNameNow = battleText.tierName(wildDef.name, wild.tier);
  const [message, setMessage] = useState(() => battleText.appear(battleText.tierName(wildDef.name, encounter.tier), wildDef.legend));
  const [hitCount, setHitCount] = useState(0);
  /** 맞은 횟수 (내 구구몬 흔들림을 다시 틀기 위한 key) */
  const [struckCount, setStruckCount] = useState(0);
  /** 캡슐이 흔들리는 중: 결과가 나올 때까지 아무것도 흐르지 않는다 */
  const [throwing, setThrowing] = useState(false);
  const settledRef = useRef(false);
  /** 마지막으로 고른 내 기술 (힌트 글에 쓴다) */
  const pickedMoveRef = useRef(0);
  /** 이 전투에서 맞아서 쓰러졌나 (쓰러짐 글을 공격 연출 뒤에 보인다) */
  const struckDownRef = useRef(false);
  const [battleStartedAt] = useState(() => Date.now());
  const answeredFacts = useRef(new Set<FactId>());
  /** 답하는 데 걸린 시간: 도망 확인창·가려진 화면 동안은 멈춘다 */
  const timerRef = useRef(createAnswerTimer());
  const timerFillRef = useRef<HTMLSpanElement>(null);
  const timers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  // 효과(명중·잡기·피격): 구구몬 발치에서 틀어 준다. 보기만 하는 것이라 시간·결과와 상관없다
  const stageRef = useRef<HTMLElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => preloadFx('hit', 'catch'), []);
  const fxAt = useCallback((selector: string, name: FxName) => {
    const stage = stageRef.current;
    const canvas = fxRef.current;
    const el = stage?.querySelector(selector);
    if (!stage || !canvas || !el) return;
    const s = stage.getBoundingClientRect();
    const f = el.getBoundingClientRect();
    void playFx(canvas, name, { x: f.left - s.left + f.width / 2, y: f.top - s.top + f.height * 0.6 });
  }, []);

  useEffect(() => {
    markSeen(encounter.species);
  }, [markSeen, encounter.species]);

  // 시작 글: 1.2초 뒤 자동으로 넘어간다
  useEffect(() => {
    if (!intro) {
      if (wildRef.current!.phase === 'question') setMessage(battleText.choose);
      return;
    }
    const t = window.setTimeout(() => setIntro(false), WILD_INTRO_MS);
    return () => clearTimeout(t);
  }, [intro]);

  /** 학습 기록: 고르는 순간(시간 초과는 그 순간) 바로 저장한다 (전투 중 앱을 닫아도 남게) */
  const record = useCallback(
    (correct: boolean, ms: number) => {
      const it = itemRef.current;
      recordAnswer({
        factId: it.factId,
        type: it.type,
        correct,
        ms,
        inputMode: 'choice',
        isRetry: it.isRetry,
        firstAttemptInBattle: !answeredFacts.current.has(it.factId),
        battleStartedAt,
        now: Date.now(),
        source: 'field',
      });
      answeredFacts.current.add(it.factId);
    },
    [recordAnswer, battleStartedAt],
  );

  /**
   * 적의 공격 (오답·시간 초과): 문제에서 struck/fainted로 바뀐 순간 한 번만 불린다.
   * 체력·상처는 이 순간 저장되고(쓰러지면 자리도 마을로), 연출 뒤 힌트로 간다. 쓰러졌으면 힌트 없이 끝(R9).
   */
  const onStruck = useCallback(
    (s: WildState) => {
      const it = itemRef.current;
      useGameStore.getState().damageCompanion(companion, damageOf(s), { factId: it.factId, type: it.type });
      setStruckCount((n) => n + 1);
      fxAt('.wild__ally', 'hit');
      setMessage(battleText.foeAttack(battleText.tierName(wildDef.name, s.tier), wildDef.moves[s.lastMove ?? 0]));
      if (s.phase === 'fainted') {
        struckDownRef.current = true;
        return;
      }
      const timedOut = s.timedOut;
      later(() => {
        if (settledRef.current) return; // 그 사이 도망쳐 끝났으면 끝 글을 덮지 않는다
        setWild(resumeWild(wildRef.current!));
        setMessage(timedOut ? battleText.timeUp : battleText.miss(moves[pickedMoveRef.current]));
      }, WILD_FOE_ATTACK_MS);
    },
    [companion, fxAt, later, moves, setWild, wildDef],
  );
  const onStruckRef = useRef(onStruck);
  onStruckRef.current = onStruck;

  const ending = endOf(wild, quit);
  const noTimer = debugFlags().noTimer;
  const running = !intro && !confirmQuit && !ending && wild.phase === 'question' && !noTimer;

  // 문제 시계: 화면이 가려져 있으면 흐르지 않는다. 시간이 다 되면 tick이 struck/fainted로 바꾼다
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = document.hidden ? 0 : now - last;
      last = now;
      const prev = wildRef.current!;
      const t = tick(prev, dt, rng);
      if (t === prev) return;
      wildRef.current = t;
      const fill = timerFillRef.current;
      if (fill) fill.style.width = `${(t.timeLeftMs / TIER_RULES[t.tier].timeMs) * 100}%`;
      if (t.phase !== 'question') {
        // 시간 초과: 오답처럼 기록하고(R8) 적이 공격한다
        setWildState(t);
        record(false, TIER_RULES[t.tier].timeMs);
        onStruckRef.current(t);
        return;
      }
      // 매 프레임 다시 그리지 않는다: 초가 바뀌거나 빨개질 때만
      if (timerChanged(prev, t)) setWildState(t);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, record]);

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
    const w = wildRef.current!;
    let newSpecies = false;
    if (!settledRef.current) {
      settledRef.current = true;
      // 정산은 끝났을 때의 단계·레벨로 (화나서 강력이 되었으면 강력 값, R12)
      const r = useGameStore.getState().finishWildBattle({
        species: encounter.species,
        level: w.level,
        tier: w.tier,
        end: ending,
        correct: w.correct,
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
    const name = battleText.tierName(wildDef.name, w.tier);
    const text =
      ending === 'caught'
        ? battleText.caught(name, newSpecies)
        : ending === 'escaped'
          ? battleText.escaped(name)
          : ending === 'released'
            ? battleText.released
            : ending === 'fainted'
              ? battleText.fainted(allyName)
              : battleText.quit;
    // 맞아서 쓰러졌으면 적의 공격 글을 잠깐 보인 뒤
    const delay = ending === 'fainted' && struckDownRef.current ? WILD_FOE_ATTACK_MS : 0;
    const t1 = window.setTimeout(() => setMessage(text), delay);
    const t2 = window.setTimeout(endWildBattle, delay + WILD_END_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // 끝 모양이 정해지면 한 번만 (이름 등은 그 순간 값)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  // B 버튼(키보드 X·Esc) → 도망칠지 묻기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyX' || e.key === 'Escape') setConfirmQuit((v) => v || !(ending || throwing));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ending, throwing]);

  /** 어지러워졌다(또는 재도전): 맞는 캡슐이 없으면 돌려보낸다 (M3는 캡슐 무제한이라 늘 던질 수 있다, R18은 M4) */
  const onDizzy = useCallback(
    (w: WildState) => {
      if (capsulesLeft() <= 0) setWild(releaseWild(w));
    },
    [setWild],
  );

  const pick = (moveIndex: number) => {
    const w = wildRef.current!;
    if (intro || confirmQuit || throwing || w.phase !== 'question') return;
    const value = question.choices[moveIndex];
    const correct = value === question.answer;
    const ms = Math.round(elapsedMs(timerRef.current, performance.now()));
    const after = answerWild(w, correct, rng);
    setWild(after);
    record(correct, ms);
    pickedMoveRef.current = moveIndex;

    if (!correct) {
      onStruck(after);
      return;
    }
    setHitCount((n) => n + 1);
    fxAt('.wild__foe', 'hit');
    setMessage(battleText.hit(moves[moveIndex]));
    if (after.phase === 'hit') {
      later(() => {
        if (settledRef.current) return;
        setWild(resumeWild(wildRef.current!));
        next(false);
      }, WILD_HIT_ANIM_MS);
    } else if (after.phase === 'dizzy') {
      setMessage(battleText.dizzy(battleText.tierName(wildDef.name, after.tier)));
      next(false);
      onDizzy(after);
    }
  };

  const onHintPick = () => {
    if (wildRef.current!.phase !== 'hint') return;
    setWild(resumeWild(wildRef.current!));
    setMessage(battleText.retry);
    next(true);
  };

  const onCapsule = () => {
    const w = wildRef.current!;
    if (w.phase !== 'dizzy' || throwing) return;
    // 결과는 던지는 순간 정해 두고, 흔들림이 끝난 뒤에 보여 준다 (E2E 만남 스위치면 언제나 잡힌다)
    const thrown = throwCapsule(w, debugFlags().encounter ? () => 0 : rng, companionLevel);
    if (!thrown) return;
    setThrowing(true);
    setMessage(battleText.throwCapsule);
    later(() => {
      setThrowing(false);
      const after = thrown.state;
      const name = battleText.tierName(wildDef.name, after.tier);
      switch (thrown.outcome) {
        case 'caught':
          setWild(after);
          fxAt('.wild__foe', 'catch');
          break;
        case 'retry':
          setMessage(battleText.retryThrow);
          onDizzy(wildRef.current!);
          break;
        case 'escaped':
          setWild(after);
          break;
        case 'angry':
          // 강력해져서 체력을 다 채우고 새 문제로
          setWild(after);
          setHitCount((n) => n + 1);
          setMessage(battleText.angry(name));
          next(false);
          break;
      }
    }, CAPSULE_SHAKES * CAPSULE_SHAKE_MS);
  };

  const hpRatio = wildHpRatio(wild);
  const inHint = wild.phase === 'hint';
  const dizzy = wild.phase === 'dizzy';
  const struck = wild.phase === 'struck' || (wild.phase === 'fainted' && struckCount > 0);
  const wildMood: MonsterMood =
    wild.phase === 'hit' ? 'hit' : dizzy ? 'sleep' : wild.phase === 'caught' ? 'happy' : 'idle';
  const strongCard = wild.tier === 'strong' ? 'wild__card--strong' : wild.tier === 'mighty' ? 'wild__card--mighty' : '';
  const gone = ending === 'escaped' || ending === 'released' || ending === 'quit';

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
        <div className={`wild__card ${strongCard}`}>
          <div className="wild__name">
            {wildNameNow} <small>Lv{wild.level}</small>
          </div>
          <HpBar label={`야생 체력 ${Math.round(hpRatio * 100)}`} ratio={hpRatio} />
        </div>
      </header>

      <section ref={stageRef} data-species={encounter.species} className={`wild__stage ${wildDef.legend ? 'wild__stage--legend' : ''} ${intro ? 'wild__stage--intro' : ''} ${intro && wildDef.legend ? 'wild__stage--sparkle' : ''}`}>
        {asking || inHint ? (
          <div className="wild__bubble" data-fact={item.factId}>
            {asking && <TimerBar key={key} ms={wild.timeLeftMs} totalMs={TIER_RULES[wild.tier].timeMs} fillRef={timerFillRef} />}
            <QuestionView display={question.display} />
          </div>
        ) : null}
        {inHint ? (
          <div className="wild__hint">
            <HintPanel fact={fact} type={item.type} />
          </div>
        ) : (
          <>
            <div key={`w${hitCount}`} className={`wild__foe ${wild.phase === 'hit' ? 'wild__foe--hit' : ''} ${struck ? 'wild__foe--attack' : ''} ${gone ? 'wild__foe--gone' : ''} ${throwing ? 'wild__foe--capsule' : ''}`}>
              {creatureSprite(encounter.species, { view: 'front', mood: wildMood, color: DAN_COLORS[encounter.dan], size: 150 })}
            </div>
            {throwing && (
              <div className="wild__capsule-ball" aria-hidden style={{ animationDuration: `${CAPSULE_SHAKE_MS}ms`, animationIterationCount: CAPSULE_SHAKES }}>
                <GachaCapsule size={64} />
              </div>
            )}
            <div key={`a${hitCount}-${struckCount}`} className={`wild__ally ${wild.phase === 'hit' ? 'wild__ally--attack' : ''} ${struck ? 'wild__ally--struck' : ''}`}>
              {creatureSprite(companion, { view: 'back', stage: companionStage, color: COMPANION_COLOR, size: 120 })}
            </div>
          </>
        )}
        <canvas ref={fxRef} className="wild__fx" aria-hidden />
      </section>

      <div className="wild__ally-card">
        <div className="wild__ally-name">
          {allyName} <small>Lv{companionLevel}</small>
        </div>
        <HpBar label={`내 체력 ${wild.allyHp}`} ratio={wild.allyHp / COMPANION_MAX_HP} low={wild.allyHp <= TIER_RULES[wild.tier].damage} />
      </div>

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
