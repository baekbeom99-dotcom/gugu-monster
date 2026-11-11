import { COMPANION_MAX_HP } from '../domain/field/tuning';
import './hpBar.css';

/** 작은 체력 막대 — 0이면 빨강 */
export function HpBar({ hp, label }: { hp: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((hp / COMPANION_MAX_HP) * 100)));
  return (
    <span
      className={`hpbar ${hp <= 0 ? 'hpbar--down' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={COMPANION_MAX_HP}
      aria-valuenow={hp}
    >
      <span className="hpbar__fill" style={{ width: `${pct}%` }} />
    </span>
  );
}
