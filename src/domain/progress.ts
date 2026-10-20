/** 답·포획·탐험 종료를 학습 기록과 별에 반영하는 순수 함수들 */
import { localDateString } from './dates';
import { BASE_DANS, type Dan, type FactId, getFact, isChallengeDan } from './facts';
import { GROWTH_XP, STAR_REWARDS, isOvercome, type RewardLine, speedStars } from './economy';
import {
  applyAnswer,
  type FactStat,
  initialFactStats,
  type InputMode,
  isChallengeEligible,
  newlyMasteredDans,
  pushDanRecent,
} from './mastery';
import { QUESTION_TYPES, type QuestionType } from './questionGen';

export interface LearningData {
  facts: Record<FactId, FactStat>;
  danRecent: Partial<Record<Dan, boolean[]>>;
  typeStats: Record<QuestionType, { attempts: number; correct: number }>;
  masteredDans: Dan[];
  challengeUnlocked: boolean;
  challengeUnlockedBy: 'mastery' | 'admin' | null;
  studyDays: string[];
  totalExplorations: number;
  totalAttempts: number;
  overcomeLog: { factId: FactId; date: string }[];
  /** 지금까지 극복한 문제 수 (overcomeLog는 최근 것만 남기므로 따로 센다) */
  totalOvercome: number;
  /** 날짜별 푼 문제 수 (최근 DAILY_HISTORY_DAYS일) */
  dailyAttempts: { date: string; attempts: number; correct: number }[];
  /** 단 도전(단 골라 탐험) 기록: 최고 기록과 MASTER */
  danTrials: Partial<Record<Dan, DanTrialRecord>>;
  /** 단 도전에서 틀려 추천 탐험에 더 자주 낼 사실 → 남은 횟수 */
  boosted: Partial<Record<FactId, number>>;
}

export interface DanTrialRecord {
  /** 11문제를 모두 맞히는 데 걸린 가장 짧은 시간(ms) */
  bestMs: number | null;
  plays: number;
  master: boolean;
  masteredAt: string | null;
}

/** 단 도전: 11문제를 하나도 틀리지 않고 이 시간 안에 모두 맞히면 MASTER */
export const DAN_TRIAL_MASTER_MS = 33_000;
/** 단 도전에서 틀린 사실은 추천 탐험에서 이만큼 맞힐 때까지 더 자주 나온다 */
export const BOOST_COUNT = 3;

export interface EconomyData {
  stars: number;
  totalEarned: number;
  /** '오늘 첫 탐험' 보너스를 받은 날 (최근 7개) */
  dailyBonusDates: string[];
  /** 소모품 수량 (아이템 ID → 개수) */
  inventory: Record<string, number>;
  /** 영구 아이템 (장난감·모자) */
  owned: string[];
}

export const OVERCOME_LOG_SIZE = 30;
export const DAILY_HISTORY_DAYS = 30;

export function initialLearning(): LearningData {
  return {
    facts: initialFactStats(),
    danRecent: {},
    typeStats: Object.fromEntries(QUESTION_TYPES.map((t) => [t, { attempts: 0, correct: 0 }])) as LearningData['typeStats'],
    masteredDans: [],
    challengeUnlocked: false,
    challengeUnlockedBy: null,
    studyDays: [],
    totalExplorations: 0,
    totalAttempts: 0,
    overcomeLog: [],
    totalOvercome: 0,
    dailyAttempts: [],
    danTrials: {},
    boosted: {},
  };
}

export function initialEconomy(): EconomyData {
  return { stars: 0, totalEarned: 0, dailyBonusDates: [], inventory: {}, owned: [] };
}

export function addStars(economy: EconomyData, stars: number): EconomyData {
  return { ...economy, stars: economy.stars + stars, totalEarned: economy.totalEarned + stars };
}

export interface AnswerInput {
  factId: FactId;
  type: QuestionType;
  correct: boolean;
  ms: number;
  inputMode: InputMode;
  isRetry: boolean;
  /** 이번 탐험에서 이 사실을 처음 만났는가 (오답 극복 판정) */
  firstAttemptInBattle: boolean;
  battleStartedAt: number;
  now: number;
  /** trial: 단 도전(단 골라 탐험), normal: 추천·진단 탐험 */
  source?: 'trial' | 'normal';
  /** 추천 탐험: 정답 별을 푼 시간에 반비례해서 준다 */
  speedBonus?: boolean;
}

