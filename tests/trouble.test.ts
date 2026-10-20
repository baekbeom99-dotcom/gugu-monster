/** 똥·병·식중독 — 설계서 6-6 */
import { describe, expect, it } from 'vitest';
import {
  chooseEgg,
  cleanPoop,
  FOOD_POISON_CHANCE,
  giveShot,
  hatch,
  initialPet,
  MAX_POOPS,
  NEGLECT_HOURS,
  type PetData,
  rollFoodPoisoning,
  rollTrouble,
  TROUBLE_CHANCE,
  visit,
} from '../src/domain/pet';
import { createInitialSave, mergeSave } from '../src/store/saveData';

const NOW = new Date(2026, 9, 20, 10).getTime();
const HOUR = 3_600_000;
const pet = (over: Partial<PetData> = {}): PetData => ({ ...hatch(chooseEgg(initialPet(NOW), 'dog'), '멍멍', NOW), ...over });
/** 정해진 수를 차례로 돌려주는 주사위 */
const dice = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('똥·병 굴리기 (오래 방치 / 탐험 뒤)', () => {
  it('확률은 똥 10%, 병 10%, 식중독 5%', () => {
    expect(TROUBLE_CHANCE).toBe(0.1);
    expect(FOOD_POISON_CHANCE).toBe(0.05);
  });

  it('주사위가 0.1보다 작으면 똥을 싸고, 따로 굴려 병에도 걸린다', () => {
    expect(rollTrouble(pet(), NOW, 'exploration', dice(0.05, 0.5)).events).toEqual(['poop']);
    expect(rollTrouble(pet(), NOW, 'exploration', dice(0.5, 0.05)).events).toEqual(['sick']);
    const both = rollTrouble(pet(), NOW, 'exploration', dice(0.09, 0.09));
    expect(both.events).toEqual(['poop', 'sick']);
    expect(both.pet).toMatchObject({ poops: 1, sick: { since: NOW, cause: 'exploration' } });
    expect(rollTrouble(pet(), NOW, 'exploration', dice(0.1, 0.1)).events).toEqual([]);
  });

  it('똥은 3개까지만 쌓이고, 이미 아프면 다시 걸리지 않으며, 알은 아무 일도 없다', () => {
    expect(rollTrouble(pet({ poops: MAX_POOPS }), NOW, 'neglect', dice(0)).pet.poops).toBe(MAX_POOPS);
    const sick = pet({ sick: { since: 1, cause: 'food' } });
    expect(rollTrouble(sick, NOW, 'neglect', dice(0.5, 0)).pet.sick).toEqual({ since: 1, cause: 'food' });
    const egg = chooseEgg(initialPet(NOW), 'cat');
    expect(rollTrouble(egg, NOW, 'neglect', dice(0))).toEqual({ pet: egg, events: [] });
  });

  it(`앱을 ${NEGLECT_HOURS}시간 넘게 열지 않았을 때만 방치로 굴린다`, () => {
    const p = pet({ statsUpdatedAt: NOW });
    expect(visit(p, NOW - (NEGLECT_HOURS - 1) * HOUR, NOW, dice(0)).troubles).toEqual([]);
    const v = visit(p, NOW - NEGLECT_HOURS * HOUR, NOW, dice(0));
    expect(v.troubles).toEqual(['poop', 'sick']);
    expect(v.pet.sick?.cause).toBe('neglect');
  });
});

describe('식중독', () => {
  it('먹은 뒤 5% 확률로 배탈이 난다', () => {
    expect(rollFoodPoisoning(pet(), NOW, dice(0.049)).poisoned).toBe(true);
    expect(rollFoodPoisoning(pet(), NOW, dice(0.049)).pet.sick).toEqual({ since: NOW, cause: 'food' });
    expect(rollFoodPoisoning(pet(), NOW, dice(0.05)).poisoned).toBe(false);
  });
});

describe('치우기·주사', () => {
  it('똥을 치우면 모두 사라지고 깨끗함·기분·친밀도가 오른다', () => {
    const p = pet({ poops: 2, cleanliness: 50, mood: 50, affection: 10, statsUpdatedAt: NOW });
    const r = cleanPoop(p, NOW);
    expect(r.ok && r.pet).toMatchObject({ poops: 0, cleanliness: 60, mood: 55, affection: 11 });
    expect(cleanPoop(pet({ poops: 0 }), NOW)).toEqual({ ok: false, reason: 'nothing' });
  });

  it('주사를 맞으면 병이 낫고, 자고 있어도 맞힐 수 있다', () => {
    const p = pet({ sick: { since: NOW, cause: 'food' }, sleepingUntil: NOW + HOUR, affection: 5 });
    const r = giveShot(p, NOW);
    expect(r.ok && r.pet).toMatchObject({ sick: null, affection: 6 });
    expect(giveShot(pet(), NOW)).toEqual({ ok: false, reason: 'nothing' });
  });
});

describe('예전 저장 데이터', () => {
  it('똥·병 기록이 없던 저장도 그대로 불러오고 건강한 상태로 시작한다', () => {
    const merged = mergeSave(createInitialSave(NOW), {
      pet: { species: 'panda', stage: 'adult', name: '판판', affection: 150, equippedHat: 'hat_crown' },
      economy: { stars: 88 },
    });
    expect(merged.pet).toMatchObject({ species: 'panda', stage: 'adult', name: '판판', affection: 150, equippedHat: 'hat_crown', poops: 0, sick: null });
    expect(merged.economy.stars).toBe(88);
  });
});
