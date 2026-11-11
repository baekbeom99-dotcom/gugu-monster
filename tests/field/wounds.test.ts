import { describe, expect, it } from 'vitest';
import type { FactId } from '../../src/domain/facts';
import { seededRng } from '../../src/domain/random';
import {
  addWound,
  answerHeal,
  applyDamage,
  createHealRun,
  healRunWound,
  isFainted,
  leaveHealHint,
  type Wound,
} from '../../src/domain/field/wounds';

describe('구구몬 체력·상처', () => {
  it('상처: 중복은 한 번(다시 맞으면 맨 뒤로), 최근 10개', () => {
    const w = (f: string) => ({ factId: f as FactId, type: 'product' as const });
    expect(addWound([w('2x3'), w('2x4')], w('2x3'))).toEqual([w('2x4'), w('2x3')]);
    expect(addWound([w('2x3')], { factId: '2x3', type: 'missingFirst' })).toHaveLength(2);
    const many = Array.from({ length: 12 }, (_, i) => w(`3x${i <= 10 ? i : 10}`)).reduce(addWound, [] as Wound[]);
    expect(many.length).toBe(10);
    // 오래된 것(3x0)부터 버리고, 다시 맞은 3x10이 맨 뒤
    expect(many[0]).toEqual(w('3x1'));
    expect(many[9]).toEqual(w('3x10'));
  });

  it('addWound는 받은 목록을 바꾸지 않는다', () => {
    const list: Wound[] = [{ factId: '2x3', type: 'product' }];
    addWound(list, { factId: '2x4', type: 'product' });
    expect(list).toEqual([{ factId: '2x3', type: 'product' }]);
  });

  it('applyDamage는 0 아래·100 위로 안 감', () => expect([applyDamage(20, 25), applyDamage(100, 0)]).toEqual([0, 100]));

  it('applyDamage: 이상한 피해(음수·NaN·소수)에도 0~100 정수', () => {
    expect(applyDamage(80, -30)).toBe(80);
    expect(applyDamage(80, Number.NaN)).toBe(80);
    expect(applyDamage(80, 24.6)).toBe(55);
    expect(applyDamage(Number.NaN, 10)).toBe(90);
    expect(applyDamage(150, 10)).toBe(90);
    expect(applyDamage(80, Infinity)).toBe(80);
  });

  it('isFainted: 체력 0이면 쓰러짐', () => {
    expect(isFainted({ hp: 0 })).toBe(true);
    expect(isFainted({ hp: 1 })).toBe(false);
  });
});

describe('회복 연습', () => {
  const w = (f: string): Wound => ({ factId: f as FactId, type: 'product' });
  it('상처 2개 → 정답 6번에 끝, 바퀴마다 다시 섞음, 오답은 셈 안 함', () => {
    const ws = [w('2x3'), w('7x8')];
    let run = createHealRun(ws, seededRng(3));
    let n = 0;
    const seen: string[] = [];
    while (!run.done) {
      seen.push(healRunWound(run)!.factId);
      run = leaveHealHint(answerHeal(run, false, seededRng(n)));
      expect(run.index + run.round * 2).toBe(n);
      run = answerHeal(run, true, seededRng(n++));
    }
    expect(n).toBe(6);
    expect(seen.filter((f) => f === '2x3')).toHaveLength(3);
    expect(seen.filter((f) => f === '7x8')).toHaveLength(3);
    expect(healRunWound(run)).toBeNull();
  });
  it('상처가 없으면 바로 done', () => {
    const run = createHealRun([], seededRng(1));
    expect(run.done).toBe(true);
    expect(healRunWound(run)).toBeNull();
  });
  it('힌트 중이거나 끝났으면 그대로', () => {
    const run = answerHeal(createHealRun([w('2x3')], seededRng(1)), false, seededRng(1));
    expect(run.hint).toBe(true);
    expect(answerHeal(run, true, seededRng(1))).toBe(run);
    expect(leaveHealHint(run)).toMatchObject({ hint: false, index: 0, round: 0 });
    const done = createHealRun([], seededRng(1));
    expect(answerHeal(done, true, seededRng(1))).toBe(done);
  });
  it('바퀴 경계에서 같은 문제가 연달아 나오지 않는다(상처 2개)', () => {
    for (let seed = 0; seed < 200; seed++) {
      const rng = seededRng(seed);
      let run = createHealRun([w('2x3'), w('7x8')], rng);
      const seq: string[] = [];
      while (!run.done) {
        seq.push(healRunWound(run)!.factId);
        run = answerHeal(run, true, rng);
      }
      expect(seq).toHaveLength(6);
      for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
    }
  });
  it('상처 1개는 3바퀴 = 정답 3번', () => {
    const rng = seededRng(5);
    let run = createHealRun([w('6x6')], rng);
    let n = 0;
    while (!run.done) {
      run = answerHeal(run, true, rng);
      n++;
    }
    expect(n).toBe(3);
  });
});
