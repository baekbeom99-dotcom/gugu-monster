/** 배고픔·더러움·기분 연결 — 설계서 6-6 (v1.18) */
import { describe, expect, it } from 'vitest';
import { defaultCatalog } from '../src/data/defaultCatalog';
import {
  ANGRY_MOOD,
  applyDecay,
  chooseEgg,
  doCare,
  giveShot,
  hatch,
  initialPet,
  isAngry,
  isHungry,
  moodDecayPerHour,
  type PetData,
  rollFoodPoisoning,
  rollTrouble,
} from '../src/domain/pet';
import { initialEconomy } from '../src/domain/progress';
import { applyItem, findItem } from '../src/domain/shop';

const NOW = new Date(2026, 9, 20, 10).getTime();
const HOUR = 3_600_000;
const pet = (over: Partial<PetData> = {}): PetData => ({ ...hatch(chooseEgg(initialPet(NOW), 'fox'), '여리', NOW), statsUpdatedAt: NOW, ...over });

describe('기분이 함께 내려간다', () => {
  it('똥을 싸면 기분 −10, 아프면 −15 (식중독도)', () => {
    expect(rollTrouble(pet({ mood: 80 }), NOW, 'exploration', () => 0).pet.mood).toBe(80 - 10 - 15);
    expect(rollFoodPoisoning(pet({ mood: 80 }), NOW, () => 0).pet.mood).toBe(65);
  });

  it('배부름·깨끗함이 낮거나 똥·병이 있으면 기분이 시간당 더 빨리 준다', () => {
    expect(moodDecayPerHour(pet({ fullness: 80, cleanliness: 80 }))).toBe(2);
    expect(moodDecayPerHour(pet({ fullness: 40, cleanliness: 80 }))).toBe(3);
    expect(moodDecayPerHour(pet({ fullness: 10, cleanliness: 40 }))).toBe(5);
    expect(moodDecayPerHour(pet({ fullness: 80, cleanliness: 80, poops: 1, sick: { since: NOW, cause: 'food' } }))).toBe(6);
    const later = applyDecay(pet({ fullness: 40, cleanliness: 40, mood: 80 }), NOW + 2 * HOUR);
    expect(later.mood).toBe(80 - 4 * 2);
  });

  it(`기분이 ${ANGRY_MOOD} 이하이거나 똥이 있으면 화난 상태`, () => {
    expect(isAngry(pet({ mood: 31 }))).toBe(false);
    expect(isAngry(pet({ mood: 30 }))).toBe(true);
    expect(isAngry(pet({ mood: 90, poops: 1 }))).toBe(true);
  });
});

describe('깨끗함 15 이하 → 병', () => {
  it('시간이 지나 깨끗함이 15 이하로 떨어지면 병에 걸린다', () => {
    // 깨끗함 시간당 1.5 → 4시간 뒤 20 − 6 = 14
    const p = applyDecay(pet({ cleanliness: 20, mood: 80 }), NOW + 4 * HOUR);
    expect(p.cleanliness).toBe(14);
    expect(p.sick).toEqual({ since: NOW + 4 * HOUR, cause: 'dirty' });
  });

  it('주사를 맞으면 낫고, 다시 씻기 전에는 또 걸리지 않는다', () => {
    const sick = applyDecay(pet({ cleanliness: 16 }), NOW + HOUR);
    expect(sick.sick?.cause).toBe('dirty');
    const cured = giveShot(sick, NOW + HOUR);
    if (!cured.ok) throw new Error(cured.reason);
    expect(cured.pet.sick).toBeNull();
    expect(applyDecay(cured.pet, NOW + 3 * HOUR).sick).toBeNull();
  });

  it('지난번 저장 뒤 시간이 흘러 생긴 병도 바로 주사로 고칠 수 있다', () => {
    const stored = pet({ cleanliness: 16 });
    const r = giveShot(stored, NOW + 2 * HOUR);
    expect(r.ok).toBe(true);
  });
});

describe('배부름 15 이하 → 밥만', () => {
  it('놀기·씻기·잠·장난감·위생용품은 안 되고, 밥과 먹이는 된다', () => {
    const hungry = pet({ fullness: 15 });
    expect(isHungry(hungry)).toBe(true);
    for (const action of ['pet', 'walk', 'wash', 'sleep'] as const) expect(doCare(hungry, action, NOW)).toEqual({ ok: false, reason: 'hungry' });
    expect(doCare(hungry, 'feed', NOW).ok).toBe(true);
    const catalog = defaultCatalog();
    const economy = { ...initialEconomy(), inventory: { food_apple: 1, hyg_soap: 1 }, owned: ['toy_ball'] };
    expect(applyItem(hungry, economy, findItem(catalog, 'food_apple')!, NOW).ok).toBe(true);
    expect(applyItem(hungry, economy, findItem(catalog, 'hyg_soap')!, NOW)).toEqual({ ok: false, reason: 'hungry' });
    expect(applyItem(hungry, economy, findItem(catalog, 'toy_ball')!, NOW)).toEqual({ ok: false, reason: 'hungry' });
  });

  it('배고파도 주사는 맞힐 수 있다', () => {
    expect(giveShot(pet({ fullness: 5, sick: { since: NOW, cause: 'food' } }), NOW).ok).toBe(true);
  });
});
