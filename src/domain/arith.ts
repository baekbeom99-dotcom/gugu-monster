/**
 * 셈 연습 문제 생성: 받아올림·받아내림 유무 덧셈·뺄셈(기본·고수), 10의 보수, 5의 보수.
 * 기본 단계는 한 자리 수끼리 (받아내림 있는 뺄셈은 한 자리 − 한 자리 · 19 이하의 수 − 한 자리),
 * 고수 단계는 두 자리 ± 한·두 자리 (처음 만든 네 가지 — 예전 기록은 고수 단계로 이어진다).
 */
import { type Rng, randomInt, shuffle } from './random';

export type ArithKind =
  | 'addNoCarryBasic'
  | 'addCarryBasic'
  | 'subNoBorrowBasic'
  | 'subBorrowBasic'
  | 'addNoCarry'
  | 'addCarry'
  | 'subNoBorrow'
  | 'subBorrow'
  | 'comp10'
  | 'comp5';

/** 단계: 기본(한 자리) · 고수(두 자리) · 보수 */
export type ArithLevel = 'basic' | 'hard' | 'comp';

export const BASIC_ARITH_KINDS: readonly ArithKind[] = ['addNoCarryBasic', 'addCarryBasic', 'subNoBorrowBasic', 'subBorrowBasic'];
export const HARD_ARITH_KINDS: readonly ArithKind[] = ['addNoCarry', 'addCarry', 'subNoBorrow', 'subBorrow'];
export const COMP_ARITH_KINDS: readonly ArithKind[] = ['comp10', 'comp5'];
export const ARITH_KINDS: readonly ArithKind[] = [...BASIC_ARITH_KINDS, ...HARD_ARITH_KINDS, ...COMP_ARITH_KINDS];

export const ARITH_LEVEL_LABELS: Record<ArithLevel, string> = { basic: '기본', hard: '고수', comp: '보수' };

export const ARITH_INFO: Record<ArithKind, { title: string; example: string; level: ArithLevel }> = {
  addNoCarryBasic: { title: '받아올림 없는 덧셈 (기본)', example: '3 + 4', level: 'basic' },
  addCarryBasic: { title: '받아올림 있는 덧셈 (기본)', example: '7 + 8', level: 'basic' },
  subNoBorrowBasic: { title: '받아내림 없는 뺄셈 (기본)', example: '8 − 3', level: 'basic' },
  subBorrowBasic: { title: '받아내림 있는 뺄셈 (기본)', example: '9 − 4 · 13 − 7', level: 'basic' },
  addNoCarry: { title: '받아올림 없는 덧셈 (고수)', example: '23 + 14', level: 'hard' },
  addCarry: { title: '받아올림 있는 덧셈 (고수)', example: '47 + 8', level: 'hard' },
  subNoBorrow: { title: '받아내림 없는 뺄셈 (고수)', example: '58 − 23', level: 'hard' },
  subBorrow: { title: '받아내림 있는 뺄셈 (고수)', example: '63 − 28', level: 'hard' },
  comp10: { title: '10의 보수', example: '7 + ? = 10', level: 'comp' },
  comp5: { title: '5의 보수', example: '2 + ? = 5', level: 'comp' },
};

export type ArithOp = '+' | '−';

/** 화면 표시 구조. null 칸이 빈칸(□)이다. */
export interface ArithDisplay {
  kind: 'arith';
  op: ArithOp;
  a: number | null;
  b: number | null;
  result: number | null;
}

export interface ArithQuestion {
  kind: ArithKind;
  op: ArithOp;
  /** 빈칸을 채운 완전한 식: a op b = result */
  a: number;
  b: number;
  result: number;
  display: ArithDisplay;
  answer: number;
  /** 4지선다 보기 (정답 포함, 섞인 순서) */
  choices: number[];
}

const CHOICE_COUNT = 4;
/** 두 자리 + 두 자리의 가장 큰 합 */
export const MAX_ARITH_RESULT = 99 + 99;

/** 어느 한 자리라도 더해서 10이 넘으면 받아올림이 있다 */
export function hasCarry(a: number, b: number): boolean {
  for (let x = a, y = b; x > 0 || y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) {
    if ((x % 10) + (y % 10) >= 10) return true;
  }
  return false;
}

/** 어느 한 자리라도 빼는 수의 숫자가 더 크면 받아내림이 있다 (a ≥ b) */
export function hasBorrow(a: number, b: number): boolean {
  for (let x = a, y = b; y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) {
    if (x % 10 < y % 10) return true;
  }
  return false;
}

/** 두 자리 수와, 절반은 한 자리 수 · 절반은 두 자리 수 */
function pickOperands(rng: Rng): [number, number] {
  const a = randomInt(rng, 10, 99);
  const b = rng() < 0.5 ? randomInt(rng, 1, 9) : randomInt(rng, 10, 99);
  return [a, b];
}

