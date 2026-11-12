import { beforeEach, describe, expect, it } from 'vitest';
import { hatch, chooseEgg, initialPet } from '../../src/domain/pet';
import { townStart } from '../../src/store/fieldData';
import { useGameStore } from '../../src/store/useGameStore';
import type { Wound } from '../../src/domain/field/wounds';
import { currentSave } from '../../src/screens/admin/DataSecurityPanels';

const NOW = new Date('2026-11-03T09:00:00').getTime();

function batch(over: Partial<Parameters<ReturnType<typeof useGameStore.getState>['finishWildBattle']>[0]> = {}) {
  // 싸운 구구몬: 따로 주지 않으면 저장의 동행 (화면은 전투를 시작할 때 고른 종을 넘긴다)
  const companion = useGameStore.getState().field.companion ?? 'cloud';
  return { species: 'horn' as const, companion, level: 4, tier: 'normal' as const, end: 'caught' as const, correct: 3, now: NOW, ...over };
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
    expect(f.species.jelly).toEqual({ level: 5, exp: 0, stage: 1, caught: 1, firstCaughtAt: NOW, hp: 100, wounds: [] });
    expect(f.seen).toContain('jelly');
  });

  it('finishWildBattle: 새 종을 잡으면 도감에 들어가고 기록·친밀도가 오른다', () => {
    hatchedPet();
    const r = useGameStore.getState().finishWildBattle(batch());
    expect(r.newSpecies).toBe(true);
    expect(r.notices).toEqual([]);
    expect(r.affection).toBe(3);
    const s = useGameStore.getState();
    expect(s.field.species.horn).toEqual({ level: 4, exp: 0, stage: 1, caught: 1, firstCaughtAt: NOW, hp: 100, wounds: [] });
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
    const r = useGameStore.getState().finishWildBattle(batch({ end: 'escaped', correct: 0 }));
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
    useGameStore.getState().finishWildBattle(batch({ species: 'horn', end: 'escaped', correct: 4 }));
    expect(useGameStore.getState().field.species.jelly!.exp).toBe(18);
  });

  it('도망쳐도 동행은 참여 경험치를 받는다', () => {
    useGameStore.getState().chooseStarter('jelly', NOW);
    useGameStore.getState().finishWildBattle(batch({ end: 'escaped', correct: 0 }));
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
      field: { ...s.field, species: { ...s.field.species, jelly: { level: 7, exp: 0, stage: 1, caught: 1, firstCaughtAt: NOW, hp: 100, wounds: [] } } },
    }));
    const r = useGameStore.getState().finishWildBattle(batch({ species: 'jelly', correct: 5 })); // 60 < 90
    expect(r.notices).toEqual([]);
    useGameStore.setState((s) => ({
      field: { ...s.field, species: { ...s.field.species, jelly: { level: 7, exp: 85, stage: 1, caught: 1, firstCaughtAt: NOW, hp: 100, wounds: [] } } },
    }));
    const r2 = useGameStore.getState().finishWildBattle(batch({ species: 'jelly', correct: 5 }));
    expect(r2.notices).toEqual([
      { kind: 'levelUp', species: 'jelly', level: 8 },
      { kind: 'evolve', species: 'jelly', stage: 2 },
    ]);
    expect(useGameStore.getState().field.species.jelly).toMatchObject({ level: 8, stage: 2 });
  });
});

