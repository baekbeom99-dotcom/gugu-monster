/** 캡슐 얻기: 한 단을 ×1~×9 차례대로 풀면 캡슐 CAPSULE_REWARD개. 시간 제한 없음, 틀리면 힌트 뒤 같은 문제. 중간에 나가면 보상 없음 */
import { useRef, useState } from 'react';
import type { Dan } from '../../domain/facts';
import { CAPSULE_NAMES, type CapsuleType } from '../../domain/field/capsules';
import { createDanQuiz, answerDanQuiz, danQuizFact, leaveDanHint } from '../../domain/field/shopQuiz';
import { CAPSULE_REWARD, DAN_PRACTICE_FIRST, DAN_PRACTICE_LAST } from '../../domain/field/tuning';
import { useGameStore } from '../../store/useGameStore';
import { CapsuleBall } from '../art/CapsuleBall';
import { PracticeCard } from './PracticeCard';
import { shopText } from './shopText';

interface Props {
  dan: Dan;
  type: CapsuleType;
  /** 끝까지 풀고 결과를 확인했다 */
  onDone: () => void;
  /** 중간에 나간다 (보상 없음) */
  onQuit: () => void;
}

const TOTAL = DAN_PRACTICE_LAST - DAN_PRACTICE_FIRST + 1;

export function DanPractice({ dan, type, onDone, onQuit }: Props) {
  const [quiz, setQuiz] = useState(() => createDanQuiz(dan));
  /** 캡슐은 끝나는 순간 한 번만 준다 */
  const granted = useRef(false);
  const factId = danQuizFact(quiz);

  const onAnswer = (correct: boolean) => {
    const next = answerDanQuiz(quiz, correct);
    setQuiz(next);
    if (next.done && !granted.current) {
      granted.current = true;
      useGameStore.getState().grantCapsules(type, CAPSULE_REWARD);
    }
  };

  if (factId === null) {
    return (
      <div className="practice-result" role="status">
        <CapsuleBall type={type} size={72} />
        <p className="practice-result__text">{shopText.gotCapsules(CAPSULE_NAMES[type], CAPSULE_REWARD)}</p>
        <button type="button" className="btn btn--primary fshop-btn" onClick={onDone}>
          {shopText.ok}
        </button>
      </div>
    );
  }
  return (
    <div className="practice-wrap">
      <div className="practice-head">
        <span className="practice-head__title">{shopText.practiceHeader(dan, quiz.index + 1, TOTAL)}</span>
        <button type="button" className="btn btn--ghost fshop-btn fshop-btn--small" onClick={onQuit}>
          {shopText.quit}
        </button>
      </div>
      <PracticeCard
        factId={factId}
        type="product"
        qkey={`d${quiz.index}`}
        hint={quiz.hint}
        onAnswer={onAnswer}
        onHintPick={() => setQuiz(leaveDanHint(quiz))}
      />
    </div>
  );
}