/** 조건에 맞는 두 수를 고른다. 대부분 몇 번 안에 나오지만 만약을 위해 고정 예시로 끝낸다. */
function sample(rng: Rng, accept: (a: number, b: number) => boolean, fallback: [number, number]): [number, number] {
  for (let i = 0; i < 500; i++) {
    const [a, b] = pickOperands(rng);
    if (accept(a, b)) return [a, b];
  }
  return fallback;
}

export function generateArith(rng: Rng, kind: ArithKind): ArithQuestion {
  switch (kind) {
    // ── 기본 단계: 한 자리 수 ──
    case 'addNoCarryBasic': {
      // 한 자리 + 한 자리, 합이 9 이하
      const a = randomInt(rng, 1, 8);
      const b = randomInt(rng, 1, 9 - a);
      return equation(rng, kind, '+', a, b, a + b);
    }
    case 'addCarryBasic': {
      // 한 자리 + 한 자리, 합이 10 이상
      const a = randomInt(rng, 2, 9);
      const b = randomInt(rng, 10 - a, 9);
      return equation(rng, kind, '+', a, b, a + b);
    }
    case 'subNoBorrowBasic': {
      // 한 자리 − 한 자리 (답 1 이상)
      const a = randomInt(rng, 2, 9);
      const b = randomInt(rng, 1, a - 1);
      return equation(rng, kind, '−', a, b, a - b);
    }
    case 'subBorrowBasic': {
      // 절반은 한 자리 − 한 자리(9 − 4, 몸풀기), 절반은 19 이하의 수 − 한 자리(13 − 7, 받아내림 있음)
      if (rng() < 0.5) {
        const a = randomInt(rng, 2, 9);
        const b = randomInt(rng, 1, a - 1);
        return equation(rng, kind, '−', a, b, a - b);
      }
      // 10~18 (19는 일의 자리가 9라 빌려올 일이 없다), 빼는 수는 일의 자리보다 크게
      const a = randomInt(rng, 10, 18);
      const b = randomInt(rng, (a % 10) + 1, 9);
      return equation(rng, kind, '−', a, b, a - b);
    }
    // ── 고수 단계: 두 자리 ± 한·두 자리 ──
    case 'addNoCarry': {
      const [a, b] = sample(rng, (x, y) => !hasCarry(x, y), [23, 14]);
      return equation(rng, kind, '+', a, b, a + b);
    }
    case 'addCarry': {
      const [a, b] = sample(rng, (x, y) => hasCarry(x, y), [47, 8]);
      return equation(rng, kind, '+', a, b, a + b);
    }
    case 'subNoBorrow': {
      // 결과가 0이 되는 같은 수 빼기는 빼고
      const [a, b] = sample(rng, (x, y) => y < x && !hasBorrow(x, y), [58, 23]);
      return equation(rng, kind, '−', a, b, a - b);
    }
    case 'subBorrow': {
      const [a, b] = sample(rng, (x, y) => y < x && hasBorrow(x, y), [63, 28]);
      return equation(rng, kind, '−', a, b, a - b);
    }
    case 'comp10':
      return complement(rng, kind, 10, randomInt(rng, 1, 9));
    case 'comp5':
      return complement(rng, kind, 5, randomInt(rng, 0, 5));
  }
}

function equation(rng: Rng, kind: ArithKind, op: ArithOp, a: number, b: number, result: number): ArithQuestion {
  const display: ArithDisplay = { kind: 'arith', op, a, b, result: null };
  const typical = op === '+' ? addMistakes(a, b, result) : subMistakes(a, b, result);
  const near = [result + 1, result - 1, result + 2, result - 2, result + 10, result - 10, result + 3, result - 3];
  const distractors = pickDistractors(result, shuffle(rng, typical), near, (n) => n >= 0 && n <= MAX_ARITH_RESULT);
  return { kind, op, a, b, result, display, answer: result, choices: shuffle(rng, [result, ...distractors]) };
}

/** 보수: given + □ = whole (빈칸은 앞이나 뒤) */
function complement(rng: Rng, kind: ArithKind, whole: number, given: number): ArithQuestion {
  const answer = whole - given;
  const blankFirst = rng() < 0.5;
  const display: ArithDisplay = blankFirst
    ? { kind: 'arith', op: '+', a: null, b: given, result: whole }
    : { kind: 'arith', op: '+', a: given, b: null, result: whole };
  // 주어진 수를 그대로 쓰는 실수, 하나 차이, 전체 수
  const typical = shuffle(rng, [given, answer + 1, answer - 1]);
  const fallback = shuffle(rng, Array.from({ length: whole + 1 }, (_, n) => n));
  const distractors = pickDistractors(answer, typical, fallback, (n) => n >= 0 && n <= whole);
  const [a, b] = blankFirst ? [answer, given] : [given, answer];
  return { kind, op: '+', a, b, result: whole, display, answer, choices: shuffle(rng, [answer, ...distractors]) };
}

