import { describe, expect, it } from 'vitest';
import { padDirection } from '../../src/field/world/padDirection';
import { parseMap, safeStartPosition } from '../../src/domain/field/movement';
import { MEADOW_EXITS, MEADOW_ROWS, MEADOW_SIGNS } from '../../src/field/world/maps/meadow';

describe('padDirection', () => {
  it('가장 가까운 4방향', () => {
    expect(padDirection(0, -40, 15)).toBe('up');
    expect(padDirection(30, 5, 15)).toBe('right');
    expect(padDirection(-30, 5, 15)).toBe('left');
    expect(padDirection(2, 30, 15)).toBe('down');
  });
  it('가운데 안은 null', () => {
    expect(padDirection(3, 4, 15)).toBeNull();
    expect(padDirection(0, 0, 15)).toBeNull();
  });
});

describe('safeStartPosition', () => {
  const map = parseMap('meadow', MEADOW_ROWS, { exits: MEADOW_EXITS, signTexts: MEADOW_SIGNS });
  const start = map.entrances.start!;
  it('걸을 수 있는 저장 자리는 그대로', () => {
    expect(safeStartPosition(map, { map: 'meadow', x: 3, y: 3, facing: 'left' })).toEqual({ x: 3, y: 3, facing: 'left' });
  });
  it('지도 밖·막힘 칸·다른 지도면 시작 칸', () => {
    for (const bad of [
      { map: 'meadow' as const, x: -1, y: 3, facing: 'up' as const },
      { map: 'meadow' as const, x: 99, y: 3, facing: 'up' as const },
      { map: 'meadow' as const, x: 0, y: 0, facing: 'up' as const },
      { map: 'meadow' as const, x: 9, y: 5, facing: 'up' as const }, // 표지판
      { map: 'waterside' as const, x: 3, y: 3, facing: 'up' as const },
      { map: 'meadow' as const, x: 1.5, y: 3, facing: 'up' as const },
    ]) {
      expect(safeStartPosition(map, bad)).toMatchObject({ x: start.x, y: start.y });
    }
  });
});
