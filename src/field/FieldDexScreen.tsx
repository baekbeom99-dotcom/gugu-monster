/** 구구몬 도감 — 필드별 묶음 + 레전드. 잡은 칸을 누르면 함께 다니기 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SPECIES, speciesDef, type SpeciesId } from '../domain/field/creatures';
import { FIELDS } from '../domain/field/fields';
import { displayName } from '../domain/field/growth';
import { useGameStore } from '../store/useGameStore';
import { creatureSprite, speciesColor } from './creatureSprite';
import './fieldDex.css';

const GROUPS: { title: string; ids: SpeciesId[] }[] = [
  ...(Object.keys(FIELDS) as (keyof typeof FIELDS)[]).map((f) => ({
    title: FIELDS[f].name,
    ids: SPECIES.filter((s) => s.field === f).map((s) => s.id),
  })),
  { title: '레전드', ids: SPECIES.filter((s) => s.legend).map((s) => s.id) },
];

export function FieldDexScreen() {
  const navigate = useNavigate();
  const field = useGameStore((s) => s.field);
  const [picked, setPicked] = useState<SpeciesId | null>(null);
  const caughtCount = SPECIES.filter((s) => field.species[s.id]).length;

  return (
    <section className="fdex">
      <header className="fdex__head">
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/field')}>
          ← 필드
        </button>
        <h1 className="fdex__title">구구몬 도감</h1>
        <span className="fdex__count">
          {caughtCount}/{SPECIES.length}
        </span>
      </header>

      {GROUPS.map((g) => (
        <div key={g.title} className="fdex__group">
          <h2 className="fdex__group-title">{g.title}</h2>
          <div className="fdex__grid">
            {g.ids.map((id) => {
              const entry = field.species[id];
              const seen = field.seen.includes(id);
              const def = speciesDef(id);
              if (entry) {
                return (
                  <button
                    key={id}
                    type="button"
                    className={`fdex__cell fdex__cell--caught ${picked === id ? 'fdex__cell--picked' : ''}`}
                    aria-label={`${def.name} 잡음`}
                    onClick={() => setPicked(picked === id ? null : id)}
                  >
                    {field.companion === id && <span className="fdex__tag">함께 다니는 중</span>}
                    {creatureSprite(id, { view: 'front', stage: entry.stage, color: speciesColor(id), size: 64 })}
                    <span className="fdex__name">{displayName(id, entry.stage)}</span>
                    <span className="fdex__meta">
                      Lv{entry.level} · {entry.caught}번 잡음
                    </span>
                  </button>
                );
              }
              return (
                <div
                  key={id}
                  className={`fdex__cell ${seen ? 'fdex__cell--seen' : 'fdex__cell--unknown'}`}
                  aria-label={seen ? `${def.name} 못 잡음` : '아직 못 만남'}
                >
                  {seen ? (
                    <>
                      <span className="fdex__grey">{creatureSprite(id, { view: 'front', color: speciesColor(id), size: 64 })}</span>
                      <span className="fdex__name">{def.name}</span>
                      <span className="fdex__meta">만났어요</span>
                    </>
                  ) : (
                    <>
                      <span className="fdex__q">?</span>
                      <span className="fdex__name">???</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {picked && field.species[picked] && (
        <div className="fdex__sheet" role="dialog" aria-label={`${speciesDef(picked).name} 정보`}>
          <div className="fdex__sheet-name">{displayName(picked, field.species[picked]!.stage)}</div>
          {field.companion === picked ? (
            <p className="fdex__sheet-note">지금 함께 다니고 있어요!</p>
          ) : (
            <button
              type="button"
              className="btn btn--primary fdex__sheet-btn"
              onClick={() => {
                useGameStore.getState().setCompanion(picked);
                setPicked(null);
              }}
            >
              함께 다니기
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={() => setPicked(null)}>
            닫기
          </button>
        </div>
      )}
    </section>
  );
}
