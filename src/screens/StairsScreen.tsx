/**
 * 무한의 계단 — 설계서 4-5.
 * 키우는 펫이 계단을 오른다. 구구단 문제를 5초 안에 맞히면 한 칸, 틀리거나 시간이 지나면 떨어져서 끝.
 * 답은 빠르게 고를 수 있도록 언제나 보기 4개. 오른 계단만큼 별을 받는다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hatArtOf } from '../art/HatSprite';
import { EggSprite, type PetExpression, PetSprite } from '../art/PetSprite';
import { playSfx } from '../audio/sfx';
import { ChoiceGrid } from '../components/AnswerInput';
import { Confetti } from '../components/Confetti';
import { QuestionView } from '../components/QuestionView';
import type { Fact } from '../domain/facts';
import { generateQuestion, type Question } from '../domain/questionGen';
import type { Rng } from '../domain/random';
import {
  newStairsDeck,
  nextStairsFact,
  STAIRS_STAR_PER_STEP,
  STAIRS_TIME_MS,
  type StairsDeck,
  type StairsSlot,
  stairsPath,
} from '../domain/stairs';
import { findItem } from '../domain/shop';
import { useGameStore } from '../store/useGameStore';
import './battle.css';
import './stairs.css';

const rng: Rng = Math.random;
/** 계단 한 칸의 가로·세로 간격(px) */
const STEP_W = 54;
const STEP_H = 40;
/** 화면에 그리는 계단: 아래로 몇 칸, 위로 몇 칸 */
const BELOW = 4;
const ABOVE = 8;

type Phase = 'ready' | 'count' | 'play' | 'over';

interface Current {
  fact: Fact;
  slot: StairsSlot;
  question: Question;
}

interface Result {
  steps: number;
  stars: number;
  newBest: boolean;
  best: number;
  reason: 'timeout' | 'wrong';
  missed: Current;
}

const SLOT_LABEL: Record<StairsSlot, string | null> = { easy: null, hard: '도전!', challenge: '황금 계단' };

/** 오른 높이에 따라 하늘이 바뀐다 */
function skyOf(steps: number): string {
  if (steps >= 60) return 'space';
  if (steps >= 40) return 'night';
  if (steps >= 20) return 'sunset';
  return 'day';
}

