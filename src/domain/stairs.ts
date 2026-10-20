/**
 * 무한의 계단 — 설계서 4-5.
 * 구구단 2~9·12·13단 문제를 맞힐 때마다 계단을 한 칸 오른다. 5초 안에 답하지 못하거나 틀리면 끝.
 * 문제 순서: 쉬운 문제 3개 → 자주 틀리는 문제 1개를 되풀이하고, 자주 틀리는 문제 자리 3번에 1번은 12·13단 문제.
 * 쉬움·어려움은 학습 기록(숙련도 상자·정답률·최근 오답)으로 정한다. 기록이 없으면 규칙 문제·작은 단을 쉬운 문제로 본다.
 */
import { BASE_DANS, CHALLENGE_DANS, type Fact, type FactId, FACTS } from './facts';
import { DAY_MS, type FactStat } from './mastery';
import { addStars, type EconomyData } from './progress';
import { type Rng, weightedPick } from './random';
import { localDateString } from './dates';

/** 한 문제에 주어진 시간 */
export const STAIRS_TIME_MS = 5000;
/** 오른 계단 한 칸마다 받는 별 */
export const STAIRS_STAR_PER_STEP = 1;
/** 같은 문제가 이만큼 지나기 전에는 다시 나오지 않는다 */
const RECENT_SIZE = 6;
/** 쉬운·어려운 문제 후보 수 (기록 순위 위쪽에서) */
const EASY_POOL = 30;
const HARD_POOL = 14;
const CHALLENGE_POOL = 12;

export type StairsSlot = 'easy' | 'hard' | 'challenge';

export interface StairsDeck {
  /** 지금까지 낸 문제 수 */
  issued: number;
  /** 지금까지 낸 '자주 틀리는 문제' 자리 수 (3번째마다 12·13단) */
  hardSlots: number;
  recent: FactId[];
}

export const newStairsDeck = (): StairsDeck => ({ issued: 0, hardSlots: 0, recent: [] });

/** n번째(0부터) 문제 자리: 쉬움 3개 → 어려움 1개, 어려움 자리 3번째마다 12·13단 */
export function slotAt(issued: number, hardSlots: number): StairsSlot {
  if (issued % 4 !== 3) return 'easy';
  return hardSlots % 3 === 2 ? 'challenge' : 'hard';
}

const BASE = FACTS.filter((f) => (BASE_DANS as readonly number[]).includes(f.a));
const CHALLENGE = FACTS.filter((f) => (CHALLENGE_DANS as readonly number[]).includes(f.a) && f.b >= 2);

const accuracy = (s: FactStat) => (s.attempts > 0 ? s.correct / s.attempts : 0.5);
const recentlyWrong = (s: FactStat, now: number) => s.lastWrongAt !== null && now - s.lastWrongAt < 3 * DAY_MS;

/** 쉬움 점수: 상자가 높고 정답률이 높을수록. 기록이 없으면 규칙 문제(×0·×1·×10)와 작은 곱이 쉽다. */
export function easeScore(f: Fact, s: FactStat, now: number): number {
  const noHistory = s.attempts === 0 ? (f.isRule ? 3 : 2 - f.product / 45) : 0;
  return s.box * 2 + accuracy(s) * 3 + noHistory - (recentlyWrong(s, now) ? 4 : 0);
}

/** 어려움 점수: 틀린 횟수·최근 오답·낮은 상자. 기록이 없으면 큰 곱이 어렵다. 규칙 문제는 어려움에서 뺀다. */
export function hardScore(f: Fact, s: FactStat, now: number): number {
  const wrong = s.attempts - s.correct;
  const noHistory = s.attempts === 0 ? f.product / 30 : 0;
  return wrong * 2 + (1 - accuracy(s)) * 3 + (recentlyWrong(s, now) ? 3 : 0) + (5 - s.box) * 0.4 + noHistory - (f.isRule ? 6 : 0);
}

function pickFrom(pool: readonly Fact[], score: (f: Fact) => number, size: number, recent: FactId[], rng: Rng): Fact {
  const ranked = [...pool].sort((x, y) => score(y) - score(x)).slice(0, size);
  const fresh = ranked.filter((f) => !recent.includes(f.id));
  const candidates = fresh.length > 0 ? fresh : ranked;
  // 순위가 높을수록 조금 더 자주 (맨 위만 계속 나오지 않게)
  return weightedPick(rng, candidates, (f) => size + 1 - ranked.indexOf(f)) ?? candidates[0];
}

/** 다음 문제를 고른다 */
export function nextStairsFact(
  deck: StairsDeck,
  facts: Record<FactId, FactStat>,
  now: number,
  rng: Rng,
): { fact: Fact; slot: StairsSlot; deck: StairsDeck } {
  const slot = slotAt(deck.issued, deck.hardSlots);
  const stat = (f: Fact) => facts[f.id];
  const fact =
    slot === 'easy'
      ? pickFrom(BASE, (f) => easeScore(f, stat(f), now), EASY_POOL, deck.recent, rng)
      : slot === 'hard'
        ? pickFrom(BASE, (f) => hardScore(f, stat(f), now), HARD_POOL, deck.recent, rng)
        : pickFrom(CHALLENGE, (f) => hardScore(f, stat(f), now), CHALLENGE_POOL, deck.recent, rng);
  return {
    fact,
    slot,
    deck: {
      issued: deck.issued + 1,
      hardSlots: deck.hardSlots + (slot === 'easy' ? 0 : 1),
      recent: [...deck.recent, fact.id].slice(-RECENT_SIZE),
    },
  };
}

// ── 기록과 보상 ──────────────────────────────────────

export interface StairsRecord {
  /** 가장 높이 오른 계단 수 */
  best: number;
  bestAt: string | null;
  plays: number;
  totalSteps: number;
}

export const emptyStairsRecord = (): StairsRecord => ({ best: 0, bestAt: null, plays: 0, totalSteps: 0 });

/** 한 판이 끝났을 때: 오른 계단 × 1별, 최고 기록 */
export function finishStairs(
  record: StairsRecord,
  economy: EconomyData,
  steps: number,
  now: number,
): { record: StairsRecord; economy: EconomyData; stars: number; newBest: boolean } {
  const stars = Math.max(0, steps) * STAIRS_STAR_PER_STEP;
  const newBest = steps > record.best;
  return {
    record: {
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
