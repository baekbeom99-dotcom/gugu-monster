/** 학습 기록 화면용 요약 — 설계서 9-2 */
import { localDateString } from './dates';
import { ALL_DANS, type Dan, type FactId, factsOfDan, getFact } from './facts';
import { type FactStat, MASTERY_BOX } from './mastery';
import type { LearningData } from './progress';
import { QUESTION_TYPES, type QuestionType } from './questionGen';

/** 구구단 지도 칸의 단계. 처음 보는 사실은 상자와 상관없이 'new'. */
export type MasteryLevel = 'new' | 'practice' | 'learning' | 'growing' | 'familiar' | 'perfect';

export const LEVEL_LABELS: Record<MasteryLevel, string> = {
  new: '아직 안 풀었어요',
  practice: '연습 중',
  learning: '익히는 중',
  growing: '거의 다 왔어요',
  familiar: '익숙해요',
  perfect: '완벽해요',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  product: '답 구하기',
  missingFirst: '앞 수 찾기',
  missingSecond: '뒤 수 찾기',
  commutative: '바꿔 곱하기',
  sequence: '뛰어 세기',
};

export function masteryLevel(stat: FactStat): MasteryLevel {
  if (stat.attempts === 0) return 'new';
  switch (stat.box) {
    case 0:
    case 1:
      // 상자 1은 '틀려서 내려온' 경우와 '처음 맞혀서 올라온' 경우가 있다. 연습 중은 앞의 경우만.
      return stat.lastWrongAt !== null ? 'practice' : 'learning';
    case 2:
      return 'learning';
    case 3:
      return 'growing';
    case 4:
      return 'familiar';
    case 5:
      return 'perfect';
  }
}

export interface DanProgress {
  dan: Dan;
  /** 상자 4 이상인 사실 수 (0~11) */
  familiar: number;
  total: number;
  mastered: boolean;
  locked: boolean;
}

export function danProgress(learning: LearningData): DanProgress[] {
  return ALL_DANS.map((dan) => {
    const facts = factsOfDan(dan);
    return {
      dan,
      familiar: facts.filter((f) => learning.facts[f.id].box >= MASTERY_BOX && learning.facts[f.id].attempts > 0).length,
      total: facts.length,
      mastered: learning.masteredDans.includes(dan),
      locked: dan >= 12 && !learning.challengeUnlocked,
    };
  });
}

export interface TypeAccuracy {
  type: QuestionType;
  label: string;
  attempts: number;
  correct: number;
  /** 시도가 없으면 null */
  rate: number | null;
}

export interface RecordsSummary {
  todayAttempts: number;
  todayCorrect: number;
  totalAttempts: number;
  explorations: number;
  studyDays: number;
  overcomeTotal: number;
  typeAccuracy: TypeAccuracy[];
  /** 최근 극복한 문제 (최신 순, 중복 없이 최대 6개) */
  recentOvercome: FactId[];
  /** 지금 '연습 중'인 문제 (최근에 틀린 순, 최대 6개) */
  practicing: FactId[];
}

export const LIST_LIMIT = 6;

export function summarize(learning: LearningData, now: number): RecordsSummary {
  const today = localDateString(now);
  const todayRecord = learning.dailyAttempts.find((d) => d.date === today);

  const recentOvercome: FactId[] = [];
  for (const o of [...learning.overcomeLog].reverse()) {
    if (!recentOvercome.includes(o.factId)) recentOvercome.push(o.factId);
    if (recentOvercome.length === LIST_LIMIT) break;
  }

  const practicing = (Object.entries(learning.facts) as [FactId, FactStat][])
    .filter(([id, s]) => masteryLevel(s) === 'practice' && (!getFact(id).isChallenge || learning.challengeUnlocked))
    .sort(([, x], [, y]) => (y.lastWrongAt ?? 0) - (x.lastWrongAt ?? 0))
    .slice(0, LIST_LIMIT)
    .map(([id]) => id);

  return {
    todayAttempts: todayRecord?.attempts ?? 0,
    todayCorrect: todayRecord?.correct ?? 0,
    totalAttempts: learning.totalAttempts,
    explorations: learning.totalExplorations,
    studyDays: learning.studyDays.length,
    overcomeTotal: learning.totalOvercome,
    typeAccuracy: QUESTION_TYPES.map((type) => {
      const { attempts, correct } = learning.typeStats[type];
      return { type, label: QUESTION_TYPE_LABELS[type], attempts, correct, rate: attempts > 0 ? correct / attempts : null };
    }),
    recentOvercome,
    practicing,
  };
}
