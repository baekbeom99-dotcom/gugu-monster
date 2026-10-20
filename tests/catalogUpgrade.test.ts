/** 상점 아이템이 늘어나도 저장된 상점·가방은 그대로 (v1.14) */
import { describe, expect, it } from 'vitest';
import { defaultCatalog } from '../src/data/defaultCatalog';
import { ITEM_ICONS } from '../src/data/itemIcons';
import { playStyleOf } from '../src/data/playStyles';
import { addMissingDefaults, validateItem } from '../src/domain/catalogRules';
import { type CatalogData, findItem, type ItemDef, shopItems } from '../src/domain/shop';
import { createInitialSave, mergeSave } from '../src/store/saveData';

const NOW = new Date(2026, 9, 18, 10).getTime();
const NEW_IDS = ['food_cake', 'hyg_bathtub', 'toy_rocket', 'hat_beret'];

/** v1.13까지의 기본 상점 (새 아이템이 없던 때) */
function oldCatalog(): CatalogData {
  const items = defaultCatalog().items.filter((i) => i.source === 'reward' || i.order <= 5 || (i.category === 'hygiene' && i.order <= 2) || (i.category === 'toy' && i.order <= 3));
  return {
    version: 7,
    // v1.19까지는 가격이 지금의 절반
    items: items
      .filter((i) => !(i.category === 'hygiene' && i.order > 2) && !(i.category === 'toy' && i.order > 3))
      .map((i) => (i.source === 'reward' ? i : { ...i, price: i.price / 2 })),
  };
}

