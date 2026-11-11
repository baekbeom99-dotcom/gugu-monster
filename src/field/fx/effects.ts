/**
 * 전투·필드 효과 목록 — 효과를 더하거나 바꿀 때는 여기만 고친다.
 *
 * 효과 하나 더하기:
 *   1. 아래 EFFECTS에 이름: { load, speed, hold, screen, ... } 한 줄 (pixelfx 효과 경로는 node_modules/pixelfx/fx/ 아래)
 *   2. 틀 곳에서 playFx(canvas, '이름', 자리) — 미리 받으려면 preloadFx('이름')
 *   3. #/dev/field 화면(개발 서버)에서 버튼을 눌러 바로 볼 수 있다
 * 효과는 보기만 하는 것이라 게임 시간·규칙에 손대지 않는다.
 */
import type { FxModule } from 'pixelfx';

/** 전환 효과의 그림 크기 (pixelfx 전환 효과는 320×180 화면 기준) */
export const TRANSITION_W = 320;
export const TRANSITION_H = 180;

export interface FxSpec {
  /** 효과 코드 (처음 쓸 때 따로 내려받는다 — 첫 화면 묶음에 넣지 않음) */
  load: () => Promise<FxModule>;
  /** 효과 시간 중 여기까지만 튼다 (초). 없으면 끝까지 */
  until?: number;
  /** 빠르기 배율 */
  speed: number;
  /** 다 틀고 마지막 장면을 남겨 둘지 (화면을 덮은 채로 넘어갈 때) */
  hold: boolean;
  /** 전환 효과는 화면 전체 크기 그림 */
  screen: boolean;
  /** pixelfx 효과에 넘기는 옵션 (색·뒤집기 등) */
  options?: Record<string, unknown>;
  /** 개발 화면에 보이는 설명 */
  note: string;
}

