import { describe, expect, it } from 'vitest';
import {
  answer,
  createBattle,
  currentItem,
  extendPlan,
  finishHint,
  isFirstAttempt,
  MAX_ATTEMPTS,
  needsMoreQuestions,
} from '../src/domain/battle';
import { FACTS } from '../src/domain/facts';
import { seededRng } from '../src/domain/random';
import type { PlannedItem } from '../src/domain/scheduler';

const item = (factId: PlannedItem['factId'], type: PlannedItem['type'] = 'product'): PlannedItem => ({
  factId,
  type,
  isRetry: false,
  isConfidence: false,
});
const basePlan = (): PlannedItem[] =>
  ['2x3', '3x4', '4x5', '5x6', '6x7', '7x8', '8x9', '9x2', '3x3'].map((id) => item(id as PlannedItem['factId']));

describe('전투', () => {
  it('정답 9개면 몬스터 3마리를 모두 잡고 끝난다', () => {
    const rng = seededRng(1);
    let s = createBattle(basePlan(), rng);
    expect(s.monsters.map((m) => m.status)).toEqual(['active', 'waiting', 'waiting']);
    for (let i = 0; i < 9; i++) s = answer(s, true, 2000, rng);
    expect(s.phase).toBe('done');
    expect(s.monsters.every((m) => m.status === 'captured')).toBe(true);
    expect(s.correctCount).toBe(9);
    expect(s.maxCombo).toBe(9);
  });

  it('정답 3개마다 몬스터 1마리 포획, 다음 몬스터가 나온다', () => {
    const rng = seededRng(1);
    let s = createBattle(basePlan(), rng);
    s = answer(s, true, 2000, rng);
    s = answer(s, true, 2000, rng);
    expect(s.last?.captured).toBe(false);
    s = answer(s, true, 2000, rng);
    expect(s.last?.captured).toBe(true);
    expect(s.last?.comboBurst).toBe(true);
    expect(s.monsters[1].status).toBe('active');
  });

  it('오답: 힌트 단계 → 재출제 추가 → 힌트 끝나면 다음 문제, 몬스터 체력 그대로', () => {
    const rng = seededRng(2);
    let s = createBattle(basePlan(), rng);
    s = answer(s, false, 4000, rng);
    expect(s.phase).toBe('hint');
    expect(s.plan).toHaveLength(10);
    expect(s.plan.filter((p) => p.isRetry)).toHaveLength(1);
    expect(s.monsters[0].hp).toBe(3);
    expect(s.combo).toBe(0);
    expect(answer(s, true, 1000, rng)).toBe(s); // 힌트 중에는 답을 받지 않는다
    s = finishHint(s);
    expect(s.phase).toBe('question');
    expect(s.index).toBe(1);
  });

  it('3초 이내 정답은 크리티컬 연출', () => {
    const rng = seededRng(3);
    const s = createBattle(basePlan(), rng);
    expect(answer(s, true, 2900, rng).last?.critical).toBe(true);
    expect(answer(s, true, 3100, rng).last?.critical).toBe(false);
  });

  it(`${MAX_ATTEMPTS}문제를 풀면 남은 몬스터는 잠들어 포획 — 실패 없음`, () => {
    const rng = seededRng(4);
    let s = createBattle(basePlan(), rng);
    while (s.phase !== 'done') {
      if (needsMoreQuestions(s)) s = extendPlan(s, basePlan());
      s = s.phase === 'hint' ? finishHint(s) : answer(s, false, 5000, rng);
    }
    expect(s.attempts).toBe(MAX_ATTEMPTS);
    expect(s.monsters.every((m) => m.status === 'sleeping')).toBe(true);
  });

  it('오답이 많아 계획이 바닥나면 문제를 더 요청한다', () => {
    const rng = seededRng(5);
    let s = createBattle(basePlan(), rng);
    // 정답 5개 + 오답 8개 = 13문제 → 계획(9 + 재출제 4)을 모두 썼고 몬스터가 남았다
    const pattern = [false, false, true, false, false, true, false, false, true, false, false, true, true];
    for (const ok of pattern) {
      expect(needsMoreQuestions(s)).toBe(false);
      s = answer(s, ok, 2000, rng);
      if (s.phase === 'hint') s = finishHint(s);
    }
    expect(s.phase).toBe('question');
    expect(needsMoreQuestions(s)).toBe(true);
    expect(currentItem(s)).toBeNull();
    s = extendPlan(s, basePlan());
    expect(currentItem(s)).not.toBeNull();
  });

  it('처음 만난 사실인지 기억한다', () => {
    const rng = seededRng(6);
    let s = createBattle(basePlan(), rng);
    expect(isFirstAttempt(s, '2x3')).toBe(true);
    s = answer(s, false, 2000, rng);
    expect(isFirstAttempt(s, '2x3')).toBe(false);
  });

  it('12·13단 문제가 섞인 몬스터는 황금 몬스터', () => {
    const plan = basePlan();
    plan[4] = item('12x7');
    const s = createBattle(plan, seededRng(7));
    expect(s.monsters.map((m) => m.golden)).toEqual([false, true, false]);
    expect(s.monsters[1].dan).toBe(12);
    expect(FACTS.length).toBe(110);
  });
});
