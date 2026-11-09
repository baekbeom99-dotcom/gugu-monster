/** 풀숲 만남 주사위 — 풀숲에 들어선 걸음에서만 부른다 */
import type { Dan } from '../facts';
import { pickOne, randomInt, type Rng, weightedPick } from '../random';
import {
  ENCOUNTER_CHANCE,
  ENCOUNTER_GRACE_STEPS,
  LEGEND_CHANCE,
  LEGEND_LEVEL,
  LEGEND_SPECIES,
  type SpeciesId,
  UNSEEN_WEIGHT,
  WILD_LEVEL_MAX,
  WILD_LEVEL_MIN,
} from './creatures';
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
  /** E2E용 강제 스위치(화면이 e2eFlags()로 채운다) */
  force?: { encounter?: boolean; legend?: boolean };
}

/** E2E 스위치: 만남·캡슐 100% / 만남이 레전드. 기존 __GUGU_E2E_CALM__ 와 같은 방식 */
export function e2eFlags(): { field: boolean; legend: boolean } {
  const g = globalThis as { __GUGU_E2E_FIELD__?: boolean; __GUGU_E2E_LEGEND__?: boolean };
  return { field: !!g.__GUGU_E2E_FIELD__, legend: !!g.__GUGU_E2E_LEGEND__ };
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
