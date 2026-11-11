// 초원 타일 그림 — 초원 지도와 같은 묶음으로, 이 필드를 불러올 때만 내려받는다
import type { FieldMap } from '../../../domain/field/movement';
import { SHARED_ARTS, exitArrow, onBorder, type PixelArt, recolor, type TileSet } from '../../art/pixelArt';

const G = { g: '#a5e07f', G: '#8fd06a', H: '#c2ef9c' };

const ground: PixelArt = {
  palette: G,
  rows: [
    'gggggggggggggggg',
    'gggggggggggggggg',
    'ggGgggggggggHggg',
    'gGgGgggggggggggg',
    'gggggggggggggggg',
    'gggggggggGgggggg',
    'ggggggggGgGggggg',
    'gggggggggggggggg',
    'ggggHggggggggggg',
    'gggggggggggggggg',
    'gggggggggggggGgg',
    'ggggggggggggGgGg',
    'gggggggggggggggg',
    'gggGgggggggHgggg',
    'ggGgGggggggggggg',
    'gggggggggggggggg',
  ],
};

const dirt: PixelArt = {
  palette: { d: '#e9c99a', D: '#d6ad78', E: '#f3dcb8' },
  rows: [
    'dddddddddddddddd',
    'dddddddddddDdddd',
    'ddDddddddddddddd',
    'dddddddEdddddddd',
    'dddddddddddddddd',
    'dddddddddddddDdd',
    'dDdddddddddddddd',
    'dddddEdddddddddd',
    'dddddddddddddddd',
    'ddddddddddDddddd',
    'dddddddddddddddd',
    'ddddDddddddddEdd',
    'dddddddddddddddd',
    'dEdddddddddddddd',
    'ddddddddDddddddd',
    'dddddddddddddddd',
  ],
};

const tallGrass: PixelArt = {
  palette: { ...G, t: '#5bb544', T: '#3a8a33' },
  rows: [
    'gggggggggggggggg',
    'ggtgggtgggtgggtg',
    'gtTtgtTtgtTtgtTt',
    'tTgTtTgTtTgTtTgT',
    'TtTTTtTTTtTTTtTT',
    'tgggtgggtgggtggg',
    'TtgtTtgtTtgtTtgt',
    'gTtTgTtTgTtTgTtT',
    'TTtTTTtTTTtTTTtT',
    'ggtgggtgggtgggtg',
    'gtTtgtTtgtTtgtTt',
    'tTgTtTgTtTgTtTgT',
    'TtTTTtTTTtTTTtTT',
    'tgggtgggtgggtggg',
    'TtgtTtgtTtgtTtgt',
    'gTtTgTtTgTtTgTtT',
  ],
};

const tree: PixelArt = {
  palette: { ...G, o: '#24572b', l: '#4caf50', L: '#358c3c', h: '#8fe07a', n: '#8d5a2b', N: '#6b4220' },
  rows: [
    'gggggooooooggggg',
    'gggoohhllllooggg',
    'ggohhllllllllogg',
    'gohllllllllllLog',
    'gollllllllllLLog',
    'olllhllllllLLLLo',
    'ollllllllllLLLLo',
    'oLlllllllLLLLLLo',
    'goLLllllLLLLLLog',
    'ggoLLLLLLLLLLogg',
    'gggooLLLLLLooggg',
    'ggggggonNogggggg',
    'ggggggonNogggggg',
    'gggggoonNooggggg',
    'ggggGGGGGGGGgggg',
    'gggggggggggggggg',
  ],
};

const flowers: PixelArt = {
  palette: { ...G, w: '#ffffff', r: '#ff6fa8', y: '#ffd23a', s: '#4f9e3a' },
  rows: [
    'gggggggggggggggg',
    'ggrggggggggggggg',
    'gryrgggggggwgggg',
    'ggrgggggggwywggg',
    'ggsggggggggwgggg',
    'gggggggggggsgggg',
    'gggggggggggggggg',
    'gggggggggggggggg',
    'gggggwgggggggggg',
    'ggggwywggggggrgg',
    'gggggwggggggryrg',
    'gggggsgggggggrgg',
    'ggggggggyggggsgg',
    'gggggggyrygggggg',
    'ggggggggyggggggg',
    'ggggggggsggggggg',
  ],
};

const ROOF_PAL = { ...G, o: '#3a2a2a', R: '#e5533d', Q: '#b83a2a', w: '#fff4dc', W: '#e8d6b0' };
const roofL: PixelArt = {
  palette: ROOF_PAL,
  rows: [
    'gggggggggggggggg',
    'ggggggggggoooooo',
    'gggggggoooRRRRRR',
    'ggggoooRRRRRRRRR',
    'gooRRRRRRRRRRRRR',
    'oQQQQQQQQQQQQQQQ',
    'oRRRRRRRRRRRRRRR',
    'oRRRRRRRRRRRRRRR',
    'oQQQQQQQQQQQQQQQ',
    'oRRRRRRRRRRRRRRR',
    'oRRRRRRRRRRRRRRR',
    'oQQQQQQQQQQQQQQQ',
    'oooooooooooooooo',
    'gowwwwwwwwwwwwww',
    'gowwwwwwwwwwwwww',
    'goWWWWWWWWWWWWWW',
  ],
};
const roofR: PixelArt = { palette: ROOF_PAL, rows: roofL.rows.map((r) => [...r].reverse().join('')) };
const BLUE = { R: '#4a7fd6', Q: '#345fb0' };

