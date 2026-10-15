/** 개인화 출제 알고리즘 — 설계서 3-5, 3-7 */
import {
  BASE_DANS,
  CHALLENGE_DANS,
  type Dan,
  type Fact,
  type FactId,
  FACTS,
  factId,
  getFact,
  type Multiplier,
  RULE_MULTIPLIERS,
} from './facts';
import { type Box, DAY_MS, danFactor, type FactStat, MASTERY_BOX } from './mastery';
import { isTypeEligible, pickQuestionType, type QuestionType } from './questionGen';
import { pickOne, type Rng, randomInt, shuffle, weightedPick } from './random';

export interface LearnerSnapshot {
  facts: Record<FactId, FactStat>;
  danRecent: Partial<Record<Dan, boolean[]>>;
  challengeUnlocked: boolean;
}

export type ExploreMode = { kind: 'recommended' } | { kind: 'dan'; dan: Dan } | { kind: 'diagnostic' };

export interface PlannedItem {
  factId: FactId;
  type: QuestionType;
  /** 같은 탐험 안에서 오답 후 다시 낸 문제 */
  isRetry: boolean;
  /** 몬스터마다 넣는 '자신감 문제' (상자 3 이상, 4 이상 우선) */
  isConfidence: boolean;
}

export const EXPLORATION_SIZE = 9;
export const QUESTIONS_PER_MONSTER = 3;
export const MAX_DAN_SHARE = 0.4;
export const MAX_CHALLENGE_SHARE = 0.3;
export const DAN_MODE_SELECTED_SHARE = 0.7;
export const MAX_NEW_PER_EXPLORATION = 3;
export const MAX_RULE_PER_EXPLORATION = 2;
export const SEQUENCE_CHANCE = 0.5;
export const MAX_RETRIES = 4;
export const CONFIDENCE_MIN_BOX: Box = 3;
export const MAX_REVIEW_SLOTS = 3;

/** 틀린 뒤 아직 회복하지 못했고(상자 1) 복습 시점이 된 사실 */
export function isWrongReviewDue(stat: FactStat, now: number): boolean {
  return stat.box === 1 && stat.lastWrongAt !== null && stat.dueAt !== null && stat.dueAt <= now;
}

export const BOX_WEIGHT: Record<Box, number> = { 0: 2.0, 1: 4.0, 2: 2.5, 3: 1.5, 4: 0.8, 5: 0.4 };
const RULE_FACTOR = 0.5;

export function dueFactor(stat: FactStat, now: number): number {
  if (stat.dueAt === null) return 1;
  if (now < stat.dueAt) return 0.6;
  const daysOver = Math.floor((now - stat.dueAt) / DAY_MS);
  return 1 + Math.min(daysOver, 4) * 0.25;
}

export function factWeight(fact: Fact, stat: FactStat, recent: readonly boolean[], now: number): number {
  return BOX_WEIGHT[stat.box] * dueFactor(stat, now) * danFactor(recent) * (fact.isRule ? RULE_FACTOR : 1);
}

export function availableDans(challengeUnlocked: boolean): Dan[] {
  return challengeUnlocked ? [...BASE_DANS, ...CHALLENGE_DANS] : [...BASE_DANS];
}

