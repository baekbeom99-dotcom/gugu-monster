/** 몬스터 전투 화면 — 설계서 4장, 9-2 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { DAN_COLORS } from '../art/colors';
import { MONSTER_NAMES, MonsterSprite, type MonsterMood } from '../art/MonsterSprite';
import { playSfx } from '../audio/sfx';
import { ChoiceGrid, Keypad } from '../components/AnswerInput';
import { Buddy, type BuddyMood } from '../components/Buddy';
import { ArithHintPanel } from '../components/ArithHintPanel';
import { HintPanel } from '../components/HintPanel';
import { QuestionView } from '../components/QuestionView';
import { line } from '../data/dialogues';
import {
  answer,
  type BattleState,
  createBattle,
  currentItem,
  extendPlan,
  finishHint,
  isFirstAttempt,
  needsMoreQuestions,
  NORMAL_RULES,
  TRIAL_RULES,
} from '../domain/battle';
import { ALL_DANS, type Dan, getFact } from '../domain/facts';
import { inputModeForBox } from '../domain/mastery';
import { generateQuestion } from '../domain/questionGen';
import type { Rng } from '../domain/random';
import { DAN_TRIAL_MASTER_MS, type TrialOutcome } from '../domain/progress';
import { practiceInputMode } from '../domain/arithPractice';
import { mixArithmetic } from '../domain/mixedExploration';
import { DAN_TRIAL_SIZE, type ExploreMode, isArithItem, type LearnerSnapshot, planExploration } from '../domain/scheduler';
import { affectionLevel } from '../domain/pet';
import { type ExplorationOutcome, useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { ResultView, type Tally } from './ResultView';
import './battle.css';

const rng: Rng = Math.random;
/** 친밀도 Lv7에서 열리는 특별 응원 (설계서 6-4) */
const SPECIAL_CHEER_LEVEL = 7;

export function parseMode(params: URLSearchParams): ExploreMode | null {
  const kind = params.get('mode');
  if (kind === 'recommended' || kind === 'diagnostic') return { kind };
  if (kind === 'dan') {
    const dan = Number(params.get('dan'));
    if ((ALL_DANS as readonly number[]).includes(dan)) return { kind: 'dan', dan: dan as Dan };
  }
  return null;
}

export function battleUrl(mode: ExploreMode): string {
  return mode.kind === 'dan' ? `/battle?mode=dan&dan=${mode.dan}` : `/battle?mode=${mode.kind}`;
}

function snapshot(): LearnerSnapshot {
  const { learning } = useGameStore.getState();
  return {
    facts: learning.facts,
    danRecent: learning.danRecent,
    challengeUnlocked: learning.challengeUnlocked,
    boosted: learning.boosted,
  };
}

export function BattleScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = parseMode(params);
  const challengeUnlocked = useGameStore((s) => s.learning.challengeUnlocked);
  const [round, setRound] = useState(0);

  if (!mode || (mode.kind === 'dan' && mode.dan >= 12 && !challengeUnlocked)) return <Navigate to="/explore" replace />;

  const again = () => {
    // 진단 탐험 다음은 추천 탐험
    if (mode.kind === 'diagnostic') navigate(battleUrl({ kind: 'recommended' }), { replace: true });
    setRound((r) => r + 1);
  };
  return <BattleSession key={`${round}-${params.toString()}`} mode={mode} onAgain={again} />;
}

type Anim = { type: 'hit' | 'capture' | 'dodge'; monster: number; critical: boolean; stars: number } | null;

