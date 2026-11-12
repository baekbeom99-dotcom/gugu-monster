import { describe, expect, it } from 'vitest';
import {
  CORRECT_EXP,
  DUPLICATE_EXP,
  displayName,
  addExp,
  EVOLVE_LEVELS,
  expToNext,
  MAX_LEVEL,
  PARTICIPATION_EXP,
} from '../../src/domain/field/growth';
import type { SpeciesEntry } from '../../src/store/fieldData';

const entry = (level: number, exp = 0, stage: 1 | 2 | 3 = 1): SpeciesEntry => ({ level, exp, stage, caught: 1, firstCaughtAt: 1, hp: 100, wounds: [] });

describe('성장 수치', () => {
  it('상수 값이 고정돼 있다', () => {
    expect(MAX_LEVEL).toBe(30);
    expect(DUPLICATE_EXP).toBe(40);
    expect(PARTICIPATION_EXP).toBe(10);
    expect(CORRECT_EXP).toBe(2);
    expect(EVOLVE_LEVELS).toEqual({ 2: 8, 3: 18 });
  });
  it('expToNext = 20 + 레벨 × 10', () => {
    expect(expToNext(1)).toBe(30);
    expect(expToNext(10)).toBe(120);
  });
});

describe('addExp', () => {
  it('모자라면 경험치만 쌓인다', () => {
    const r = addExp(entry(5), 10, false);
    expect(r.entry).toMatchObject({ level: 5, exp: 10, stage: 1 });
    expect(r.levelsGained).toBe(0);
    expect(r.evolvedTo).toBeNull();
  });
  it('Lv7 → 8에서 2단계로 진화', () => {
    const r = addExp(entry(7), expToNext(7), false);
    expect(r.entry).toMatchObject({ level: 8, exp: 0, stage: 2 });
    expect(r.levelsGained).toBe(1);
    expect(r.evolvedTo).toBe(2);
  });
  it('Lv17 → 18에서 3단계로 진화', () => {
    const r = addExp(entry(17, 0, 2), expToNext(17), false);
    expect(r.entry).toMatchObject({ level: 18, stage: 3 });
    expect(r.evolvedTo).toBe(3);
  });
  it('이미 2단계면 Lv8을 지나도 다시 진화하지 않는다', () => {
    const r = addExp(entry(7, 0, 2), expToNext(7), false);
    expect(r.evolvedTo).toBeNull();
    expect(r.entry.stage).toBe(2);
  });
  it('레전드는 진화하지 않는다', () => {
    const r = addExp(entry(17), expToNext(17), true);
    expect(r.entry).toMatchObject({ level: 18, stage: 1 });
    expect(r.evolvedTo).toBeNull();
  });
  it('Lv30에서 멈추고 경험치는 0', () => {
    const r = addExp(entry(30), 9999, false);
    expect(r.entry).toMatchObject({ level: 30, exp: 0 });
    expect(r.levelsGained).toBe(0);
    const r2 = addExp(entry(29), 9999, false);
    expect(r2.entry).toMatchObject({ level: 30, exp: 0 });
    expect(r2.levelsGained).toBe(1);
  });
  it('한 번에 두 레벨', () => {
    const r = addExp(entry(2), expToNext(2) + expToNext(3) + 5, false);
    expect(r.levelsGained).toBe(2);
    expect(r.entry).toMatchObject({ level: 4, exp: 5 });
  });
  it('한 번에 Lv8과 Lv18을 넘으면 3단계, evolvedTo는 3', () => {
    let need = 0;
    for (let l = 7; l < 18; l++) need += expToNext(l);
    const r = addExp(entry(7), need, false);
    expect(r.entry).toMatchObject({ level: 18, stage: 3 });
    expect(r.evolvedTo).toBe(3);
    expect(r.levelsGained).toBe(11);
  });
  it('원본을 바꾸지 않는다', () => {
    const e = entry(5);
    addExp(e, 100, false);
    expect(e).toEqual(entry(5));
  });
});

describe('displayName', () => {
  it('단계별 별', () => {
    expect(displayName('jelly', 1)).toBe('젤리몬');
    expect(displayName('jelly', 2)).toBe('젤리몬 ★★');
    expect(displayName('jelly', 3)).toBe('젤리몬 ★★★');
  });
});
