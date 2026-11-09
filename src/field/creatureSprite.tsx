/** 구구몬 그림 — 지금은 기존 몬스터 그림(MonsterSprite)을 그대로 쓴다. 레전드는 황금 */
import { DAN_COLORS } from '../art/colors';
import { MonsterSprite, type MonsterMood } from '../art/MonsterSprite';
import type { MonsterKind } from '../domain/battle';
import { speciesDef, type SpeciesId } from '../domain/field/creatures';

/** 내 구구몬(뒷모습)은 조금 작게 */
export const BACK_VIEW_SCALE = 0.8;
/** 진화 단계별 크기 */
export const STAGE_SCALE: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.15, 3: 1.3 };

interface Opts {
  view: 'front' | 'back' | 'mini';
  stage?: 1 | 2 | 3;
  mood?: MonsterMood;
  color: string;
  size: number;
}

export function creatureSprite(id: SpeciesId, { view, stage = 1, mood = 'idle', color, size }: Opts): JSX.Element {
  const def = speciesDef(id);
  const scale = STAGE_SCALE[stage] * (view === 'back' ? BACK_VIEW_SCALE : 1);
  const px = Math.round(size * scale);
  const sprite = <MonsterSprite kind={def.kind} color={color} golden={def.legend} mood={mood} size={px} />;
  if (view !== 'back') return sprite;
  return <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>{sprite}</span>;
}

/** 도감·동료 그림에 쓰는 종별 색 */
export const SPECIES_COLOR: Record<MonsterKind, string> = {
  cloud: DAN_COLORS[5],
  mushroom: DAN_COLORS[9],
  fluff: DAN_COLORS[4],
  jelly: DAN_COLORS[8],
  antenna: DAN_COLORS[6],
  horn: DAN_COLORS[3],
  pebble: DAN_COLORS[7],
  ghost: DAN_COLORS[2],
};

export function speciesColor(id: SpeciesId): string {
  return SPECIES_COLOR[speciesDef(id).kind];
}
