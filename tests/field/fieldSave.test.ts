import { describe, expect, it } from 'vitest';
import { initialField } from '../../src/store/fieldData';
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

  it('기본 자리는 초원, 아래를 본다', () => {
    const f = initialField();
    expect(f.position.map).toBe('meadow');
    expect(f.position.facing).toBe('down');
    expect(f.starterChosen).toBe(false);
    expect(f.companion).toBeNull();
  });

  it('모르는 지도 이름 -> 초원 기본 자리', () => {
    const s = { ...oldSave(), field: { ...initialField(), position: { map: 'volcano', x: 3, y: 4, facing: 'up' } } };
    expect(mergeSave(createInitialSave(NOW), s).field.position).toEqual(initialField().position);
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
