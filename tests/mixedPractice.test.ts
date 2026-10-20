/** 셈 연습 기본·고수 단계, 셈 연습 MASTER, 추천 탐험 섞기·빠르기 별 (설계서 3-9, 4-2) */
import { describe, expect, it } from 'vitest';
import { ARITH_INFO, ARITH_KINDS, BASIC_ARITH_KINDS, generateArith, hasBorrow, hasCarry, HARD_ARITH_KINDS } from '../src/domain/arith';
import { finishPractice, practiceMasterMs, recordPracticeAnswer } from '../src/domain/arithPractice';
import { answer, createBattle } from '../src/domain/battle';
import { speedStars, STAR_REWARDS } from '../src/domain/economy';
import { mixableKinds, mixArithmetic } from '../src/domain/mixedExploration';
import { initialEconomy, initialLearning, recordAnswer } from '../src/domain/progress';
import { seededRng } from '../src/domain/random';
import { insertRetry, isArithItem, planExploration, type LearnerSnapshot } from '../src/domain/scheduler';

const NOW = new Date(2026, 9, 20, 10).getTime();
const SEEDS = Array.from({ length: 400 }, (_, i) => i);
const oneDigit = (n: number) => n >= 0 && n <= 9;

describe('기본 단계 문제', () => {
  it('받아올림 없는 덧셈: 한 자리 + 한 자리, 합 9 이하', () => {
    for (const seed of SEEDS) {
      const q = generateArith(seededRng(seed), 'addNoCarryBasic');
      expect(oneDigit(q.a) && oneDigit(q.b) && q.a > 0 && q.b > 0).toBe(true);
      expect(q.result).toBe(q.a + q.b);
      expect(hasCarry(q.a, q.b)).toBe(false);
    }
  });

  it('받아올림 있는 덧셈: 한 자리 + 한 자리, 합 10 이상', () => {
    for (const seed of SEEDS) {
      const q = generateArith(seededRng(seed), 'addCarryBasic');
      expect(oneDigit(q.a) && oneDigit(q.b)).toBe(true);
      expect(q.a + q.b).toBeGreaterThanOrEqual(10);
    }
  });

  it('받아내림 없는 뺄셈: 한 자리 − 한 자리, 답 1 이상', () => {
    for (const seed of SEEDS) {
      const q = generateArith(seededRng(seed), 'subNoBorrowBasic');
      expect(oneDigit(q.a) && oneDigit(q.b)).toBe(true);
      expect(q.result).toBe(q.a - q.b);
      expect(q.result).toBeGreaterThanOrEqual(1);
    }
  });

  it('받아내림 있는 뺄셈: 10대·두 자리 − 한 자리, 늘 받아내림이 있다', () => {
    let teens = 0;
    for (const seed of SEEDS) {
      const q = generateArith(seededRng(seed), 'subBorrowBasic');
      expect(q.a).toBeGreaterThanOrEqual(11);
      expect(q.a).toBeLessThanOrEqual(99);
      expect(oneDigit(q.b) && q.b > 0).toBe(true);
      expect(hasBorrow(q.a, q.b)).toBe(true);
      expect(q.result).toBe(q.a - q.b);
      if (q.a < 20) teens++;
    }
    // 절반쯤은 10대 − 한 자리
    expect(teens).toBeGreaterThan(SEEDS.length * 0.35);
    expect(teens).toBeLessThan(SEEDS.length * 0.65);
  });

  it('보기는 4개, 정답 포함, 모두 0 이상', () => {
    for (const kind of BASIC_ARITH_KINDS) {
      for (const seed of SEEDS.slice(0, 100)) {
        const q = generateArith(seededRng(seed), kind);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(q.answer);
        expect(q.choices.every((c) => c >= 0)).toBe(true);
      }
    }
  });

  it('예전 네 가지는 고수 단계 (이름이 그대로라 예전 기록이 이어진다)', () => {
    expect(HARD_ARITH_KINDS).toEqual(['addNoCarry', 'addCarry', 'subNoBorrow', 'subBorrow']);
    expect(HARD_ARITH_KINDS.every((k) => ARITH_INFO[k].level === 'hard' && ARITH_INFO[k].title.endsWith('(고수)'))).toBe(true);
    expect(ARITH_KINDS).toHaveLength(10);
  });
});

describe('셈 연습 MASTER', () => {
  it('기준 시간: 9문제 × 기본·보수 3초 = 27초, 고수 5초 = 45초', () => {
    expect(practiceMasterMs('addCarryBasic')).toBe(27_000);
    expect(practiceMasterMs('comp10')).toBe(27_000);
    expect(practiceMasterMs('subBorrow')).toBe(45_000);
  });

  it('오답 0개 + 기준 시간 안이면 MASTER, 처음 한 번만 보너스 (기본 20, 고수 30)', () => {
    const first = finishPractice({}, initialEconomy(), 'addCarryBasic', 26_000, { mistakes: 0, now: NOW });
    expect(first).toMatchObject({ justMastered: true, bonus: STAR_REWARDS.practiceMaster });
    expect(first.economy.stars).toBe(STAR_REWARDS.complete + 20);
    expect(first.record).toMatchObject({ master: true, masteredAt: '2026-10-20' });
    const again = finishPractice(first.practice, first.economy, 'addCarryBasic', 20_000, { mistakes: 0, now: NOW });
    expect(again).toMatchObject({ justMastered: false, bonus: 0 });
    expect(again.record.master).toBe(true);
    expect(finishPractice({}, initialEconomy(), 'subBorrow', 44_000, { mistakes: 0 }).bonus).toBe(30);
  });

  it('하나라도 틀리거나 시간이 넘으면 MASTER가 아니다', () => {
    expect(finishPractice({}, initialEconomy(), 'comp5', 10_000, { mistakes: 1 }).justMastered).toBe(false);
    expect(finishPractice({}, initialEconomy(), 'comp5', 27_001, { mistakes: 0 }).justMastered).toBe(false);
    // 예전 기록(master 필드 없음)도 그대로 쓸 수 있다
    const old = { addCarry: { plays: 3, attempts: 30, correct: 27, bestMs: 50_000 } };
    const r = finishPractice(old, initialEconomy(), 'addCarry', 40_000, { mistakes: 0 });
    expect(r.record).toMatchObject({ plays: 4, attempts: 30, correct: 27, bestMs: 40_000, master: true });
  });
});

