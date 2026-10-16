/** 펫 도감: 졸업했거나 쉬고 있는 펫들. 고르면 지금 펫과 자리를 바꿔 다시 함께한다. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hatArtOf } from '../art/HatSprite';
import { PetSprite } from '../art/PetSprite';
import { playSfx } from '../audio/sfx';
import type { DexEntry } from '../domain/dex';
import { josa } from '../domain/korean';
import { affectionLevel, SPECIES_INFO, STAGE_LABELS } from '../domain/pet';
import { findItem } from '../domain/shop';
import { useGameStore } from '../store/useGameStore';
import './dex.css';

const dot = (date: string | null) => (date ? date.replace(/-/g, '.') : '?');

export function DexScreen() {
  const navigate = useNavigate();
  const dex = useGameStore((s) => s.dex);
  const catalog = useGameStore((s) => s.catalog);
  const current = useGameStore((s) => s.pet);
  const swapPet = useGameStore((s) => s.swapPet);
  const [picked, setPicked] = useState<DexEntry | null>(null);
  const hasPet = !!current.species;
  const canSwap = hasPet && current.stage !== 'egg';

  return (
    <section className="dex">
      <header className="dex__head">
        <h1 className="dex__title">펫 도감</h1>
        <span className="dex__count">{dex.length}마리</span>
      </header>
      <p className="dex__help">
        {canSwap
          ? '펫을 고르면 지금 펫과 자리를 바꿔 다시 함께 탐험해요.'
          : '지금 알이 깨어나면 도감의 펫과 자리를 바꿀 수 있어요.'}
      </p>

      {dex.length === 0 ? (
        <div className="neo-card dex__empty">
          <p>아직 도감에 들어간 친구가 없어요.</p>
          <p>펫과 친밀도 Lv10이 되면 멋진 칭호를 받고 도감에 들어가요!</p>
        </div>
      ) : (
        <ul className="dex-grid">
          {[...dex].reverse().map((e) => {
            const level = e.pet ? affectionLevel(e.pet.affection) : e.affectionLevel;
            return (
              <li key={e.id} className="neo-card dex-card">
                <span className="dex-card__frame">
                  <PetSprite species={e.species} stage={e.stage} expression="happy" size={120} hat={hatArtOf(findItem(catalog, e.hat ?? ''))} />
                </span>
                <span className={`dex-card__title ${e.title ? '' : 'dex-card__title--resting'}`}>{e.title ?? '쉬는 중'}</span>
                <strong className="dex-card__name">{e.name}</strong>
                <span className="dex-card__meta">
                  {SPECIES_INFO[e.species].name} · {STAGE_LABELS[e.stage]}
                </span>
                <span className="dex-card__chips">
                  <span className="chip-sm">♥ Lv{level}</span>
                  <span className="chip-sm">공부 {e.studyDays}일</span>
                  <span className="chip-sm">탐험 {e.explorations}번</span>
                </span>
                <span className="dex-card__dates">
                  {dot(e.hatchedAt)} ~ {dot(e.leftAt)}
                </span>
                <button type="button" className="btn btn--primary dex-card__pick" disabled={!canSwap} onClick={() => setPicked(e)}>
                  다시 함께하기
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" className="btn btn--ghost" onClick={() => navigate(hasPet ? '/pet' : '/welcome')}>
        {hasPet ? '나의 펫으로' : '새 알 고르러 가기'}
      </button>

      {picked && canSwap && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="펫 바꾸기">
          <div className="modal__card dex-swap">
            <PetSprite species={picked.species} stage={picked.stage} expression="excited" size={140} hat={hatArtOf(findItem(catalog, picked.hat ?? ''))} />
            <p className="modal__title">{josa(picked.name, '이와', '와')} 다시 함께할까요?</p>
            <p className="modal__body">
              {josa(current.name, '이는', '는')} 도감에서 쉬어요. 언제든 다시 고를 수 있고, 친밀도 레벨은 그대로 이어져요.
              {!current.graduated && ` (${josa(current.name, '이가', '가')} Lv10이 되면 새 알을 받아요)`}
            </p>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setPicked(null)}>
                아니요
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  const r = swapPet(picked.id, Date.now());
                  setPicked(null);
                  if (r.ok) {
                    playSfx('fanfare');
                    navigate('/pet');
                  }
                }}
              >
                함께하기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
