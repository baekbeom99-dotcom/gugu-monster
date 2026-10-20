import { describe, expect, it } from 'vitest';
import {
  ARITH_KINDS,
  type ArithKind,
  type ArithQuestion,
  arithSteps,
  generateArith,
  hasBorrow,
  hasCarry,
  MAX_ARITH_RESULT,
} from '../src/domain/arith';
import {
  answerPractice,
  createPracticeBattle,
  currentPracticeItem,
  finishPractice,
  finishPracticeHint,
  PRACTICE_SIZE,
  recordPracticeAnswer,
  topUpPractice,
} from '../src/domain/arithPractice';
import { initialEconomy } from '../src/domain/progress';
import { seededRng } from '../src/domain/random';

/** 자리마다 직접 계산해서 받아올림이 있는지 (구현과 다른 방법으로) */
function carriesByDigits(a: number, b: number): boolean {
  const da = String(a).padStart(3, '0');
  const db = String(b).padStart(3, '0');
  return [0, 1, 2].some((i) => Number(da[i]) + Number(db[i]) >= 10);
}

function borrowsByDigits(a: number, b: number): boolean {
  const da = String(a).padStart(3, '0');
  const db = String(b).padStart(3, '0');
  return [0, 1, 2].some((i) => Number(da[i]) < Number(db[i]));
}

/** 화면 표시만 보고 빈칸 값을 계산한다 */
function solve(q: ArithQuestion): number {
  const d = q.display;
  if (d.result === null) return d.op === '+' ? d.a! + d.b! : d.a! - d.b!;
  if (d.a === null) return d.op === '+' ? d.result - d.b! : d.result + d.b!;
  return d.op === '+' ? d.result - d.a! : d.a - d.result;
}

const many = (kind: ArithKind, n = 400) => {
  const rng = seededRng(kind.length * 1000 + 7);
  return Array.from({ length: n }, () => generateArith(rng, kind));
};

describe('받아올림·받아내림 판정', () => {
  it('예시', () => {
    expect(hasCarry(23, 14)).toBe(false);
    expect(hasCarry(47, 8)).toBe(true);
    expect(hasCarry(52, 61)).toBe(true); // 십의 자리 5+6
    expect(hasCarry(45, 54)).toBe(false); // 99
    expect(hasBorrow(58, 23)).toBe(false);
    expect(hasBorrow(63, 28)).toBe(true);
    expect(hasBorrow(40, 1)).toBe(true);
    expect(hasBorrow(99, 9)).toBe(false);
  });

  it('모든 두 자리 ± 한·두 자리 조합에서 자리별 계산과 같다', () => {
    for (let a = 10; a <= 99; a++) {
      for (let b = 1; b <= 99; b++) {
        expect(hasCarry(a, b)).toBe(carriesByDigits(a, b));
        if (b <= a) expect(hasBorrow(a, b)).toBe(borrowsByDigits(a, b));
      }
    }
  });
});

describe('덧셈·뺄셈 문제', () => {
  it.each(['addNoCarry', 'addCarry', 'subNoBorrow', 'subBorrow'] as const)('%s: 받아올림(내림) 조건과 범위가 맞다', (kind) => {
    for (const q of many(kind)) {
      expect(q.a).toBeGreaterThanOrEqual(10);
      expect(q.a).toBeLessThanOrEqual(99);
      expect(q.b).toBeGreaterThanOrEqual(1);
      expect(q.b).toBeLessThanOrEqual(99);
      expect(q.display.result).toBeNull();
      if (kind === 'addNoCarry') expect(carriesByDigits(q.a, q.b)).toBe(false);
      if (kind === 'addCarry') expect(carriesByDigits(q.a, q.b)).toBe(true);
      if (kind === 'subNoBorrow') expect(borrowsByDigits(q.a, q.b)).toBe(false);
      if (kind === 'subBorrow') expect(borrowsByDigits(q.a, q.b)).toBe(true);
      if (kind.startsWith('sub')) {
        expect(q.op).toBe('−');
        expect(q.b).toBeLessThan(q.a);
        expect(q.answer).toBe(q.a - q.b);
      } else {
        expect(q.op).toBe('+');
        expect(q.answer).toBe(q.a + q.b);
      }
      expect(solve(q)).toBe(q.answer);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThanOrEqual(MAX_ARITH_RESULT);
    }
  });

  it('한 자리 수와 두 자리 수를 모두 섞어 낸다', () => {
    for (const kind of ['addNoCarry', 'addCarry', 'subNoBorrow', 'subBorrow'] as const) {
      const qs = many(kind);
      expect(qs.some((q) => q.b < 10)).toBe(true);
      expect(qs.some((q) => q.b >= 10)).toBe(true);
    }
  });
});

