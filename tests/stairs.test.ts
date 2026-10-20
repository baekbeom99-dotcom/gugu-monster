/** 무한의 계단 — 설계서 4-5 */
import { describe, expect, it } from 'vitest';
import { initialFactStats } from '../src/domain/mastery';
import { initialEconomy } from '../src/domain/progress';
import { seededRng } from '../src/domain/random';
import {
  emptyStairsRecord,
  finishStairs,
  newStairsDeck,
  nextStairsFact,
  slotAt,
  STAIRS_TIME_MS,
  stairsPath,
} from '../src/domain/stairs';
import { createInitialSave, mergeSave } from '../src/store/saveData';

const NOW = new Date(2026, 9, 21, 10).getTime();

describe('문제 순서', () => {
  it('쉬움 3 → 자주 틀리는 문제 1을 되풀이하고, 그 자리 3번에 1번은 12·13단', () => {
    let deck = newStairsDeck();
    const facts = initialFactStats();
    const slots: string[] = [];
    const rng = seededRng(3);
    for (let i = 0; i < 24; i++) {
      const r = nextStairsFact(deck, facts, NOW, rng);
      deck = r.deck;
      slots.push(r.slot);
      if (r.slot === 'challenge') expect([12, 13]).toContain(r.fact.a);
      else expect(r.fact.a).toBeLessThanOrEqual(9);
    }
    expect(slots.slice(0, 12)).toEqual(['easy', 'easy', 'easy', 'hard', 'easy', 'easy', 'easy', 'hard', 'easy', 'easy', 'easy', 'challenge']);
    expect(slots.filter((s) => s === 'challenge')).toHaveLength(2);
    expect(slotAt(3, 0)).toBe('hard');
    expect(slotAt(3, 2)).toBe('challenge');
  });

  it('기록에 따라: 잘 아는 문제는 쉬운 자리에, 자주 틀린 문제는 어려운 자리에', () => {
    const facts = initialFactStats();
    // 7×8은 자주 틀렸고, 2×3은 잘 안다
    facts['7x8'] = { ...facts['7x8'], box: 1, attempts: 10, correct: 2, lastWrongAt: NOW - 3_600_000 };
    facts['2x3'] = { ...facts['2x3'], box: 5, attempts: 10, correct: 10 };
    let hard78 = 0;
    let easy23 = 0;
    for (let seed = 0; seed < 200; seed++) {
      let deck = newStairsDeck();
      const rng = seededRng(seed);
      for (let i = 0; i < 4; i++) {
        const r = nextStairsFact(deck, facts, NOW, rng);
        deck = r.deck;
        if (r.slot === 'hard' && r.fact.id === '7x8') hard78++;
        if (r.slot === 'easy' && r.fact.id === '2x3') easy23++;
        expect(r.slot === 'easy' && r.fact.id === '7x8').toBe(false);
      }
    }
    expect(hard78).toBeGreaterThan(10);
    expect(easy23).toBeGreaterThan(10);
  });

  it('같은 문제가 바로 다시 나오지 않는다', () => {
    let deck = newStairsDeck();
    const rng = seededRng(9);
    const ids: string[] = [];
    for (let i = 0; i < 30; i++) {
      const r = nextStairsFact(deck, initialFactStats(), NOW, rng);
      deck = r.deck;
      ids.push(r.fact.id);
    }
    for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
  });

  it('한 문제에 5초', () => {
    expect(STAIRS_TIME_MS).toBe(5000);
  });
});

describe('기록과 별', () => {
  it('오른 계단만큼 별, 최고 기록은 더 높을 때만 바뀐다', () => {
    const a = finishStairs(emptyStairsRecord(), initialEconomy(), 12, NOW);
    expect(a).toMatchObject({ stars: 12, newBest: true, record: { best: 12, plays: 1, totalSteps: 12, bestAt: '2026-10-21' } });
    expect(a.economy.stars).toBe(12);
    const b = finishStairs(a.record, a.economy, 5, NOW);
    expect(b).toMatchObject({ stars: 5, newBest: false, record: { best: 12, plays: 2, totalSteps: 17 } });
    expect(finishStairs(b.record, b.economy, 0, NOW).stars).toBe(0);
  });

  it('예전 저장 데이터에는 빈 기록으로 시작한다', () => {
    const merged = mergeSave(createInitialSave(NOW), { economy: { stars: 30 } });
    expect(merged.stairs).toEqual(emptyStairsRecord());
    expect(merged.economy.stars).toBe(30);
  });
});

describe('계단 모양', () => {
  it('한 칸씩 왼쪽·오른쪽으로, 같은 방향은 2~4칸 이어진다', () => {
    const xs = stairsPath(200, seededRng(1));
    expect(xs).toHaveLength(200);
    let run = 1;
    for (let i = 2; i < xs.length; i++) {
      expect(Math.abs(xs[i] - xs[i - 1])).toBe(1);
      if (xs[i] - xs[i - 1] === xs[i - 1] - xs[i - 2]) run++;
      else {
        expect(run).toBeGreaterThanOrEqual(2);
        run = 1;
      }
      expect(run).toBeLessThanOrEqual(4);
    }
  });
});
