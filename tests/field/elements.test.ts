import { describe, expect, it } from 'vitest';
import * as core from 'pixelfx';
import { ELEMENT_FX, ELEMENT_NAMES, elementOf } from '../../src/domain/field/elements';
import { SPECIES } from '../../src/domain/field/creatures';
import { EFFECTS, FX_NAMES, type FxSpec } from '../../src/field/fx/effects';
import { WILD_FOE_ATTACK_MS, WILD_HIT_ANIM_MS } from '../../src/domain/field/tuning';

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

  it.each(ELEMENT_EFFECTS)('%s: 불러와지고 그려도 던지지 않고, 전투 연출 시간 안에 끝난다', async (name) => {
    const spec: FxSpec = EFFECTS[name];
    expect(spec.screen).toBe(false);
    expect(spec.hold).toBe(false);
    expect(spec.note.length).toBeGreaterThan(0);
    // 실제로 트는 시간 = (until 또는 효과 길이) / 속도 → 적 공격 연출(0.7초) 안
    const mod = await spec.load();
    const real = Math.min(spec.until ?? Infinity, mod.meta?.duration ?? Infinity) / spec.speed;
    expect(real).toBeLessThanOrEqual(WILD_FOE_ATTACK_MS / 1000);
    expect(WILD_HIT_ANIM_MS).toBeLessThanOrEqual(WILD_FOE_ATTACK_MS);

    const fx = core.createFx(mod, { ...spec.options, x: 40, y: 40 });
    const frame = core.createFrame(96, 96);
    for (let i = 0; i < 5; i++) {
      fx.update(0.016);
      core.clearFrame(frame);
      fx.draw(frame);
    }
    expect(fx.t).toBeGreaterThan(0);
  });
});
