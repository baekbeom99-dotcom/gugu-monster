import type { FieldId } from '../domain/field/fields';
import { type Dir, type FieldMap, type Pos, parseMap } from '../domain/field/movement';
import { registerTileSet } from './fieldRenderer';

/** 불러오기 화면을 적어도 이만큼은 보여준다 (ms) */
export const MIN_LOADING_MS = 600;
export const OFFLINE_MESSAGE = '인터넷에 연결되면 갈 수 있어요';

export type FieldLoaders = Record<FieldId, () => Promise<FieldMap>>;
export type SavedPosition = { map: FieldId; x: number; y: number; facing: Dir };

/** 필드마다 따로 불러온다 (Vite가 지도 파일마다 묶음을 따로 만든다). 타일 그림도 같은 묶음에 있다 */
export const DEFAULT_LOADERS: FieldLoaders = {
  meadow: () =>
    import('./maps/meadow').then((m) => {
      registerTileSet('meadow', m.MEADOW_TILES);
      return parseMap('meadow', m.MEADOW_ROWS, { exits: { '<': 'waterside', '>': 'desert' }, signTexts: m.MEADOW_SIGNS });
    }),
  waterside: () =>
    import('./maps/waterside').then((m) => {
      registerTileSet('waterside', m.WATERSIDE_TILES);
      return parseMap('waterside', m.WATERSIDE_ROWS, { exits: { '>': 'meadow' }, signTexts: m.WATERSIDE_SIGNS });
    }),
  desert: () =>
    import('./maps/desert').then((m) => {
      registerTileSet('desert', m.DESERT_TILES);
      return parseMap('desert', m.DESERT_ROWS, { exits: { '<': 'meadow' }, signTexts: m.DESERT_SIGNS });
    }),
};

const cache = new Map<FieldId, FieldMap>();

/** 이미 불러온 지도가 있으면 바로 (없으면 undefined) */
export function getLoadedField(id: FieldId): FieldMap | undefined {
  return cache.get(id);
}

export async function loadField(id: FieldId, loaders: FieldLoaders = DEFAULT_LOADERS): Promise<FieldMap> {
  const hit = cache.get(id);
  if (hit) return hit;
  const map = await loaders[id]();
  cache.set(id, map);
  return map;
}

/** 출구에서 지도 안쪽을 바라보는 방향 */
function inwardFacing(map: FieldMap, to: FieldId): Dir {
  const exit = map.exits.find((e) => e.to === to);
  return exit && exit.pos.x === 0 ? 'right' : 'left';
}

/** `dest` 지도에 `from`에서 걸어 들어왔을 때 서는 자리 (입구, 지도 안쪽을 봄) */
export function arrivalPosition(dest: FieldMap, from: FieldId): SavedPosition {
  const p: Pos = dest.entrances[from] ?? dest.entrances.start ?? { x: 1, y: 1 };
  return { map: dest.id, x: p.x, y: p.y, facing: inwardFacing(dest, from) };
}

/** 못 가게 됐을 때: 원래 필드의 `to`행 출구 한 칸 앞 */
export function bounceBackPosition(from: FieldMap, to: FieldId): SavedPosition {
  return arrivalPosition(from, to);
}

export type TravelOutcome =
  | { ok: true; map: FieldMap; position: SavedPosition }
  | { ok: false; position: SavedPosition };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** `from` 필드의 출구를 지나 `to` 필드로. 불러오기는 최소 `minMs`는 걸린다. 실패하면 원래 필드 출구 한 칸 앞 */
export async function travelTo(
  from: FieldMap,
  to: FieldId,
  minMs: number = MIN_LOADING_MS,
  loaders: FieldLoaders = DEFAULT_LOADERS,
): Promise<TravelOutcome> {
  try {
    const [map] = await Promise.all([loadField(to, loaders), wait(minMs)]);
    return { ok: true, map, position: arrivalPosition(map, from.id) };
  } catch {
    await wait(minMs);
    return { ok: false, position: bounceBackPosition(from, to) };
  }
}

/** 테스트용: 불러온 지도를 모두 잊는다 */
export function clearFieldCache(): void {
  cache.clear();
}
