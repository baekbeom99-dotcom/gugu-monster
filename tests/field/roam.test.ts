import { describe, expect, it } from 'vitest';
import { seededRng } from '../../src/domain/random';
import { parseMap, type Pos } from '../../src/domain/field/movement';
import type { FieldId } from '../../src/domain/field/fields';
import {
  type Roamer,
  createRoamers,
  habitatOf,
  pokeRoamer,
  stepRoamer,
} from '../../src/domain/field/roam';
import { ROAM_IDLE_MAX_MS, ROAM_IDLE_MIN_MS, ROAM_JUMP_MS, ROAM_MOVE_MS, ROAM_SLEEP_MS } from '../../src/domain/field/tuning';

const map = parseMap(
  'town',
  [
    '###########',
    '#ggggg.ppp#',
    '#ggggg.ppp#',
    '#ggggg.ppp#',
    '#.........#',
    '###########',
  ],
  { exits: {}, signTexts: [] },
);
const inZone = (field: FieldId, p: Pos) => !!map.zones[field]?.some((z) => z.x === p.x && z.y === p.y);

describe('돌아다니는 구구몬', () => {
  it('서식지는 필드, 레전드는 기본 종의 필드', () => {
    expect(habitatOf('cloud')).toBe('meadow');
    expect(habitatOf('jelly')).toBe('waterside');
    expect(habitatOf('legend-fluff')).toBe('meadow');
    expect(habitatOf('legend-horn')).toBe('waterside');
    expect(habitatOf('legend-ghost')).toBe('desert');
  });

  it('종마다 한 마리, 자기 서식지 칸에, 겹치지 않게', () => {
    const rs = createRoamers(
      map,
      [
        { species: 'cloud', fainted: false },
        { species: 'jelly', fainted: false },
        { species: 'legend-fluff', fainted: false },
      ],
      seededRng(1),
      0,
    );
    expect(rs.map((r) => r.species)).toEqual(['cloud', 'jelly', 'legend-fluff']);
    expect(inZone('meadow', rs[0]) && inZone('waterside', rs[1]) && inZone('meadow', rs[2])).toBe(true);
    expect(new Set(rs.map((r) => `${r.x},${r.y}`)).size).toBe(3);
  });

  it('서식지에 칸이 없으면 그 종은 빠진다', () => {
    const rs = createRoamers(map, [{ species: 'ghost', fainted: false }], seededRng(1), 0); // 사막 칸 없음
    expect(rs).toEqual([]);
  });

  it('1000번 돌려도 서식지 밖·canStand 거짓 칸으로 안 간다', () => {
    const rng = seededRng(7);
    let r = createRoamers(map, [{ species: 'jelly', fainted: false }], rng, 0)[0];
    const banned = (p: Pos) => p.x === 8 && p.y === 2;
    const canStand = (p: Pos) => inZone('waterside', p) && !banned(p);
    let moves = 0;
    for (let now = 0; now < 1000 * 400; now += 400) {
      const next = stepRoamer(r, now, rng, canStand);
      if (next.motion === 'move') moves++;
      r = next;
      expect(inZone('waterside', r)).toBe(true);
      expect(banned(r)).toBe(false);
    }
    expect(moves).toBeGreaterThan(50);
  });

  it('모션 이동: until 전엔 그대로, 지나면 바뀜, move는 한 칸만', () => {
    const base: Roamer = { species: 'jelly', x: 8, y: 2, fromX: 8, fromY: 2, facing: 'down', motion: 'idle', since: 0, until: 1000, fainted: false };
    expect(stepRoamer(base, 999, () => 0, () => true)).toBe(base);
    // rng 0 → 첫 가중치(move)
    const moved = stepRoamer(base, 1000, () => 0, () => true);
    expect(moved.motion).toBe('move');
    expect(Math.abs(moved.x - 8) + Math.abs(moved.y - 2)).toBe(1);
    expect([moved.fromX, moved.fromY]).toEqual([8, 2]);
    expect(moved.since).toBe(1000);
    expect(moved.until).toBe(1000 + ROAM_MOVE_MS);
  });

  it('갈 칸이 없으면 move 대신 idle', () => {
    const base: Roamer = { species: 'jelly', x: 8, y: 2, fromX: 8, fromY: 2, facing: 'down', motion: 'idle', since: 0, until: 0, fainted: false };
    const r = stepRoamer(base, 0, () => 0, () => false);
    expect(r.motion).toBe('idle');
    expect([r.x, r.y]).toEqual([8, 2]);
    expect(r.until - r.since).toBeGreaterThanOrEqual(ROAM_IDLE_MIN_MS);
    expect(r.until - r.since).toBeLessThanOrEqual(ROAM_IDLE_MAX_MS);
  });

  it('idle·jump·sleep 시간', () => {
    const base: Roamer = { species: 'jelly', x: 8, y: 2, fromX: 8, fromY: 2, facing: 'down', motion: 'idle', since: 0, until: 0, fainted: false };
    const stand = () => true;
    expect(stepRoamer(base, 0, () => 0.7, stand).motion).toBe('idle'); // 0.6~0.85
    const j = stepRoamer(base, 0, () => 0.9, stand); // 0.85~0.95
    expect(j.motion).toBe('jump');
    expect(j.until).toBe(ROAM_JUMP_MS);
    const s = stepRoamer(base, 0, () => 0.99, stand);
    expect(s.motion).toBe('sleep');
    expect(s.until).toBe(ROAM_SLEEP_MS);
  });

  it('쓰러진 종은 sleep만, poke해도 sleep', () => {
    const rs = createRoamers(map, [{ species: 'jelly', fainted: true }], seededRng(3), 0);
    expect(rs[0].motion).toBe('sleep');
    let r = rs[0];
    for (let now = 0; now < 100000; now += 1000) {
      r = stepRoamer(r, now, seededRng(now), () => true);
      expect(r.motion).toBe('sleep');
      expect([r.x, r.y]).toEqual([rs[0].x, rs[0].y]);
    }
    expect(pokeRoamer(r, 10).motion).toBe('sleep');
  });

  it('poke하면 jump', () => {
    const idle: Roamer = { species: 'jelly', x: 8, y: 2, fromX: 8, fromY: 2, facing: 'down', motion: 'idle', since: 0, until: 5000, fainted: false };
    const p = pokeRoamer(idle, 10);
    expect(p.motion).toBe('jump');
    expect(p.since).toBe(10);
    expect(p.until).toBe(10 + ROAM_JUMP_MS);
    expect([p.x, p.y]).toEqual([8, 2]);
  });
});