export interface AnswerOutcome {
  learning: LearningData;
  economy: EconomyData;
  overcome: boolean;
  /** 이 답으로 얻은 별 (정답 1 또는 빠르기 별 2~5 + 극복 2) */
  stars: number;
  /** 그중 정답 별 (극복 보너스 제외) */
  baseStars: number;
  /** 펫 성장 XP (시도 1 + 정답 1 + 극복 3) */
  xp: number;
}

export function recordAnswer(learning: LearningData, economy: EconomyData, input: AnswerInput): AnswerOutcome {
  const fact = getFact(input.factId);
  const today = localDateString(input.now);
  const statBefore = learning.facts[fact.id];

  const overcome = isOvercome({
    statBefore,
    correct: input.correct,
    isRetry: input.isRetry,
    firstAttemptInBattle: input.firstAttemptInBattle,
    battleStartedAt: input.battleStartedAt,
    factId: fact.id,
    overcomeLog: learning.overcomeLog,
    today,
  });

  const typeStat = learning.typeStats[input.type];
  const nextLearning: LearningData = {
    ...learning,
    facts: {
      ...learning.facts,
      [fact.id]: applyAnswer(statBefore, fact, {
        correct: input.correct,
        ms: input.ms,
        inputMode: input.inputMode,
        isRetry: input.isRetry,
        now: input.now,
        today,
      }),
    },
    danRecent: { ...learning.danRecent, [fact.a]: pushDanRecent(learning.danRecent[fact.a] ?? [], input.correct) },
    typeStats: {
      ...learning.typeStats,
      [input.type]: { attempts: typeStat.attempts + 1, correct: typeStat.correct + (input.correct ? 1 : 0) },
    },
    studyDays: learning.studyDays.includes(today) ? learning.studyDays : [...learning.studyDays, today],
    totalAttempts: learning.totalAttempts + 1,
    overcomeLog: overcome
      ? [...learning.overcomeLog, { factId: fact.id, date: today }].slice(-OVERCOME_LOG_SIZE)
      : learning.overcomeLog,
    totalOvercome: learning.totalOvercome + (overcome ? 1 : 0),
    dailyAttempts: bumpDaily(learning.dailyAttempts, today, input.correct),
    boosted: updateBoost(learning.boosted ?? {}, fact.id, input),
  };

  const baseStars = input.correct ? (input.speedBonus ? speedStars(input.ms) : STAR_REWARDS.correct) : 0;
  const stars = baseStars + (overcome ? STAR_REWARDS.overcome : 0);
  const xp = GROWTH_XP.attempt + (input.correct ? GROWTH_XP.correctBonus : 0) + (overcome ? GROWTH_XP.overcome : 0);
  return { learning: nextLearning, economy: addStars(economy, stars), overcome, stars, baseStars, xp };
}

/** 단 도전에서 틀리면 부스트를 걸고, 추천 탐험에서 처음 만나 맞히면 하나씩 줄인다 */
function updateBoost(boosted: Partial<Record<FactId, number>>, id: FactId, input: AnswerInput): Partial<Record<FactId, number>> {
  if (input.source === 'trial') {
    return input.correct ? boosted : { ...boosted, [id]: BOOST_COUNT };
  }
  const left = boosted[id] ?? 0;
  if (left <= 0 || !input.correct || input.isRetry) return boosted;
  const next = { ...boosted };
  if (left <= 1) delete next[id];
  else next[id] = left - 1;
  return next;
}

export interface TrialOutcome {
  learning: LearningData;
  economy: EconomyData;
  timeMs: number;
  /** 이번 도전에서 틀린 횟수 */
  mistakes: number;
  record: DanTrialRecord;
  newBest: boolean;
  /** 이번에 처음 MASTER가 됐다 */
  justMastered: boolean;
  bonus: number;
}

/** 단 도전을 끝까지 마쳤을 때: 최고 기록, MASTER(오답 0개 + 33초 안), 처음 MASTER면 보너스 별 */
export function finishDanTrial(
  learning: LearningData,
  economy: EconomyData,
  args: { dan: Dan; timeMs: number; mistakes: number; now: number },
): TrialOutcome {
  const prev: DanTrialRecord = learning.danTrials?.[args.dan] ?? { bestMs: null, plays: 0, master: false, masteredAt: null };
  const newBest = prev.bestMs === null || args.timeMs < prev.bestMs;
  const fast = args.timeMs <= DAN_TRIAL_MASTER_MS && args.mistakes === 0;
  const justMastered = fast && !prev.master;
  const record: DanTrialRecord = {
    bestMs: newBest ? args.timeMs : prev.bestMs,
    plays: prev.plays + 1,
    master: prev.master || fast,
    masteredAt: justMastered ? localDateString(args.now) : prev.masteredAt,
  };
  const bonus = justMastered ? (isChallengeDan(args.dan) ? STAR_REWARDS.trialMasterChallenge : STAR_REWARDS.trialMaster) : 0;
  return {
    learning: { ...learning, danTrials: { ...learning.danTrials, [args.dan]: record } },
    economy: addStars(economy, bonus),
    timeMs: args.timeMs,
    mistakes: args.mistakes,
    record,
    newBest,
    justMastered,
    bonus,
  };
}

