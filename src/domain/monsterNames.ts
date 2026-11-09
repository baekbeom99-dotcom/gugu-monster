import type { MonsterKind } from './battle';

/** 몬스터 종 이름 (React 없는 곳에서도 쓴다) */
export const MONSTER_NAMES: Record<MonsterKind, string> = {
  horn: '뿔뿔몬',
  jelly: '젤리몬',
  antenna: '안테나몬',
  mushroom: '방울무몬',
  cloud: '새싹몬',
  fluff: '왕관몬',
  pebble: '삼눈블록몬',
  ghost: '외뿔공룡몬',
};
