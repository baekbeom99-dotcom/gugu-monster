/** 탐험 선택 — 설계서 4-2, 9-2 */
import { useNavigate } from 'react-router-dom';
import { playSfx } from '../audio/sfx';
import { BASE_DANS, CHALLENGE_DANS, type Dan } from '../domain/facts';
import { localDateString } from '../domain/dates';
import type { ExploreMode } from '../domain/scheduler';
import { useGameStore } from '../store/useGameStore';
import { battleUrl } from './BattleScreen';

export function ExploreScreen() {
  const navigate = useNavigate();
  const learning = useGameStore((s) => s.learning);
  const dailyBonusDates = useGameStore((s) => s.economy.dailyBonusDates);
  const firstTime = learning.totalExplorations === 0;
  const playedToday = dailyBonusDates.includes(localDateString(Date.now()));

  const go = (mode: ExploreMode) => {
    playSfx('tap');
    navigate(battleUrl(mode));
  };

  const danButton = (dan: Dan, locked: boolean) => {
    const record = learning.danTrials?.[dan];
    const best = record?.bestMs != null ? `${(record.bestMs / 1000).toFixed(1)}초` : null;
    return (
      <button
        key={dan}
        type="button"
        className={`dan-button ${learning.masteredDans.includes(dan) ? 'dan-button--mastered' : ''} ${locked ? 'dan-button--locked' : ''}`}
        disabled={locked}
        onClick={() => go({ kind: 'dan', dan })}
        aria-label={locked ? `${dan}단 (잠김)` : `${dan}단${record?.master ? ' MASTER' : ''}${best ? `, 최고 기록 ${best}` : ''}`}
      >
        {record?.master && <span className="master-sticker">MASTER</span>}
        <span className="dan-button__num">
          {locked ? '🔒' : dan}
          <small>단</small>
        </span>
        {!locked && best && <span className="dan-button__best">⏱ {best}</span>}
      </button>
    );
  };

  return (
    <section className="explore">
      <button
        type="button"
        className="explore__main"
        onClick={() => go(firstTime ? { kind: 'diagnostic' } : { kind: 'recommended' })}
      >
        <span className="explore__main-icon" aria-hidden>
          👾
        </span>
        <span className="explore__main-title">{firstTime ? '첫 탐험 시작!' : '추천 탐험'}</span>
        <span className="explore__main-sub">
          {firstTime ? '어떤 몬스터가 나올까?' : playedToday ? '오늘도 탐험했어요! 한 번 더?' : '오늘 첫 탐험은 별 +5'}
        </span>
      </button>

      {!firstTime && (
        <>
          <h2 className="explore__heading">
            단 골라 탐험 <span className="explore__hint">×0~×10 11문제 · 하나도 안 틀리고 33초 안이면 MASTER!</span>
          </h2>
          <div className="dan-grid">{BASE_DANS.map((d) => danButton(d, false))}</div>
          <h2 className="explore__heading">
            도전 탐험 <span className="explore__hint">{learning.challengeUnlocked ? '황금 몬스터 출현!' : '2~9단 모두 마스터 배지나 MASTER를 받으면 열려요'}</span>
          </h2>
          <div className="dan-grid dan-grid--challenge">{CHALLENGE_DANS.map((d) => danButton(d, !learning.challengeUnlocked))}</div>
        </>
      )}
    </section>
  );
}
