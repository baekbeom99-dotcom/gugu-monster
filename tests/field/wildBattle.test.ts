import { describe, expect, it } from 'vitest';
import {
  answerWild, createWild, fleeTimeMs, resumeWild, throwCapsule, tick,
  WILD_MAX_QUESTIONS, type WildState,
} from '../../src/domain/field/wildBattle';
import { getFact } from '../../src/domain/facts';

function ticks(s: WildState, n: number, dt: number, fleeMs: number) {
  for (let i = 0; i < n; i++) s = tick(s, dt, fleeMs);
  return s;
}

describe('wildBattle', () => {
  it('꽉 찬 채로 7초면 도망, 6.9초면 아직', () => {
    expect(ticks(createWild(), 70, 100, 7000).phase).toBe('fled');
    expect(ticks(createWild(), 69, 100, 7000).phase).toBe('question');
  });
  it('힌트·연출 중에는 시간이 멈춘다', () => {
    const q = createWild();
    for (const phase of ['hint', 'anim'] as const) {
      const s = { ...q, hp: 60, fullMs: 123, phase };
      expect(tick(s, 10000, 7000)).toEqual(s);
    }
  });
  it('한 번의 tick은 250ms만 흐른다', () => {
    const s = tick(createWild(), 60000, 7000);
    expect(s.phase).toBe('question');
    expect(s.fullMs).toBe(250);
  });
  it('dt가 NaN·Infinity여도 상태가 망가지지 않는다 (0으로 본다)', () => {
    const s = { ...createWild(), hp: 60, fullMs: 100 };
    for (const bad of [NaN, Infinity, -Infinity]) {
      const t = tick(s, bad, 7000);
      expect(Number.isFinite(t.hp)).toBe(true);
      expect(Number.isFinite(t.fullMs)).toBe(true);
    }
    expect(tick(createWild(), NaN, 7000).fullMs).toBe(0);
  });
  it('정답 뒤 resume하고 5초 지나면 HP 75', () => {
    let s = answerWild(createWild(), true, false);
    expect(s.hp).toBe(60);
    expect(s.phase).toBe('anim');
    s = resumeWild(s);
    s = ticks(s, 20, 250, 7000);
    expect(s.hp).toBe(75);
  });
  it('빠른 정답은 50 깎고 HP는 0 아래로 안 간다', () => {
    expect(answerWild(createWild(), true, true).hp).toBe(50);
    const s = answerWild({ ...createWild(), hp: 10 }, true, true);
    expect(s.hp).toBe(0);
    expect(s.phase).toBe('dizzy');
  });
  it('느린 아이도 12문제 안에 어지러워지고 잠들지 않는다', () => {
    let s = createWild();
    for (let i = 0; i < WILD_MAX_QUESTIONS && s.phase !== 'dizzy'; i++) {
      s = answerWild(s, true, false);
      if (s.phase === 'anim') s = ticks(resumeWild(s), 40, 250, 7000);
    }
    expect(s.phase).toBe('dizzy');
    expect(s.asleep).toBe(false);
  });
  it('연타는 한 번만 센다', () => {
    const a = answerWild(createWild(), true, false);
    const b = answerWild(a, true, false);
    expect(b).toBe(a);
    expect(b.questions).toBe(1);
  });
  it('12번 모두 오답이면 잠들어 어지러움', () => {
    let s = createWild();
    for (let i = 0; i < WILD_MAX_QUESTIONS; i++) s = resumeWild(answerWild(s, false, false));
    expect(s.phase).toBe('dizzy');
    expect(s.asleep).toBe(true);
  });
  it('캡슐: 성공·실패·확률 증가', () => {
    const d = { ...createWild(), phase: 'dizzy' as const, hp: 0 };
    expect(throwCapsule(d, () => 0.29).phase).toBe('caught');
    const f = throwCapsule(d, () => 0.31);
    expect(f.hp).toBe(40);
    expect(f.phase).toBe('question');
    expect(f.catchChance).toBeCloseTo(0.45);
    let s = d;
    for (let i = 0; i < 6; i++) s = { ...throwCapsule(s, () => 0.999), phase: 'dizzy' };
    expect(s.catchChance).toBe(1);
    expect(throwCapsule(createWild(), () => 0)).toEqual(createWild());
  });
  it('fleeTimeMs', () => {
    expect(fleeTimeMs(getFact('3x4'), 3, 'product', 1)).toBe(7000);
    expect(fleeTimeMs(getFact('7x8'), 0, 'product', 1)).toBe(12000);
    expect(fleeTimeMs(getFact('6x7'), 2, 'missingSecond', 1)).toBe(11000);
    expect(fleeTimeMs(getFact('13x2'), 0, 'missingFirst', 1)).toBe(17000);
    expect(fleeTimeMs(getFact('3x4'), 3, 'product', 1.5)).toBe(10500);
  });
  it('HP가 줄면 꽉 찬 시간(fullMs)이 0으로 돌아간다', () => {
    const full = { ...createWild(), fullMs: 5000 };
    const s = tick(resumeWild(answerWild(full, true, false)), 100, 7000);
    expect(s.fullMs).toBe(0);
    // 회복 중인 상태에서 직접: tick만으로도 0이 된다
    expect(tick({ ...createWild(), hp: 60, fullMs: 5000 }, 100, 7000).fullMs).toBe(0);
  });
  it('회복은 100에서 멈춘다', () => {
    let s = { ...createWild(), hp: 90 };
    for (let i = 0; i < 40; i++) {
      s = tick(s, 250, 100000);
      expect(s.hp).toBeLessThanOrEqual(100);
    }
    expect(s.hp).toBe(100);
  });
  it('새 문제마다 도망 시간이 처음부터 시작된다', () => {
    let s = ticks(createWild(), 24, 250, 7000);
    expect(s.phase).toBe('question');
    expect(s.fullMs).toBe(6000);
    s = answerWild(s, false, false);
    expect(s.phase).toBe('hint');
    s = resumeWild(s);
    expect(s.fullMs).toBe(0);
    s = ticks(s, 24, 250, 7000);
    expect(s.phase).toBe('question');
  });
});