describe('새 기본 아이템', () => {
  it('모든 기본 아이템이 관리자 검사 규칙을 통과하고 ID가 겹치지 않는다', () => {
    const items = defaultCatalog().items;
    for (const item of items) expect(validateItem(item), item.id).toEqual([]);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it('그림은 모두 아이콘 세트에 있고, 장난감은 그림에 맞는 놀이 장면이 있다', () => {
    for (const item of defaultCatalog().items.filter((i) => i.category !== 'hat')) expect(ITEM_ICONS[item.art.icon!], item.id).toBeDefined();
    const styles = new Set(shopItems(defaultCatalog(), 'toy').map((i) => playStyleOf(i.art.icon)));
    expect(styles.size).toBeGreaterThanOrEqual(8);
  });
});

describe('저장된 상점에 새 아이템 더하기', () => {
  it('관리자가 바꾼 가격·판매 중지·직접 추가한 아이템은 그대로 두고 새 아이템만 더한다', () => {
    const custom: ItemDef = {
      id: 'custom_x1', source: 'custom', category: 'food', name: '선생님 쿠키', art: { icon: 'cookie' }, price: 2,
      effects: { fullness: 10 }, consumable: true, maxStack: 9, onSale: true, order: 9,
    };
    const old = oldCatalog();
    const edited: CatalogData = {
      version: old.version,
      items: [
        ...old.items.map((i) => (i.id === 'food_apple' ? { ...i, price: 1 } : i.id === 'toy_doll' ? { ...i, onSale: false } : i)),
        custom,
      ],
    };
    const r = addMissingDefaults(edited, defaultCatalog());
    expect(findItem(r, 'food_apple')!.price).toBe(1);
    expect(findItem(r, 'toy_doll')!.onSale).toBe(false);
    expect(findItem(r, 'custom_x1')).toEqual(custom);
    for (const id of NEW_IDS) expect(findItem(r, id), id).toBeDefined();
    expect(r.items).toHaveLength(defaultCatalog().items.length + 1);
    // 새 먹이는 직접 추가한 아이템(order 9)보다 뒤에 붙는다
    expect(Math.min(...r.items.filter((i) => i.category === 'food' && i.source === 'default' && i.order > 5).map((i) => i.order))).toBe(10);
    expect(r.version).toBe(old.version + 1);
  });

  it('더할 것이 없으면 그대로 돌려준다', () => {
    const full = defaultCatalog();
    expect(addMissingDefaults(full, defaultCatalog())).toBe(full);
  });

  it('예전 저장 데이터를 불러오면 별·가방·펫은 그대로, 상점에는 새 아이템이 보인다', () => {
    const merged = mergeSave(createInitialSave(NOW), {
      catalog: oldCatalog(),
      economy: { stars: 123, inventory: { food_apple: 3 }, owned: ['toy_ball', 'hat_ribbon'] },
      pet: { species: 'fox', stage: 'child', name: '여리', equippedHat: 'hat_ribbon' },
    });
    expect(merged.economy).toMatchObject({ stars: 123, inventory: { food_apple: 3 }, owned: ['toy_ball', 'hat_ribbon'] });
    expect(merged.pet).toMatchObject({ species: 'fox', name: '여리', equippedHat: 'hat_ribbon' });
    expect(shopItems(merged.catalog, 'food')).toHaveLength(15);
    expect(shopItems(merged.catalog, 'toy')).toHaveLength(15);
    expect(shopItems(merged.catalog, 'hat')).toHaveLength(13);
  });
});

describe('가격 2배 (v1.20)', () => {
  it('기본 가격은 처음의 2배 (사과 6, 공 30, 왕관 240), 보상 모자는 0 그대로', () => {
    const c = defaultCatalog();
    expect(findItem(c, 'food_apple')!.price).toBe(6);
    expect(findItem(c, 'toy_ball')!.price).toBe(30);
    expect(findItem(c, 'hat_crown')!.price).toBe(240);
    expect(c.items.filter((i) => i.source === 'reward').every((i) => i.price === 0)).toBe(true);
  });

  it('예전 저장의 상점은 한 번만 2배가 된다 (관리자가 바꾼 가격도 같은 비율, 별·가방은 그대로)', () => {
    const old = oldCatalog();
    const edited = { ...old, items: old.items.map((i) => (i.id === 'food_apple' ? { ...i, price: 1 } : i)) };
    const once = mergeSave(createInitialSave(NOW), { catalog: edited, economy: { stars: 77 } });
    expect(findItem(once.catalog, 'food_apple')!.price).toBe(2);
    expect(findItem(once.catalog, 'food_milk')!.price).toBe(8);
    expect(once.catalogPriceScale).toBe(2);
    expect(once.economy.stars).toBe(77);
    // 새 기본 아이템은 이미 2배 가격으로 들어온다
    expect(findItem(once.catalog, 'food_cake')!.price).toBe(60);
    // 다시 불러와도 또 2배가 되지 않는다
    const twice = mergeSave(createInitialSave(NOW), JSON.parse(JSON.stringify(once)));
    expect(findItem(twice.catalog, 'food_apple')!.price).toBe(2);
    expect(findItem(twice.catalog, 'food_cake')!.price).toBe(60);
  });
});

describe('상점 설정 공유 코드와 가격 배율', () => {
  it('예전(버전 1) 코드는 가격을 2배로 맞춰 들이고, 새 코드(버전 2)는 그대로', async () => {
    const { encodeShopCode, exportShopSettings, parseShopSettings } = await import('../src/domain/shareCode');
    const now = defaultCatalog();
    const fresh = exportShopSettings(now, NOW);
    expect(fresh.version).toBe(2);
    const sameAgain = parseShopSettings(encodeShopCode(fresh), now);
    expect(sameAgain.ok && sameAgain.preview.priceChanged).toBe(0);

    const oldFile = { ...fresh, version: 1 as const, items: fresh.items.map((i) => ({ ...i, price: i.price / 2 })) };
    const r = parseShopSettings(encodeShopCode(oldFile), now);
    expect(r.ok && r.preview.priceChanged).toBe(0);
    expect(r.ok && r.preview.valid.find((i) => i.id === 'food_apple')!.price).toBe(6);
  });
});
