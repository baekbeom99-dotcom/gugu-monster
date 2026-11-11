// 물가 타일 그림 — 물가 지도와 같은 묶음으로, 이 필드를 불러올 때만 내려받는다
import type { FieldMap } from '../../../domain/field/movement';
import { SHARED_ARTS, exitArrow, onBorder, type PixelArt, type TileSet } from '../../art/pixelArt';

const SAND = { s: '#f4e2a8', S: '#e4cb86', H: '#fff3cc' };
const WATER = { w: '#4aa3e6', W: '#3784c9', h: '#cfeeff' };

const sand: PixelArt = {
  palette: SAND,
  rows: [
    'ssssssssssssssss',
    'ssssssssssSsssss',
    'ssHsssssssssssss',
    'ssssssssssssssss',
    'sssssssSssssssss',
    'ssssssssssssssHs',
    'sSssssssssssssss',
    'ssssssssssssssss',
    'ssssssssSsssssss',
    'ssssHsssssssssss',
    'ssssssssssssssss',
    'sssssssssssSssss',
    'ssssssssssssssss',
    'sssSsssssHssssss',
    'ssssssssssssssss',
    'ssssssssssssssss',
  ],
};

/** 물: 두 장을 번갈아 그려 물결이 반짝인다 */
const waterA: PixelArt = {
  palette: WATER,
  rows: [
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwhhhwwwwwwwwww',
    'wwhwwwhwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwWWwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwhhhwwww',
    'wwwwwwwwhwwwhwww',
    'wwwwwwwwwwwwwwww',
    'wwWWwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwhhhwwwwwwwww',
    'wwwhwwwhwwwwwwww',
    'wwwwwwwwwwwwwWWw',
    'wwwwwwwwwwwwwwww',
  ],
};
const waterB: PixelArt = {
  palette: WATER,
  rows: [
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwhhhwwwwwwww',
    'wwwwhwwwhwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwWWwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwhhhww',
    'wwwwwwwwwwhwwwhw',
    'wwwwwwwwwwwwwwww',
    'wwwwWWwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwhhhwwwwwwwwwww',
    'whwwwhwwwwwwwwww',
    'wwwwwwwwwwwWWwww',
    'wwwwwwwwwwwwwwww',
  ],
};

/** 모래톱: 바로 위가 물인 땅 칸 윗부분에 젖은 모래와 물거품 (투명 바탕) */
const bank: PixelArt = {
  palette: { f: '#ffffff', d: '#d8bd78', D: '#c6a862' },
  rows: [
    'ffDffDDfffDfffDf',
    'dDddDddDdddDddDd',
    'dddddddddddddddd',
    '.d..d...d..d...d',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
};

/** 나무다리 널빤지: 물에 닿은 길 */
const planks: PixelArt = {
  palette: { k: '#5a3a1e', n: '#c08a52', N: '#8f5f30', y: '#e0b07a' },
  rows: [
    'kkkkkkkkkkkkkkkk',
    'nnnnnnynnnnnnnnn',
    'nnnnnnnnnnnnnnkn',
    'NNNNNNNNNNNNNNNN',
    'kkkkkkkkkkkkkkkk',
    'nnnnnnnnnnnnnynn',
    'nnknnnnnnnnnnnnn',
    'NNNNNNNNNNNNNNNN',
    'kkkkkkkkkkkkkkkk',
    'nnnnynnnnnnnnnnn',
    'nnnnnnnnnnknnnnn',
    'NNNNNNNNNNNNNNNN',
    'kkkkkkkkkkkkkkkk',
    'nnnnnnnnnnynnnnn',
    'nnnnnnknnnnnnnnn',
    'NNNNNNNNNNNNNNNN',
  ],
};

/** 수초 (풀숲) */
const reeds: PixelArt = {
  palette: { m: '#b5dd8a', r: '#5e9f3b', R: '#3f7a2a', c: '#7a4a26' },
  rows: [
    'mmcmmmmmmcmmmmmm',
    'mmcmmmcmmcmmmmmm',
    'mmrmmmcmmrmmmcmm',
    'mmrmmmrmmrmmmcmm',
    'mRrmmmrmmrRmmrmm',
    'mRrmrmrmmrRmmrmm',
    'mmrmrmrRmrmmmrRm',
    'rmrmrmrRmrmmrrRm',
    'rmrRrmrmmrmmrmRm',
    'rmrRrmrmrrmmrmmr',
    'RmrmrmrmrRmmrmmr',
    'RrrmrrrmrRmrrmmR',
    'mRrmRrrmrmmRrmrR',
    'mRmmRmRmRmmRmmRm',
    'RRmRRmRRRmRRmRRR',
    'mmmmmmmmmmmmmmmm',
  ],
};

/** 돌 (꾸밈) */
const stone: PixelArt = {
  palette: { ...SAND, o: '#4a4a55', r: '#9aa0ad', R: '#727887', h: '#c9ced8', m: '#6fae4a' },
  rows: [
    'ssssssssssssssss',
    'ssssssssssssssss',
    'ssssssssssssssss',
    'sssssooooossssss',
    'ssssohhrrroossss',
    'sssohrrrrrrRosss',
    'ssohrrrmmrrRRoss',
    'ssorrrmmmmrRRoss',
    'ssorrrrrrrRRRoss',
    'ssoRrrrrrRRRRoss',
    'sssoRRRRRRRRosss',
    'ssssooooooooosss',
    'sssSSSSSSSSSSsss',
    'ssssssssssssssss',
    'ssssssssssssssss',
    'ssssssssssssssss',
  ],
};

const arts = { sand, waterA, waterB, bank, planks, reeds, stone };

const isWater = (map: FieldMap, x: number, y: number) => map.tiles[y]?.[x] === 'block';
const isInnerWater = (map: FieldMap, x: number, y: number) => isWater(map, x, y) && !onBorder(map, x, y);

/** 연못(안쪽 물) 옆구리에 붙은 길은 나무 선착장 (위아래로 닿은 길은 모래톱) */
function onBoardwalk(map: FieldMap, x: number, y: number): boolean {
  return isInnerWater(map, x - 1, y) || isInnerWater(map, x + 1, y);
}

export const WATERSIDE_TILES: TileSet = {
  arts,
  pick(map, x, y, frame) {
    const t = map.tiles[y][x];
    if (t === 'block') return [frame === 0 ? waterA : waterB];
    const layers: PixelArt[] = [];
    if (t === 'path' && onBoardwalk(map, x, y)) layers.push(planks);
    else if (t === 'grass') layers.push(reeds);
    else if (t === 'deco') layers.push(stone);
    else layers.push(sand);
    if (isWater(map, x, y - 1) && layers[0] !== planks) layers.push(bank);
    if (t === 'sign') layers.push(SHARED_ARTS.sign);
    if (t === 'exit') layers.push(exitArrow(map, x));
    return layers;
  },
};
