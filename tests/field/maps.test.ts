import { describe, expect, it } from 'vitest';
import { loadField } from '../../src/field/loadField';
import { DIR_DELTA, type Dir, type FieldMap, type Pos, tryStep } from '../../src/domain/field/movement';
import type { FieldId } from '../../src/domain/field/fields';

const DIRS = Object.keys(DIR_DELTA) as Dir[];
const IDS: FieldId[] = ['meadow', 'waterside', 'desert'];
const key = (p: Pos) => `${p.x},${p.y}`;

/** tryStep으로 걸어서 닿는 칸들 (출구 칸에 서면 거기서 멈춘다) */
function reach(map: FieldMap, from: Pos): Set<string> {
  const seen = new Set<string>([key(from)]);
  const queue: Pos[] = [from];
  while (queue.length) {
    const p = queue.shift()!;
    if (map.tiles[p.y][p.x] === 'exit') continue;
    for (const d of DIRS) {
      const r = tryStep(map, p, d);
      if (r.moved && !seen.has(key(r.pos))) {
        seen.add(key(r.pos));
        queue.push(r.pos);
      }
    }
  }
  return seen;
}

describe.each(IDS)('%s 지도', (id) => {
  it('20×20이고 시작점이 있고 풀숲이 충분하다', async () => {
    const map = await loadField(id);
    expect(map.id).toBe(id);
    expect(map.width).toBe(20);
    expect(map.height).toBe(20);
    expect(map.entrances.start).toBeDefined();
    expect(map.tiles.flat().filter((t) => t === 'grass').length).toBeGreaterThan(20);
    expect(map.signs.length).toBeGreaterThan(0);
  });

  it('시작점과 모든 입구에서 모든 풀숲·출구·표지판 옆 칸에 닿는다', async () => {
    const map = await loadField(id);
    const starts = Object.entries(map.entrances) as [string, Pos][];
    expect(starts.length).toBeGreaterThanOrEqual(2);
    for (const [name, from] of starts) {
      const seen = reach(map, from);
      for (let y = 0; y < map.height; y++)
        for (let x = 0; x < map.width; x++)
          if (map.tiles[y][x] === 'grass') expect(seen.has(`${x},${y}`), `${name}에서 풀숲 ${x},${y}`).toBe(true);
      for (const e of map.exits) expect(seen.has(key(e.pos)), `${name}에서 출구 ${e.to}`).toBe(true);
      for (const s of map.signs) {
        const near = DIRS.some((d) => seen.has(key({ x: s.pos.x + DIR_DELTA[d].x, y: s.pos.y + DIR_DELTA[d].y })));
        expect(near, `${name}에서 표지판 ${s.pos.x},${s.pos.y}`).toBe(true);
      }
    }
  });
});

describe('필드 연결', () => {
  it('출구는 초원↔물가, 초원↔사막', async () => {
    const [m, w, d] = await Promise.all(IDS.map((i) => loadField(i)));
    expect(m.exits.map((e) => e.to).sort()).toEqual(['desert', 'waterside']);
    expect(w.exits.map((e) => e.to)).toEqual(['meadow']);
    expect(d.exits.map((e) => e.to)).toEqual(['meadow']);
  });

  it('모든 출구의 도착 필드에 짝이 되는 입구가 있다', async () => {
    const maps = Object.fromEntries(await Promise.all(IDS.map(async (i) => [i, await loadField(i)] as const)));
    for (const id of IDS)
      for (const e of maps[id].exits) {
        const dest = maps[e.to];
        expect(dest.entrances[id], `${id} → ${e.to}`).toBeDefined();
        // 도착 입구는 도착 지도에서 나를 향한 출구 바로 안쪽
        expect(dest.exits.some((x) => x.to === id)).toBe(true);
      }
  });
});
