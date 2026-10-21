/**
 * 무한의 계단 — 설계서 4-5.
 * 구구단 2~9·12·13단 문제를 맞힐 때마다 계단을 한 칸 오른다. 5초(12·13단은 10초) 안에 답하지 못하거나 틀리면 끝.
 * 문제 배치 (v1.24): 2~9단 중 '자주 틀리는 문제'를 뺀 문제 3개 → 자주 틀리는 문제 1개를 되풀이한다.
 * 10의 배수 층(10·20·30…층으로 오르는 문제)은 12·13단 문제 (v1.27: 12·13단을 빼고 하면 그 층은 자주 틀리는 문제).
 * 10의 배수 층을 지날 때마다 펫 친밀도가 오른다.
 * '자주 틀리는 문제'는 학습 기록(틀린 횟수·정답률·최근 오답·숙련도 상자)으로 정한다.
 */
import { BASE_DANS, CHALLENGE_DANS, type Fact, type FactId, FACTS } from './facts';
import { DAY_MS, type FactStat } from './mastery';
import { addStars, type EconomyData } from './progress';
import { pickOne, type Rng, weightedPick } from './random';
import { localDateString } from './dates';

/** 한 문제에 주어진 시간 (2~9단) */
export const STAIRS_TIME_MS = 5000;
/** 12·13단 문제에 주어진 시간 (v1.26) */
export const STAIRS_CHALLENGE_TIME_MS = 10000;

/** 이 문제에 주어진 시간: 12·13단은 10초, 나머지는 5초 */
export function stairsTimeFor(fact: Fact): number {
  return fact.isChallenge ? STAIRS_CHALLENGE_TIME_MS : STAIRS_TIME_MS;
}
/** 오른 계단 한 칸마다 받는 별 (v1.25: 2개) */
export const STAIRS_STAR_PER_STEP = 2;
/** 10층을 넘을 때마다 보너스 별 */
export const STAIRS_BONUS_EVERY = 10;
export const STAIRS_BONUS_STARS = 10;

/** 받는 별: 계단 수 × 2 + 10층마다 10 (예: 12층 → 24 + 10 = 34) */
/** 12·13단 문제를 하나 맞힐 때마다 더 받는 별 (v1.28) */
export const STAIRS_CHALLENGE_STARS = 30;
/** 12·13단 문제를 하나 맞힐 때마다 더 오르는 친밀도 (v1.28) */
export const STAIRS_CHALLENGE_AFFECTION = 10;

export function stairsStars(steps: number, challenges = 0): number {
  const n = Math.max(0, steps);
  return n * STAIRS_STAR_PER_STEP + Math.floor(n / STAIRS_BONUS_EVERY) * STAIRS_BONUS_STARS + Math.max(0, challenges) * STAIRS_CHALLENGE_STARS;
}
/** 같은 문제가 이만큼 지나기 전에는 다시 나오지 않는다 */
const RECENT_SIZE = 6;
/** 기록에 자주 틀리는 문제가 없을 때 대신 쓸 '어려운 문제' 수 (큰 곱부터) */
const FALLBACK_WRONG = 14;
/** 12·13단 층은 이 층마다 */
export const CHALLENGE_FLOOR_EVERY = 10;
/** 10의 배수 층을 지날 때마다 오르는 펫 친밀도 (탐험 한 번과 같다) */
export const STAIRS_AFFECTION_PER_TEN = 3;

/** 이번 판에서 오른 친밀도: 10층마다 3 (예: 23층 → 6) */
export function stairsAffection(steps: number, challenges = 0): number {
  return Math.floor(Math.max(0, steps) / CHALLENGE_FLOOR_EVERY) * STAIRS_AFFECTION_PER_TEN + Math.max(0, challenges) * STAIRS_CHALLENGE_AFFECTION;
}

/** normal: 2~9단 (자주 틀리는 문제 빼고), wrong: 자주 틀리는 문제, challenge: 12·13단 (10의 배수 층) */
export type StairsSlot = 'normal' | 'wrong' | 'challenge';

export interface StairsDeck {
  /** 지금까지 낸 문제 수 */
  issued: number;
  recent: FactId[];
}

export const newStairsDeck = (): StairsDeck => ({ issued: 0, recent: [] });

/**
 * n번째(0부터) 문제 자리. 이 문제를 맞히면 n+1층. 10의 배수 층은 12·13단(빼고 하면 자주 틀리는 문제),
 * 아니면 보통 3개 → 자주 틀리는 문제 1개.
 */
export function slotAt(issued: number, includeChallenge = true): StairsSlot {
  if ((issued + 1) % CHALLENGE_FLOOR_EVERY === 0) return includeChallenge ? 'challenge' : 'wrong';
  return issued % 4 === 3 ? 'wrong' : 'normal';
}

const BASE = FACTS.filter((f) => (BASE_DANS as readonly number[]).includes(f.a));
const CHALLENGE = FACTS.filter((f) => (CHALLENGE_DANS as readonly number[]).includes(f.a) && f.b >= 2);

const accuracy = (s: FactStat) => (s.attempts > 0 ? s.correct / s.attempts : 0.5);
const recentlyWrong = (s: FactStat, now: number) => s.lastWrongAt !== null && now - s.lastWrongAt < 3 * DAY_MS;

