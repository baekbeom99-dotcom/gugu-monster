import { describe, expect, it } from 'vitest';
import * as core from 'pixelfx';
import { ELEMENT_FX, ELEMENT_NAMES, elementOf } from '../../src/domain/field/elements';
import { SPECIES } from '../../src/domain/field/creatures';
import { EFFECTS, FX_NAMES, goldPalette, paletteLength, type FxSpec } from '../../src/field/fx/effects';
import { WILD_HIT_ANIM_MS } from '../../src/domain/field/tuning';

describe('속성 표', () => {
  it('종 11개 모두 속성이 있고 레전드는 기본 종과 같다', () => {
    expect(SPECIES).toHaveLength(11);
    for (const s of SPECIES) expect(ELEMENT_NAMES[elementOf(s.id)]).toBeTruthy();
    expect(elementOf('legend-horn')).toBe(elementOf('horn'));
    expect(elementOf('legend-fluff')).toBe('light');
    expect(elementOf('ghost')).toBe('fire');
  });

  it('설계서 11절: 종마다 속성', () => {
    expect(
      Object.fromEntries((['cloud', 'mushroom', 'fluff', 'jelly', 'horn', 'antenna', 'pebble', 'ghost'] as const).map((k) => [k, elementOf(k)])),
    ).toEqual({ cloud: 'grass', mushroom: 'poison', fluff: 'light', jelly: 'water', horn: 'water', antenna: 'thunder', pebble: 'earth', ghost: 'fire' });
    expect(Object.values(ELEMENT_NAMES)).toEqual(['풀', '독', '빛', '물', '번개', '땅', '불']);
  });

  it('속성마다 효과 3개, 모두 EFFECTS에 있다', () => {
    for (const fx of Object.values(ELEMENT_FX)) {
      expect(fx).toHaveLength(3);
      for (const n of fx) expect(FX_NAMES).toContain(n);
    }
    expect(ELEMENT_FX.fire).toEqual(['fireball', 'fire-breath', 'flame-pillar']);
  });

  it('설계서 11절 표 그대로', () => {
    expect(ELEMENT_FX).toEqual({
      grass: ['vine-whip', 'thorns', 'leaf-storm'],
      poison: ['acid-splash', 'spore-burst', 'poison-cloud'],
      light: ['feather-burst', 'smite', 'sunburst'],
      water: ['splash', 'water-jet', 'wave-crash'],
      thunder: ['zap-hit', 'chain-lightning', 'lightning-strike'],
      earth: ['earth-spike', 'boulder', 'quake'],
      fire: ['fireball', 'fire-breath', 'flame-pillar'],
    });
  });
});

const ELEMENT_EFFECTS = Object.values(ELEMENT_FX).flat();

describe('속성 효과 21개', () => {
  it('21개 + 기존 3개, 겹치지 않는다', () => {
    expect(ELEMENT_EFFECTS).toHaveLength(21);
    expect(new Set(ELEMENT_EFFECTS).size).toBe(21);
    expect(FX_NAMES).toHaveLength(24);
  });

  it.each(ELEMENT_EFFECTS)('%s: 실제 트는 시간이 명중 연출(0.6초) 안이다', async (name) => {
    const spec: FxSpec = EFFECTS[name];
    expect(spec.screen).toBe(false);
    expect(spec.hold).toBe(false);
    expect(spec.note.length).toBeGreaterThan(0);
    // 같은 효과를 내 공격(명중 0.6초)과 적 공격(0.7초)에 쓰므로 짧은 쪽에 맞춘다
    const mod = await spec.load();
    const real = Math.min(spec.until ?? Infinity, mod.meta?.duration ?? Infinity) / spec.speed;
    expect(real).toBeLessThanOrEqual(WILD_HIT_ANIM_MS / 1000 + 0.001);
  });

  it.each(ELEMENT_EFFECTS)('%s: playFx처럼 끝까지 돌려도 던지지 않고, 도중에 그림이 나온다', async (name) => {
    const spec: FxSpec = EFFECTS[name];
    const mod = await spec.load();
    const W = 120;
    const H = 100;
    const fx = core.createFx(mod, { ...spec.options, x: 40, y: 80 });
    const frame = core.createFrame(W, H);
    const until = spec.until ?? Infinity;
    const dt = Math.min(0.05, 1 / 60) * spec.speed; // playFx와 같은 한 걸음
    const CAP = 120;
    let drawn = 0;
    let frames = 0;
    let finished = false;
    while (frames < CAP) {
      fx.update(dt);
      core.clearFrame(frame);
      fx.draw(frame);
      for (const c of frame.color) if (c >>> 24) { drawn++; break; }
      frames++;
      if (fx.t >= until || fx.done()) { finished = true; break; }
    }
    expect(finished).toBe(true); // 상한 프레임 안에 끝난다
    expect(fx.t).toBeGreaterThanOrEqual(Math.min(until, mod.meta?.duration ?? Infinity) - 1e-9);
    expect(drawn).toBeGreaterThan(0); // 끝날 때까지 한 번은 화소가 그려진다
    // 중간 시점(절반)에서도 비어 있지 않다
    const half = core.createFx(mod, { ...spec.options, x: 40, y: 80 });
    const target = Math.min(until, mod.meta?.duration ?? Infinity) / 2;
    while (half.t < target) half.update(dt);
    core.clearFrame(frame);
    half.draw(frame);
    let px = 0;
    for (const c of frame.color) if (c >>> 24) px++;
    expect(px).toBeGreaterThan(0);
  });
});

describe('황금 팔레트', () => {
  it.each(ELEMENT_EFFECTS)('%s: 금색 팔레트 길이가 효과의 기본 팔레트와 같다', async (name) => {
    const mod = await EFFECTS[name].load();
    const len = paletteLength(mod);
    expect([6, 8, 9]).toContain(len);
    const gold = goldPalette(len);
    expect(gold).toHaveLength(len);
    // 어두운 금에서 흰빛으로, 색 값은 모두 #rrggbb
    for (const c of gold) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    expect(gold[len - 1]).toBe('#ffffff');
    // 금색 팔레트로 만들어도 던지지 않고 그려진다
    const fx = core.createFx(mod, { ...(EFFECTS[name] as FxSpec).options, palette: gold, x: 40, y: 80 });
    const frame = core.createFrame(120, 100);
    fx.update(0.1);
    fx.draw(frame);
  });
});
