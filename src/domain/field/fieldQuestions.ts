/** 필드 모험 출제 — 기존 추천 탐험 엔진에 단 목록·유형 제한을 걸어 쓴다. */
import { type Fact, getFact } from '../facts';
import { type Box, FIELD_MAX_BOX } from '../mastery';
import { isTypeEligible, type QuestionType } from '../questionGen';
import { pickOne, type Rng } from '../random';
import { type LearnerSnapshot, planExploration, type PlannedItem } from '../scheduler';
import { type FieldId, LEGEND_DAN, fieldDans } from './fields';

export { FIELD_MAX_BOX };
/** 필드 문제 모양: 답 구하기, 앞 수 찾기, 뒤 수 찾기 (뛰어 세기·바꿔 곱하기 없음) */
export const FIELD_TYPES: readonly QuestionType[] = ['product', 'missingFirst', 'missingSecond'];
/** 필드 보기 개수 */
export const FIELD_CHOICES = 3;
export { LEGEND_DAN };

/**
 * FIELD_TYPES 밖 유형이면 출제 조건(isTypeEligible)을 지키며 FIELD_TYPES 중에서 다시 고른다. 상자 0은 product.
 * 다시 내는 문제(insertRetry)에도 쓴다.
 */
export function restrictToFieldType(rng: Rng, fact: Fact, box: Box, type: QuestionType): QuestionType {
  if (FIELD_TYPES.includes(type)) return type;
  const options = FIELD_TYPES.filter((t) => isTypeEligible(t, fact, box));
  return options.length > 0 ? pickOne(rng, options) : 'product';
}

function restrictTypes(learner: LearnerSnapshot, plan: PlannedItem[], rng: Rng): PlannedItem[] {
  return plan.map((item) =>
    FIELD_TYPES.includes(item.type)
      ? item
      : { ...item, type: restrictToFieldType(rng, getFact(item.factId), learner.facts[item.factId].box, item.type) },
  );
}

/**
 * 필드(초원·물가·사막) 한 번의 문제 목록.
 * 본 문제는 그 필드의 단에서, 다른 단은 오답 복습 슬롯으로만 들어온다.
 */
export function planFieldQuestions(learner: LearnerSnapshot, field: FieldId, now: number, rng: Rng): PlannedItem[] {
  const dans = fieldDans(field, learner.challengeUnlocked);
  const plan = planExploration(learner, { kind: 'recommended' }, now, rng, { dans, reviewFromAllDans: true });
  return restrictTypes(learner, plan, rng);
}

/** 레전드(13단) 문제 목록. 다른 단 복습 없음. 13단은 해금 뒤에만 열린다. */
export function planLegendQuestions(learner: LearnerSnapshot, now: number, rng: Rng): PlannedItem[] {
  if (!learner.challengeUnlocked) throw new Error('13단은 아직 열리지 않았다');
  const plan = planExploration(learner, { kind: 'recommended' }, now, rng, { dans: [LEGEND_DAN] });
  return restrictTypes(learner, plan, rng);
}
