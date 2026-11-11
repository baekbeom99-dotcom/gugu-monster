/**
 * 야생 구구몬과의 전투 규칙 — 설계서 6-2~6-6 (순수 로직: 시간·무작위는 인자로만 받는다)
 * 단계: question(문제) → 정답 hit / 오답·시간 초과 struck → hint → question … → dizzy(어지러움) → 던지기
 * 끝: caught(잡힘) · escaped(도망감) · released(돌려보냄) · fainted(우리 구구몬이 쓰러짐)
 */
import type { Rng } from '../random';
import { rollTierLevel, throwOdds, type Tier } from './strength';
import { TIER_RULES } from './tuning';
import { applyDamage } from './wounds';

/** 한 번에 흐르는 시간의 상한 (탭이 오래 멈췄다 돌아와도 한꺼번에 시간이 다 가지 않게). 운영 수치가 아니라 안전장치 */
export const MAX_TICK_MS = 250;

export type WildPhase = 'question' | 'hit' | 'struck' | 'hint' | 'dizzy' | 'caught' | 'escaped' | 'released' | 'fainted';
export type ThrowOutcome = 'caught' | 'retry' | 'escaped' | 'angry';

export interface WildState {
  tier: Tier;
  level: number;
  /** 정답으로 깎은 수 */
  hits: number;
  /** 이 문제 남은 시간 */
  timeLeftMs: number;
  /** 우리 구구몬 체력 */
  allyHp: number;
  phase: WildPhase;
  /** 이 전투에서 맞힌 수 (경험치 정산용, 화나도 줄지 않음) */
  correct: number;
  /** 마지막 피격이 시간 초과였나 */
  timedOut: boolean;
  /** 적이 고른 기술 0~2 (피격 때) */
  lastMove: number | null;
}

export function createWild(tier: Tier, level: number, allyHp: number): WildState {
  const hp = applyDamage(allyHp, 0);
  return {
    tier,
    level,
    hits: 0,
    timeLeftMs: TIER_RULES[tier].timeMs,
    allyHp: hp,
    // 쓰러진 구구몬으로는 싸우지 않는다 (만남이 막지만 한 번 더 지킨다)
    phase: hp <= 0 ? 'fainted' : 'question',
    correct: 0,
    timedOut: false,
    lastMove: null,
  };
}

/** 적의 공격: 체력이 0이 되면 힌트 없이 바로 끝 (R9) */
function strike(s: WildState, rng: Rng, timedOut: boolean, timeLeftMs: number): WildState {
  const allyHp = applyDamage(s.allyHp, TIER_RULES[s.tier].damage);
  const lastMove = Math.min(2, Math.max(0, Math.floor(rng() * 3)));
  return { ...s, allyHp, timeLeftMs, timedOut, lastMove, phase: allyHp <= 0 ? 'fainted' : 'struck' };
}

/** 문제가 떠 있는 동안에만 시간이 준다. 이상한 dt(NaN·음수·무한)는 0으로 본다 */
export function tick(s: WildState, dtMs: number, rng: Rng): WildState {
  if (s.phase !== 'question') return s;
  const dt = Number.isFinite(dtMs) ? Math.min(Math.max(dtMs, 0), MAX_TICK_MS) : 0;
  if (dt === 0) return s;
  const timeLeftMs = Math.max(0, s.timeLeftMs - dt);
  if (timeLeftMs === 0) return strike(s, rng, true, 0);
  return { ...s, timeLeftMs };
}

/** 답하기: 정답이면 한 번 깎고(다 깎으면 어지러움), 오답이면 적이 공격한다. 연타는 무시 */
export function answerWild(s: WildState, correct: boolean, rng: Rng): WildState {
  if (s.phase !== 'question') return s;
  if (!correct) return strike(s, rng, false, s.timeLeftMs);
  const hits = s.hits + 1;
  return { ...s, hits, correct: s.correct + 1, phase: hits >= TIER_RULES[s.tier].hitsToDizzy ? 'dizzy' : 'hit' };
}

/** 연출이 끝나면 다음으로: 명중 → 새 문제, 피격 → 힌트, 힌트 → 같은 문제. 새 문제는 시간이 처음부터 */
export function resumeWild(s: WildState): WildState {
  if (s.phase === 'struck') return { ...s, phase: 'hint' };
  if (s.phase === 'hit' || s.phase === 'hint') return { ...s, phase: 'question', timeLeftMs: TIER_RULES[s.tier].timeMs };
  return s;
}

/**
 * 캡슐 던지기 (어지러울 때만, 아니면 null). 난수 하나로 결과를 정한다(R11):
 * 잡힘 → 재도전 → 도망 → 화남 순으로 칸을 쌓아, 0은 언제나 잡힘이고 0.999는 화남.
 */
export function throwCapsule(
  s: WildState,
  rng: Rng,
  companionLevel: number,
): { state: WildState; outcome: ThrowOutcome } | null {
  if (s.phase !== 'dizzy') return null;
  const odds = throwOdds(s.tier);
  const r = rng();
  if (r < odds.caught) return { state: { ...s, phase: 'caught' }, outcome: 'caught' };
  if (r < odds.caught + odds.retry) return { state: s, outcome: 'retry' };
  if (r < 1 - odds.angry) return { state: { ...s, phase: 'escaped' }, outcome: 'escaped' };
  // 화남: 강력이 되어(이미 강력·황금이면 그대로) 체력을 다 채우고 다시 싸운다
  const stays = s.tier === 'mighty' || s.tier === 'legend';
  const tier: Tier = stays ? s.tier : 'mighty';
  const level = stays ? s.level : rollTierLevel(rng, 'mighty', companionLevel);
  return {
    state: { ...s, tier, level, hits: 0, phase: 'question', timeLeftMs: TIER_RULES[tier].timeMs },
    outcome: 'angry',
  };
}

/** 어지러운 구구몬을 그냥 돌려보낸다 (캡슐이 없을 때 등) */
export function releaseWild(s: WildState): WildState {
  return s.phase === 'dizzy' ? { ...s, phase: 'released' } : s;
}

/** 야생 체력 막대 (1이 가득, 0이 어지러움) */
export function wildHpRatio(s: WildState): number {
  return Math.min(1, Math.max(0, 1 - s.hits / TIER_RULES[s.tier].hitsToDizzy));
}

/** 이 단계 적이 한 번에 주는 피해 */
export function damageOf(s: WildState): number {
  return TIER_RULES[s.tier].damage;
}
