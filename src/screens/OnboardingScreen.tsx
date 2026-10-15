/** 첫 실행: 환영 → 알 고르기 → 첫 탐험 안내 — 설계서 6-1 */
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { EggSprite } from '../art/PetSprite';
import { playSfx } from '../audio/sfx';
import { SPECIES, SPECIES_INFO, type Species } from '../domain/pet';
import { useGameStore } from '../store/useGameStore';
import './pet.css';

export function OnboardingScreen() {
  const navigate = useNavigate();
  const species = useGameStore((s) => s.pet.species);
  const stage = useGameStore((s) => s.pet.stage);
  const chooseEgg = useGameStore((s) => s.chooseEgg);
  const dexCount = useGameStore((s) => s.dex.length);
  const explorations = useGameStore((s) => s.learning.totalExplorations);
  const returning = dexCount > 0 || explorations > 0;
  const [step, setStep] = useState<'welcome' | 'choose' | 'ready'>(species ? 'ready' : returning ? 'choose' : 'welcome');
  const [picked, setPicked] = useState<Species | null>(null);

  if (stage !== 'egg') return <Navigate to="/pet" replace />;

  if (step === 'welcome') {
    return (
      <section className="onboarding">
        <h1 className="onboarding__title">구구단 몬스터 탐험대</h1>
        <p className="onboarding__lead">구구단을 풀어 몬스터를 잡고, 나만의 펫을 키워요!</p>
        <div className="egg-trio" aria-hidden>
          {SPECIES.map((s, i) => (
            <EggSprite key={s} species={s} size={96} className={`egg-wobble egg-wobble--${i}`} />
          ))}
        </div>
        <button
          type="button"
          className="btn btn--primary onboarding__cta"
          onClick={() => {
            playSfx('tap');
            setStep('choose');
          }}
        >
          시작하기
        </button>
      </section>
    );
  }

  if (step === 'choose') {
    return (
      <section className="onboarding">
        <h1 className="onboarding__heading">{returning ? '새 친구가 될 알을 골라 줘!' : '함께할 알을 골라 줘!'}</h1>
        <div className="egg-choices">
          {SPECIES.map((s) => (
            <button
              key={s}
              type="button"
              className={`neo-card egg-choice ${picked === s ? 'egg-choice--picked' : ''}`}
              onClick={() => {
                playSfx('tap');
                setPicked(s);
              }}
              aria-pressed={picked === s}
            >
              <EggSprite species={s} size={84} className={picked === s ? 'egg-wobble' : ''} />
              <span className="egg-choice__text">
                <strong>{SPECIES_INFO[s].egg}</strong>
                <span>{picked === s ? SPECIES_INFO[s].desc : '어떤 친구가 나올까?'}</span>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn--primary onboarding__cta"
          disabled={!picked}
          onClick={() => {
            if (!picked) return;
            playSfx('star');
            chooseEgg(picked);
            setStep('ready');
          }}
        >
          이 알로 할래!
        </button>
        {dexCount > 0 && (
          <button type="button" className="link-button" onClick={() => navigate('/dex')}>
            📖 도감 보기 ({dexCount}마리)
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="onboarding">
      {species && <EggSprite species={species} size={180} className="egg-wobble" />}
      <div className="neo-card speech">
        {returning
          ? '탐험을 한 번 다녀오면 알이 깨어나! 같이 가 볼까?'
          : '알을 따뜻하게 하려면 몬스터를 잡아야 해! 첫 탐험을 떠나 볼까?'}
      </div>
      <button
        type="button"
        className="btn btn--primary onboarding__cta"
        onClick={() => {
          playSfx('tap');
          navigate(explorations === 0 ? '/battle?mode=diagnostic' : '/battle?mode=recommended');
        }}
      >
        {explorations === 0 ? '첫 탐험 떠나기' : '탐험 떠나기'}
      </button>
    </section>
  );
}
