/** 구구몬 종 표 — 지금 있는 몬스터 8종 + 황금 레전드 3종 */
import { MONSTER_KINDS, type MonsterKind } from '../battle';
import { MONSTER_NAMES } from '../monsterNames';
import type { FieldId } from './fields';
import { FIELDS } from './fields';

export const LEGEND_SPECIES = ['legend-fluff', 'legend-horn', 'legend-ghost'] as const;
export type SpeciesId = MonsterKind | (typeof LEGEND_SPECIES)[number];

export interface SpeciesDef {
  id: SpeciesId;
  kind: MonsterKind;
  name: string;
  field: FieldId | 'legend';
  moves: [string, string, string];
  legend: boolean;
}

export const STARTERS: SpeciesId[] = ['cloud', 'jelly', 'pebble'];

// 만남 수치는 tuning.ts에서 정한다 (예전 import 자리 유지용으로 다시 내보냄)
export {
  ENCOUNTER_CHANCE_GRASS,
  ENCOUNTER_CHANCE_PATH,
  ENCOUNTER_GRACE_STEPS,
  LEGEND_CHANCE,
  LEGEND_LEVEL,
  UNSEEN_WEIGHT,
} from './tuning';

/** 기술 이름 3개 (버튼 순서대로). 기술 이름을 바꿀 때는 여기만 */
const MOVES: Record<MonsterKind, [string, string, string]> = {
  cloud: ['잎사귀 톡', '새싹 휙', '꽃잎 바람'],
  mushroom: ['방울 딸랑', '데굴데굴', '무 박치기'],
  fluff: ['왕관 반짝', '꼬리 흔들기', '몸통 박치기'],
  jelly: ['젤리 톡', '출렁 박치기', '거품 뿜기'],
  antenna: ['안테나 찌릿', '신호 빔', '빙글 돌기'],
  horn: ['뿔 콕', '돌진', '물결 치기'],
  pebble: ['블록 쾅', '세눈 빔', '단단해지기'],
  ghost: ['외뿔 찌르기', '꼬리 휘두르기', '공룡 함성'],
};

const LEGEND_MOVES: Record<(typeof LEGEND_SPECIES)[number], [string, string, string]> = {
  'legend-fluff': ['황금 왕관 빛', '반짝 별가루', '금빛 박치기'],
  'legend-horn': ['황금 뿔 콕', '금빛 돌진', '반짝 물결'],
  'legend-ghost': ['황금 외뿔 찌르기', '금빛 꼬리치기', '황금 함성'],
};

const LEGEND_BASE: Record<(typeof LEGEND_SPECIES)[number], MonsterKind> = {
  'legend-fluff': 'fluff',
  'legend-horn': 'horn',
  'legend-ghost': 'ghost',
};

function fieldOf(kind: MonsterKind): FieldId {
  for (const id of Object.keys(FIELDS) as FieldId[]) if (FIELDS[id].species.includes(kind)) return id;
  throw new Error(`필드 없는 종: ${kind}`);
}

export const SPECIES: readonly SpeciesDef[] = [
  ...MONSTER_KINDS.map(
    (kind): SpeciesDef => ({
      id: kind,
      kind,
      name: MONSTER_NAMES[kind],
      field: fieldOf(kind),
      moves: MOVES[kind],
      legend: false,
    }),
  ),
  ...LEGEND_SPECIES.map(
    (id): SpeciesDef => ({
      id,
      kind: LEGEND_BASE[id],
      name: `황금 ${MONSTER_NAMES[LEGEND_BASE[id]]}`,
      field: 'legend',
      moves: LEGEND_MOVES[id],
      legend: true,
    }),
  ),
];

export function speciesDef(id: SpeciesId): SpeciesDef {
  const def = SPECIES.find((s) => s.id === id);
  if (!def) throw new Error(`모르는 종: ${id}`);
  return def;
}
