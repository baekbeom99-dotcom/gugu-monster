import { describe, expect, it } from 'vitest';
import { addCapsules, CAPSULE_NAMES, CAPSULE_TYPES, type Capsules, capsuleFor, takeCapsule } from '../../src/domain/field/capsules';
import { SPECIES_IDS, type SpeciesId } from '../../src/store/fieldData';

const SOME: Capsules = { meadow: 3, waterside: 0, desert: 1, legend: 0 };

describe('캡슐 4종', () => {
  it('종류와 이름', () => {
    expect(CAPSULE_TYPES).toEqual(['meadow', 'waterside', 'desert', 'legend']);
    expect(CAPSULE_NAMES).toEqual({ meadow: '초원 캡슐', waterside: '물가 캡슐', desert: '사막 캡슐', legend: '황금 캡슐' });
  });

  it('종 → 캡슐', () =>
    expect(['cloud', 'horn', 'ghost', 'legend-horn'].map((s) => capsuleFor(s as SpeciesId))).toEqual(['meadow', 'waterside', 'desert', 'legend']));

  it('모든 종이 네 캡슐 중 하나에 맞는다', () => {
    for (const id of SPECIES_IDS) expect(CAPSULE_TYPES).toContain(capsuleFor(id));
  });

  it('takeCapsule: 0이면 null, 아니면 1 줄임 (원본은 그대로)', () => {
    expect(takeCapsule(SOME, 'waterside')).toBeNull();
    expect(takeCapsule(SOME, 'legend')).toBeNull();
    expect(takeCapsule(SOME, 'meadow')).toEqual({ ...SOME, meadow: 2 });
    expect(takeCapsule(SOME, 'desert')).toEqual({ ...SOME, desert: 0 });
    expect(SOME.meadow).toBe(3);
  });

  it('addCapsules: 0 이상 정수만 더한다, 음수·소수·NaN·Infinity는 무시', () => {
    expect(addCapsules(SOME, 'waterside', 3)).toEqual({ ...SOME, waterside: 3 });
    expect(addCapsules(SOME, 'meadow', 0)).toEqual(SOME);
    for (const bad of [-1, 1.5, Number.NaN, Infinity]) expect(addCapsules(SOME, 'meadow', bad)).toBe(SOME);
  });
});
