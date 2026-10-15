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
    hygiene('hyg_soap', 'soap', '비누', 3, { cleanliness: 30 }, 1),
    hygiene('hyg_shampoo', 'shampoo', '샴푸', 6, { cleanliness: 50, mood: 5 }, 2),
    toy('toy_ball', 'ball', '공', 15, { mood: 20, affection: 2 }, 1),
    toy('toy_bubbles', 'bubbles', '비눗방울', 25, { mood: 25, affection: 2 }, 2),
    toy('toy_doll', 'doll', '인형', 35, { mood: 30, affection: 3 }, 3),
    hat('hat_ribbon', '리본', 30, 'ribbon', '#ff8fc1', 1),
    hat('hat_straw', '밀짚모자', 40, 'straw', '#ffe14d', 2),
    hat('hat_party', '고깔모자', 50, 'party', '#6fd3ff', 3),
    hat('hat_wizard', '마법사 모자', 80, 'wizard', '#c9b6ff', 4),
    hat('hat_crown', '왕관', 120, 'crown', '#ffe14d', 5),
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
