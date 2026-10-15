/** 펫 도감: 졸업한 펫들이 칭호와 함께 모여 있는 곳 */
import { useNavigate } from 'react-router-dom';
import { hatArtOf } from '../art/HatSprite';
import { PetSprite } from '../art/PetSprite';
import { SPECIES_INFO, STAGE_LABELS } from '../domain/pet';
import { findItem } from '../domain/shop';
import { useGameStore } from '../store/useGameStore';
import './dex.css';

const dot = (date: string | null) => (date ? date.replace(/-/g, '.') : '?');

export function DexScreen() {
  const navigate = useNavigate();
  const dex = useGameStore((s) => s.dex);
  const catalog = useGameStore((s) => s.catalog);
  const hasPet = useGameStore((s) => !!s.pet.species);

  return (
    <section className="dex">
      <header className="dex__head">
        <h1 className="dex__title">펫 도감</h1>
        <span className="dex__count">{dex.length}마리</span>
      </header>

      {dex.length === 0 ? (
        <div className="neo-card dex__empty">
          <p>아직 도감에 들어간 친구가 없어요.</p>
          <p>다 자란 펫을 며칠 동안 행복하게 돌봐 주면, 멋진 칭호를 받고 도감에 들어가요!</p>
        </div>
      ) : (
        <ul className="dex-grid">
          {[...dex].reverse().map((e) => (
            <li key={e.id} className="neo-card dex-card">
              <span className="dex-card__frame">
                <PetSprite species={e.species} stage={e.stage} expression="happy" size={120} hat={hatArtOf(findItem(catalog, e.hat ?? ''))} />
              </span>
              <span className="dex-card__title">{e.title}</span>
              <strong className="dex-card__name">{e.name}</strong>
              <span className="dex-card__meta">
                {SPECIES_INFO[e.species].name} · {STAGE_LABELS[e.stage]}
              </span>
              <span className="dex-card__chips">
                <span className="chip-sm">♥ Lv{e.affectionLevel}</span>
                <span className="chip-sm">공부 {e.studyDays}일</span>
                <span className="chip-sm">탐험 {e.explorations}번</span>
              </span>
              <span className="dex-card__dates">
                {dot(e.hatchedAt)} ~ {dot(e.leftAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn btn--ghost" onClick={() => navigate(hasPet ? '/pet' : '/welcome')}>
        {hasPet ? '나의 펫으로' : '새 알 고르러 가기'}
      </button>
    </section>
  );
}