const WALL_PAL = { ...G, o: '#3a2a2a', w: '#fff4dc', W: '#e8d6b0', k: '#5a3a2a', b: '#9fd8ff', n: '#a8703e', N: '#7d5028', y: '#ffd23a' };
const wallL: PixelArt = {
  palette: WALL_PAL,
  rows: [
    'gowwwwwwwwwwwwww',
    'gowwwwwwwwwwwwww',
    'gowwkkkkkkwwwwww',
    'gowwkbbbbkwwwwww',
    'gowwkbwbbkwwwwww',
    'gowwkkkkkkwwwwww',
    'gowwkbbbbkwwwwww',
    'gowwkbbbbkwwwwww',
    'gowwkkkkkkwwwwww',
    'gowwwwwwwwwwwwww',
    'gowwwwwwwwwwwwww',
    'goWWWWWWWWWWWWWW',
    'gowwwwwwwwwwwwww',
    'gowwwwwwwwwwwwww',
    'goWWWWWWWWWWWWWW',
    'gooooooooooooooo',
  ],
};
const wallR: PixelArt = {
  palette: WALL_PAL,
  rows: [
    'wwwwwwwwwwwwwwog',
    'wwwwwwwwwwwwwwog',
    'wwwwwwwwwwwwwwog',
    'wwkkkkkkwwwwwwog',
    'wwknnnnkwwwwwwog',
    'wwknNNnkwwwwwwog',
    'wwknnnnkwwwwwwog',
    'wwknnnnkwwwwwwog',
    'wwknnnykwwwwwwog',
    'wwknnnnkwwwwwwog',
    'wwknNNnkwwwwwwog',
    'WWknnnnkWWWWWWog',
    'wwknnnnkwwwwwwog',
    'wwknnnnkwwwwwwog',
    'WWknnnnkWWWWWWog',
    'ooooooooooooooog',
  ],
};

const arts = {
  ground,
  dirt,
  tallGrass,
  tree,
  flowers,
  roofRedL: roofL,
  roofRedR: roofR,
  roofBlueL: recolor(roofL, BLUE),
  roofBlueR: recolor(roofR, BLUE),
  wallL,
  wallR,
};

const isInnerBlock = (map: FieldMap, x: number, y: number) =>
  x > 0 && y > 0 && x < map.width - 1 && y < map.height - 1 && map.tiles[y][x] === 'block';

/** 안쪽 2×2 막힌 덩어리면 집: 그 안에서 몇 번째 칸인지 */
function houseRole(map: FieldMap, x: number, y: number): { dx: 0 | 1; dy: 0 | 1; left: number; top: number } | null {
  for (const dy of [0, 1] as const)
    for (const dx of [0, 1] as const) {
      const lx = x - dx;
      const ty = y - dy;
      if (
        isInnerBlock(map, lx, ty) &&
        isInnerBlock(map, lx + 1, ty) &&
        isInnerBlock(map, lx, ty + 1) &&
        isInnerBlock(map, lx + 1, ty + 1)
      )
        return { dx, dy, left: lx, top: ty };
    }
  return null;
}

/** 흙길: 출구를 잇는 가로줄과 시작 칸을 지나는 세로줄 (가운데 십자) */
function onCross(map: FieldMap, x: number, y: number): boolean {
  return y === map.exits[0]?.pos.y || x === map.entrances.start?.x;
}

export const MEADOW_TILES: TileSet = {
  arts,
  pick(map, x, y) {
    const floor = onCross(map, x, y) ? dirt : ground;
    switch (map.tiles[y][x]) {
      case 'path':
      case 'door': // 필드에는 문이 없다
        return [floor];
      case 'grass':
        return [tallGrass];
      case 'deco':
        return [flowers];
      case 'sign':
        return [floor, SHARED_ARTS.sign];
      case 'exit':
        return [dirt, exitArrow(map, x, y)];
      case 'block': {
        if (onBorder(map, x, y)) return [tree];
        const h = houseRole(map, x, y);
        if (!h) return [tree];
        const blue = (h.left + Math.floor(h.top / 2)) % 2 === 1; // 집마다 빨강·파랑 지붕
        if (h.dy === 1) return [h.dx === 0 ? wallL : wallR];
        if (h.dx === 0) return [blue ? arts.roofBlueL : arts.roofRedL];
        return [blue ? arts.roofBlueR : arts.roofRedR];
      }
    }
  },
};