export const EFFECTS = {
  // 별 모양 조리개가 돌며 닫힌다: 닫히는 데까지(약 1초)를 만남 번쩍임 시간(0.8초)에 맞춰 조금 빨리
  enter: {
    load: () => import('pixelfx/fx/transitions/star-iris'),
    until: 1.0,
    speed: 1.25,
    hold: true,
    screen: true,
    options: { focus: [TRANSITION_W / 2, TRANSITION_H / 2], color: '#1b1030' },
    note: '풀숲에서 만났을 때 전투로 넘어가는 별 조리개',
  },
  // 정답 기술이 맞는 순간의 불꽃 (0.5초, 기술 연출 0.6초 안에 끝남). 야생 구구몬이 오른쪽 끝에 있어 불꽃을 왼쪽으로 뒤집는다
  hit: {
    load: () => import('pixelfx/fx/impacts/hit-spark'),
    speed: 1,
    hold: false,
    screen: false,
    options: { flip: true },
    note: '정답 기술이 야생 구구몬에 맞을 때',
  },
  // 캡슐에 잡혔을 때 반짝 터지는 별 (1.35초, 잡았다 글 1.5초 안에 끝남)
  catch: {
    load: () => import('pixelfx/fx/pickups/collect-burst'),
    speed: 1,
    hold: false,
    screen: false,
    options: { palette: ['#3a1d05', '#6b3a0c', '#a8620f', '#e0961c', '#ffcf3a', '#ffe680', '#fff6cf', '#ffffff'] },
    note: '캡슐로 잡았을 때',
  },
  // ---- 속성별 기술 효과 21개 (설계서 11절, 속성·순서는 domain/field/elements.ts의 ELEMENT_FX) ----
  // 전부 캔버스 한 칸 크기 효과. 전투 연출 시간(내 공격 명중 0.6초·적 공격 0.7초 — 같은 효과를 양쪽에 쓰므로 짧은 0.6초에 맞춤) 안에 끝나도록
  // 긴 효과는 until로 앞부분만 자르고 speed로 빠르게 튼다 (실제로 트는 시간 = until ÷ speed ≤ 0.6초).
  // 바닥에 붙는 효과는 at.y를 땅 높이로, 방향 있는 효과는 왼쪽에서 오른쪽으로 날아간다 (틀 곳은 Task 21).
  'vine-whip': {
    load: () => import('pixelfx/fx/nature/vine-whip'),
    until: 0.9,
    speed: 1.6,
    hold: false,
    screen: false,
    note: '풀 1번 — 덩굴 휘두르기 (왼쪽에서 오른쪽으로 뻗음, 1.4초 중 0.9초까지 빠르게)',
  },
  thorns: {
    load: () => import('pixelfx/fx/nature/thorns'),
    until: 1.2,
    speed: 2,
    hold: false,
    screen: false,
    note: '풀 2번 — 바닥에서 솟는 가시 (2.4초 중 1.2초까지 빠르게, 땅에 붙는 효과)',
  },
  'leaf-storm': {
    load: () => import('pixelfx/fx/nature/leaf-storm'),
    until: 1.2,
    speed: 2,
    hold: false,
    screen: false,
    note: '풀 3번 — 잎사귀 회오리 (반복 효과라 1.2초까지만 빠르게)',
  },
  'acid-splash': {
    load: () => import('pixelfx/fx/nature/acid-splash'),
    until: 1.2,
    speed: 2,
    hold: false,
    screen: false,
    note: '독 1번 — 산성 방울 튀김 (2.8초 중 1.2초까지 빠르게, 땅에 붙는 효과)',
  },
  'spore-burst': {
    load: () => import('pixelfx/fx/nature/spore-burst'),
    until: 1.8,
    speed: 3,
    hold: false,
    screen: false,
    note: '독 2번 — 버섯 포자 터짐 (3.2초 중 1.8초까지 3배속, 땅에 붙는 효과)',
  },
  'poison-cloud': {
    load: () => import('pixelfx/fx/nature/poison-cloud'),
    until: 1.5,
    speed: 2.5,
    hold: false,
    screen: false,
    note: '독 3번 — 독구름 (반복 효과라 1.5초까지 2.5배속, 땅에 붙는 효과)',
  },
  'feather-burst': {
    load: () => import('pixelfx/fx/holy/feather-burst'),
    until: 1.5,
    speed: 2.5,
    hold: false,
    screen: false,
    note: '빛 1번 — 깃털 터짐 (3초 중 1.5초까지 2.5배속)',
  },
  smite: {
    load: () => import('pixelfx/fx/holy/smite'),
    until: 1.3,
    speed: 2.3,
    hold: false,
    screen: false,
    note: '빛 2번 — 하늘에서 내리치는 빛 (2.8초 중 1.3초까지 빠르게, 땅에 붙는 효과)',
  },
  sunburst: {
    load: () => import('pixelfx/fx/holy/sunburst'),
    until: 1.5,
    speed: 2.5,
    hold: false,
    screen: false,
    note: '빛 3번 — 햇살 폭발 (반복 효과라 1.5초까지 2.5배속)',
  },
  splash: {
    load: () => import('pixelfx/fx/water/splash'),
    until: 1.2,
    speed: 2,
    hold: false,
    screen: false,
    note: '물 1번 — 물 튀김 (2.5초 중 1.2초까지 빠르게, 땅에 붙는 효과)',
  },
  'water-jet': {
    load: () => import('pixelfx/fx/water/water-jet'),
    until: 0.6,
    speed: 1,
    hold: false,
    screen: false,
    note: '물 2번 — 물줄기 쏘기 (왼쪽에서 오른쪽으로, 반복 효과라 0.6초까지만)',
  },
  'wave-crash': {
    load: () => import('pixelfx/fx/water/wave-crash'),
    until: 1.5,
    speed: 2.5,
    hold: false,
    screen: false,
    note: '물 3번 — 큰 파도 (3.2초 중 1.5초까지 2.5배속, 땅에 붙는 효과)',
  },
  'zap-hit': {
    load: () => import('pixelfx/fx/lightning/zap-hit'),
    speed: 1.5,
    hold: false,
    screen: false,
    options: { flip: true },
    note: '번개 1번 — 찌릿 전기 (0.9초 전부 1.5배속, 맞는 쪽 방향으로 뒤집음)',
  },
  'chain-lightning': {
    load: () => import('pixelfx/fx/lightning/chain-lightning'),
    until: 1.2,
    speed: 2,
    hold: false,
    screen: false,
    note: '번개 2번 — 이어지는 번개 (1.8초 중 1.2초까지 빠르게, 왼쪽에서 오른쪽으로)',
  },
  'lightning-strike': {
    load: () => import('pixelfx/fx/lightning/lightning-strike'),
    until: 1.5,
    speed: 2.5,
    hold: false,
    screen: false,
    note: '번개 3번 — 벼락 (3초 중 1.5초까지 2.5배속, 땅에 붙는 효과)',
  },
  'earth-spike': {
    load: () => import('pixelfx/fx/nature/earth-spike'),
    until: 1.5,
    speed: 2.6,
    hold: false,
    screen: false,
    note: '땅 1번 — 솟는 바위 가시 (3.4초 중 1.5초까지 빠르게, 땅에 붙는 효과)',
  },
  boulder: {
    load: () => import('pixelfx/fx/nature/boulder'),
    until: 1.5,
    speed: 2.5,
    hold: false,
    screen: false,
    note: '땅 2번 — 굴러가는 큰 바위 (2.3초 중 1.5초까지 2.5배속, 왼쪽에서 오른쪽으로)',
  },
  quake: {
    load: () => import('pixelfx/fx/nature/quake'),
    until: 1.5,
    speed: 2.6,
    hold: false,
    screen: false,
    note: '땅 3번 — 땅 흔들림 (3.1초 중 1.5초까지 빠르게, 땅에 붙는 효과)',
  },
  fireball: {
    load: () => import('pixelfx/fx/fire/fireball'),
    until: 0.6,
    speed: 1,
    hold: false,
    screen: false,
    note: '불 1번 — 불덩이 (왼쪽에서 오른쪽으로, 반복 효과라 0.6초까지만)',
  },
  'fire-breath': {
    load: () => import('pixelfx/fx/fire/fire-breath'),
    until: 0.7,
    speed: 1.2,
    hold: false,
    screen: false,
    note: '불 2번 — 불 뿜기 (왼쪽에서 오른쪽으로, 반복 효과라 0.7초까지 1.2배속)',
  },
  'flame-pillar': {
    load: () => import('pixelfx/fx/fire/flame-pillar'),
    until: 1.5,
    speed: 2.5,
    hold: false,
    screen: false,
    note: '불 3번 — 불기둥 (5초 중 1.5초까지 2.5배속, 땅에 붙는 효과)',
  },
} satisfies Record<string, FxSpec>;

export type FxName = keyof typeof EFFECTS;
export const FX_NAMES = Object.keys(EFFECTS) as FxName[];
