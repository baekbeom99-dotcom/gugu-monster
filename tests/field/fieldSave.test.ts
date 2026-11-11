import { describe, expect, it } from 'vitest';
import { initialField, mergeField, townStart } from '../../src/store/fieldData';
import { parseMap } from '../../src/domain/field/movement';
import { TOWN_EXITS, TOWN_ROWS, TOWN_SIGNS } from '../../src/field/world/maps/town';
import fieldDataSource from '../../src/store/fieldData.ts?raw';
import { createInitialSave, mergeSave } from '../../src/store/saveData';
import { useGameStore } from '../../src/store/useGameStore';

const NOW = new Date('2026-11-03T09:00:00').getTime();

/** 필드 모험이 생기기 전에 저장된 데이터 */
function oldSave() {
  const base = createInitialSave(NOW);
  const { field: _f, ...rest } = base as unknown as Record<string, unknown>;
  return {
    ...rest,
    settings: { sound: false, volume: 0.3, inputMode: 'choice' },
    economy: { ...base.economy, stars: 777 },
    learning: { ...base.learning, facts: { ...base.learning.facts, '7x8': { ...base.learning.facts['7x8'], box: 4 } } },
  };
}

describe('저장 데이터 field', () => {
  it('field 없는 옛 저장 -> 기본값, 별과 기록은 그대로', () => {
    const merged = mergeSave(createInitialSave(NOW), oldSave());
    expect(merged.field).toEqual(initialField());
    expect(merged.economy.stars).toBe(777);
    expect(merged.learning.facts['7x8'].box).toBe(4);
  });

  it('기본 자리는 태초마을, 아래를 본다', () => {
    const f = initialField();
    expect(f.position.map).toBe('town');
    expect(f.position.facing).toBe('down');
    expect(f.starterChosen).toBe(false);
    expect(f.companion).toBeNull();
  });

  it('모르는 지도 이름 -> 마을 기본 자리', () => {
    const s = { ...oldSave(), field: { ...initialField(), position: { map: 'volcano', x: 3, y: 4, facing: 'up' } } };
    expect(mergeSave(createInitialSave(NOW), s).field.position).toEqual(initialField().position);
  });

  it('새로 시작하면 태초마을 @', () => {
    expect(initialField().position).toEqual({ map: 'town', ...townStart(), facing: 'down' });
  });

  it('townStart는 마을 지도의 @ 칸', () => {
    const town = parseMap('town', TOWN_ROWS, { exits: TOWN_EXITS, signTexts: TOWN_SIGNS });
    expect(townStart()).toEqual(town.entrances.start);
    expect(TOWN_ROWS[townStart().y][townStart().x]).toBe('@');
  });

  it('옛 저장의 초원 자리는 그대로', () => {
    const pos = { map: 'meadow', x: 5, y: 8, facing: 'right' };
    expect(mergeField(initialField(), { position: pos }).position).toEqual(pos);
  });

  it('town 자리도 받는다, 모르는 지도 이름은 마을 시작', () => {
    expect(mergeField(initialField(), { position: { map: 'town', x: 3, y: 30, facing: 'up' } }).position.map).toBe('town');
    expect(mergeField(initialField(), { position: { map: 'castle', x: 3, y: 3, facing: 'up' } }).position).toEqual(initialField().position);
  });

  it('음수·소수·숫자 아닌 좌표, 모르는 방향은 마을 시작', () => {
    for (const bad of [
      { map: 'meadow', x: -1, y: 3, facing: 'up' },
      { map: 'meadow', x: 2.5, y: 3, facing: 'up' },
      { map: 'town', x: '3', y: 3, facing: 'up' },
      { map: 'town', x: 3, y: 3, facing: 'north' },
      null,
      'meadow',
    ]) {
      expect(mergeField(initialField(), { position: bad }).position).toEqual(initialField().position);
    }
  });

  it('v1.35 옛 저장(초원 자리, 새 칸 없음)을 열면 자리·도감이 그대로', () => {
    const entry = { level: 7, exp: 4, stage: 2, caught: 3, firstCaughtAt: NOW };
    const v135 = {
      starterChosen: true,
      companion: 'horn',
      species: { horn: entry },
      seen: ['horn'],
      position: { map: 'meadow', x: 5, y: 8, facing: 'right' },
      stats: { battles: 9, catches: 3, fled: 2 },
    };
    expect(mergeSave(createInitialSave(NOW), { ...oldSave(), field: v135 }).field).toEqual(v135);
  });

  it('fieldData.ts는 필드 지도·타일 그림을 가져오지 않는다 (마을 지도 글자만)', () => {
    const src: string = fieldDataSource;
    const imports = src.split(/\r?\n/).filter((l) => /^\s*(import|export)\b.*\bfrom\s/.test(l));
    const mapImports = imports.filter((l) => l.includes('maps/'));
    expect(mapImports.length).toBeGreaterThan(0);
    for (const l of mapImports) expect(l).toMatch(/maps\/town['"]/);
    expect(src).not.toMatch(/Tiles['"]/);
    expect(src).not.toMatch(/maps\/(meadow|waterside|desert)/);
  });

  it('모르는 종 키는 버려진다', () => {
    const entry = { level: 2, exp: 1, stage: 1, caught: 1, firstCaughtAt: NOW };
    const s = {
      ...oldSave(),
      field: { ...initialField(), species: { dragon: entry, horn: entry }, seen: ['dragon', 'horn', 'horn'], companion: 'dragon' },
    };
    const f = mergeSave(createInitialSave(NOW), s).field;
    expect(Object.keys(f.species)).toEqual(['horn']);
    expect(f.seen).toEqual(['horn']);
    expect(f.companion).toBeNull();
  });

  it('잘 저장된 값은 그대로 남는다', () => {
    const entry = { level: 5, exp: 3, stage: 2, caught: 2, firstCaughtAt: NOW };
    const field = {
      ...initialField(),
      starterChosen: true,
      companion: 'horn',
      species: { horn: entry },
      seen: ['horn'],
      position: { map: 'desert', x: 2, y: 3, facing: 'left' },
      stats: { battles: 4, catches: 2, fled: 1 },
    };
    expect(mergeSave(createInitialSave(NOW), { ...oldSave(), field }).field).toEqual(field);
  });

  it('markSeen은 같은 종을 한 번만 넣는다', () => {
    useGameStore.getState().resetAll();
    useGameStore.getState().markSeen('horn');
    useGameStore.getState().markSeen('horn');
    expect(useGameStore.getState().field.seen).toEqual(['horn']);
  });

  it('setFieldPosition이 자리를 바꾼다', () => {
    useGameStore.getState().setFieldPosition({ map: 'waterside', x: 1, y: 2, facing: 'right' });
    expect(useGameStore.getState().field.position).toEqual({ map: 'waterside', x: 1, y: 2, facing: 'right' });
  });

  it('fieldFleeScale: 없거나 잘못되면 1, 맞는 값은 유지', () => {
    expect(createInitialSave(NOW).settings.fieldFleeScale).toBe(1);
    const old = oldSave();
    expect(mergeSave(createInitialSave(NOW), old).settings.fieldFleeScale).toBe(1);
    expect(mergeSave(createInitialSave(NOW), { ...old, settings: { sound: false, fieldFleeScale: 2 } }).settings.fieldFleeScale).toBe(1);
    expect(mergeSave(createInitialSave(NOW), { ...old, settings: { sound: false, fieldFleeScale: 1.5 } }).settings.fieldFleeScale).toBe(1.5);
    expect(mergeSave(createInitialSave(NOW), { ...old, settings: { sound: false } }).settings.sound).toBe(false);
  });

  it('백업 불러오기(replaceSave)도 field를 채운다', () => {
    useGameStore.getState().replaceSave(oldSave());
    expect(useGameStore.getState().field).toEqual(initialField());
    expect(useGameStore.getState().economy.stars).toBe(777);
  });
});
