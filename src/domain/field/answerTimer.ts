/** 문제가 떠 있는 동안의 '답하는 데 걸린 시간' 시계. 멈춘 시간(도망 확인창·화면 가림)은 뺀다. */
export interface AnswerTimer {
  startedAt: number;
  /** 지금 멈춰 있다면 멈춘 순간 */
  pausedAt: number | null;
  /** 이미 끝난 멈춤의 합 */
  pausedTotal: number;
}

export function createAnswerTimer(): AnswerTimer {
  return { startedAt: 0, pausedAt: null, pausedTotal: 0 };
}

export function startTimer(_t: AnswerTimer, now: number): AnswerTimer {
  return { startedAt: now, pausedAt: null, pausedTotal: 0 };
}

export function pauseTimer(t: AnswerTimer, now: number): AnswerTimer {
  return t.pausedAt === null ? { ...t, pausedAt: now } : t;
}

export function resumeTimer(t: AnswerTimer, now: number): AnswerTimer {
  return t.pausedAt === null ? t : { ...t, pausedAt: null, pausedTotal: t.pausedTotal + Math.max(0, now - t.pausedAt) };
}

export function elapsedMs(t: AnswerTimer, now: number): number {
  const end = t.pausedAt ?? now;
  return Math.max(0, end - t.startedAt - t.pausedTotal);
}
