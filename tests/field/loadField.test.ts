import { describe, expect, it } from 'vitest';
import {
  MIN_LOADING_MS,
  OFFLINE_MESSAGE,
  type FieldLoaders,
  arrivalPosition,
  bounceBackPosition,
  clearFieldCache,
  loadField,
  travelTo,
  warpPosition,
} from '../../src/field/world/loadField';
import { parseMap } from '../../src/domain/field/movement';

describe('필드 불러오기', () => {
  it('최소 로딩 시간은 600ms', () => {
    expect(MIN_LOADING_MS).toBe(600);
  });
  it('오프라인 문구', () => {
    expect(OFFLINE_MESSAGE).toBe('인터넷에 연결되면 갈 수 있어요');
  });
  it('도착 자리는 도착 지도의 입구, 지도 안쪽을 본다', async () => {
    const meadow = await loadField('meadow');
    const water = await loadField('waterside');
    const desert = await loadField('desert');
    expect(arrivalPosition(water, 'meadow')).toEqual({ map: 'waterside', ...water.entrances.meadow!, facing: 'left' });
    expect(arrivalPosition(desert, 'meadow')).toEqual({ map: 'desert', ...desert.entrances.meadow!, facing: 'right' });
    expect(arrivalPosition(meadow, 'waterside').facing).toBe('right');
    expect(arrivalPosition(meadow, 'desert').facing).toBe('left');
  });
  it('성공하면 새 지도와 도착 자리', async () => {
    const meadow = await loadField('meadow');
    const r = await travelTo(meadow, 'waterside', 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.map.id).toBe('waterside');
      expect(r.position.map).toBe('waterside');
    }
  });
  it('불러오기가 실패하면 원래 필드 출구 한 칸 앞으로 돌아온다', async () => {
    const meadow = await loadField('meadow');
    clearFieldCache();
    const failing: FieldLoaders = {
      meadow: () => Promise.reject(new Error('x')),
      waterside: () => Promise.reject(new Error('offline')),
      desert: () => Promise.reject(new Error('offline')),
      town: () => Promise.reject(new Error('offline')),
    };
    const r = await travelTo(meadow, 'waterside', 0, failing);
    expect(r.ok).toBe(false);
    expect(r.position).toEqual({ map: 'meadow', ...meadow.entrances.waterside!, facing: 'right' });
    expect(bounceBackPosition(meadow, 'desert')).toEqual({ map: 'meadow', ...meadow.entrances.desert!, facing: 'left' });
  });

  it('위(^)로 들어오면 아래를, 아래(v)로 들어오면 위를 본다', async () => {
    clearFieldCache();
    const town = parseMap('town', ['##^##', '#...#', '#.@.#', '#...#', '##v##'], { exits: { '^': 'meadow', v: 'desert' }, signTexts: [] });
    const field = parseMap('meadow', ['#####', '#.@.#', '##v##'], { exits: { v: 'town' }, signTexts: [] });
    const fake: FieldLoaders = {
      town: () => Promise.resolve(town),
      meadow: () => Promise.resolve(field),
      waterside: () => Promise.reject(new Error('x')),
      desert: () => Promise.reject(new Error('x')),
    };
    expect(arrivalPosition(town, 'meadow')).toEqual({ map: 'town', x: 2, y: 1, facing: 'down' });
    expect(arrivalPosition(town, 'desert')).toEqual({ map: 'town', x: 2, y: 3, facing: 'up' });
    const r = await travelTo(field, 'town', 0, fake);
    expect(r).toMatchObject({ ok: true, position: { map: 'town', x: 2, y: 1, facing: 'down' } });
    const back = await travelTo(town, 'meadow', 0, fake);
    expect(back).toMatchObject({ ok: true, position: { map: 'meadow', x: 2, y: 1, facing: 'up' } });
    clearFieldCache();
  });

  it('태초마을로 가기: 마을 시작 칸(@), 아래를 본다', async () => {
    const town = await loadField('town');
    expect(warpPosition(town)).toEqual({ map: 'town', ...town.entrances.start!, facing: 'down' });
    expect(town.entrances.start).toBeDefined();
  });
  it('시작 칸이 없는 지도면 (1,1)', () => {
    const m = parseMap('town', ['###', '#.#', '###'], { exits: {}, signTexts: [] });
    expect(warpPosition(m)).toEqual({ map: 'town', x: 1, y: 1, facing: 'down' });
  });
});
