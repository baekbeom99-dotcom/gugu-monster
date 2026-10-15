import { describe, expect, it } from 'vitest';
import { BASE_DANS, type Dan, factsOfDan, getFact } from '../src/domain/facts';
import {
  type AnswerEvent,
  applyAnswer,
  DAY_MS,
  danErrorRate,
  danFactor,
  type FactStat,
  initialFactStat,
  initialFactStats,
  inputModeForBox,
  isChallengeEligible,
  isDanMastered,
  newlyMasteredDans,
  pushDanRecent,
} from '../src/domain/mastery';

const NOW = new Date(2026, 9, 15, 10).getTime();
const fact = getFact('7x8');

function ev(over: Partial<AnswerEvent> = {}): AnswerEvent {
  return { correct: true, ms: 2000, inputMode: 'choice', isRetry: false, now: NOW, today: '2026-10-15', ...over };
}
function stat(over: Partial<FactStat> = {}): FactStat {
  return { ...initialFactStat(fact), ...over };
}

describe('초기 상태', () => {
  it('일반 사실은 상자 0, 규칙 문제(×0·×1·×10)는 상자 2', () => {
    const all = initialFactStats();
    expect(all['7x8'].box).toBe(0);
    expect(all['7x0'].box).toBe(2);
    expect(all['7x1'].box).toBe(2);
    expect(all['13x10'].box).toBe(2);
  });
});

describe('상자 이동', () => {
  it('빠른 정답이면 +1, 복습 일정은 상자 간격대로', () => {
    const s = applyAnswer(stat({ box: 2 }), fact, ev());
    expect(s.box).toBe(3);
    expect(s.dueAt).toBe(NOW + 2 * DAY_MS);
    expect(s.attempts).toBe(1);
    expect(s.correct).toBe(1);
  });

  it('오답이면 상자 1, 바로 복습 대상', () => {
    const s = applyAnswer(stat({ box: 5 }), fact, ev({ correct: false }));
    expect(s.box).toBe(1);
    expect(s.dueAt).toBe(NOW);
    expect(s.lastWrongAt).toBe(NOW);
  });

  it('느린 정답: 상자 0·1은 올라가고 2 이상은 유지', () => {
    expect(applyAnswer(stat({ box: 0 }), fact, ev({ ms: 9000 })).box).toBe(1);
    expect(applyAnswer(stat({ box: 1 }), fact, ev({ ms: 9000 })).box).toBe(2);
    expect(applyAnswer(stat({ box: 3 }), fact, ev({ ms: 9000 })).box).toBe(3);
  });

  it('빠름 기준: 선택형 5초 / 키패드 7초, 12·13단은 7초 / 10초', () => {
    expect(applyAnswer(stat({ box: 3 }), fact, ev({ ms: 5000 })).box).toBe(4);
    expect(applyAnswer(stat({ box: 3 }), fact, ev({ ms: 5001 })).box).toBe(3);
    expect(applyAnswer(stat({ box: 3 }), fact, ev({ ms: 7000, inputMode: 'keypad' })).box).toBe(4);
    const hard = getFact('13x7');
    const hs = { ...initialFactStat(hard), box: 3 as const };
    expect(applyAnswer(hs, hard, ev({ ms: 6500 })).box).toBe(4);
    expect(applyAnswer(hs, hard, ev({ ms: 9500, inputMode: 'keypad' })).box).toBe(4);
    expect(applyAnswer(hs, hard, ev({ ms: 10001, inputMode: 'keypad' })).box).toBe(3);
  });

  it('재출제 문제의 정답은 상자를 바꾸지 않는다', () => {
    const s = applyAnswer(stat({ box: 1 }), fact, ev({ isRetry: true }));
    expect(s.box).toBe(1);
    expect(s.correct).toBe(1);
  });

  it('하루에 같은 사실은 1단계만 승급', () => {
    const once = applyAnswer(stat({ box: 2 }), fact, ev());
    const twice = applyAnswer(once, fact, ev());
    expect(twice.box).toBe(3);
    const nextDay = applyAnswer(twice, fact, ev({ now: NOW + DAY_MS, today: '2026-10-16' }));
    expect(nextDay.box).toBe(4);
  });

  it('상자 5가 최대', () => {
    expect(applyAnswer(stat({ box: 5 }), fact, ev()).box).toBe(5);
  });

  it('원본을 바꾸지 않는다', () => {
    const s = stat({ box: 2 });
    applyAnswer(s, fact, ev());
    expect(s.box).toBe(2);
  });
});

describe('입력 방식', () => {
  it('상자 0~2 선택형, 3~5 키패드, 강제 선택형 설정', () => {
    expect(inputModeForBox(2)).toBe('choice');
    expect(inputModeForBox(3)).toBe('keypad');
    expect(inputModeForBox(5, true)).toBe('choice');
  });
});

describe('단 마스터와 도전 모드', () => {
  it('11개 모두 상자 4 이상이어야 마스터', () => {
    const facts = initialFactStats();
    for (const f of factsOfDan(7)) facts[f.id].box = 4;
    expect(isDanMastered(facts, 7)).toBe(true);
    facts['7x10'].box = 3;
    expect(isDanMastered(facts, 7)).toBe(false);
  });

  it('새로 마스터한 단만 알려준다', () => {
    const facts = initialFactStats();
    for (const f of factsOfDan(3)) facts[f.id].box = 5;
    for (const f of factsOfDan(4)) facts[f.id].box = 4;
    expect(newlyMasteredDans(facts, [3])).toEqual([4]);
  });

  it('2~9단 모두 마스터해야 도전 모드', () => {
    expect(isChallengeEligible([...BASE_DANS])).toBe(true);
    expect(isChallengeEligible(BASE_DANS.filter((d) => d !== 9) as Dan[])).toBe(false);
  });
});

describe('단별 오답률', () => {
  it('기록이 없으면 평활화된 0.25, 최근 30개만 유지', () => {
    expect(danErrorRate([])).toBe(0.25);
    let r: boolean[] = [];
    for (let i = 0; i < 40; i++) r = pushDanRecent(r, i % 2 === 0);
    expect(r).toHaveLength(30);
  });

  it('단 계수는 0.5~2.5, 잘하는 단 < 기록 없는 단 < 약한 단', () => {
    const strong = danFactor(Array(30).fill(true));
    const unknown = danFactor([]);
    const weak = danFactor(Array(30).fill(false));
    expect(strong).toBeCloseTo(0.5 + 2.5 / 34);
    expect(weak).toBe(2.5);
    expect(strong).toBeLessThan(unknown);
    expect(unknown).toBeLessThan(weak);
  });

  it('처음 맞혀 상자 1이 된 사실은 다음 날 복습', () => {
    const s = applyAnswer(stat({ box: 0 }), fact, ev());
    expect(s.box).toBe(1);
    expect(s.dueAt).toBe(NOW + DAY_MS);
  });
});
