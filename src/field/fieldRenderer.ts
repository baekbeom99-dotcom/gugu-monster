import type { FieldId } from '../domain/field/fields';
import type { Dir, FieldMap, Tile } from '../domain/field/movement';
import { TILE_PX, VIEW_TILES_W } from './padDirection';
import { COMPANION_FILL, HERO_SPRITES, type TileSet, bakeTiles, heroFrame } from './pixelArt';

/** 물결 그림이 바뀌는 시간 (ms) */
export const WATER_FRAME_MS = 500;
/**
 * MonsterSprite 그림에서 몸 아래쪽이 이미지 높이의 어디쯤인지 (viewBox -24~200 중 발끝 ≈ 195).
 * 동행의 발이 칸 바닥에 닿게 맞춘다.
 */
export const COMPANION_FOOT = 0.98;

// 타일 그림을 아직 못 불러왔을 때 쓰는 색 칸
const TILE_COLOR: Record<Tile, string> = {
  path: '#d9b382',
  grass: '#4caf50',
  block: '#1f5e2e',
  deco: '#2e7d32',
  sign: '#8d5a2b',
  exit: '#f5e663',
};

const tileSets = new Map<FieldId, TileSet>();

/** 필드 묶음을 불러올 때 그 필드의 타일 그림을 알려 준다 */
export function registerTileSet(id: FieldId, set: TileSet): void {
  tileSets.set(id, set);
}

export interface View {
  /** 그림 한 칸의 화면 픽셀 (정수 배율 × TILE_PX × 화면 배율) */
  tile: number;
  w: number;
  h: number;
}

export interface Companion {
  /** 칸 좌표 (소수 가능) */
  x: number;
  y: number;
  img: HTMLImageElement | null;
  /** 진화 단계 크기 (1·1.15·1.3) */
  scale: number;
}

export interface Anim {
  now: number;
  /** 걷는 중이면 한 걸음 진행(0~1), 서 있으면 null */
  step: number | null;
}

/**
 * 정수 배율: 가로로 VIEW_TILES_W칸쯤 보이게 하되,
 * 지도가 화면보다 작아 검은 띠가 생기지 않게 지도가 화면을 다 덮는 배율 이상으로 키운다.
 */
export function viewScale(cssWidth: number, cssHeight = 0, mapTilesW = 0, mapTilesH = 0): number {
  const byWidth = Math.floor(cssWidth / (VIEW_TILES_W * TILE_PX));
  const coverW = mapTilesW > 0 ? Math.ceil(cssWidth / (mapTilesW * TILE_PX)) : 1;
  const coverH = mapTilesH > 0 ? Math.ceil(cssHeight / (mapTilesH * TILE_PX)) : 1;
  return Math.max(1, byWidth, coverW, coverH);
}

function cam(center: number, viewPx: number, mapPx: number): number {
  if (mapPx <= viewPx) return -(viewPx - mapPx) / 2;
  return Math.min(Math.max(center - viewPx / 2, 0), mapPx - viewPx);
}

/** 동행 그림의 그릴 자리 (칸 가운데 아래에 발을 맞추고, 여백만큼 키운다) */
export function companionRect(left: number, top: number, tile: number, scale: number) {
  const size = Math.round(tile * COMPANION_FILL * scale);
  return { x: Math.round(left + tile / 2 - size / 2), y: Math.round(top + tile - size * COMPANION_FOOT), size };
}

/** hx, hy: 주인공의 칸 좌표(소수 가능, 걷는 중 보간) */
export function drawField(
  ctx: CanvasRenderingContext2D,
  map: FieldMap,
  view: View,
  hx: number,
  hy: number,
  facing: Dir,
  companion?: Companion,
  anim: Anim = { now: 0, step: null },
) {
  const { tile, w, h } = view;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cx = Math.round(cam((hx + 0.5) * tile, w, map.width * tile));
  const cy = Math.round(cam((hy + 0.5) * tile, h, map.height * tile));
  const x0 = Math.max(0, Math.floor(cx / tile));
  const y0 = Math.max(0, Math.floor(cy / tile));
  const x1 = Math.min(map.width - 1, Math.floor((cx + w) / tile));
  const y1 = Math.min(map.height - 1, Math.floor((cy + h) / tile));
  const set = tileSets.get(map.id);
  const frame = (Math.floor(anim.now / WATER_FRAME_MS) % 2) as 0 | 1;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const sx = x * tile - cx;
      const sy = y * tile - cy;
      if (set) {
        for (const art of set.pick(map, x, y, frame)) ctx.drawImage(bakeTiles(art), sx, sy, tile, tile);
      } else {
        ctx.fillStyle = TILE_COLOR[map.tiles[y][x]];
        ctx.fillRect(sx, sy, tile, tile);
      }
    }
  }
  // 동행: 주인공 뒤 칸 (구운 그림, 아직 못 읽었으면 색 동그라미). 주인공보다 먼저 그려 주인공을 가리지 않는다
  if (companion) {
    const left = Math.round(companion.x * tile) - cx;
    const top = Math.round(companion.y * tile) - cy;
    const img = companion.img;
    if (img && img.complete && img.naturalWidth > 0) {
      const r = companionRect(left, top, tile, companion.scale);
      ctx.drawImage(img, r.x, r.y, r.size, r.size);
    } else {
      ctx.fillStyle = '#42a5f5';
      ctx.beginPath();
      ctx.arc(left + tile / 2, top + tile / 2, tile * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 주인공: 바라보는 쪽 그림, 걷는 중이면 발을 번갈아
  const px = Math.round(hx * tile) - cx;
  const py = Math.round(hy * tile) - cy;
  ctx.drawImage(bakeTiles(HERO_SPRITES[facing][heroFrame(anim.step)]), px, py, tile, tile);
}
