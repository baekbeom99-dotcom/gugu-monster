import { describe, expect, it } from 'vitest';
import { FIELDS, fieldDans } from '../../src/domain/field/fields';
import { companionStart, parseMap, safeStartPosition, tryStep } from '../../src/domain/field/movement';

const map = parseMap('meadow', ['#####', '<.,.>', '#.S.#', '#@..#', '#####'], {
  exits: { '<': 'waterside', '>': 'desert' },
  signTexts: ['안녕'],
});

describe('tryStep', () => {
  it('막힘 칸·지도 밖으로는 못 간다', () => {
    expect(tryStep(map, { x: 1, y: 1 }, 'up')).toMatchObject({ moved: false, tile: null });
    expect(tryStep(map, { x: 0, y: 1 }, 'left').moved).toBe(false);
  });
  it('표지판 칸으로는 못 간다', () => {
    expect(tryStep(map, { x: 1, y: 2 }, 'right').moved).toBe(false);
  });
  it('표지판에 부딪히면 bump에 그 칸', () => {
    const r = tryStep(map, { x: 1, y: 2 }, 'right');
    expect(r).toMatchObject({ moved: false, bump: { x: 2, y: 2 }, tile: null });
  });
  it('벽은 bump 없음', () => expect(tryStep(map, { x: 1, y: 1 }, 'up').bump).toBeNull());
  it('occupied 칸은 막히고 bump', () => {
    const r = tryStep(map, { x: 1, y: 1 }, 'right', (p) => p.x === 2 && p.y === 1);
    expect(r).toMatchObject({ moved: false, bump: { x: 2, y: 1 } });
  });
  it('풀숲에 들어가면 enteredGrass', () => {
    const r = tryStep(map, { x: 1, y: 1 }, 'right');
    expect(r).toMatchObject({ moved: true, enteredGrass: true, tile: 'grass', pos: { x: 2, y: 1 } });
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

describe('마을 글자 (위아래 출구·문·서식지)', () => {
  const rows = ['##^##', '<...>', '#gDa#', '#p~@#', '###v#'];
  const m = parseMap('town', rows, { exits: { '<': 'waterside', '>': 'desert', '^': 'meadow', v: 'town' }, signTexts: [] });
  it('위 출구는 아래를 보고, 옆 출구 입구는 한 칸 안쪽', () => {
    expect(m.exits.find((e) => e.pos.y === 0)).toEqual({ pos: { x: 2, y: 0 }, to: 'meadow', inward: 'down' });
    expect(m.entrances.waterside).toEqual({ x: 1, y: 1 });
    expect(m.entrances.meadow).toEqual({ x: 2, y: 1 });
    expect(m.exits.find((e) => e.to === 'waterside')?.inward).toBe('right');
    expect(m.exits.find((e) => e.to === 'desert')?.inward).toBe('left');
  });
  it('문·막힘·서식지·원래 글자', () => {
    expect(m.doors).toEqual([{ x: 2, y: 2 }]);
    expect(m.tiles[2][2]).toBe('door');
    expect(m.tiles[3][2]).toBe('block');
    expect(m.tiles[2][1]).toBe('path');
    expect(m.zones).toEqual({ meadow: [{ x: 1, y: 2 }], desert: [{ x: 3, y: 2 }], waterside: [{ x: 1, y: 3 }] });
    expect(m.raw).toBe(rows);
  });
  it('문에 부딪히면 bump = 문 칸', () => {
    expect(tryStep(m, { x: 2, y: 1 }, 'down')).toMatchObject({ moved: false, bump: { x: 2, y: 2 } });
  });
  it('아래 출구는 위를 보고, 지나가면 exitTo', () => {
    expect(m.exits.find((e) => e.to === 'town')).toEqual({ pos: { x: 3, y: 4 }, to: 'town', inward: 'up' });
    expect(m.entrances.town).toEqual({ x: 3, y: 3 });
    expect(tryStep(m, { x: 3, y: 3 }, 'down')).toMatchObject({ moved: true, exitTo: 'town' });
  });
  it('필드 지도에는 문·서식지가 없다', () => {
    expect(map.doors).toEqual([]);
    expect(map.zones).toEqual({});
    expect(map.exits.map((e) => e.inward)).toEqual(['right', 'left']);
  });
  it('도착 필드가 없는 위 출구는 오류', () => {
    expect(() => parseMap('town', ['#^#', '#@#'], { exits: {}, signTexts: [] })).toThrow();
  });
  it('저장 자리가 마을이면 마을 지도에서 그대로', () => {
    expect(safeStartPosition(m, { map: 'town', x: 1, y: 1, facing: 'up' })).toEqual({ x: 1, y: 1, facing: 'up' });
    expect(safeStartPosition(m, { map: 'meadow', x: 1, y: 1, facing: 'up' })).toEqual({ x: 3, y: 3, facing: 'down' });
  });
});
