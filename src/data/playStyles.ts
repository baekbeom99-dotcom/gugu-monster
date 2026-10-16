/**
 * 놀기 장면: 장난감 그림마다 펫의 움직임과 소품 연출이 다르다.
 * 관리자가 새 장난감을 만들어도 그림(아이콘)에 맞는 장면이 자동으로 정해진다.
 */
export type PlayStyle = 'walk' | 'pat' | 'bounce' | 'float' | 'hug' | 'fly' | 'spin' | 'drive' | 'stack' | 'beat';

const ICON_STYLE: Record<string, PlayStyle> = {
  ball: 'bounce',
  dice: 'bounce',
  bubbles: 'float',
  balloon: 'float',
  doll: 'hug',
  robot: 'hug',
  kite: 'fly',
  rocket: 'fly',
  frisbee: 'fly',
  yoyo: 'spin',
  top: 'spin',
  car: 'drive',
  blocks: 'stack',
  puzzle: 'stack',
  drum: 'beat',
};

export function playStyleOf(icon: string | undefined): PlayStyle {
  return (icon && ICON_STYLE[icon]) || 'bounce';
}

/** 장면마다 펫이 하는 말 (무작위로 하나) */
export const PLAY_LINES: Record<PlayStyle, string[]> = {
  walk: ['산책 최고! 바람이 시원해!', '저기 꽃 좀 봐!', '같이 걸으니까 좋다!'],
  pat: ['헤헤, 간지러워!', '더 쓰다듬어 줘!'],
  bounce: ['통통! 받아라!', '내가 잡을게!', '공 놀이 신난다!'],
  float: ['둥실둥실~', '하늘까지 올라가자!', '반짝반짝 예쁘다!'],
  hug: ['꼭 안아 줄래!', '내 단짝 친구야!', '포근해~'],
  fly: ['슝~ 높이 날아라!', '우와, 멀리 간다!', '하늘을 나는 기분!'],
  spin: ['빙글빙글~ 어지러워!', '나도 돌아 볼래!', '휘리릭!'],
  drive: ['부릉부릉! 기다려!', '잡으러 간다!', '빠르다 빨라!'],
  stack: ['하나, 둘, 셋! 높이 쌓자!', '와, 탑이 됐어!', '조심조심~'],
  beat: ['둥둥! 신나는 노래!', '같이 춤추자!', '쿵짝쿵짝~'],
};

export const PLAY_MS = 2600;
