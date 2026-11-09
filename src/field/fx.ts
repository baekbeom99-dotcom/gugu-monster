/**
 * 전투 효과 — pixelfx(MIT, NOTICE.md)의 효과를 캔버스 위에 한 번 틀어 주는 얇은 함수.
 * 효과는 보기만 하는 것이라 게임 시간·규칙에 손대지 않는다. '동작 줄이기'를 켠 기기에서는 틀지 않는다.
 * 효과 코드는 처음 쓸 때 따로 내려받는다 (첫 화면 묶음에 넣지 않음).
 */
import type { FxModule } from 'pixelfx';

export const FX_NAMES = ['enter', 'hit', 'catch'] as const;
export type FxName = (typeof FX_NAMES)[number];

/** 효과 그림 1픽셀이 화면 몇 CSS px인지 (명중·잡기) */
export const FX_PIXEL = 3;
/** 전환 효과의 그림 크기 (pixelfx 전환 효과는 320×180 화면 기준) */
export const TRANSITION_W = 320;
export const TRANSITION_H = 180;

interface Spec {
  load: () => Promise<FxModule>;
  /** 효과 시간 중 여기까지만 튼다 (초). 없으면 끝까지 */
  until?: number;
  /** 빠르기 배율 */
  speed: number;
  /** 다 틀고 마지막 장면을 남겨 둘지 (화면을 덮은 채로 넘어갈 때) */
  hold: boolean;
  /** 전환 효과는 화면 전체 크기 그림 */
  screen: boolean;
  options?: Record<string, unknown>;
}

const SPECS: Record<FxName, Spec> = {
  // 별 모양 조리개가 돌며 닫힌다: 닫히는 데까지(약 1초)를 만남 번쩍임 시간(0.8초)에 맞춰 조금 빨리
  enter: {
    load: () => import('pixelfx/fx/transitions/star-iris'),
    until: 1.0,
    speed: 1.25,
    hold: true,
    screen: true,
    options: { focus: [TRANSITION_W / 2, TRANSITION_H / 2], color: '#1b1030' },
  },
  // 정답 기술이 맞는 순간의 불꽃 (0.5초, 기술 연출 0.6초 안에 끝남). 야생 구구몬이 오른쪽 끝에 있어 불꽃을 왼쪽으로 뒤집는다
  hit: { load: () => import('pixelfx/fx/impacts/hit-spark'), speed: 1, hold: false, screen: false, options: { flip: true } },
  // 캡슐에 잡혔을 때 반짝 터지는 별 (1.35초, 잡았다 글 1.5초 안에 끝남)
  catch: {
    load: () => import('pixelfx/fx/pickups/collect-burst'),
    speed: 1,
    hold: false,
    screen: false,
    options: { palette: ['#3a1d05', '#6b3a0c', '#a8620f', '#e0961c', '#ffcf3a', '#ffe680', '#fff6cf', '#ffffff'] },
  },
};

/** 기기에서 '동작 줄이기'를 켰는지 */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 효과 코드를 미리 받아 둔다 (처음 틀 때 늦지 않게) */
export function preloadFx(...names: FxName[]): void {
  if (prefersReducedMotion()) return;
  for (const n of names) SPECS[n].load().catch(() => undefined);
}

/**
 * `canvas` 위에 효과 하나를 튼다. `at`은 캔버스 안의 CSS px 자리 (전환 효과는 쓰지 않음).
 * 다 끝나면(또는 캔버스가 화면에서 빠지면) 풀린다. 동작 줄이기면 바로 풀린다.
 */
export async function playFx(canvas: HTMLCanvasElement, name: FxName, at: { x: number; y: number } = { x: 0, y: 0 }): Promise<void> {
  if (prefersReducedMotion()) return;
  const spec = SPECS[name];
  let mod: FxModule;
  let core: typeof import('pixelfx');
  try {
    [mod, core] = await Promise.all([spec.load(), import('pixelfx')]);
  } catch {
    return; // 못 받았으면 효과 없이
  }
  if (!canvas.isConnected) return;
  const rect = canvas.getBoundingClientRect();
  const w = spec.screen ? TRANSITION_W : Math.max(1, Math.round(rect.width / FX_PIXEL));
  const h = spec.screen ? TRANSITION_H : Math.max(1, Math.round(rect.height / FX_PIXEL));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const frame = core.createFrame(w, h);
  const img = new ImageData(w, h);
  const fx = core.createFx(mod, {
    ...spec.options,
    x: spec.screen ? 0 : Math.round(at.x / FX_PIXEL),
    y: spec.screen ? 0 : Math.round(at.y / FX_PIXEL),
  });
  const until = spec.until ?? Infinity;

  await new Promise<void>((resolve) => {
    let last = performance.now();
    const step = (now: number) => {
      if (!canvas.isConnected) return resolve();
      const dt = Math.min(0.05, (now - last) / 1000) * spec.speed;
      last = now;
      fx.update(dt);
      core.clearFrame(frame);
      fx.draw(frame);
      core.composite(frame, img.data, null);
      ctx.putImageData(img, 0, 0);
      if (fx.t >= until || fx.done()) {
        if (!spec.hold) ctx.clearRect(0, 0, w, h);
        return resolve();
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
