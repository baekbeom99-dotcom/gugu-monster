/** 필드 모험의 저장 안 되는 상태: 지금 만난 야생 구구몬, 전투 뒤 풀숲 걸음 수 */
import { create } from 'zustand';
import { ENCOUNTER_GRACE_STEPS } from '../domain/field/tuning';
import type { Encounter } from '../domain/field/encounter';

interface FieldSessionState {
  /** 지금 싸우러 가는(싸우는) 야생 구구몬. 없으면 전투 화면은 필드로 돌려보낸다 */
  encounter: Encounter | null;
  /** 마지막 전투 뒤 풀숲 걸음 수. 필드에 새로 들어오면 ENCOUNTER_GRACE_STEPS에서 시작 */
  stepsSinceBattle: number;
  /** 전투를 마치고 필드로 돌아가는 중 (이때는 걸음 수 0을 그대로 둔다) */
  fromBattle: boolean;
  set: (patch: Partial<Omit<FieldSessionState, 'set'>>) => void;
}

export const useFieldSession = create<FieldSessionState>()((set) => ({
  encounter: null,
  stepsSinceBattle: ENCOUNTER_GRACE_STEPS,
  fromBattle: false,
  set: (patch) => set(patch),
}));

/** 전투가 끝났다(도망·잡음·그만두기): 만남을 지우고 걸음 수를 0부터 */
export function endWildBattle(): void {
  useFieldSession.getState().set({ encounter: null, stepsSinceBattle: 0, fromBattle: true });
}

/**
 * 필드 화면에 들어왔다: 전투에서 돌아온 게 아니면 안전 걸음을 다 채운 상태로 시작. 가다 만 만남은 지운다.
 * 여러 번 불려도 결과가 같다(StrictMode 두 번 그리기). 전투 표시(fromBattle)는 첫 걸음이나 필드를 떠날 때 지운다.
 */
export function enterField(): void {
  const s = useFieldSession.getState();
  if (s.fromBattle) s.set({ encounter: null });
  else s.set({ stepsSinceBattle: ENCOUNTER_GRACE_STEPS, encounter: null });
}

/** 필드에서 한 걸음 걸었거나 필드를 떠난다: 이제 '전투에서 막 돌아옴'이 아니다 */
export function leaveBattleReturn(): void {
  const s = useFieldSession.getState();
  if (s.fromBattle) s.set({ fromBattle: false });
}
