/** 첫 구구몬 고르기 — 필드 모험을 처음 열 때 한 번 */
import { useNavigate } from 'react-router-dom';
import { STARTERS, speciesDef } from '../domain/field/creatures';
import { useGameStore } from '../store/useGameStore';
import { creatureSprite, speciesColor } from './creatureSprite';
import './fieldDex.css';

export function StarterScreen() {
  const navigate = useNavigate();
  return (
    <section className="starter">
      <h1 className="starter__title">첫 친구를 골라요!</h1>
      <p className="starter__lead">함께 모험할 구구몬이에요. 누르면 친구가 돼요.</p>
      <div className="starter__list">
        {STARTERS.map((id) => {
          const def = speciesDef(id);
          return (
            <button
              key={id}
              type="button"
              className="starter__card"
              aria-label={`${def.name} 고르기`}
              onClick={() => {
                useGameStore.getState().chooseStarter(id, Date.now());
                navigate('/field', { replace: true });
              }}
            >
              {creatureSprite(id, { view: 'front', color: speciesColor(id), size: 96 })}
              <span className="starter__name">{def.name}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="btn btn--ghost" onClick={() => navigate('/')}>
        처음 화면
      </button>
    </section>
  );
}
