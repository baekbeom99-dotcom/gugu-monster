/** 야생 전투 화면 아래 글 — 문구를 바꿀 때는 여기만. 조사(이/가, 을/를)는 josa가 붙인다 */
import { josa } from '../../domain/korean';

export const battleText = {
  appear: (name: string, legend: boolean) => `${legend ? '전설의' : '야생'} ${josa(name, '이', '가')} 나타났다!`,
  choose: '어떤 기술을 쓸까?',
  hit: (move: string, fast: boolean) => `${move}! ${fast ? '빠르다! 크게 ' : ''}명중!`,
  miss: (move: string) => `${move}! …빗나갔다. 힌트를 보자!`,
  dizzy: (name: string, asleep: boolean) =>
    asleep ? `${josa(name, '이', '가')} 지쳐서 잠들었다! 지금이야!` : `${josa(name, '이', '가')} 어지러워한다! 지금이야!`,
  retry: '좋아, 다시 해 보자!',
  throwCapsule: '캡슐을 던졌다!',
  caught: (name: string, newSpecies = false) => `${josa(name, '을', '를')} 잡았다!${newSpecies ? ' 새로 만났어!' : ''}`,
  brokeFree: '앗, 빠져나왔다!',
  fled: (name: string) => `${josa(name, '이', '가')} 도망갔다…`,
  quit: '무사히 도망쳤다!',
} as const;
