/** 부화 → 이름 짓기 → 시작 선물 — 설계서 6-1 */
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { EggSprite, PetSprite } from '../art/PetSprite';
import { playSfx } from '../audio/sfx';
import { Confetti } from '../components/Confetti';
import { STAR_REWARDS } from '../domain/economy';
import { josa } from '../domain/korean';
import { checkName, NAME_MAX, SPECIES_INFO } from '../domain/pet';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import './pet.css';

type Phase = 'crack' | 'hello' | 'name' | 'gift';

const NAME_ERRORS = {
  empty: '이름을 적어 줘!',
  long: `이름은 ${NAME_MAX}글자까지 쓸 수 있어요`,
  blocked: '다른 이름으로 지어 줄까?',
};

export function HatchScreen() {
  const navigate = useNavigate();
  const pet = useGameStore((s) => s.pet);
  const hatchPet = useGameStore((s) => s.hatchPet);
  const [phase, setPhase] = useState<Phase>(pet.stage === 'egg' ? 'crack' : 'gift');
  const [cracks, setCracks] = useState<0 | 1 | 2 | 3>(0);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'crack') return;
    if (cracks < 3) {
      const t = setTimeout(() => {
        playSfx('tap');
        setCracks((c) => (c + 1) as 1 | 2 | 3);
      }, 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      playSfx('fanfare');
      setPhase('hello');
    }, 700);
    return () => clearTimeout(t);
  }, [phase, cracks]);

  if (!pet.species) return <Navigate to="/welcome" replace />;
  const info = SPECIES_INFO[pet.species];

  const submit = () => {
    const r = checkName(name);
    if (!r.ok) {
      setError(NAME_ERRORS[r.reason]);
      playSfx('gentle');
      return;
    }
    hatchPet(r.name, Date.now());
    playSfx('star');
    setPhase('gift');
  };

  return (
    <section className="onboarding hatch">
      {phase === 'crack' && (
        <>
          <h1 className="onboarding__heading">어? 알이 흔들려요!</h1>
          <EggSprite species={pet.species} cracks={cracks} size={200} className="egg-shake" />
        </>
      )}

      {phase === 'hello' && (
        <>
          <Confetti />
          <div className="hatch__burst">
            <PetSprite species={pet.species} stage="baby" expression="excited" size={220} className="pop-in" />
          </div>
          <div className="neo-card speech">안녕! 나는 {info.name}야. 만나서 반가워!</div>
          <button type="button" className="btn btn--primary onboarding__cta" onClick={() => setPhase('name')}>
            이름 지어 주기
          </button>
        </>
      )}

      {phase === 'name' && (
        <>
          <PetSprite species={pet.species} stage="baby" expression="request" size={170} />
          <h1 className="onboarding__heading">내 이름은 뭐야?</h1>
          <form
            className="name-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              className="name-input"
              value={name}
              maxLength={NAME_MAX + 4}
              placeholder={info.name}
              aria-label="펫 이름"
              autoFocus
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
            {error && <p className="name-error">{error}</p>}
            <div className="name-suggest">
              {[info.name, '말랑이', '별이'].map((s) => (
                <button key={s} type="button" className="chip" onClick={() => setName(s)}>
                  {s}
                </button>
              ))}
            </div>
            <button type="submit" className="btn btn--primary onboarding__cta">
              이 이름으로 할래!
            </button>
          </form>
        </>
      )}

      {phase === 'gift' && (
        <>
          <PetSprite species={pet.species} stage="baby" expression="happy" size={190} className="pet-hop" />
          <h1 className="onboarding__heading">{josa(pet.name || info.name, '이', '가')} 태어났어요!</h1>
          <div className="neo-card gift">
            <span className="gift__label">시작 선물</span>
            <span className="gift__stars">★ {STAR_REWARDS.startGift}</span>
          </div>
          <div className="neo-card speech">배가 고파! 같이 놀러 가자!</div>
          <button
            type="button"
            className="btn btn--primary onboarding__cta"
            onClick={() => {
              useSessionStore.getState().set({ feedTutorial: true });
              navigate('/pet', { replace: true });
            }}
          >
            펫에게 가기
          </button>
        </>
      )}
    </section>
  );
}
