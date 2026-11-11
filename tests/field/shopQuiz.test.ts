import { describe, expect, it } from 'vitest';
import { answerDanQuiz, createDanQuiz, danQuizFact, leaveDanHint, practiceDans } from '../../src/domain/field/shopQuiz';

describe('상점 한 단 연습', () => {
  it('2단 연습은 2x1 … 2x9 차례대로 9문제', () => {
    let q = createDanQuiz(2);
    const ids: string[] = [];
    while (!q.done) {
      ids.push(danQuizFact(q));
      q = answerDanQuiz(q, true);
    }
    expect(ids).toEqual(['2x1', '2x2', '2x3', '2x4', '2x5', '2x6', '2x7', '2x8', '2x9']);
    expect(q.index).toBe(9);
    expect(answerDanQuiz(q, true)).toBe(q);
  });
  it('틀리면 힌트, 같은 문제, 진도 안 나감', () => {
    const q = answerDanQuiz(createDanQuiz(3), false);
    expect(q).toMatchObject({ index: 0, hint: true });
    expect(answerDanQuiz(q, true)).toEqual(q);
    expect(leaveDanHint(q)).toMatchObject({ index: 0, hint: false });
  });
  it('12·13단은 해금 전 잠김', () => {
    expect(practiceDans('desert', false)).toEqual([
      { dan: 5, locked: false },
      { dan: 7, locked: false },
      { dan: 12, locked: true },
    ]);
    expect(practiceDans('desert', true)[2]).toEqual({ dan: 12, locked: false });
    expect(practiceDans('legend', true)).toEqual([{ dan: 13, locked: false }]);
    expect(practiceDans('legend', false)).toEqual([{ dan: 13, locked: true }]);
    expect(practiceDans('meadow', false).map((d) => d.dan)).toEqual([2, 4, 8]);
    expect(practiceDans('waterside', false).map((d) => d.dan)).toEqual([3, 6, 9]);
  });
});
