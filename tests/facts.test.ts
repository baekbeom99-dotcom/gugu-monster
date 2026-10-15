import { describe, expect, it } from 'vitest';
import { FACTS, factsOfDan, getFact } from '../src/domain/facts';

describe('곱셈 사실', () => {
  it('2~9단·12·13단 × 0~10 = 110개, ID 중복 없음', () => {
    expect(FACTS).toHaveLength(110);
    expect(new Set(FACTS.map((f) => f.id)).size).toBe(110);
  });

  it('단마다 11개', () => {
    for (const dan of [2, 3, 4, 5, 6, 7, 8, 9, 12, 13] as const) {
      expect(factsOfDan(dan)).toHaveLength(11);
    }
  });

  it('곱이 맞고 규칙·도전 표시가 정확하다', () => {
    for (const f of FACTS) {
      expect(f.product).toBe(f.a * f.b);
      expect(f.isRule).toBe([0, 1, 10].includes(f.b));
      expect(f.isChallenge).toBe(f.a >= 12);
    }
    expect(getFact('13x10').product).toBe(130);
  });
});
