import { describe, expect, it } from 'vitest';
import { FIELD_CHOICES, FIELD_MAX_BOX, FIELD_TYPES, planFieldQuestions, planLegendQuestions, restrictToFieldType } from '../../src/domain/field/fieldQuestions';
import { fieldDans } from '../../src/domain/field/fields';
import { type Dan, FACTS, factsOfDan, getFact } from '../../src/domain/facts';
import { applyAnswer, type Box, initialFactStats, type FactStat } from '../../src/domain/mastery';
import { finishExploration, initialEconomy, initialLearning, recordAnswer } from '../../src/domain/progress';
import { CHOICE_COUNT, generateQuestion, isTypeEligible, QUESTION_TYPES } from '../../src/domain/questionGen';
import { seededRng } from '../../src/domain/random';
import { EXPLORATION_SIZE, isWrongReviewDue, type LearnerSnapshot } from '../../src/domain/scheduler';

const NOW = new Date(2026, 9, 15, 10).getTime();

/** 상자가 섞여 있고, 다른 단에도 틀린 복습 대상이 있는 학습자 */
function learner(challengeUnlocked: boolean, withReview = true): LearnerSnapshot {
  const facts = initialFactStats();
  for (const f of FACTS) {
    const s = facts[f.id];
    s.box = ((f.a * 5 + f.b * 3) % 6) as Box;
    s.dueAt = s.box === 0 ? null : NOW - 86400000;
    if (withReview && s.box === 1) {
      s.lastWrongAt = NOW - 1000;
      s.dueAt = NOW - 1000;
    }
  }
  return { facts, danRecent: {}, challengeUnlocked, boosted: withReview ? { '6x7': 2, '9x4': 1 } : {} };
}

const reviewEligible = (l: LearnerSnapshot, id: string) =>
  isWrongReviewDue(l.facts[id as keyof typeof l.facts], NOW) || (l.boosted?.[id as keyof typeof l.facts] ?? 0) > 0;

describe('generateQuestion 보기 개수', () => {
  it('3개: 서로 다르고 정답이 정확히 하나', () => {
    const rng = seededRng(11);
    for (let i = 0; i < 1000; i++) {
      const f = FACTS[Math.floor(rng() * FACTS.length)];
      const types = QUESTION_TYPES.filter((t) => isTypeEligible(t, f, 5));
      const t = types[Math.floor(rng() * types.length)];
      const q = generateQuestion(rng, f, t, 3);
      expect(q.choices).toHaveLength(3);
      expect(new Set(q.choices).size).toBe(3);
      expect(q.choices.filter((c) => c === q.answer)).toHaveLength(1);
    }
  });
  it('기본값은 4개', () => {
    expect(FIELD_CHOICES).toBe(3);
    expect(generateQuestion(seededRng(1), getFact('7x8'), 'product').choices).toHaveLength(CHOICE_COUNT);
  });
});

describe('planFieldQuestions', () => {
  it('초원: 단은 2·4·8, 다른 단은 오답 복습 대상만, 유형은 FIELD_TYPES', () => {
    const l = learner(false);
    let outside = 0;
    for (let seed = 0; seed < 200; seed++) {
      const plan = planFieldQuestions(l, 'meadow', NOW, seededRng(seed));
      expect(plan).toHaveLength(EXPLORATION_SIZE);
      for (const it of plan) {
        const f = getFact(it.factId);
        if (![2, 4, 8].includes(f.a)) {
          outside++;
          expect(reviewEligible(l, it.factId)).toBe(true);
        }
        expect(FIELD_TYPES).toContain(it.type);
        expect(['sequence', 'commutative']).not.toContain(it.type);
        expect(isTypeEligible(it.type, f, l.facts[it.factId].box)).toBe(true);
      }
    }
    expect(outside).toBeGreaterThan(0);
  });

  it('오답 복습 대상이 없으면 필드 단만 나온다', () => {
    const l = learner(false, false);
    for (let seed = 0; seed < 200; seed++) {
      for (const it of planFieldQuestions(l, 'waterside', NOW, seededRng(seed))) {
        expect([3, 6, 9]).toContain(getFact(it.factId).a);
      }
    }
  });

  it('상자 0 사실은 항상 답 구하기', () => {
    const l = learner(false, false);
    for (let seed = 0; seed < 100; seed++) {
      for (const it of planFieldQuestions(l, 'meadow', NOW, seededRng(seed))) {
        if (l.facts[it.factId].box === 0) expect(it.type).toBe('product');
      }
    }
  });

  it('사막: 12단은 해금 전에는 없고, 해금 뒤에는 나올 수 있다', () => {
    let locked = 0;
    let unlocked = 0;
    for (let seed = 0; seed < 200; seed++) {
      locked += planFieldQuestions(learner(false, false), 'desert', NOW, seededRng(seed)).filter((i) => getFact(i.factId).a === 12).length;
      unlocked += planFieldQuestions(learner(true, false), 'desert', NOW, seededRng(seed)).filter((i) => getFact(i.factId).a === 12).length;
    }
    expect(locked).toBe(0);
    expect(unlocked).toBeGreaterThan(0);
    expect(fieldDans('desert', true)).toContain(12);
  });
});

