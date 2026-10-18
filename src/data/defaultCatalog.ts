/** 기본 아이템 목록 — 설계서 5-3. 관리자 모드(M6)의 '기본값 복원' 기준이기도 하다. */
import { ALL_DANS, isChallengeDan } from '../domain/facts';
import { type CatalogData, type ItemDef, masterHatId } from '../domain/shop';

const STACK = 9;
const TOY_COOLDOWN = 30;

const food = (id: string, icon: string, name: string, price: number, effects: ItemDef['effects'], order: number, extra: Partial<ItemDef> = {}): ItemDef => ({
  id, source: 'default', category: 'food', name, art: { icon }, price, effects, consumable: true, maxStack: STACK, onSale: true, order, ...extra,
});
const hygiene = (id: string, icon: string, name: string, price: number, effects: ItemDef['effects'], order: number): ItemDef => ({
  id, source: 'default', category: 'hygiene', name, art: { icon }, price, effects, consumable: true, maxStack: STACK, onSale: true, order,
});
const toy = (id: string, icon: string, name: string, price: number, effects: ItemDef['effects'], order: number): ItemDef => ({
  id, source: 'default', category: 'toy', name, art: { icon }, price, effects, consumable: false, cooldownMin: TOY_COOLDOWN, onSale: true, order,
});
const hat = (id: string, name: string, price: number, hatShape: ItemDef['art']['hatShape'], hatColor: string, order: number): ItemDef => ({
  id, source: 'default', category: 'hat', name, art: { hatShape, hatColor }, price, effects: {}, consumable: false, onSale: true, order,
});

