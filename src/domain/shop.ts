/** 별 상점: 아이템 정의·구매·사용·모자 — 설계서 5-3, 10-3, 11-1 */
import type { Dan } from './facts';
import { applyCare, type CareResult, type PetData, type StatKey } from './pet';
import type { EconomyData } from './progress';

export type ItemId = string;
export type ItemCategory = 'food' | 'hygiene' | 'toy' | 'hat';
export type HatShape = 'ribbon' | 'straw' | 'party' | 'wizard' | 'crown' | 'beret' | 'headband' | 'flower' | 'cap';
export type ItemEffects = Partial<Record<StatKey | 'affection', number>>;

export interface ItemDef {
  id: ItemId;
  /** default: 기본 아이템, custom: 관리자가 추가, reward: 마스터 보상(비매품) */
  source: 'default' | 'custom' | 'reward';
  category: ItemCategory;
  name: string;
  /** icon: 아이템 그림 키 (먹이·위생·장난감), hat*: 모자 모양·색, hatBadge: 모자에 새길 글자 */
  art: { icon?: string; hatShape?: HatShape; hatColor?: string; hatBadge?: string };
  price: number;
  effects: ItemEffects;
  consumable: boolean;
  cooldownMin?: number;
  maxStack?: number;
  description?: string;
  onSale: boolean;
  order: number;
  /** 특별 반응(신나는 표정) */
  special?: boolean;
}

export interface CatalogData {
  version: number;
  items: ItemDef[];
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = { food: '먹이', hygiene: '위생', toy: '장난감', hat: '모자' };
export const CATEGORIES: readonly ItemCategory[] = ['food', 'hygiene', 'toy', 'hat'];
export const DEFAULT_MAX_STACK = 9;

export function findItem(catalog: CatalogData, id: ItemId): ItemDef | undefined {
  return catalog.items.find((i) => i.id === id);
}

/** 상점에 보이는 아이템: 판매 중, 카테고리 순, 같은 카테고리에서는 order → 가격 순 (싼 것부터) */
export function shopItems(catalog: CatalogData, category: ItemCategory): ItemDef[] {
  return catalog.items
    .filter((i) => i.category === category && i.onSale && i.source !== 'reward')
    .sort((a, b) => a.order - b.order || a.price - b.price);
}

export function ownedCount(economy: EconomyData, item: ItemDef): number {
  return item.consumable ? (economy.inventory[item.id] ?? 0) : economy.owned.includes(item.id) ? 1 : 0;
}

export type BuyCheck = { ok: true } | { ok: false; reason: 'stars' | 'max' | 'owned' | 'notForSale'; need?: number };

export function canBuy(economy: EconomyData, item: ItemDef): BuyCheck {
  if (!item.onSale || item.source === 'reward') return { ok: false, reason: 'notForSale' };
  if (!item.consumable && economy.owned.includes(item.id)) return { ok: false, reason: 'owned' };
  if (item.consumable && ownedCount(economy, item) >= (item.maxStack ?? DEFAULT_MAX_STACK)) return { ok: false, reason: 'max' };
  if (economy.stars < item.price) return { ok: false, reason: 'stars', need: item.price - economy.stars };
  return { ok: true };
}

export function buy(economy: EconomyData, item: ItemDef): { ok: true; economy: EconomyData } | Extract<BuyCheck, { ok: false }> {
  const check = canBuy(economy, item);
  if (!check.ok) return check;
  const stars = economy.stars - item.price;
  if (item.consumable) {
    return { ok: true, economy: { ...economy, stars, inventory: { ...economy.inventory, [item.id]: ownedCount(economy, item) + 1 } } };
  }
  return { ok: true, economy: { ...economy, stars, owned: [...economy.owned, item.id] } };
}

export type UseResult = { ok: true; pet: PetData; economy: EconomyData } | { ok: false; reason: Exclude<CareResult, { ok: true }>['reason'] | 'none' | 'hat' };

/** 먹이·위생용품(소모) 또는 장난감(대기 시간)을 펫에게 쓴다. */
export function applyItem(pet: PetData, economy: EconomyData, item: ItemDef, now: number): UseResult {
  if (item.category === 'hat') return { ok: false, reason: 'hat' };
  if (ownedCount(economy, item) <= 0) return { ok: false, reason: 'none' };
  const { affection = 0, ...stats } = item.effects;
  const r = applyCare(
    pet,
    item.consumable
      ? { effects: stats, affection, refuseWhenFull: true }
      : { effects: stats, affection, cooldownKey: item.id, cooldownMin: item.cooldownMin ?? 30 },
    now,
  );
  if (!r.ok) return r;
  const nextEconomy = item.consumable
    ? { ...economy, inventory: { ...economy.inventory, [item.id]: ownedCount(economy, item) - 1 } }
    : economy;
  return { ok: true, pet: r.pet, economy: nextEconomy };
}

/** 가진 모자만 쓸 수 있다 (null = 벗기) */
export function canWearHat(economy: EconomyData, catalog: CatalogData, hatId: ItemId | null): boolean {
  if (hatId === null) return true;
  const item = findItem(catalog, hatId);
  return !!item && item.category === 'hat' && economy.owned.includes(hatId);
}

export function masterHatId(dan: Dan): ItemId {
  return `hat_master_${dan}`;
}

/** 새로 마스터한 단의 보상 모자를 가방에 넣는다 */
export function grantMasterHats(economy: EconomyData, catalog: CatalogData, dans: readonly Dan[]): { economy: EconomyData; granted: ItemId[] } {
  const granted = dans
    .map(masterHatId)
    .filter((id) => findItem(catalog, id) && !economy.owned.includes(id));
  return granted.length === 0 ? { economy, granted } : { economy: { ...economy, owned: [...economy.owned, ...granted] }, granted };
}

/** 가방에 있는 것: 소모품은 1개 이상, 영구 아이템은 가진 것 */
export function bagItems(economy: EconomyData, catalog: CatalogData, category: ItemCategory): ItemDef[] {
  return catalog.items
    .filter((i) => i.category === category && ownedCount(economy, i) > 0)
    .sort((a, b) => a.order - b.order || a.price - b.price);
}