/** 탐험 한 번의 문제 목록을 만든다. */
export function planExploration(
  learner: LearnerSnapshot,
  mode: ExploreMode,
  now: number,
  rng: Rng,
): PlannedItem[] {
  if (mode.kind === 'diagnostic') return planDiagnostic(rng);

  const dans = availableDans(learner.challengeUnlocked);
  if (mode.kind === 'dan' && !dans.includes(mode.dan)) {
    throw new Error(`${mode.dan}단은 아직 열리지 않았다`);
  }

  const pool = FACTS.filter((f) => dans.includes(f.a));
  const statOf = (f: Fact) => learner.facts[f.id];
  const weightOf = (f: Fact) => factWeight(f, statOf(f), learner.danRecent[f.a] ?? [], now);

  const chosen: Fact[] = [];
  const confidence: Fact[] = [];

  /** level 0: 모든 제약 / 1: 신규·규칙 개수 제약 완화 / 2: 단 구성 제약까지 완화 */
  const canAdd = (f: Fact, level: number): boolean => {
    if (chosen.includes(f)) return false;
    if (level < 2 && !fitsDanComposition(f, chosen, mode)) return false;
    if (level < 1) {
      if (statOf(f).box === 0 && chosen.filter((c) => statOf(c).box === 0).length >= MAX_NEW_PER_EXPLORATION) {
        return false;
      }
      if (f.isRule && chosen.filter((c) => c.isRule).length >= MAX_RULE_PER_EXPLORATION) return false;
    }
    return true;
  };

  // 0) 오답 복습 슬롯: 지난 탐험에서 틀려 상자 1에 있는 사실은 다음 탐험에 반드시 다시 낸다.
  for (let i = 0; i < MAX_REVIEW_SLOTS; i++) {
    const candidates = pool.filter((f) => isWrongReviewDue(statOf(f), now) && canAdd(f, 0));
    const pick = weightedPick(rng, candidates, weightOf);
    if (!pick) break;
    chosen.push(pick);
  }

  // 1) 몬스터마다 자신감 문제 1개씩: 상자 3 이상(4 이상 우선), 복습 시점이 된 것 우선
  //    → 같은 자신감 문제만 계속 나오지 않게 한다.
  const confidenceWeight = (f: Fact) =>
    dueFactor(statOf(f), now) * (statOf(f).box >= MASTERY_BOX ? 1 : 0.5) * (mode.kind === 'dan' && f.a === mode.dan ? 3 : 1);
  const monsters = EXPLORATION_SIZE / QUESTIONS_PER_MONSTER;
  for (let i = 0; i < monsters; i++) {
    const candidates = pool.filter((f) => statOf(f).box >= CONFIDENCE_MIN_BOX && canAdd(f, 0));
    const pick = weightedPick(rng, candidates, confidenceWeight);
    if (!pick) break;
    chosen.push(pick);
    confidence.push(pick);
  }

  // 2) 나머지는 가중치 추출. 후보가 모자라면 제약을 단계적으로 완화한다.
  for (let level = 0; level <= 2 && chosen.length < EXPLORATION_SIZE; level++) {
    while (chosen.length < EXPLORATION_SIZE) {
      const candidates = pool.filter((f) => canAdd(f, level));
      const pick = weightedPick(rng, candidates, weightOf);
      if (!pick) break;
      chosen.push(pick);
    }
  }

  const ordered = orderEasyHardEasy(chosen, confidence, (f) => statOf(f).box, weightOf);
  return assignTypes(ordered, confidence, (f) => statOf(f).box, rng);
}

function fitsDanComposition(f: Fact, chosen: readonly Fact[], mode: ExploreMode): boolean {
  if (mode.kind === 'dan') {
    const selectedMax = Math.round(EXPLORATION_SIZE * DAN_MODE_SELECTED_SHARE);
    const isSelected = f.a === mode.dan;
    const count = chosen.filter((c) => (c.a === mode.dan) === isSelected).length;
    return count < (isSelected ? selectedMax : EXPLORATION_SIZE - selectedMax);
  }
  const perDanMax = Math.floor(EXPLORATION_SIZE * MAX_DAN_SHARE);
  if (chosen.filter((c) => c.a === f.a).length >= perDanMax) return false;
  if (f.isChallenge) {
    const challengeMax = Math.floor(EXPLORATION_SIZE * MAX_CHALLENGE_SHARE);
    if (chosen.filter((c) => c.isChallenge).length >= challengeMax) return false;
  }
  return true;
}

