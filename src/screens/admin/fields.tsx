/** 관리자 화면 공통 입력 부품 */
import type { ReactNode } from 'react';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        {hint && <span className="field__hint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: ReactNode;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <Field label={label} hint={hint}>
      <span className="stepper">
        <button type="button" className="stepper__btn" onClick={() => onChange(clamp(value - step))} aria-label={`${label} 줄이기`}>
          −
        </button>
        <input
          className="admin-input stepper__input"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Math.round(Number(e.target.value)))}
        />
        {/* 단위가 없어도 칸을 비워 둬야 + 버튼이 제자리에 온다 */}
        <span className="stepper__unit">{unit}</span>
        <button type="button" className="stepper__btn" onClick={() => onChange(clamp((Number.isFinite(value) ? value : min) + step))} aria-label={`${label} 늘리기`}>
          +
        </button>
      </span>
    </Field>
  );
}

export function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`switch ${checked ? 'switch--on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__knob" />
    </button>
  );
}

/** 파일로 저장 (브라우저 다운로드) */
export function downloadText(filename: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function dateStamp(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
