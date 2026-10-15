import { describe, expect, it } from 'vitest';
import { BASE_DANS, factsOfDan } from '../src/domain/facts';
import { DAY_MS } from '../src/domain/mastery';
import {
  type AnswerInput,
  finishExploration,
  initialEconomy,
  initialLearning,
  recordAnswer,
} from '../src/domain/progress';

const NOW = new Date(2026, 9, 15, 10).getTime();

function input(over: Partial<AnswerInput> = {}): AnswerInput {
  return {
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
  };
}

describe('답 기록', () => {
  it('정답이면 별 1개, 상자·통계·학습한 날 갱신', () => {
    const r = recordAnswer(initialLearning(), initialEconomy(), input());
    expect(r.stars).toBe(1);
    expect(r.economy.stars).toBe(1);
    expect(r.learning.facts['7x8'].box).toBe(1);
    expect(r.learning.typeStats.product).toEqual({ attempts: 1, correct: 1 });
    expect(r.learning.danRecent[7]).toEqual([true]);
    expect(r.learning.studyDays).toEqual(['2026-10-15']);
    expect(r.learning.totalAttempts).toBe(1);
  });

  it('오답이면 별 0개, 별이 줄지 않는다', () => {
    const economy = { ...initialEconomy(), stars: 10, totalEarned: 10 };
    const r = recordAnswer(initialLearning(), economy, input({ correct: false }));
    expect(r.stars).toBe(0);
    expect(r.economy.stars).toBe(10);
    expect(r.learning.facts['7x8'].box).toBe(1);
  });

  it('지난 탐험에서 틀린 사실을 이번에 처음 만나 맞히면 극복 +2 (하루 1번)', () => {
    const yesterday = NOW - DAY_MS;
    const wrong = recordAnswer(initialLearning(), initialEconomy(), input({ correct: false, now: yesterday, battleStartedAt: yesterday - 1000 }));
    const r = recordAnswer(wrong.learning, wrong.economy, input());
    expect(r.overcome).toBe(true);
    expect(r.stars).toBe(3);
    expect(r.learning.overcomeLog).toEqual([{ factId: '7x8', date: '2026-10-15' }]);

    // 같은 날 다시 틀렸다가 다음 탐험에서 맞혀도 두 번째 극복은 없다
    const again = recordAnswer(r.learning, r.economy, input({ correct: false, now: NOW + 1000 }));
    const second = recordAnswer(again.learning, again.economy, input({ now: NOW + 3_600_000, battleStartedAt: NOW + 3_000_000 }));
    expect(second.overcome).toBe(false);
  });

  it('같은 탐험에서 틀린 것을 재출제로 맞히면 극복이 아니다', () => {
    const wrong = recordAnswer(initialLearning(), initialEconomy(), input({ correct: false }));
    const retry = recordAnswer(wrong.learning, wrong.economy, input({ isRetry: true, firstAttemptInBattle: false, now: NOW + 5000 }));
    expect(retry.overcome).toBe(false);
    expect(retry.stars).toBe(1);
  });
});

describe('탐험 종료', () => {
  it('완료 +3, 오늘 첫 탐험 +5 (하루 1번)', () => {
    const first = finishExploration(initialLearning(), initialEconomy(), { completed: true, now: NOW });
    expect(first.bonuses.map((b) => b.stars)).toEqual([3, 5]);
    expect(first.economy.stars).toBe(8);
    expect(first.learning.totalExplorations).toBe(1);
    const second = finishExploration(first.learning, first.economy, { completed: true, now: NOW + 1000 });
    expect(second.bonuses.map((b) => b.stars)).toEqual([3]);
  });

  it('중간에 그만두면 완료 보상 없음, 탐험 횟수도 그대로', () => {
    const r = finishExploration(initialLearning(), initialEconomy(), { completed: false, now: NOW });
    expect(r.bonuses).toEqual([]);
    expect(r.learning.totalExplorations).toBe(0);
  });

  it('단 마스터 +20, 2~9단을 모두 마스터하면 도전 모드가 열린다', () => {
    const learning = initialLearning();
    for (const dan of BASE_DANS) for (const f of factsOfDan(dan)) learning.facts[f.id].box = 4;
    learning.masteredDans = BASE_DANS.filter((d) => d !== 9);
    const r = finishExploration(learning, initialEconomy(), { completed: true, now: NOW });
    expect(r.newlyMastered).toEqual([9]);
    expect(r.bonuses).toContainEqual({ label: '9단 마스터', stars: 20 });
    expect(r.challengeJustUnlocked).toBe(true);
    expect(r.learning.challengeUnlocked).toBe(true);
    expect(r.learning.challengeUnlockedBy).toBe('mastery');
  });

  it('12·13단 마스터는 +40', () => {
    const learning = { ...initialLearning(), challengeUnlocked: true };
    for (const f of factsOfDan(12)) learning.facts[f.id].box = 5;
    const r = finishExploration(learning, initialEconomy(), { completed: false, now: NOW });
    expect(r.bonuses).toEqual([{ label: '12단 마스터', stars: 40 }]);
  });
});
