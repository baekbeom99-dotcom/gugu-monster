/** 캡슐 4종 — 설계서 4절. 종마다 맞는 캡슐이 있고, 던질 때마다 1개씩 준다 (0 아래로는 안 간다) */
import { speciesDef, type SpeciesId } from './creatures';
import type { FieldId } from './fields';

export type CapsuleType = FieldId | 'legend';
export const CAPSULE_TYPES: readonly CapsuleType[] = ['meadow', 'waterside', 'desert', 'legend'];
export const CAPSULE_NAMES: Record<CapsuleType, string> = {
  meadow: '초원 캡슐',
  waterside: '물가 캡슐',
  desert: '사막 캡슐',
  legend: '황금 캡슐',
};

export type Capsules = Record<CapsuleType, number>;

/** 0 이상 정수인가 (캡슐 개수·더할 수) */
export function isCapsuleCount(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

/** 이 종을 잡는 캡슐: 레전드는 황금, 그 밖은 사는 필드 (단계와 상관없다) */
export function capsuleFor(id: SpeciesId): CapsuleType {
  return speciesDef(id).field;
}

/** n개 더하기. n이 0 이상 정수가 아니면 그대로 */
export function addCapsules(c: Capsules, t: CapsuleType, n: number): Capsules {
  if (!isCapsuleCount(n) || n === 0) return c;
  return { ...c, [t]: c[t] + n };
}

/** 1개 꺼내기. 없으면 null */
export function takeCapsule(c: Capsules, t: CapsuleType): Capsules | null {
  if (!(c[t] > 0)) return null;
  return { ...c, [t]: c[t] - 1 };
}
