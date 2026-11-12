import * as core from 'pixelfx';
import { EFFECTS, type FxName, type FxSpec } from '../../src/field/fx/effects';

/** 효과를 playFx처럼 끝까지 돌려, 한 번이라도 그려진 화소의 평균 위치를 효과 원점 기준(효과 화소 단위)으로 잰다 */
export async function measureCenter(name: FxName): Promise<{ dx: number; dy: number }> {
  const spec: FxSpec = EFFECTS[name];
  const mod = await spec.load();
  const W = 500;
  const H = 400;
  const ox = 250;
  const oy = 200;
  const fx = core.createFx(mod, { ...spec.options, x: ox, y: oy });
  const frame = core.createFrame(W, H);
  const until = spec.until ?? Infinity;
  const dt = Math.min(0.05, 1 / 60) * spec.speed;
  const seen = new Uint8Array(W * H);
  for (let i = 0; i < 400; i++) {
    fx.update(dt);
    core.clearFrame(frame);
    fx.draw(frame);
    for (let p = 0; p < W * H; p++) if (frame.color[p] >>> 24) seen[p] = 1;
    if (fx.t >= until || fx.done()) break;
  }
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let p = 0; p < W * H; p++) {
    if (!seen[p]) continue;
    n++;
    sx += p % W;
    sy += Math.floor(p / W);
  }
  return n ? { dx: sx / n - ox, dy: sy / n - oy } : { dx: 0, dy: 0 };
}
