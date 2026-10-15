import { useEffect, useState } from 'react';
import { PIN_LENGTH } from '../../domain/admin';

interface Props {
  title: string;
  subtitle?: string;
  error?: string | null;
  disabled?: boolean;
  onComplete: (pin: string) => void;
  /** 바뀌면 입력을 비운다 */
  resetKey?: unknown;
}

/** 4자리 PIN 입력: 4번째 숫자를 누르면 바로 확인한다 */
export function PinPad({ title, subtitle, error, disabled, onComplete, resetKey }: Props) {
  const [pin, setPin] = useState('');
  useEffect(() => setPin(''), [resetKey]);

  const press = (d: string) => {
    if (disabled || pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setTimeout(() => {
        onComplete(next);
        setPin('');
      }, 120);
    }
  };

  return (
    <div className="pinpad">
      <h2 className="pinpad__title">{title}</h2>
      {subtitle && <p className="pinpad__sub">{subtitle}</p>}
      <div className="pinpad__dots" aria-label={`${pin.length}자리 입력됨`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={`pinpad__dot ${i < pin.length ? 'pinpad__dot--on' : ''}`} />
        ))}
      </div>
      <p className="pinpad__error" role="alert">
        {error ?? ' '}
      </p>
      <div className="pinpad__keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className="key" disabled={disabled} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button type="button" className="key key--erase" disabled={disabled || !pin} onClick={() => setPin((p) => p.slice(0, -1))} aria-label="지우기">
          ⌫
        </button>
        <button type="button" className="key" disabled={disabled} onClick={() => press('0')}>
          0
        </button>
        <span />
      </div>
    </div>
  );
}
