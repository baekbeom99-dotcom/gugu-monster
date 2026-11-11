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
} satisfies Record<string, FxSpec>;

export type FxName = keyof typeof EFFECTS;
export const FX_NAMES = Object.keys(EFFECTS) as FxName[];
