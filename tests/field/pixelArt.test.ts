import { describe, expect, it } from 'vitest';
import { ART_SIZE, SHARED_ARTS, TRANSPARENT, exitArrow, type PixelArt } from '../../src/field/art/pixelArt';
import { parseMap } from '../../src/domain/field/movement';
import { MONSTER_FILL } from '../../src/field/art/creatureArt';
import { HERO_DIRS, HERO_FRAMES, HERO_SIZE, HERO_SPRITES, heroFrame } from '../../src/field/art/hero';
import { MEADOW_TILES } from '../../src/field/world/maps/meadow';
import { WATERSIDE_TILES } from '../../src/field/world/maps/waterside';
import { DESERT_TILES } from '../../src/field/world/maps/desert';
import { loadField } from '../../src/field/world/loadField';
import type { FieldId } from '../../src/domain/field/fields';
import { FX_NAMES } from '../../src/field/fx/playFx';

const TILE_SETS = { meadow: MEADOW_TILES, waterside: WATERSIDE_TILES, desert: DESERT_TILES };

function tileArts(): [string, PixelArt][] {
  const out: [string, PixelArt][] = Object.entries(SHARED_ARTS).map(([k, a]) => [`공용/${k}`, a]);
  for (const [id, set] of Object.entries(TILE_SETS)) for (const [k, a] of Object.entries(set.arts)) out.push([`${id}/${k}`, a]);
  return out;
}

function heroArts(): [string, PixelArt][] {
  const out: [string, PixelArt][] = [];
  for (const d of HERO_DIRS) HERO_SPRITES[d].forEach((a, i) => out.push([`주인공/${d}${i}`, a]));
  return out;
}

function allArts(): [string, PixelArt][] {
  return [...tileArts(), ...heroArts()];
}

describe('픽셀 그림', () => {
  it('타일 그림 한 장은 16줄 × 16칸', () => {
    expect(ART_SIZE).toBe(16);
    for (const [name, art] of tileArts()) {
      expect(art.rows.length, name).toBe(16);
      art.rows.forEach((r, y) => expect(r.length, `${name} ${y}줄`).toBe(16));
    }
  });

  it('주인공은 더 고운 32줄 × 32칸 (한 칸 크기에 두 배 촘촘하게)', () => {
    expect(HERO_SIZE).toBe(32);
    for (const [name, art] of heroArts()) {
      expect(art.rows.length, name).toBe(32);
      art.rows.forEach((r, y) => expect(r.length, `${name} ${y}줄`).toBe(32));
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
    expect(MONSTER_FILL).toBe(1.45);
  });

  it('효과 이름: 전투 들어가기·명중·잡기 + 속성별 기술 21개', () => {
    expect(FX_NAMES).toEqual([
      'enter', 'hit', 'catch',
      'vine-whip', 'thorns', 'leaf-storm',
      'acid-splash', 'spore-burst', 'poison-cloud',
      'feather-burst', 'smite', 'sunburst',
      'splash', 'water-jet', 'wave-crash',
      'zap-hit', 'chain-lightning', 'lightning-strike',
      'earth-spike', 'boulder', 'quake',
      'fireball', 'fire-breath', 'flame-pillar',
    ]);
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

describe('출구 화살표', () => {
  it('출구의 바깥쪽을 가리킨다 (위·아래·왼쪽·오른쪽)', () => {
    const m = parseMap('town', ['##^##', '<.@.>', '##v##'], { exits: { '<': 'waterside', '>': 'desert', '^': 'meadow', v: 'meadow' }, signTexts: [] });
    expect(exitArrow(m, 2, 0)).toBe(SHARED_ARTS.arrowUp);
    expect(exitArrow(m, 2, 2)).toBe(SHARED_ARTS.arrowDown);
    expect(exitArrow(m, 0, 1)).toBe(SHARED_ARTS.arrowLeft);
    expect(exitArrow(m, 4, 1)).toBe(SHARED_ARTS.arrowRight);
  });
  it('위 화살표는 오른쪽 화살표를 돌린 그림 (끝이 위)', () => {
    const up = SHARED_ARTS.arrowUp.rows;
    expect(up[2]).toBe('................');
    expect(up[3]).toBe('.......oo.......');
    expect(SHARED_ARTS.arrowDown.rows).toEqual([...up].reverse());
  });
});
