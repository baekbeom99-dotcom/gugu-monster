/** 전투 화면의 막대들: 체력 막대(야생·내 구구몬)와 문제 시간 막대 */
import type { Ref } from 'react';
import { TIMER_WARN_MS } from '../../domain/field/tuning';

/** 체력 막대. ratio는 0~1 */
export function HpBar({ label, ratio, low = false }: { label: string; ratio: number; low?: boolean }) {
  const r = Math.min(1, Math.max(0, ratio));
  return (
    <div className={`wild__hp ${low ? 'wild__hp--low' : ''}`} role="img" aria-label={label}>
      <span className="wild__hp-fill" style={{ width: `${r * 100}%` }} />
    </div>
  );
}

/**
 * 문제 시간 막대. 남은 시간이 TIMER_WARN_MS 이하이면 빨갛게.
 * 매 프레임 다시 그리지 않도록 화면은 초가 바뀔 때만 ms를 넘기고, 채움 너비는 fillRef로 직접 줄인다.
 */
export function TimerBar({ ms, totalMs, fillRef }: { ms: number; totalMs: number; fillRef?: Ref<HTMLSpanElement> }) {
  const warn = ms <= TIMER_WARN_MS;
  return (
    <div className={`wild__timer ${warn ? 'wild__timer--warn' : ''}`} role="timer" aria-label={`남은 시간 ${Math.ceil(ms / 1000)}초`}>
      <span ref={fillRef} className="wild__timer-fill" style={{ width: `${Math.min(1, Math.max(0, ms / totalMs)) * 100}%` }} />
    </div>
  );
}
