/** 회복약: 그 구구몬의 상처 문제를 HEAL_ROUNDS바퀴 풀면 다 낫는다. 시간 제한 없음, 틀리면 힌트 뒤 같은 문제. 중간에 나가면 그대로 */
import { useRef, useState } from 'react';
import { displayName } from '../../domain/field/growth';
import type { SpeciesId } from '../../domain/field/creatures';
import { answerHeal, createHealRun, healRunWound, leaveHealHint } from '../../domain/field/wounds';
import { HEAL_ROUNDS } from '../../domain/field/tuning';
import { useGameStore } from '../../store/useGameStore';
import { PracticeCard } from './PracticeCard';
import { shopText } from './shopText';

interface Props {
  species: SpeciesId;
  /** 다 나았고 결과를 확인했다 */
  onDone: () => void;
  /** 중간에 나간다 (아직 안 나음) */
  onQuit: () => void;
}

export function HealPractice({ species, onDone, onQuit }: Props) {
  const [run, setRun] = useState(() => createHealRun(useGameStore.getState().field.species[species]?.wounds ?? [], Math.random));
  /** 회복은 끝나는 순간 한 번만 */
  const healed = useRef(false);
  const stage = useGameStore((s) => s.field.species[species]?.stage ?? 1);
  const name = displayName(species, stage);
  const wound = healRunWound(run);

  const onAnswer = (correct: boolean) => {
    const next = answerHeal(run, correct, Math.random);
    setRun(next);
    if (next.done && !healed.current) {
      healed.current = true;
      useGameStore.getState().healSpecies(species);
    }
  };

  if (wound === null) {
    return (
      <div className="practice-result" role="status">
        <p className="practice-result__text">{shopText.healed(name)}</p>
        <button type="button" className="btn btn--primary fshop-btn" onClick={onDone}>
          {shopText.ok}
        </button>
      </div>
    );
  }
  return (
    <div className="practice-wrap">
      <div className="practice-head">
        <span className="practice-head__title">{shopText.healHeader(name, run.round + 1, HEAL_ROUNDS, run.index + 1, run.order.length)}</span>
        <button type="button" className="btn btn--ghost fshop-btn fshop-btn--small" onClick={onQuit}>
          {shopText.quit}
        </button>
      </div>
      <PracticeCard
        factId={wound.factId}
        type={wound.type}
        qkey={`h${run.round}:${run.index}:${wound.factId}:${wound.type}`}
        hint={run.hint}
        onAnswer={onAnswer}
        onHintPick={() => setRun(leaveHealHint(run))}
      />
    </div>
  );
}
