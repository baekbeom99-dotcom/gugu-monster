import { describe, expect, it } from 'vitest';
import { SPECIES } from '../../src/domain/field/creatures';
import { creatureArt, imageView, MONSTER_FILL, MONSTER_FOOT } from '../../src/field/art/creatureArt';
import { companionRect } from '../../src/field/world/fieldRenderer';

describe('구구몬 그림 등록표', () => {
  it('등록하지 않은 종은 모두 몬스터 SVG (레전드는 황금)', () => {
    for (const s of SPECIES) {
      expect(creatureArt(s.id)).toEqual({ type: 'monster', kind: s.kind, golden: s.legend, fill: MONSTER_FILL, foot: MONSTER_FOOT });
    }
  });

  it('이미지로 등록하면 그 그림을 쓰고, 여백 값은 기본 1', () => {
    const art = creatureArt('cloud', { cloud: { front: 'f.png' } });
    expect(art).toEqual({ type: 'image', front: 'f.png', back: undefined, fill: 1, foot: 1 });
    expect(creatureArt('cloud', { cloud: { front: 'f.png', fill: 1.2, foot: 0.9 } })).toMatchObject({ fill: 1.2, foot: 0.9 });
  });

  it('뒷모습이 없으면 앞모습을 뒤집어 쓴다', () => {
    const noBack = creatureArt('cloud', { cloud: { front: 'f.png' } });
    const withBack = creatureArt('cloud', { cloud: { front: 'f.png', back: 'b.png' } });
    if (noBack.type !== 'image' || withBack.type !== 'image') throw new Error('이미지 그림이어야 함');
    expect(imageView(noBack, 'front')).toEqual({ src: 'f.png', flip: false });
    expect(imageView(noBack, 'back')).toEqual({ src: 'f.png', flip: true });
    expect(imageView(withBack, 'back')).toEqual({ src: 'b.png', flip: false });
  });

  it('동행 자리: 칸 가운데에 서고 발끝이 칸 바닥에 닿는다', () => {
    const tile = 48;
    const r = companionRect(0, 0, tile, { scale: 1, fill: 1, foot: 1 });
    expect(r).toEqual({ x: 0, y: 0, size: 48 });
    const m = companionRect(0, 0, tile, { scale: 1, fill: MONSTER_FILL, foot: MONSTER_FOOT });
    expect(m.size).toBe(Math.round(48 * 1.45));
    expect(Math.round(m.y + m.size * MONSTER_FOOT)).toBe(tile);
  });
});