describe('planLegendQuestions', () => {
  it('13단 9문제, 모두 13단, FIELD_TYPES', () => {
    const l = learner(true);
    for (let seed = 0; seed < 100; seed++) {
      const plan = planLegendQuestions(l, NOW, seededRng(seed));
      expect(plan).toHaveLength(EXPLORATION_SIZE);
      expect(new Set(plan.map((i) => i.factId)).size).toBe(EXPLORATION_SIZE);
      for (const it of plan) {
        expect(getFact(it.factId).a).toBe(13);
        expect(FIELD_TYPES).toContain(it.type);
      }
    }
  });
  it('해금 전에는 분명한 오류', () => {
    expect(() => planLegendQuestions(learner(false), NOW, seededRng(1))).toThrow(/13/);
  });
});

describe('필드 정답은 상자 3까지', () => {
  const stat = (box: Box): FactStat => ({ ...initialFactStats()['2x3'], box });
  it('applyAnswer: maxBox 3이면 3 그대로, 없으면 4', () => {
    const ev = { correct: true, ms: 1000, inputMode: 'choice' as const, isRetry: false, now: NOW, today: '2026-10-15' };
    expect(applyAnswer(stat(3), getFact('2x3'), { ...ev, maxBox: FIELD_MAX_BOX }).box).toBe(3);
    expect(applyAnswer(stat(3), getFact('2x3'), ev).box).toBe(4);
    expect(applyAnswer(stat(2), getFact('2x3'), { ...ev, maxBox: FIELD_MAX_BOX }).box).toBe(3);
  });

  function drill(source: 'field' | 'normal') {
    let learning = initialLearning();
    let economy = initialEconomy();
    for (let day = 0; day < 8; day++) {
      const now = new Date(2026, 9, 1 + day, 10).getTime();
      for (const f of factsOfDan(2 as Dan)) {
        const out = recordAnswer(learning, economy, {
          factId: f.id, type: 'product', correct: true, ms: 1000, inputMode: 'choice', isRetry: false,
          firstAttemptInBattle: true, battleStartedAt: now, now, source,
        });
        learning = out.learning;
        economy = out.economy;
      }
    }
    return finishExploration(learning, economy, { completed: true, now: new Date(2026, 9, 9).getTime() });
  }
  it('field: 2단 11개를 모두 3까지 올려도 마스터 아님', () => {
    const r = drill('field');
    for (const f of factsOfDan(2 as Dan)) expect(r.learning.facts[f.id].box).toBe(3);
    expect(r.learning.masteredDans).not.toContain(2);
  });
  it('normal: 같은 연습이면 마스터가 된다 (기존 동작)', () => {
    expect(drill('normal').learning.masteredDans).toContain(2);
  });
  it('field: 빠르기 별 없이 정답 별 1개', () => {
    const out = recordAnswer(initialLearning(), initialEconomy(), {
      factId: '2x3', type: 'product', correct: true, ms: 500, inputMode: 'choice', isRetry: false,
      firstAttemptInBattle: true, battleStartedAt: NOW, now: NOW, source: 'field', speedBonus: true,
    });
    expect(out.baseStars).toBe(1);
  });
});

describe('restrictToFieldType (다시 내는 문제도 필드 모양만)', () => {
  it('필드 모양은 그대로', () => {
    const rng = seededRng(3);
    for (const t of FIELD_TYPES) expect(restrictToFieldType(rng, getFact('7x8'), 3, t)).toBe(t);
  });

  it('뛰어 세기·바꿔 곱하기는 출제 조건을 지키며 필드 모양으로', () => {
    const rng = seededRng(5);
    for (let i = 0; i < 500; i++) {
      const f = FACTS[Math.floor(rng() * FACTS.length)];
      const box = (i % 6) as Box;
      for (const t of ['sequence', 'commutative'] as const) {
        const out = restrictToFieldType(rng, f, box, t);
        expect(FIELD_TYPES).toContain(out);
        expect(isTypeEligible(out, f, box)).toBe(true);
      }
    }
  });

  it('상자 0이면 product', () => {
    expect(restrictToFieldType(seededRng(1), getFact('6x7'), 0, 'sequence')).toBe('product');
  });
});
