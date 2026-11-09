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

describe('필드 경험치·알림', () => {
  beforeEach(() => {
    useGameStore.getState().resetAll();
  });

  it('동행이 정답 4로 끝내면 참여 10 + 4×2 = 18 경험치', () => {
    useGameStore.getState().chooseStarter('jelly', NOW);
    useGameStore.getState().finishWildBattle(batch({ species: 'horn', caught: false, fled: true, correct: 4 }));
    expect(useGameStore.getState().field.species.jelly!.exp).toBe(18);
  });

  it('도망쳐도 동행은 참여 경험치를 받는다', () => {
    useGameStore.getState().chooseStarter('jelly', NOW);
    useGameStore.getState().finishWildBattle(batch({ caught: false, fled: true, correct: 0 }));
    expect(useGameStore.getState().field.species.jelly!.exp).toBe(10);
  });

  it('이미 있는 종을 또 잡으면 그 종에 +40 (새로 잡을 때는 없음)', () => {
    useGameStore.getState().chooseStarter('cloud', NOW);
    useGameStore.getState().finishWildBattle(batch());
    expect(useGameStore.getState().field.species.horn!.exp).toBe(0);
    useGameStore.getState().finishWildBattle(batch({ correct: 0 }));
    expect(useGameStore.getState().field.species.horn!.exp).toBe(40);
  });

  it('동행과 같은 종을 또 잡으면 중복 + 참여 경험치가 같은 칸에 들어간다', () => {
    useGameStore.getState().chooseStarter('jelly', NOW);
    useGameStore.getState().finishWildBattle(batch({ species: 'jelly', correct: 4 }));
    const e = useGameStore.getState().field.species.jelly!;
    expect(e.exp).toBe(40 + 18);
    expect(e.caught).toBe(2);
  });

  it('레벨이 오르면 levelUp(최종 레벨), 진화하면 evolve 알림이 한 번씩', () => {
    useGameStore.getState().chooseStarter('jelly', NOW);
    useGameStore.setState((s) => ({
      field: { ...s.field, species: { ...s.field.species, jelly: { level: 7, exp: 0, stage: 1, caught: 1, firstCaughtAt: NOW } } },
    }));
    const r = useGameStore.getState().finishWildBattle(batch({ species: 'jelly', correct: 5 })); // 60 < 90
    expect(r.notices).toEqual([]);
    useGameStore.setState((s) => ({
      field: { ...s.field, species: { ...s.field.species, jelly: { level: 7, exp: 85, stage: 1, caught: 1, firstCaughtAt: NOW } } },
    }));
    const r2 = useGameStore.getState().finishWildBattle(batch({ species: 'jelly', correct: 5 }));
    expect(r2.notices).toEqual([
      { kind: 'levelUp', species: 'jelly', level: 8 },
      { kind: 'evolve', species: 'jelly', stage: 2 },
    ]);
    expect(useGameStore.getState().field.species.jelly).toMatchObject({ level: 8, stage: 2 });
  });
});
