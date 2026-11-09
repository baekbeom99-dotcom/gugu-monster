// 야생 구구몬과의 만남 규칙 (순수 로직: 시간·무작위는 인자로만 받는다)
import type { Fact } from '../facts';
import type { Box } from '../mastery';
import type { QuestionType } from '../questionGen';
import type { Rng } from '../random';

export const WILD_MAX_HP = 100;
export const HIT_DAMAGE = 40;
export const FAST_HIT_BONUS = 10;
export const REGEN_PER_SEC = 3;
export const CATCH_CHANCE = 0.3;
export const CATCH_STEP = 0.15;
export const ESCAPE_HP = 40;
export const WILD_MAX_QUESTIONS = 12;
export const MAX_TICK_MS = 250;

export type WildPhase = 'question' | 'anim' | 'hint' | 'dizzy' | 'caught' | 'fled';

export interface WildState {
  hp: number;
  /** HP가 꽉 찬 채로 문제가 떠 있던 시간(ms) */
  fullMs: number;
  phase: WildPhase;
  catchChance: number;
  questions: number;
  correct: number;
  asleep: boolean;
}

export function createWild(): WildState {
  return {
    hp: WILD_MAX_HP,
    fullMs: 0,
    phase: 'question',
    catchChance: CATCH_CHANCE,
    questions: 0,
    correct: 0,
    asleep: false,
  };
}

/** 문제가 떠 있는 동안에만 시간이 흐른다. */
export function tick(s: WildState, dtMs: number, fleeMs: number): WildState {
  if (s.phase !== 'question') return s;
  const dt = Math.min(Math.max(dtMs, 0), MAX_TICK_MS);
  if (s.hp < WILD_MAX_HP) {
    const hp = Math.min(WILD_MAX_HP, s.hp + (REGEN_PER_SEC * dt) / 1000);
    return { ...s, hp, fullMs: 0 };
  }
  const fullMs = s.fullMs + dt;
  if (fullMs >= fleeMs) return { ...s, fullMs, phase: 'fled' };
  return { ...s, fullMs };
}

export function answerWild(s: WildState, correct: boolean, fast: boolean): WildState {
  if (s.phase !== 'question') return s;
  const questions = s.questions + 1;
  let hp = s.hp;
  let phase: WildPhase;
  if (correct) {
    hp = Math.max(0, hp - (HIT_DAMAGE + (fast ? FAST_HIT_BONUS : 0)));
    phase = hp <= 0 ? 'dizzy' : 'anim';
  } else {
    phase = 'hint';
  }
  let asleep = s.asleep;
  if (questions >= WILD_MAX_QUESTIONS && hp > 0) {
    asleep = true;
    phase = 'dizzy';
  }
  return { ...s, hp, phase, questions, correct: s.correct + (correct ? 1 : 0), asleep };
}

export function resumeWild(s: WildState): WildState {
  if (s.phase !== 'anim' && s.phase !== 'hint') return s;
  return { ...s, phase: 'question', fullMs: 0 };
}

export function throwCapsule(s: WildState, rng: Rng): WildState {
  if (s.phase !== 'dizzy') return s;
  if (rng() < s.catchChance) return { ...s, phase: 'caught' };
  return {
    ...s,
    hp: ESCAPE_HP,
    catchChance: Math.min(1, s.catchChance + CATCH_STEP),
    fullMs: 0,
    asleep: false,
    phase: 'question',
  };
}

const FLEE_BASE_LOW_MS = 7000;
const FLEE_BASE_MID_MS = 9000;
const FLEE_BASE_HIGH_MS = 12000;
const FLEE_LOW_BOX_BONUS_MS = 3000;
const FLEE_MISSING_BONUS_MS = 2000;

/** 도망가기까지 기다려 주는 시간(ms). 어려운 문제일수록 길다. */
export function fleeTimeMs(fact: Fact, box: Box, type: QuestionType, scale: number): number {
  let ms = fact.a >= 12 ? FLEE_BASE_HIGH_MS : fact.a >= 6 ? FLEE_BASE_MID_MS : FLEE_BASE_LOW_MS;
  if (box <= 1) ms += FLEE_LOW_BOX_BONUS_MS;
  if (type === 'missingFirst' || type === 'missingSecond') ms += FLEE_MISSING_BONUS_MS;
  return ms * scale;
}
