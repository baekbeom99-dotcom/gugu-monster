/** 문제 유형별 생성 + 오답 보기 생성 — 설계서 3-2, 3-3 */
import { type Fact, MAX_PRODUCT } from './facts';
import type { Box } from './mastery';
import { type Rng, randomInt, shuffle, weightedPick } from './random';

export type QuestionType = 'product' | 'missingFirst' | 'missingSecond' | 'commutative' | 'sequence';

export const QUESTION_TYPES: readonly QuestionType[] = [
  'product',
  'missingFirst',
  'missingSecond',
  'commutative',
  'sequence',
];

/** 화면 표시 구조. null 칸이 빈칸(□)이다. */
export type QuestionDisplay =
  | { kind: 'equation'; a: number | null; b: number | null; result: number | null }
  | {
      kind: 'commutative';
      given: { a: number; b: number; result: number };
      ask: { a: number; b: number; result: null };
    }
  | { kind: 'sequence'; terms: (number | null)[] };

export interface Question {
  factId: Fact['id'];
  type: QuestionType;
  display: QuestionDisplay;
  answer: number;
  /** 4지선다 보기 (정답 포함, 섞인 순서) */
  choices: number[];
}

export const CHOICE_COUNT = 4;

/** 유형 기본 비율 (상자 기준). ⑤ 뛰어 세기는 별도 슬롯이라 여기 없다. */
const TYPE_WEIGHTS: Record<'new' | 'learning' | 'known', Partial<Record<QuestionType, number>>> = {
  new: { product: 1 },
  learning: { product: 40, missingFirst: 20, missingSecond: 20, commutative: 20 },
  known: { product: 25, missingFirst: 25, missingSecond: 25, commutative: 25 },
};

/** 이 사실·상자에서 해당 유형을 낼 수 있는지 (설계서 3-2 출제 조건) */
export function isTypeEligible(type: QuestionType, fact: Fact, box: Box): boolean {
  switch (type) {
    case 'product':
      return true;
    case 'missingFirst':
      // □ × 0 = 0 은 답이 여러 개라 출제하지 않는다.
      return box >= 1 && fact.b !== 0;
    case 'missingSecond':
      return box >= 1;
    case 'commutative':
      return box >= 2 && fact.a !== fact.b;
    case 'sequence':
      // 시작 항 a×k (k=0~6), 빈칸은 2~5번째 → 곱하는 수 1~10만 가능
      return fact.b >= 1;
  }
}

/** 상자에 맞춰 유형을 고른다. exclude는 재출제 시 직전 유형 (가능하면 피함). */
export function pickQuestionType(rng: Rng, fact: Fact, box: Box, exclude?: QuestionType): QuestionType {
  const table = box === 0 ? TYPE_WEIGHTS.new : box <= 2 ? TYPE_WEIGHTS.learning : TYPE_WEIGHTS.known;
  const candidates = (Object.keys(table) as QuestionType[]).filter((t) => isTypeEligible(t, fact, box));
  const preferred = candidates.filter((t) => t !== exclude);
  const pool = preferred.length > 0 ? preferred : candidates;
  return weightedPick(rng, pool, (t) => table[t] ?? 0) ?? 'product';
}

export function generateQuestion(rng: Rng, fact: Fact, type: QuestionType): Question {
  const { a, b, product } = fact;
  let display: QuestionDisplay;
  let answer: number;
  let distractors: number[];

  switch (type) {
    case 'product':
      display = { kind: 'equation', a, b, result: null };
      answer = product;
      distractors = productDistractors(rng, fact);
      break;
    case 'missingFirst':
      if (b === 0) throw new Error(`${fact.id}: □ × 0 문제는 만들 수 없다`);
      display = { kind: 'equation', a: null, b, result: product };
      answer = a;
      distractors = nearbyDistractors(rng, a, 1, 13, (d) => d * b !== product);
      break;
    case 'missingSecond':
      display = { kind: 'equation', a, b: null, result: product };
      answer = b;
      distractors = nearbyDistractors(rng, b, 0, 10, (d) => a * d !== product);
      break;
    case 'commutative':
      display = { kind: 'commutative', given: { a, b, result: product }, ask: { a: b, b: a, result: null } };
      answer = product;
      distractors = productDistractors(rng, fact);
      break;
    case 'sequence': {
      if (b < 1) throw new Error(`${fact.id}: 뛰어 세기 문제는 곱하는 수 1 이상만 가능`);
      // 빈칸 위치 i(1~4, 0부터 셈)와 시작 k를 b = k + i, 0 ≤ k ≤ 6 이 되게 고른다.
      const kMin = Math.max(0, b - 4);
      const kMax = Math.min(6, b - 1);
      const k = randomInt(rng, kMin, kMax);
      const blank = b - k;
      const terms: (number | null)[] = [0, 1, 2, 3, 4].map((i) => (i === blank ? null : a * (k + i)));
      display = { kind: 'sequence', terms };
      answer = product;
      distractors = sequenceDistractors(rng, fact);
      break;
    }
  }

  const choices = shuffle(rng, [answer, ...distractors.slice(0, CHOICE_COUNT - 1)]);
  return { factId: fact.id, type, display, answer, choices };
}

function inRange(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= MAX_PRODUCT;
}

/** 후보를 우선순위대로 거르고, 모자라면 fallback으로 채워 정확히 3개를 만든다. */
function finalize(answer: number, primary: number[], fallback: number[], accept: (n: number) => boolean): number[] {
  const out: number[] = [];
  for (const n of [...primary, ...fallback]) {
    if (out.length === CHOICE_COUNT - 1) break;
    if (n !== answer && accept(n) && !out.includes(n)) out.push(n);
  }
  if (out.length < CHOICE_COUNT - 1) throw new Error(`오답 보기를 만들 수 없음 (정답 ${answer})`);
  return out;
}

/** 결과 찾기·교환법칙용 오답 보기 */
export function productDistractors(rng: Rng, fact: Fact): number[] {
  const { a, b, product } = fact;
  const typical: number[] = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, a + b];
  if (product >= 10) {
    const s = String(product);
    if (s.length === 2) typical.push(Number(s[1] + s[0]));
  }
  if (b === 0) typical.unshift(a, 1, 10);
  if (b === 10) typical.unshift(product + 10, product - 10, a + 10);
  // 대표적인 실수 후보를 우선하되, 매번 같은 3개가 나오지 않도록 섞는다.
  const primary = shuffle(rng, typical.filter(inRange));
  const sameDan = shuffle(
    rng,
    Array.from({ length: 11 }, (_, m) => a * m),
  );
  const near = [product + 1, product - 1, product + 2, product - 2, product + 3];
  return finalize(product, primary, [...sameDan, ...near], inRange);
}

/** 앞/뒤 수 찾기용: 정답 ±1, ±2 범위 */
function nearbyDistractors(rng: Rng, answer: number, min: number, max: number, isWrong: (d: number) => boolean): number[] {
  const primary = shuffle(rng, [answer - 1, answer + 1, answer - 2, answer + 2]);
  const fallback = [answer + 3, answer - 3, answer + 4, answer - 4];
  return finalize(answer, primary, fallback, (d) => d >= min && d <= max && isWrong(d));
}

function sequenceDistractors(rng: Rng, fact: Fact): number[] {
  const { a, product } = fact;
  const primary = shuffle(rng, [product + 1, product - 1, product + a, product - a, product + 2]);
  const fallback = [product + 3, product - 2, product - 3];
  return finalize(product, primary, fallback, inRange);
}