/**
 * 12·13단 도전 모드를 열 수 있는가: 2~9단을 모두 '단 마스터'(숙련도 배지)로 받았거나,
 * 2~9단 단 도전에서 모두 MASTER(오답 0개 + 33초 안)를 받았다.
 */
export function challengeEligible(learning: Pick<LearningData, 'masteredDans' | 'danTrials'>): boolean {
  return isChallengeEligible(learning.masteredDans ?? []) || BASE_DANS.every((d) => learning.danTrials?.[d]?.master);
}

/** 조건을 이미 채웠는데 닫혀 있으면 연다 (예전 저장 데이터 고치기). 그 밖의 기록은 그대로 둔다. */
export function repairChallengeUnlock(learning: LearningData): LearningData {
  if (learning.challengeUnlocked || !challengeEligible(learning)) return learning;
  return { ...learning, challengeUnlocked: true, challengeUnlockedBy: 'mastery' };
}

function bumpDaily(days: LearningData['dailyAttempts'], today: string, correct: boolean): LearningData['dailyAttempts'] {
  const last = days[days.length - 1];
  const add = correct ? 1 : 0;
  if (last?.date === today) {
    return [...days.slice(0, -1), { date: today, attempts: last.attempts + 1, correct: last.correct + add }];
  }
  return [...days, { date: today, attempts: 1, correct: add }].slice(-DAILY_HISTORY_DAYS);
}

export function captureStars(golden: boolean): number {
  return golden ? STAR_REWARDS.captureGolden : STAR_REWARDS.capture;
}

export interface FinishOutcome {
  learning: LearningData;
  economy: EconomyData;
  bonuses: RewardLine[];
  newlyMastered: Dan[];
  challengeJustUnlocked: boolean;
  /** 펫 성장 XP (완료 10 + 단 마스터 30/40) */
  xp: number;
}

/**
 * 탐험 종료 정산. 끝까지 마치지 않았으면(completed=false) 완료·첫 탐험 보너스는 없고,
 * 이미 기록된 답으로 단 마스터가 됐다면 그 보상은 준다.
 */
export function finishExploration(
  learning: LearningData,
  economy: EconomyData,
  args: { completed: boolean; now: number },
): FinishOutcome {
  const today = localDateString(args.now);
  const bonuses: RewardLine[] = [];
  let nextEconomy = economy;

  if (args.completed) {
    bonuses.push({ label: '탐험 완료', stars: STAR_REWARDS.complete });
    if (!economy.dailyBonusDates.includes(today)) {
      bonuses.push({ label: '오늘 첫 탐험', stars: STAR_REWARDS.firstOfDay });
      nextEconomy = { ...nextEconomy, dailyBonusDates: [...economy.dailyBonusDates, today].slice(-7) };
    }
  }

  const newlyMastered = newlyMasteredDans(learning.facts, learning.masteredDans);
  for (const dan of newlyMastered) {
    bonuses.push({
      label: `${dan}단 마스터`,
      stars: isChallengeDan(dan) ? STAR_REWARDS.challengeDanMaster : STAR_REWARDS.danMaster,
    });
  }
  const masteredDans = [...learning.masteredDans, ...newlyMastered];
  const challengeJustUnlocked = !learning.challengeUnlocked && challengeEligible({ masteredDans, danTrials: learning.danTrials });

  nextEconomy = addStars(nextEconomy, bonuses.reduce((sum, b) => sum + b.stars, 0));

  return {
    learning: {
      ...learning,
      masteredDans,
      totalExplorations: learning.totalExplorations + (args.completed ? 1 : 0),
      challengeUnlocked: learning.challengeUnlocked || challengeJustUnlocked,
      challengeUnlockedBy: challengeJustUnlocked ? 'mastery' : learning.challengeUnlockedBy,
    },
    economy: nextEconomy,
    bonuses,
    newlyMastered,
    challengeJustUnlocked,
    xp:
      (args.completed ? GROWTH_XP.complete : 0) +
      newlyMastered.reduce((sum, d) => sum + (isChallengeDan(d) ? GROWTH_XP.challengeDanMaster : GROWTH_XP.danMaster), 0),
  };
}