/** 덧셈 대표 실수: 받아올림을 빼먹음(−10), 두 번 올림(+10), 각 자리 합을 그냥 이어 씀 */
function addMistakes(a: number, b: number, sum: number): number[] {
  const out = [sum - 10, sum + 10];
  const ones = (a % 10) + (b % 10);
  if (ones >= 10) out.push(Number(`${Math.floor(a / 10) + Math.floor(b / 10)}${ones}`));
  return out;
}

/** 뺄셈 대표 실수: 자리마다 큰 수에서 작은 수를 뺌, 빌려온 뒤 십의 자리를 안 줄임(+10) */
function subMistakes(a: number, b: number, diff: number): number[] {
  const ones = Math.abs((a % 10) - (b % 10));
  const tens = Math.abs(Math.floor(a / 10) - Math.floor(b / 10));
  return [tens * 10 + ones, diff + 10, diff - 10];
}

function pickDistractors(answer: number, primary: number[], fallback: number[], accept: (n: number) => boolean): number[] {
  const out: number[] = [];
  for (const n of [...primary, ...fallback]) {
    if (out.length === CHOICE_COUNT - 1) break;
    if (n !== answer && Number.isInteger(n) && accept(n) && !out.includes(n)) out.push(n);
  }
  if (out.length < CHOICE_COUNT - 1) throw new Error(`오답 보기를 만들 수 없음 (정답 ${answer})`);
  return out;
}

/** 숫자 뒤 '을/를' (끝자리를 일·이·삼…으로 읽을 때 받침이 있으면 '을') */
function eul(n: number): string {
  return `${n}${[0, 1, 3, 6, 7, 8].includes(n % 10) ? '을' : '를'}`;
}

/** 힌트: 일의 자리부터 한 자리씩 계산하는 과정 */
export function arithSteps(q: Pick<ArithQuestion, 'op' | 'a' | 'b' | 'result'>): string[] {
  const { op, a, b } = q;
  const places = ['일', '십', '백'];
  const steps: string[] = [];
  if (op === '+') {
    let carry = 0;
    for (let i = 0, x = a, y = b; x > 0 || y > 0 || carry > 0; i++, x = Math.floor(x / 10), y = Math.floor(y / 10)) {
      const place = `${places[i]}의 자리`;
      if (x === 0 && y === 0) {
        steps.push(`${place}: 올라온 ${carry}`);
        break;
      }
      const dx = x % 10;
      const dy = y % 10;
      const s = dx + dy + carry;
      // 더하는 수에 이 자리가 없으면 0을 쓰지 않고 '그대로' 또는 '올라온 1'만
      const terms = y === 0 ? [dx] : [dx, dy];
      if (y === 0 && carry === 0) {
        steps.push(`${place}: 그대로 ${dx}`);
      } else {
        const expr = `${terms.join(' + ')}${carry ? ' + 올라온 1' : ''} = ${s}`;
        steps.push(s >= 10 ? `${place}: ${expr} → ${eul(s % 10)} 쓰고 1을 올려요` : `${place}: ${expr}`);
      }
      carry = s >= 10 ? 1 : 0;
    }
  } else {
    let borrow = 0;
    for (let i = 0, x = a, y = b; x > 0; i++, x = Math.floor(x / 10), y = Math.floor(y / 10)) {
      const place = `${places[i]}의 자리`;
      const top = x % 10;
      const dx = top - borrow;
      const dy = y % 10;
      if (dx < dy) {
        const from = borrow ? `빌려주고 남은 ${dx}` : `${dx}`;
        steps.push(`${place}: ${from}에서 ${eul(dy)} 못 빼요 → 10을 빌려와 ${dx + 10} − ${dy} = ${dx + 10 - dy}`);
        borrow = 1;
        continue;
      }
      // 맨 앞자리가 빌려주고 0이 되면 쓰지 않는다
      const leadingZero = x < 10 && y === 0 && dx === 0 && i > 0;
      if (y === 0) {
        steps.push(borrow ? `${place}: ${top} − 1(빌려준 수) = ${dx}${leadingZero ? ' → 앞자리 0은 쓰지 않아요' : ''}` : `${place}: 그대로 ${dx}`);
      } else {
        steps.push(`${place}: ${borrow ? `${top} − 1(빌려준 수) − ${dy}` : `${dx} − ${dy}`} = ${dx - dy}`);
      }
      borrow = 0;
    }
  }
  return steps;
}
