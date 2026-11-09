/**
 * 필드 픽셀 그림 — 16×16 글자 배열(팔레트 글자 → 색). 우리 팔레트로 새로 그린 것이다 (원작 타일을 옮겨 그리지 않음).
 * 여기에는 어느 필드에서나 쓰는 것(주인공·표지판·출구 화살표)만 둔다.
 * 필드마다 다른 타일은 그 필드 지도 파일(maps/*.ts)에 함께 있어서 그 필드를 불러올 때만 내려받는다.
 */
import type { Dir, FieldMap } from '../domain/field/movement';

/** 그림 한 장의 칸 수 (가로·세로) */
export const ART_SIZE = 16;
/** 투명 칸 */
export const TRANSPARENT = '.';
/**
 * 동행 그림(MonsterSprite)은 둘레에 여백이 있다. 몸이 한 칸쯤 차게 이만큼 키워 그린다.
 * (viewBox 224 중 몸통이 약 155)
 */
export const COMPANION_FILL = 1.45;

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

/** 그림을 16×16 오프스크린 캔버스에 처음 한 번만 굽는다 (그 뒤로는 drawImage로 키워 그림) */
export function bakeTiles(art: PixelArt): HTMLCanvasElement {
  const hit = baked.get(art);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = ART_SIZE;
  c.height = ART_SIZE;
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

// ── 주인공: 모자와 가방을 멘 어린이 탐험가 (4방향 × 걸음 2장) ──

const HERO_PAL: Record<string, string> = {
  k: '#2b2233', // 테두리
  c: '#ff8a3d', // 모자
  C: '#d9662a', // 모자 챙
  w: '#ffffff',
  h: '#6b3e26', // 머리카락
  s: '#ffd2a8', // 얼굴·손
  e: '#2b2233', // 눈
  m: '#d0645a', // 입
  b: '#2bb5a0', // 옷
  B: '#1f8f7e',
  p: '#ffcf3a', // 가방
  P: '#d9a521',
  l: '#3d4a8a', // 바지
  f: '#7a4a2a', // 신발
};

const hero = (rows: string[]): PixelArt => ({ palette: HERO_PAL, rows });

const DOWN_TOP = [
  '................',
  '.....kkkkkk.....',
  '....kccccwck....',
  '...kcccccccck...',
  '...kCCCCCCCCk...',
  '...khhhhhhhhk...',
  '...khsssssshk...',
  '...ksessssesk...',
  '...ksssmmsssk...',
  '....kssssssk....',
  '...kpbbbbbbpk...',
  '..ksbpbbbbpbsk..',
  '..ksBBBBBBBBsk..',
  '...kkllllllkk...',
];
const UP_TOP = [
  '................',
  '.....kkkkkk.....',
  '....kcccccck....',
  '...kcccccccck...',
  '...kccCCCCcck...',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...kshhhhhhsk...',
  '....kkhhhhkk....',
  '...kbppppppbk...',
  '..ksbpPPPPpbsk..',
  '..ksbppppppbsk..',
  '...kkllllllkk...',
];
/** 앞·뒤 걸음: 한 발씩 */
const STEP_A = ['...kllk..kllk...', '...kffk...kk....'];
const STEP_B = ['...kllk..kllk...', '....kk...kffk...'];

const LEFT_TOP = [
  '................',
  '......kkkkkk....',
  '.....kccccwck...',
  '....kcccccccck..',
  '..kkCCCCCCCCk...',
  '....kssshhhhk...',
  '...ksesshhhhk...',
  '...kssssshhhk...',
  '....kssssskppk..',
  '.....kkkkkkpPk..',
  '....kbbbbbkpPk..',
  '....kbsbbbkpPk..',
  '....kBBBBBkkk...',
  '.....kllllk.....',
];
/** 옆 걸음: 벌린 발 / 모은 발 */
const SIDE_A = ['....kllkkllk....', '...kffk..kffk...'];
const SIDE_B = ['.....kllllk.....', '.....kffffk.....'];

const LEFT = [hero([...LEFT_TOP, ...SIDE_A]), hero([...LEFT_TOP, ...SIDE_B])];

export const HERO_DIRS: Dir[] = ['down', 'up', 'left', 'right'];
export const HERO_FRAMES = 2;
export const HERO_SPRITES: Record<Dir, PixelArt[]> = {
  down: [hero([...DOWN_TOP, ...STEP_A]), hero([...DOWN_TOP, ...STEP_B])],
  up: [hero([...UP_TOP, ...STEP_A]), hero([...UP_TOP, ...STEP_B])],
  left: LEFT,
  right: LEFT.map(mirror),
};

/** 한 걸음(0~1) 중 어느 그림인지. 서 있으면 0번 */
export function heroFrame(stepProgress: number | null): 0 | 1 {
  if (stepProgress === null) return 0;
  return stepProgress < 0.5 ? 0 : 1;
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

export const SHARED_ARTS = {
  sign: SIGN,
  arrowRight: ARROW_RIGHT,
  arrowLeft: mirror(ARROW_RIGHT),
};

/** 출구 칸 위에 얹는 화살표 (지도 왼쪽 끝이면 ←) */
export function exitArrow(map: FieldMap, x: number): PixelArt {
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
