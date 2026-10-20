/** 관리자 아이템 편집 규칙 — 설계서 10-3. 학생에게 손해가 가지 않도록 삭제 대신 판매 중지를 기본으로 한다. */
import { ITEM_ICONS } from '../data/itemIcons';
import type { EconomyData } from './progress';
import { type CatalogData, DEFAULT_MAX_STACK, findItem, type HatShape, type ItemCategory, type ItemDef, type ItemId } from './shop';

export const LIMITS = {
  nameMax: 10,
  descMax: 30,
  price: { min: 1, max: 999 },
  stat: { min: 0, max: 100 },
  affection: { min: 0, max: 10 },
  cooldownMin: { min: 5, max: 240 },
  maxStack: { min: 1, max: 20 },
} as const;

/** 관리자가 고를 수 있는 모자 모양 8종 (마스터 모자 모양 'cap'은 보상 전용) */
export const EDITABLE_HAT_SHAPES: readonly HatShape[] = ['ribbon', 'straw', 'party', 'wizard', 'crown', 'beret', 'headband', 'flower', 'helmet', 'pirate', 'viking', 'dino', 'headset', 'aviator'];
export const HAT_SHAPE_LABELS: Record<HatShape, string> = {
  ribbon: '리본', straw: '밀짚모자', party: '고깔', wizard: '마법사', crown: '왕관', beret: '베레모', headband: '헤어밴드', flower: '꽃', cap: '마스터 모자', helmet: '용사 투구', pirate: '해적 선장', viking: '바이킹 투구', dino: '공룡 후드', headset: '헤드셋', aviator: '파일럿 모자',
};
export const HAT_COLORS: readonly string[] = ['#ff8fc1', '#ffe14d', '#6fd3ff', '#b8f25c', '#ffa94d', '#c9b6ff', '#ff6b6b', '#fffdf5'];

/** 카테고리마다 꼭 있어야 하는 주 효과와 고칠 수 있는 효과 */
export const CATEGORY_EFFECTS: Record<ItemCategory, { main: keyof ItemDef['effects'] | null; editable: (keyof ItemDef['effects'])[] }> = {
  food: { main: 'fullness', editable: ['fullness', 'mood', 'affection'] },
  hygiene: { main: 'cleanliness', editable: ['cleanliness', 'mood', 'affection'] },
  toy: { main: 'mood', editable: ['mood', 'affection'] },
  hat: { main: null, editable: [] },
};

/** 먹이·위생은 소모품, 장난감·모자는 영구 (고정) */
export const isConsumableCategory = (c: ItemCategory) => c === 'food' || c === 'hygiene';

const inRange = (v: unknown, r: { min: number; max: number }) => typeof v === 'number' && Number.isInteger(v) && v >= r.min && v <= r.max;

