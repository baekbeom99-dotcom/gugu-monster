/** [회복약] 탭: 체력이 깎인 구구몬 목록 → 고르면 상처 문제 회복 연습 (상처가 없으면 바로 회복) */
import { useState } from 'react';
import { DAN_COLORS } from '../../art/colors';
import { displayName } from '../../domain/field/growth';
import { COMPANION_MAX_HP } from '../../domain/field/tuning';
import { isFainted } from '../../domain/field/wounds';
import { SPECIES_IDS, type SpeciesId } from '../../store/fieldData';
import { useGameStore } from '../../store/useGameStore';
import { creatureSprite } from '../art/creatureSprite';
import { shopText } from './shopText';

export function PotionTab({ onPractice }: { onPractice: (id: SpeciesId) => void }) {
  const species = useGameStore((s) => s.field.species);
  const [done, setDone] = useState<string | null>(null);
  const hurt = SPECIES_IDS.filter((id) => {
    const e = species[id];
    return !!e && e.hp < COMPANION_MAX_HP;
  });

  const pick = (id: SpeciesId) => {
    const e = species[id]!;
    if (e.wounds.length > 0) return onPractice(id);
    // 풀 문제가 없으니 바로 회복
    useGameStore.getState().healSpecies(id);
    setDone(displayName(id, e.stage));
  };

  return (
    <div className="fshop-section">
      {done && (
        <p className="fshop-note fshop-note--good" role="status">
          {shopText.healed(done)}
        </p>
      )}
      {hurt.length === 0 ? (
        <p className="fshop-note">{shopText.allHealthy}</p>
      ) : (
        <>
          <p className="fshop-note fshop-note--small">{shopText.healPick}</p>
          <ul className="fshop-list">
            {hurt.map((id) => {
              const e = species[id]!;
              const name = displayName(id, e.stage);
              const down = isFainted(e);
              return (
                <li key={id}>
                  <button type="button" className="fshop-row fshop-row--btn" data-species={id} aria-label={`${name} 고치기`} onClick={() => pick(id)}>
                    {creatureSprite(id, { view: 'front', stage: e.stage, color: DAN_COLORS[5], size: 44 })}
                    <span className="fshop-row__name">
                      {name} <small>Lv{e.level}</small>
                      <span className="fshop-hp" role="img" aria-label={`체력 ${e.hp}`}>
                        <span className="fshop-hp__fill" style={{ width: `${e.hp}%` }} />
                      </span>
                    </span>
                    <span className={`fshop-row__state ${down ? 'fshop-row__state--down' : ''}`}>
                      {down ? shopText.fainted : shopText.wounds(e.wounds.length)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
