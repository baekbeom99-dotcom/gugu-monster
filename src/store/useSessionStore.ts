/** 저장하지 않는 화면 상태: 이번에 앱을 열었을 때만 보여줄 연출들 */
import { create } from 'zustand';
import type { Stage } from '../domain/pet';

interface SessionState {
  /** 24시간 넘게 쉬다 돌아왔을 때 반겨주는 연출 */
  welcomeBack: boolean;
  /** 펫 화면에서 보여줄 진화 축하 */
  pendingEvolution: Stage | null;
  /** 펫 화면에서 보여줄 친밀도 레벨업 */
  pendingLevelUp: number | null;
  /** 부화 직후 첫 밥 주기 안내 */
  feedTutorial: boolean;
  set: (patch: Partial<Omit<SessionState, 'set'>>) => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  welcomeBack: false,
  pendingEvolution: null,
  pendingLevelUp: null,
  feedTutorial: false,
  set: (patch) => set(patch),
}));
