// 사막 타일 그림 — 사막 지도와 같은 묶음으로, 이 필드를 불러올 때만 내려받는다
import { SHARED_ARTS, exitArrow, onBorder, type PixelArt, type TileSet, tileHash } from '../../art/pixelArt';

const SAND = { a: '#f6d78e', A: '#e8bf68', H: '#fbe8b8' };

const sand: PixelArt = {
  palette: SAND,
  rows: [
    'aaaaaaaaaaaaaaaa',
    'aaaaaaaaaaaaaaaa',
    'aaaAAAaaaaaaaaaa',
    'aaaaaaAAaaaaaaaa',
    'aaaaaaaaaaaaaHaa',
    'aaaaaaaaaaaaaaaa',
    'aaaaaaaaaaAAAaaa',
    'aHaaaaaaaaaaaAAa',
    'aaaaaaaaaaaaaaaa',
    'aaaaaaaaaaaaaaaa',
    'aaAAAaaaaaaaaaaa',
    'aaaaaAAaaaaHaaaa',
    'aaaaaaaaaaaaaaaa',
    'aaaaaaaaaAAAaaaa',
    'aaaHaaaaaaaaAAaa',
    'aaaaaaaaaaaaaaaa',
  ],
};

/** 바위 (막힘) */
const rock: PixelArt = {
  palette: { ...SAND, o: '#5a4636', r: '#b39472', R: '#8a6d50', h: '#d8c0a0' },
  rows: [
    'aaaaaaaaaaaaaaaa',
    'aaaaaoooooooaaaa',
    'aaaoohhhrrrrooaa',
    'aaohhhrrrrrrRRoa',
    'aohhrrrrrrrrRRoa',
    'aohrrrrrrrrrRRRo',
    'ohrrrrrrrrrrRRRo',
    'ohrrrrrRRrrrRRRo',
    'orrrrrRRrrrRRRRo',
    'orrrrrrrrrRRRRRo',
    'oRrrrrrrrRRRRRRo',
    'oRRRrrrRRRRRRRoa',
    'aoRRRRRRRRRRRRoa',
    'aaooRRRRRRRRooaa',
    'aaaAoooooooooAaa',
    'aaaaAAAAAAAAAaaa',
  ],
};

const CACTUS_PAL = { ...SAND, o: '#25502a', c: '#5fb04a', C: '#3e8a36', h: '#9be07f', p: '#ff7fb0', y: '#ffe066' };

/** 큰 선인장 (막힘) */
const cactus: PixelArt = {
  palette: CACTUS_PAL,
  rows: [
    'aaaaaaaoooaaaaaa',
    'aaaaaaochCoaaaaa',
    'aaaaaaochCoaaaaa',
    'aaaaaaochCoaoooa',
    'aoooaaochCoochCo',
    'ochCoaochCoochCo',
    'ochCoaochCoochCo',
    'ochCoaochccchCCo',
    'ochccccchCCCCCoa',
    'aoCCCCCchCoaaaaa',
    'aaooooochCoaaaaa',
    'aaaaaaochCoaaaaa',
    'aaaaaaochCoaaaaa',
    'aaaaaaochCoaaaaa',
    'aaaaAAoooooAAaaa',
    'aaaaaAAAAAAAaaaa',
  ],
};

/** 꽃 핀 작은 선인장 (꾸밈) */
const cactusFlower: PixelArt = {
  palette: CACTUS_PAL,
  rows: [
    'aaaaaaaaaaaaaaaa',
    'aaaaaaaaaaaaaaaa',
    'aaaaaaapaaaaaaaa',
    'aaaaaapypaaaaaaa',
    'aaaaaaapaaaaaaaa',
    'aaaaaoooooaaaaaa',
    'aaaaochhcCoaaaaa',
    'aaaaochccCoaaaaa',
    'aaaochhcccCoaaaa',
    'aaaochccccCoaaaa',
    'aaaochccccCoaaaa',
    'aaaochccccCoaaaa',
    'aaaaoCCCCCoaaaaa',
    'aaaaaoooooaaaaaa',
    'aaaaAAAAAAAaaaaa',
    'aaaaaaaaaaaaaaaa',
  ],
};

/** 마른 덤불 (풀숲) */
const dryBush: PixelArt = {
  palette: { ...SAND, b: '#b48a52', B: '#86643a', d: '#d6b27a' },
  rows: [
    'aaabaaaabaaaabaa',
    'abadbaabadbaadba',
    'aBbdbBaBbdbBabdB',
    'BbdBbBBbdBbBBdbB',
    'aBBbBaaBBbBaaBBa',
    'aaBBaaaaBBaaaaBa',
    'abaaaabaaaabaaaa',
    'badbaabadbaabadb',
    'bdbBaBbdbBaBbdbB',
    'BdBbBBdBbBBdBbBB',
    'aBbBaaBbBaaBbBaa',
    'aaBaaaaBaaaaBaab',
    'aaaabaaaabaaaabd',
    'aaabdbaabdbaabdb',
    'aaBbdBBBbdBBBbdB',
    'aaaBBaaaBBaaaBBa',
  ],
};

const arts = { sand, rock, cactus, cactusFlower, dryBush };

export const DESERT_TILES: TileSet = {
  arts,
  pick(map, x, y) {
    switch (map.tiles[y][x]) {
      case 'path':
        return [sand];
      case 'grass':
        return [dryBush];
      case 'deco':
        return [cactusFlower];
      case 'sign':
        return [sand, SHARED_ARTS.sign];
      case 'exit':
        return [sand, exitArrow(map, x)];
      case 'block':
        // 테두리는 바위가 많고 가끔 선인장, 안쪽 덩어리는 선인장
        if (onBorder(map, x, y)) return [tileHash(x, y) % 4 === 0 ? cactus : rock];
        return [cactus];
    }
  },
};
