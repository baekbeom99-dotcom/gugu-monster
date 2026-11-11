import { describe, expect, it } from 'vitest';
import { loadField } from '../../src/field/world/loadField';
import { DIR_DELTA, type Dir, type FieldMap, type Pos, tryStep } from '../../src/domain/field/movement';
import { MAP_IDS, type FieldId, type MapId } from '../../src/domain/field/fields';

const DIRS = Object.keys(DIR_DELTA) as Dir[];
const IDS: readonly MapId[] = MAP_IDS;
const FIELDS: FieldId[] = ['meadow', 'waterside', 'desert'];
const SIZE: Record<MapId, [number, number]> = { town: [20, 40], meadow: [20, 20], waterside: [20, 20], desert: [20, 20] };
const key = (p: Pos) => `${p.x},${p.y}`;
// 설계서: 풀숲은 약 두 배 (원래 초원 68, 물가 50, 사막 40의 2.0~2.3배)
const MIN_GRASS: Record<FieldId, number> = { meadow: 136, waterside: 100, desert: 80 };
const MAX_GRASS: Record<FieldId, number> = { meadow: 156, waterside: 115, desert: 92 };

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
  it('크기·시작점·풀숲', async () => {
    const map = await loadField(id);
    expect(map.id).toBe(id);
    expect([map.width, map.height]).toEqual(SIZE[id]);
    expect(map.entrances.start).toBeDefined();
    const grass = map.tiles.flat().filter((t) => t === 'grass').length;
    if (id !== 'town') {
      expect(grass).toBeGreaterThanOrEqual(MIN_GRASS[id]);
      expect(grass).toBeLessThanOrEqual(MAX_GRASS[id]);
    }
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

describe('필드의 마을 길(^)', () => {
  it.each(FIELDS)('%s: ^ 출구는 맨 윗줄, 그 아래와 양옆은 풀숲이 아니다', async (id) => {
    const m = await loadField(id);
    const e = m.exits.find((x) => x.to === 'town')!;
    expect(e.pos.y).toBe(0);
    for (const dx of [-1, 0, 1]) expect(m.tiles[1][e.pos.x + dx], `${id} (${e.pos.x + dx},1)`).toBe('path');
  });
});

describe('태초마을', () => {
  it('만남 칸(풀숲) 없음, 문 1개, 서식지 셋 다 6칸 이상, 표지판 4개', async () => {
    const t = await loadField('town');
    expect(t.tiles.flat()).not.toContain('grass');
    expect(t.doors).toHaveLength(1);
    for (const f of FIELDS) expect(t.zones[f]!.length).toBeGreaterThanOrEqual(6);
    for (const f of FIELDS) expect(t.zones[f]!.every((p) => p.y < 22), `${f} 서식지는 위 22줄`).toBe(true);
    expect(t.doors[0].y).toBeGreaterThanOrEqual(22);
    expect(t.signs.map((s) => s.text).sort()).toEqual(['← 물가', '↓ 초원', '사막 →', '상점 · 캡슐과 회복약'].sort());
  });

  it('<·>는 광장(y≥22), v는 맨 아랫줄', async () => {
    const t = await loadField('town');
    const at = (to: MapId) => t.exits.find((e) => e.to === to)!.pos;
    expect(at('waterside').x).toBe(0);
    expect(at('desert').x).toBe(19);
    expect(at('waterside').y).toBeGreaterThanOrEqual(22);
    expect(at('desert').y).toBeGreaterThanOrEqual(22);
    expect(at('meadow').y).toBe(39);
  });

  it('시작점에서 문 옆 칸과 세 서식지 칸에 닿는다', async () => {
    const t = await loadField('town');
    const seen = reach(t, t.entrances.start!);
    const d = t.doors[0];
    expect(DIRS.some((dir) => seen.has(key({ x: d.x + DIR_DELTA[dir].x, y: d.y + DIR_DELTA[dir].y })))).toBe(true);
    for (const f of FIELDS) for (const p of t.zones[f]!) expect(seen.has(key(p)), `${f} ${key(p)}`).toBe(true);
  });
});

describe('E2E가 쓰는 칸', () => {
  it('E2E가 쓰는 칸은 그대로', async () => {
    const m = await loadField('meadow'), w = await loadField('waterside');
    expect([m.tiles[8][5], m.tiles[8][6], m.tiles[10][1], m.tiles[10][18], m.tiles[5][9], m.tiles[6][9]]).toEqual(['path', 'grass', 'path', 'path', 'sign', 'path']);
    expect([w.tiles[9][4], w.tiles[9][5], w.tiles[10][18]]).toEqual(['path', 'grass', 'path']);
  });
});

describe('지도 연결', () => {
  it('마을↔세 필드, 초원↔물가, 초원↔사막', async () => {
    const to = async (id: MapId) => (await loadField(id)).exits.map((e) => e.to).sort();
    expect(await to('town')).toEqual(['desert', 'meadow', 'waterside']);
    expect(await to('meadow')).toEqual(['desert', 'town', 'waterside']);
    expect(await to('waterside')).toEqual(['meadow', 'town']);
    expect(await to('desert')).toEqual(['meadow', 'town']);
  });

  it('모든 출구의 도착 지도에 짝이 되는 입구가 있다', async () => {
    const maps = Object.fromEntries(await Promise.all(IDS.map(async (i) => [i, await loadField(i)] as const)));
    for (const id of IDS)
      for (const e of maps[id].exits) {
        const dest = maps[e.to];
        expect(dest.entrances[id], `${id} → ${e.to}`).toBeDefined();
        expect(dest.exits.some((x) => x.to === id)).toBe(true);
      }
  });
});