describe('구구몬 체력·상처 저장', () => {
  const wound: Wound = { factId: '7x8', type: 'product' };
  const setHp = (id: 'cloud' | 'jelly', hp: number) =>
    useGameStore.setState((s) => ({ field: { ...s.field, species: { ...s.field.species, [id]: { ...s.field.species[id]!, hp } } } }));

  beforeEach(() => {
    useGameStore.getState().resetAll();
    useGameStore.getState().chooseStarter('cloud', NOW);
  });

  it('damageCompanion: 체력·상처를 바로 저장', () => {
    const pos = { map: 'meadow' as const, x: 5, y: 8, facing: 'right' as const };
    useGameStore.getState().setFieldPosition(pos);
    const r = useGameStore.getState().damageCompanion('cloud', 25, wound);
    expect(r).toEqual({ hp: 75, fainted: false, replacedBy: null });
    const f = useGameStore.getState().field;
    expect(f.species.cloud).toMatchObject({ hp: 75, wounds: [wound] });
    expect(f.position).toEqual(pos);
  });

  it('damageCompanion으로 0이 되면 같은 순간 마을 시작 칸으로', () => {
    setHp('cloud', 20);
    useGameStore.setState((s) => ({ field: { ...s.field, position: { map: 'meadow', x: 5, y: 8, facing: 'right' } } }));
    const r = useGameStore.getState().damageCompanion('cloud', 25, wound);   // hp 20에서
    expect(r).toEqual({ hp: 0, fainted: true, replacedBy: null });
    expect(useGameStore.getState().field.position).toEqual({ map: 'town', ...townStart(), facing: 'down' });
    expect(useGameStore.getState().field.species.cloud).toMatchObject({ hp: 0, wounds: [wound] });
  });

  it('damageCompanion: 없는 종이면 아무것도 안 바꿈, 이상한 피해는 정수 0~100', () => {
    const before = JSON.parse(JSON.stringify(useGameStore.getState().field));
    expect(useGameStore.getState().damageCompanion('horn', 25, wound)).toEqual({ hp: 0, fainted: false, replacedBy: null });
    expect(useGameStore.getState().damageCompanion('nope' as 'horn', 25, wound)).toEqual({ hp: 0, fainted: false, replacedBy: null });
    expect(useGameStore.getState().field).toEqual(before);
    expect(useGameStore.getState().damageCompanion('cloud', -40, wound).hp).toBe(100);
    expect(useGameStore.getState().damageCompanion('cloud', Number.NaN, wound).hp).toBe(100);
    expect(useGameStore.getState().damageCompanion('cloud', 10.4, wound).hp).toBe(90);
    // 이상한 피해에도 상처는 한 번만 남는다
    expect(useGameStore.getState().field.species.cloud!.wounds).toEqual([wound]);
  });

  it("recordAnswer({source:'shop'}): 별과 성장 점수는 그대로, 학습 기록만 늘어난다", () => {
    const before = useGameStore.getState();
    const r = useGameStore.getState().recordAnswer({
      factId: '7x8', type: 'product', correct: true, ms: 2000, inputMode: 'choice', isRetry: false,
      firstAttemptInBattle: true, battleStartedAt: NOW - 1000, now: NOW, source: 'shop',
    });
    const after = useGameStore.getState();
    expect(r).toMatchObject({ stars: 0, baseStars: 0, xp: 0 });
    expect(after.economy.stars).toBe(before.economy.stars);
    expect(after.pet.growthXp).toBe(before.pet.growthXp);
    expect(after.learning.totalAttempts).toBe(before.learning.totalAttempts + 1);
  });

  it('setCompanion: 쓰러진 종은 false', () => {
    useGameStore.getState().finishWildBattle(batch({ species: 'jelly' }));
    setHp('jelly', 0);
    expect(useGameStore.getState().setCompanion('jelly')).toBe(false);
    expect(useGameStore.getState().field.companion).toBe('cloud');
    setHp('jelly', 1);
    expect(useGameStore.getState().setCompanion('jelly')).toBe(true);
  });

  it('healSpecies: 체력 100, 상처 비움', () => {
    useGameStore.getState().damageCompanion('cloud', 25, wound);
    useGameStore.getState().healSpecies('cloud');
    expect(useGameStore.getState().field.species.cloud).toMatchObject({ hp: 100, wounds: [] });
    const before = JSON.parse(JSON.stringify(useGameStore.getState().field));
    useGameStore.getState().healSpecies('horn');
    expect(useGameStore.getState().field).toEqual(before);
  });

  it('finishWildBattle: 강함 배율로 경험치, 쓰러짐 알림, 같은 종 잡기 ×배율', () => {
    // correct 3, tier 'strong' → 동행 +Math.round((10+6)*1.6)=26
    useGameStore.getState().finishWildBattle(batch({ species: 'horn', end: 'escaped', tier: 'strong', correct: 3 }));
    expect(useGameStore.getState().field.species.cloud!.exp).toBe(26);
    expect(useGameStore.getState().field.stats).toEqual({ battles: 1, catches: 0, fled: 1 });
    // end 'fainted' → notices[0] = { kind: 'fainted', species: 'cloud' }
    useGameStore.getState().damageCompanion('cloud', 100, wound);
    const r = useGameStore.getState().finishWildBattle(batch({ species: 'horn', end: 'fainted', tier: 'normal', correct: 0 }));
    expect(r.notices[0]).toEqual({ kind: 'fainted', species: 'cloud' });
    // 체력·상처는 정산이 건드리지 않는다
    expect(useGameStore.getState().field.species.cloud).toMatchObject({ hp: 0, wounds: [wound] });
    expect(useGameStore.getState().field.stats.fled).toBe(2);
    // 같은 종 잡기: Math.round(40 × 0.6) = 24 (새로 잡을 땐 없음)
    useGameStore.getState().finishWildBattle(batch({ species: 'horn', end: 'caught', tier: 'weak', correct: 0 }));
    useGameStore.getState().finishWildBattle(batch({ species: 'horn', end: 'caught', tier: 'weak', correct: 0 }));
    expect(useGameStore.getState().field.species.horn!.exp).toBe(24);
    expect(useGameStore.getState().field.species.horn).toMatchObject({ hp: 100, wounds: [] });
    expect(useGameStore.getState().field.stats).toMatchObject({ catches: 2, fled: 2 });
  });

  it('released·quit도 도망 기록, 강함 legend 배율 3', () => {
    useGameStore.getState().finishWildBattle(batch({ end: 'released', tier: 'legend', correct: 2 }));
    expect(useGameStore.getState().field.species.cloud!.exp).toBe(Math.round(14 * 3));
    useGameStore.getState().finishWildBattle(batch({ end: 'quit', correct: 0 }));
    expect(useGameStore.getState().field.stats).toEqual({ battles: 2, catches: 0, fled: 2 });
    expect(useGameStore.getState().field.species.horn).toBeUndefined();
  });
});

