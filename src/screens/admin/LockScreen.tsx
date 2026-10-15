/** 관리자 잠금: 처음 PIN 설정 + 복구 코드 / PIN 입력 / 복구 코드로 PIN 다시 정하기 — 설계서 10-1 */
import { useEffect, useState } from 'react';
import {
  changePin,
  checkPin,
  checkRecovery,
  firstSetup,
  lockRemaining,
  newRecoveryCode,
  registerFailure,
  registerSuccess,
} from '../../domain/admin';
import { useGameStore } from '../../store/useGameStore';
import { PinPad } from './PinPad';

type Mode =
  | { kind: 'enter' }
  | { kind: 'setup'; first?: string }
  | { kind: 'showRecovery'; code: string }
  | { kind: 'recover' }
  | { kind: 'newPin'; first?: string };

export function RecoveryNotice({ code, onDone }: { code: string; onDone: () => void }) {
  return (
    <div className="admin-card recovery">
      <h2 className="pinpad__title">복구 코드</h2>
      <p>PIN을 잊었을 때 쓰는 코드예요. 지금 한 번만 보여 드려요. 따로 적어 두세요.</p>
      <div className="recovery__code" aria-label="복구 코드">
        {code.slice(0, 4)}-{code.slice(4)}
      </div>
      <button type="button" className="btn btn--primary" onClick={onDone}>
        적어 두었어요
      </button>
    </div>
  );
}

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const admin = useGameStore((s) => s.admin);
  const setAdmin = useGameStore((s) => s.setAdmin);
  const [mode, setMode] = useState<Mode>(admin.pinHash ? { kind: 'enter' } : { kind: 'setup' });
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState('');
  const [now, setNow] = useState(Date.now());
  const locked = lockRemaining(admin, now);

  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [locked]);

  const fail = (message: string) => {
    const next = registerFailure(admin, Date.now());
    setAdmin(next);
    setNow(Date.now());
    setError(lockRemaining(next, Date.now()) ? '5번 틀려서 1분 동안 잠겼어요.' : `${message} (${next.failedAttempts}/5)`);
  };

  if (mode.kind === 'showRecovery') return <RecoveryNotice code={mode.code} onDone={onUnlock} />;

  if (mode.kind === 'setup') {
    return (
      <div className="admin-card">
        <PinPad
          title={mode.first ? 'PIN을 한 번 더 눌러 주세요' : '어른용 PIN 만들기'}
          subtitle={mode.first ? undefined : '관리자 화면을 잠글 숫자 4자리를 정해 주세요.'}
          error={error}
          resetKey={mode.first}
          onComplete={async (pin) => {
            if (!mode.first) {
              setError(null);
              setMode({ kind: 'setup', first: pin });
              return;
            }
            if (pin !== mode.first) {
              setError('처음과 달라요. 다시 정해 주세요.');
              setMode({ kind: 'setup' });
              return;
            }
            const code = newRecoveryCode();
            setAdmin(await firstSetup(admin, pin, code));
            setMode({ kind: 'showRecovery', code });
          }}
        />
      </div>
    );
  }

  if (mode.kind === 'recover') {
    return (
      <div className="admin-card">
        <h2 className="pinpad__title">복구 코드로 PIN 다시 정하기</h2>
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (locked) return;
            if (await checkRecovery(admin, recovery)) {
              setAdmin(registerSuccess(admin));
              setError(null);
              setMode({ kind: 'newPin' });
            } else {
              fail('복구 코드가 맞지 않아요.');
            }
          }}
        >
          <input
            className="admin-input admin-input--code"
            value={recovery}
            onChange={(e) => setRecovery(e.target.value)}
            placeholder="ABCD-2345"
            aria-label="복구 코드"
            autoCapitalize="characters"
          />
          <p className="pinpad__error" role="alert">
            {locked ? `${Math.ceil(locked / 1000)}초 뒤에 다시 해 주세요.` : (error ?? ' ')}
          </p>
          <div className="admin-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setMode({ kind: 'enter' })}>
              돌아가기
            </button>
            <button type="submit" className="btn btn--primary" disabled={!!locked}>
              확인
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (mode.kind === 'newPin') {
    return (
      <div className="admin-card">
        <PinPad
          title={mode.first ? '새 PIN을 한 번 더' : '새 PIN 4자리'}
          error={error}
          resetKey={mode.first}
          onComplete={async (pin) => {
            if (!mode.first) {
              setError(null);
              setMode({ kind: 'newPin', first: pin });
              return;
            }
            if (pin !== mode.first) {
              setError('처음과 달라요. 다시 정해 주세요.');
              setMode({ kind: 'newPin' });
              return;
            }
            setAdmin(await changePin(admin, pin));
            onUnlock();
          }}
        />
      </div>
    );
  }

  return (
    <div className="admin-card">
      <PinPad
        title="어른용 화면이에요"
        subtitle="PIN 4자리를 눌러 주세요."
        disabled={!!locked}
        error={locked ? `${Math.ceil(locked / 1000)}초 뒤에 다시 해 주세요.` : error}
        onComplete={async (pin) => {
          if (await checkPin(admin, pin)) {
            setAdmin(registerSuccess(admin));
            onUnlock();
          } else {
            fail('PIN이 맞지 않아요.');
          }
        }}
      />
      <button
        type="button"
        className="link-button"
        onClick={() => {
          setError(null);
          setMode({ kind: 'recover' });
        }}
      >
        PIN을 잊었어요
      </button>
    </div>
  );
}
