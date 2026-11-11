/** 구구몬 그림 — 어떤 그림을 쓸지는 creatureArt.ts 등록표가 정한다 (지금은 몬스터 SVG, 레전드는 황금) */
import { DAN_COLORS } from '../../art/colors';
import { MonsterSprite, type MonsterMood } from '../../art/MonsterSprite';
import type { MonsterKind } from '../../domain/battle';
import { speciesDef, type SpeciesId } from '../../domain/field/creatures';
import { creatureArt, imageView } from './creatureArt';

/** 내 구구몬(뒷모습)은 조금 작게 */
export const BACK_VIEW_SCALE = 0.8;
/** 진화 단계별 크기 */
export const STAGE_SCALE: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.15, 3: 1.3 };

interface Opts {
  view: 'front' | 'back' | 'mini';
  stage?: 1 | 2 | 3;
  /** 몬스터 SVG의 표정 (이미지 그림은 표정이 없고, 맞기·잡기 움직임은 CSS가 준다) */
  mood?: MonsterMood;
  /** 몬스터 SVG의 색 (이미지 그림은 쓰지 않음) */
  color: string;
  size: number;
}

const flipped = (el: JSX.Element) => <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>{el}</span>;

export function creatureSprite(id: SpeciesId, { view, stage = 1, mood = 'idle', color, size }: Opts): JSX.Element {
  const art = creatureArt(id);
  const scale = STAGE_SCALE[stage] * (view === 'back' ? BACK_VIEW_SCALE : 1);
  const px = Math.round(size * scale);
  if (art.type === 'image') {
    const { src, flip } = imageView(art, view);
    const img = <img src={src} width={px} height={px} alt="" draggable={false} style={{ imageRendering: 'pixelated', display: 'block' }} />;
    return flip ? flipped(img) : img;
  }
  const sprite = <MonsterSprite kind={art.kind} color={color} golden={art.golden} mood={mood} size={px} />;
  return view === 'back' ? flipped(sprite) : sprite;
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
