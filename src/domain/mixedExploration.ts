/**
 * 추천 탐험에 셈 연습 문제를 섞는다 — 설계서 4-2.
 * 몬스터마다 한 문제(9문제 중 3문제)를 셈 문제로 바꾼다. 바꿀 자리는 그 몬스터의 '자신감 문제'가 먼저.
 * 기본 단계·보수는 언제나, 고수 단계는 셈 연습에서 한 판 이상 해 본 종류만 낸다. 자주 틀린 종류가 더 자주 나온다.
 */
import { ARITH_INFO, ARITH_KINDS, type ArithKind, generateArith } from './arith';
import type { PracticeData } from './arithPractice';
import { pickOne, type Rng, weightedPick } from './random';
import { type BattleItem, type PlannedItem, QUESTIONS_PER_MONSTER } from './scheduler';

export const ARITH_PER_MONSTER = 1;

/** 추천 탐험에 낼 수 있는 셈 종류 */
export function mixableKinds(practice: PracticeData): ArithKind[] {
  return ARITH_KINDS.filter((k) => ARITH_INFO[k].level !== 'hard' || (practice[k]?.plays ?? 0) >= 1);
}

/** 해 본 종류는 오답률이 높을수록 무겁게 (1 + 2 × 오답률), 안 해 본 종류는 1 */
export function arithKindWeight(kind: ArithKind, practice: PracticeData): number {
  const rec = practice[kind];
  if (!rec || rec.attempts === 0) return 1;
  return 1 + 2 * (1 - rec.correct / rec.attempts);
}

export function mixArithmetic(plan: readonly PlannedItem[], practice: PracticeData, rng: Rng): BattleItem[] {
  const out: BattleItem[] = [...plan];
  const kinds = mixableKinds(practice);
  const used: ArithKind[] = [];
  for (let start = 0; start < plan.length; start += QUESTIONS_PER_MONSTER) {
    const slots = Array.from({ length: Math.min(QUESTIONS_PER_MONSTER, plan.length - start) }, (_, i) => start + i);
    for (let n = 0; n < ARITH_PER_MONSTER && slots.length > 0; n++) {
      const confidence = slots.filter((i) => plan[i].isConfidence);
      const at = confidence.length > 0 ? pickOne(rng, confidence) : pickOne(rng, slots);
      slots.splice(slots.indexOf(at), 1);
      // 한 탐험에서 같은 종류가 겹치지 않게 (모자라면 겹쳐도 된다)
      const fresh = kinds.filter((k) => !used.includes(k));
      const kind = weightedPick(rng, fresh.length > 0 ? fresh : kinds, (k) => arithKindWeight(k, practice)) ?? kinds[0];
      used.push(kind);
      out[at] = { arith: generateArith(rng, kind), isRetry: false, isConfidence: false };
    }
  }
  return out;
}
