/** 만남 주사위 — 걸을 수 있는 칸에 들어선 걸음마다 부른다(풀숲 30%, 길 4%) */
import type { Dan } from '../facts';
import { pickOne, randomInt, type Rng, weightedPick } from '../random';
import { LEGEND_SPECIES, type SpeciesId } from './creatures';
import {
  ENCOUNTER_CHANCE_GRASS,
  ENCOUNTER_CHANCE_PATH,
  ENCOUNTER_GRACE_STEPS,
  LEGEND_CHANCE,
  LEGEND_LEVEL,
  UNSEEN_WEIGHT,
  WILD_LEVEL_MAX,
  WILD_LEVEL_MIN,
} from './tuning';
import { type FieldId, FIELDS, LEGEND_DAN, fieldDans } from './fields';
import type { Tile } from './movement';

export interface Encounter {
  species: SpeciesId;
  dan: Dan;
  level: number;
  legend: boolean;
}

export interface EncounterContext {
  field: FieldId;
  stepsSinceBattle: number;
  challengeUnlocked: boolean;
  seen: readonly SpeciesId[];
  /** 강제 스위치(화면이 src/field/debugFlags.ts의 debugFlags()로 채운다) */
  force?: { grass?: boolean; path?: boolean; legend?: boolean; noWild?: boolean };
}

/** 칸 종류별 만남 확률: 풀숲 0.3, 길 0.04, 나머지 0 */
export function encounterChance(_map: FieldId, tile: Tile | null): number {
  if (tile === 'grass') return ENCOUNTER_CHANCE_GRASS;
  if (tile === 'path') return ENCOUNTER_CHANCE_PATH;
  return 0;
}

/**
 * rng를 부르는 차례: 만남 → (해금 때만) 레전드 → 종 → 단 → 레벨. 안전 걸음에는 부르지 않는다.
 * 그 칸 종류의 force(grass·path)면 만남 판정은 rng를 쓰지 않고 통과, force.legend면 (해금 때만) 레전드 판정을 건너뛰고 레전드.
 */
export function rollEncounter(rng: Rng, ctx: EncounterContext & { tile: Tile | null }): Encounter | null {
  if (ctx.stepsSinceBattle < ENCOUNTER_GRACE_STEPS) return null;
  const forced = (ctx.tile === 'grass' && !!ctx.force?.grass) || (ctx.tile === 'path' && !!ctx.force?.path);
  if (!forced) {
    if (ctx.force?.noWild) return null;
    if (!(rng() < encounterChance(ctx.field, ctx.tile))) return null;
  }

  if (ctx.challengeUnlocked) {
    const isLegend = ctx.force?.legend ? true : rng() < LEGEND_CHANCE;
    if (isLegend) {
      return { species: pickOne(rng, LEGEND_SPECIES), dan: LEGEND_DAN, level: LEGEND_LEVEL, legend: true };
    }
  }

  const species = weightedPick(rng, FIELDS[ctx.field].species, (s) => (ctx.seen.includes(s) ? 1 : UNSEEN_WEIGHT));
  if (!species) return null;
  const dan = pickOne(rng, fieldDans(ctx.field, ctx.challengeUnlocked));
  const level = randomInt(rng, WILD_LEVEL_MIN, WILD_LEVEL_MAX);
  return { species, dan, level, legend: false };
}

/**
 * 한 걸음: 지금 걸음 수로 먼저 주사위를 굴리고, 못 만났으면 걸음 수를 1 늘린다.
 * 그래서 전투 뒤(0)에는 ENCOUNTER_GRACE_STEPS 걸음이 안전하고,
 * 필드에 막 들어왔을 때(ENCOUNTER_GRACE_STEPS에서 시작)는 첫 걸음부터 만날 수 있다.
 * 만남 확률이 0인 칸(출구·못 움직임 등)은 난수도 걸음 수도 건드리지 않는다.
 */
export function stepOnTile(
  rng: Rng,
  ctx: EncounterContext & { tile: Tile | null },
): { encounter: Encounter | null; stepsSinceBattle: number } {
  if (encounterChance(ctx.field, ctx.tile) === 0) return { encounter: null, stepsSinceBattle: ctx.stepsSinceBattle };
  const encounter = rollEncounter(rng, ctx);
  return { encounter, stepsSinceBattle: encounter ? ctx.stepsSinceBattle : ctx.stepsSinceBattle + 1 };
}