export function defaultCatalog(): CatalogData {
  const items: ItemDef[] = [
    food('food_apple', 'apple', '사과', 3, { fullness: 15, affection: 1 }, 1, { description: '아삭아삭 새콤달콤' }),
    food('food_milk', 'milk', '우유', 4, { fullness: 20, affection: 1 }, 2, { description: '고소한 우유 한 잔' }),
    food('food_cookie', 'cookie', '쿠키', 6, { fullness: 20, mood: 10, affection: 2 }, 3, { description: '먹으면 기분도 좋아져요' }),
    food('food_lunchbox', 'lunchbox', '도시락', 12, { fullness: 60, affection: 3 }, 4, { description: '든든한 한 끼' }),
    food('food_starcandy', 'candy', '별사탕', 25, { fullness: 30, mood: 30, affection: 3 }, 5, { description: '특별한 날 먹는 반짝 간식', special: true }),
    // v1.14 추가 먹이
    food('food_carrot', 'carrot', '당근', 3, { fullness: 12, affection: 1 }, 6, { description: '오독오독 씹는 재미' }),
    food('food_banana', 'banana', '바나나', 4, { fullness: 18, affection: 1 }, 7, { description: '달콤하고 부드러워요' }),
    food('food_juice', 'juice', '주스', 5, { fullness: 12, mood: 8, affection: 1 }, 8, { description: '새콤한 과일 주스' }),
    food('food_strawberry', 'strawberry', '딸기', 5, { fullness: 14, mood: 6, affection: 1 }, 9, { description: '빨갛고 상큼한 딸기' }),
    food('food_grape', 'grape', '포도', 6, { fullness: 18, mood: 6, affection: 1 }, 10, { description: '알알이 달콤해요' }),
    food('food_bread', 'bread', '식빵', 7, { fullness: 30, affection: 1 }, 11, { description: '폭신폭신 갓 구운 빵' }),
    food('food_rice', 'rice', '주먹밥', 9, { fullness: 40, affection: 2 }, 12, { description: '꼭꼭 뭉친 든든한 밥' }),
    food('food_fish', 'fish', '생선구이', 11, { fullness: 45, mood: 5, affection: 2 }, 13, { description: '노릇노릇 맛있는 냄새' }),
    food('food_icecream', 'icecream', '아이스크림', 14, { fullness: 15, mood: 25, affection: 2 }, 14, { description: '시원하고 달콤해요' }),
    food('food_cake', 'cake', '케이크', 30, { fullness: 40, mood: 35, affection: 4 }, 15, { description: '축하할 때 먹는 케이크', special: true }),
    hygiene('hyg_soap', 'soap', '비누', 3, { cleanliness: 30 }, 1),
    hygiene('hyg_shampoo', 'shampoo', '샴푸', 6, { cleanliness: 50, mood: 5 }, 2),
    // v1.14 추가 위생용품
    hygiene('hyg_towel', 'towel', '수건', 3, { cleanliness: 20, mood: 3 }, 3),
    hygiene('hyg_toothbrush', 'toothbrush', '칫솔', 4, { cleanliness: 20, affection: 1 }, 4),
    hygiene('hyg_comb', 'comb', '빗', 5, { cleanliness: 15, mood: 10 }, 5),
    hygiene('hyg_sponge', 'sponge', '스펀지', 5, { cleanliness: 40 }, 6),
    hygiene('hyg_duck', 'duck', '고무 오리', 8, { cleanliness: 30, mood: 12, affection: 1 }, 7),
    hygiene('hyg_shower', 'shower', '샤워기', 10, { cleanliness: 60, mood: 5 }, 8),
    hygiene('hyg_bathtub', 'bathtub', '거품 목욕', 15, { cleanliness: 80, mood: 10, affection: 2 }, 9),
    hygiene('hyg_sparkle', 'sparkle', '반짝 목욕', 22, { cleanliness: 70, mood: 25, affection: 3 }, 10),
    toy('toy_ball', 'ball', '공', 15, { mood: 20, affection: 2 }, 1),
    toy('toy_bubbles', 'bubbles', '비눗방울', 25, { mood: 25, affection: 2 }, 2),
    toy('toy_doll', 'doll', '인형', 35, { mood: 30, affection: 3 }, 3),
    // v1.14 추가 장난감 (그림마다 놀이 장면이 다르다)
    toy('toy_dice', 'dice', '주사위', 15, { mood: 18, affection: 2 }, 4),
    toy('toy_balloon', 'balloon', '풍선', 20, { mood: 22, affection: 2 }, 5),
    toy('toy_yoyo', 'yoyo', '요요', 20, { mood: 22, affection: 2 }, 6),
    toy('toy_frisbee', 'frisbee', '원반', 28, { mood: 26, affection: 2 }, 7),
    toy('toy_kite', 'kite', '연', 30, { mood: 28, affection: 3 }, 8),
    toy('toy_blocks', 'blocks', '블록', 30, { mood: 26, affection: 3 }, 9),
    toy('toy_puzzle', 'puzzle', '퍼즐', 35, { mood: 28, affection: 3 }, 10),
    toy('toy_car', 'car', '자동차', 40, { mood: 30, affection: 3 }, 11),
    toy('toy_drum', 'drum', '북', 45, { mood: 32, affection: 3 }, 12),
    toy('toy_robot', 'robot', '로봇', 55, { mood: 35, affection: 4 }, 13),
    toy('toy_pinata', 'top', '피냐타', 60, { mood: 38, affection: 4 }, 14),
    toy('toy_rocket', 'rocket', '로켓', 75, { mood: 40, affection: 5 }, 15),
    hat('hat_ribbon', '리본', 30, 'ribbon', '#ff8fc1', 1),
    hat('hat_straw', '밀짚모자', 40, 'straw', '#ffe14d', 2),
    hat('hat_party', '고깔모자', 50, 'party', '#6fd3ff', 3),
    hat('hat_wizard', '마법사 모자', 80, 'wizard', '#c9b6ff', 4),
    hat('hat_crown', '왕관', 120, 'crown', '#ffe14d', 5),
    // v1.14 추가 모자
    hat('hat_flower', '꽃 머리핀', 30, 'flower', '#ff8fc1', 6),
    hat('hat_ribbon_blue', '파란 리본', 30, 'ribbon', '#6fd3ff', 7),
    hat('hat_headband', '새싹 헤어밴드', 35, 'headband', '#b8f25c', 8),
    hat('hat_beret', '빨간 베레모', 45, 'beret', '#ff6b6b', 9),
    hat('hat_straw_pink', '분홍 밀짚모자', 45, 'straw', '#ffb3c4', 10),
    hat('hat_party_gold', '황금 고깔', 60, 'party', '#ffcf3a', 11),
    hat('hat_wizard_night', '밤하늘 마법사 모자', 90, 'wizard', '#748ffc', 12),
    hat('hat_crown_jewel', '보석 왕관', 150, 'crown', '#c9b6ff', 13),
    // 마스터 보상 모자 (비매품)
    ...ALL_DANS.map(
      (dan, i): ItemDef => ({
        id: masterHatId(dan),
        source: 'reward',
        category: 'hat',
        name: isChallengeDan(dan) ? (dan === 12 ? '도전자 모자' : '전설의 왕관') : `${dan}단 마스터 모자`,
        art: isChallengeDan(dan)
          ? { hatShape: dan === 12 ? 'wizard' : 'crown', hatColor: dan === 12 ? '#ff6b6b' : '#ffcf3a', hatBadge: String(dan) }
          : { hatShape: 'cap', hatColor: '#b8f25c', hatBadge: String(dan) },
        price: 0,
        effects: {},
        consumable: false,
        description: `${dan}단을 마스터하면 받아요`,
        onSale: false,
        order: 100 + i,
      }),
    ),
  ];
  return { version: 1, items };
}
