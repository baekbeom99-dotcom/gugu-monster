/** 마을에서 돌아다니는 구구몬의 그림·말풍선 자리 계산 (규칙은 domain/field/roam.ts) */
import { ROAM_JUMP_MS, ROAM_MOVE_MS } from '../../domain/field/tuning';
import type { Pos } from '../../domain/field/movement';
import type { Roamer } from '../../domain/field/roam';
import { companionImage } from '../art/companionImage';
import { creatureArt } from '../art/creatureArt';
import { STAGE_SCALE } from '../art/creatureSprite';

export interface RoamerSprite {
  roamer: Roamer;
  img: HTMLImageElement | null;
  scale: number;
  fill: number;
  foot: number;
}

type RectFn = (left: number, top: number, tile: number, c: { scale: number; fill: number; foot: number }) => { x: number; y: number; size: number };

/** 구구몬 목록 → 그릴 거리. rAF 안에서만 부른다 (그림 굽기 때문) */
export function buildSprites(roamers: Roamer[], stageOf: (r: Roamer) => 1 | 2 | 3): RoamerSprite[] {
  return roamers.map((roamer) => {
    const art = creatureArt(roamer.species);
    const sleeping = roamer.motion === 'sleep';
    return {
      roamer,
      img: companionImage(roamer.species, 96, sleeping ? 'sleep' : 'idle'),
      scale: STAGE_SCALE[stageOf(roamer)],
      fill: art.fill,
      foot: art.foot,
    };
  });
}

export interface Pose {
  /** 칸 좌표(소수) */
  x: number;
  y: number;
  /** 위로 뜬 높이(칸 단위) */
  lift: number;
  /** 세로 크기 배율(숨쉬기) */
  breathe: number;
}

/** 모션에 따른 지금 모습: idle은 숨쉬기, move는 보간+통통, jump는 포물선 */
export function roamerPose(r: Roamer, now: number): Pose {
  let x = r.x;
  let y = r.y;
  let lift = 0;
  let breathe = 1;
  if (r.motion === 'move') {
    const t = Math.min(1, Math.max(0, (now - r.since) / ROAM_MOVE_MS));
    x = r.fromX + (r.x - r.fromX) * t;
    y = r.fromY + (r.y - r.fromY) * t;
    lift = Math.abs(Math.sin(t * Math.PI * 2)) * 0.12;
  } else if (r.motion === 'jump') {
    const t = Math.min(1, Math.max(0, (now - r.since) / ROAM_JUMP_MS));
    lift = 4 * t * (1 - t) * 0.8;
  } else if (r.motion === 'idle') {
    breathe = 1 + Math.sin(now / 280) * 0.035;
  }
  return { x, y, lift, breathe };
}

/** 지도 위 구구몬들을 그린다. cx·cy는 카메라 왼쪽 위(화면 픽셀), tile은 한 칸의 화면 픽셀 */
export function drawRoamers(ctx: CanvasRenderingContext2D, sprites: RoamerSprite[], tile: number, cx: number, cy: number, now: number, rectOf: RectFn) {
  for (const sp of sprites) {
    const pose = roamerPose(sp.roamer, now);
    const left = Math.round(pose.x * tile) - cx;
    const top = Math.round((pose.y - pose.lift) * tile) - cy;
    const r = rectOf(left, top, tile, sp);
    const h = Math.round(r.size * pose.breathe);
    const y = r.y + r.size - h; // 발끝은 그대로, 위로만 늘고 줄어든다
    const img = sp.img;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, r.x, y, r.size, h);
    } else {
      ctx.fillStyle = '#ffb74d';
      ctx.beginPath();
      ctx.arc(left + tile / 2, top + tile / 2, tile * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }
    if (sp.roamer.motion === 'sleep') {
      const float = ((now / 900) % 1) * tile * 0.25;
      ctx.font = `900 ${Math.round(tile * 0.34)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = Math.max(2, tile * 0.07);
      ctx.strokeStyle = '#000';
      ctx.fillStyle = '#fff';
      const zx = left + tile * 0.8;
      const zy = top + tile * 0.15 - float;
      ctx.strokeText('Zz', zx, zy);
      ctx.fillText('Zz', zx, zy);
    }
  }
}

/** 말풍선을 세울 자리(CSS 픽셀): 구구몬 머리 위 가운데. cssPerPx = 화면 픽셀 하나의 CSS 크기 */
export function bubblePosition(r: Roamer, now: number, tile: number, cx: number, cy: number, cssPerPx: number): { left: number; top: number } {
  const pose = roamerPose(r, now);
  return {
    left: ((pose.x + 0.5) * tile - cx) * cssPerPx,
    top: ((pose.y - pose.lift - 0.15) * tile - cy) * cssPerPx,
  };
}

/** 이 칸을 차지한 구구몬(걷는 중이면 떠난 칸도) */
export function roamerAt(roamers: Roamer[], p: Pos): Roamer | undefined {
  return roamers.find((r) => (r.x === p.x && r.y === p.y) || (r.motion === 'move' && r.fromX === p.x && r.fromY === p.y));
}

/** 화면 좌표를 칸 좌표로 */
export function tileAtScreen(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }, canvasW: number, tile: number, cx: number, cy: number): Pos {
  const k = canvasW / rect.width;
  return { x: Math.floor(((clientX - rect.left) * k + cx) / tile), y: Math.floor(((clientY - rect.top) * k + cy) / tile) };
}
