import { describe, expect, it, vi } from 'vitest';
import {
  ENCOUNTER_CHANCE_GRASS,
  ENCOUNTER_CHANCE_PATH,
  ENCOUNTER_GRACE_STEPS,
  LEGEND_CHANCE,
  LEGEND_LEVEL,
  STARTERS,
  UNSEEN_WEIGHT,
  WILD_LEVEL_MAX,
  WILD_LEVEL_MIN,
  SPECIES,
  speciesDef,
} from '../../src/domain/field/creatures';
import { encounterChance, rollEncounter, stepOnTile } from '../../src/domain/field/encounter';
import { LEGEND_DAN } from '../../src/domain/field/fields';
import { seededRng, type Rng } from '../../src/domain/random';

const scripted = (...values: number[]): Rng & { calls: () => number } => {
  let i = 0;
  const f = (() => values[Math.min(i++, values.length - 1)]) as Rng & { calls: () => number };
  f.calls = () => i;
  return f;
};
const base = { field: 'meadow' as const, stepsSinceBattle: 10, challengeUnlocked: false, seen: [] as never[], tile: 'grass' as const };

describe('종 표', () => {
  it('상수 고정', () => {
    expect(ENCOUNTER_CHANCE_GRASS).toBe(0.3);
    expect(ENCOUNTER_CHANCE_PATH).toBe(0.04);
    expect(ENCOUNTER_GRACE_STEPS).toBe(3);
    expect(LEGEND_CHANCE).toBe(0.02);
    expect(UNSEEN_WEIGHT).toBe(2);
    expect(WILD_LEVEL_MIN).toBe(3);
    expect(WILD_LEVEL_MAX).toBe(6);
    expect(LEGEND_LEVEL).toBe(20);
    expect(STARTERS).toEqual(['cloud', 'jelly', 'pebble']);
  });
  it('11종, 기술 3개씩, 이름 있음', () => {
    expect(SPECIES).toHaveLength(11);
    for (const s of SPECIES) {
      expect(s.moves).toHaveLength(3);
      expect(s.name.length).toBeGreaterThan(0);
      expect(speciesDef(s.id)).toBe(s);
    }
    expect(speciesDef('cloud').moves).toEqual(['잎사귀 톡', '새싹 휙', '꽃잎 바람']);
    expect(speciesDef('cloud').name).toBe('새싹몬');
    expect(speciesDef('ghost').field).toBe('desert');
    expect(speciesDef('legend-fluff').legend).toBe(true);
    expect(speciesDef('legend-fluff').kind).toBe('fluff');
    expect(speciesDef('legend-fluff').name).toBe('황금 왕관몬');
  });
});

describe('rollEncounter', () => {
  it('안전 걸음에는 rng를 부르지 않고 null', () => {
    for (let s = 0; s < ENCOUNTER_GRACE_STEPS; s++) {
      const rng = scripted(0);
      expect(rollEncounter(rng, { ...base, stepsSinceBattle: s })).toBeNull();
      expect(rng.calls()).toBe(0);
    }
  });
  it('0.29 → 만남, 0.31 → null, 닫힘이면 레전드 판정 건너뜀', () => {
    expect(rollEncounter(scripted(0.29, 0, 0, 0), base)).not.toBeNull();
    const rng = scripted(0.31);
    expect(rollEncounter(rng, base)).toBeNull();
    expect(rng.calls()).toBe(1);
    const closed = scripted(0.29, 0.5, 0.5, 0.5);
    rollEncounter(closed, base);
    expect(closed.calls()).toBe(4); // 만남, 종, 단, 레벨
  });
  it('초원 1000번', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 1000; i++) {
      const e = rollEncounter(rng, { ...base, stepsSinceBattle: 99 });
      if (!e) continue;
      expect(['cloud', 'mushroom', 'fluff']).toContain(e.species);
      expect([2, 4, 8]).toContain(e.dan);
      expect(e.level).toBeGreaterThanOrEqual(3);
      expect(e.level).toBeLessThanOrEqual(6);
      expect(e.legend).toBe(false);
    }
  });
  it('항상 만남 rng로 초원 1000번 모두 유효', () => {
    const rng = seededRng(5);
    for (let i = 0; i < 1000; i++) expect(rollEncounter(rng, { ...base, force: { grass: true } })).not.toBeNull();
  });
  it('사막 닫힘 → 단 5·7, 열림 → 12 포함', () => {
    const rng = seededRng(2);
    const closedDans = new Set<number>();
    const openDans = new Set<number>();
    for (let i = 0; i < 3000; i++) {
      const c = rollEncounter(rng, { ...base, field: 'desert' });
      if (c) closedDans.add(c.dan);
      const o = rollEncounter(rng, { ...base, field: 'desert', challengeUnlocked: true });
      if (o && !o.legend) openDans.add(o.dan);
    }
    expect([...closedDans].sort()).toEqual([5, 7]);
    expect(openDans.has(12)).toBe(true);
  });
  it('닫힘이면 레전드 0, 열림이면 1~3%·13단·20레벨', () => {
    const rng = seededRng(3);
    for (let i = 0; i < 10000; i++) {
      const e = rollEncounter(rng, { ...base, field: 'desert' });
      expect(e?.legend ?? false).toBe(false);
    }
    let met = 0;
    let legends = 0;
    for (let i = 0; i < 100000; i++) {
      const e = rollEncounter(rng, { ...base, challengeUnlocked: true });
      if (!e) continue;
      met++;
      if (e.legend) {
        legends++;
        expect(e.dan).toBe(LEGEND_DAN);
        expect(e.level).toBe(LEGEND_LEVEL);
        expect(speciesDef(e.species).legend).toBe(true);
      }
    }
    expect(legends / met).toBeGreaterThan(0.01);
    expect(legends / met).toBeLessThan(0.03);
  });
  it('못 본 종이 더 자주', () => {
    const rng = seededRng(4);
    let fluff = 0;
    for (let i = 0; i < 1000; i++) {
      if (rollEncounter(rng, { ...base, seen: ['cloud', 'mushroom'], force: { grass: true } })?.species === 'fluff') fluff++;
    }
    expect(fluff).toBeGreaterThan(400);
  });
  it('force: 만남 강제, 레전드 강제(해금 조건 유지)', () => {
    const e = rollEncounter(scripted(0.99, 0, 0, 0), { ...base, force: { grass: true } });
    expect(e).not.toBeNull();
    const closed = rollEncounter(seededRng(7), { ...base, force: { grass: true, legend: true } });
    expect(closed?.legend).toBe(false);
    const open = rollEncounter(seededRng(7), { ...base, challengeUnlocked: true, force: { grass: true, legend: true } });
    expect(open).toMatchObject({ legend: true, dan: LEGEND_DAN, level: LEGEND_LEVEL });
  });
  it('안전 걸음은 force 만남도 막는다', () => {
    expect(rollEncounter(scripted(0), { ...base, stepsSinceBattle: 1, force: { grass: true } })).toBeNull();
  });
});

