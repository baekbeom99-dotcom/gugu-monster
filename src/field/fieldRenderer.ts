import type { Dir, FieldMap, Tile } from '../domain/field/movement';
import { TILE_PX, VIEW_TILES_W } from './padDirection';

// 임시 색 칸 (진짜 픽셀 그림은 나중에)
const TILE_COLOR: Record<Tile, string> = {
  path: '#d9b382',
  grass: '#4caf50',
  block: '#1f5e2e',
  deco: '#2e7d32',
  sign: '#8d5a2b',
  exit: '#f5e663',
};

export interface View {
  /** 그림 한 칸의 화면 픽셀 (정수 배율 × TILE_PX × 화면 배율) */
  tile: number;
  w: number;
  h: number;
}

/** 캔버스 폭에서 정수 배율을 구한다 */
export function viewScale(cssWidth: number): number {
  return Math.max(1, Math.floor(cssWidth / (VIEW_TILES_W * TILE_PX)));
}

function cam(center: number, viewPx: number, mapPx: number): number {
  if (mapPx <= viewPx) return -(viewPx - mapPx) / 2;
  return Math.min(Math.max(center - viewPx / 2, 0), mapPx - viewPx);
}

/** hx, hy: 주인공의 칸 좌표(소수 가능, 걷는 중 보간) */
export function drawField(
  ctx: CanvasRenderingContext2D,
  map: FieldMap,
  view: View,
  hx: number,
  hy: number,
  facing: Dir,
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
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      ctx.fillStyle = TILE_COLOR[map.tiles[y][x]];
      ctx.fillRect(x * tile - cx, y * tile - cy, tile, tile);
    }
  }
  // 주인공: 빨간 칸 + 바라보는 쪽 하얀 점
  const px = Math.round(hx * tile) - cx;
  const py = Math.round(hy * tile) - cy;
  const m = Math.round(tile * 0.1);
  ctx.fillStyle = '#e53935';
  ctx.fillRect(px + m, py + m, tile - 2 * m, tile - 2 * m);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(1, Math.round(tile / 16));
  ctx.strokeRect(px + m, py + m, tile - 2 * m, tile - 2 * m);
  const dot = Math.round(tile * 0.18);
  const off: Record<Dir, [number, number]> = {
    up: [0.5, 0.22],
    down: [0.5, 0.78],
    left: [0.22, 0.5],
    right: [0.78, 0.5],
  };
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + off[facing][0] * tile - dot / 2, py + off[facing][1] * tile - dot / 2, dot, dot);
}
