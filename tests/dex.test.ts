import { describe, expect, it } from 'vitest';
import { canGraduate, DAY_MS, favoriteCare, lifeSnapshot, makeTitle, sendToDex } from '../src/domain/dex';
import {
  applyDecay,
  chooseEgg,
  doCare,
  happyDurationMs,
  hatch,
  HAPPY_THRESHOLD,
  initialPet,
  needsHatch,
  newEgg,
  type PetData,
  satisfaction,
} from '../src/domain/pet';
import { initialLearning, type LearningData } from '../src/domain/progress';

const HOUR = 3_600_000;
const NOW = new Date(2026, 9, 15, 10).getTime();

function adult(over: Partial<PetData> = {}): PetData {
  const p = hatch(chooseEgg(initialPet(NOW), 'cat'), '냥냥이', NOW, lifeSnapshot(initialLearning()));
  return { ...p, stage: 'adult', fullness: 100, mood: 100, cleanliness: 100, ...over };
}

describe('만족도와 행복한 시간', () => {
  it('만족도는 세 상태의 평균', () => {
    expect(satisfaction({ fullness: 90, mood: 60, cleanliness: 60 })).toBe(70);
  });

  it('가득 찬 상태에서 1시간이면 1시간 모두 행복', () => {
    expect(happyDurationMs({ fullness: 100, mood: 100, cleanliness: 100 }, HOUR)).toBe(HOUR);
  });

  it('하루 넘게 비우면 기준(70) 아래로 떨어지는 순간까지만 센다', () => {
    // 평균이 시간당 (3+2+1.5)/3 ≈ 2.17씩 줄어 100→70까지 약 13.8시간
    const ms = happyDurationMs({ fullness: 100, mood: 100, cleanliness: 100 }, 5 * DAY_MS);
    expect(ms / HOUR).toBeGreaterThan(13.5);
    expect(ms / HOUR).toBeLessThan(14.2);
  });

  it('처음부터 기준 아래면 0', () => {
    expect(happyDurationMs({ fullness: 60, mood: 60, cleanliness: 60 }, HOUR)).toBe(0);
    expect(HAPPY_THRESHOLD).toBe(70);
  });

  it('다 자란 펫만 행복한 시간이 쌓인다', () => {
    expect(applyDecay(adult(), NOW + 2 * HOUR).happyMs).toBe(2 * HOUR);
    expect(applyDecay(adult({ stage: 'child' }), NOW + 2 * HOUR).happyMs).toBe(0);
  });

  it('행복한 시간은 줄지 않는다 (불행한 시간이 와도 그대로)', () => {
    const p = applyDecay(adult({ happyMs: 10 * HOUR, fullness: 40, mood: 40, cleanliness: 40 }), NOW + 5 * HOUR);
    expect(p.happyMs).toBe(10 * HOUR);
  });
});

describe('졸업 조건', () => {
  it('다 자란 펫이 행복한 시간 2일을 채우면 졸업', () => {
    expect(canGraduate(adult({ happyMs: 2 * DAY_MS - 1 }), 2)).toBe(false);
    expect(canGraduate(adult({ happyMs: 2 * DAY_MS }), 2)).toBe(true);
    expect(canGraduate(adult({ stage: 'child', happyMs: 9 * DAY_MS }), 2)).toBe(false);
    expect(canGraduate(adult({ happyMs: DAY_MS }), 1)).toBe(true);
  });
});

describe('칭호', () => {
  const learning = (over: Partial<LearningData> = {}): LearningData => ({ ...initialLearning(), ...over });

  it('어려운 문제를 많이 극복했으면 용감한, 많이 탐험했으면 탐험가', () => {
    expect(makeTitle(adult(), learning({ totalOvercome: 6, totalExplorations: 25 }))).toBe('용감한 탐험가');
  });

  it('친밀도가 높고 씻기기를 가장 많이 했으면 따뜻한 의사', () => {
    const pet = adult({ affection: 300, careCounts: { wash: 20, 'item:hygiene': 5, feed: 10 } });
    expect(makeTitle(pet, learning())).toBe('따뜻한 의사');
  });

  it('단을 마스터했으면 구구단 박사', () => {
    expect(makeTitle(adult(), learning({ masteredDans: [7] }))).toMatch(/구구단 박사$/);
  });

  it('부화하기 전의 기록은 세지 않는다', () => {
    const before = learning({ totalOvercome: 30, totalExplorations: 50 });
    const pet = { ...adult(), lifeStart: lifeSnapshot(before) };
    expect(makeTitle(pet, before)).not.toMatch(/용감한|탐험가/);
  });

  it('특별한 기록이 없어도 칭찬하는 칭호가 붙고, 같은 펫이면 늘 같다', () => {
    const t1 = makeTitle(adult(), learning());
    expect(t1).toMatch(/^\S+ \S+/);
    expect(makeTitle(adult(), learning())).toBe(t1);
  });

  it('가장 많이 한 돌봄은 무료 돌봄과 아이템을 합쳐 센다', () => {
    expect(favoriteCare({ feed: 3, 'item:toy': 5, pet: 1 })).toBe('play');
    expect(favoriteCare({})).toBeNull();
  });

  it('돌봄 행동이 횟수에 기록된다', () => {
    const r = doCare(adult({ fullness: 50 }), 'feed', NOW);
    expect(r.ok && r.pet.careCounts.feed).toBe(1);
  });
});

describe('도감으로 보내기', () => {
  it('도감 기록을 남기고 새 알로 바뀐다. 다음 탐험을 마치면 부화', () => {
    const l = { ...initialLearning(), totalExplorations: 30, studyDays: ['a', 'b', 'c'] };
    const pet = adult({ equippedHat: 'hat_crown', affection: 120 });
    const r = sendToDex(pet, l, NOW, 'graduated');
    expect(r.entry).toMatchObject({ name: '냥냥이', species: 'cat', stage: 'adult', hat: 'hat_crown', reason: 'graduated', explorations: 30 });
    expect(r.entry?.title).toBeTruthy();
    expect(r.nextPet).toMatchObject({ species: null, stage: 'egg', happyMs: 0, affection: 0, equippedHat: null, eggBaseExplorations: 30 });
    const chosen = chooseEgg(r.nextPet, 'dino');
    expect(needsHatch(chosen, 30)).toBe(false);
    expect(needsHatch(chosen, 31)).toBe(true);
  });

  it('부화 전 알은 도감에 넣지 않는다', () => {
    expect(sendToDex(chooseEgg(newEgg(NOW, 0), 'cat'), initialLearning(), NOW, 'admin').entry).toBeNull();
  });
});
