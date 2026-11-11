import { describe, expect, it } from 'vitest';
import {
  answerWild, createWild, damageOf, MAX_TICK_MS, releaseWild, resumeWild, throwCapsule, tick, wildHpRatio,
  type WildState,
} from '../../src/domain/field/wildBattle';
import type { Rng } from '../../src/domain/random';

const r0 = () => 0;
/** 정해 둔 난수를 차례로 내놓는다 (다 쓰고 또 부르면 실패) */
const seq = (...values: number[]): Rng => () => {
  if (values.length === 0) throw new Error('난수를 너무 많이 씀');
  return values.shift()!;
};
const dizzyOf = (s: WildState): WildState => ({ ...s, phase: 'dizzy', hits: 4 });

describe('wildBattle: 문제 시간·정답', () => {
  it('MAX_TICK_MS는 250', () => expect(MAX_TICK_MS).toBe(250));
  it('보통: 7초, 정답 4개로 어지러움', () => {
    let s = createWild('normal', 5, 100);
    expect(s.timeLeftMs).toBe(7000);
    for (let i = 0; i < 3; i++) s = resumeWild(answerWild(s, true, r0));
    expect(s.phase).toBe('question');
    expect(answerWild(s, true, r0).phase).toBe('dizzy');
  });
  it.each([['weak', 3], ['normal', 4], ['strong', 4], ['mighty', 6], ['legend', 4]] as const)('%s 정답 %i개', (t, n) => {
    let s = createWild(t, 5, 100);
    for (let i = 0; i < n - 1; i++) {
      s = answerWild(s, true, r0);
      expect(s.phase).toBe('hit');
      s = resumeWild(s);
    }
    expect(s).toMatchObject({ phase: 'question', hits: n - 1, correct: n - 1 });
    expect(answerWild(s, true, r0)).toMatchObject({ phase: 'dizzy', hits: n, correct: n });
  });
  it.each([['weak', 7000], ['strong', 5000], ['mighty', 5000], ['legend', 7000]] as const)('%s 시간 %i', (t, ms) =>
    expect(createWild(t, 1, 100).timeLeftMs).toBe(ms));
  it('처음 상태', () => {
    expect(createWild('strong', 8, 60)).toEqual({
      tier: 'strong', level: 8, hits: 0, timeLeftMs: 5000, allyHp: 60, phase: 'question', correct: 0, timedOut: false, lastMove: null,
    });
  });
  it('시작부터 체력 0이면 쓰러진 채(전투가 열리지 않게)', () => {
    const s = createWild('normal', 5, 0);
    expect(s.phase).toBe('fainted');
    expect(tick(s, 250, r0)).toBe(s);
    expect(answerWild(s, false, r0)).toBe(s);
  });
  it('시간은 question에서만, 한 번에 250ms까지', () => {
    const s = createWild('normal', 5, 100);
    expect(tick(s, 60000, r0).timeLeftMs).toBe(6750);
    expect(tick(s, NaN, r0).timeLeftMs).toBe(7000);
    for (const bad of [Infinity, -Infinity, -100]) expect(tick(s, bad, r0).timeLeftMs).toBe(7000);
    expect(tick(s, 100, r0).timeLeftMs).toBe(6900);
    for (const phase of ['hit', 'struck', 'hint', 'dizzy'] as const) expect(tick({ ...s, phase }, 100, r0)).toEqual({ ...s, phase });
  });
  it('시간이 다 되면 피격(timedOut), 체력 −25, 힌트로', () => {
    let s = createWild('normal', 5, 100);
    for (let i = 0; i < 27; i++) s = tick(s, 250, r0);
    expect(s).toMatchObject({ phase: 'question', timeLeftMs: 250 });
    s = tick(s, 250, r0);
    expect(s).toMatchObject({ phase: 'struck', timedOut: true, allyHp: 75, timeLeftMs: 0 });
    expect(resumeWild(s).phase).toBe('hint');
    expect(resumeWild(resumeWild(s))).toMatchObject({ phase: 'question', timeLeftMs: 7000 });
  });
  it('시간이 남아 있으면 난수를 쓰지 않는다', () => {
    expect(() => tick(createWild('normal', 5, 100), 250, seq())).not.toThrow();
  });
  it('정답 뒤 다음 문제는 시간이 처음부터', () => {
    const s = tick(tick(createWild('strong', 5, 100), 250, r0), 250, r0);
    expect(resumeWild(answerWild(s, true, r0)).timeLeftMs).toBe(5000);
  });
});

