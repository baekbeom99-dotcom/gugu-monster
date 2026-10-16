/** 관리자: 펫 관리 — 지금 펫 상태, 받을 칭호 미리보기, 새 펫 시작하기 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkPin } from '../../domain/admin';
import { GRADUATION_LEVEL, makeTitle } from '../../domain/dex';
import { josa } from '../../domain/korean';
import { affectionLevel, SPECIES_INFO, STAGE_LABELS } from '../../domain/pet';
import { useGameStore } from '../../store/useGameStore';
import { PinPad } from './PinPad';

export function PetPanel() {
  const navigate = useNavigate();
  const pet = useGameStore((s) => s.pet);
  const learning = useGameStore((s) => s.learning);
  const dexCount = useGameStore((s) => s.dex.length);
  const startNewPetByAdmin = useGameStore((s) => s.startNewPetByAdmin);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [pinError, setPinError] = useState<string | null>(null);
  const hatched = !!pet.species && pet.stage !== 'egg';
  const title = hatched ? (pet.title ?? makeTitle(pet, learning)) : null;

  return (
    <div className="admin-panel">
      <section className="admin-card">
        <h2 className="admin-heading">지금 펫</h2>
        {!pet.species ? (
          <p className="admin-help">아직 알을 고르지 않았어요.</p>
        ) : (
          <ul className="admin-summary">
            <li>
              {pet.name || '(이름 없음)'} · {SPECIES_INFO[pet.species].name} · {STAGE_LABELS[pet.stage]}
            </li>
            {hatched && (
              <>
                <li>
                  친밀도 Lv{affectionLevel(pet.affection)}
                  {pet.graduated ? ' · 이미 졸업한 펫 (레벨은 계속 올라요)' : ` · Lv${GRADUATION_LEVEL}이 되면 졸업하고 새 알`}
                </li>
                <li>
                  {pet.graduated ? '칭호' : '졸업하면 받을 칭호'}: {title}
                </li>
              </>
            )}
          </ul>
        )}
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/dex')}>
          📖 도감 보기 ({dexCount}마리)
        </button>
      </section>

      <section className="admin-card">
        <h2 className="admin-heading">도감·새 알 규칙</h2>
        <p className="admin-help">
          아직 졸업하지 않은 펫이 친밀도 Lv{GRADUATION_LEVEL}이 되면 칭호를 받고 도감으로 졸업하고, 학생은 새 알을 받아요. 도감의 펫을 고르면 지금 펫과
          자리를 바꿔 다시 함께할 수 있어요 (지금 펫이 부화한 뒤에만).
        </p>
      </section>

      <section className="admin-card">
        <h2 className="admin-heading">새 펫 시작하기</h2>
        <p className="admin-help">
          Lv{GRADUATION_LEVEL}을 기다리지 않고 바로 새 알을 줘요. 지금 펫은 칭호를 받고 도감에 들어가요. 학습 기록·별·가방·모자는 그대로예요. 부화 전 알은
          도감에 남지 않아요.
        </p>
        <button type="button" className="btn btn--primary" onClick={() => setStep(1)}>
          새 펫 시작하기
        </button>
      </section>

      {step > 0 && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__card">
            {step === 1 ? (
              <>
                <p className="modal__title">새 펫을 시작할까요?</p>
                <p className="modal__body">
                  {hatched
                    ? `${josa(pet.name, '은', '는')} ‘${title} ${josa(pet.name, '’으로', '’로')} 도감에 들어가요.`
                    : '지금 알은 도감에 남지 않고 새 알로 바뀌어요.'}
                </p>
                <div className="modal__actions">
                  <button type="button" className="btn btn--ghost" onClick={() => setStep(0)}>
                    아니요
                  </button>
                  <button type="button" className="btn btn--primary" onClick={() => setStep(2)}>
                    네
                  </button>
                </div>
              </>
            ) : (
              <>
                <PinPad
                  title="PIN을 한 번 더 눌러 주세요"
                  error={pinError}
                  onComplete={async (pin) => {
                    if (!(await checkPin(useGameStore.getState().admin, pin))) {
                      setPinError('PIN이 맞지 않아요.');
                      return;
                    }
                    startNewPetByAdmin(Date.now());
                    navigate('/welcome', { replace: true });
                  }}
                />
                <button type="button" className="btn btn--ghost" onClick={() => setStep(0)}>
                  그만두기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
