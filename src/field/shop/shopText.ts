/** 상점 팝업 글 — 문구를 바꿀 때는 여기만. 조사(이/가, 을/를)는 josa가 붙인다 */
import { josa } from '../../domain/korean';

export const shopText = {
  title: '상점',
  close: '닫기',
  quit: '그만하기',
  ok: '확인',
  soon: '추후 업데이트로 열려요',
  /** 캡슐 줄: 맞는 캡슐 이름 옆 */
  get: '얻기',
  pickDan: (capsule: string) => `${josa(capsule, '을', '를')} 얻으려면 구구단을 풀어요. 어느 단을 풀까요?`,
  back: '← 뒤로',
  danLabel: (dan: number) => `${dan}단`,
  /** 잠긴 단(12·13단) */
  lockedDan: '12·13단 도전이 열리면 풀 수 있어요',
  practiceHeader: (dan: number, n: number, total: number) => `${dan}단 연습 (${n}/${total})`,
  choose: '정답을 골라요',
  hintGuide: '빛나는 보기를 눌러 보세요',
  gotCapsules: (name: string, n: number) => `${name} ${n}개를 받았어요!`,
  /** 회복약 */
  allHealthy: '모두 건강해요!',
  fainted: '쓰러짐',
  wounds: (n: number) => `상처 ${n}개`,
  healHeader: (name: string, round: number, rounds: number, n: number, total: number) => `${name} 회복 중 · ${round}/${rounds}바퀴 (${n}/${total})`,
  healed: (name: string) => `${josa(name, '이', '가')} 다 나았어요!`,
  healPick: '상처 문제를 풀어서 낫게 해 줘요',
} as const;
