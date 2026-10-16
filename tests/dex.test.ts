import { describe, expect, it } from 'vitest';
import {
  canGraduate,
  type DexEntry,
  favoriteCare,
  GRADUATION_LEVEL,
  lifeSnapshot,
  makeTitle,
  restorePet,
  sendToDex,
  swapWithDex,
} from '../src/domain/dex';
import {
  affectionForLevel,
  affectionLevel,
  affectionProgress,
  chooseEgg,
  doCare,
  hatch,
  initialPet,
  needsHatch,
  newEgg,
  type PetData,
} from '../src/domain/pet';
import { initialLearning, type LearningData } from '../src/domain/progress';

const NOW = new Date(2026, 9, 16, 10).getTime();

function pet(over: Partial<PetData> = {}): PetData {
  const p = hatch(chooseEgg(initialPet(NOW), 'cat'), '냥냥이', NOW, lifeSnapshot(initialLearning()));
  return { ...p, stage: 'adult', fullness: 100, mood: 100, cleanliness: 100, ...over };
}

describe('친밀도 레벨 (10을 넘어 계속)', () => {
  it('Lv10은 320, 그 뒤로는 80마다 한 레벨', () => {
    expect(affectionForLevel(10)).toBe(320);
    expect(affectionLevel(319)).toBe(9);
    expect(affectionLevel(320)).toBe(10);
    expect(affectionLevel(399)).toBe(10);
    expect(affectionLevel(400)).toBe(11);
    expect(affectionLevel(320 + 80 * 5)).toBe(15);
    expect(affectionForLevel(15)).toBe(720);
    expect(affectionProgress(360)).toBeCloseTo(0.5);
  });
});

describe('졸업 조건: 아직 졸업하지 않은 펫이 Lv10', () => {
  it('Lv10이면 단계와 상관없이 졸업, 졸업한 펫은 다시 졸업하지 않는다', () => {
    expect(GRADUATION_LEVEL).toBe(10);
    expect(canGraduate(pet({ affection: 319 }))).toBe(false);
    expect(canGraduate(pet({ affection: 320 }))).toBe(true);
    expect(canGraduate(pet({ affection: 320, stage: 'child' }))).toBe(true);
    expect(canGraduate(pet({ affection: 900, graduated: true }))).toBe(false);
    expect(canGraduate({ ...newEgg(NOW, 0), species: 'cat', affection: 999 })).toBe(false);
  });
});

describe('산책', () => {
  it('무료, 기분 +15·친밀도 +2, 1시간 대기, 놀기로 센다', () => {
    const r = doCare(pet({ mood: 50 }), 'walk', NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.pet.mood).toBe(65);
    expect(r.pet.affection).toBe(2);
    expect(r.pet.careCounts.walk).toBe(1);
    expect(doCare(r.pet, 'walk', NOW + 59 * 60_000)).toEqual({ ok: false, reason: 'cooldown' });
    expect(favoriteCare({ walk: 3, feed: 2 })).toBe('play');
  });
});

describe('칭호', () => {
  const learning = (over: Partial<LearningData> = {}): LearningData => ({ ...initialLearning(), ...over });

  it('어려운 문제를 많이 극복했으면 용감한, 많이 탐험했으면 탐험가', () => {
    expect(makeTitle(pet(), learning({ totalOvercome: 6, totalExplorations: 25 }))).toBe('용감한 탐험가');
  });

  it('친밀도가 높고 씻기기를 가장 많이 했으면 따뜻한 의사', () => {
    expect(makeTitle(pet({ affection: 300, careCounts: { wash: 20, 'item:hygiene': 5, feed: 10 } }), learning())).toBe('따뜻한 의사');
  });

  it('부화하기 전의 기록은 세지 않는다', () => {
    const before = learning({ totalOvercome: 30, totalExplorations: 50 });
    expect(makeTitle({ ...pet(), lifeStart: lifeSnapshot(before) }, before)).not.toMatch(/용감한|탐험가/);
  });
});