/** 저장해도 되는지 검사. 문제가 있으면 아이들이 읽을 필요 없는 어른용 문장 목록을 돌려준다. */
export function validateItem(item: ItemDef): string[] {
  const errors: string[] = [];
  const name = (item.name ?? '').trim();
  if (!name) errors.push('이름을 적어 주세요.');
  if ([...name].length > LIMITS.nameMax) errors.push(`이름은 ${LIMITS.nameMax}글자까지예요.`);
  if ((item.description ?? '').length > LIMITS.descMax) errors.push(`설명은 ${LIMITS.descMax}글자까지예요.`);
  if (!(['food', 'hygiene', 'toy', 'hat'] as const).includes(item.category)) errors.push('종류가 올바르지 않아요.');
  if (item.source === 'reward') return errors;
  if (!inRange(item.price, LIMITS.price)) errors.push(`가격은 ${LIMITS.price.min}~${LIMITS.price.max}★ 사이로 정해 주세요.`);
  if (item.consumable !== isConsumableCategory(item.category)) errors.push('사용 방식이 종류와 맞지 않아요.');

  const rules = CATEGORY_EFFECTS[item.category];
  for (const [key, value] of Object.entries(item.effects ?? {})) {
    if (!rules.editable.includes(key as keyof ItemDef['effects'])) {
      errors.push(`이 종류에는 '${key}' 효과를 넣을 수 없어요.`);
    } else if (!inRange(value, key === 'affection' ? LIMITS.affection : LIMITS.stat)) {
      errors.push(key === 'affection' ? '친밀도는 0~10 사이예요.' : '효과는 0~100 사이예요.');
    }
  }
  if (rules.main && !((item.effects?.[rules.main] ?? 0) >= 1)) errors.push('주 효과를 1 이상 넣어 주세요.');

  if (item.category === 'toy' && !inRange(item.cooldownMin, LIMITS.cooldownMin)) errors.push('재사용 대기는 5~240분이에요.');
  if (item.consumable && !inRange(item.maxStack ?? DEFAULT_MAX_STACK, LIMITS.maxStack)) errors.push('최대 보유 수는 1~20개예요.');
  if (item.category === 'hat') {
    if (!item.art?.hatShape || !EDITABLE_HAT_SHAPES.includes(item.art.hatShape)) errors.push('모자 모양을 골라 주세요.');
    if (!item.art?.hatColor || !/^#[0-9a-f]{6}$/i.test(item.art.hatColor)) errors.push('모자 색을 골라 주세요.');
  } else if (!item.art?.icon || !ITEM_ICONS[item.art.icon]) {
    errors.push('그림을 골라 주세요.');
  }
  return errors;
}

/** 경고(저장은 막지 않음): 하루 탐험 1회 ≈ 25★ 기준 */
export function balanceHint(item: ItemDef): string | null {
  if (item.source === 'reward') return null;
  if (item.price > 200) return '많이 비싸요. 하루 탐험 1번에 별이 약 25개 모여요.';
  const statSum = Object.entries(item.effects).reduce((sum, [k, v]) => sum + (k === 'affection' ? (v ?? 0) * 5 : (v ?? 0)), 0);
  if (item.consumable && statSum / item.price > 10) return '효과에 비해 아주 싸요. 별을 모을 이유가 줄어들 수 있어요.';
  return null;
}

let seq = 0;
export function newItemId(): ItemId {
  seq += 1;
  return `custom_${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/** 새 아이템 초안 (관리자가 채워 넣는다) */
export function draftItem(category: ItemCategory, order: number): ItemDef {
  const base = { id: newItemId(), source: 'custom' as const, category, price: 10, onSale: true, order, description: '' };
  switch (category) {
    case 'food':
      return { ...base, name: '', art: { icon: 'banana' }, effects: { fullness: 20 }, consumable: true, maxStack: DEFAULT_MAX_STACK };
    case 'hygiene':
      return { ...base, name: '', art: { icon: 'towel' }, effects: { cleanliness: 30 }, consumable: true, maxStack: DEFAULT_MAX_STACK };
    case 'toy':
      return { ...base, name: '', art: { icon: 'kite' }, effects: { mood: 20, affection: 2 }, consumable: false, cooldownMin: 30 };
    case 'hat':
      return { ...base, price: 40, name: '', art: { hatShape: 'beret', hatColor: '#6fd3ff' }, effects: {}, consumable: false };
  }
}

const bump = (catalog: CatalogData, items: ItemDef[]): CatalogData => ({ version: catalog.version + 1, items });

/** 아이템 저장(추가 또는 수정). 검사를 통과하지 못하면 바꾸지 않는다. */
export function upsertItem(catalog: CatalogData, item: ItemDef): { ok: true; catalog: CatalogData } | { ok: false; errors: string[] } {
  const errors = validateItem(item);
  if (errors.length > 0) return { ok: false, errors };
  const existing = findItem(catalog, item.id);
  if (existing?.source === 'reward') return { ok: false, errors: ['보상 모자는 바꿀 수 없어요.'] };
  const clean: ItemDef = { ...item, name: item.name.trim(), description: item.description?.trim() };
  const items = existing ? catalog.items.map((i) => (i.id === item.id ? clean : i)) : [...catalog.items, clean];
  return { ok: true, catalog: bump(catalog, items) };
}

export function setOnSale(catalog: CatalogData, id: ItemId, onSale: boolean): CatalogData {
  const item = findItem(catalog, id);
  if (!item || item.source === 'reward') return catalog;
  return bump(catalog, catalog.items.map((i) => (i.id === id ? { ...i, onSale } : i)));
}

/** 같은 종류 안에서 순서를 한 칸 옮긴다 (dir: -1 위로, +1 아래로) */
export function moveItem(catalog: CatalogData, id: ItemId, dir: -1 | 1): CatalogData {
  const item = findItem(catalog, id);
  if (!item) return catalog;
  const siblings = catalog.items
    .filter((i) => i.category === item.category && i.source !== 'reward')
    .sort((a, b) => a.order - b.order || a.price - b.price);
  const idx = siblings.findIndex((i) => i.id === id);
  const swap = siblings[idx + dir];
  if (!swap) return catalog;
  const reordered = [...siblings];
  [reordered[idx], reordered[idx + dir]] = [reordered[idx + dir], reordered[idx]];
  const orderOf = new Map(reordered.map((i, n) => [i.id, n + 1]));
  return bump(catalog, catalog.items.map((i) => (orderOf.has(i.id) ? { ...i, order: orderOf.get(i.id)! } : i)));
}

/** 완전 삭제는 '관리자가 추가했고 아무도 가지고 있지 않은' 아이템만 */
export function canDelete(item: ItemDef, economy: EconomyData): boolean {
  if (item.source !== 'custom') return false;
  return !economy.owned.includes(item.id) && (economy.inventory[item.id] ?? 0) === 0;
}

export function deleteItem(catalog: CatalogData, economy: EconomyData, id: ItemId): CatalogData {
  const item = findItem(catalog, id);
  if (!item || !canDelete(item, economy)) return catalog;
  return bump(catalog, catalog.items.filter((i) => i.id !== id));
}

/**
 * 기본값 복원: 기본 아이템을 처음 상태로 되돌린다 (category가 없으면 전체).
 * 관리자가 추가한 아이템은 지우지 않고 판매 중지로 남긴다 (이미 산 학생이 있을 수 있으므로).
 */
export function restoreDefaults(catalog: CatalogData, defaults: CatalogData, category?: ItemCategory): CatalogData {
  const inScope = (i: ItemDef) => !category || i.category === category;
  const restored = defaults.items.filter(inScope);
  const kept = catalog.items
    .filter((i) => !(inScope(i) && i.source !== 'custom'))
    .map((i) => (inScope(i) && i.source === 'custom' ? { ...i, onSale: false } : i));
  return bump(catalog, [...kept, ...restored]);
}

/**
 * 새 버전에서 늘어난 기본·보상 아이템을 저장된 상점에 더한다.
 * 이미 있는 아이템(관리자가 바꾼 가격·이름·판매 중지·순서, 직접 추가한 아이템)은 그대로 둔다.
 * 새 아이템은 같은 종류의 맨 뒤에 붙는다. 더할 것이 없으면 원래 객체를 그대로 돌려준다.
 */
export function addMissingDefaults(catalog: CatalogData, defaults: CatalogData): CatalogData {
  const have = new Set(catalog.items.map((i) => i.id));
  const missing = defaults.items.filter((i) => !have.has(i.id));
  if (missing.length === 0) return catalog;
  const lastOrder = new Map<ItemCategory, number>();
  for (const i of catalog.items) {
    if (i.source === 'reward') continue;
    lastOrder.set(i.category, Math.max(lastOrder.get(i.category) ?? 0, i.order));
  }
  const added = missing.map((i) => {
    if (i.source === 'reward') return i;
    const order = (lastOrder.get(i.category) ?? 0) + 1;
    lastOrder.set(i.category, order);
    return { ...i, order };
  });
  return bump(catalog, [...catalog.items, ...added]);
}

/** 상점 가격 배율 (v1.20: 모든 가격 2배). 저장된 상점·예전 공유 코드는 이 배율로 맞춘다. */
export const CATALOG_PRICE_SCALE = 2;

/** 보상 모자를 뺀 모든 아이템 가격에 factor를 곱한다 (1~999★ 안으로). 관리자가 바꾼 가격도 같은 비율로. */
export function scaleItemPrices(items: ItemDef[], factor: number): ItemDef[] {
  if (factor === 1) return items;
  return items.map((i) =>
    i.source === 'reward' ? i : { ...i, price: Math.min(LIMITS.price.max, Math.max(LIMITS.price.min, Math.round(i.price * factor))) },
  );
}
