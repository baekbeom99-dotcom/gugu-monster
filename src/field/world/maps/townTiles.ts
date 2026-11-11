// 태초마을 타일 그림 — 초원·물가·사막 그림을 빌려 와 한 마을로 어울리게 놓는다 (마을 지도 묶음에서만 내려받는다)
import type { FieldMap } from '../../../domain/field/movement';
import { SHARED_ARTS, exitArrow, onBorder, type PixelArt, recolor, type TileSet } from '../../art/pixelArt';
import { MEADOW_TILES } from './meadowTiles';
import { WATERSIDE_TILES } from './watersideTiles';
import { DESERT_TILES } from './desertTiles';

const M = MEADOW_TILES.arts;
const { sand: bankSand, waterA, waterB, bank } = WATERSIDE_TILES.arts;
const { sand: desertSand } = DESERT_TILES.arts;

/** 바탕 그림 위에 글자 몇 개를 덮어쓴 그림 */
function overlay(base: PixelArt, palette: Record<string, string>, paint: (x: number, y: number) => string | null): PixelArt {
  return {
    palette: { ...base.palette, ...palette },
    rows: base.rows.map((row, y) => [...row].map((ch, x) => paint(x, y) ?? ch).join('')),
  };
}

const WALL = { w: '#fff4dc', W: '#e8d6b0', o: '#3a2a2a', k: '#5a3a2a', b: '#9fd8ff', n: '#a8703e', N: '#7d5028', y: '#ffd23a' };
const blank: PixelArt = { palette: {}, rows: Array.from({ length: 16 }, () => 'w'.repeat(16)) };
// 상점 벽: 창문 하나 + 아랫단, 문: 나무 문
const shopWall = overlay(blank, WALL, (x, y) => {
  if (y === 15) return 'o';
  if (y === 14) return 'W';
  if (y >= 3 && y <= 8 && x >= 4 && x <= 11) return x === 4 || x === 11 || y === 3 || y === 8 || x === 7 || x === 8 ? 'k' : 'b';
  return null;
});
const shopDoor = overlay(blank, WALL, (x, y) => {
  if (y === 15) return 'o';
  if (x >= 4 && x <= 11 && y >= 1) {
    if (x === 4 || x === 11 || y === 1) return 'k';
    if (x === 9 && y === 9) return 'y';
    return y % 5 === 3 || x === 7 || x === 8 ? 'N' : 'n';
  }
  return null;
});
const GOLD = { R: '#f2b632', Q: '#c98a14' };
// 울타리: 풀 바탕에 말뚝과 가로대
const fence = overlay(M.ground, { n: '#c9985a', N: '#8d5a2b' }, (x, y) => {
  if ((x <= 1 || (x >= 7 && x <= 8) || x >= 14) && y >= 4 && y <= 13) return 'N';
  if ((y === 6 || y === 10) && y !== undefined) return 'n';
  return null;
});

const arts = { shopWall, shopDoor, fence, ...M, bankSand, waterA, waterB, bank, desertSand };

const isHash = (map: FieldMap, x: number, y: number) => map.raw[y]?.[x] === '#' && !onBorder(map, x, y);
const isWaterRaw = (map: FieldMap, x: number, y: number) => map.raw[y]?.[x] === '~';

const isBld = (map: FieldMap, x: number, y: number) => isHash(map, x, y) || map.raw[y]?.[x] === 'D';

/** 같은 줄에서 이어진 건물(`#`·문) 덩어리의 왼쪽 끝과 너비 */
function run(map: FieldMap, x: number, y: number): { left: number; width: number } {
  let left = x;
  while (isBld(map, left - 1, y)) left--;
  let right = x;
  while (isBld(map, right + 1, y)) right++;
  return { left, width: right - left + 1 };
}

function building(map: FieldMap, x: number, y: number): PixelArt[] {
  const { left, width } = run(map, x, y);
  const roofRow = isBld(map, x, y + 1);
  // 지붕 줄이면 바로 아랫줄, 벽 줄이면 이 줄에 문이 있는 건물이 상점
  const doorRow = roofRow ? y + 1 : y;
  let shop = false;
  for (let i = left; i < left + width; i++) if (map.raw[doorRow][i] === 'D') shop = true;
  if (roofRow) {
    const right = (x - left) % 2 === 1;
    if (shop) return [recolor(right ? M.roofRedR : M.roofRedL, GOLD)];
    return [left > 8 ? (right ? M.roofBlueR : M.roofBlueL) : right ? M.roofRedR : M.roofRedL];
  }
  if (shop) return [shopWall];
  return [x === left ? M.wallL : M.wallR];
}

export const TOWN_TILES: TileSet = {
  arts,
  pick(map, x, y, frame) {
    const ch = map.raw[y][x];
    switch (ch) {
      case '~':
        return [frame === 0 ? waterA : waterB];
      case 'p':
        return isWaterRaw(map, x, y - 1) ? [bankSand, bank] : [bankSand];
      case 'a':
        return [desertSand];
      case 'g':
        return [M.ground];
      case '*':
        return [M.flowers];
      case 'S':
        return [M.dirt, SHARED_ARTS.sign];
      case '<':
      case '>':
      case '^':
      case 'v':
        return [M.dirt, exitArrow(map, x, y)];
      case 'D':
        return [shopDoor];
      case '#': {
        if (onBorder(map, x, y)) return [M.tree];
        if (isBld(map, x, y - 1) || isBld(map, x, y + 1)) return building(map, x, y);
        // 위아래가 비었는데 옆으로 이어진 한 줄은 울타리, 홀로 선 것은 나무
        return isHash(map, x - 1, y) || isHash(map, x + 1, y) ? [fence] : [M.tree];
      }
      default:
        return [M.dirt]; // '.' '@'
    }
  },
};
