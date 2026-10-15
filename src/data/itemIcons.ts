/**
 * 아이템 그림 세트 (먹이 15 · 위생 10 · 장난감 15). 관리자가 새 아이템을 만들 때 이 중에서 고른다.
 * 기기마다 모양이 조금 다른 이모지를 네오브루탈리즘 타일(굵은 테두리·원색 배경) 안에 넣어 통일감을 준다.
 */
export const ITEM_ICONS: Record<string, { glyph: string; label: string; group: 'food' | 'hygiene' | 'toy' }> = {
  apple: { glyph: '🍎', label: '사과', group: 'food' },
  milk: { glyph: '🥛', label: '우유', group: 'food' },
  cookie: { glyph: '🍪', label: '쿠키', group: 'food' },
  lunchbox: { glyph: '🍱', label: '도시락', group: 'food' },
  candy: { glyph: '🍬', label: '사탕', group: 'food' },
  banana: { glyph: '🍌', label: '바나나', group: 'food' },
  strawberry: { glyph: '🍓', label: '딸기', group: 'food' },
  grape: { glyph: '🍇', label: '포도', group: 'food' },
  carrot: { glyph: '🥕', label: '당근', group: 'food' },
  bread: { glyph: '🍞', label: '빵', group: 'food' },
  rice: { glyph: '🍙', label: '주먹밥', group: 'food' },
  fish: { glyph: '🐟', label: '생선', group: 'food' },
  cake: { glyph: '🍰', label: '케이크', group: 'food' },
  icecream: { glyph: '🍦', label: '아이스크림', group: 'food' },
  juice: { glyph: '🧃', label: '주스', group: 'food' },
  soap: { glyph: '🧼', label: '비누', group: 'hygiene' },
  shampoo: { glyph: '🧴', label: '샴푸', group: 'hygiene' },
  towel: { glyph: '🧻', label: '수건', group: 'hygiene' },
  sponge: { glyph: '🧽', label: '스펀지', group: 'hygiene' },
  toothbrush: { glyph: '🪥', label: '칫솔', group: 'hygiene' },
  comb: { glyph: '🪮', label: '빗', group: 'hygiene' },
  bathtub: { glyph: '🛁', label: '욕조', group: 'hygiene' },
  shower: { glyph: '🚿', label: '샤워', group: 'hygiene' },
  duck: { glyph: '🦆', label: '고무 오리', group: 'hygiene' },
  sparkle: { glyph: '✨', label: '반짝이', group: 'hygiene' },
  ball: { glyph: '⚽', label: '공', group: 'toy' },
  bubbles: { glyph: '🫧', label: '비눗방울', group: 'toy' },
  doll: { glyph: '🧸', label: '인형', group: 'toy' },
  kite: { glyph: '🪁', label: '연', group: 'toy' },
  yoyo: { glyph: '🪀', label: '요요', group: 'toy' },
  blocks: { glyph: '🧱', label: '블록', group: 'toy' },
  car: { glyph: '🚗', label: '자동차', group: 'toy' },
  robot: { glyph: '🤖', label: '로봇', group: 'toy' },
  balloon: { glyph: '🎈', label: '풍선', group: 'toy' },
  drum: { glyph: '🥁', label: '북', group: 'toy' },
  puzzle: { glyph: '🧩', label: '퍼즐', group: 'toy' },
  dice: { glyph: '🎲', label: '주사위', group: 'toy' },
  frisbee: { glyph: '🥏', label: '원반', group: 'toy' },
  top: { glyph: '🪅', label: '피냐타', group: 'toy' },
  rocket: { glyph: '🚀', label: '로켓', group: 'toy' },
};

export function iconGlyph(key: string | undefined): string {
  return (key && ITEM_ICONS[key]?.glyph) || '🎁';
}
