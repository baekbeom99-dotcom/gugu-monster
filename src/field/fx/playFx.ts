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

/** 캔버스마다 지금 도는 실행 표식 하나 — 새 효과를 틀면 바뀌어 이전 루프가 다음 프레임에 스스로 멈춘다 */
const runs = new WeakMap<HTMLCanvasElement, number>();
let runCounter = 0;

/**
 * 효과를 틀었으면 true (동작 줄이기는 틀 것이 없으니 true, 다른 효과가 끼어들어 끊겼을 때도 true). 불러오기·틀기에 실패하면 false.
 * `at`은 효과의 무게중심을 놓을 캔버스 안 CSS px 자리다: 원점 = at − center × FX_PIXEL (mirror면 dx를 뒤집음).
 * 같은 캔버스에서 새 효과를 틀면 이전 효과는 바로 끊고 지운다.
 */
export async function playFx(
  canvas: HTMLCanvasElement,
  name: FxName,
  at: { x: number; y: number } = { x: 0, y: 0 },
  opts: PlayFxOptions = {},
): Promise<boolean> {
  if (prefersReducedMotion()) return true;
  const run = ++runCounter;
  runs.set(canvas, run);
  canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); // 이전 효과를 바로 지운다
  const spec: FxSpec = EFFECTS[name];
  let mod: FxModule;
  let core: typeof import('pixelfx');
  try {
    [mod, core] = await Promise.all([spec.load(), import('pixelfx')]);
  } catch {
    return false; // 못 받았으면 효과 없이
  }
  if (!canvas.isConnected || runs.get(canvas) !== run) return true;
  const ctx = canvas.getContext('2d');
  try {
    const rect = canvas.getBoundingClientRect();
    const w = spec.screen ? TRANSITION_W : Math.max(1, Math.round(rect.width / FX_PIXEL));
    const h = spec.screen ? TRANSITION_H : Math.max(1, Math.round(rect.height / FX_PIXEL));
    canvas.width = w;
    canvas.height = h;
    if (!ctx) return true;
    const frame = core.createFrame(w, h);
    const img = new ImageData(w, h);
    const baseFlip = !!spec.options?.flip;
    const palette = opts.gold ? goldPalette(paletteLength(mod)) : undefined;
    const cx = (spec.center?.dx ?? 0) * (opts.mirror ? -1 : 1);
    const cy = spec.center?.dy ?? 0;
    const fx = core.createFx(mod, {
      ...spec.options,
      ...(palette ? { palette } : {}),
      flip: opts.mirror ? !baseFlip : baseFlip,
      x: spec.screen ? 0 : Math.round(at.x / FX_PIXEL - cx),
      y: spec.screen ? 0 : Math.round(at.y / FX_PIXEL - cy),
    });
    const until = spec.until ?? Infinity;

    return await new Promise<boolean>((resolve) => {
      let last = performance.now();
      const step = (now: number) => {
        if (!canvas.isConnected || runs.get(canvas) !== run) return resolve(true); // 끊겼다: 그림은 새 효과가 맡는다
        try {
          const dt = Math.min(0.05, (now - last) / 1000) * spec.speed;
          last = now;
          fx.update(dt);
          core.clearFrame(frame);
          fx.draw(frame);
          core.composite(frame, img.data, null);
          ctx.putImageData(img, 0, 0);
          if (fx.t >= until || fx.done()) {
            if (!spec.hold) ctx.clearRect(0, 0, w, h);
            return resolve(true);
          }
        } catch {
          ctx.clearRect(0, 0, w, h);
          return resolve(false);
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  } catch {
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    return false;
  }
}
