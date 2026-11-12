import { describe, expect, it } from 'vitest';
import { ELEMENT_FX } from '../../src/domain/field/elements';
import { EFFECTS, type FxSpec } from '../../src/field/fx/effects';
import { measureCenter } from './fxMeasure';

const ELEMENT_EFFECTS = Object.values(ELEMENT_FX).flat();
const TOLERANCE = 1.5; // 효과 화소

describe('속성 효과 중심', () => {
  it.each(ELEMENT_EFFECTS)('%s: 효과표의 center가 실제 그려진 화소의 무게중심과 맞다', async (name) => {
    const spec: FxSpec = EFFECTS[name];
    expect(spec.center).toBeDefined();
    const m = await measureCenter(name);
    expect(Math.abs(m.dx - spec.center!.dx)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(m.dy - spec.center!.dy)).toBeLessThanOrEqual(TOLERANCE);
  });

  it('쓰지 않는 reach·anchor 옵션은 없다', () => {
    for (const spec of Object.values(EFFECTS) as Record<string, unknown>[]) {
      expect(spec).not.toHaveProperty('reach');
      expect(spec).not.toHaveProperty('anchor');
    }
  });
});
