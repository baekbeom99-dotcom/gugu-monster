import { describe, expect, it } from 'vitest';
import { type Fact, FACTS, getFact } from '../src/domain/facts';
import type { Box } from '../src/domain/mastery';
import {
  generateQuestion,
  isTypeEligible,
  pickQuestionType,
  type Question,
  QUESTION_TYPES,
} from '../src/domain/questionGen';
import { seededRng } from '../src/domain/random';

/** 화면 표시만 보고 빈칸 값을 독립적으로 계산한다. */
function solve(q: Question, fact: Fact): number {
  const d = q.display;
  switch (d.kind) {
    case 'equation':
      if (d.result === null) return d.a! * d.b!;
      if (d.a === null) return d.result / d.b!;
      return d.result / d.a!;
    case 'commutative':
      expect(d.given.a * d.given.b).toBe(d.given.result);
      expect(d.ask.a).toBe(d.given.b);
      expect(d.ask.b).toBe(d.given.a);
      return d.ask.a * d.ask.b;
    case 'sequence': {
      const blank = d.terms.indexOf(null);
      const known = d.terms.map((t, i) => [i, t] as const).filter(([, t]) => t !== null) as [number, number][];
      // 같은 간격(=단)으로 늘어나는 수열이어야 한다.
      const [i0, t0] = known[0];
      for (const [i, t] of known) expect(t).toBe(t0 + (i - i0) * fact.a);
      return t0 + (blank - i0) * fact.a;
    }
  }
}

/** 빈칸에 들어갈 수 있는 값이 정답 하나뿐인지 */
function solutionsInRange(q: Question): number[] {
  const d = q.display;
  if (d.kind !== 'equation' || d.result === null) return [q.answer];
  const range = d.a === null ? Array.from({ length: 14 }, (_, i) => i) : Array.from({ length: 11 }, (_, i) => i);
  return range.filter((x) => (d.a === null ? x * d.b! : d.a! * x) === d.result);
}

const SEEDS = [1, 2, 3, 42, 777];

describe('문제 생성 — 110개 사실 × 5개 유형 전수 검사', () => {
  for (const type of QUESTION_TYPES) {
    it(`${type}: 정답이 수학적으로 맞고 유일하며 보기 4개가 올바르다`, () => {
      let generated = 0;
      for (const fact of FACTS) {
        if (!isTypeEligible(type, fact, 5)) continue;
        for (const seed of SEEDS) {
          const q = generateQuestion(seededRng(seed * 1000 + fact.a * 20 + fact.b), fact, type);
          generated++;
          expect(q.factId).toBe(fact.id);
          expect(solve(q, fact)).toBe(q.answer);
          expect(solutionsInRange(q)).toEqual([q.answer]);
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices).toContain(q.answer);
          for (const c of q.choices) {
            expect(Number.isInteger(c)).toBe(true);
            expect(c).toBeGreaterThanOrEqual(0);
            expect(c).toBeLessThanOrEqual(130);
          }
          if (type === 'missingSecond') q.choices.forEach((c) => expect(c).toBeLessThanOrEqual(10));
          if (type === 'missingFirst') q.choices.forEach((c) => expect(c).toBeGreaterThanOrEqual(1));
        }
      }
      expect(generated).toBeGreaterThan(0);
    });
  }

  it('□ × 0 = 0 문제는 출제 불가', () => {
    for (const fact of FACTS.filter((f) => f.b === 0)) {
      for (const box of [0, 1, 2, 3, 4, 5] as Box[]) expect(isTypeEligible('missingFirst', fact, box)).toBe(false);
      expect(() => generateQuestion(seededRng(1), fact, 'missingFirst')).toThrow();
    }
  });

  it('뛰어 세기: 5개 항, 빈칸 1개는 2~5번째, 시작 항은 a×0 ~ a×6', () => {
    for (const fact of FACTS.filter((f) => f.b >= 1)) {
      for (const seed of SEEDS) {
        const q = generateQuestion(seededRng(seed + fact.b), fact, 'sequence');
        if (q.display.kind !== 'sequence') throw new Error('sequence 아님');
        const { terms } = q.display;
        expect(terms).toHaveLength(5);
        expect(terms.filter((t) => t === null)).toHaveLength(1);
        expect(terms.indexOf(null)).toBeGreaterThanOrEqual(1);
        const first = terms[0]!;
        expect(first % fact.a).toBe(0);
        expect(first / fact.a).toBeLessThanOrEqual(6);
      }
    }
  });

  it('×0 문제 오답 보기에 흔한 실수(a 그대로)가 자주 들어간다', () => {
    const fact = getFact('7x0');
    let hits = 0;
    for (let s = 0; s < 50; s++) if (generateQuestion(seededRng(s), fact, 'product').choices.includes(7)) hits++;
    expect(hits).toBeGreaterThan(25);
  });
});