describe('싸운 구구몬으로 정산 (end.companion)', () => {
  beforeEach(() => {
    useGameStore.getState().resetAll();
  });

  it('저장의 companion이 null이어도 end.companion의 구구몬이 경험치를 받고 쓰러짐 알림이 그 종으로 뜬다', () => {
    useGameStore.getState().chooseStarter('jelly', NOW);
    useGameStore.setState((s) => ({
      field: {
        ...s.field,
        companion: null,
        species: { ...s.field.species, cloud: { level: 5, exp: 0, stage: 1, caught: 1, firstCaughtAt: NOW, hp: 0, wounds: [] } },
      },
    }));
    const r = useGameStore.getState().finishWildBattle(batch({ companion: 'cloud', end: 'fainted', correct: 2 }));
    const f = useGameStore.getState().field;
    expect(f.species.cloud!.exp).toBe(14);
    expect(f.species.jelly!.exp).toBe(0);
    expect(r.notices[0]).toEqual({ kind: 'fainted', species: 'cloud' });
  });

  it('저장의 companion과 다른 종이 싸웠으면 싸운 종이 받는다', () => {
    useGameStore.getState().chooseStarter('jelly', NOW);
    useGameStore.setState((s) => ({
      field: { ...s.field, species: { ...s.field.species, cloud: { level: 5, exp: 0, stage: 1, caught: 1, firstCaughtAt: NOW, hp: 100, wounds: [] } } },
    }));
    useGameStore.getState().finishWildBattle(batch({ companion: 'cloud', end: 'escaped', correct: 0 }));
    expect(useGameStore.getState().field.species.cloud!.exp).toBe(10);
    expect(useGameStore.getState().field.species.jelly!.exp).toBe(0);
  });
});

