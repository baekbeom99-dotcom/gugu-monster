/** 전투 상태 머신 — 설계서 4-1, 4-3. 실패 상태가 없다. */
import { type Dan, type FactId, getFact } from './facts';
import { pickOne, type Rng, shuffle } from './random';
import { insertRetry, type PlannedItem, QUESTIONS_PER_MONSTER } from './scheduler';

export const MONSTER_COUNT = 3;
export const MONSTER_HP = 3;
/** 이만큼 풀면 남은 몬스터는 '지쳐서 잠들어' 포획 처리 */
export const MAX_ATTEMPTS = 14;
export const CRITICAL_MS = 3000;
export const COMBO_STEP = 3;

export const MONSTER_KINDS = ['jelly', 'cloud', 'mushroom', 'pebble', 'ghost', 'fluff'] as const;
export type MonsterKind = (typeof MONSTER_KINDS)[number];

export interface MonsterSlot {
  kind: MonsterKind;
  /** 몸 색을 정하는 단 */
  dan: Dan;
  /** 12·13단 문제가 섞인 몬스터 */
  golden: boolean;
  hp: number;
  status: 'waiting' | 'active' | 'captured' | 'sleeping';
}

export type BattlePhase = 'question' | 'hint' | 'done';

export interface LastHit {
  correct: boolean;
  critical: boolean;
  /** 이번 답으로 몬스터를 잡았는가 */
  captured: boolean;
  /** 콤보 연출을 보여줄 차례인가 (3, 6, 9…) */
  comboBurst: boolean;
}

export interface BattleState {
  plan: PlannedItem[];
  index: number;
  monsters: MonsterSlot[];
  current: number;
  attempts: number;
  correctCount: number;
  combo: number;
  maxCombo: number;
  phase: BattlePhase;
  /** 이번 탐험에서 이미 만난 사실 (오답 극복 판정용) */
  seenFacts: FactId[];
  last: LastHit | null;
}

export function createBattle(plan: PlannedItem[], rng: Rng): BattleState {
  const kinds = shuffle(rng, MONSTER_KINDS);
  const monsters: MonsterSlot[] = Array.from({ length: MONSTER_COUNT }, (_, m) => {
    const group = plan.slice(m * QUESTIONS_PER_MONSTER, (m + 1) * QUESTIONS_PER_MONSTER).map((it) => getFact(it.factId));
    const golden = group.some((f) => f.isChallenge);
    const dans = group.length > 0 ? group.map((f) => f.a) : [2 as Dan];
    return {
      kind: kinds[m],
      dan: golden ? group.find((f) => f.isChallenge)!.a : pickOne(rng, dans),
      golden,
      hp: MONSTER_HP,
      status: m === 0 ? 'active' : 'waiting',
    };
  });
  return {
    plan,
    index: 0,
    monsters,
    current: 0,
    attempts: 0,
    correctCount: 0,
    combo: 0,
    maxCombo: 0,
    phase: 'question',
    seenFacts: [],
    last: null,
  };
}

export function currentItem(state: BattleState): PlannedItem | null {
  return state.phase === 'done' ? null : (state.plan[state.index] ?? null);
}

/** 계획한 문제를 다 썼는데 몬스터가 남았으면 문제를 더 붙여야 한다. */
export function needsMoreQuestions(state: BattleState): boolean {
  return state.phase === 'question' && state.index >= state.plan.length;
}

export function isFirstAttempt(state: BattleState, factId: FactId): boolean {
  return !state.seenFacts.includes(factId);
}

export function answer(state: BattleState, correct: boolean, ms: number, rng: Rng): BattleState {
  if (state.phase !== 'question') return state;
  const item = state.plan[state.index];
  if (!item) return state;

  const attempts = state.attempts + 1;
  const seenFacts = state.seenFacts.includes(item.factId) ? state.seenFacts : [...state.seenFacts, item.factId];

  if (!correct) {
    return {
      ...state,
      plan: insertRetry(state.plan, state.index, rng),
      attempts,
      combo: 0,
      phase: 'hint',
      seenFacts,
      last: { correct: false, critical: false, captured: false, comboBurst: false },
    };
  }

  const monsters = state.monsters.map((m) => ({ ...m }));
  const target = monsters[state.current];
  target.hp -= 1;
  const captured = target.hp <= 0;
  let current = state.current;
  if (captured) {
    target.status = 'captured';
    current += 1;
    if (current < monsters.length) monsters[current].status = 'active';
  }
  const combo = state.combo + 1;

  return settleAttemptLimit({
    ...state,
    index: state.index + 1,
    monsters,
    current,
    attempts,
    correctCount: state.correctCount + 1,
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    phase: current >= monsters.length ? 'done' : 'question',
    seenFacts,
    last: { correct: true, critical: ms <= CRITICAL_MS, captured, comboBurst: combo % COMBO_STEP === 0 },
  });
}

/** 힌트를 보고 정답을 짚으면 다음 문제로 */
export function finishHint(state: BattleState): BattleState {
  if (state.phase !== 'hint') return state;
  return settleAttemptLimit({ ...state, index: state.index + 1, phase: 'question' });
}

export function extendPlan(state: BattleState, items: PlannedItem[]): BattleState {
  return { ...state, plan: [...state.plan, ...items] };
}

/** 시도 상한에 닿으면 남은 몬스터는 잠들어 포획된다 (실패 없음). */
function settleAttemptLimit(state: BattleState): BattleState {
  if (state.phase !== 'question' || state.attempts < MAX_ATTEMPTS) return state;
  return {
    ...state,
    monsters: state.monsters.map((m) => (m.status === 'captured' ? m : { ...m, hp: 0, status: 'sleeping' })),
    current: state.monsters.length,
    phase: 'done',
  };
}
