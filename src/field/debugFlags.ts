/**
 * 필드 모험 디버그 스위치 — 한곳에서 읽는다. E2E와 개발 중 브라우저 콘솔(또는 #/dev/field 화면)에서 켠다.
 *
 *   window.__GUGU_E2E_FIELD__ = true     풀숲 걸음마다 만남 · 캡슐 100%
 *   window.__GUGU_E2E_LEGEND__ = true    만남이 레전드 (12단이 열려 있을 때)
 *   window.__GUGU_E2E_QUESTION__ = { factId: '7x8', type: 'product' }   전투 문제 고정
 *
 * 새 스위치를 만들면 여기에 더하고 CLAUDE.md 'E2E 스위치' 줄도 고친다.
 */

export interface FieldDebugFlags {
  /** 만남·캡슐 100% */
  encounter: boolean;
  /** 만남이 레전드 */
  legend: boolean;
  /** 전투 문제를 이 사실·모양으로 고정 (375px 배치 확인용). 평소에는 null */
  question: { factId: string; type: string } | null;
}

interface DebugGlobals {
  __GUGU_E2E_FIELD__?: boolean;
  __GUGU_E2E_LEGEND__?: boolean;
  __GUGU_E2E_QUESTION__?: { factId: string; type: string };
}

const g = () => globalThis as DebugGlobals;

export function debugFlags(): FieldDebugFlags {
  return { encounter: !!g().__GUGU_E2E_FIELD__, legend: !!g().__GUGU_E2E_LEGEND__, question: g().__GUGU_E2E_QUESTION__ ?? null };
}

/** 개발 화면에서 스위치를 켜고 끈다 (새로고침하면 꺼진다) */
export function setDebugFlag(name: 'encounter' | 'legend', on: boolean): void {
  if (name === 'encounter') g().__GUGU_E2E_FIELD__ = on;
  else g().__GUGU_E2E_LEGEND__ = on;
}
