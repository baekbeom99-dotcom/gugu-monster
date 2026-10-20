import { describe, expect, it } from 'vitest';
import {
  affectionLevel,
  applyDecay,
  CARE_XP_DAILY_CAP,
  checkEvolution,
  growthProgress,
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

  it('30일을 쉬어도 최대 24시간분만 줄어든다 (하한 0)', () => {
    const p = applyDecay(hatched({ fullness: 100, mood: 100, cleanliness: 100 }), NOW + 30 * DAY);
    expect(p.fullness).toBe(100 - 3 * 24);
    expect(p.mood).toBe(100 - 2 * 24);
    expect(p.cleanliness).toBe(100 - 1.5 * 24);
    expect(STAT_MIN).toBe(0);
    expect(applyDecay(hatched({ fullness: 20 }), NOW + 30 * DAY).fullness).toBe(0);
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
      // 놀면 배고파지므로(배부름 15 이하면 밥만) 매번 배부르게 해 둔다
      const r = doCare({ ...p, fullness: 100, cleanliness: 100 }, 'pet', NOW + i * 11 * 60_000);
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

describe('성장 (친밀도 레벨로 진화)', () => {
  it('친밀도 Lv3이 되면 어린이로 진화한다', () => {
    expect(checkEvolution(hatched({ affection: 24 }), NOW).evolvedTo).toBeNull();
    const r = checkEvolution(hatched({ affection: 25 }), NOW);
    expect(r.evolvedTo).toBe('child');
    expect(r.pet.evolutionCards.map((c) => c.stage)).toEqual(['baby', 'child']);
  });

  it('친밀도 Lv6이 되면 다 자란다', () => {
    const child = hatched({ stage: 'child', affection: 99 });
    expect(checkEvolution(child, NOW).evolvedTo).toBeNull();
    expect(checkEvolution({ ...child, affection: 100 }, NOW).evolvedTo).toBe('adult');
    expect(checkEvolution({ ...child, stage: 'adult', affection: 9999 }, NOW).evolvedTo).toBeNull();
  });

  it('레벨이 한 번에 많이 오르면 두 단계를 함께 자란다', () => {
    const r = checkEvolution(hatched({ affection: 150 }), NOW);
    expect(r.evolvedTo).toBe('adult');
    expect(r.pet.evolutionCards.map((c) => c.stage)).toEqual(['baby', 'child', 'adult']);
  });

  it('다음 진화까지 남은 레벨', () => {
    expect(growthProgress(hatched({ affection: 10 }))).toEqual({ next: 'child', level: { have: 2, need: 3 } });
    expect(growthProgress(hatched({ stage: 'child', affection: 45 }))).toEqual({ next: 'adult', level: { have: 4, need: 6 } });
    expect(growthProgress(hatched({ stage: 'adult' })).next).toBeNull();
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

describe('놀기·잠의 대가', () => {
  it('쓰다듬기·산책: 배부름·깨끗함 −30, 깨끗함이 15 이하가 되면 병에 걸린다', () => {
    for (const action of ['pet', 'walk'] as const) {
      const r = doCare(hatched({ fullness: 90, cleanliness: 45, mood: 50 }), action, NOW);
      if (!r.ok) throw new Error(r.reason);
      expect(r.pet.fullness).toBe(60);
      expect(r.pet.cleanliness).toBe(15);
      expect(r.pet.sick).toEqual({ since: NOW, cause: 'dirty' });
      // 놀아서 기분 +5(+15) 뒤 아파서 −15
      expect(r.pet.mood).toBe(action === 'pet' ? 40 : 50);
    }
  });

  it('잠: 배부름 −50 (하한 30), 기분 +10', () => {
    const r = doCare(hatched({ fullness: 100, mood: 50 }), 'sleep', NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.pet.fullness).toBe(50);
    expect(r.pet.mood).toBe(60);
    const low = doCare(hatched({ fullness: 60 }), 'sleep', NOW);
    expect(low.ok && low.pet.fullness).toBe(10);
  });
});