describe('wildBattle: 적의 공격', () => {
  it.each([['weak', 5], ['normal', 4], ['strong', 3], ['mighty', 2], ['legend', 3]] as const)('%s: 오답 %i번에 쓰러지고 힌트 없이 끝', (t, n) => {
    let s = createWild(t, 5, 100);
    for (let i = 0; i < n - 1; i++) {
      s = answerWild(s, false, r0);
      expect(s.phase).toBe('struck');
      s = resumeWild(resumeWild(s));
    }
    const last = answerWild(s, false, r0);
    expect(last).toMatchObject({ phase: 'fainted', allyHp: 0, timedOut: false });
    expect(resumeWild(last)).toBe(last);
  });
  it('시간 초과로 쓰러져도 힌트 없이 끝', () => {
    let s = createWild('mighty', 5, 50);
    for (let i = 0; i < 20; i++) s = tick(s, 250, r0);
    expect(s).toMatchObject({ phase: 'fainted', allyHp: 0, timedOut: true });
  });
  it('오답은 timedOut false, 맞힌 수는 그대로', () => {
    expect(answerWild(createWild('normal', 5, 100), false, r0)).toMatchObject({ phase: 'struck', timedOut: false, allyHp: 75, correct: 0, hits: 0 });
  });
  it('question이 아니면 answerWild는 그대로(연타)', () => {
    const a = answerWild(createWild('normal', 5, 100), true, r0);
    expect(answerWild(a, true, r0)).toBe(a);
    expect(answerWild(a, false, r0)).toBe(a);
    for (const phase of ['struck', 'hint', 'dizzy', 'caught', 'escaped', 'released', 'fainted'] as const) {
      const s = { ...a, phase };
      expect(answerWild(s, true, r0)).toBe(s);
    }
  });
  it('적 기술은 rng로 0~2', () => {
    expect(answerWild(createWild('normal', 5, 100), false, () => 0.99).lastMove).toBe(2);
    expect(answerWild(createWild('normal', 5, 100), false, () => 0.5).lastMove).toBe(1);
    expect(answerWild(createWild('normal', 5, 100), false, r0).lastMove).toBe(0);
  });
  it('damageOf', () => {
    expect(damageOf(createWild('weak', 5, 100))).toBe(20);
    expect(damageOf(createWild('mighty', 5, 100))).toBe(50);
  });
});

describe('wildBattle: 던지기', () => {
  it.each([
    [0.079, 'caught'], [0.081, 'retry'], [0.759, 'retry'], [0.761, 'escaped'], [0.969, 'escaped'], [0.971, 'angry'],
  ] as const)('보통 경계 %f → %s', (r, outcome) => {
    const d = dizzyOf(createWild('normal', 5, 100));
    expect(throwCapsule(d, seq(r, 0), 5)!.outcome).toBe(outcome);
  });
  it('() => 0은 잡힘, () => 0.999는 화남', () => {
    for (const t of ['weak', 'normal', 'strong', 'mighty', 'legend'] as const) {
      const d = dizzyOf(createWild(t, 5, 100));
      expect(throwCapsule(d, r0, 5)).toEqual({ state: { ...d, phase: 'caught' }, outcome: 'caught' });
      expect(throwCapsule(d, () => 0.999, 5)!.outcome).toBe('angry');
    }
  });
  it('도망은 escaped', () => {
    const d = dizzyOf(createWild('normal', 5, 100));
    expect(throwCapsule(d, seq(0.9), 5)!.state.phase).toBe('escaped');
  });
  it('화남: 보통→강력, 레벨은 강력 범위에서 다시, 체력 가득, 문제로', () => {
    const d = { ...createWild('normal', 5, 100), phase: 'dizzy' as const, hits: 4 };
    const rng = seq(0.999, 0);
    const r = throwCapsule(d, rng, 10)!;
    expect(r.outcome).toBe('angry');
    expect(r.state).toMatchObject({ tier: 'mighty', level: 16, hits: 0, phase: 'question', timeLeftMs: 5000 });
    expect(wildHpRatio(r.state)).toBe(1);
  });
  it('화남 레벨은 강력 범위의 위끝까지', () => {
    const d = dizzyOf(createWild('weak', 2, 100));
    expect(throwCapsule(d, seq(0.999, 0.999), 10)!.state).toMatchObject({ tier: 'mighty', level: 19 });
  });
  it('강력·황금의 화남은 단계 그대로, 체력만 회복', () => {
    for (const t of ['mighty', 'legend'] as const) {
      const d = { ...dizzyOf(createWild(t, 13, 100)), hits: 6, allyHp: 40 };
      const r = throwCapsule(d, seq(0.999), 10)!; // 레벨을 다시 뽑지 않으니 난수는 한 번
      expect(r.outcome).toBe('angry');
      expect(r.state).toEqual({ ...d, hits: 0, phase: 'question', timeLeftMs: t === 'mighty' ? 5000 : 7000 });
    }
  });
  it('재도전은 dizzy 그대로, dizzy가 아니면 null', () => {
    const d = dizzyOf(createWild('normal', 5, 100));
    const r = throwCapsule(d, seq(0.5), 5)!;
    expect(r.outcome).toBe('retry');
    expect(r.state).toBe(d);
    for (const phase of ['question', 'hit', 'struck', 'hint', 'caught', 'escaped', 'released', 'fainted'] as const) {
      expect(throwCapsule({ ...d, phase }, r0, 5)).toBeNull();
    }
  });
  it('releaseWild: dizzy→released', () => {
    const d = dizzyOf(createWild('normal', 5, 100));
    expect(releaseWild(d)).toEqual({ ...d, phase: 'released' });
    const q = createWild('normal', 5, 100);
    expect(releaseWild(q)).toBe(q);
  });
  it('wildHpRatio', () => {
    expect(wildHpRatio({ ...createWild('mighty', 5, 100), hits: 3 })).toBe(0.5);
    expect(wildHpRatio(createWild('normal', 5, 100))).toBe(1);
    expect(wildHpRatio({ ...createWild('weak', 5, 100), hits: 9 })).toBe(0);
  });
  it('끝난 상태에서는 모든 함수가 그대로', () => {
    for (const phase of ['caught', 'escaped', 'released', 'fainted'] as const) {
      const s = { ...createWild('normal', 5, 100), phase };
      expect(tick(s, 250, r0)).toBe(s);
      expect(answerWild(s, true, r0)).toBe(s);
      expect(resumeWild(s)).toBe(s);
      expect(releaseWild(s)).toBe(s);
      expect(throwCapsule(s, r0, 5)).toBeNull();
    }
  });
});
