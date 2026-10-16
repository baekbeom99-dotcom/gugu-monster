import { describe, expect, it } from 'vitest';
import {
  affectionLevel,
  applyDecay,
  CARE_XP_DAILY_CAP,
  checkEvolution,
  checkName,
  chooseEgg,
  cooldownLeft,
  doCare,
  hatch,
  initialPet,
  isSleeping,
  neediest,
  type PetData,
  STAT_MIN,
  visit,
  wake,
} from '../src/domain/pet';
import { josa } from '../src/domain/korean';
import { initialEconomy, initialLearning, recordAnswer } from '../src/domain/progress';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = new Date(2026, 9, 15, 10).getTime();

function hatched(over: Partial<PetData> = {}): PetData {
  return { ...hatch(chooseEgg(initialPet(NOW), 'cat'), '냥이', NOW), ...over };
}

describe('상태 감소', () => {
  it('시간당 포만감 3, 기분 2, 청결 1.5씩 준다', () => {
    const p = applyDecay(hatched({ fullness: 90, mood: 90, cleanliness: 90 }), NOW + 2 * HOUR);
    expect(p.fullness).toBe(84);
    expect(p.mood).toBe(86);
    expect(p.cleanliness).toBe(87);
  });

  it('30일을 쉬어도 하한 30, 최대 24시간분만 줄어든다', () => {
    const p = applyDecay(hatched({ fullness: 100, mood: 100, cleanliness: 100 }), NOW + 30 * DAY);
    expect(p.fullness).toBe(STAT_MIN);
    expect(p.mood).toBe(100 - 2 * 24);
    expect(p.cleanliness).toBe(100 - 1.5 * 24);
  });

  it('기기 시간이 뒤로 가면 아무것도 바뀌지 않는다', () => {
    const p = hatched({ fullness: 90 });
    expect(applyDecay(p, NOW - 5 * HOUR)).toBe(p);
  });

  it('알일 때는 줄지 않는다', () => {
    const egg = { ...initialPet(NOW), species: 'cat' as const };
    expect(applyDecay(egg, NOW + 10 * HOUR).fullness).toBe(egg.fullness);
  });
});

