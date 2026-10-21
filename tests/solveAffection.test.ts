/** 문제를 풀었을 때 오르는 친밀도 (v1.32) */
import { beforeEach, describe, expect, it } from 'vitest';
import { ANSWER_AFFECTION, chooseEgg, EXPLORATION_AFFECTION, hatch, initialPet, solveAffection } from '../src/domain/pet';
import { useGameStore } from '../src/store/useGameStore';

const NOW = new Date(2026, 9, 21, 10).getTime();

describe('문제 풀이 친밀도', () => {
  beforeEach(() => {
    useGameStore.setState({ pet: { ...hatch(chooseEgg(initialPet(NOW), 'cat'), '냥이', NOW), affection: 0 } });
  });

  it('끝까지 마치면 5, 맞힌 문제마다 1 더', () => {
    expect(EXPLORATION_AFFECTION).toBe(5);
    expect(ANSWER_AFFECTION).toBe(1);
    expect([0, 1, 9].map(solveAffection)).toEqual([5, 6, 14]);
  });

  it('탐험을 마치면 맞힌 문제 수만큼 친밀도가 오른다', () => {
    const r = useGameStore.getState().finishExploration(true, NOW, 9);
    expect(r.affection).toBe(14);
    expect(useGameStore.getState().pet.affection).toBe(14);
  });

  it('중간에 그만두면 오르지 않는다', () => {
    const r = useGameStore.getState().finishExploration(false, NOW, 4);
    expect(r.affection).toBe(0);
    expect(useGameStore.getState().pet.affection).toBe(0);
  });

  it('셈 연습도 같다', () => {
    const r = useGameStore.getState().finishPractice('addNoCarryBasic', 30_000, 0, NOW, 9);
    expect(r.affection).toBe(14);
  });
});
