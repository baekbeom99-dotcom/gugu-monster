/** 탐험 선택 — 설계서 4-2, 9-2 */
import { useNavigate } from 'react-router-dom';
import { playSfx } from '../audio/sfx';
import { ARITH_INFO, type ArithLevel, BASIC_ARITH_KINDS, COMP_ARITH_KINDS, HARD_ARITH_KINDS } from '../domain/arith';
import { practiceMasterMs } from '../domain/arithPractice';
import { BASE_DANS, CHALLENGE_DANS, type Dan } from '../domain/facts';
import { localDateString } from '../domain/dates';
import type { ExploreMode } from '../domain/scheduler';
import { useGameStore } from '../store/useGameStore';
import { battleUrl } from './BattleScreen';
import { practiceUrl } from './PracticeScreen';

/** 셈 연습 버튼 색: 기본 단계 흰색, 고수 단계 연한 분홍, 보수 연두 */
const PRACTICE_TONE: Record<ArithLevel, string> = { basic: 'basic', hard: 'hard', comp: 'comp' };

export function ExploreScreen() {
  const navigate = useNavigate();
  const learning = useGameStore((s) => s.learning);
  const dailyBonusDates = useGameStore((s) => s.economy.dailyBonusDates);
  const practice = useGameStore((s) => s.practice);
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
        {!firstTime && <span className="explore__main-mix">곱셈·덧셈·뺄셈이 섞여요 · 빨리 풀수록 별이 더 많아요!</span>}
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
          <h2 className="explore__heading">
            셈 연습 <span className="explore__hint">9문제를 하나도 안 틀리고 빨리 풀면 MASTER! (기본·보수 27초, 고수 45초)</span>
          </h2>
          {(
            [
              ['기본 단계', '한 자리 수', BASIC_ARITH_KINDS],
              ['고수 단계', '두 자리 수', HARD_ARITH_KINDS],
              ['보수', '10·5 만들기', COMP_ARITH_KINDS],
            ] as const
          ).map(([label, sub, kinds]) => (
            <div key={label} className="practice-group">
              <h3 className="practice-group__title">
                {label} <small>{sub}</small>
              </h3>
              <div className="practice-grid">
                {kinds.map((kind) => {
                  const rec = practice[kind];
                  const best = rec?.bestMs;
                  return (
                    <button
                      key={kind}
                      type="button"
                      className={`practice-button practice-button--${PRACTICE_TONE[ARITH_INFO[kind].level]}`}
                      aria-label={`${ARITH_INFO[kind].title}${rec?.master ? ' MASTER' : ''}${best != null ? `, 최고 기록 ${(best / 1000).toFixed(1)}초` : ''}`}
                      title={`MASTER: 오답 0개 · ${practiceMasterMs(kind) / 1000}초 안`}
                      onClick={() => {
                        playSfx('tap');
                        navigate(practiceUrl(kind));
                      }}
                    >
                      {rec?.master && <span className="master-sticker">MASTER</span>}
                      <span className="practice-button__title">{ARITH_INFO[kind].title.replace(/ \((기본|고수)\)$/, '')}</span>
                      <span className="practice-button__ex">{ARITH_INFO[kind].example}</span>
                      {best != null && <span className="practice-button__best">⏱ {(best / 1000).toFixed(1)}초</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
