/** 야생 전투 화면 아래 글 — 문구를 바꿀 때는 여기만. 조사(이/가, 을/를)는 josa가 붙인다 */
import type { Tier } from '../../domain/field/strength';
import { josa } from '../../domain/korean';

const TIER_WORD: Record<Tier, string> = { weak: '약한 ', normal: '', strong: '강한 ', mighty: '강력한 ', legend: '' };

export const battleText = {
  /** 단계 말을 붙인 이름 ("약한 ○○"·"○○"·"강한 ○○"·"강력한 ○○", 황금은 이름 그대로) */
  tierName: (name: string, tier: Tier) => `${TIER_WORD[tier]}${name}`,
  appear: (name: string, legend: boolean) => `${legend ? '전설의' : '야생'} ${josa(name, '이', '가')} 나타났다!`,
  choose: '어떤 기술을 쓸까?',
  hit: (move: string) => `${move}! 명중!`,
  miss: (move: string) => `${move}! …빗나갔다. 힌트를 보자!`,
  timeUp: '시간이 지났어!',
  foeAttack: (name: string, move: string) => `${name}의 ${move}!`,
  fainted: (name: string) => `${josa(name, '이', '가')} 쓰러졌다… 태초마을로 돌아가자`,
  dizzy: (name: string) => `${josa(name, '이', '가')} 어지러워한다! 지금이야!`,
  retry: '좋아, 다시 해 보자!',
  throwCapsule: '캡슐을 던졌다!',
  caught: (name: string, newSpecies = false) => `${josa(name, '을', '를')} 잡았다!${newSpecies ? ' 새로 만났어!' : ''}`,
  retryThrow: '아직 어지러워해! 한 번 더!',
  escaped: (name: string) => `${josa(name, '이', '가')} 도망갔다…`,
  angry: (name: string) => `${josa(name, '이', '가')} 화가 났다! 강력해졌다!`,
  /** 캡슐이 없어 돌려보냄 (캡슐 개수는 M4) */
  released: '캡슐이 없어서 돌려보냈어! 상점에서 캡슐을 구해 오자',
  quit: '무사히 도망쳤다!',
  /** 필드: 동행이 쓰러져 있을 때 */
  faintedField: '구구몬이 쓰러졌어요. 상점에서 회복시켜요',
  /** 마을 상점 문: 모두 회복 (M3 임시, Task 17이 상점 팝업으로) */
  healedAll: '구구몬들이 기운을 되찾았어요!',
} as const;
