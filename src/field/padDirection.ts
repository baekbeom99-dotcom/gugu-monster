import type { Dir } from '../domain/field/movement';

/** 한 걸음 걷는 시간(ms) */
export const STEP_MS = 180;
/** 이보다 짧게 누르면 걷지 않고 방향만 바꾼다(ms) */
export const TURN_TAP_MS = 120;
/** 타일 한 칸의 그림 크기(px) */
export const TILE_PX = 16;
/** 화면 가로에 최소로 보이는 칸 수 (배율 계산 기준) */
export const VIEW_TILES_W = 8;

/** 패드 가운데에서 누른 곳까지의 거리(dx, dy)로 방향을 고른다. 가운데 `deadZone` 안은 null */
export function padDirection(dx: number, dy: number, deadZone: number): Dir | null {
  if (Math.hypot(dx, dy) < deadZone) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
