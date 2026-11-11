import { describe, expect, it } from 'vitest';
import type { FactId } from '../../src/domain/facts';
import { addWound, applyDamage, isFainted, type Wound } from '../../src/domain/field/wounds';

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
