/** 도감 졸업 연출: 작별 인사 → 칭호 공개 → 도감에 넣고 새 알 고르기 */
import { useState } from 'react';
import { type HatArt } from '../art/HatSprite';
import { PetSprite } from '../art/PetSprite';
import { playSfx } from '../audio/sfx';
import { josa } from '../domain/korean';
import type { Species } from '../domain/pet';
import { Confetti } from './Confetti';

interface Props {
  species: Species;
  name: string;
  title: string;
  hat: HatArt | null;
  onConfirm: () => void;
}

export function GraduationOverlay({ species, name, title, hat, onConfirm }: Props) {
  const [phase, setPhase] = useState<'farewell' | 'title'>('farewell');
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="도감 졸업">
      <Confetti />
      <div className="modal__card graduation">
        <PetSprite species={species} stage="adult" expression="excited" hat={hat} size={170} className="pet-hop" />
        {phase === 'farewell' ? (
          <>
            <p className="modal__title">{josa(name, '이는', '는')} 이제 다 자랐어요!</p>
            <p className="modal__body">
              매일 잘 돌봐 준 덕분에 행복하게 지냈어요. 이제 도감에서 지내면서 언제든 만날 수 있어요.
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                playSfx('fanfare');
                setPhase('title');
              }}
            >
              칭호 받기 🏅
            </button>
          </>
        ) : (
          <>
            <div className="title-stamp">
              <span className="title-stamp__title">{title}</span>
              <span className="title-stamp__name">{name}</span>
            </div>
            <p className="modal__body">
              {josa(name, '이', '가')} 남긴 말: “고마워! 새 친구도 잘 부탁해!”
            </p>
            <button type="button" className="btn btn--primary" onClick={onConfirm}>
              도감에 넣고 새 알 고르기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