describe('보수 문제', () => {
  it('10의 보수: 더해서 10, 주어진 수 1~9', () => {
    const qs = many('comp10');
    for (const q of qs) {
      expect(q.result).toBe(10);
      expect(q.a + q.b).toBe(10);
      expect(solve(q)).toBe(q.answer);
      const given = q.display.a ?? q.display.b!;
      expect(given).toBeGreaterThanOrEqual(1);
      expect(given).toBeLessThanOrEqual(9);
      expect(q.answer).toBe(10 - given);
    }
    expect(qs.some((q) => q.display.a === null)).toBe(true);
    expect(qs.some((q) => q.display.b === null)).toBe(true);
  });

  it('5의 보수: 더해서 5, 주어진 수 0~5, 보기도 0~5', () => {
    for (const q of many('comp5')) {
      expect(q.result).toBe(5);
      expect(solve(q)).toBe(q.answer);
      expect(q.answer).toBe(5 - (q.display.a ?? q.display.b!));
      for (const c of q.choices) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(5);
      }
    }
  });
});

describe('보기', () => {
  it.each(ARITH_KINDS)('%s: 4개, 서로 다르고, 정답이 하나', (kind) => {
    for (const q of many(kind)) {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices.filter((c) => c === q.answer)).toHaveLength(1);
      for (const c of q.choices) expect(c).toBeGreaterThanOrEqual(0);
    }
  });

  it('받아올림을 빼먹은 값(정답 −10)을 자주 보기로 낸다', () => {
    const qs = many('addCarry').filter((q) => q.answer >= 10);
    const withSlip = qs.filter((q) => q.choices.includes(q.answer - 10));
    expect(withSlip.length / qs.length).toBeGreaterThan(0.3);
  });
});

describe('힌트 단계', () => {
  it('받아올림 덧셈: 일의 자리에서 올리고 십의 자리에 더한다', () => {
    expect(arithSteps({ op: '+', a: 47, b: 8, result: 55 })).toEqual([
      '일의 자리: 7 + 8 = 15 → 5를 쓰고 1을 올려요',
      '십의 자리: 4 + 올라온 1 = 5',
    ]);
    expect(arithSteps({ op: '+', a: 23, b: 14, result: 37 })).toEqual(['일의 자리: 3 + 4 = 7', '십의 자리: 2 + 1 = 3']);
    expect(arithSteps({ op: '+', a: 32, b: 5, result: 37 })).toEqual(['일의 자리: 2 + 5 = 7', '십의 자리: 그대로 3']);
    expect(arithSteps({ op: '+', a: 85, b: 47, result: 132 })).toEqual([
      '일의 자리: 5 + 7 = 12 → 2를 쓰고 1을 올려요',
      '십의 자리: 8 + 4 + 올라온 1 = 13 → 3을 쓰고 1을 올려요',
      '백의 자리: 올라온 1',
    ]);
  });

  it('받아내림 뺄셈: 십의 자리에서 10을 빌려온다', () => {
    expect(arithSteps({ op: '−', a: 63, b: 28, result: 35 })).toEqual([
      '일의 자리: 3에서 8을 못 빼요 → 10을 빌려와 13 − 8 = 5',
      '십의 자리: 6 − 1(빌려준 수) − 2 = 3',
    ]);
    expect(arithSteps({ op: '−', a: 23, b: 6, result: 17 })).toEqual([
      '일의 자리: 3에서 6을 못 빼요 → 10을 빌려와 13 − 6 = 7',
      '십의 자리: 2 − 1(빌려준 수) = 1',
    ]);
    expect(arithSteps({ op: '−', a: 12, b: 9, result: 3 })).toEqual([
      '일의 자리: 2에서 9를 못 빼요 → 10을 빌려와 12 − 9 = 3',
      '십의 자리: 1 − 1(빌려준 수) = 0 → 앞자리 0은 쓰지 않아요',
    ]);
    expect(arithSteps({ op: '−', a: 58, b: 23, result: 35 })).toEqual(['일의 자리: 8 − 3 = 5', '십의 자리: 5 − 2 = 3']);
    expect(arithSteps({ op: '−', a: 58, b: 3, result: 55 })).toEqual(['일의 자리: 8 − 3 = 5', '십의 자리: 그대로 5']);
  });
});