export function StairsScreen() {
  const navigate = useNavigate();
  const pet = useGameStore((s) => s.pet);
  const catalog = useGameStore((s) => s.catalog);
  const record = useGameStore((s) => s.stairs);
  const stars = useGameStore((s) => s.economy.stars);

  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState(3);
  const [steps, setSteps] = useState(0);
  const [path, setPath] = useState<number[]>(() => stairsPath(40, rng));
  const [current, setCurrent] = useState<Current | null>(null);
  const [left, setLeft] = useState(STAIRS_TIME_MS);
  const [result, setResult] = useState<Result | null>(null);
  const deck = useRef<StairsDeck>(newStairsDeck());
  const deadline = useRef(0);
  const ended = useRef(false);

  const draw = useCallback(() => {
    const r = nextStairsFact(deck.current, useGameStore.getState().learning.facts, Date.now(), rng);
    deck.current = r.deck;
    setCurrent({ fact: r.fact, slot: r.slot, question: generateQuestion(rng, r.fact, 'product') });
    deadline.current = performance.now() + STAIRS_TIME_MS;
    setLeft(STAIRS_TIME_MS);
  }, []);

  const start = () => {
    playSfx('tap');
    deck.current = newStairsDeck();
    ended.current = false;
    setSteps(0);
    setPath(stairsPath(40, rng));
    setResult(null);
    setCurrent(null);
    setCount(3);
    setPhase('count');
  };

  // 3, 2, 1 — 첫 문제부터 시간이 흐르지 않게
  useEffect(() => {
    if (phase !== 'count') return;
    if (count === 0) {
      setPhase('play');
      draw();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 600);
    return () => clearTimeout(t);
  }, [phase, count, draw]);

  const end = useCallback(
    (reason: Result['reason']) => {
      if (ended.current || !current) return;
      ended.current = true;
      const r = useGameStore.getState().finishStairs(steps, Date.now());
      setResult({ steps, stars: r.stars, newBest: r.newBest, best: r.record.best, reason, missed: current });
      setPhase('over');
      playSfx(r.newBest && steps > 0 ? 'fanfare' : 'gentle');
    },
    [current, steps],
  );

  // 남은 시간: 0.05초마다. 다 되면 떨어진다.
  useEffect(() => {
    if (phase !== 'play') return;
    const t = setInterval(() => {
      const ms = Math.max(0, deadline.current - performance.now());
      setLeft(ms);
      if (ms <= 0) end('timeout');
    }, 50);
    return () => clearInterval(t);
  }, [phase, end]);

  const pick = (value: number) => {
    if (phase !== 'play' || !current || ended.current) return;
    if (value !== current.question.answer) {
      end('wrong');
      return;
    }
    playSfx(steps > 0 && (steps + 1) % 10 === 0 ? 'combo' : 'correct');
    setSteps((s) => s + 1);
    // 계단이 모자라면 더 이어 붙인다
    if (steps + ABOVE + 2 >= path.length) {
      setPath((p) => {
        const more = stairsPath(40, rng);
        const last = p[p.length - 1];
        const lastDir = p[p.length - 1] - p[p.length - 2];
        return [...p, ...more.slice(1).map((x) => last + (lastDir < 0 ? -x : x))];
      });
    }
    draw();
  };

  const hat = hatArtOf(findItem(catalog, pet.equippedHat ?? ''));
  const expression: PetExpression = phase === 'over' ? (result?.newBest && result.steps > 0 ? 'excited' : 'request') : phase === 'play' ? 'happy' : 'idle';
  const climber = useMemo(
    () =>
      !pet.species ? null : pet.stage === 'egg' ? (
        <EggSprite species={pet.species} size={64} />
      ) : (
        <PetSprite species={pet.species} stage={pet.stage} expression={expression} size={84} hat={hat} />
      ),
    [pet.species, pet.stage, expression, hat],
  );

  const camX = (path[steps] ?? 0) * STEP_W;
  const camY = steps * STEP_H;
  const first = Math.max(0, steps - BELOW);
  const lastStep = Math.min(path.length - 1, steps + ABOVE);
  const timeRatio = left / STAIRS_TIME_MS;

  return (
    <div className={`stairs stairs--${skyOf(steps)}`}>
      <header className="stairs__top">
        <button type="button" className="icon-button" aria-label="무한의 계단 그만하기" onClick={() => navigate('/explore', { replace: true })}>
          ✕
        </button>
        <div className="stairs__count" aria-label={`오른 계단 ${steps}칸`}>
          <span aria-hidden>🪜</span> <strong>{steps}</strong>칸
        </div>
        <div className="stairs__best">
          최고 <strong>{Math.max(record.best, result?.best ?? 0)}</strong>
        </div>
        <div className="stars" aria-label={`보유 별 ${stars}개`}>
          <span aria-hidden>★</span>
          <strong>{stars}</strong>
        </div>
      </header>

      <section className="stairs__scene" aria-hidden>
        <div className="stairs__world" style={{ transform: `translate(${-camX}px, ${camY}px)` }}>
          {Array.from({ length: lastStep - first + 1 }, (_, k) => {
            const i = first + k;
            return (
              <div
                key={i}
                className={`stair ${i === steps ? 'stair--here' : ''} ${i % 10 === 0 && i > 0 ? 'stair--ten' : ''}`}
                style={{ left: path[i] * STEP_W, top: -i * STEP_H }}
              >
                {i % 10 === 0 && i > 0 && <span className="stair__mark">{i}</span>}
              </div>
            );
          })}
          <div
            key={phase === 'over' ? 'fall' : `step-${steps}`}
            className={`stairs__pet ${phase === 'over' ? 'stairs__pet--fall' : steps > 0 ? 'stairs__pet--hop' : ''}`}
            style={{ left: camX, top: -camY }}
          >
            {climber}
          </div>
        </div>
        {phase === 'count' && (
          <div key={count} className="stairs__countdown">
            {count > 0 ? count : '출발!'}
          </div>
        )}
      </section>

      {phase === 'ready' && (
        <section className="neo-card stairs__panel">
          <h1 className="stairs__title">무한의 계단</h1>
          <ul className="stairs__rules">
            <li>구구단을 맞힐 때마다 계단을 한 칸씩 올라요.</li>
            <li>
              <strong>5초</strong> 안에 답하지 못하거나 틀리면 떨어져요!
            </li>
            <li>쉬운 문제 3개 다음엔 자주 틀린 문제, 가끔 12·13단 황금 계단도 나와요.</li>
            <li>
              올라간 계단 한 칸마다 별 <strong>{STAIRS_STAR_PER_STEP}개</strong>!
            </li>
          </ul>
          <p className="stairs__record">
            {record.best > 0 ? `내 최고 기록 ${record.best}칸 · ${record.plays}번 도전` : '아직 기록이 없어요. 첫 기록을 세워 볼까요?'}
          </p>
          <button type="button" className="btn btn--primary stairs__start" onClick={start}>
            오르기 시작!
          </button>
        </section>
      )}

      {phase === 'play' && current && (
        <section className="stairs__play">
          <div className={`stairs__timer ${timeRatio < 0.35 ? 'stairs__timer--hurry' : ''}`} role="timer" aria-label={`남은 시간 ${(left / 1000).toFixed(1)}초`}>
            <span style={{ width: `${timeRatio * 100}%` }} />
          </div>
          <div className={`battle__question stairs__question ${current.slot !== 'easy' ? `stairs__question--${current.slot}` : ''}`}>
            {SLOT_LABEL[current.slot] && <span className="stairs__slot">{SLOT_LABEL[current.slot]}</span>}
            <QuestionView display={current.question.display} />
          </div>
          <ChoiceGrid key={`${steps}-${current.fact.id}`} choices={current.question.choices} onPick={pick} />
        </section>
      )}

      {phase === 'over' && result && (
        <section className="neo-card stairs__panel stairs__panel--over">
          {result.newBest && result.steps > 0 && <Confetti />}
          <p className="stairs__reason">{result.reason === 'timeout' ? '⏰ 시간이 다 됐어요!' : '앗, 헛디뎠어요!'}</p>
          <p className="stairs__answer">
            {result.missed.fact.a} × {result.missed.fact.b} = <strong>{result.missed.fact.product}</strong>
          </p>
          <h1 className="stairs__result">
            <strong>{result.steps}</strong>칸 올랐어요!
          </h1>
          {result.newBest && result.steps > 0 ? (
            <div className="banner banner--master">🏆 최고 기록!</div>
          ) : (
            <p className="stairs__record">최고 기록 {result.best}칸</p>
          )}
          <p className="stairs__stars">+{result.stars} ★</p>
          <div className="result__actions">
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/explore', { replace: true })}>
              탐험으로
            </button>
            <button type="button" className="btn btn--primary" onClick={start}>
              다시 오르기
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