function BattleSession({ mode, onAgain }: { mode: ExploreMode; onAgain: () => void }) {
  const navigate = useNavigate();
  const stars = useGameStore((s) => s.economy.stars);
  const forceChoice = useGameStore((s) => s.settings.inputMode === 'choice');
  const { recordAnswer, recordPracticeAnswer, recordCapture, finishExploration, finishDanTrial } = useGameStore.getState();
  // 단 골라 탐험 = 단 도전: 그 단 11문제를 모두 맞힐 때까지, 시간을 잰다
  const trialDan = mode.kind === 'dan' ? mode.dan : null;

  const [startedAt] = useState(() => Date.now());
  // 추천 탐험: 몬스터마다 셈 연습 문제 하나를 섞고, 정답 별은 빠를수록 많이
  const speedBonus = mode.kind === 'recommended';
  const [battle, setBattle] = useState<BattleState>(() => {
    const plan = planExploration(snapshot(), mode, Date.now(), rng);
    const mixed = speedBonus ? mixArithmetic(plan, useGameStore.getState().practice, rng) : plan;
    return createBattle(mixed, rng, trialDan !== null ? TRIAL_RULES : NORMAL_RULES);
  });
  const [anim, setAnim] = useState<Anim>(null);
  const [message, setMessage] = useState<string | null>(() =>
    affectionLevel(useGameStore.getState().pet.affection) >= SPECIAL_CHEER_LEVEL ? '우리 둘이면 문제없어! 가자!' : line('start'),
  );
  const [buddyMood, setBuddyMood] = useState<BuddyMood>('cheer');
  const [typed, setTyped] = useState('');
  const [tally, setTally] = useState<Tally>({ correct: 0, correctStars: 0, captureStars: 0, overcome: 0, overcomeStars: 0, slept: 0, xp: 0 });
  const [finish, setFinish] = useState<ExplorationOutcome | null>(null);
  const [trial, setTrial] = useState<TrialOutcome | null>(null);
  /** 탐험을 마쳤을 때의 풀이 시간 (모든 탐험) */
  const [solveMs, setSolveMs] = useState<number | null>(null);
  /** 풀이 시간: 문제가 답을 기다린 시간 + 힌트를 본 시간의 합 (공격·포획 연출 시간은 빼고). 모든 탐험에서 잰다. */
  const trialMs = useRef(0);
  const hintAt = useRef<number | null>(null);
  const [, forceTick] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const shownAt = useRef(performance.now());

  const item = currentItem(battle);
  const arithItem = item && isArithItem(item) ? item : null;
  const factItem = item && !isArithItem(item) ? item : null;
  const fact = factItem ? getFact(factItem.factId) : null;
  const questionKey = arithItem
    ? `${battle.index}:arith:${arithItem.arith.a}${arithItem.arith.op}${arithItem.arith.b}:${arithItem.isRetry}`
    : factItem
      ? `${battle.index}:${factItem.factId}:${factItem.type}:${factItem.isRetry}`
      : 'none';
  const question = useMemo(() => {
    if (arithItem) {
      const q = arithItem.arith;
      const inputMode = practiceInputMode(q.kind, useGameStore.getState().practice[q.kind], forceChoice);
      return { display: q.display, answer: q.answer, choices: q.choices, inputMode };
    }
    if (!factItem || !fact) return null;
    const box = useGameStore.getState().learning.facts[fact.id].box;
    return { ...generateQuestion(rng, fact, factItem.type), inputMode: inputModeForBox(box, forceChoice) };
  }, [questionKey, forceChoice]);

  useEffect(() => {
    shownAt.current = performance.now();
    setTyped('');
  }, [questionKey]);

  // 단 도전 시계: 0.1초마다 다시 그린다
  useEffect(() => {
    if (trialDan === null || battle.phase === 'done') return;
    const t = setInterval(() => forceTick((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [trialDan, battle.phase]);

  // 오답이 많아 문제를 다 썼는데 몬스터가 남았으면 더 붙인다 (단 도전은 맞힐 때까지 다시 내므로 해당 없음).
  useEffect(() => {
    if (trialDan !== null || !needsMoreQuestions(battle)) return;
    const extraMode: ExploreMode = mode.kind === 'diagnostic' ? { kind: 'recommended' } : mode;
    const extra = planExploration(snapshot(), extraMode, Date.now(), rng)
      .slice(0, 3)
      .map((it) => ({ ...it, isConfidence: false }));
    setBattle((b) => extendPlan(b, extra));
  }, [battle, mode, trialDan]);

  // 전투 종료 정산 (잠든 몬스터도 포획으로 인정)
  useEffect(() => {
    if (battle.phase !== 'done' || finish || anim) return;
    const sleeping = battle.monsters.filter((m) => m.status === 'sleeping');
    const sleepStars = sleeping.reduce((sum, m) => sum + recordCapture(m.golden), 0);
    if (sleeping.length > 0) {
      setTally((t) => ({ ...t, captureStars: t.captureStars + sleepStars, slept: sleeping.length }));
      setMessage(line('sleep'));
    }
    // 틀린 횟수 = 시도 − 정답 (MASTER는 하나도 틀리지 않아야 한다)
    const mistakes = battle.attempts - battle.correctCount;
    const trialResult = trialDan !== null ? finishDanTrial(trialDan, trialMs.current, mistakes, Date.now()) : null;
    setSolveMs(trialMs.current);
    if (trialResult) setTrial(trialResult);
    const outcome = finishExploration(true, Date.now());
    setTally((t) => ({ ...t, xp: t.xp + outcome.xp }));
    if (outcome.evolvedTo) useSessionStore.getState().set({ pendingEvolution: outcome.evolvedTo });
    if (outcome.levelUp) useSessionStore.getState().set({ pendingLevelUp: outcome.levelUp });
    setFinish(outcome);
    playSfx(
      outcome.newlyMastered.length > 0 || outcome.challengeJustUnlocked || outcome.evolvedTo || trialResult?.justMastered ? 'fanfare' : 'star',
    );
  }, [battle, finish, anim, recordCapture, finishExploration, finishDanTrial, trialDan]);

  const submit = (value: number) => {
    if (!item || !question || (!fact && !arithItem) || anim || battle.phase !== 'question') return;
    const correct = value === question.answer;
    const ms = Math.round(performance.now() - shownAt.current);
    trialMs.current += ms;
    // 셈 문제는 셈 연습 기록에, 구구단 문제는 숙련도에 남긴다
    const res = arithItem
      ? { ...recordPracticeAnswer(arithItem.arith.kind, correct, Date.now(), speedBonus ? ms : undefined), overcome: false }
      : recordAnswer({
          factId: factItem!.factId,
          type: factItem!.type,
          correct,
          ms,
          inputMode: question.inputMode,
          isRetry: factItem!.isRetry,
          firstAttemptInBattle: isFirstAttempt(battle, factItem!.factId),
          battleStartedAt: startedAt,
          now: Date.now(),
          source: trialDan !== null ? 'trial' : 'normal',
          speedBonus,
        });
    const baseStars = 'baseStars' in res ? res.baseStars : res.stars;
    const next = answer(battle, correct, ms, rng);
    const monster = battle.current;

    setTally((t) => ({ ...t, xp: t.xp + res.xp }));

    if (!correct) {
      playSfx('gentle');
      setBuddyMood('worry');
      setMessage(line('wrong'));
      setAnim({ type: 'dodge', monster, critical: false, stars: 0 });
      hintAt.current = performance.now();
      setBattle(next);
      setTimeout(() => setAnim(null), 500);
      return;
    }

    const last = next.last!;
    let gained = res.stars;
    if (last.captured) {
      const s = recordCapture(battle.monsters[monster].golden);
      gained += s;
      setTally((t) => ({ ...t, captureStars: t.captureStars + s }));
      playSfx('capture');
    } else {
      playSfx(last.comboBurst ? 'combo' : 'correct');
    }
    setTally((t) => ({
      ...t,
      correct: t.correct + 1,
      correctStars: t.correctStars + baseStars,
      overcome: t.overcome + (res.overcome ? 1 : 0),
      overcomeStars: t.overcomeStars + (res.stars - baseStars),
    }));
    setBuddyMood(res.overcome || last.captured || last.comboBurst ? 'party' : 'cheer');
    setMessage(
      line(res.overcome ? 'overcome' : last.captured ? 'capture' : last.comboBurst ? 'combo' : last.critical ? 'critical' : 'correct'),
    );
    setAnim({ type: last.captured ? 'capture' : 'hit', monster, critical: last.critical, stars: gained });
    setTimeout(
      () => {
        setAnim(null);
        setBattle(next);
      },
      last.captured ? 1200 : 700,
    );
  };

  const onHintPick = () => {
    if (hintAt.current !== null) {
      trialMs.current += performance.now() - hintAt.current;
      hintAt.current = null;
    }
    playSfx('correct');
    setBuddyMood('cheer');
    setMessage(line('hintDone'));
    setBattle((b) => finishHint(b));
  };

  const quit = () => {
    finishExploration(false, Date.now());
    navigate('/explore', { replace: true });
  };

  if (finish) {
    return (
      <ResultView
        monsters={battle.monsters}
        tally={tally}
        finish={finish}
        trial={trial && trialDan !== null ? { ...trial, dan: trialDan } : null}
        solveMs={solveMs}
        attempts={battle.attempts}
        speedBonus={speedBonus}
        onAgain={onAgain}
        onPet={() => navigate(useGameStore.getState().pet.stage === 'egg' ? '/hatch' : '/pet', { replace: true })}
      />
    );
  }

  const shownIndex = anim ? anim.monster : Math.min(battle.current, battle.monsters.length - 1);
  const shown = battle.monsters[shownIndex];
  const mood: MonsterMood =
    anim?.type === 'hit' ? 'hit' : anim?.type === 'capture' ? 'happy' : shown.status === 'sleeping' ? 'sleep' : 'idle';
  const hp = anim?.type === 'capture' ? 0 : shown.hp;
  const inHint = battle.phase === 'hint';
  // 지금까지 잰 시간 + 지금 기다리는 중인 시간
  const waitingSince = inHint ? hintAt.current : !anim && battle.phase === 'question' ? shownAt.current : null;
  const liveMs = trialMs.current + (waitingSince !== null ? performance.now() - waitingSince : 0);
  const solved = battle.correctCount;

  return (
    <div className="battle">
      <header className="battle__top">
        <button type="button" className="icon-button" aria-label="탐험 그만하기" onClick={() => setConfirmQuit(true)}>
          ✕
        </button>
        {trialDan !== null ? (
          <div className={`trial-clock ${liveMs > DAN_TRIAL_MASTER_MS ? 'trial-clock--over' : ''}`} aria-label={`걸린 시간 ${(liveMs / 1000).toFixed(1)}초, ${solved}문제 맞힘`}>
            <span>⏱ {(liveMs / 1000).toFixed(1)}초</span>
            <small>
              {solved}/{DAN_TRIAL_SIZE}
            </small>
          </div>
        ) : (
        <div className="monster-progress" aria-label="몬스터 진행">
          {battle.monsters.map((m, i) => (
            <span key={i} className={`pip pip--${m.status} ${i === shownIndex ? 'pip--current' : ''}`}>
              {i + 1}
            </span>
          ))}
        </div>
        )}
        <div className="stars" aria-label={`보유 별 ${stars}개`}>
          <span aria-hidden>★</span>
          <strong>{stars}</strong>
        </div>
      </header>

      <section className={`battle__stage ${inHint ? 'battle__stage--hint' : ''} ${shown.golden && !inHint ? 'battle__stage--golden' : ''}`}>
        {inHint && arithItem ? (
          <ArithHintPanel question={arithItem.arith} />
        ) : inHint && fact && factItem ? (
          <HintPanel fact={fact} type={factItem.type} />
        ) : (
          <>
            <span className="stage-tag">{shown.golden ? `황금 ${MONSTER_NAMES[shown.kind]}` : MONSTER_NAMES[shown.kind]}</span>
            <div className="hp" aria-label={`몬스터 체력 ${hp}`}>
              {Array.from({ length: battle.rules.hp[shownIndex] }, (_, i) => (
                <span key={i} className={i < hp ? 'hp__cell' : 'hp__cell hp__cell--empty'} />
              ))}
            </div>
            <div key={`${shownIndex}-${anim?.type ?? 'idle'}`} className={`monster monster--${anim?.type ?? 'idle'}`}>
              <MonsterSprite kind={shown.kind} color={DAN_COLORS[shown.dan]} golden={shown.golden} mood={mood} size={190} />
            </div>
            {anim && anim.stars > 0 && <div className="float-stars">+{anim.stars} ★</div>}
            {anim?.critical && <div className="critical">크리티컬!</div>}
            {battle.combo >= 3 && !anim && <div className="combo">{battle.combo} 콤보!</div>}
          </>
        )}
      </section>

      <Buddy message={message} mood={buddyMood} />

      {question && (
        <section className="battle__question">
          <QuestionView display={question.display} fill={question.inputMode === 'keypad' && !inHint ? typed : undefined} />
        </section>
      )}

      <section className="battle__input">
        {question &&
          (inHint ? (
            <>
              <p className="hint-instruction">빛나는 정답을 눌러 보세요</p>
              <ChoiceGrid choices={question.choices} highlight={question.answer} onPick={onHintPick} />
            </>
          ) : question.inputMode === 'keypad' ? (
            <Keypad
              value={typed}
              onChange={setTyped}
              onSubmit={() => submit(Number(typed))}
              disabled={!!anim}
            />
          ) : (
            <ChoiceGrid choices={question.choices} onPick={submit} disabled={!!anim} />
          ))}
      </section>

      {confirmQuit && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="탐험 그만하기">
          <div className="modal__card">
            <p className="modal__title">탐험을 그만할까요?</p>
            <p className="modal__body">지금까지 모은 별과 기록은 저장돼요.</p>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={quit}>
                그만하기
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setConfirmQuit(false)}>
                계속하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
