import { useState } from 'react';
import { playSfx } from '../audio/sfx';

interface ChoiceProps {
  choices: number[];
  onPick: (value: number) => void;
  disabled?: boolean;
  /** 힌트 단계: 이 값만 빛나고 눌러야 진행 */
  highlight?: number;
}

export function ChoiceGrid({ choices, onPick, disabled, highlight }: ChoiceProps) {
  const [nudged, setNudged] = useState<number | null>(null);
  return (
    <div className="choices">
      {choices.map((c, i) => {
        const glowing = highlight === c;
        const dimmed = highlight !== undefined && !glowing;
        return (
          <button
            key={c}
            type="button"
            className={`choice choice--c${i} ${glowing ? 'choice--glow' : ''} ${dimmed ? 'choice--dim' : ''} ${nudged === c ? 'choice--nudge' : ''}`}
            disabled={disabled}
            onClick={() => {
              if (highlight !== undefined && !glowing) {
                setNudged(c);
                setTimeout(() => setNudged(null), 400);
                return;
              }
              onPick(c);
            }}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

interface KeypadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  maxLength?: number;
}

export function Keypad({ value, onChange, onSubmit, disabled, maxLength = 3 }: KeypadProps) {
  const press = (d: string) => {
    if (value.length >= maxLength) return;
    playSfx('tap');
    onChange(value === '0' ? d : value + d);
  };
  return (
    <div className="keypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button key={d} type="button" className="key" disabled={disabled} onClick={() => press(d)}>
          {d}
        </button>
      ))}
      <button type="button" className="key key--erase" disabled={disabled || !value} onClick={() => onChange(value.slice(0, -1))} aria-label="지우기">
        ⌫
      </button>
      <button type="button" className="key" disabled={disabled} onClick={() => press('0')}>
        0
      </button>
      <button type="button" className="key key--ok" disabled={disabled || !value} onClick={onSubmit}>
        확인
      </button>
    </div>
  );
}