/**
 * 쉬운 문제 → 어려운 문제 → 쉬운 문제 순서.
 * 자신감 문제는 0·4·8번(몬스터마다 1개, 시작과 끝은 성공 경험),
 * 나머지는 어려운 것부터 가운데 자리에 놓는다.
 */
function orderEasyHardEasy(
  chosen: readonly Fact[],
  confidence: readonly Fact[],
  boxOf: (f: Fact) => Box,
  weightOf: (f: Fact) => number,
): Fact[] {
  const slots: (Fact | null)[] = Array(chosen.length).fill(null);
  const last = chosen.length - 1;
  // 3개면 몬스터마다 하나씩(0, 4, 8), 그보다 적으면 시작과 끝부터
  const confidenceSlots = confidence.length >= 3 ? [0, Math.floor(last / 2), last] : [0, last];
  confidence.forEach((f, i) => {
    slots[confidenceSlots[i]] = f;
  });

  const rest = chosen
    .filter((f) => !confidence.includes(f))
    .sort((x, y) => boxOf(x) - boxOf(y) || weightOf(y) - weightOf(x));

  const center = (chosen.length - 1) / 2;
  const fillOrder = slots
    .map((_, i) => i)
    .filter((i) => slots[i] === null)
    .sort((i, j) => Math.abs(i - center) - Math.abs(j - center) || i - j);

  rest.forEach((f, k) => {
    slots[fillOrder[k]] = f;
  });
  return slots as Fact[];
}

function assignTypes(ordered: readonly Fact[], confidence: readonly Fact[], boxOf: (f: Fact) => Box, rng: Rng): PlannedItem[] {
  const items: PlannedItem[] = ordered.map((f) => ({
    factId: f.id,
    type: pickQuestionType(rng, f, boxOf(f)),
    isRetry: false,
    isConfidence: confidence.includes(f),
  }));

  // ⑤ 뛰어 세기는 탐험당 최대 1개
  if (rng() < SEQUENCE_CHANCE) {
    const candidates = items.filter((it) => !it.isConfidence && isTypeEligible('sequence', getFact(it.factId), 0));
    if (candidates.length > 0) pickOne(rng, candidates).type = 'sequence';
  }
  return items;
}

/** 첫 탐험(진단): 2~9단에서 1개씩(곱하는 수 2~9) + 규칙 문제 1개, 모두 결과 찾기 */
export function planDiagnostic(rng: Rng): PlannedItem[] {
  const facts: FactId[] = BASE_DANS.map((a) => factId(a, randomInt(rng, 2, 9) as Multiplier));
  facts.push(factId(pickOne(rng, BASE_DANS), pickOne(rng, RULE_MULTIPLIERS)));
  return shuffle(rng, facts).map((id) => ({ factId: id, type: 'product', isRetry: false, isConfidence: false }));
}

// ── 재출제 큐 ──────────────────────────────────────

/**
 * currentIndex 문제를 틀렸을 때, 2~3문제 뒤에 다른 유형으로 다시 낸다.
 * 남은 문제가 모자라면 맨 뒤에 붙인다. 이미 MAX_RETRIES번 했으면 그대로 돌려준다.
 */
export function insertRetry(plan: readonly PlannedItem[], currentIndex: number, rng: Rng): PlannedItem[] {
  const usedRetries = plan.filter((it) => it.isRetry).length;
  if (usedRetries >= MAX_RETRIES) return [...plan];

  const wrong = plan[currentIndex];
  const fact = getFact(wrong.factId);
  // 틀린 직후 상자는 1이다.
  const retry: PlannedItem = {
    factId: wrong.factId,
    type: pickQuestionType(rng, fact, 1, wrong.type),
    isRetry: true,
    isConfidence: false,
  };
  const gap = randomInt(rng, 2, 3);
  const at = Math.min(currentIndex + 1 + gap, plan.length);
  return [...plan.slice(0, at), retry, ...plan.slice(at)];
}
