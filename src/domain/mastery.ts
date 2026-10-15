/** 숙련도 모델(라이트너 상자) — 설계서 3-4 */
import { BASE_DANS, type Dan, type Fact, type FactId, FACTS, factsOfDan } from './facts';

export type Box = 0 | 1 | 2 | 3 | 4 | 5;
export const MAX_BOX: Box = 5;
export const MASTERY_BOX: Box = 4;
export type InputMode = 'choice' | 'keypad';

export interface FactStat {
  box: Box;
  /** 다음 복습 시각(epoch ms). null이면 아직 일정 없음(처음 보는 사실). */
  dueAt: number | null;
  attempts: number;
  correct: number;
  lastWrongAt: number | null;
  /** 마지막으로 상자가 올라간 날 'YYYY-MM-DD' (하루 1단계 승급 제한) */
  lastPromotedDate: string | null;
  /** 응답 시간 이동 평균 (ms). 0이면 기록 없음. */
  avgMs: number;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 정답 후 상자별 다음 복습까지 일수.
 * 틀린 직후에는 이 표와 무관하게 바로 복습 대상(다음 탐험)이 된다.
 * 처음 맞혀 상자 1이 된 사실은 그날 더 올라갈 수 없으므로 다음 날 복습한다.
 */
export const REVIEW_INTERVAL_DAYS: Record<Box, number> = { 0: 0, 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };

/** 규칙 문제(×0·×1·×10)는 상자 2에서 시작한다. */
export function initialFactStat(fact: Fact): FactStat {
  return {
    box: fact.isRule ? 2 : 0,
    dueAt: null,
    attempts: 0,
    correct: 0,
    lastWrongAt: null,
    lastPromotedDate: null,
    avgMs: 0,
  };
}

export function initialFactStats(): Record<FactId, FactStat> {
  return Object.fromEntries(FACTS.map((f) => [f.id, initialFactStat(f)])) as Record<FactId, FactStat>;
}

/** '빠른 정답' 기준 시간 (12·13단은 더 여유 있게) */
export function fastThresholdMs(fact: Fact, inputMode: InputMode): number {
  if (fact.isChallenge) return inputMode === 'choice' ? 7000 : 10000;
  return inputMode === 'choice' ? 5000 : 7000;
}

/** 이 상자에서 어떤 입력 방식을 쓰는지 (설계서 3-3) */
export function inputModeForBox(box: Box, forceChoice = false): InputMode {
  return forceChoice || box <= 2 ? 'choice' : 'keypad';
}

export interface AnswerEvent {
  correct: boolean;
  ms: number;
  inputMode: InputMode;
  /** 같은 탐험 안에서 재출제된 문제인가 */
  isRetry: boolean;
  now: number;
  /** 기기 현지 날짜 'YYYY-MM-DD' */
  today: string;
}

const AVG_ALPHA = 0.3;

/** 답 하나를 반영한 새 FactStat을 돌려준다 (원본 불변). */
export function applyAnswer(stat: FactStat, fact: Fact, ev: AnswerEvent): FactStat {
  const next: FactStat = {
    ...stat,
    attempts: stat.attempts + 1,
    correct: stat.correct + (ev.correct ? 1 : 0),
    avgMs: stat.avgMs === 0 ? ev.ms : Math.round(stat.avgMs * (1 - AVG_ALPHA) + ev.ms * AVG_ALPHA),
  };

  if (!ev.correct) {
    next.box = 1;
    next.lastWrongAt = ev.now;
    next.dueAt = ev.now;
    return next;
  }

  // 재출제 문제의 정답은 '회복' 표시만 하고 상자는 그대로 둔다.
  if (ev.isRetry) return next;

  const fast = ev.ms <= fastThresholdMs(fact, ev.inputMode);
  const wantsPromotion = stat.box <= 1 || fast;
  const alreadyPromotedToday = stat.lastPromotedDate === ev.today;

  if (wantsPromotion && !alreadyPromotedToday && stat.box < MAX_BOX) {
    next.box = (stat.box + 1) as Box;
    next.lastPromotedDate = ev.today;
  }
  next.dueAt = ev.now + REVIEW_INTERVAL_DAYS[next.box] * DAY_MS;
  return next;
}

/** 단의 사실 11개(×0~×10)가 모두 상자 4 이상이면 마스터 */
export function isDanMastered(facts: Record<FactId, FactStat>, dan: Dan): boolean {
  return factsOfDan(dan).every((f) => facts[f.id].box >= MASTERY_BOX);
}

/** 2~9단을 모두 마스터하면 12·13단 도전 모드가 열린다. */
export function isChallengeEligible(masteredDans: readonly Dan[]): boolean {
  return BASE_DANS.every((d) => masteredDans.includes(d));
}

/** 이번 답으로 새로 마스터된 단 목록 (이미 배지가 있는 단은 제외) */
export function newlyMasteredDans(facts: Record<FactId, FactStat>, alreadyMastered: readonly Dan[]): Dan[] {
  const dans = new Set(FACTS.map((f) => f.a));
  return [...dans].filter((d) => !alreadyMastered.includes(d) && isDanMastered(facts, d));
}

// ── 단별 최근 정답 기록 ──────────────────────────────

export const DAN_RECENT_SIZE = 30;

export function pushDanRecent(recent: readonly boolean[], correct: boolean): boolean[] {
  return [...recent, correct].slice(-DAN_RECENT_SIZE);
}

/** 라플라스 평활화한 최근 오답률: (오답+1)/(시도+4) */
export function danErrorRate(recent: readonly boolean[]): number {
  const wrong = recent.filter((c) => !c).length;
  return (wrong + 1) / (recent.length + 4);
}

export const DAN_FACTOR_MIN = 0.5;
export const DAN_FACTOR_MAX = 2.5;

/** 출제 가중치에 곱하는 단 계수 0.5~2.5 (기록 없는 단은 약 1.1) */
export function danFactor(recent: readonly boolean[]): number {
  return Math.min(DAN_FACTOR_MAX, Math.max(DAN_FACTOR_MIN, 0.5 + 2.5 * danErrorRate(recent)));
}
