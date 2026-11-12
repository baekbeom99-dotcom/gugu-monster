/** 상점 [캡슐] 탭의 한 단 연습 — 설계서 5절. 한 단을 ×1~×9 차례대로 풀고, 틀리면 힌트 뒤 같은 문제 */
import { CHALLENGE_DANS, factId, type Dan, type FactId, type Multiplier } from '../facts';
import type { CapsuleType } from './capsules';
import { FIELDS, LEGEND_DAN } from './fields';
import { DAN_PRACTICE_FIRST, DAN_PRACTICE_LAST } from './tuning';

/** 캡슐 종류별로 연습할 수 있는 단 (12·13단은 도전 단이 열리기 전에는 잠김). 단 목록은 필드 표를 그대로 쓴다 */
export function practiceDans(t: CapsuleType, challengeUnlocked: boolean): { dan: Dan; locked: boolean }[] {
  const dans: Dan[] = t === 'legend' ? [LEGEND_DAN] : FIELDS[t].dans;
  return dans.map((dan) => ({
    dan,
    locked: !challengeUnlocked && (CHALLENGE_DANS as readonly number[]).includes(dan),
  }));
}

export interface DanQuiz {
  dan: Dan;
  /** 지금 풀 문제 번호 (0부터) */
  index: number;
  /** 틀려서 힌트를 보여 주는 중 */
  hint: boolean;
  done: boolean;
}

const QUIZ_LENGTH = DAN_PRACTICE_LAST - DAN_PRACTICE_FIRST + 1;

export function createDanQuiz(dan: Dan): DanQuiz {
  return { dan, index: 0, hint: false, done: false };
}

/** 지금 풀 문제. 다 끝났으면 풀 문제가 없으니 null */
export function danQuizFact(q: DanQuiz): FactId | null {
  if (q.done) return null;
  return factId(q.dan, (DAN_PRACTICE_FIRST + q.index) as Multiplier);
}

/** 맞히면 다음 문제, 틀리면 힌트(같은 문제). 끝났거나 힌트 중이면 연타해도 그대로 */
export function answerDanQuiz(q: DanQuiz, correct: boolean): DanQuiz {
  if (q.done || q.hint) return q;
  if (!correct) return { ...q, hint: true };
  const index = q.index + 1;
  return { ...q, index, done: index >= QUIZ_LENGTH };
}

/** 힌트를 닫으면 같은 문제를 다시 푼다 */
export function leaveDanHint(q: DanQuiz): DanQuiz {
  return q.hint ? { ...q, hint: false } : q;
}
