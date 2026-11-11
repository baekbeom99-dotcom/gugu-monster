/** 필드 모험 저장 데이터 — 구구몬 도감·동료·마지막 자리 */
import { MONSTER_KINDS } from '../domain/battle';
import type { FieldId, MapId } from '../domain/field/fields';
import { type Dir, parseMap } from '../domain/field/movement';
import { MEADOW_ROWS, MEADOW_SIGNS } from '../field/world/maps/meadow';
import { LEGEND_SPECIES, type SpeciesId } from '../domain/field/creatures';

export { LEGEND_SPECIES };
export type { SpeciesId };
export const SPECIES_IDS: readonly SpeciesId[] = [...MONSTER_KINDS, ...LEGEND_SPECIES];

export interface SpeciesEntry {
  level: number;
  exp: number;
  stage: 1 | 2 | 3;
  caught: number;
  firstCaughtAt: number;
}

export interface FieldPosition {
  map: MapId;
  x: number;
  y: number;
  facing: Dir;
}

export interface FieldData {
  starterChosen: boolean;
  companion: SpeciesId | null;
  species: Partial<Record<SpeciesId, SpeciesEntry>>;
  seen: SpeciesId[];
  position: FieldPosition;
  stats: { battles: number; catches: number; fled: number };
}

/** 저장 안 되는 알림: 레벨이 오르거나 진화했을 때 화면에 띄운다 */
export type FieldNotice =
  | { kind: 'levelUp'; species: SpeciesId; level: number }
  | { kind: 'evolve'; species: SpeciesId; stage: 2 | 3 };

const FIELD_IDS: readonly FieldId[] = ['meadow', 'waterside', 'desert'];
const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

function isSpecies(v: unknown): v is SpeciesId {
  return typeof v === 'string' && (SPECIES_IDS as readonly string[]).includes(v);
}
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isCount = (v: unknown): v is number => isNum(v) && v >= 0;

/** 처음 시작 자리: 초원의 `@` */
export function meadowStart(): { x: number; y: number } {
  const map = parseMap('meadow', MEADOW_ROWS, { exits: { '<': 'waterside', '>': 'desert', '^': 'town' }, signTexts: MEADOW_SIGNS });
  return map.entrances.start ?? { x: 1, y: 1 };
}

export function initialField(): FieldData {
  const { x, y } = meadowStart();
  return {
    starterChosen: false,
    companion: null,
    species: {},
    seen: [],
    position: { map: 'meadow', x, y, facing: 'down' },
    stats: { battles: 0, catches: 0, fled: 0 },
  };
}

function mergeEntry(raw: unknown): SpeciesEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (!isCount(e.level) || !isCount(e.exp) || !isCount(e.caught) || !isNum(e.firstCaughtAt)) return null;
  if (e.stage !== 1 && e.stage !== 2 && e.stage !== 3) return null;
  return { level: e.level, exp: e.exp, stage: e.stage, caught: e.caught, firstCaughtAt: e.firstCaughtAt };
}

/** 저장본의 필드 칸을 기본값 위에 얹는다. 모르는 종·잘못된 지도 이름·깨진 값은 버리고 기본값 */
export function mergeField(initial: FieldData, persisted: unknown): FieldData {
  if (!persisted || typeof persisted !== 'object') return initial;
  const p = persisted as Record<string, unknown>;

  const species: FieldData['species'] = {};
  if (p.species && typeof p.species === 'object') {
    for (const [k, v] of Object.entries(p.species as Record<string, unknown>)) {
      if (!isSpecies(k)) continue;
      const entry = mergeEntry(v);
      if (entry) species[k] = entry;
    }
  }

  const seen: SpeciesId[] = [];
  if (Array.isArray(p.seen)) for (const s of p.seen) if (isSpecies(s) && !seen.includes(s)) seen.push(s);

  let position = initial.position;
  const pos = p.position as Record<string, unknown> | undefined;
  if (
    pos &&
    typeof pos === 'object' &&
    FIELD_IDS.includes(pos.map as FieldId) &&
    isCount(pos.x) &&
    isCount(pos.y) &&
    Number.isInteger(pos.x) &&
    Number.isInteger(pos.y) &&
    DIRS.includes(pos.facing as Dir)
  ) {
    position = { map: pos.map as FieldId, x: pos.x, y: pos.y, facing: pos.facing as Dir };
  }

  const st = p.stats && typeof p.stats === 'object' ? (p.stats as Record<string, unknown>) : {};
  const stats = {
    battles: isCount(st.battles) ? st.battles : initial.stats.battles,
    catches: isCount(st.catches) ? st.catches : initial.stats.catches,
    fled: isCount(st.fled) ? st.fled : initial.stats.fled,
  };

  return {
    starterChosen: typeof p.starterChosen === 'boolean' ? p.starterChosen : initial.starterChosen,
    companion: isSpecies(p.companion) ? p.companion : null,
    species,
    seen,
    position,
    stats,
  };
}
