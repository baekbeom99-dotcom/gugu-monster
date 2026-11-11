import type { MonsterKind } from '../battle';
import type { Dan } from '../facts';

export type FieldId = 'meadow' | 'waterside' | 'desert';
/** 지도 이름: 세 필드와 태초마을 */
export type MapId = FieldId | 'town';
export const MAP_IDS: readonly MapId[] = ['town', 'meadow', 'waterside', 'desert'];
export const TOWN_NAME = '태초마을';

export const CHALLENGE_DAN: Dan = 12;
/** 레전드 단 */
export const LEGEND_DAN: Dan = 13;

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
