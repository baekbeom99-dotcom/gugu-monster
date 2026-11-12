/**
 * 주인공 그림 — 모자와 가방을 멘 어린이 탐험가 (4방향 × 걸음 2장). 우리 팔레트로 새로 그린 것.
 * 그림을 바꿀 때는 이 파일만: 줄 수·칸 수(HERO_SIZE)를 지키면 화면(fieldRenderer·타이틀)은 그대로 따라온다.
 * 바뀐 그림은 #/dev/field 화면(개발 서버)에서 네 방향·걸음을 한눈에 본다.
 */
import type { Dir } from '../../domain/field/movement';
import { mirror, type PixelArt } from './pixelArt';

// 타일(16×16)보다 두 배 촘촘한 32×32로 그려서 얼굴·옷 무늬가 또렷하다. 화면에는 타일 한 칸 크기로 그린다.

/** 주인공 그림 한 장의 칸 수 (가로·세로) */
export const HERO_SIZE = 32;

const HERO_PAL: Record<string, string> = {
  k: '#2b2233', // 테두리
  c: '#ff8a3d', // 모자
  o: '#ffb877', // 모자 빛
  C: '#d9662a', // 모자 챙
  w: '#ffffff',
  h: '#6b3e26', // 머리카락
  H: '#8f5a3a', // 머리 빛
  s: '#ffd2a8', // 얼굴·손
  S: '#f0ad84', // 얼굴 그늘
  r: '#ff9d8f', // 볼
  e: '#2b2233', // 눈
  m: '#d0645a', // 입
  b: '#2bb5a0', // 옷
  g: '#7fe3cf', // 옷 단추
  B: '#1f8f7e',
  p: '#ffcf3a', // 가방
  P: '#d9a521',
  l: '#3d4a8a', // 바지
  f: '#7a4a2a', // 신발
};

const hero = (rows: string[]): PixelArt => ({ palette: HERO_PAL, rows });

const DOWN_TOP = [
  '................................',
  '...........kkkkkkkkkk...........',
  '..........kkccccccwwkk..........',
  '.........kcooccccccwwck.........',
  '........kcoocccccccccck.........',
  '.......kcocccccccccccccck.......',
  '......kCCCCCCCCCCCCCCCCCCk......',
  '.....kkCCCCCCCCCCCCCCCCCCkk.....',
  '.......khhHhhhhhhhhhhHhhk.......',
  '.......khhHssssssssssHhhk.......',
  '.......khsssssssssssssshk.......',
  '.......khsseesssssseesshk.......',
  '.......khssewssssssewsshk.......',
  '........kSsrrssmmssrrsSk........',
  '.........kSssssssssssSk.........',
  '..........kkSSSSSSSSkk..........',
  '.........kpbbbbbbbbbbpk.........',
  '........kppbbbgbbgbbbppk........',
  '.......kspPbbbbbbbbbbPpsk.......',
  '.......ksspbbbbbbbbbbpssk.......',
  '.......kSskBBBBBBBBBBksSk.......',
  '........kkkBBBBBBBBBBkkk........',
  '..........kllllllllllk..........',
  '..........kllllkkllllk..........',
];
const UP_TOP = [
  '................................',
  '...........kkkkkkkkkk...........',
  '..........kkcccccccckk..........',
  '.........kcoocccccccccc.........',
  '........kcocccccccccccck........',
  '.......kcccccccccccccccck.......',
  '......kccCCCCCCCCCCCCCCcck......',
  '.......khhhhhhhhhhhhhhhhk.......',
  '.......khhHhhhhhhhhhhHhhk.......',
  '.......khhhhhhhhhhhhhhhhk.......',
  '.......khhhhHhhhhhhHhhhhk.......',
  '.......khhhhhhhhhhhhhhhhk.......',
  '.......kshhhhhhhhhhhhhhsk.......',
  '........kshhhhhhhhhhhhsk........',
  '.........kkhhhhhhhhhhkk.........',
  '..........kkSSSSSSSSkk..........',
  '.........kbppppppppppbk.........',
  '........kbbpPPPPPPPPpbbk........',
  '.......ksbbpPppppppPpbbsk.......',
  '.......kssbpPPPPPPPPpbssk.......',
  '.......kSskBppppppppBksSk.......',
  '........kkkBBBBBBBBBBkkk........',
  '..........kllllllllllk..........',
  '..........kllllkkllllk..........',
];
/** 앞·뒤 걸음: 한 발씩 */
const STEP_A = [
  '...........kllk..kllk...........',
  '...........kllk..kllk...........',
  '...........kllk..kllk...........',
  '...........kffk..kffk...........',
  '...........kfffk.kkk............',
  '............kkk.................',
  '................................',
  '................................',
];
const STEP_B = [
  '...........kllk..kllk...........',
  '...........kllk..kllk...........',
  '...........kllk..kllk...........',
  '...........kffk..kffk...........',
  '............kkk.kfffk...........',
  '.................kkk............',
  '................................',
  '................................',
];
const LEFT_TOP = [
  '................................',
  '............kkkkkkkk............',
  '..........kkccccccwwkk..........',
  '.........kcooccccccwwck.........',
  '........kcooccccccccccck........',
  '........kcccccccccccccck........',
  '.....kkkCCCCCCCCCCCCCCk.........',
  '...kkCCCCCCCCCCCCCCCCkk.........',
  '........ksssshhhhhhhhhk.........',
  '.......kssssshhhhHhhhhk.........',
  '.......ksewssshhhhhhhk..........',
  '.......kseessssshhhhhk..........',
  '......kSsssrrsssshhhhk..........',
  '.......kssmmssssshhhk...........',
  '........kSsssssssshhk...........',
  '.........kkSSSSSkkk.............',
  '.........kbbbbbbkppppk..........',
  '........kbbbgbbbkpPPPpk.........',
  '........kbsbbbbbkpPppPk.........',
  '........kbsbbbbbkpPPPPk.........',
  '........kBssBBBBkpppppk.........',
  '.........kBBBBBBkkkkkk..........',
  '.........kllllllk...............',
  '.........kllllllk...............',
];
/** 옆 걸음: 벌린 발 / 모은 발 */
const SIDE_A = [
  '........kllk..kllk..............',
  '.......kllk....kllk.............',
  '......kllk......kllk............',
  '......kffk......kffk............',
  '.....kfffk.....kfffk............',
  '......kkk.......kkk.............',
  '................................',
  '................................',
];
const SIDE_B = [
  '..........kllllk................',
  '..........kllllk................',
  '..........kllllk................',
  '..........kffffk................',
  '.........kfffffk................',
  '..........kkkkk.................',
  '................................',
  '................................',
];

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