describe('12·13단 도전 보기', () => {
  const challengeFacts = FACTS.filter((f) => f.isChallenge);

  for (const type of ['product', 'commutative', 'sequence'] as const) {
    it(`${type}: 오답 3개 모두 정답과 1의 자리가 같은 양수`, () => {
      for (const fact of challengeFacts) {
        if (!isTypeEligible(type, fact, 5)) continue;
        for (const seed of SEEDS) {
          const q = generateQuestion(seededRng(seed * 31 + fact.a * 20 + fact.b), fact, type);
          for (const c of q.choices) {
            expect(c % 10).toBe(q.answer % 10);
            if (c !== q.answer) expect(c).toBeGreaterThan(0);
          }
        }
      }
    });
  }

  it('정답 가까운 값(±10, ±20)을 우선 쓴다', () => {
    const q = generateQuestion(seededRng(3), getFact('12x7'), 'product');
    for (const c of q.choices) expect([64, 74, 84, 94, 104]).toContain(c);
  });

  it('범위 끝(12×0 = 0, 13×10 = 130)에서도 보기 4개를 만든다', () => {
    expect(generateQuestion(seededRng(1), getFact('12x0'), 'product').choices.sort((x, y) => x - y)).toEqual([0, 10, 20, 30]);
    const top = generateQuestion(seededRng(1), getFact('13x10'), 'product').choices;
    expect(top.sort((x, y) => x - y)).toEqual([100, 110, 120, 130]);
  });

  it('2~9단 결과 찾기 보기는 기존 규칙 그대로 (1의 자리가 다른 보기가 나온다)', () => {
    const q = generateQuestion(seededRng(1), getFact('7x8'), 'product');
    expect(q.choices.some((c) => c % 10 !== q.answer % 10)).toBe(true);
  });
});

describe('유형 선택', () => {
  it('상자 0이면 결과 찾기만', () => {
    const rng = seededRng(5);
    for (let i = 0; i < 200; i++) expect(pickQuestionType(rng, getFact('7x8'), 0)).toBe('product');
  });

  it('상자 1에서는 교환법칙이 나오지 않고, 상자 3에서는 4종이 모두 나온다', () => {
    const rng = seededRng(9);
    const seen1 = new Set<string>();
    const seen3 = new Set<string>();
    for (let i = 0; i < 500; i++) {
      seen1.add(pickQuestionType(rng, getFact('7x8'), 1));
      seen3.add(pickQuestionType(rng, getFact('7x8'), 3));
    }
    expect(seen1).toEqual(new Set(['product', 'missingFirst', 'missingSecond']));
    expect(seen3).toEqual(new Set(['product', 'missingFirst', 'missingSecond', 'commutative']));
  });

  it('재출제 시 직전 유형을 피한다', () => {
    const rng = seededRng(11);
    for (let i = 0; i < 300; i++) expect(pickQuestionType(rng, getFact('6x7'), 1, 'product')).not.toBe('product');
  });
});
