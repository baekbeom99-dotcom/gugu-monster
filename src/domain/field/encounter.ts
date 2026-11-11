/** 만남 주사위 — 걸을 수 있는 칸에 들어선 걸음마다 부른다(풀숲 30%, 길 4%, 태초마을은 늘 0) */
import type { Dan } from '../facts';
import { pickOne, type Rng, weightedPick } from '../random';
import { LEGEND_SPECIES, type SpeciesId } from './creatures';
import {
  ENCOUNTER_CHANCE_GRASS,
  ENCOUNTER_CHANCE_PATH,
  ENCOUNTER_GRACE_STEPS,
  LEGEND_CHANCE,
  LEGEND_LEVEL,
  UNSEEN_WEIGHT,
} from './tuning';
import { rollTier, rollTierLevel, type Tier } from './strength';
import { type FieldId, FIELDS, LEGEND_DAN, type MapId, fieldDans } from './fields';
import type { Tile } from './movement';

export interface Encounter {
  species: SpeciesId;
  dan: Dan;
  /** 단계 레벨 (레전드는 LEGEND_LEVEL) */
  level: number;
  /** 강함 단계 (레전드는 'legend') */
  tier: Tier;
  legend: boolean;
  /** 만난 필드 (레전드도 그 필드). 전투 문제는 이 필드로 낸다 */
  field: FieldId;
}

export interface EncounterContext {
  /** 지금 걷는 지도 */
  map: MapId;
  stepsSinceBattle: number;
  challengeUnlocked: boolean;
  seen: readonly SpeciesId[];
  /** 함께 다니는 구구몬: 레벨로 야생 레벨을 정하고, 체력 0이면 만나지 않는다 */
  companion: { level: number; hp: number };
  /** 강제 스위치(화면이 src/field/debugFlags.ts의 debugFlags()로 채운다) */
  force?: { grass?: boolean; path?: boolean; legend?: boolean; noWild?: boolean };
}

/** 칸 종류별 만남 확률: 풀숲 0.3, 길 0.04, 나머지 0. 태초마을은 늘 0 */
export function encounterChance(map: MapId, tile: Tile | null): number {
  if (map === 'town') return 0;
  if (tile === 'grass') return ENCOUNTER_CHANCE_GRASS;
  if (tile === 'path') return ENCOUNTER_CHANCE_PATH;
  return 0;
}

/**
 * rng를 부르는 차례: 만남 → (해금 때만) 레전드 → 종 → 단 → 단계 → 레벨 (레전드는 종에서 끝).
 * 안전 걸음·동행이 쓰러졌을 때는 부르지 않는다.
 * 그 칸 종류의 force(grass·path)면 만남 판정은 rng를 쓰지 않고 통과, force.legend면 (해금 때만) 레전드 판정을 건너뛰고 레전드.
 */
export function rollEncounter(rng: Rng, ctx: EncounterContext & { tile: Tile | null }): Encounter | null {
  const field = ctx.map;
  // 마을에서는 강제 스위치여도 만나지 않는다 (rng도 안 씀)
  if (field === 'town') return null;
  // 쓰러진 구구몬은 싸울 수 없으니 만남도 없다 (rng도 안 씀)
  if (ctx.companion.hp <= 0) return null;
  if (ctx.stepsSinceBattle < ENCOUNTER_GRACE_STEPS) return null;
  const forced = (ctx.tile === 'grass' && !!ctx.force?.grass) || (ctx.tile === 'path' && !!ctx.force?.path);
  if (!forced) {
    if (ctx.force?.noWild) return null;
    if (!(rng() < encounterChance(field, ctx.tile))) return null;
  }

  if (ctx.challengeUnlocked) {
    const isLegend = ctx.force?.legend ? true : rng() < LEGEND_CHANCE;
    if (isLegend) {
      return { species: pickOne(rng, LEGEND_SPECIES), dan: LEGEND_DAN, level: LEGEND_LEVEL, tier: 'legend', legend: true, field };
    }
  }

  const species = weightedPick(rng, FIELDS[field].species, (s) => (ctx.seen.includes(s) ? 1 : UNSEEN_WEIGHT));
  if (!species) return null;
  const dan = pickOne(rng, fieldDans(field, ctx.challengeUnlocked));
  const tier = rollTier(rng);
  const level = rollTierLevel(rng, tier, ctx.companion.level);
  return { species, dan, level, tier, legend: false, field };
}

/**
 * 한 걸음: 지금 걸음 수로 먼저 주사위를 굴리고, 못 만났으면 걸음 수를 1 늘린다.
 * 그래서 전투 뒤(0)에는 ENCOUNTER_GRACE_STEPS 걸음이 안전하고,
 * 필드에 막 들어왔을 때(ENCOUNTER_GRACE_STEPS에서 시작)는 첫 걸음부터 만날 수 있다.
 * 만남 확률이 0인 칸(출구·못 움직임·마을 등)과 동행이 쓰러졌을 때는 난수도 걸음 수도 건드리지 않는다.
 */
export function stepOnTile(
  rng: Rng,
  ctx: EncounterContext & { tile: Tile | null },
): { encounter: Encounter | null; stepsSinceBattle: number } {
  if (ctx.companion.hp <= 0 || encounterChance(ctx.map, ctx.tile) === 0) return { encounter: null, stepsSinceBattle: ctx.stepsSinceBattle };
  const encounter = rollEncounter(rng, ctx);
  return { encounter, stepsSinceBattle: encounter ? ctx.stepsSinceBattle : ctx.stepsSinceBattle + 1 };
}
