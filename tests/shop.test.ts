import { describe, expect, it } from 'vitest';
import { defaultCatalog } from '../src/data/defaultCatalog';
import { ITEM_ICONS } from '../src/data/itemIcons';
import { chooseEgg, hatch, initialPet, type PetData } from '../src/domain/pet';
import { type EconomyData, initialEconomy } from '../src/domain/progress';
import {
  bagItems,
  buy,
  canBuy,
  canWearHat,
  findItem,
  grantMasterHats,
  type ItemDef,
  ownedCount,
  shopItems,
  applyItem,
} from '../src/domain/shop';

const NOW = new Date(2026, 9, 15, 10).getTime();
const catalog = defaultCatalog();
const item = (id: string) => findItem(catalog, id) as ItemDef;
const rich = (stars = 100): EconomyData => ({ ...initialEconomy(), stars });
const pet = (over: Partial<PetData> = {}): PetData => ({ ...hatch(chooseEgg(initialPet(NOW), 'tiger'), '룡이', NOW), ...over });

describe('기본 카탈로그', () => {
  it('설계서 5-3 (v1.14): 먹이 15, 위생 10, 장난감 15, 모자 13 + 마스터 모자 10 (비매품)', () => {
    expect(shopItems(catalog, 'food')).toHaveLength(15);
    expect(shopItems(catalog, 'hygiene')).toHaveLength(10);
    expect(shopItems(catalog, 'toy')).toHaveLength(15);
    expect(shopItems(catalog, 'hat')).toHaveLength(19);
    expect(catalog.items.filter((i) => i.source === 'reward')).toHaveLength(10);
  });

  it('카테고리 첫 칸은 가장 싼 아이템 (첫 구매 성공 경험, v1.20 가격 2배)', () => {
    expect(shopItems(catalog, 'food')[0].price).toBe(6);
    expect(shopItems(catalog, 'hygiene')[0].price).toBe(6);
  });

  it('아이템 ID 중복 없음, 그림 키는 모두 그림 세트에 있다', () => {
    expect(new Set(catalog.items.map((i) => i.id)).size).toBe(catalog.items.length);
    for (const i of catalog.items.filter((x) => x.category !== 'hat')) expect(ITEM_ICONS[i.art.icon!]).toBeDefined();
    expect(Object.keys(ITEM_ICONS)).toHaveLength(40);
  });
});

describe('구매', () => {
  it('별을 내고 소모품은 수량이, 영구 아이템은 소유가 늘어난다', () => {
    let e = rich(40);
    const r1 = buy(e, item('food_apple'));
    if (!r1.ok) throw new Error(r1.reason);
    e = r1.economy;
    expect(e.stars).toBe(34);
    expect(ownedCount(e, item('food_apple'))).toBe(1);
    const r2 = buy(e, item('toy_ball'));
    if (!r2.ok) throw new Error(r2.reason);
    expect(r2.economy.owned).toContain('toy_ball');
    expect(r2.economy.stars).toBe(4);
  });

  it('별이 모자라면 몇 개 더 필요한지 알려준다', () => {
    expect(canBuy(rich(10), item('food_lunchbox'))).toEqual({ ok: false, reason: 'stars', need: 14 });
  });

  it('소모품은 9개까지, 영구 아이템은 한 번만', () => {
    const full = { ...rich(), inventory: { food_apple: 9 } };
    expect(canBuy(full, item('food_apple'))).toMatchObject({ ok: false, reason: 'max' });
    const owns = { ...rich(), owned: ['hat_ribbon'] };
    expect(canBuy(owns, item('hat_ribbon'))).toMatchObject({ ok: false, reason: 'owned' });
  });

  it('마스터 모자와 판매 중지 아이템은 살 수 없다', () => {
    expect(canBuy(rich(999), item('hat_master_7'))).toMatchObject({ ok: false, reason: 'notForSale' });
    expect(canBuy(rich(999), { ...item('food_apple'), onSale: false })).toMatchObject({ ok: false, reason: 'notForSale' });
  });
});

describe('아이템 쓰기', () => {
  it('먹이: 효과·친밀도 적용, 1개 줄어든다, 대기 시간 없음', () => {
    const e = { ...rich(), inventory: { food_cookie: 2 } };
    const r = applyItem(pet({ fullness: 50, mood: 50 }), e, item('food_cookie'), NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.pet.fullness).toBe(70);
    expect(r.pet.mood).toBe(60);
    expect(r.pet.affection).toBe(2);
    expect(r.economy.inventory.food_cookie).toBe(1);
    expect(applyItem(r.pet, r.economy, item('food_cookie'), NOW + 1000).ok).toBe(true);
  });

  it('이미 가득 찼으면 소모품을 쓰지 않는다 (별 보호)', () => {
    const e = { ...rich(), inventory: { hyg_soap: 1 } };
    expect(applyItem(pet({ cleanliness: 100 }), e, item('hyg_soap'), NOW)).toEqual({ ok: false, reason: 'full' });
  });

  it('장난감: 줄지 않고 장난감마다 30분 대기', () => {
    const e = { ...rich(), owned: ['toy_ball', 'toy_doll'] };
    const r = applyItem(pet({ mood: 40 }), e, item('toy_ball'), NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.pet.mood).toBe(60);
    expect(r.economy.owned).toContain('toy_ball');
    expect(applyItem(r.pet, e, item('toy_ball'), NOW + 60_000)).toEqual({ ok: false, reason: 'cooldown' });
    expect(applyItem(r.pet, e, item('toy_doll'), NOW + 60_000).ok).toBe(true);
    expect(applyItem(r.pet, e, item('toy_ball'), NOW + 30 * 60_000).ok).toBe(true);
  });

  it('가지고 있지 않으면 쓸 수 없다', () => {
    expect(applyItem(pet(), rich(), item('food_apple'), NOW)).toEqual({ ok: false, reason: 'none' });
  });
});

describe('모자', () => {
  it('가진 모자만 쓸 수 있고, 벗기는 언제나 가능', () => {
    const e = { ...rich(), owned: ['hat_ribbon'] };
    expect(canWearHat(e, catalog, 'hat_ribbon')).toBe(true);
    expect(canWearHat(e, catalog, 'hat_crown')).toBe(false);
    expect(canWearHat(e, catalog, 'toy_ball')).toBe(false);
    expect(canWearHat(e, catalog, null)).toBe(true);
  });

  it('단 마스터 보상 모자는 한 번만 받는다', () => {
    const r = grantMasterHats(rich(), catalog, [7, 12]);
    expect(r.granted).toEqual(['hat_master_7', 'hat_master_12']);
    expect(grantMasterHats(r.economy, catalog, [7]).granted).toEqual([]);
    expect(bagItems(r.economy, catalog, 'hat').map((i) => i.id)).toEqual(['hat_master_7', 'hat_master_12']);
  });
});

describe('장난감 놀이의 대가', () => {
  it('장난감으로 놀면 배부름·깨끗함 −30, 화면에도 표시', () => {
    const r = applyItem(pet({ fullness: 80, cleanliness: 80, mood: 40 }), { ...rich(), owned: ['toy_ball'] }, item('toy_ball'), NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.pet).toMatchObject({ fullness: 50, cleanliness: 50, mood: 60 });
  });
});