/** 어려움 점수: 틀린 횟수·최근 오답·낮은 상자. 기록이 없으면 큰 곱이 어렵다. 규칙 문제(×0·×1·×10)는 낮게. */
export function hardScore(f: Fact, s: FactStat, now: number): number {
  const wrong = s.attempts - s.correct;
  const noHistory = s.attempts === 0 ? f.product / 30 : 0;
  return wrong * 2 + (1 - accuracy(s)) * 3 + (recentlyWrong(s, now) ? 3 : 0) + (5 - s.box) * 0.4 + noHistory - (f.isRule ? 6 : 0);
}

/** 자주 틀리는 문제: 한 번 이상 틀렸고, 정답률 85% 미만이거나 최근 3일 안에 틀렸거나 숙련도 상자 2 이하 */
export function isFrequentlyWrong(s: FactStat, now: number): boolean {
  const wrong = s.attempts - s.correct;
  return wrong >= 1 && (accuracy(s) < 0.85 || recentlyWrong(s, now) || s.box <= 2);
}

/**
 * 2~9단을 '자주 틀리는 문제'와 나머지로 나눈다.
 * 기록에 자주 틀리는 문제가 없으면 어려움 점수가 높은 문제(기록이 없으면 큰 곱) 14개를 대신 쓴다.
 */
export function splitBasePool(facts: Record<FactId, FactStat>, now: number): { wrong: Fact[]; normal: Fact[] } {
  let wrong = BASE.filter((f) => isFrequentlyWrong(facts[f.id], now));
  if (wrong.length === 0) {
    wrong = [...BASE].sort((x, y) => hardScore(y, facts[y.id], now) - hardScore(x, facts[x.id], now)).slice(0, FALLBACK_WRONG);
  }
  const ids = new Set(wrong.map((f) => f.id));
  return { wrong, normal: BASE.filter((f) => !ids.has(f.id)) };
}

/** 최근에 나온 문제는 빼고 고른다 (모두 최근이면 그냥 고른다) */
function fresh(pool: readonly Fact[], recent: FactId[]): Fact[] {
  const f = pool.filter((x) => !recent.includes(x.id));
  return f.length > 0 ? f : [...pool];
}

/** 다음 문제를 고른다 */
export function nextStairsFact(
  deck: StairsDeck,
  facts: Record<FactId, FactStat>,
  now: number,
  rng: Rng,
  includeChallenge = true,
): { fact: Fact; slot: StairsSlot; deck: StairsDeck } {
  const slot = slotAt(deck.issued, includeChallenge);
  const score = (f: Fact) => Math.max(0.5, hardScore(f, facts[f.id], now));
  let fact: Fact;
  if (slot === 'challenge') {
    fact = weightedPick(rng, fresh(CHALLENGE, deck.recent), score) ?? pickOne(rng, CHALLENGE);
  } else {
    const { wrong, normal } = splitBasePool(facts, now);
    // 보통 자리는 고르게, 자주 틀리는 자리는 더 자주 틀린 문제일수록 자주
    fact =
      slot === 'normal'
        ? pickOne(rng, fresh(normal, deck.recent))
        : (weightedPick(rng, fresh(wrong, deck.recent), score) ?? pickOne(rng, wrong));
  }
  return { fact, slot, deck: { issued: deck.issued + 1, recent: [...deck.recent, fact.id].slice(-RECENT_SIZE) } };
}

// ── 기록과 보상 ──────────────────────────────────────

export interface StairsRecord {
  /** 가장 높이 오른 계단 수 */
  best: number;
  bestAt: string | null;
  plays: number;
  totalSteps: number;
  /** 12·13단을 넣고 할지 (시작 화면에서 고른다, 기본 넣기) */
  includeChallenge: boolean;
}

export const emptyStairsRecord = (): StairsRecord => ({ best: 0, bestAt: null, plays: 0, totalSteps: 0, includeChallenge: true });

/** 한 판이 끝났을 때: 계단 × 2별 + 10층마다 10별, 최고 기록 */
export function finishStairs(
  record: StairsRecord,
  economy: EconomyData,
  steps: number,
  now: number,
  challenges = 0,
): { record: StairsRecord; economy: EconomyData; stars: number; newBest: boolean } {
  const stars = stairsStars(steps, challenges);
  const newBest = steps > record.best;
  return {
    record: {
      ...record,
      best: newBest ? steps : record.best,
      bestAt: newBest ? localDateString(now) : record.bestAt,
      plays: record.plays + 1,
      totalSteps: record.totalSteps + Math.max(0, steps),
    },
    economy: addStars(economy, stars),
    stars,
    newBest,
  };
}

/** 계단 모양: 원작처럼 왼쪽·오른쪽으로 꺾인다. 같은 방향이 2~4칸 이어진 뒤 바뀐다. i번째 계단의 가로 칸 위치. */
export function stairsPath(count: number, rng: Rng): number[] {
  const xs = [0];
  let dir = rng() < 0.5 ? -1 : 1;
  let run = 0;
  let runLength = 2 + Math.floor(rng() * 3);
  while (xs.length < count) {
    if (run >= runLength) {
      dir = -dir;
      run = 0;
      runLength = 2 + Math.floor(rng() * 3);
    }
    xs.push(xs[xs.length - 1] + dir);
    run += 1;
  }
  return xs;
}
