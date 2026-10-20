/** 기본 아이템 목록 — 설계서 5-3. 관리자 모드(M6)의 '기본값 복원' 기준이기도 하다. v1.20부터 가격은 처음의 2배. */
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
    food('food_apple', 'apple', '사과', 6, { fullness: 15, affection: 1 }, 1, { description: '아삭아삭 새콤달콤' }),
    food('food_milk', 'milk', '우유', 8, { fullness: 20, affection: 1 }, 2, { description: '고소한 우유 한 잔' }),
    food('food_cookie', 'cookie', '쿠키', 12, { fullness: 20, mood: 10, affection: 2 }, 3, { description: '먹으면 기분도 좋아져요' }),
    food('food_lunchbox', 'lunchbox', '도시락', 24, { fullness: 60, affection: 3 }, 4, { description: '든든한 한 끼' }),
    food('food_starcandy', 'candy', '별사탕', 50, { fullness: 30, mood: 30, affection: 3 }, 5, { description: '특별한 날 먹는 반짝 간식', special: true }),
    // v1.14 추가 먹이
    food('food_carrot', 'carrot', '당근', 6, { fullness: 12, affection: 1 }, 6, { description: '오독오독 씹는 재미' }),
    food('food_banana', 'banana', '바나나', 8, { fullness: 18, affection: 1 }, 7, { description: '달콤하고 부드러워요' }),
    food('food_juice', 'juice', '주스', 10, { fullness: 12, mood: 8, affection: 1 }, 8, { description: '새콤한 과일 주스' }),
    food('food_strawberry', 'strawberry', '딸기', 10, { fullness: 14, mood: 6, affection: 1 }, 9, { description: '빨갛고 상큼한 딸기' }),
    food('food_grape', 'grape', '포도', 12, { fullness: 18, mood: 6, affection: 1 }, 10, { description: '알알이 달콤해요' }),
    food('food_bread', 'bread', '식빵', 14, { fullness: 30, affection: 1 }, 11, { description: '폭신폭신 갓 구운 빵' }),
    food('food_rice', 'rice', '주먹밥', 18, { fullness: 40, affection: 2 }, 12, { description: '꼭꼭 뭉친 든든한 밥' }),
    food('food_fish', 'fish', '생선구이', 22, { fullness: 45, mood: 5, affection: 2 }, 13, { description: '노릇노릇 맛있는 냄새' }),
    food('food_icecream', 'icecream', '아이스크림', 28, { fullness: 15, mood: 25, affection: 2 }, 14, { description: '시원하고 달콤해요' }),
    food('food_cake', 'cake', '케이크', 60, { fullness: 40, mood: 35, affection: 4 }, 15, { description: '축하할 때 먹는 케이크', special: true }),
    hygiene('hyg_soap', 'soap', '비누', 6, { cleanliness: 30 }, 1),
    hygiene('hyg_shampoo', 'shampoo', '샴푸', 12, { cleanliness: 50, mood: 5 }, 2),
    // v1.14 추가 위생용품
    hygiene('hyg_towel', 'towel', '수건', 6, { cleanliness: 20, mood: 3 }, 3),
    hygiene('hyg_toothbrush', 'toothbrush', '칫솔', 8, { cleanliness: 20, affection: 1 }, 4),
    hygiene('hyg_comb', 'comb', '빗', 10, { cleanliness: 15, mood: 10 }, 5),
    hygiene('hyg_sponge', 'sponge', '스펀지', 10, { cleanliness: 40 }, 6),
    hygiene('hyg_duck', 'duck', '고무 오리', 16, { cleanliness: 30, mood: 12, affection: 1 }, 7),
    hygiene('hyg_shower', 'shower', '샤워기', 20, { cleanliness: 60, mood: 5 }, 8),
    hygiene('hyg_bathtub', 'bathtub', '거품 목욕', 30, { cleanliness: 80, mood: 10, affection: 2 }, 9),
    hygiene('hyg_sparkle', 'sparkle', '반짝 목욕', 44, { cleanliness: 70, mood: 25, affection: 3 }, 10),
    toy('toy_ball', 'ball', '공', 30, { mood: 20, affection: 2 }, 1),
    toy('toy_bubbles', 'bubbles', '비눗방울', 50, { mood: 25, affection: 2 }, 2),
    toy('toy_doll', 'doll', '인형', 70, { mood: 30, affection: 3 }, 3),
    // v1.14 추가 장난감 (그림마다 놀이 장면이 다르다)
    toy('toy_dice', 'dice', '주사위', 30, { mood: 18, affection: 2 }, 4),
    toy('toy_balloon', 'balloon', '풍선', 40, { mood: 22, affection: 2 }, 5),
    toy('toy_yoyo', 'yoyo', '요요', 40, { mood: 22, affection: 2 }, 6),
    toy('toy_frisbee', 'frisbee', '원반', 56, { mood: 26, affection: 2 }, 7),
    toy('toy_kite', 'kite', '연', 60, { mood: 28, affection: 3 }, 8),
    toy('toy_blocks', 'blocks', '블록', 60, { mood: 26, affection: 3 }, 9),
    toy('toy_puzzle', 'puzzle', '퍼즐', 70, { mood: 28, affection: 3 }, 10),
    toy('toy_car', 'car', '자동차', 80, { mood: 30, affection: 3 }, 11),
    toy('toy_drum', 'drum', '북', 90, { mood: 32, affection: 3 }, 12),
    toy('toy_robot', 'robot', '로봇', 110, { mood: 35, affection: 4 }, 13),
    toy('toy_pinata', 'top', '피냐타', 120, { mood: 38, affection: 4 }, 14),
    toy('toy_rocket', 'rocket', '로켓', 150, { mood: 40, affection: 5 }, 15),
    hat('hat_ribbon', '리본', 60, 'ribbon', '#ff8fc1', 1),
    hat('hat_straw', '밀짚모자', 80, 'straw', '#ffe14d', 2),
    hat('hat_party', '고깔모자', 100, 'party', '#6fd3ff', 3),
    hat('hat_wizard', '마법사 모자', 160, 'wizard', '#c9b6ff', 4),
    hat('hat_crown', '왕관', 240, 'crown', '#ffe14d', 5),
    // v1.14 추가 모자
    hat('hat_flower', '꽃 머리핀', 60, 'flower', '#ff8fc1', 6),
    hat('hat_ribbon_blue', '파란 리본', 60, 'ribbon', '#6fd3ff', 7),
    hat('hat_headband', '새싹 헤어밴드', 70, 'headband', '#b8f25c', 8),
    hat('hat_beret', '빨간 베레모', 90, 'beret', '#ff6b6b', 9),
    hat('hat_straw_pink', '분홍 밀짚모자', 90, 'straw', '#ffb3c4', 10),
    hat('hat_party_gold', '황금 고깔', 120, 'party', '#ffcf3a', 11),
    hat('hat_wizard_night', '밤하늘 마법사 모자', 180, 'wizard', '#748ffc', 12),
    hat('hat_crown_jewel', '보석 왕관', 300, 'crown', '#c9b6ff', 13),
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
