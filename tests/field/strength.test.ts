import { describe, expect, it } from 'vitest';
import {
  rollTier,
  rollTierLevel,
  throwOdds,
  tierExp,
  tierLevelRange,
  type Tier,
} from '../../src/domain/field/strength';
import { COMPANION_MAX_HP, TIER_CHANCE, TIER_RULES } from '../../src/domain/field/tuning';

describe('야생 강함 단계', () => {
  it('단계 확률 합 1, 경계 (부동소수 합 오차를 피해 경계에서 0.001 떨어진 값)', () => {
    expect(Object.values<number>(TIER_CHANCE).reduce((a, b) => a + b)).toBeCloseTo(1);
    expect([0.149, 0.151, 0.799, 0.801, 0.949, 0.951].map((r) => rollTier(() => r))).toEqual([
      'weak',
      'normal',
      'normal',
      'strong',
      'strong',
      'mighty',
    ]);
  });

  it('레벨 범위와 1·30 경계', () => {
    expect(tierLevelRange('weak', 10)).toEqual([5, 7]);
    expect(tierLevelRange('mighty', 10)).toEqual([16, 19]);
    expect(tierLevelRange('weak', 2)).toEqual([1, 1]);
    expect(tierLevelRange('mighty', 28)).toEqual([30, 30]);
    expect(tierLevelRange('legend', 3)).toEqual([20, 20]);
  });

  it('범위 안에서 레벨을 뽑는다', () => {
    expect(rollTierLevel(() => 0, 'normal', 10)).toBe(9);
    expect(rollTierLevel(() => 0.999, 'normal', 10)).toBe(11);
    expect(rollTierLevel(() => 0.5, 'legend', 3)).toBe(20);
  });

  it('던지기 확률 (설계서 표)', () => {
    const t = (x: Tier) => Object.values(throwOdds(x)).map((v) => +v.toFixed(3));
    expect(t('weak')).toEqual([0.103, 0.657, 0.21, 0.03]);
    expect(t('normal')).toEqual([0.08, 0.68, 0.21, 0.03]);
    expect(t('strong')).toEqual([0.042, 0.718, 0.21, 0.03]);
    expect(t('mighty')).toEqual([0.027, 0.733, 0.21, 0.03]);
    expect(throwOdds('legend')).toEqual(throwOdds('mighty'));
    for (const x of Object.keys(TIER_RULES) as Tier[]) {
      const o = throwOdds(x);
      expect(o.caught + o.retry + o.escaped + o.angry).toBeCloseTo(1);
      expect(o.caught / (o.caught + o.escaped + o.angry)).toBeCloseTo(TIER_RULES[x].ultimateCatch); // 끝내 잡을 확률
    }
  });

  it('쓰러지는 피격 횟수 5·4·3·2, 황금 3', () => {
    expect(
      (['weak', 'normal', 'strong', 'mighty', 'legend'] as const).map((x) =>
        Math.ceil(COMPANION_MAX_HP / TIER_RULES[x].damage),
      ),
    ).toEqual([5, 4, 3, 2, 3]);
  });

  it('경험치 배율', () =>
    expect([tierExp(16, 'weak'), tierExp(40, 'strong'), tierExp(40, 'mighty')]).toEqual([10, 64, 120]));
});
