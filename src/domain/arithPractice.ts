/**
 * 셈 연습 전투와 기록. 구구단 전투(battle.ts)와 같은 규칙(몬스터 3마리 × 체력 3, 오답은 힌트 후 다시 냄, 실패 없음)을
 * 따르되, 문제가 곱셈 사실이 아니라서 숙련도·지도와는 이어지지 않는다.
 */
import { type ArithKind, type ArithQuestion, generateArith } from './arith';
import {
  type BattlePhase,
  COMBO_STEP,
  CRITICAL_MS,
  type LastHit,
  MAX_ATTEMPTS,
  MONSTER_COUNT,
  MONSTER_HP,
  MONSTER_KINDS,
  type MonsterSlot,
} from './battle';
import { GROWTH_XP, STAR_REWARDS } from './economy';
import { BASE_DANS } from './facts';
import { type EconomyData, addStars } from './progress';
import { pickOne, type Rng, randomInt, shuffle } from './random';
import { MAX_RETRIES } from './scheduler';

export const PRACTICE_SIZE = MONSTER_COUNT * MONSTER_HP;

export interface PracticeItem {
  question: ArithQuestion;
  isRetry: boolean;
}

export interface PracticeBattle {
  kind: ArithKind;
  plan: PracticeItem[];
  index: number;
  monsters: MonsterSlot[];
  current: number;
  attempts: number;
  correctCount: number;
  combo: number;
  maxCombo: number;
  phase: BattlePhase;
  last: LastHit | null;
}

/** 문제 n개. 같은 식이 겹치지 않게 (보수처럼 가짓수가 적으면 겹침을 허용). */
export function planPractice(rng: Rng, kind: ArithKind, n: number): PracticeItem[] {
  const out: PracticeItem[] = [];
  const seen = new Set<string>();
  for (let tries = 0; out.length < n && tries < n * 20; tries++) {
    const q = generateArith(rng, kind);
    const key = `${q.a}${q.op}${q.b}`;
    if (seen.has(key) && tries < n * 10) continue;
    // 직전 문제와 똑같은 식은 연달아 내지 않는다
    if (out.length > 0 && key === keyOf(out[out.length - 1].question)) continue;
    seen.add(key);
    out.push({ question: q, isRetry: false });
  }
  return out;
}

const keyOf = (q: ArithQuestion) => `${q.a}${q.op}${q.b}`;

export function createPracticeBattle(kind: ArithKind, rng: Rng): PracticeBattle {
  const kinds = shuffle(rng, MONSTER_KINDS);
  const monsters: MonsterSlot[] = Array.from({ length: MONSTER_COUNT }, (_, m) => ({
    kind: kinds[m],
    dan: pickOne(rng, BASE_DANS),
    golden: false,
    hp: MONSTER_HP,
    status: m === 0 ? 'active' : 'waiting',
  }));
  return {
    kind,
    plan: planPractice(rng, kind, PRACTICE_SIZE),
    index: 0,
    monsters,
    current: 0,
    attempts: 0,
    correctCount: 0,
    combo: 0,
    maxCombo: 0,
    phase: 'question',
    last: null,
  };
}

export function currentPracticeItem(state: PracticeBattle): PracticeItem | null {
  return state.phase === 'done' ? null : (state.plan[state.index] ?? null);
}

/** 계획한 문제를 다 썼는데 몬스터가 남았으면 같은 종류 문제를 더 붙인다. */
export function topUpPractice(state: PracticeBattle, rng: Rng): PracticeBattle {
  if (state.phase !== 'question' || state.index < state.plan.length) return state;
  return { ...state, plan: [...state.plan, ...planPractice(rng, state.kind, 3)] };
}

/** 틀린 식을 2~3문제 뒤에 다시 낸다 (보기 순서만 바꿔서). 남은 문제가 모자라면 맨 뒤. */
export function insertPracticeRetry(plan: readonly PracticeItem[], currentIndex: number, rng: Rng): PracticeItem[] {
  if (plan.filter((it) => it.isRetry).length >= MAX_RETRIES) return [...plan];
  const wrong = plan[currentIndex].question;
  const retry: PracticeItem = { question: { ...wrong, choices: shuffle(rng, wrong.choices) }, isRetry: true };
  const at = Math.min(plan.length, currentIndex + 1 + randomInt(rng, 2, 3));
  return [...plan.slice(0, at), retry, ...plan.slice(at)];
}

