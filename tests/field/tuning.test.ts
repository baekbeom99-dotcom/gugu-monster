import { describe, expect, it } from 'vitest';
import * as T from '../../src/domain/field/tuning';

// 운영 수치 고정표 — tuning.ts 값을 바꾸면 여기도 같이 바꾼다 (실수로 바뀌는 것을 막는다)
describe('필드 모험 운영 수치', () => {
  it('설계서 값 그대로', () => {
    expect({ ...T }).toEqual({
      ENCOUNTER_CHANCE: 0.12,
      ENCOUNTER_GRACE_STEPS: 3,
      LEGEND_CHANCE: 0.02,
      UNSEEN_WEIGHT: 2,
      WILD_LEVEL_MIN: 3,
      WILD_LEVEL_MAX: 6,
      LEGEND_LEVEL: 20,
      WILD_MAX_HP: 100,
      HIT_DAMAGE: 40,
      FAST_HIT_BONUS: 10,
      REGEN_PER_SEC: 3,
      WILD_MAX_QUESTIONS: 12,
      FLEE_BASE_LOW_MS: 7000,
      FLEE_BASE_MID_MS: 9000,
      FLEE_BASE_HIGH_MS: 12000,
      FLEE_LOW_BOX_BONUS_MS: 3000,
      FLEE_MISSING_BONUS_MS: 2000,
      CATCH_CHANCE: 0.3,
      CATCH_STEP: 0.15,
      ESCAPE_HP: 40,
      FIELD_CHOICES: 3,
      MAX_LEVEL: 30,
      DUPLICATE_EXP: 40,
      PARTICIPATION_EXP: 10,
      CORRECT_EXP: 2,
      EXP_BASE: 20,
      EXP_PER_LEVEL: 10,
      EVOLVE_LEVELS: { 2: 8, 3: 18 },
      STEP_MS: 180,
      TURN_TAP_MS: 120,
      ENCOUNTER_FLASH_MS: 800,
      WILD_INTRO_MS: 1200,
      WILD_HIT_ANIM_MS: 600,
      WILD_END_MS: 1500,
      CAPSULE_SHAKES: 3,
      CAPSULE_SHAKE_MS: 400,
      MIN_LOADING_MS: 600,
      WATER_FRAME_MS: 500,
    });
  });

  it('도망 시간은 7초(쉬운 문제)~17초(12단·처음 보는 빈칸)', () => {
    expect(T.FLEE_BASE_LOW_MS).toBe(7000);
    expect(T.FLEE_BASE_HIGH_MS + T.FLEE_LOW_BOX_BONUS_MS + T.FLEE_MISSING_BONUS_MS).toBe(17000);
  });
});
