import { describe, expect, it } from 'vitest';
import { DAY_MS } from '../src/domain/mastery';
import { type AnswerInput, initialEconomy, initialLearning, type LearningData, recordAnswer } from '../src/domain/progress';
import { danProgress, masteryLevel, summarize } from '../src/domain/records';
import { factsOfDan } from '../src/domain/facts';
import { mergeSave, createInitialSave } from '../src/store/saveData';

const NOW = new Date(2026, 9, 15, 10).getTime();

function answer(learning: LearningData, over: Partial<AnswerInput>): LearningData {
  return recordAnswer(learning, initialEconomy(), {
    factId: '7x8',
    type: 'product',
    correct: true,
    ms: 2000,
    inputMode: 'choice',
    isRetry: false,
    firstAttemptInBattle: true,
    battleStartedAt: NOW - 60_000,
    now: NOW,
    ...over,
  }).learning;
}

describe('구구단 지도 단계', () => {
  it('한 번도 안 푼 사실은 상자와 상관없이 new (규칙 문제는 상자 2로 시작해도)', () => {
    const l = initialLearning();
    expect(masteryLevel(l.facts['7x0'])).toBe('new');
    expect(masteryLevel(l.facts['7x8'])).toBe('new');
  });

  it('처음 맞혀 상자 1이 된 사실은 연습 중이 아니라 익히는 중', () => {
    const l = answer(initialLearning(), {});
    expect(l.facts['7x8'].box).toBe(1);
    expect(masteryLevel(l.facts['7x8'])).toBe('learning');
    expect(summarize(l, NOW).practicing).toEqual([]);
  });

  it('상자에 따라 연습 중 → 익히는 중 → 거의 → 익숙 → 완벽', () => {
    const base = { ...initialLearning().facts['7x8'], attempts: 1, lastWrongAt: NOW };
    expect([1, 2, 3, 4, 5].map((box) => masteryLevel({ ...base, box: box as 1 }))).toEqual([
      'practice',
      'learning',
      'growing',
      'familiar',
      'perfect',
    ]);
  });
});

describe('단별 진행', () => {
  it('상자 4 이상 개수, 도전 단은 해금 전 잠김', () => {
    const l = initialLearning();
    for (const f of factsOfDan(3).slice(0, 5)) l.facts[f.id] = { ...l.facts[f.id], box: 4, attempts: 2 };
    const p = danProgress(l);
    expect(p.find((d) => d.dan === 3)).toMatchObject({ familiar: 5, total: 11, locked: false });
    expect(p.find((d) => d.dan === 12)?.locked).toBe(true);
    expect(danProgress({ ...l, challengeUnlocked: true }).find((d) => d.dan === 12)?.locked).toBe(false);
  });
});

describe('기록 요약', () => {
  it('오늘 푼 문제는 날짜별로 따로 센다', () => {
    let l = answer(initialLearning(), { now: NOW - DAY_MS });
    l = answer(l, { factId: '3x4' });
    l = answer(l, { factId: '6x7', correct: false });
    const s = summarize(l, NOW);
    expect(s.todayAttempts).toBe(2);
    expect(s.todayCorrect).toBe(1);
    expect(s.totalAttempts).toBe(3);
    expect(l.dailyAttempts).toHaveLength(2);
  });

  it('연습 중인 문제는 최근에 틀린 순서, 극복한 문제는 최신 순 중복 없이', () => {
    let l = answer(initialLearning(), { factId: '6x7', correct: false, now: NOW - 2 * DAY_MS, battleStartedAt: NOW - 2 * DAY_MS - 1 });
    l = answer(l, { factId: '8x9', correct: false, now: NOW - DAY_MS, battleStartedAt: NOW - DAY_MS - 1 });
    let s = summarize(l, NOW);
    expect(s.practicing).toEqual(['8x9', '6x7']);

    l = answer(l, { factId: '6x7' }); // 오늘 처음 만나 맞힘 → 극복
    s = summarize(l, NOW);
    expect(s.recentOvercome).toEqual(['6x7']);
    expect(s.overcomeTotal).toBe(1);
    expect(s.practicing).toEqual(['8x9']);
  });

  it('유형별 정답률, 시도가 없으면 null', () => {
    let l = answer(initialLearning(), {});
    l = answer(l, { correct: false });
    const s = summarize(l, NOW);
    expect(s.typeAccuracy.find((t) => t.type === 'product')?.rate).toBe(0.5);
    expect(s.typeAccuracy.find((t) => t.type === 'sequence')?.rate).toBeNull();
  });
});

describe('저장본 호환', () => {
  it('새 필드가 없는 옛 저장본도 기본값으로 채워진다', () => {
    const old = createInitialSave(NOW) as unknown as Record<string, unknown>;
    const learning = { ...(old.learning as object) } as Record<string, unknown>;
    delete learning.dailyAttempts;
    delete learning.totalOvercome;
    const merged = mergeSave(createInitialSave(NOW), { ...old, learning });
    expect(merged.learning.dailyAttempts).toEqual([]);
    expect(merged.learning.totalOvercome).toBe(0);
  });
});

describe('펫 종류 이어받기', () => {
  it('예전 펭귄·공룡 저장 데이터는 새 종류로 바뀐다', () => {
    const merged = mergeSave(createInitialSave(NOW), {
      pet: { species: 'penguin', stage: 'child', name: '뒤뚱' },
      dex: [{ id: 'a', species: 'dino', name: '룡룡', pet: { species: 'dino' } }],
    });
    expect(merged.pet.species).toBe('bunny');
    expect(merged.dex[0].species).toBe('tiger');
    expect(merged.dex[0].pet?.species).toBe('tiger');
    expect(mergeSave(createInitialSave(NOW), { pet: { species: 'cat' } }).pet.species).toBe('cat');
    expect(mergeSave(createInitialSave(NOW), {}).pet.species).toBeNull();
  });
});
