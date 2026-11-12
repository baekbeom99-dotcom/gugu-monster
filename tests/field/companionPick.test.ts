import { describe, expect, it } from 'vitest';
import { pickReplacement } from '../../src/domain/field/companion';
import { SPECIES_IDS } from '../../src/store/fieldData';

const e = (level: number, hp: number, firstCaughtAt: number) => ({ level, hp, firstCaughtAt });

describe('pickReplacement: 쓰러지면 대신 함께 다닐 구구몬', () => {
  it('쓰러진 종을 빼고 레벨이 가장 높은 건강한 종', () => {
    expect(pickReplacement({ cloud: e(9, 0, 1), jelly: e(4, 100, 2), horn: e(7, 30, 3) }, 'cloud')).toBe('horn');
  });

  it('레벨이 같으면 먼저 잡은 종 (firstCaughtAt이 빠른 것)', () => {
    // 종 목록 순서로는 horn이 앞이지만, 먼저 잡은 jelly가 이긴다
    expect(pickReplacement({ cloud: e(5, 0, 1), horn: e(6, 100, 50), jelly: e(6, 100, 20) }, 'cloud')).toBe('jelly');
  });

  it('레벨·잡은 때도 같으면 종 목록(SPECIES_IDS) 순서', () => {
    // SPECIES_IDS 순서에서 horn이 jelly보다 앞 (객체에 넣은 순서와 상관없이)
    const a = pickReplacement({ cloud: e(5, 0, 1), horn: e(6, 100, 7), jelly: e(6, 100, 7) }, 'cloud');
    const b = pickReplacement({ cloud: e(5, 0, 1), jelly: e(6, 100, 7), horn: e(6, 100, 7) }, 'cloud');
    expect(a).toBe('horn');
    expect(b).toBe('horn');
    expect(SPECIES_IDS.indexOf('horn')).toBeLessThan(SPECIES_IDS.indexOf('jelly'));
  });

  it('다른 쓰러진 종은 후보가 아니다', () => {
    expect(pickReplacement({ cloud: e(5, 0, 1), jelly: e(30, 0, 2), horn: e(2, 1, 3) }, 'cloud')).toBe('horn');
  });

  it('건강한 다른 종이 없으면 null', () => {
    expect(pickReplacement({ cloud: e(5, 0, 1), jelly: e(9, 0, 2) }, 'cloud')).toBeNull();
    expect(pickReplacement({ cloud: e(5, 0, 1) }, 'cloud')).toBeNull();
    expect(pickReplacement({}, 'cloud')).toBeNull();
  });

  it('쓰러진 종 자신은 체력이 남아 있어도 고르지 않는다', () => {
    expect(pickReplacement({ cloud: e(50, 100, 1) }, 'cloud')).toBeNull();
  });

  it('종 목록에 없는 이름(constructor 등)은 무시', () => {
    const odd = { cloud: e(5, 0, 1), constructor: e(99, 100, 0) } as unknown as Parameters<typeof pickReplacement>[0];
    expect(pickReplacement(odd, 'cloud')).toBeNull();
  });
});