export function answerPractice(state: PracticeBattle, correct: boolean, ms: number, rng: Rng): PracticeBattle {
  if (state.phase !== 'question' || !state.plan[state.index]) return state;
  const attempts = state.attempts + 1;

  if (!correct) {
    return {
      ...state,
      plan: insertPracticeRetry(state.plan, state.index, rng),
      attempts,
      combo: 0,
      phase: 'hint',
      last: { correct: false, critical: false, captured: false, comboBurst: false },
    };
  }

  const monsters = state.monsters.map((m) => ({ ...m }));
  const target = monsters[state.current];
  target.hp -= 1;
  const captured = target.hp <= 0;
  let current = state.current;
  if (captured) {
    target.status = 'captured';
    current += 1;
    if (current < monsters.length) monsters[current].status = 'active';
  }
  const combo = state.combo + 1;
  return settleLimit({
    ...state,
    index: state.index + 1,
    monsters,
    current,
    attempts,
    correctCount: state.correctCount + 1,
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    phase: current >= monsters.length ? 'done' : 'question',
    last: { correct: true, critical: ms <= CRITICAL_MS, captured, comboBurst: combo % COMBO_STEP === 0 },
  });
}

/** 힌트를 보고 빛나는 정답을 누르면 다음 문제로 */
export function finishPracticeHint(state: PracticeBattle): PracticeBattle {
  if (state.phase !== 'hint') return state;
  return settleLimit({ ...state, index: state.index + 1, phase: 'question' });
}

/** 시도 상한에 닿으면 남은 몬스터는 잠들어 포획된다 (실패 없음). */
function settleLimit(state: PracticeBattle): PracticeBattle {
  if (state.phase !== 'question' || state.attempts < MAX_ATTEMPTS) return state;
  return {
    ...state,
    monsters: state.monsters.map((m) => (m.status === 'captured' ? m : { ...m, hp: 0, status: 'sleeping' })),
    current: state.monsters.length,
    phase: 'done',
  };
}

// ── 기록과 보상 ──────────────────────────────────────

export interface PracticeRecord {
  /** 끝까지 마친 판 수 */
  plays: number;
  attempts: number;
  correct: number;
  /** 끝까지 마친 판의 가장 짧은 풀이 시간(ms) */
  bestMs: number | null;
}

export type PracticeData = Partial<Record<ArithKind, PracticeRecord>>;

export function emptyPracticeRecord(): PracticeRecord {
  return { plays: 0, attempts: 0, correct: 0, bestMs: null };
}

/** 셈 연습의 답 하나: 정답이면 별 1개, 성장 XP는 구구단과 같다 (시도 1 + 정답 1) */
export function recordPracticeAnswer(
  practice: PracticeData,
  economy: EconomyData,
  kind: ArithKind,
  correct: boolean,
): { practice: PracticeData; economy: EconomyData; stars: number; xp: number } {
  const rec = practice[kind] ?? emptyPracticeRecord();
  const stars = correct ? STAR_REWARDS.correct : 0;
  return {
    practice: { ...practice, [kind]: { ...rec, attempts: rec.attempts + 1, correct: rec.correct + (correct ? 1 : 0) } },
    economy: addStars(economy, stars),
    stars,
    xp: GROWTH_XP.attempt + (correct ? GROWTH_XP.correctBonus : 0),
  };
}

/** 셈 연습을 끝까지 마쳤을 때: 완료 별 3개 + 최고 기록. ('오늘 첫 탐험' 보너스는 구구단 탐험에만) */
export function finishPractice(
  practice: PracticeData,
  economy: EconomyData,
  kind: ArithKind,
  timeMs: number,
): { practice: PracticeData; economy: EconomyData; stars: number; xp: number; newBest: boolean; record: PracticeRecord } {
  const rec = practice[kind] ?? emptyPracticeRecord();
  const newBest = rec.bestMs === null || timeMs < rec.bestMs;
  const record: PracticeRecord = { ...rec, plays: rec.plays + 1, bestMs: newBest ? timeMs : rec.bestMs };
  return {
    practice: { ...practice, [kind]: record },
    economy: addStars(economy, STAR_REWARDS.complete),
    stars: STAR_REWARDS.complete,
    xp: GROWTH_XP.complete,
    newBest,
    record,
  };
}

/**
 * 입력 방식: 보수는 늘 보기에서 고른다. 덧셈·뺄셈은 그 종류를 처음 할 때는 보기로,
 * 한 판을 끝까지 마친 뒤부터는 직접 쓴다 (설정에서 '보기만'을 골랐으면 늘 보기).
 */
export function practiceInputMode(kind: ArithKind, record: PracticeRecord | undefined, forceChoice: boolean): 'choice' | 'keypad' {
  if (forceChoice || kind === 'comp10' || kind === 'comp5') return 'choice';
  return (record?.plays ?? 0) >= 1 ? 'keypad' : 'choice';
}
