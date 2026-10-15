/** 별 획득 규칙 — 설계서 5-1 */
import type { FactId } from './facts';
import type { FactStat } from './mastery';

export const STAR_REWARDS = {
  correct: 1,
  capture: 2,
  captureGolden: 3,
  complete: 3,
  overcome: 2,
  firstOfDay: 5,
  danMaster: 20,
  challengeDanMaster: 40,
  /** 펫이 부화할 때 주는 시작 선물 */
  startGift: 10,
} as const;

/** 펫 성장 XP — 설계서 7-1. 시도만 해도 XP를 줘서 오답이 많아도 비슷하게 자란다. */
export const GROWTH_XP = {
  attempt: 1,
  correctBonus: 1,
  complete: 10,
  overcome: 3,
  danMaster: 30,
  challengeDanMaster: 40,
} as const;

export interface RewardLine {
  label: string;
  stars: number;
}

/**
 * 오답 극복: 이전 탐험에서 틀려 아직 '연습 필요'(상자 1)인 사실을,
 * 이번 탐험에서 처음 만났을 때 맞힘. 같은 사실은 하루 1번만 인정한다.
 */
export function isOvercome(args: {
  statBefore: FactStat;
  correct: boolean;
  isRetry: boolean;
  firstAttemptInBattle: boolean;
  battleStartedAt: number;
  factId: FactId;
  overcomeLog: readonly { factId: FactId; date: string }[];
  today: string;
}): boolean {
  const { statBefore, correct, isRetry, firstAttemptInBattle, battleStartedAt, factId, overcomeLog, today } = args;
  if (!correct || isRetry || !firstAttemptInBattle) return false;
  if (statBefore.box !== 1) return false;
  if (statBefore.lastWrongAt === null || statBefore.lastWrongAt >= battleStartedAt) return false;
  return !overcomeLog.some((o) => o.factId === factId && o.date === today);
}
