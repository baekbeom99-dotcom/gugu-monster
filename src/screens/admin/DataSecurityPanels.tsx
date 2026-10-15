/** 데이터 관리(백업·불러오기·초기화)와 보안(PIN 변경·복구 코드) — 설계서 10-2, 11-2 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePin, checkPin, newRecoveryCode, reissueRecovery } from '../../domain/admin';
import { type BackupSummary, exportBackup, parseBackup } from '../../domain/shareCode';
import { useGameStore } from '../../store/useGameStore';
import type { SaveData } from '../../store/saveData';
import { dateStamp, downloadText } from './fields';
import { RecoveryNotice } from './LockScreen';
import { PinPad } from './PinPad';

function currentSave(): SaveData {
  const s = useGameStore.getState();
  return {
    schemaVersion: s.schemaVersion,
    createdAt: s.createdAt,
    lastSeenAt: s.lastSeenAt,
    settings: s.settings,
    learning: s.learning,
    economy: s.economy,
    pet: s.pet,
    catalog: s.catalog,
    // 백업 파일에는 PIN 정보를 넣지 않는다
    admin: { pinHash: null, salt: '', recoveryHash: null, failedAttempts: 0, lockedUntil: null },
  };
}

export function DataPanel() {
  const navigate = useNavigate();
  const { replaceSave, resetAll } = useGameStore.getState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ save: Record<string, unknown>; summary: BackupSummary } | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [resetStep, setResetStep] = useState<0 | 1 | 2 | 3>(0);
  const [pinError, setPinError] = useState<string | null>(null);

  return (
    <div className="admin-panel">
      <section className="admin-card">
        <h2 className="admin-heading">백업</h2>
        <p className="admin-help">기기를 바꿀 때 학습 기록·별·펫·상점 설정을 파일로 옮길 수 있어요.</p>
        <div className="admin-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => downloadText(`gugu-monster-backup-${dateStamp(Date.now())}.json`, exportBackup(currentSave(), Date.now()))}
          >
            백업 파일 저장
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
            백업 불러오기
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            const r = parseBackup(await file.text());
            if (!r.ok) {
              setMessage({ kind: 'error', text: r.error });
              return;
            }
            setMessage(null);
            setPending({ save: r.save, summary: r.summary });
          }}
        />
        {message && <p className={`admin-note admin-note--${message.kind === 'error' ? 'error' : 'ok'}`}>{message.text}</p>}
      </section>

      <section className="admin-card admin-card--danger">
        <h2 className="admin-heading">전체 초기화</h2>
        <p className="admin-help">학습 기록, 별, 펫, 상점 설정, PIN을 모두 지우고 처음 상태로 돌아가요.</p>
        <button type="button" className="btn btn--ghost" onClick={() => setResetStep(1)}>
          전체 초기화…
        </button>
      </section>

      {pending && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__card">
            <p className="modal__title">이 백업으로 바꿀까요?</p>
            <ul className="admin-summary">
              <li>펫: {pending.summary.petName}</li>
              <li>별: ★ {pending.summary.stars}</li>
              <li>탐험: {pending.summary.explorations}번 · 공부한 날 {pending.summary.studyDays}일</li>
            </ul>
            <p className="modal__body">지금 기기의 기록은 이 백업으로 바뀌어요. (관리자 PIN은 그대로예요)</p>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setPending(null)}>
                아니요
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  replaceSave(pending.save);
                  setPending(null);
                  setMessage({ kind: 'ok', text: '백업을 불러왔어요.' });
                }}
              >
                바꾸기
              </button>
            </div>
          </div>
        </div>
      )}

      {resetStep > 0 && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__card">
            {resetStep === 1 && (
              <>
                <p className="modal__title">정말 모두 지울까요?</p>
                <p className="modal__body">펫과 별, 학습 기록이 모두 사라져요.</p>
                <div className="modal__actions">
                  <button type="button" className="btn btn--ghost" onClick={() => setResetStep(0)}>
                    아니요
                  </button>
                  <button type="button" className="btn btn--primary" onClick={() => setResetStep(2)}>
                    네
                  </button>
                </div>
              </>
            )}
            {resetStep === 2 && (
              <>
                <p className="modal__title">되돌릴 수 없어요</p>
                <p className="modal__body">먼저 ‘백업 파일 저장’을 해 두는 걸 권해요. 그래도 지울까요?</p>
                <div className="modal__actions">
                  <button type="button" className="btn btn--ghost" onClick={() => setResetStep(0)}>
                    그만두기
                  </button>
                  <button type="button" className="btn btn--primary" onClick={() => setResetStep(3)}>
                    지우기
                  </button>
                </div>
              </>
            )}
            {resetStep === 3 && (
              <>
                <PinPad
                  title="PIN을 한 번 더 눌러 주세요"
                  error={pinError}
                  onComplete={async (pin) => {
                    if (!(await checkPin(useGameStore.getState().admin, pin))) {
                      setPinError('PIN이 맞지 않아요.');
                      return;
                    }
                    resetAll();
                    navigate('/welcome', { replace: true });
                  }}
                />
                <button type="button" className="btn btn--ghost" onClick={() => setResetStep(0)}>
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

type SecurityMode = { kind: 'menu' } | { kind: 'current' } | { kind: 'new'; first?: string } | { kind: 'done' } | { kind: 'recovery'; code: string };

export function SecurityPanel() {
  const setAdmin = useGameStore((s) => s.setAdmin);
  const [mode, setMode] = useState<SecurityMode>({ kind: 'menu' });
  const [error, setError] = useState<string | null>(null);

  if (mode.kind === 'recovery') return <RecoveryNotice code={mode.code} onDone={() => setMode({ kind: 'menu' })} />;

  if (mode.kind === 'current' || mode.kind === 'new') {
    return (
      <div className="admin-card">
        <PinPad
          title={mode.kind === 'current' ? '지금 PIN' : mode.first ? '새 PIN을 한 번 더' : '새 PIN 4자리'}
          error={error}
          resetKey={`${mode.kind}-${mode.kind === 'new' ? mode.first : ''}`}
          onComplete={async (pin) => {
            const admin = useGameStore.getState().admin;
            if (mode.kind === 'current') {
              if (await checkPin(admin, pin)) {
                setError(null);
                setMode({ kind: 'new' });
              } else setError('PIN이 맞지 않아요.');
              return;
            }
            if (!mode.first) {
              setError(null);
              setMode({ kind: 'new', first: pin });
              return;
            }
            if (pin !== mode.first) {
              setError('처음과 달라요. 다시 정해 주세요.');
              setMode({ kind: 'new' });
              return;
            }
            setAdmin(await changePin(admin, pin));
            setMode({ kind: 'done' });
          }}
        />
        <button type="button" className="btn btn--ghost" onClick={() => setMode({ kind: 'menu' })}>
          그만두기
        </button>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {mode.kind === 'done' && <p className="admin-note admin-note--ok">PIN을 바꿨어요.</p>}
      <section className="admin-card">
        <h2 className="admin-heading">PIN 바꾸기</h2>
        <button type="button" className="btn btn--primary" onClick={() => setMode({ kind: 'current' })}>
          PIN 바꾸기
        </button>
      </section>
      <section className="admin-card">
        <h2 className="admin-heading">복구 코드 다시 만들기</h2>
        <p className="admin-help">복구 코드를 잃어버렸다면 새로 만들어요. 예전 코드는 더 이상 쓸 수 없어요.</p>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={async () => {
            const code = newRecoveryCode();
            setAdmin(await reissueRecovery(useGameStore.getState().admin, code));
            setMode({ kind: 'recovery', code });
          }}
        >
          새 복구 코드 만들기
        </button>
      </section>
    </div>
  );
}
