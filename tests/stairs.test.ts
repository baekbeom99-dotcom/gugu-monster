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
  splitBasePool,
  STAIRS_TIME_MS,
  stairsPath,
} from '../src/domain/stairs';
import { createInitialSave, mergeSave } from '../src/store/saveData';

const NOW = new Date(2026, 9, 21, 10).getTime();

describe('문제 순서', () => {
  it('보통 3 → 자주 틀리는 문제 1을 되풀이하고, 10의 배수 층은 12·13단', () => {
    let deck = newStairsDeck();
    const slots: string[] = [];
    const rng = seededRng(3);
    for (let i = 0; i < 40; i++) {
      const r = nextStairsFact(deck, initialFactStats(), NOW, rng);
      deck = r.deck;
      slots.push(r.slot);
      // i번째 문제를 맞히면 i+1층
      if ((i + 1) % 10 === 0) expect([12, 13]).toContain(r.fact.a);
      else expect(r.fact.a).toBeLessThanOrEqual(9);
    }
    expect(slots.slice(0, 12)).toEqual(['normal', 'normal', 'normal', 'wrong', 'normal', 'normal', 'normal', 'wrong', 'normal', 'challenge', 'normal', 'wrong']);
    expect(slots.filter((s) => s === 'challenge')).toHaveLength(4);
    expect(slotAt(19)).toBe('challenge');
    expect(slotAt(39)).toBe('challenge');
    expect(slotAt(7)).toBe('wrong');
  });

  it('보통 자리에는 자주 틀리는 문제가 나오지 않고, 넷째 자리는 자주 틀리는 문제에서만', () => {
    const facts = initialFactStats();
    // 7×8·6×9는 자주 틀렸고, 2×3은 잘 안다
    facts['7x8'] = { ...facts['7x8'], box: 1, attempts: 10, correct: 2, lastWrongAt: NOW - 3_600_000 };
    facts['6x9'] = { ...facts['6x9'], box: 2, attempts: 6, correct: 3 };
    facts['2x3'] = { ...facts['2x3'], box: 5, attempts: 10, correct: 10 };
    expect(splitBasePool(facts, NOW).wrong.map((f) => f.id).sort()).toEqual(['6x9', '7x8']);
    let normal23 = 0;
    for (let seed = 0; seed < 200; seed++) {
      let deck = newStairsDeck();
      const rng = seededRng(seed);
      for (let i = 0; i < 8; i++) {
        const r = nextStairsFact(deck, facts, NOW, rng);
        deck = r.deck;
        if (r.slot === 'normal') expect(['7x8', '6x9']).not.toContain(r.fact.id);
        if (r.slot === 'wrong') expect(['7x8', '6x9']).toContain(r.fact.id);
        if (r.slot === 'normal' && r.fact.id === '2x3') normal23++;
      }
    }
    // 잘 아는 문제도 보통 자리에 고르게 나온다
    expect(normal23).toBeGreaterThan(0);
  });

  it('기록에 자주 틀린 문제가 없으면 큰 곱을 대신 쓰고, 보통 자리에서는 뺀다', () => {
    const { wrong, normal } = splitBasePool(initialFactStats(), NOW);
    expect(wrong).toHaveLength(14);
    expect(wrong.every((f) => !f.isRule && f.product >= 40)).toBe(true);
    expect(normal.some((f) => wrong.includes(f))).toBe(false);
    expect(wrong.length + normal.length).toBe(88);
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
