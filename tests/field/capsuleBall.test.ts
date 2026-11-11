import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CAPSULE_COLORS, CapsuleBall } from '../../src/field/art/CapsuleBall';
import { CAPSULE_TYPES } from '../../src/domain/field/capsules';

describe('CapsuleBall', () => {
  it('사막 캡슐은 주황색을 쓴다', () => {
    expect(renderToStaticMarkup(createElement(CapsuleBall, { type: 'desert' }))).toContain('#f08a24');
  });
  it('두 개를 함께 그리면 clipPath id가 다르다', () => {
    const html = renderToStaticMarkup(
      createElement('div', null, createElement(CapsuleBall, { type: 'meadow' }), createElement(CapsuleBall, { type: 'meadow' })),
    );
    const ids = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids.every((id) => /^[A-Za-z0-9_-]+$/.test(id))).toBe(true);
  });
  it('네 종류가 모두 서로 다른 색이다', () => {
    expect(Object.keys(CAPSULE_COLORS).sort()).toEqual([...CAPSULE_TYPES].sort());
    expect(new Set(CAPSULE_TYPES.map((t) => CAPSULE_COLORS[t])).size).toBe(CAPSULE_TYPES.length);
  });
});