describe('쓰러지면 도감의 다른 구구몬이 대신 함께 다님', () => {
  const wound: Wound = { factId: '7x8', type: 'product' };
  const entry = (level: number, hp: number, firstCaughtAt: number) => ({ level, exp: 0, stage: 1 as const, caught: 1, firstCaughtAt, hp, wounds: [] });
  const meadow = { map: 'meadow' as const, x: 5, y: 8, facing: 'right' as const };
  const town = () => ({ map: 'town', ...townStart(), facing: 'down' });

  beforeEach(() => {
    useGameStore.getState().resetAll();
    useGameStore.getState().chooseStarter('cloud', NOW);
    useGameStore.setState((s) => ({
      field: {
        ...s.field,
        position: meadow,
        species: { cloud: entry(5, 20, 1), jelly: entry(4, 100, 2), horn: entry(7, 0, 3), pebble: entry(6, 60, 4) },
      },
    }));
  });

  it('체력이 0이 되는 한 번의 저장에서 체력·상처·마을 위치·동행이 함께 바뀐다', () => {
    const states: ReturnType<typeof useGameStore.getState>['field'][] = [];
    const unsub = useGameStore.subscribe((s) => states.push(s.field));
    const r = useGameStore.getState().damageCompanion('cloud', 25, wound);
    unsub();
    // 쓰러진 horn(Lv7)은 빼고, 건강한 것 중 레벨이 가장 높은 pebble(Lv6)
    expect(r).toEqual({ hp: 0, fainted: true, replacedBy: 'pebble' });
    expect(states).toHaveLength(1);
    const f = states[0];
    expect(f.species.cloud).toMatchObject({ hp: 0, wounds: [wound] });
    expect(f.position).toEqual(town());
    expect(f.companion).toBe('pebble');
    // 대신 다니는 구구몬의 기록은 그대로
    expect(f.species.pebble).toEqual(entry(6, 60, 4));
  });

  it('쓰러지지 않으면 동행은 그대로', () => {
    const r = useGameStore.getState().damageCompanion('cloud', 10, wound);
    expect(r).toEqual({ hp: 10, fainted: false, replacedBy: null });
    expect(useGameStore.getState().field.companion).toBe('cloud');
  });

  it('건강한 다른 구구몬이 없으면 동행은 그대로 (쓰러진 채)', () => {
    useGameStore.setState((s) => ({ field: { ...s.field, species: { cloud: entry(5, 20, 1), horn: entry(7, 0, 3) } } }));
    const r = useGameStore.getState().damageCompanion('cloud', 25, wound);
    expect(r).toEqual({ hp: 0, fainted: true, replacedBy: null });
    const f = useGameStore.getState().field;
    expect(f.companion).toBe('cloud');
    expect(f.position).toEqual(town());
  });

  it('이미 쓰러진 종을 또 때려도 아무것도 안 바뀐다 (위치·상처·동행 그대로)', () => {
    useGameStore.setState((s) => ({ field: { ...s.field, species: { ...s.field.species, cloud: entry(5, 0, 1) } } }));
    const before = useGameStore.getState().field;
    const r = useGameStore.getState().damageCompanion('cloud', 25, wound);
    expect(r).toEqual({ hp: 0, fainted: true, replacedBy: null });
    expect(useGameStore.getState().field).toBe(before);
    expect(useGameStore.getState().field.position).toEqual(meadow);
    expect(useGameStore.getState().field.species.cloud!.wounds).toEqual([]);
  });

  it('동행이 아닌 종이 쓰러지면 동행은 바뀌지 않는다', () => {
    useGameStore.setState((s) => ({ field: { ...s.field, companion: 'jelly' } }));
    const r = useGameStore.getState().damageCompanion('cloud', 25, wound);
    expect(r.replacedBy).toBeNull();
    expect(useGameStore.getState().field.companion).toBe('jelly');
  });

  it('옛 저장(companion null): 화면이 고른 첫 종이 쓰러지면 대신 다닐 종이 정해진다', () => {
    useGameStore.setState((s) => ({ field: { ...s.field, companion: null } }));
    const r = useGameStore.getState().damageCompanion('cloud', 25, wound);
    expect(r.replacedBy).toBe('pebble');
    expect(useGameStore.getState().field.companion).toBe('pebble');
  });

  it('옛 저장(companion null, 다른 종 없음): 깨지지 않고 동행은 null 그대로', () => {
    useGameStore.setState((s) => ({ field: { ...s.field, companion: null, species: { cloud: entry(5, 20, 1) } } }));
    const r = useGameStore.getState().damageCompanion('cloud', 25, wound);
    expect(r).toEqual({ hp: 0, fainted: true, replacedBy: null });
    expect(useGameStore.getState().field.companion).toBeNull();
  });

  it('옛 저장(종 기록이 없음): 아무것도 안 바뀐다', () => {
    useGameStore.setState((s) => ({ field: { ...s.field, companion: null, species: {} } }));
    const before = useGameStore.getState().field;
    expect(useGameStore.getState().damageCompanion('cloud', 25, wound)).toEqual({ hp: 0, fainted: false, replacedBy: null });
    expect(useGameStore.getState().field).toBe(before);
  });

  it('finishWildBattle: 대신 다니게 된 종을 쓰러짐 알림에 담고, 경험치는 싸운 종이 받는다', () => {
    useGameStore.getState().damageCompanion('cloud', 25, wound);
    const r = useGameStore.getState().finishWildBattle(batch({ companion: 'cloud', end: 'fainted', correct: 2 }));
    expect(r.notices[0]).toEqual({ kind: 'fainted', species: 'cloud', replacedBy: 'pebble' });
    const f = useGameStore.getState().field;
    expect(f.species.cloud!.exp).toBe(14);
    expect(f.species.pebble!.exp).toBe(0);
    expect(f.companion).toBe('pebble');
  });

  it('finishWildBattle: 대신 다닐 종이 없으면 알림은 예전 그대로', () => {
    useGameStore.setState((s) => ({ field: { ...s.field, species: { cloud: entry(5, 20, 1) } } }));
    useGameStore.getState().damageCompanion('cloud', 25, wound);
    const r = useGameStore.getState().finishWildBattle(batch({ companion: 'cloud', end: 'fainted', correct: 0 }));
    expect(r.notices[0]).toEqual({ kind: 'fainted', species: 'cloud' });
  });

  it('finishWildBattle: 쓰러지지 않고 끝나면 동행이 달라도 replacedBy가 없다', () => {
    const r = useGameStore.getState().finishWildBattle(batch({ companion: 'jelly', end: 'escaped', correct: 0 }));
    expect(r.notices.some((n) => n.kind === 'fainted')).toBe(false);
  });

  it('회복해도 원래 동행으로 저절로 돌아가지 않는다', () => {
    useGameStore.getState().damageCompanion('cloud', 25, wound);
    useGameStore.getState().healSpecies('cloud');
    expect(useGameStore.getState().field.companion).toBe('pebble');
    expect(useGameStore.getState().field.species.cloud!.hp).toBe(100);
  });

  it('대신 다니는 동행은 저장 대상(partialize)과 백업 currentSave()에 들어간다', () => {
    useGameStore.getState().damageCompanion('cloud', 25, wound);
    const persisted = useGameStore.persist.getOptions().partialize!(useGameStore.getState()) as { field: { companion: unknown } };
    expect(persisted.field.companion).toBe('pebble');
    expect(currentSave().field.companion).toBe('pebble');
  });
});