describe('빠를수록 별 (추천 탐험)', () => {
  it('푼 시간에 반비례, 2~5개라 늘 일반 정답 별(1개)보다 많다', () => {
    expect(speedStars(1000)).toBe(5);
    expect(speedStars(2500)).toBe(4);
    expect(speedStars(3300)).toBe(3);
    expect(speedStars(5000)).toBe(2);
    expect(speedStars(60_000)).toBe(2);
    for (const ms of [500, 1500, 3000, 4000, 8000, 20_000]) expect(speedStars(ms)).toBeGreaterThan(STAR_REWARDS.correct);
    for (let ms = 1000; ms < 10_000; ms += 500) expect(speedStars(ms)).toBeGreaterThanOrEqual(speedStars(ms + 500));
  });

  it('구구단 답: speedBonus면 빠르기 별, 아니면 1개 (틀리면 0)', () => {
    const base = { factId: '7x8' as const, type: 'product' as const, inputMode: 'choice' as const, isRetry: false, firstAttemptInBattle: true, battleStartedAt: NOW, now: NOW };
    expect(recordAnswer(initialLearning(), initialEconomy(), { ...base, correct: true, ms: 2000, speedBonus: true }).baseStars).toBe(5);
    expect(recordAnswer(initialLearning(), initialEconomy(), { ...base, correct: true, ms: 2000 }).baseStars).toBe(1);
    expect(recordAnswer(initialLearning(), initialEconomy(), { ...base, correct: false, ms: 2000, speedBonus: true }).stars).toBe(0);
  });

  it('셈 문제 답: speedMs를 주면 빠르기 별', () => {
    expect(recordPracticeAnswer({}, initialEconomy(), 'comp10', true, 3000).stars).toBe(3);
    expect(recordPracticeAnswer({}, initialEconomy(), 'comp10', true).stars).toBe(1);
  });
});

describe('추천 탐험에 셈 문제 섞기', () => {
  const learner: LearnerSnapshot = { facts: initialLearning().facts, danRecent: {}, challengeUnlocked: false, boosted: {} };

  it('몬스터마다 셈 문제 1개 (9문제 중 3개), 같은 종류는 겹치지 않는다', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const rng = seededRng(seed);
      const mixed = mixArithmetic(planExploration(learner, { kind: 'recommended' }, NOW, rng), {}, rng);
      expect(mixed).toHaveLength(9);
      for (let m = 0; m < 3; m++) expect(mixed.slice(m * 3, m * 3 + 3).filter(isArithItem)).toHaveLength(1);
      const kinds = mixed.filter(isArithItem).map((it) => it.arith.kind);
      expect(new Set(kinds).size).toBe(3);
    }
  });

  it('고수 단계는 셈 연습에서 해 본 종류만 낸다', () => {
    expect(mixableKinds({})).toEqual([...BASIC_ARITH_KINDS, 'comp10', 'comp5']);
    expect(mixableKinds({ subBorrow: { plays: 1, attempts: 9, correct: 9, bestMs: 40_000 } })).toContain('subBorrow');
    for (const seed of SEEDS.slice(0, 100)) {
      const rng = seededRng(seed);
      const kinds = mixArithmetic(planExploration(learner, { kind: 'recommended' }, NOW, rng), {}, rng)
        .filter(isArithItem)
        .map((it) => ARITH_INFO[it.arith.kind].level);
      expect(kinds).not.toContain('hard');
    }
  });

  it('섞인 계획으로 전투: 셈 문제는 오답 극복 판정에 넣지 않고, 틀리면 같은 식을 다시 낸다', () => {
    const rng = seededRng(7);
    const mixed = mixArithmetic(planExploration(learner, { kind: 'recommended' }, NOW, rng), {}, rng);
    let battle = createBattle(mixed, rng);
    const arithAt = battle.plan.findIndex(isArithItem);
    battle = { ...battle, index: arithAt };
    const wrong = answer(battle, false, 3000, rng);
    expect(wrong.seenFacts).toEqual([]);
    const retries = wrong.plan.filter((it) => it.isRetry);
    expect(retries).toHaveLength(1);
    expect(isArithItem(retries[0]) && retries[0].arith.a).toBe(isArithItem(mixed[arithAt]) && mixed[arithAt].arith.a);
    expect(insertRetry(mixed, arithAt, rng).filter(isArithItem)).toHaveLength(4);
  });
});