describe('stepOnTile (풀숲 한 걸음: 먼저 주사위, 못 만나면 걸음 수 +1)', () => {
  const ctx = { field: 'meadow' as const, challengeUnlocked: false, seen: [], tile: 'grass' as const };
  it('필드에 들어온 직후(안전 걸음 다 채움) 첫 풀숲 걸음부터 만날 수 있다', () => {
    const r = stepOnTile(() => 0, { ...ctx, stepsSinceBattle: ENCOUNTER_GRACE_STEPS });
    expect(r.encounter).not.toBeNull();
  });
  it('전투 뒤(0)에는 안전 걸음 ENCOUNTER_GRACE_STEPS번 동안 만나지 않고 한 걸음씩 센다', () => {
    let steps = 0;
    for (let i = 0; i < ENCOUNTER_GRACE_STEPS; i++) {
      const r = stepOnTile(() => 0, { ...ctx, stepsSinceBattle: steps });
      expect(r.encounter).toBeNull();
      steps = r.stepsSinceBattle;
    }
    expect(steps).toBe(ENCOUNTER_GRACE_STEPS);
    expect(stepOnTile(() => 0, { ...ctx, stepsSinceBattle: steps }).encounter).not.toBeNull();
  });
  it('못 만나도 걸음 수는 늘고, 만나면 그대로', () => {
    const miss = stepOnTile(() => 0.99, { ...ctx, stepsSinceBattle: 5 });
    expect(miss).toEqual({ encounter: null, stepsSinceBattle: 6 });
    const hit = stepOnTile(() => 0, { ...ctx, stepsSinceBattle: 5, force: { grass: true } });
    expect(hit.stepsSinceBattle).toBe(5);
  });
});

describe('칸 종류별 만남', () => {
  const ctx = { field: 'meadow' as const, challengeUnlocked: false, seen: [] };
  it('칸 종류별 만남 확률', () => {
    expect(encounterChance('meadow', 'grass')).toBe(0.3);
    expect(encounterChance('meadow', 'path')).toBe(0.04);
    for (const t of ['exit', 'sign', 'block', 'deco', null] as const) expect(encounterChance('meadow', t)).toBe(0);
  });
  it('길에서도 만난다: 0.039는 만남, 0.04는 아님', () => {
    expect(stepOnTile(() => 0.039, { ...ctx, stepsSinceBattle: 5, tile: 'path' }).encounter).not.toBeNull();
    expect(stepOnTile(() => 0.04, { ...ctx, stepsSinceBattle: 5, tile: 'path' }).encounter).toBeNull();
  });
  it('풀숲 0.299 만남, 0.3 아님', () => {
    expect(stepOnTile(() => 0.299, { ...ctx, stepsSinceBattle: 5, tile: 'grass' }).encounter).not.toBeNull();
    expect(stepOnTile(() => 0.3, { ...ctx, stepsSinceBattle: 5, tile: 'grass' }).encounter).toBeNull();
  });
  it('출구 칸은 난수를 쓰지 않고 걸음 수도 그대로', () => {
    const rng = vi.fn(() => 0);
    expect(stepOnTile(rng, { ...ctx, stepsSinceBattle: 1, tile: 'exit' })).toEqual({ encounter: null, stepsSinceBattle: 1 });
    expect(rng).not.toHaveBeenCalled();
  });
  it('길 걸음도 안전 걸음에 센다', () => {
    expect(stepOnTile(() => 0.99, { ...ctx, stepsSinceBattle: 0, tile: 'path' }).stepsSinceBattle).toBe(1);
  });
  it('강제 스위치: grass는 풀숲만, path는 길만, noWild면 강제 아닌 만남 없음', () => {
    expect(stepOnTile(() => 0.99, { ...ctx, stepsSinceBattle: 5, tile: 'grass', force: { grass: true } }).encounter).not.toBeNull();
    expect(stepOnTile(() => 0.99, { ...ctx, stepsSinceBattle: 5, tile: 'path', force: { grass: true } }).encounter).toBeNull();
    expect(stepOnTile(() => 0.99, { ...ctx, stepsSinceBattle: 5, tile: 'path', force: { path: true } }).encounter).not.toBeNull();
    expect(stepOnTile(() => 0, { ...ctx, stepsSinceBattle: 5, tile: 'grass', force: { noWild: true } }).encounter).toBeNull();
  });
});
