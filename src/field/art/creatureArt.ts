/**
 * 구구몬 그림 등록표 — 그림을 바꿀 때는 여기만 고친다.
 * 전투(앞·뒷모습)·도감·첫 구구몬 고르기·필드 동행이 모두 이 표를 거쳐 그림을 고른다.
 * 지금은 모두 퀴즈 모험 몬스터 SVG(MonsterSprite)를 빌려 쓴다 (퀴즈 모험 그림은 그대로 둔다).
 *
 * 이미지 그림으로 바꾸기:
 *   1. 그림 파일을 src/field/art/creatures/ 에 넣는다 (예: cloud-front.png, cloud-back.png — 투명 바탕, 정사각형)
 *   2. 이 파일 위에서 import 하고 IMAGE_ART에 한 줄:  cloud: { front: cloudFront, back: cloudBack }
 *      뒷모습이 없으면 앞모습을 좌우로 뒤집어 쓴다. 그림 둘레 여백이 크면 fill(키우기)·foot(발끝 높이)로 맞춘다
 *   3. 개발 서버의 #/dev/field 화면에서 앞·뒤·동행 크기를 한눈에 확인
 * 진화 단계 크기(STAGE_SCALE)와 뒷모습 크기(BACK_VIEW_SCALE)는 creatureSprite.tsx에 있다.
 */
import type { MonsterKind } from '../../domain/battle';
import { speciesDef, type SpeciesId } from '../../domain/field/creatures';

/** MonsterSprite는 둘레에 여백이 있다: 몸이 한 칸쯤 차게 이만큼 키워 그린다 (viewBox 224 중 몸통이 약 155) */
export const MONSTER_FILL = 1.45;
/** MonsterSprite에서 발끝이 그림 높이의 어디쯤인지 (viewBox -24~200 중 발끝 ≈ 195) */
export const MONSTER_FOOT = 0.98;

export interface ImageArtEntry {
  /** 앞모습 그림 주소 (import 한 파일) */
  front: string;
  /** 뒷모습 (내 구구몬이 싸울 때). 없으면 앞모습을 뒤집는다 */
  back?: string;
  /** 필드 동행으로 그릴 때 한 칸 대비 크기 (기본 1) */
  fill?: number;
  /** 발끝이 그림 높이의 어디쯤인지 0~1 (기본 1 = 맨 아래) */
  foot?: number;
}

export type CreatureArt =
  | { type: 'monster'; kind: MonsterKind; golden: boolean; fill: number; foot: number }
  | { type: 'image'; front: string; back?: string; fill: number; foot: number };

/** 이미지로 바꾼 종. 여기 없는 종은 몬스터 SVG */
const IMAGE_ART: Partial<Record<SpeciesId, ImageArtEntry>> = {
  // cloud: { front: cloudFront, back: cloudBack },
};

export function creatureArt(id: SpeciesId, images: Partial<Record<SpeciesId, ImageArtEntry>> = IMAGE_ART): CreatureArt {
  const img = images[id];
  if (img) return { type: 'image', front: img.front, back: img.back, fill: img.fill ?? 1, foot: img.foot ?? 1 };
  const def = speciesDef(id);
  return { type: 'monster', kind: def.kind, golden: def.legend, fill: MONSTER_FILL, foot: MONSTER_FOOT };
}

/** 이미지 그림에서 보는 쪽에 맞는 파일과 뒤집기 여부 */
export function imageView(art: Extract<CreatureArt, { type: 'image' }>, view: 'front' | 'back' | 'mini'): { src: string; flip: boolean } {
  if (view !== 'back') return { src: art.front, flip: false };
  return art.back ? { src: art.back, flip: false } : { src: art.front, flip: true };
}