describe('졸업해서 도감으로', () => {
  it('칭호와 펫 전체 상태를 남기고 새 알로. 다음 탐험을 마치면 부화', () => {
    const l = { ...initialLearning(), totalExplorations: 30 };
    const r = sendToDex(pet({ affection: 330, equippedHat: 'hat_crown' }), l, NOW, 'graduated');
    expect(r.entry).toMatchObject({ name: '냥냥이', reason: 'graduated', affectionLevel: 10, hat: 'hat_crown' });
    expect(r.entry?.title).toBeTruthy();
    expect(r.entry?.pet).toMatchObject({ graduated: true, title: r.entry?.title, affection: 330 });
    expect(r.nextPet).toMatchObject({ species: null, stage: 'egg', graduated: false, affection: 0, eggBaseExplorations: 30 });
    expect(needsHatch(chooseEgg(r.nextPet, 'dino'), 31)).toBe(true);
  });
});

describe('도감의 펫과 자리 바꾸기', () => {
  const learning = initialLearning();
  const graduatedEntry = (): DexEntry => sendToDex(pet({ name: '나비', affection: 350 }), learning, NOW, 'graduated').entry!;

  it('고른 펫이 그대로(레벨·칭호) 돌아오고, 지금 펫은 쉬는 중으로 도감에 들어간다', () => {
    const old = graduatedEntry();
    const current = pet({ name: '퐁퐁', species: 'penguin', affection: 40, stage: 'baby' });
    const r = swapWithDex(current, [old], old.id, learning, NOW + 1000);
    if (!r.ok) throw new Error(r.reason);
    expect(r.pet).toMatchObject({ name: '나비', affection: 350, graduated: true, title: old.title });
    expect(r.dex).toHaveLength(1);
    expect(r.dex[0]).toMatchObject({ name: '퐁퐁', reason: 'resting', title: null });
    expect(r.dex[0].pet).toMatchObject({ graduated: false, affection: 40 });
  });

  it('졸업한 펫은 Lv10을 넘어 계속 오르고, 새 알은 졸업 안 한 펫이 Lv10일 때만', () => {
    const back = restorePet(graduatedEntry(), NOW);
    const r = doCare({ ...back, affection: 398 }, 'walk', NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(affectionLevel(r.pet.affection)).toBe(11);
    expect(canGraduate(r.pet)).toBe(false);

    // 쉬고 있던 새 펫을 다시 데려와 Lv10으로 키우면 그때 졸업
    const old = graduatedEntry();
    const s1 = swapWithDex(pet({ name: '퐁퐁', affection: 300 }), [old], old.id, learning, NOW);
    if (!s1.ok) throw new Error();
    const pongEntry = s1.dex[0];
    const s2 = swapWithDex(s1.pet, s1.dex, pongEntry.id, learning, NOW);
    if (!s2.ok) throw new Error();
    expect(s2.pet.name).toBe('퐁퐁');
    expect(canGraduate({ ...s2.pet, affection: 320 })).toBe(true);
  });

  it('지금 펫이 알이면 바꾸지 않는다 (알을 잃지 않게)', () => {
    const old = graduatedEntry();
    expect(swapWithDex(chooseEgg(newEgg(NOW, 3), 'dino'), [old], old.id, learning, NOW)).toEqual({ ok: false, reason: 'egg' });
    expect(swapWithDex(newEgg(NOW, 3), [old], old.id, learning, NOW)).toEqual({ ok: false, reason: 'egg' });
  });

  it('예전 버전 도감 기록(펫 상태 없음)도 이름·모습·레벨·모자로 다시 데려온다', () => {
    const legacy: DexEntry = {
      id: 'old1', species: 'dino', name: '룡룡', title: '따뜻한 의사', stage: 'adult', hatchedAt: '2026-10-01',
      leftAt: '2026-10-15', affectionLevel: 9, studyDays: 3, explorations: 12, hat: 'hat_crown', reason: 'graduated',
    };
    const p = restorePet(legacy, NOW);
    expect(p).toMatchObject({ species: 'dino', name: '룡룡', stage: 'adult', equippedHat: 'hat_crown', title: '따뜻한 의사', graduated: true });
    expect(affectionLevel(p.affection)).toBe(9);
  });
});
