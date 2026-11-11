/** 야생 전투 문제 받기 — 추천 탐험 엔진으로 문제 목록을 만들고, 다 쓰면 이어 붙이고, 틀린 사실은 다시 넣는다 */
import { useCallback, useMemo, useState } from 'react';
import type { Encounter } from '../../domain/field/encounter';
import { FIELD_CHOICES, planFieldQuestions, planLegendQuestions, restrictToFieldType } from '../../domain/field/fieldQuestions';
import { type FactId, getFact } from '../../domain/facts';
import { generateQuestion, type QuestionType } from '../../domain/questionGen';
import type { Rng } from '../../domain/random';
import { insertRetry, type LearnerSnapshot, type PlannedItem } from '../../domain/scheduler';
import { useGameStore } from '../../store/useGameStore';
import { debugFlags } from '../debugFlags';

function snapshot(): LearnerSnapshot {
  const { learning } = useGameStore.getState();
  return {
    facts: learning.facts,
    danRecent: learning.danRecent,
    challengeUnlocked: learning.challengeUnlocked,
    boosted: learning.boosted,
  };
}

function planFor(encounter: Encounter, rng: Rng): PlannedItem[] {
  const forced = debugFlags().question;
  if (forced)
    return Array.from({ length: 5 }, () => ({ factId: forced.factId as FactId, type: forced.type as QuestionType, isRetry: false, isConfidence: false }));
  const learner = snapshot();
  if (encounter.legend) return planLegendQuestions(learner, Date.now(), rng);
  return planFieldQuestions(learner, useGameStore.getState().field.position.map, Date.now(), rng);
}

/** 문제 받기: 목록을 다 쓰면 새로 받아 이어 붙이고, 틀린 사실은 필드 모양으로 다시 넣는다 */
export function useQuestionFeed(encounter: Encounter, rng: Rng) {
  const [feed, setFeed] = useState(() => ({ plan: planFor(encounter, rng), index: 0 }));
  const item = feed.plan[feed.index];
  const fact = getFact(item.factId);
  const key = `${feed.index}:${item.factId}:${item.type}:${item.isRetry}`;
  const question = useMemo(() => generateQuestion(rng, fact, item.type, FIELD_CHOICES), [key]);

  const next = useCallback(
    (retryWrong: boolean) =>
      setFeed((f) => {
        let plan = f.plan;
        if (retryWrong) {
          const before = plan;
          plan = insertRetry(before, f.index, rng);
          // 새로 끼워 넣은 문제를 찾아 모양을 필드 것으로 (틀린 직후 상자는 1)
          const at = plan.findIndex((it, i) => it !== before[i]);
          if (plan.length > before.length && at >= 0) {
            const r = plan[at];
            plan = plan.map((it, i) => (i === at ? { ...r, type: restrictToFieldType(rng, getFact(r.factId), 1, r.type) } : it));
          }
        }
        const index = f.index + 1;
        if (index >= plan.length) plan = [...plan, ...planFor(encounter, rng)];
        return { plan, index };
      }),
    [encounter, rng],
  );

  return { item, fact, question, key, next };
}