describe('캡슐 개수 저장', () => {
  beforeEach(() => {
    useGameStore.getState().resetAll();
  });

  it('처음은 3·3·3·0', () => {
    expect(useGameStore.getState().field.capsules).toEqual({ meadow: 3, waterside: 3, desert: 3, legend: 0 });
  });

  it('spendCapsule: 0 아래로 안 감', () => {
    useGameStore.setState((s) => ({ field: { ...s.field, capsules: { ...s.field.capsules, desert: 1 } } }));
    expect(useGameStore.getState().spendCapsule('desert')).toBe(true);
    expect(useGameStore.getState().spendCapsule('desert')).toBe(false);
    expect(useGameStore.getState().field.capsules.desert).toBe(0);
  });

  it('spendCapsule: 한 번에 그 종류만 정확히 1개, 0이면 상태를 바꾸지 않는다', () => {
    useGameStore.getState().chooseStarter('cloud', NOW);
    expect(useGameStore.getState().spendCapsule('meadow')).toBe(true);
    expect(useGameStore.getState().field.capsules).toEqual({ meadow: 2, waterside: 3, desert: 3, legend: 0 });
    const before = useGameStore.getState().field;
    expect(useGameStore.getState().spendCapsule('legend')).toBe(false);
    expect(useGameStore.getState().field).toBe(before);
  });

  it('grantCapsules: 더한다, 음수·소수는 무시', () => {
    useGameStore.getState().grantCapsules('legend', 3);
    useGameStore.getState().grantCapsules('meadow', 3);
    expect(useGameStore.getState().field.capsules).toEqual({ meadow: 6, waterside: 3, desert: 3, legend: 3 });
    useGameStore.getState().grantCapsules('meadow', -5);
    useGameStore.getState().grantCapsules('meadow', 1.5);
    expect(useGameStore.getState().field.capsules.meadow).toBe(6);
  });

  it('쓴 캡슐은 저장 대상(partialize)과 백업 currentSave()에 들어간다', () => {
    useGameStore.getState().spendCapsule('waterside');
    const persisted = useGameStore.persist.getOptions().partialize!(useGameStore.getState()) as { field: { capsules: unknown } };
    expect(persisted.field.capsules).toEqual({ meadow: 3, waterside: 2, desert: 3, legend: 0 });
    expect(currentSave().field.capsules).toEqual({ meadow: 3, waterside: 2, desert: 3, legend: 0 });
  });
});
