/** 상점 연습 문제 한 장 — 한 단 연습과 회복 연습이 같이 쓴다. 문제·보기·힌트와 학습 기록을 맡는다 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { HintPanel } from '../../components/HintPanel';
import { QuestionView } from '../../components/QuestionView';
import { type FactId, getFact } from '../../domain/facts';
import { FIELD_CHOICES, SHOP_ANSWER_GUARD_MS } from '../../domain/field/tuning';
import { generateQuestion, type QuestionType } from '../../domain/questionGen';
import { useGameStore } from '../../store/useGameStore';
import { shopText } from './shopText';
import '../../screens/battle.css';
import './shop.css';

interface Props {
  factId: FactId;
  type: QuestionType;
  /** 문제가 바뀌는 때마다 달라지는 값. 같은 문제를 힌트 뒤에 다시 낼 때는 그대로 (R22: 보기도 그대로) */
  qkey: string;
  /** 틀려서 힌트를 보여 주는 중 */
  hint: boolean;
  onAnswer: (correct: boolean) => void;
  onHintPick: () => void;
}

export function PracticeCard({ factId, type, qkey, hint, onAnswer, onHintPick }: Props) {
  const fact = getFact(factId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const question = useMemo(() => generateQuestion(Math.random, fact, type, FIELD_CHOICES), [qkey]);
  /** 연습을 시작한 시각, 이 연습에서 이미 푼 사실 (오답 극복 판정에 쓴다) */
  const startedAt = useRef(Date.now());
  const seen = useRef(new Set<FactId>());
  /** 이 연습에서 한 번이라도 틀린 사실 — 이후의 답은 재출제 답(isRetry)으로 기록해 오답 복습에 남게 한다 */
  const missed = useRef(new Set<FactId>());
  const shownAt = useRef(Date.now());
  /** 이 문제(또는 힌트)에 이미 답했다 — 한 번만 기록하려고 */
  const used = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    used.current = false;
    shownAt.current = Date.now();
    setReady(false);
    const t = window.setTimeout(() => setReady(true), SHOP_ANSWER_GUARD_MS);
    return () => clearTimeout(t);
  }, [qkey, hint]);

  const pick = (n: number) => {
    if (!ready || used.current) return;
    used.current = true;
    if (hint) {
      onHintPick(); // 힌트에서 빛나는 보기를 누르는 것은 기록하지 않는다
      return;
    }
    const correct = n === question.answer;
    useGameStore.getState().recordAnswer({
      factId,
      type,
      correct,
      ms: Date.now() - shownAt.current,
      inputMode: 'choice',
      isRetry: missed.current.has(factId),
      firstAttemptInBattle: !seen.current.has(factId),
      battleStartedAt: startedAt.current,
      now: Date.now(),
      source: 'field',
    });
    seen.current.add(factId);
    if (!correct) missed.current.add(factId);
    onAnswer(correct);
  };

  return (
    <div className="practice" data-fact={factId}>
      <div className="practice__q">
        <QuestionView display={question.display} />
      </div>
      {hint && (
        <div className="practice__hint">
          <HintPanel fact={fact} type={type} />
        </div>
      )}
      <p className="hint-instruction">{hint ? shopText.hintGuide : shopText.choose}</p>
      <div className="practice__choices">
        {question.choices.map((n) => {
          const glow = hint && n === question.answer;
          return (
            <button
              key={n}
              type="button"
              className={`fshop-choice ${glow ? 'fshop-choice--glow' : ''}`}
              disabled={!ready || (hint && !glow)}
              onClick={() => pick(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