describe('돌봄', () => {
  it('기본 사료: 포만감 +20, 친밀도 +1, 2시간 대기, 성장 XP +1', () => {
    const r = doCare(hatched({ fullness: 50 }), 'feed', NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.pet.fullness).toBe(70);
    expect(r.pet.affection).toBe(1);
    expect(r.pet.growthXp).toBe(1);
    expect(cooldownLeft(r.pet, 'feed', NOW)).toBe(2 * HOUR);
    expect(doCare(r.pet, 'feed', NOW + HOUR)).toEqual({ ok: false, reason: 'cooldown' });
    expect(doCare(r.pet, 'feed', NOW + 2 * HOUR).ok).toBe(true);
  });

  it('상태는 100을 넘지 않는다', () => {
    const r = doCare(hatched({ fullness: 95 }), 'feed', NOW);
    expect(r.ok && r.pet.fullness).toBe(100);
  });

  it('돌봄 성장 XP는 하루 10까지', () => {
    let p = hatched();
    for (let i = 0; i < 20; i++) {
      const r = doCare(p, 'pet', NOW + i * 11 * 60_000);
      if (r.ok) p = r.pet;
    }
    expect(p.growthXp).toBe(CARE_XP_DAILY_CAP);
    expect(p.affection).toBe(20);
  });

  it('잠자는 동안은 돌봄 대신 깨우기, 깨워도 불이익 없음', () => {
    const r = doCare(hatched(), 'sleep', NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(isSleeping(r.pet, NOW + 60_000)).toBe(true);
    expect(doCare(r.pet, 'feed', NOW + 60_000)).toEqual({ ok: false, reason: 'sleeping' });
    const awake = wake(r.pet);
    expect(doCare(awake, 'feed', NOW + 60_000).ok).toBe(true);
    expect(awake.mood).toBe(r.pet.mood);
  });

  it('알은 돌볼 수 없다', () => {
    expect(doCare(initialPet(NOW), 'feed', NOW)).toEqual({ ok: false, reason: 'egg' });
  });
});

describe('방문', () => {
  it('하루 첫 방문 친밀도 +3 (하루 1번), 24시간 넘게 쉬면 반겨준다', () => {
    const p = hatched({ lastVisitDate: '2026-10-14' });
    const v = visit(p, NOW - 2 * DAY, NOW);
    expect(v.firstVisitToday).toBe(true);
    expect(v.welcomeBack).toBe(true);
    expect(v.pet.affection).toBe(3);
    const again = visit(v.pet, NOW, NOW + HOUR);
    expect(again.firstVisitToday).toBe(false);
    expect(again.welcomeBack).toBe(false);
  });
});

describe('친밀도 레벨', () => {
  it('누적 10, 25, 45…에서 레벨업, Lv10 뒤로는 80마다 계속', () => {
    expect(affectionLevel(0)).toBe(1);
    expect(affectionLevel(10)).toBe(2);
    expect(affectionLevel(44)).toBe(3);
    expect(affectionLevel(45)).toBe(4);
    expect(affectionLevel(320)).toBe(10);
    expect(affectionLevel(9999)).toBe(10 + Math.floor((9999 - 320) / 80));
  });
});

describe('성장', () => {
  it('어린이: XP 120 + 공부한 날 3일 모두 필요', () => {
    expect(checkEvolution(hatched({ growthXp: 200 }), 2, 10, NOW).evolvedTo).toBeNull();
    expect(checkEvolution(hatched({ growthXp: 119 }), 5, 10, NOW).evolvedTo).toBeNull();
    const r = checkEvolution(hatched({ growthXp: 120 }), 3, 4, NOW);
    expect(r.evolvedTo).toBe('child');
    expect(r.pet.evolutionCards.map((c) => c.stage)).toEqual(['baby', 'child']);
  });

  it('다 자람: XP 400 + 7일 + 탐험 15회', () => {
    const child = hatched({ stage: 'child', growthXp: 500 });
    expect(checkEvolution(child, 7, 14, NOW).evolvedTo).toBeNull();
    expect(checkEvolution(child, 7, 15, NOW).evolvedTo).toBe('adult');
    expect(checkEvolution({ ...child, stage: 'adult' }, 99, 99, NOW).evolvedTo).toBeNull();
  });

  it('돌봄만으로는 자랄 수 없다 (공부한 날 조건)', () => {
    let p = hatched();
    for (let day = 0; day < 60; day++) {
      for (const action of ['feed', 'pet', 'wash', 'sleep'] as const) {
        const r = doCare(wake(p), action, NOW + day * DAY + 5 * HOUR);
        if (r.ok) p = r.pet;
      }
    }
    expect(p.growthXp).toBeGreaterThan(120);
    expect(checkEvolution(p, 0, 0, NOW + 60 * DAY).evolvedTo).toBeNull();
  });

  it('오답이 많아도 탐험 한 번의 XP는 비슷하다 (정답률 50% vs 100%)', () => {
    const xpFor = (pattern: boolean[]) =>
      pattern.reduce((sum, correct) => {
        const r = recordAnswer(initialLearning(), initialEconomy(), {
          factId: '7x8', type: 'product', correct, ms: 2000, inputMode: 'choice', isRetry: false,
          firstAttemptInBattle: true, battleStartedAt: NOW, now: NOW,
        });
        return sum + r.xp;
      }, 0);
    const perfect = xpFor(Array(9).fill(true));
    const half = xpFor([...Array(9).fill(true), ...Array(5).fill(false)]);
    expect(perfect).toBe(18);
    expect(half).toBeGreaterThanOrEqual(perfect);
  });
});

describe('이름과 표정', () => {
  it('이름: 공백 정리, 1~8자, 금칙어 거부', () => {
    expect(checkName('  냥  이 ')).toEqual({ ok: true, name: '냥 이' });
    expect(checkName('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(checkName('가나다라마바사아자')).toEqual({ ok: false, reason: 'long' });
    expect(checkName('바 보 시 발')).toEqual({ ok: false, reason: 'blocked' });
  });

  it('50 아래인 상태 중 가장 낮은 것이 가장 필요한 것', () => {
    expect(neediest(hatched({ fullness: 80, mood: 80, cleanliness: 80 }))).toBeNull();
    expect(neediest(hatched({ fullness: 40, mood: 80, cleanliness: 35 }))).toBe('cleanliness');
  });
});


describe('조사', () => {
  it('받침이 있으면 앞의 조사, 없으면 뒤의 조사', () => {
    expect(josa('냥냥이', '이', '가')).toBe('냥냥이가');
    expect(josa('별', '이', '가')).toBe('별이');
    expect(josa('뒤뚱이', '은', '는')).toBe('뒤뚱이는');
    expect(josa('Momo', '이', '가')).toBe('Momo가');
    expect(josa('별', '으로', '로')).toBe('별로');
    expect(josa('펫', '으로', '로')).toBe('펫으로');
  });
});
