import { describe, expect, it } from 'vitest';
import { FIELDS, fieldDans } from '../../src/domain/field/fields';
import { companionStart, parseMap, tryStep } from '../../src/domain/field/movement';

const map = parseMap('meadow', ['#####', '<.,.>', '#.S.#', '#@..#', '#####'], {
  exits: { '<': 'waterside', '>': 'desert' },
  signTexts: ['안녕'],
});

describe('tryStep', () => {
  it('막힘 칸·지도 밖으로는 못 간다', () => {
    expect(tryStep(map, { x: 1, y: 1 }, 'up').moved).toBe(false);
    expect(tryStep(map, { x: 0, y: 1 }, 'left').moved).toBe(false);
  });
  it('표지판 칸으로는 못 간다', () => {
    expect(tryStep(map, { x: 1, y: 2 }, 'right').moved).toBe(false);
  });
  it('풀숲에 들어가면 enteredGrass', () => {
    const r = tryStep(map, { x: 1, y: 1 }, 'right');
    expect(r).toMatchObject({ moved: true, enteredGrass: true, pos: { x: 2, y: 1 } });
  });
  it('출구 칸이면 exitTo', () => {
    expect(tryStep(map, { x: 1, y: 1 }, 'left').exitTo).toBe('waterside');
    expect(tryStep(map, { x: 3, y: 1 }, 'right').exitTo).toBe('desert');
  });
});

describe('parseMap', () => {
  it('시작·들어오는 칸·표지판을 만든다', () => {
    expect(map.entrances.start).toEqual({ x: 1, y: 3 });
    expect(map.entrances.waterside).toEqual({ x: 1, y: 1 });
    expect(map.entrances.desert).toEqual({ x: 3, y: 1 });
    expect(map.signs).toEqual([{ pos: { x: 2, y: 2 }, text: '안녕' }]);
  });
  it('모양이 틀리면 던진다', () => {
    expect(() => parseMap('meadow', ['##', '###'], { exits: {}, signTexts: [] })).toThrow();
    expect(() => parseMap('meadow', ['#?'], { exits: {}, signTexts: [] })).toThrow();
    expect(() => parseMap('meadow', ['<.'], { exits: {}, signTexts: [] })).toThrow();
    expect(() => parseMap('meadow', ['S.'], { exits: {}, signTexts: [] })).toThrow();
    expect(() => parseMap('meadow', ['..'], { exits: {}, signTexts: ['x'] })).toThrow();
  });
});

describe('fieldDans', () => {
  it('12단은 열렸을 때만', () => {
    expect(fieldDans('desert', false)).toEqual([5, 7]);
    expect(fieldDans('desert', true)).toEqual([5, 7, 12]);
    expect(fieldDans('meadow', false)).toEqual([2, 4, 8]);
    expect(fieldDans('waterside', false)).toEqual([3, 6, 9]);
  });
  it('필드별 몬스터', () => {
    expect(FIELDS.meadow.species).toEqual(['cloud', 'mushroom', 'fluff']);
    expect(FIELDS.desert.species).toEqual(['pebble', 'ghost']);
  });
});

describe('companionStart', () => {
  it('바라보는 방향의 반대쪽 칸이 걸을 수 있으면 거기', () => {
    expect(companionStart(map, { x: 2, y: 3 }, 'right')).toEqual({ x: 1, y: 3 });
    expect(companionStart(map, { x: 3, y: 3 }, 'down')).toEqual({ x: 3, y: 2 });
  });
  it('뒤가 막힘·표지판이거나 지도 밖이면 주인공 칸', () => {
    expect(companionStart(map, { x: 1, y: 3 }, 'right')).toEqual({ x: 1, y: 3 });
    expect(companionStart(map, { x: 2, y: 3 }, 'up')).toEqual({ x: 2, y: 3 });
    expect(companionStart(map, { x: 2, y: 3 }, 'down')).toEqual({ x: 2, y: 3 });
  });
});
