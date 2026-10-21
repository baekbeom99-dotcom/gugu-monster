/** 셈 연습 전투 화면: 덧셈·뺄셈·보수. 구구단 전투와 같은 몬스터·보기·키패드·힌트 흐름을 쓴다. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { DAN_COLORS } from '../art/colors';
import { MonsterSprite, type MonsterMood } from '../art/MonsterSprite';
import { playSfx } from '../audio/sfx';
import { ArithHintPanel } from '../components/ArithHintPanel';
import { ChoiceGrid, Keypad } from '../components/AnswerInput';
import { Buddy, type BuddyMood } from '../components/Buddy';
import { Confetti } from '../components/Confetti';
import { monsterScale } from '../components/monsterScale';
import { QuestionView } from '../components/QuestionView';
import { line } from '../data/dialogues';
import { ARITH_INFO, ARITH_KINDS, type ArithKind } from '../domain/arith';
import {
  answerPractice,
  createPracticeBattle,
  currentPracticeItem,
  finishPracticeHint,
  type PracticeBattle,
  practiceInputMode,
  practiceMasterMs,
  topUpPractice,
} from '../domain/arithPractice';
import { STAR_REWARDS } from '../domain/economy';
import type { MonsterSlot } from '../domain/battle';
import type { Rng } from '../domain/random';
import { type PracticeOutcome, useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import './battle.css';

const rng: Rng = Math.random;

export function parseArithKind(params: URLSearchParams): ArithKind | null {
  const kind = params.get('kind');
  return (ARITH_KINDS as readonly string[]).includes(kind ?? '') ? (kind as ArithKind) : null;
}

export function practiceUrl(kind: ArithKind): string {
  return `/practice?kind=${kind}`;
}

export function PracticeScreen() {
  const [params] = useSearchParams();
  const kind = parseArithKind(params);
  const [round, setRound] = useState(0);
  if (!kind) return <Navigate to="/explore" replace />;
  return <PracticeSession key={`${round}-${kind}`} kind={kind} onAgain={() => setRound((r) => r + 1)} />;
}

type Anim = { type: 'hit' | 'capture' | 'dodge'; monster: number; critical: boolean; stars: number } | null;

interface PracticeTally {
  correct: number;
  captureStars: number;
  slept: number;
  xp: number;
}

function PracticeSession({ kind, onAgain }: { kind: ArithKind; onAgain: () => void }) {
  const navigate = useNavigate();
  const stars = useGameStore((s) => s.economy.stars);
  const forceChoice = useGameStore((s) => s.settings.inputMode === 'choice');
  const { recordPracticeAnswer, recordCapture, finishPractice } = useGameStore.getState();
  // 이번 판의 입력 방식은 시작할 때 정한다 (끝나고 기록이 바뀌어도 판 중간에 바뀌지 않게)
  const [inputMode] = useState(() => practiceInputMode(kind, useGameStore.getState().practice[kind], forceChoice));

  const [battle, setBattle] = useState<PracticeBattle>(() => createPracticeBattle(kind, rng));
  const [anim, setAnim] = useState<Anim>(null);
  const [message, setMessage] = useState<string | null>(() => line('start'));
  const [buddyMood, setBuddyMood] = useState<BuddyMood>('cheer');
  const [typed, setTyped] = useState('');
  const [tally, setTally] = useState<PracticeTally>({ correct: 0, captureStars: 0, slept: 0, xp: 0 });
  const [finish, setFinish] = useState<(PracticeOutcome & { timeMs: number }) | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  /** 풀이 시간: 문제가 답을 기다린 시간 + 힌트를 본 시간 (연출 시간은 뺀다) */
  const solveMs = useRef(0);
  const hintAt = useRef<number | null>(null);
  const shownAt = useRef(performance.now());

  const item = currentPracticeItem(battle);
  const questionKey = item ? `${battle.index}:${item.question.a}${item.question.op}${item.question.b}:${item.isRetry}` : 'none';
  const question = useMemo(() => item?.question ?? null, [questionKey]);

  useEffect(() => {
    shownAt.current = performance.now();
    setTyped('');
  }, [questionKey]);

  // 오답이 많아 문제를 다 썼는데 몬스터가 남았으면 더 붙인다
  useEffect(() => {
    const next = topUpPractice(battle, rng);
    if (next !== battle) setBattle(next);
  }, [battle]);

  // 끝: 잠든 몬스터도 포획으로 인정하고 완료 보상
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
    const outcome = finishPractice(kind, solveMs.current, mistakes, Date.now(), battle.correctCount);
    setTally((t) => ({ ...t, xp: t.xp + outcome.xp }));
    if (outcome.evolvedTo) useSessionStore.getState().set({ pendingEvolution: outcome.evolvedTo });
    if (outcome.levelUp) useSessionStore.getState().set({ pendingLevelUp: outcome.levelUp });
    setFinish({ ...outcome, timeMs: solveMs.current });
    playSfx(outcome.evolvedTo || outcome.justMastered ? 'fanfare' : 'star');
  }, [battle, finish, anim, recordCapture, finishPractice, kind]);

  const submit = (value: number) => {
    if (!item || !question || anim || battle.phase !== 'question') return;
    const correct = value === question.answer;
    const ms = Math.round(performance.now() - shownAt.current);
    solveMs.current += ms;
    const res = recordPracticeAnswer(kind, correct, Date.now());
    const next = answerPractice(battle, correct, ms, rng);
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
    setTally((t) => ({ ...t, correct: t.correct + 1 }));
    setBuddyMood(last.captured || last.comboBurst ? 'party' : 'cheer');
    setMessage(line(last.captured ? 'capture' : last.comboBurst ? 'combo' : last.critical ? 'critical' : 'correct'));
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
      solveMs.current += performance.now() - hintAt.current;
      hintAt.current = null;
    }
    playSfx('correct');
    setBuddyMood('cheer');
    setMessage(line('hintDone'));
    setBattle((b) => finishPracticeHint(b));
  };

  if (finish) {
    return (
      <PracticeResult
        kind={kind}
        monsters={battle.monsters}
        tally={tally}
        finish={finish}
        attempts={battle.attempts}
        onAgain={onAgain}
        onExplore={() => navigate('/explore', { replace: true })}
      />
    );
  }

  const shownIndex = anim ? anim.monster : Math.min(battle.current, battle.monsters.length - 1);
  const shown = battle.monsters[shownIndex];
  const mood: MonsterMood =
    anim?.type === 'hit' ? 'hit' : anim?.type === 'capture' ? 'happy' : shown.status === 'sleeping' ? 'sleep' : 'idle';
  // 맞히는 순간 체력이 줄고(잡으면 0) 몬스터도 그만큼 작아진다
  const hp = anim?.type === 'capture' ? 0 : anim?.type === 'hit' ? Math.max(0, shown.hp - 1) : shown.hp;
  const inHint = battle.phase === 'hint';

  return (
    <div className="battle battle--practice">
      <header className="battle__top">
        <button type="button" className="icon-button" aria-label="셈 연습 그만하기" onClick={() => setConfirmQuit(true)}>
          ✕
        </button>
        <div className="monster-progress" aria-label="몬스터 진행">
          {battle.monsters.map((m, i) => (
            <span key={i} className={`pip pip--${m.status} ${i === shownIndex ? 'pip--current' : ''}`}>
              {i + 1}
            </span>
          ))}
        </div>
        <div className="stars" aria-label={`보유 별 ${stars}개`}>
          <span aria-hidden>★</span>
          <strong>{stars}</strong>
        </div>
      </header>

      <section className={`battle__stage ${inHint ? 'battle__stage--hint' : ''}`}>
        {inHint && question ? (
          <ArithHintPanel question={question} />
        ) : (
          <>
            <span className="stage-tag">
              {ARITH_INFO[kind].title}
            </span>
            <div className="hp" aria-label={`몬스터 체력 ${hp}`}>
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} className={i < hp ? 'hp__cell' : 'hp__cell hp__cell--empty'} />
              ))}
            </div>
            <div className="monster-scale" style={{ transform: `scale(${monsterScale(hp, 3)})` }}>
              <div key={`${shownIndex}-${anim?.type ?? 'idle'}`} className={`monster monster--${anim?.type ?? 'idle'}`}>
                <MonsterSprite kind={shown.kind} color={DAN_COLORS[shown.dan]} golden={false} mood={mood} size={260} />
              </div>
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
          <QuestionView display={question.display} fill={inputMode === 'keypad' && !inHint ? typed : undefined} />
        </section>
      )}

      <section className="battle__input">
        {question &&
          (inHint ? (
            <>
              <p className="hint-instruction">빛나는 정답을 눌러 보세요</p>
              <ChoiceGrid choices={question.choices} highlight={question.answer} onPick={onHintPick} />
            </>
          ) : inputMode === 'keypad' ? (
            <Keypad value={typed} onChange={setTyped} onSubmit={() => submit(Number(typed))} disabled={!!anim} />
          ) : (
            <ChoiceGrid choices={question.choices} onPick={submit} disabled={!!anim} />
          ))}
      </section>

      {confirmQuit && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="셈 연습 그만하기">
          <div className="modal__card">
            <p className="modal__title">셈 연습을 그만할까요?</p>
            <p className="modal__body">지금까지 모은 별은 저장돼요.</p>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => navigate('/explore', { replace: true })}>
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

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}초`;

function PracticeResult({
  kind,
  monsters,
  tally,
  finish,
  attempts,
  onAgain,
  onExplore,
}: {
  kind: ArithKind;
  monsters: MonsterSlot[];
  tally: PracticeTally;
  finish: PracticeOutcome & { timeMs: number };
  attempts: number;
  onAgain: () => void;
  onExplore: () => void;
}) {
  const lines = [
    ...(tally.correct > 0 ? [{ label: `정답 ${tally.correct}개`, stars: tally.correct * STAR_REWARDS.correct }] : []),
    { label: `몬스터 친구 ${monsters.length}마리`, stars: tally.captureStars },
    { label: '셈 연습 완료', stars: finish.stars },
    ...(finish.bonus > 0 ? [{ label: 'MASTER 보너스', stars: finish.bonus }] : []),
  ];
  const total = lines.reduce((sum, l) => sum + l.stars, 0);
  const showBest = finish.newBest && finish.record.plays > 1;
  const limitMs = practiceMasterMs(kind);
  const mistakes = finish.mistakes ?? 0;
  const passed = mistakes === 0 && finish.timeMs <= limitMs;
  return (
    <div className="result">
      {(showBest || finish.evolvedTo || finish.justMastered) && <Confetti />}
      <h1 className="result__title">{ARITH_INFO[kind].title} 완료!</h1>
      {finish.justMastered && <div className="banner banner--master">🏆 MASTER! 보너스 별 +{finish.bonus}</div>}
      <div className="neo-card trial-result">
        <span className="trial-result__label">풀이에 걸린 시간</span>
        <strong className="trial-result__time">⏱ {seconds(finish.timeMs)}</strong>
        <span className="trial-result__sub">
          {attempts}문제 · {showBest ? '최고 기록!' : `최고 기록 ${seconds(finish.record.bestMs ?? finish.timeMs)}`}
        </span>
        <span className="trial-result__sub practice-master-note">
          {mistakes > 0
            ? `틀린 문제 ${mistakes}개 — MASTER는 하나도 안 틀려야 해요`
            : passed
              ? `MASTER 기준 통과 (오답 0개 · ${limitMs / 1000}초 안)`
              : `오답 0개! MASTER까지 ${Math.ceil((finish.timeMs - limitMs) / 1000)}초 더 빠르게!`}
        </span>
      </div>
      {tally.slept > 0 && <p className="result__note">몬스터가 지쳐서 잠들었어요. 우리가 이겼어요!</p>}

      <div className="result__monsters">
        {monsters.map((m, i) => (
          <div key={i} className="result__monster" style={{ animationDelay: `${i * 0.15}s` }}>
            <MonsterSprite kind={m.kind} color={DAN_COLORS[m.dan]} mood={m.status === 'sleeping' ? 'sleep' : 'happy'} size={88} />
          </div>
        ))}
      </div>

      <ul className="result__lines">
        {lines.map((l) => (
          <li key={l.label}>
            <span>{l.label}</span>
            <strong>+{l.stars} ★</strong>
          </li>
        ))}
        <li className="result__total">
          <span>모은 별</span>
          <strong>+{total} ★</strong>
        </li>
      </ul>
      <p className="result__note">
        펫 성장 점수 +{tally.xp}
        {finish.affection > 0 && ` · 친밀도 +${finish.affection}`}
      </p>

      <div className="result__actions">
        <button type="button" className="btn btn--ghost" onClick={onAgain}>
          한 번 더!
        </button>
        <button type="button" className="btn btn--primary" onClick={onExplore}>
          탐험으로
        </button>
      </div>
    </div>
  );
}
