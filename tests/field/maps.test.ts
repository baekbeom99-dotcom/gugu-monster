import { describe, expect, it } from 'vitest';
import { MEADOW_ROWS, MEADOW_SIGNS } from '../../src/field/maps/meadow';
import { parseMap, DIR_DELTA, type Dir, type Pos } from '../../src/domain/field/movement';

const map = parseMap('meadow', MEADOW_ROWS, {
  exits: { '<': 'waterside', '>': 'desert' },
  signTexts: MEADOW_SIGNS,
});
const DIRS = Object.keys(DIR_DELTA) as Dir[];

describe('초원 지도', () => {
  it('20×20이고 시작점이 하나', () => {
    expect(map.width).toBe(20);
    expect(map.height).toBe(20);
    expect(MEADOW_ROWS.join('').split('@').length - 1).toBe(1);
    expect(map.entrances.start).toBeDefined();
  });
  it('풀숲 덩어리가 있고 출구는 물가·사막', () => {
    expect(map.tiles.flat().filter((t) => t === 'grass').length).toBeGreaterThan(20);
    expect(map.exits.map((e) => e.to).sort()).toEqual(['desert', 'waterside']);
  });
  it('시작점에서 모든 풀숲·출구·표지판 옆 칸에 닿는다', () => {
    const walk = (p: Pos) => {
      const t = map.tiles[p.y]?.[p.x];
      return t === 'path' || t === 'grass' || t === 'exit';
    };
    const key = (p: Pos) => `${p.x},${p.y}`;
    const start = map.entrances.start!;
    const seen = new Set<string>([key(start)]);
    const queue: Pos[] = [start];
    while (queue.length) {
      const p = queue.shift()!;
      if (map.tiles[p.y][p.x] === 'exit') continue;
      for (const d of DIRS) {
        const n = { x: p.x + DIR_DELTA[d].x, y: p.y + DIR_DELTA[d].y };
        if (walk(n) && !seen.has(key(n))) {
          seen.add(key(n));
          queue.push(n);
        }
      }
    }
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++)
        if (map.tiles[y][x] === 'grass') expect(seen.has(`${x},${y}`), `풀숲 ${x},${y}`).toBe(true);
    for (const e of map.exits) expect(seen.has(key(e.pos))).toBe(true);
    for (const s of map.signs) {
      const near = DIRS.some((d) =>
        seen.has(key({ x: s.pos.x + DIR_DELTA[d].x, y: s.pos.y + DIR_DELTA[d].y })),
      );
      expect(near, `표지판 ${s.pos.x},${s.pos.y}`).toBe(true);
    }
  });
});
