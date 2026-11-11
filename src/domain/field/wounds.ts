/** 구구몬 체력·상처 목록 — 설계서 6-4·6-5. 순수 계산(React 없음) */
import type { FactId } from '../facts';
import type { QuestionType } from '../questionGen';
import { COMPANION_MAX_HP, WOUNDS_MAX } from './tuning';

/** 상처: 우리 구구몬이 맞게 한 문제 (같은 사실·같은 모양이면 한 개) */
export interface Wound {
  factId: FactId;
  type: QuestionType;
}

/** 상처를 더한다. 이미 있으면 맨 뒤(가장 최근)로 옮기고, WOUNDS_MAX개가 넘으면 오래된 것부터 버린다 */
export function addWound(list: readonly Wound[], w: Wound): Wound[] {
  const rest = list.filter((x) => !(x.factId === w.factId && x.type === w.type));
  const next = [...rest, { factId: w.factId, type: w.type }];
  return next.length > WOUNDS_MAX ? next.slice(next.length - WOUNDS_MAX) : next;
}

const clampHp = (n: number) => Math.min(COMPANION_MAX_HP, Math.max(0, Math.round(n)));

/** 피해를 받은 뒤 체력 (0~COMPANION_MAX_HP 정수). 이상한 피해(음수·NaN·무한)는 0으로, 이상한 체력은 가득으로 본다 */
export function applyDamage(hp: number, dmg: number): number {
  const base = Number.isFinite(hp) ? clampHp(hp) : COMPANION_MAX_HP;
  const hit = Number.isFinite(dmg) && dmg > 0 ? Math.round(dmg) : 0;
  return clampHp(base - hit);
}

/** 체력 0이면 쓰러짐 */
export function isFainted(e: { hp: number }): boolean {
  return e.hp <= 0;
}
