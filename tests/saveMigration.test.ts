/** 저장 형식 1 → 2 (셈 연습 추가): 옛 저장본의 별·펫·가방·구구단 기록이 그대로 남아야 한다 */
import { beforeAll, describe, expect, it } from 'vitest';
import { createInitialSave, mergeSave, migrateSave, SAVE_KEY, SCHEMA_VERSION } from '../src/store/saveData';

const NOW = new Date('2026-10-18T09:00:00').getTime();

/** 셈 연습이 생기기 전(버전 1)에 저장된 아이 기기의 데이터 */
function v1Save() {
  const learning = createInitialSave(NOW).learning;
  return {
    schemaVersion: 1,
    createdAt: NOW - 30 * 86_400_000,
    lastSeenAt: NOW - 3_600_000,
    settings: { sound: false, volume: 0.3, inputMode: 'choice' },
    learning: {
      ...learning,
      facts: { ...learning.facts, '7x8': { ...learning.facts['7x8'], box: 4 } },
      masteredDans: [2, 5],
      totalExplorations: 42,
      danTrials: { 3: { bestMs: 28_000, plays: 5, master: true, masteredAt: '2026-10-01' } },
    },
    economy: { stars: 1234, totalEarned: 5678, dailyBonusDates: ['2026-10-17'], inventory: { food_fish: 3 }, owned: ['hat_crown'] },
    pet: { species: 'fox', stage: 'teen', name: '여우비', affection: 210, statsUpdatedAt: NOW - 3_600_000 },
    dex: [],
  };
}

describe('mergeSave + migrateSave', () => {
  it('버전이 2로 올라갔다', () => {
    expect(SCHEMA_VERSION).toBe(2);
    expect(createInitialSave(NOW).practice).toEqual({});
  });

  it('옛 저장본을 불러와도 별·가방·펫·구구단 기록이 그대로', () => {
    const old = v1Save();
    const merged = mergeSave(createInitialSave(NOW), migrateSave(old, 1));
    expect(merged.schemaVersion).toBe(2);
    expect(merged.economy).toEqual(old.economy);
    expect(merged.pet).toMatchObject({ species: 'fox', stage: 'teen', name: '여우비', affection: 210 });
    expect(merged.learning.facts['7x8'].box).toBe(4);
    expect(merged.learning.masteredDans).toEqual([2, 5]);
    expect(merged.learning.totalExplorations).toBe(42);
    expect(merged.learning.danTrials[3]?.master).toBe(true);
    expect(merged.settings).toMatchObject({ sound: false, inputMode: 'choice' });
    expect(merged.practice).toEqual({});
  });

  it('셈 연습 기록이 있는 저장본은 그 기록을 지킨다', () => {
    const save = { ...v1Save(), schemaVersion: 2, practice: { comp10: { plays: 2, attempts: 20, correct: 18, bestMs: 30_000 } } };
    expect(mergeSave(createInitialSave(NOW), save).practice.comp10?.bestMs).toBe(30_000);
  });
});

describe('실제 스토어: localStorage의 버전 1 저장본 불러오기', () => {
  const mem = new Map<string, string>();

  beforeAll(() => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  });

  it('zustand persist가 옛 저장본을 버리지 않고 별을 그대로 불러온다', async () => {
    mem.set(SAVE_KEY, JSON.stringify({ version: 1, state: v1Save() }));
    const { useGameStore } = await import('../src/store/useGameStore');
    await useGameStore.persist.rehydrate();
    const s = useGameStore.getState();
    expect(s.economy.stars).toBe(1234);
    expect(s.economy.inventory).toEqual({ food_fish: 3 });
    expect(s.economy.owned).toEqual(['hat_crown']);
    expect(s.pet.name).toBe('여우비');
    expect(s.learning.totalExplorations).toBe(42);
    expect(s.practice).toEqual({});

    // 셈 연습을 하면 별이 더해지고, 새 버전으로 저장된다
    s.recordPracticeAnswer('addCarry', true, NOW);
    expect(useGameStore.getState().economy.stars).toBe(1235);
    const saved = JSON.parse(mem.get(SAVE_KEY)!);
    expect(saved.version).toBe(2);
    expect(saved.state.economy.stars).toBe(1235);
    expect(saved.state.practice.addCarry).toMatchObject({ attempts: 1, correct: 1 });
  });
});
