/** 관리자: 펫 관리 — 도감 졸업 기간 설정, 새 펫 시작하기 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkPin } from '../../domain/admin';
import { GRADUATION_DAYS_RANGE, graduationNeedMs, makeTitle } from '../../domain/dex';
import { josa } from '../../domain/korean';
import { affectionLevel, applyDecay, satisfaction, SPECIES_INFO, STAGE_LABELS } from '../../domain/pet';
import { useGameStore } from '../../store/useGameStore';
import { NumberField } from './fields';
import { PinPad } from './PinPad';

export function PetPanel() {
  const navigate = useNavigate();
  const storedPet = useGameStore((s) => s.pet);
  const learning = useGameStore((s) => s.learning);
  const days = useGameStore((s) => s.settings.graduationDays);
  const dexCount = useGameStore((s) => s.dex.length);
  const { updateSettings, startNewPetByAdmin } = useGameStore.getState();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [pinError, setPinError] = useState<string | null>(null);
  const pet = applyDecay(storedPet, Date.now());
  const hatched = !!pet.species && pet.stage !== 'egg';

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
                  친밀도 Lv{affectionLevel(pet.affection)} · 지금 만족도 {Math.round(satisfaction(pet))}
                </li>
                <li>
                  도감 졸업까지 행복한 시간 {Math.floor((pet.happyMs ?? 0) / 3_600_000)} / {Math.round(graduationNeedMs(days) / 3_600_000)}시간
                  {pet.stage !== 'adult' && ' (다 자란 뒤부터 쌓여요)'}
                </li>
                <li>도감에 들어가면 받을 칭호: {makeTitle(pet, learning)}</li>
              </>
            )}
          </ul>
        )}
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/dex')}>
          📖 도감 보기 ({dexCount}마리)
        </button>
      </section>

      <section className="admin-card">
        <h2 className="admin-heading">도감 졸업 조건</h2>
        <p className="admin-help">
          다 자란 펫의 만족도(배부름·기분·깨끗함 평균)가 70 이상인 시간이 합쳐서 이만큼 되면, 칭호를 받고 도감으로 가요. 그다음 새 알을 골라요.
        </p>
        <NumberField
          label="행복한 시간"
          unit="일"
          value={days}
          min={GRADUATION_DAYS_RANGE.min}
          max={GRADUATION_DAYS_RANGE.max}
          onChange={(v) => {
            if (Number.isFinite(v)) updateSettings({ graduationDays: Math.min(GRADUATION_DAYS_RANGE.max, Math.max(GRADUATION_DAYS_RANGE.min, v)) });
          }}
        />
      </section>

      <section className="admin-card">
        <h2 className="admin-heading">새 펫 시작하기</h2>
        <p className="admin-help">
          지금 펫은 칭호를 받고 도감에 들어가고, 학생은 새 알을 골라요. 학습 기록·별·가방·모자는 그대로예요. 부화 전 알은 도감에 남지 않아요.
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
                    ? `${josa(pet.name, '은', '는')} ‘${makeTitle(pet, learning)} ${josa(pet.name, '’으로', '’로')} 도감에 들어가요.`
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
