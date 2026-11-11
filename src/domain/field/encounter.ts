/** 풀숲 만남 주사위 — 풀숲에 들어선 걸음에서만 부른다 */
import type { Dan } from '../facts';
import { pickOne, randomInt, type Rng, weightedPick } from '../random';
import { LEGEND_SPECIES, type SpeciesId } from './creatures';
import {
  ENCOUNTER_CHANCE,
  ENCOUNTER_GRACE_STEPS,
  LEGEND_CHANCE,
  LEGEND_LEVEL,
  UNSEEN_WEIGHT,
  WILD_LEVEL_MAX,
  WILD_LEVEL_MIN,
} from './tuning';
import { type FieldId, FIELDS, LEGEND_DAN, fieldDans } from './fields';

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
  force?: { encounter?: boolean; legend?: boolean };
}

/**
 * rng를 부르는 차례: 만남 → (해금 때만) 레전드 → 종 → 단 → 레벨. 안전 걸음에는 부르지 않는다.
 * force.encounter면 만남 판정은 rng를 쓰지 않고 통과, force.legend면 (해금 때만) 레전드 판정을 건너뛰고 레전드.
 */
export function rollEncounter(rng: Rng, ctx: EncounterContext): Encounter | null {
  if (ctx.stepsSinceBattle < ENCOUNTER_GRACE_STEPS) return null;
  if (!ctx.force?.encounter && !(rng() < ENCOUNTER_CHANCE)) return null;

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
 * 풀숲에 들어선 한 걸음: 지금 걸음 수로 먼저 주사위를 굴리고, 못 만났으면 걸음 수를 1 늘린다.
 * 그래서 전투 뒤(0)에는 풀숲 ENCOUNTER_GRACE_STEPS 걸음이 안전하고,
 * 필드에 막 들어왔을 때(ENCOUNTER_GRACE_STEPS에서 시작)는 첫 풀숲 걸음부터 만날 수 있다.
 */
export function stepIntoGrass(rng: Rng, ctx: EncounterContext): { encounter: Encounter | null; stepsSinceBattle: number } {
  const encounter = rollEncounter(rng, ctx);
  return { encounter, stepsSinceBattle: encounter ? ctx.stepsSinceBattle : ctx.stepsSinceBattle + 1 };
}
