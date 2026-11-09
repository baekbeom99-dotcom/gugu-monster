import { beforeEach, describe, expect, it } from 'vitest';
import { hatch, chooseEgg, initialPet } from '../../src/domain/pet';
import { useGameStore } from '../../src/store/useGameStore';

const NOW = new Date('2026-11-03T09:00:00').getTime();

function batch(over: Partial<Parameters<ReturnType<typeof useGameStore.getState>['finishWildBattle']>[0]> = {}) {
  return { species: 'horn' as const, level: 4, caught: true, fled: false, correct: 3, now: NOW, ...over };
}

function hatchedPet() {
  useGameStore.setState({ pet: { ...hatch(chooseEgg(initialPet(NOW), 'cat'), '냥이', NOW), affection: 0 } });
}

describe('필드 스토어 액션', () => {
  beforeEach(() => {
    useGameStore.getState().resetAll();
  });

  it('chooseStarter: 동행·도감 1종·본 종', () => {
    useGameStore.getState().chooseStarter('jelly', NOW);
    const f = useGameStore.getState().field;
    expect(f.starterChosen).toBe(true);
    expect(f.companion).toBe('jelly');
    expect(Object.keys(f.species)).toEqual(['jelly']);
    expect(f.species.jelly).toEqual({ level: 5, exp: 0, stage: 1, caught: 1, firstCaughtAt: NOW });
    expect(f.seen).toContain('jelly');
  });

  it('finishWildBattle: 새 종을 잡으면 도감에 들어가고 기록·친밀도가 오른다', () => {
    hatchedPet();
    const r = useGameStore.getState().finishWildBattle(batch());
    expect(r.newSpecies).toBe(true);
    expect(r.notices).toEqual([]);
    expect(r.affection).toBe(3);
    const s = useGameStore.getState();
    expect(s.field.species.horn).toEqual({ level: 4, exp: 0, stage: 1, caught: 1, firstCaughtAt: NOW });
    expect(s.field.stats).toEqual({ battles: 1, catches: 1, fled: 0 });
    expect(s.pet.affection).toBe(3);
  });

  it('같은 종을 또 잡으면 잡은 횟수만 오른다', () => {
    useGameStore.getState().finishWildBattle(batch());
    const r = useGameStore.getState().finishWildBattle(batch({ level: 6 }));
    expect(r.newSpecies).toBe(false);
    const e = useGameStore.getState().field.species.horn!;
    expect(e.caught).toBe(2);
    expect(e.level).toBe(4);
    expect(useGameStore.getState().field.stats.catches).toBe(2);
  });

  it('도망: 도감은 그대로, fled와 battles만 오른다', () => {
    const r = useGameStore.getState().finishWildBattle(batch({ caught: false, fled: true, correct: 0 }));
    expect(r.newSpecies).toBe(false);
    const s = useGameStore.getState();
    expect(s.field.species.horn).toBeUndefined();
    expect(s.field.stats).toEqual({ battles: 1, catches: 0, fled: 1 });
  });

  it('펫이 알이면 친밀도는 그대로', () => {
    const before = useGameStore.getState().pet.affection;
    const r = useGameStore.getState().finishWildBattle(batch());
    expect(r.affection).toBe(0);
    expect(useGameStore.getState().pet.affection).toBe(before);
  });

  it('setCompanion: 못 잡은 종은 false, 동행 그대로', () => {
    useGameStore.getState().chooseStarter('cloud', NOW);
    expect(useGameStore.getState().setCompanion('ghost')).toBe(false);
    expect(useGameStore.getState().field.companion).toBe('cloud');
    useGameStore.getState().finishWildBattle(batch());
    expect(useGameStore.getState().setCompanion('horn')).toBe(true);
    expect(useGameStore.getState().field.companion).toBe('horn');
  });

  it('이미 고른 뒤 chooseStarter를 또 불러도 기록과 동행이 그대로', () => {
    const g = useGameStore.getState();
    g.chooseStarter('jelly', NOW);
    g.finishWildBattle(batch({ species: 'jelly', level: 6 }));
    g.finishWildBattle(batch({ species: 'jelly', level: 6 }));
    g.setCompanion('jelly');
    const before = JSON.parse(JSON.stringify(useGameStore.getState().field));
    expect(before.species.jelly.caught).toBe(3);
    useGameStore.getState().chooseStarter('jelly', NOW + 1000);
    useGameStore.getState().chooseStarter('cloud', NOW + 2000);
    expect(useGameStore.getState().field).toEqual(before);
  });
});
