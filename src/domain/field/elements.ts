/**
 * 구구몬 속성 — 종마다 속성이 하나 있고, 속성마다 기술 효과(약함 → 강함) 3개가 정해져 있다.
 * 순수 데이터만 (React·화면 없음). 효과 그림은 src/field/fx/effects.ts에 있다.
 */
import type { MonsterKind } from '../battle';
import { speciesDef, type SpeciesId } from './creatures';
import type { FxName } from '../../field/fx/effects';

export type Element = 'grass' | 'poison' | 'light' | 'water' | 'thunder' | 'earth' | 'fire';

export const ELEMENT_NAMES: Record<Element, string> = {
  grass: '풀',
  poison: '독',
  light: '빛',
  water: '물',
  thunder: '번개',
  earth: '땅',
  fire: '불',
};

const ELEMENT_OF_KIND: Record<MonsterKind, Element> = {
  cloud: 'grass',
  mushroom: 'poison',
  fluff: 'light',
  jelly: 'water',
  horn: 'water',
  antenna: 'thunder',
  pebble: 'earth',
  ghost: 'fire',
};

/** 종의 속성 (황금 레전드는 기본 종과 같다) */
export function elementOf(id: SpeciesId): Element {
  return ELEMENT_OF_KIND[speciesDef(id).kind];
}

/** 속성별 기술 효과 — 기술 1·2·3번 순서(약함 → 강함) */
export const ELEMENT_FX: Record<Element, readonly [FxName, FxName, FxName]> = {
  grass: ['vine-whip', 'thorns', 'leaf-storm'],
  poison: ['acid-splash', 'spore-burst', 'poison-cloud'],
  light: ['feather-burst', 'smite', 'sunburst'],
  water: ['splash', 'water-jet', 'wave-crash'],
  thunder: ['zap-hit', 'chain-lightning', 'lightning-strike'],
  earth: ['earth-spike', 'boulder', 'quake'],
  fire: ['fireball', 'fire-breath', 'flame-pillar'],
};
