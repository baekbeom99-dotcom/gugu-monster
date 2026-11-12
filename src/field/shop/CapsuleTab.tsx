/** [캡슐] 탭: 네 종류 줄(그림·이름·보유 수·[얻기]) → 단 고르기 → 연습 */
import { useState } from 'react';
import type { Dan } from '../../domain/facts';
import { CAPSULE_NAMES, CAPSULE_TYPES, type CapsuleType } from '../../domain/field/capsules';
import { practiceDans } from '../../domain/field/shopQuiz';
import { useGameStore } from '../../store/useGameStore';
import { CapsuleBall } from '../art/CapsuleBall';
import { shopText } from './shopText';

export function CapsuleTab({ onPractice }: { onPractice: (type: CapsuleType, dan: Dan) => void }) {
  const capsules = useGameStore((s) => s.field.capsules);
  const challengeUnlocked = useGameStore((s) => s.learning.challengeUnlocked);
  const [picking, setPicking] = useState<CapsuleType | null>(null);

  if (picking) {
    const dans = practiceDans(picking, challengeUnlocked);
    return (
      <div className="fshop-section">
        <p className="fshop-note">{shopText.pickDan(CAPSULE_NAMES[picking])}</p>
        <div className="fshop-dans">
          {dans.map(({ dan, locked }) => (
            <button key={dan} type="button" className="btn btn--primary fshop-btn fshop-dan" disabled={locked} onClick={() => onPractice(picking, dan)}>
              {shopText.danLabel(dan)}
              {locked ? ' 🔒' : ''}
            </button>
          ))}
        </div>
        {dans.some((d) => d.locked) && <p className="fshop-note fshop-note--small">{shopText.lockedDan}</p>}
        <button type="button" className="btn btn--ghost fshop-btn" onClick={() => setPicking(null)}>
          {shopText.back}
        </button>
      </div>
    );
  }
  return (
    <ul className="fshop-list">
      {CAPSULE_TYPES.map((t) => (
        <li key={t} className="fshop-row" data-capsule={t}>
          <CapsuleBall type={t} size={44} />
          <span className="fshop-row__name">{CAPSULE_NAMES[t]}</span>
          <span className="fshop-row__count" aria-label={`${CAPSULE_NAMES[t]} ${capsules[t]}개`}>
            {capsules[t]}
          </span>
          <button type="button" className="btn btn--primary fshop-btn fshop-btn--small" aria-label={`${CAPSULE_NAMES[t]} ${shopText.get}`} onClick={() => setPicking(t)}>
            {shopText.get}
          </button>
        </li>
      ))}
    </ul>
  );
}
