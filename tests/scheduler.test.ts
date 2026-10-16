import { describe, expect, it } from 'vitest';
import { BASE_DANS, type FactId, FACTS, getFact } from '../src/domain/facts';
import { type Box, initialFactStats } from '../src/domain/mastery';
import { seededRng } from '../src/domain/random';
import {
  EXPLORATION_SIZE,
  insertRetry,
  type LearnerSnapshot,
  MAX_RETRIES,
  planDiagnostic,
  planExploration,
  type PlannedItem,
} from '../src/domain/scheduler';

const NOW = new Date(2026, 9, 15, 10).getTime();

function learner(boxOf: (id: FactId) => Box | undefined = () => undefined, challengeUnlocked = false): LearnerSnapshot {
  const facts = initialFactStats();
  for (const f of FACTS) {
    const b = boxOf(f.id);
    if (b !== undefined) facts[f.id].box = b;
  }
  return { facts, danRecent: {}, challengeUnlocked };
}

/** 대부분 익숙한(상자 4) 학생 — 자신감 문제 후보가 충분하다 */
const experienced = () => learner((id) => (getFact(id).b % 3 === 0 ? 1 : 4));

const facts = (plan: PlannedItem[]) => plan.map((it) => getFact(it.factId));

describe('탐험 문제 구성', () => {
  it('9문제, 같은 사실 중복 없음', () => {
    for (let seed = 0; seed < 50; seed++) {
      const plan = planExploration(experienced(), { kind: 'recommended' }, NOW, seededRng(seed));
      expect(plan).toHaveLength(EXPLORATION_SIZE);
      expect(new Set(plan.map((p) => p.factId)).size).toBe(EXPLORATION_SIZE);
    }
  });

  it('추천 탐험: 한 단이 3문제(40%) 이하', () => {
    for (let seed = 0; seed < 100; seed++) {
      const plan = planExploration(experienced(), { kind: 'recommended' }, NOW, seededRng(seed));
      for (const dan of BASE_DANS) expect(facts(plan).filter((f) => f.a === dan).length).toBeLessThanOrEqual(3);
    }
  });

  it('도전 모드 해금 전에는 12·13단이 나오지 않는다', () => {
    for (let seed = 0; seed < 100; seed++) {
      const plan = planExploration(experienced(), { kind: 'recommended' }, NOW, seededRng(seed));
      expect(facts(plan).some((f) => f.isChallenge)).toBe(false);
    }
    expect(() => planExploration(experienced(), { kind: 'dan', dan: 12 }, NOW, seededRng(1))).toThrow();
  });

  it('도전 모드 해금 후 추천 탐험의 12·13단은 30%(2문제) 이하이고, 실제로 섞인다', () => {
    const l = learner((id) => (getFact(id).isChallenge ? 0 : 5), true);
    let total = 0;
    for (let seed = 0; seed < 100; seed++) {
      const n = facts(planExploration(l, { kind: 'recommended' }, NOW, seededRng(seed))).filter((f) => f.isChallenge).length;
      expect(n).toBeLessThanOrEqual(2);
      total += n;
    }
    expect(total).toBeGreaterThan(100);
  });

  it('단 골라 탐험(단 도전): 그 단의 ×0~×10 11문제만, 모두 답 구하기', () => {
    for (const dan of [7, 13] as const) {
      const l = learner(() => 4, true);
      const plan = planExploration(l, { kind: 'dan', dan }, NOW, seededRng(dan));
      expect(plan).toHaveLength(11);
      expect(facts(plan).every((f) => f.a === dan)).toBe(true);
      expect(new Set(facts(plan).map((f) => f.b))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
      expect(plan.every((it) => it.type === 'product')).toBe(true);
    }
  });

  it('단 도전에서 틀린 사실(부스트)은 추천 탐험에 매번 나온다', () => {
    const base = learner(() => 3);
    const boosted = { ...base, boosted: { '7x8': 3 } as LearnerSnapshot['boosted'] };
    const count = (l: LearnerSnapshot) => {
      let n = 0;
      for (let seed = 0; seed < 300; seed++) if (planExploration(l, { kind: 'recommended' }, NOW, seededRng(seed)).some((p) => p.factId === '7x8')) n++;
      return n;
    };
    // 부스트가 남아 있는 동안은 복습 슬롯으로 매번 나온다
    expect(count(boosted)).toBe(300);
    expect(count(base)).toBeLessThan(100);
  });

  it('몬스터마다(3문제) 자신감 문제가 1개 이상, 시작과 끝은 자신감 문제', () => {
    for (let seed = 0; seed < 50; seed++) {
      const plan = planExploration(experienced(), { kind: 'recommended' }, NOW, seededRng(seed));
      for (let m = 0; m < 3; m++) {
        const group = plan.slice(m * 3, m * 3 + 3);
        expect(group.some((it) => it.isConfidence)).toBe(true);
      }
      expect(plan[0].isConfidence).toBe(true);
      expect(plan[8].isConfidence).toBe(true);
    }
  });

  it('신규(상자 0) 3개, 규칙 문제 2개, 뛰어 세기 1개 이하 — 후보가 충분할 때', () => {
    const l = learner((id) => {
      const f = getFact(id);
      if (f.isRule) return undefined; // 상자 2
      return f.b <= 4 ? 0 : 4;
    });
    for (let seed = 0; seed < 100; seed++) {
      const plan = planExploration(l, { kind: 'recommended' }, NOW, seededRng(seed));
      expect(plan.filter((it) => l.facts[it.factId].box === 0).length).toBeLessThanOrEqual(3);
      expect(facts(plan).filter((f) => f.isRule).length).toBeLessThanOrEqual(2);
      expect(plan.filter((it) => it.type === 'sequence').length).toBeLessThanOrEqual(1);
    }
  });

  it('지난 탐험에서 틀린 사실(복습 시점 도래)은 다음 탐험에 반드시 나온다 — 최대 3개', () => {
    const wrongIds: FactId[] = ['3x7', '8x6', '9x4', '6x7'];
    for (let seed = 0; seed < 50; seed++) {
      const l = experienced();
      for (const id of wrongIds) l.facts[id] = { ...l.facts[id], box: 1, lastWrongAt: NOW - 1000, dueAt: NOW - 1000 };
      const ids = planExploration(l, { kind: 'recommended' }, NOW, seededRng(seed)).map((p) => p.factId);
      expect(wrongIds.filter((id) => ids.includes(id)).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('완전히 처음인 학생도 9문제를 만든다 (제약 완화)', () => {
    const plan = planExploration(learner(), { kind: 'recommended' }, NOW, seededRng(1));
    expect(plan).toHaveLength(9);
  });

  it('□ × 0 문제가 계획에 들어가지 않는다', () => {
    const l = learner(() => 3);
    for (let seed = 0; seed < 200; seed++) {
      for (const it of planExploration(l, { kind: 'recommended' }, NOW, seededRng(seed))) {
        if (it.type === 'missingFirst') expect(getFact(it.factId).b).not.toBe(0);
      }
    }
  });
});

describe('진단 탐험', () => {
  it('2~9단 각 1개(곱하는 수 2~9) + 규칙 문제 1개, 모두 결과 찾기', () => {
    for (let seed = 0; seed < 30; seed++) {
      const plan = planDiagnostic(seededRng(seed));
      expect(plan).toHaveLength(9);
      const fs = facts(plan);
      expect(fs.filter((f) => f.isRule)).toHaveLength(1);
      for (const dan of BASE_DANS) {
        expect(fs.filter((f) => f.a === dan && !f.isRule).length).toBe(1);
      }
      expect(plan.every((it) => it.type === 'product')).toBe(true);
    }
  });
});

describe('재출제', () => {
  const base = () => planExploration(experienced(), { kind: 'recommended' }, NOW, seededRng(7));

  it('2~3문제 뒤에 다른 유형으로 다시 낸다', () => {
    for (let seed = 0; seed < 50; seed++) {
      const plan = base();
      const out = insertRetry(plan, 2, seededRng(seed));
      expect(out).toHaveLength(plan.length + 1);
      const at = out.findIndex((it) => it.isRetry);
      expect(at - 2 - 1).toBeGreaterThanOrEqual(2);
      expect(at - 2 - 1).toBeLessThanOrEqual(3);
      expect(out[at].factId).toBe(plan[2].factId);
      expect(out[at].type).not.toBe(plan[2].type);
    }
  });

  it('남은 문제가 적으면 맨 뒤에 붙인다', () => {
    const plan = base();
    const out = insertRetry(plan, 8, seededRng(1));
    expect(out[9].isRetry).toBe(true);
  });

  it('단 도전에서는 몇 번이든, 같은 유형(답 구하기)으로 다시 낸다', () => {
    let plan = planExploration(learner(() => 3), { kind: 'dan', dan: 6 }, NOW, seededRng(2));
    for (let i = 0; i < 8; i++) plan = insertRetry(plan, i, seededRng(i), { unlimited: true, type: 'product' });
    const retries = plan.filter((it) => it.isRetry);
    expect(retries).toHaveLength(8);
    expect(retries.every((it) => it.type === 'product')).toBe(true);
  });

  it(`탐험당 최대 ${MAX_RETRIES}번`, () => {
    let plan = base();
    for (let i = 0; i < 6; i++) plan = insertRetry(plan, i, seededRng(i));
    expect(plan.filter((it) => it.isRetry)).toHaveLength(MAX_RETRIES);
  });
});
