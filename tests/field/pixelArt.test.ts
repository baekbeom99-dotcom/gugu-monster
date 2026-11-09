import { describe, expect, it } from 'vitest';
import {
  ART_SIZE,
  COMPANION_FILL,
  HERO_DIRS,
  HERO_FRAMES,
  HERO_SPRITES,
  SHARED_ARTS,
  TRANSPARENT,
  heroFrame,
  type PixelArt,
} from '../../src/field/pixelArt';
import { MEADOW_TILES } from '../../src/field/maps/meadow';
import { WATERSIDE_TILES } from '../../src/field/maps/waterside';
import { DESERT_TILES } from '../../src/field/maps/desert';
import { loadField } from '../../src/field/loadField';
import type { FieldId } from '../../src/domain/field/fields';
import { FX_NAMES } from '../../src/field/fx';

const TILE_SETS = { meadow: MEADOW_TILES, waterside: WATERSIDE_TILES, desert: DESERT_TILES };

function allArts(): [string, PixelArt][] {
  const out: [string, PixelArt][] = Object.entries(SHARED_ARTS).map(([k, a]) => [`공용/${k}`, a]);
  for (const d of HERO_DIRS) HERO_SPRITES[d].forEach((a, i) => out.push([`주인공/${d}${i}`, a]));
  for (const [id, set] of Object.entries(TILE_SETS)) for (const [k, a] of Object.entries(set.arts)) out.push([`${id}/${k}`, a]);
  return out;
}

describe('픽셀 그림', () => {
  it('그림 한 장은 16줄 × 16칸', () => {
    expect(ART_SIZE).toBe(16);
    for (const [name, art] of allArts()) {
      expect(art.rows.length, name).toBe(16);
      art.rows.forEach((r, y) => expect(r.length, `${name} ${y}줄`).toBe(16));
    }
  });

  it('팔레트에 없는 글자를 쓰지 않는다 (투명 "." 빼고)', () => {
    for (const [name, art] of allArts()) {
      for (const r of art.rows)
        for (const ch of r) if (ch !== TRANSPARENT) expect(art.palette[ch], `${name} 글자 ${ch}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('주인공은 4방향 × 걸음 2장, 오른쪽은 왼쪽을 뒤집은 것', () => {
    expect(HERO_DIRS).toEqual(['down', 'up', 'left', 'right']);
    expect(HERO_FRAMES).toBe(2);
    for (const d of HERO_DIRS) expect(HERO_SPRITES[d]).toHaveLength(2);
    const l = HERO_SPRITES.left[0].rows;
    const r = HERO_SPRITES.right[0].rows;
    l.forEach((row, y) => expect(r[y]).toBe([...row].reverse().join('')));
  });

  it('걷는 중에는 반 걸음마다 그림이 바뀌고, 서 있으면 0번', () => {
    expect(heroFrame(null)).toBe(0);
    expect(heroFrame(0.1)).toBe(0);
    expect(heroFrame(0.6)).toBe(1);
  });

  it('동행은 한 칸쯤 채우게 그림 여백만큼 키운다', () => {
    expect(COMPANION_FILL).toBe(1.45);
  });

  it('효과 이름: 전투 들어가기·명중·잡기', () => {
    expect(FX_NAMES).toEqual(['enter', 'hit', 'catch']);
  });
});

describe('필드마다 타일 묶음', () => {
  it.each(['meadow', 'waterside', 'desert'] as FieldId[])('%s: 지도의 모든 칸에 그릴 그림이 있다 (물결 두 장 모두)', async (id) => {
    const map = await loadField(id);
    const set = TILE_SETS[id];
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++)
        for (const f of [0, 1] as const) {
          const layers = set.pick(map, x, y, f);
          expect(layers.length, `${x},${y}`).toBeGreaterThan(0);
          for (const a of layers) expect(a.rows.length).toBe(16);
        }
  });

  it('물가의 막힌 칸은 물: 두 장이 서로 다르다', async () => {
    const map = await loadField('waterside');
    const [a] = WATERSIDE_TILES.pick(map, 0, 0, 0);
    const [b] = WATERSIDE_TILES.pick(map, 0, 0, 1);
    expect(a).not.toBe(b);
  });

  it('초원: 안쪽 2×2 덩어리는 집 (지붕 빨강·파랑), 테두리는 나무', async () => {
    const map = await loadField('meadow');
    const top = MEADOW_TILES.pick(map, 3, 5, 0);
    expect(top.some((a) => a === MEADOW_TILES.arts.roofRedL || a === MEADOW_TILES.arts.roofBlueL)).toBe(true);
    expect(MEADOW_TILES.pick(map, 0, 0, 0)).toContain(MEADOW_TILES.arts.tree);
  });
});
