/** 필드 모험 저장 데이터 — 구구몬 도감·동료·마지막 자리 */
import { MONSTER_KINDS } from '../domain/battle';
import { FACTS } from '../domain/facts';
import { FIELD_TYPES } from '../domain/field/fieldQuestions';
import { CAPSULE_MAX, CAPSULE_START, COMPANION_MAX_HP } from '../domain/field/tuning';
import { CAPSULE_TYPES, type Capsules, isCapsuleCount } from '../domain/field/capsules';
import { addWound, type Wound } from '../domain/field/wounds';
import { MAP_IDS, type MapId } from '../domain/field/fields';
import { type Dir, parseMap } from '../domain/field/movement';
import { TOWN_EXITS, TOWN_ROWS, TOWN_SIGNS } from '../field/world/maps/town';
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
  /** 체력 0~100 (0이면 쓰러짐). 전투에서 맞는 순간 저장된다 */
  hp: number;
  /** 맞게 한 문제, 최근 WOUNDS_MAX개 (회복 연습에 쓴다) */
  wounds: Wound[];
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
  /** 남은 캡슐 (종류마다 0 이상 정수). 던지는 순간 바로 줄어 저장된다 */
  capsules: Capsules;
}

/** 저장 안 되는 알림: 레벨이 오르거나 진화했을 때 화면에 띄운다 */
export type FieldNotice =
  | { kind: 'levelUp'; species: SpeciesId; level: number }
  | { kind: 'evolve'; species: SpeciesId; stage: 2 | 3 }
  /** replacedBy: 쓰러지면서 대신 함께 다니게 된 종 (없으면 동행 그대로) */
  | { kind: 'fainted'; species: SpeciesId; replacedBy?: SpeciesId };

const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

function isSpecies(v: unknown): v is SpeciesId {
  return typeof v === 'string' && (SPECIES_IDS as readonly string[]).includes(v);
}
function isMapId(v: unknown): v is MapId {
  return typeof v === 'string' && (MAP_IDS as readonly string[]).includes(v);
}
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isCount = (v: unknown): v is number => isNum(v) && v >= 0;
const FACT_IDS = new Set<string>(FACTS.map((f) => f.id));
function isWound(v: unknown): v is Wound {
  if (!v || typeof v !== 'object') return false;
  const w = v as Record<string, unknown>;
  return typeof w.factId === 'string' && FACT_IDS.has(w.factId) && (FIELD_TYPES as readonly unknown[]).includes(w.type);
}

/** 처음 시작 자리: 태초마을의 `@` (마을 지도 글자만 가져온다 — 타일 그림은 불러오기 때) */
export function townStart(): { x: number; y: number } {
  const map = parseMap('town', TOWN_ROWS, { exits: TOWN_EXITS, signTexts: TOWN_SIGNS });
  return map.entrances.start ?? { x: 1, y: 1 };
}

export function initialField(): FieldData {
  const { x, y } = townStart();
  return {
    starterChosen: false,
    companion: null,
    species: {},
    seen: [],
    position: { map: 'town', x, y, facing: 'down' },
    stats: { battles: 0, catches: 0, fled: 0 },
    capsules: { ...CAPSULE_START },
  };
}

function mergeEntry(raw: unknown): SpeciesEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (!isCount(e.level) || !isCount(e.exp) || !isCount(e.caught) || !isNum(e.firstCaughtAt)) return null;
  if (e.stage !== 1 && e.stage !== 2 && e.stage !== 3) return null;
  // 옛 저장(체력·상처 없음)이나 깨진 값은 가득 찬 체력, 상처 없음
  const hp = isNum(e.hp) && Number.isInteger(e.hp) && e.hp >= 0 && e.hp <= COMPANION_MAX_HP ? e.hp : COMPANION_MAX_HP;
  let wounds: Wound[] = [];
  if (Array.isArray(e.wounds)) for (const w of e.wounds) if (isWound(w)) wounds = addWound(wounds, w);
  return { level: e.level, exp: e.exp, stage: e.stage, caught: e.caught, firstCaughtAt: e.firstCaughtAt, hp, wounds };
}

/** 새로 얻은 종의 기록 (체력 가득, 상처 없음) */
export function newSpeciesEntry(level: number, now: number): SpeciesEntry {
  return { level, exp: 0, stage: 1, caught: 1, firstCaughtAt: now, hp: COMPANION_MAX_HP, wounds: [] };
}

/** 저장본의 필드 칸을 기본값 위에 얹는다. 모르는 종·잘못된 지도 이름·깨진 값은 버리고 기본값.
 * 옛 저장(초원·물가·사막 자리)은 그대로 둔다. 벽 같은 칸은 그리는 쪽의 `safeStartPosition`이 한 번 더 지킨다 */
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
    isMapId(pos.map) &&
    isCount(pos.x) &&
    isCount(pos.y) &&
    Number.isInteger(pos.x) &&
    Number.isInteger(pos.y) &&
    DIRS.includes(pos.facing as Dir)
  ) {
    position = { map: pos.map, x: pos.x, y: pos.y, facing: pos.facing as Dir };
  }

  const st = p.stats && typeof p.stats === 'object' ? (p.stats as Record<string, unknown>) : {};
  const stats = {
    battles: isCount(st.battles) ? st.battles : initial.stats.battles,
    catches: isCount(st.catches) ? st.catches : initial.stats.catches,
    fled: isCount(st.fled) ? st.fled : initial.stats.fled,
  };

  // 캡슐: 옛 저장(없음)은 시작 개수. 종류마다 0 이상 정수가 아니면 그 종류만 기본값, 모르는 종류는 버린다
  const cp = p.capsules && typeof p.capsules === 'object' && !Array.isArray(p.capsules) ? (p.capsules as Record<string, unknown>) : {};
  const capsules = { ...initial.capsules };
  for (const t of CAPSULE_TYPES) {
    const v = Object.prototype.hasOwnProperty.call(cp, t) ? cp[t] : undefined;
    if (isCapsuleCount(v)) capsules[t] = Math.min(CAPSULE_MAX, v); // 정수이지만 상한을 넘으면 상한으로
  }

  return {
    starterChosen: typeof p.starterChosen === 'boolean' ? p.starterChosen : initial.starterChosen,
    companion: isSpecies(p.companion) ? p.companion : null,
    species,
    seen,
    position,
    stats,
    capsules,
  };
}
