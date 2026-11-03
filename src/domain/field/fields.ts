import type { MonsterKind } from '../battle';
import type { Dan } from '../facts';

export type FieldId = 'meadow' | 'waterside' | 'desert';

export const CHALLENGE_DAN: Dan = 12;

export const FIELDS: Record<FieldId, { name: string; dans: Dan[]; species: MonsterKind[] }> = {
  meadow: { name: '초원', dans: [2, 4, 8], species: ['cloud', 'mushroom', 'fluff'] },
  waterside: { name: '물가', dans: [3, 6, 9], species: ['jelly', 'antenna', 'horn'] },
  desert: { name: '사막', dans: [5, 7, 12], species: ['pebble', 'ghost'] },
};

/** 도전 단(12단)이 닫혀 있으면 12를 뺀 단 목록 */
export function fieldDans(field: FieldId, challengeUnlocked: boolean): Dan[] {
  const dans = FIELDS[field].dans;
  return challengeUnlocked ? [...dans] : dans.filter((d) => d !== CHALLENGE_DAN);
}
