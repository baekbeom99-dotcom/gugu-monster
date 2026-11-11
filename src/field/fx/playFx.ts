/**
 * 효과 틀기 — pixelfx(MIT, NOTICE.md)의 효과를 캔버스 위에 한 번 틀어 주는 얇은 함수.
 * 어떤 효과가 있는지·옵션은 effects.ts에 있다. '동작 줄이기'를 켠 기기에서는 틀지 않는다.
 */
import { EFFECTS, type FxName, type FxSpec, goldPalette, paletteLength, TRANSITION_H, TRANSITION_W } from './effects';
import type { FxModule } from 'pixelfx';

export { FX_NAMES, type FxName } from './effects';

/** 효과 그림 1픽셀이 화면 몇 CSS px인지 (명중·잡기) */
export const FX_PIXEL = 3;

/** 기기에서 '동작 줄이기'를 켰는지 */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 효과 코드를 미리 받아 둔다 (처음 틀 때 늦지 않게) */
export function preloadFx(...names: FxName[]): void {
  if (prefersReducedMotion()) return;
  for (const n of names) EFFECTS[n].load().catch(() => undefined);
}

/**
 * `canvas` 위에 효과 하나를 튼다. `at`은 캔버스 안의 CSS px 자리 (전환 효과는 쓰지 않음).
 * 다 끝나면(또는 캔버스가 화면에서 빠지면) 풀린다. 동작 줄이기면 바로 풀린다.
 */
export interface PlayFxOptions {
  /** 방향을 뒤집는다 (효과 기본 방향은 내 구구몬 쪽에서 야생 쪽으로) */
  mirror?: boolean;
  /** 금색으로 (황금 구구몬이 쏠 때) */
  gold?: boolean;
}

/** 효과를 틀었으면 true (동작 줄이기는 틀 것이 없으니 true). 불러오기에 실패하면 false */
export async function playFx(
  canvas: HTMLCanvasElement,
  name: FxName,
  at: { x: number; y: number } = { x: 0, y: 0 },
  opts: PlayFxOptions = {},
): Promise<boolean> {
  if (prefersReducedMotion()) return true;
  const spec: FxSpec = EFFECTS[name];
  let mod: FxModule;
  let core: typeof import('pixelfx');
  try {
    [mod, core] = await Promise.all([spec.load(), import('pixelfx')]);
  } catch {
    return false; // 못 받았으면 효과 없이
  }
  if (!canvas.isConnected) return true;
  const rect = canvas.getBoundingClientRect();
  const w = spec.screen ? TRANSITION_W : Math.max(1, Math.round(rect.width / FX_PIXEL));
  const h = spec.screen ? TRANSITION_H : Math.max(1, Math.round(rect.height / FX_PIXEL));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;
  const frame = core.createFrame(w, h);
  const img = new ImageData(w, h);
  const baseFlip = !!spec.options?.flip;
  const palette = opts.gold ? goldPalette(paletteLength(mod)) : undefined;
  const fx = core.createFx(mod, {
    ...spec.options,
    ...(palette ? { palette } : {}),
    flip: opts.mirror ? !baseFlip : baseFlip,
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
  return true;
}
