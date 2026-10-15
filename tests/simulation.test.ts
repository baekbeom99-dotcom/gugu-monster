/** 가상 학생으로 개인화 출제가 의도대로 움직이는지 확인 — 설계서 12-2 */
import { describe, expect, it } from 'vitest';
import { localDateString } from '../src/domain/dates';
import { type Dan, type Fact, getFact } from '../src/domain/facts';
import {
  applyAnswer,
  DAY_MS,
  initialFactStats,
  inputModeForBox,
  isChallengeEligible,
  newlyMasteredDans,
  pushDanRecent,
} from '../src/domain/mastery';
import { type Rng, seededRng } from '../src/domain/random';
import { insertRetry, type LearnerSnapshot, planExploration } from '../src/domain/scheduler';

interface SimStudent {
  /** 이 사실을 맞힐 확률 */
  accuracy: (f: Fact) => number;
  /** 응답 시간(ms) */
  ms: (f: Fact) => number;
}

interface SimState extends LearnerSnapshot {
  masteredDans: Dan[];
}

function newState(): SimState {
  return { facts: initialFactStats(), danRecent: {}, challengeUnlocked: false, masteredDans: [] };
}

/** 탐험 한 번을 끝까지 진행하고, 이번에 실제로 출제된 사실 목록을 돌려준다. */
function runExploration(state: SimState, student: SimStudent, now: number, rng: Rng): Fact[] {
  let plan = planExploration(state, { kind: 'recommended' }, now, rng);
  const asked: Fact[] = [];
  for (let i = 0; i < plan.length; i++) {
    const item = plan[i];
    const fact = getFact(item.factId);
    const stat = state.facts[fact.id];
    const correct = rng() < student.accuracy(fact);
    state.facts[fact.id] = applyAnswer(stat, fact, {
      correct,
      ms: student.ms(fact),
      inputMode: inputModeForBox(stat.box),
      isRetry: item.isRetry,
      now,
      today: localDateString(now),
    });
    state.danRecent[fact.a] = pushDanRecent(state.danRecent[fact.a] ?? [], correct);
    if (!correct) plan = insertRetry(plan, i, rng);
    if (!item.isRetry) asked.push(fact);
  }
  state.masteredDans.push(...newlyMasteredDans(state.facts, state.masteredDans));
  if (isChallengeEligible(state.masteredDans)) state.challengeUnlocked = true;
  return asked;
}

const START = new Date(2026, 9, 1, 16).getTime();

describe('시뮬레이션', () => {
  it('7·8단만 약한 학생 → 7·8단 출제 비중이 기본(25%)보다 높고, 탐험마다 단당 3문제 이하', () => {
    const rng = seededRng(2026);
    const state = newState();
    const weak = (f: Fact) => f.a === 7 || f.a === 8;
    const student: SimStudent = {
      accuracy: (f) => (weak(f) ? 0.4 : 0.95),
      ms: (f) => (weak(f) ? 6000 : 2500),
    };
    let weakCount = 0;
    let total = 0;
    for (let n = 0; n < 20; n++) {
      const asked = runExploration(state, student, START + n * DAY_MS, rng);
      for (const dan of [7, 8]) expect(asked.filter((f) => f.a === dan).length).toBeLessThanOrEqual(3);
      weakCount += asked.filter(weak).length;
      total += asked.length;
    }
    const share = weakCount / total;
    expect(share).toBeGreaterThan(0.3);
  });

  it('계속 틀리는 사실은 처음 틀린 뒤 거의 매 탐험 다시 나온다', () => {
    const rng = seededRng(7);
    const state = newState();
    const student: SimStudent = { accuracy: (f) => (f.id === '6x7' ? 0 : 1), ms: () => 2500 };
    let firstWrong = -1;
    let seenAfter = 0;
    const N = 25;
    for (let n = 0; n < N; n++) {
      const asked = runExploration(state, student, START + n * DAY_MS, rng).some((f) => f.id === '6x7');
      if (firstWrong >= 0 && asked) seenAfter++;
      if (firstWrong < 0 && asked) firstWrong = n;
    }
    expect(firstWrong).toBeGreaterThanOrEqual(0);
    const chances = N - 1 - firstWrong;
    expect(seenAfter / chances).toBeGreaterThanOrEqual(0.95);
  });

  it('모든 단을 잘하는 학생은 하루 2회 탐험으로 약 3~5주 안에 도전 모드를 연다', () => {
    const rng = seededRng(99);
    const state = newState();
    const student: SimStudent = { accuracy: () => 1, ms: () => 2000 };
    let unlockDay = -1;
    for (let day = 0; day < 60 && unlockDay < 0; day++) {
      for (const hour of [0, 3]) runExploration(state, student, START + day * DAY_MS + hour * 3600_000, rng);
      if (state.challengeUnlocked) unlockDay = day + 1;
    }
    expect(unlockDay).toBeGreaterThan(0);
    expect(unlockDay).toBeLessThanOrEqual(35);
    console.log(`도전 모드 해금: ${unlockDay}일째`);
  });
});
