/**
 * 필드 픽셀 그림 — 16×16 글자 배열(팔레트 글자 → 색). 우리 팔레트로 새로 그린 것이다 (원작 타일을 옮겨 그리지 않음).
 * 여기에는 그림 틀(형식·굽기·뒤집기)과 어느 필드에서나 쓰는 덧그림(표지판·출구 화살표)만 둔다.
 * 주인공은 hero.ts, 구구몬 그림은 creatureArt.ts.
 * 필드마다 다른 타일은 그 필드 지도 파일(world/maps/*Tiles.ts)에 함께 있어서 그 필드를 불러올 때만 내려받는다.
 */
import type { Dir, FieldMap } from '../../domain/field/movement';

/** 그림 한 장의 칸 수 (가로·세로) */
export const ART_SIZE = 16;
/** 투명 칸 */
export const TRANSPARENT = '.';

export interface PixelArt {
  palette: Record<string, string>;
  rows: string[];
}

/** 필드 하나의 타일 묶음: 칸마다 아래부터 차례로 그릴 그림들 */
export interface TileSet {
  arts: Record<string, PixelArt>;
  /** frame: 물결처럼 두 장으로 움직이는 타일의 몇 번째 장인지 (0·1) */
  pick(map: FieldMap, x: number, y: number, frame: 0 | 1): PixelArt[];
}

/** 좌우를 뒤집은 그림 */
export function mirror(art: PixelArt): PixelArt {
  return { palette: art.palette, rows: art.rows.map((r) => [...r].reverse().join('')) };
}

/** 같은 그림에 다른 팔레트 (지붕 색 바꾸기 등) */
export function recolor(art: PixelArt, over: Record<string, string>): PixelArt {
  return { palette: { ...art.palette, ...over }, rows: art.rows };
}

const baked = new WeakMap<PixelArt, HTMLCanvasElement>();

/** 그림을 제 크기(타일 16×16, 주인공 32×32) 오프스크린 캔버스에 처음 한 번만 굽는다 (그 뒤로는 drawImage로 키워 그림) */
export function bakeTiles(art: PixelArt): HTMLCanvasElement {
  const hit = baked.get(art);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = art.rows[0]?.length || ART_SIZE;
  c.height = art.rows.length || ART_SIZE;
  const ctx = c.getContext('2d');
  if (ctx) {
    art.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === TRANSPARENT) continue;
        ctx.fillStyle = art.palette[ch];
        ctx.fillRect(x, y, 1, 1);
      }
    });
  }
  baked.set(art, c);
  return c;
}

// ── 공용 덧그림 (투명 바탕): 표지판, 출구 화살표 ──

const SIGN: PixelArt = {
  palette: { o: '#3a2614', n: '#b07a44', N: '#8a5a2e', l: '#e8c28a' },
  rows: [
    '................',
    '................',
    '.oooooooooooooo.',
    '.onnnnnnnnnnnno.',
    '.onllllllllllno.',
    '.onnnnnnnnnnnno.',
    '.onllllllnnnnno.',
    '.onnnnnnnnnnnno.',
    '.oNNNNNNNNNNNNo.',
    '.oooooooooooooo.',
    '......oNNo......',
    '......oNNo......',
    '......oNNo......',
    '.....ooNNoo.....',
    '................',
    '................',
  ],
};

const ARROW_RIGHT: PixelArt = {
  palette: { o: '#2b2233', w: '#ffffff' },
  rows: [
    '................',
    '................',
    '................',
    '................',
    '........oo......',
    '........owo.....',
    '..ooooooowwo....',
    '..owwwwwwwwwo...',
    '..owwwwwwwwwo...',
    '..ooooooowwo....',
    '........owo.....',
    '........oo......',
    '................',
    '................',
    '................',
    '................',
  ],
};

/** 왼쪽으로 한 번(반시계 90°) 돌린 그림 (정사각형 그림만) */
function rotateLeft(art: PixelArt): PixelArt {
  const n = art.rows.length;
  return { palette: art.palette, rows: art.rows.map((_, r) => art.rows.map((row) => row[n - 1 - r]).join('')) };
}

/** 위아래를 뒤집은 그림 */
function flipVertical(art: PixelArt): PixelArt {
  return { palette: art.palette, rows: [...art.rows].reverse() };
}

const ARROW_UP = rotateLeft(ARROW_RIGHT);

export const SHARED_ARTS = {
  sign: SIGN,
  arrowRight: ARROW_RIGHT,
  arrowLeft: mirror(ARROW_RIGHT),
  arrowUp: ARROW_UP,
  arrowDown: flipVertical(ARROW_UP),
};

/** 출구 안쪽 방향 → 바깥을 가리키는 화살표 */
const OUTWARD_ARROW: Record<Dir, PixelArt> = {
  right: SHARED_ARTS.arrowLeft,
  left: SHARED_ARTS.arrowRight,
  down: SHARED_ARTS.arrowUp,
  up: SHARED_ARTS.arrowDown,
};

/** 출구 칸 위에 얹는 화살표: 그 출구의 바깥쪽 (출구가 아니면 지도 왼쪽 절반은 ←, 오른쪽은 →) */
export function exitArrow(map: FieldMap, x: number, y: number): PixelArt {
  const exit = map.exits.find((e) => e.pos.x === x && e.pos.y === y);
  if (exit) return OUTWARD_ARROW[exit.inward];
  return x < map.width / 2 ? SHARED_ARTS.arrowLeft : SHARED_ARTS.arrowRight;
}

/** 지도 테두리 칸인지 */
export function onBorder(map: FieldMap, x: number, y: number): boolean {
  return x === 0 || y === 0 || x === map.width - 1 || y === map.height - 1;
}

/** 위치로 정하는 늘 같은 작은 수 (타일 모양을 섞을 때) */
export function tileHash(x: number, y: number): number {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0;
}
