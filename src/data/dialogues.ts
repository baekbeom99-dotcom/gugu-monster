/** 펫(동료) 대사 풀 — 설계서 8장. 상황마다 무작위로 하나 고른다. */
export const DIALOGUES = {
  start: ['가자! 같이 잡자!', '오늘도 힘내자!', '몬스터다! 준비됐어?'],
  correct: ['좋아!', '맞았어!', '대단해!', '역시!', '척척이네!'],
  critical: ['엄청 빨라!', '번개 같아!', '크리티컬!'],
  combo: ['연속으로 맞혔어!', '멈출 수가 없어!', '우와, 콤보다!'],
  wrong: ['괜찮아, 같이 세어 보자!', '천천히 다시 보자!', '틀려도 괜찮아!'],
  overcome: ['해냈다! 이거 어려웠던 거잖아!', '저번엔 어려웠는데 이번엔 맞혔어!'],
  capture: ['친구가 됐어!', '잡았다!', '몬스터가 웃고 있어!'],
  sleep: ['몬스터가 지쳐서 잠들었어. 우리가 이겼어!'],
  hintDone: ['이제 알겠지? 계속 가자!', '좋아, 다음 문제!'],
} as const;

export type DialogueKey = keyof typeof DIALOGUES;

export function line(key: DialogueKey): string {
  const pool = DIALOGUES[key];
  return pool[Math.floor(Math.random() * pool.length)];
}