describe('힌트 단계: 모든 문제에서 마지막 결과와 맞다', () => {
  it.each(['addNoCarry', 'addCarry', 'subNoBorrow', 'subBorrow'] as const)('%s', (kind) => {
    for (const q of many(kind, 200)) {
      const steps = arithSteps(q);
      // 각 단계의 마지막 숫자(쓰는 숫자)를 자리별로 모으면 답이 된다
      const digits = steps.map((s) => {
        const m = s.match(/→ (\d)[을를] 쓰고/) ?? s.match(/= (\d+)(?: →|$)/) ?? s.match(/(?:그대로|올라온) (\d)$/);
        return Number(m![1]) % 10;
      });
      expect(digits.reduceRight((acc, d) => acc * 10 + d, 0)).toBe(q.answer);
    }
  });
});

describe('셈 연습 전투', () => {
  it('모두 맞히면 9문제로 몬스터 3마리를 잡는다', () => {
    const rng = seededRng(3);
    let b = createPracticeBattle('addCarry', rng);
    expect(b.plan).toHaveLength(PRACTICE_SIZE);
    while (b.phase !== 'done') b = answerPractice(b, true, 5000, rng);
    expect(b.correctCount).toBe(9);
    expect(b.monsters.every((m) => m.status === 'captured')).toBe(true);
  });

  it('틀리면 힌트 후 같은 식을 다시 낸다', () => {
    const rng = seededRng(4);
    let b = createPracticeBattle('comp10', rng);
    const first = currentPracticeItem(b)!.question;
    b = answerPractice(b, false, 1000, rng);
    expect(b.phase).toBe('hint');
    b = finishPracticeHint(b);
    expect(b.plan.filter((it) => it.isRetry)).toHaveLength(1);
    const retry = b.plan.find((it) => it.isRetry)!.question;
    expect([retry.a, retry.b, retry.answer]).toEqual([first.a, first.b, first.answer]);
  });

  it('많이 틀려도 실패 없이 끝난다 (남은 몬스터는 잠든다)', () => {
    const rng = seededRng(5);
    let b = createPracticeBattle('subBorrow', rng);
    for (let i = 0; i < 100 && b.phase !== 'done'; i++) {
      b = topUpPractice(b, rng);
      b = b.phase === 'hint' ? finishPracticeHint(b) : answerPractice(b, false, 1000, rng);
    }
    expect(b.phase).toBe('done');
    expect(b.monsters.every((m) => m.status === 'sleeping')).toBe(true);
  });
});

describe('셈 연습 보상과 기록', () => {
  it('정답 별 1개, 완료 별 3개, 기록은 종류별로 따로', () => {
    let economy = { ...initialEconomy(), stars: 120 };
    let practice = {};
    const a = recordPracticeAnswer(practice, economy, 'comp5', true);
    expect(a.economy.stars).toBe(121);
    const w = recordPracticeAnswer(a.practice, a.economy, 'comp5', false);
    expect(w.economy.stars).toBe(121);
    expect(w.practice.comp5).toMatchObject({ attempts: 2, correct: 1 });
    const f = finishPractice(w.practice, w.economy, 'comp5', 20_000);
    economy = f.economy;
    practice = f.practice;
    expect(economy.stars).toBe(124);
    expect(f.record).toMatchObject({ plays: 1, bestMs: 20_000 });
    const g = finishPractice(practice, economy, 'comp5', 25_000);
    expect(g.newBest).toBe(false);
    expect(g.record.bestMs).toBe(20_000);
    expect(g.practice.addCarry).toBeUndefined();
  });
});
