import { describe, expect, it } from 'vitest';
import { defaultCatalog } from '../src/data/defaultCatalog';
import {
  changePin,
  checkPin,
  checkRecovery,
  firstSetup,
  initialAdmin,
  isValidPin,
  lockRemaining,
  newRecoveryCode,
  registerFailure,
  reissueRecovery,
} from '../src/domain/admin';
import {
  balanceHint,
  canDelete,
  deleteItem,
  draftItem,
  moveItem,
  restoreDefaults,
  setOnSale,
  upsertItem,
  validateItem,
} from '../src/domain/catalogRules';
import { chooseEgg, hatch, initialPet } from '../src/domain/pet';
import { initialEconomy } from '../src/domain/progress';
import {
  applyShopSettings,
  encodeShopCode,
  exportBackup,
  exportShopSettings,
  parseBackup,
  parseShopSettings,
} from '../src/domain/shareCode';
import { applyItem, findItem, type ItemDef, shopItems } from '../src/domain/shop';
import { createInitialSave } from '../src/store/saveData';

const NOW = new Date(2026, 9, 15, 10).getTime();
const item = (id: string) => findItem(defaultCatalog(), id) as ItemDef;

describe('아이템 검사 (설계서 10-3 범위)', () => {
  it('기본 아이템과 새 초안은 모두 통과', () => {
    for (const i of defaultCatalog().items) expect(validateItem(i)).toEqual([]);
    for (const c of ['food', 'hygiene', 'toy', 'hat'] as const) expect(validateItem({ ...draftItem(c, 1), name: '새것' })).toEqual([]);
  });

  it('범위 밖 값은 거부', () => {
    const apple = item('food_apple');
    expect(validateItem({ ...apple, price: 0 })).not.toEqual([]);
    expect(validateItem({ ...apple, price: 1000 })).not.toEqual([]);
    expect(validateItem({ ...apple, price: 3.5 })).not.toEqual([]);
    expect(validateItem({ ...apple, name: '' })).not.toEqual([]);
    expect(validateItem({ ...apple, name: '아주아주아주긴사과이름' })).not.toEqual([]);
    expect(validateItem({ ...apple, effects: { fullness: 101 } })).not.toEqual([]);
    expect(validateItem({ ...apple, effects: { fullness: 10, affection: 11 } })).not.toEqual([]);
    expect(validateItem({ ...apple, effects: { mood: 10 } })).not.toEqual([]); // 먹이 주 효과(배부름) 없음
    expect(validateItem({ ...apple, effects: { fullness: 10, cleanliness: 5 } })).not.toEqual([]); // 먹이에 청결 불가
    expect(validateItem({ ...apple, consumable: false })).not.toEqual([]);
    expect(validateItem({ ...apple, maxStack: 21 })).not.toEqual([]);
    expect(validateItem({ ...item('toy_ball'), cooldownMin: 2 })).not.toEqual([]);
    expect(validateItem({ ...item('hat_ribbon'), art: { hatShape: 'cap', hatColor: '#ff8fc1' } })).not.toEqual([]);
  });

  it('upsert: 검사 통과 시 저장·버전 증가, 실패 시 그대로, 보상 모자는 수정 불가', () => {
    const c = defaultCatalog();
    const ok = upsertItem(c, { ...item('food_apple'), price: 5 });
    expect(ok.ok && findItem(ok.catalog, 'food_apple')?.price).toBe(5);
    expect(ok.ok && ok.catalog.version).toBe(2);
    expect(upsertItem(c, { ...item('food_apple'), price: -1 }).ok).toBe(false);
    expect(upsertItem(c, { ...item('hat_master_7') }).ok).toBe(false);
  });

  it('밸런스 안내: 너무 비싸거나 효과에 비해 너무 쌈', () => {
    expect(balanceHint({ ...item('hat_crown'), price: 300 })).toMatch(/비싸/);
    expect(balanceHint({ ...item('food_lunchbox'), price: 1 })).toMatch(/싸/);
    expect(balanceHint(item('food_apple'))).toBeNull();
  });
});

describe('판매 중지·삭제·순서·복원', () => {
  it('판매 중지하면 상점에서 사라지지만, 이미 산 학생은 계속 쓸 수 있다', () => {
    const c = setOnSale(defaultCatalog(), 'food_apple', false);
    expect(shopItems(c, 'food').some((i) => i.id === 'food_apple')).toBe(false);
    const pet = hatch(chooseEgg(initialPet(NOW), 'cat'), '냥', NOW);
    const r = applyItem({ ...pet, fullness: 50 }, { ...initialEconomy(), inventory: { food_apple: 1 } }, findItem(c, 'food_apple')!, NOW);
    expect(r.ok).toBe(true);
  });

  it('완전 삭제는 관리자가 추가했고 아무도 갖고 있지 않을 때만', () => {
    const added = upsertItem(defaultCatalog(), { ...draftItem('food', 9), name: '바나나' });
    if (!added.ok) throw new Error('추가 실패');
    const id = added.catalog.items.at(-1)!.id;
    expect(canDelete(item('food_apple'), initialEconomy())).toBe(false);
    expect(deleteItem(added.catalog, { ...initialEconomy(), inventory: { [id]: 1 } }, id).items.some((i) => i.id === id)).toBe(true);
    expect(deleteItem(added.catalog, initialEconomy(), id).items.some((i) => i.id === id)).toBe(false);
  });

  it('순서 옮기기', () => {
    const c = moveItem(defaultCatalog(), 'food_milk', -1);
    expect(shopItems(c, 'food').map((i) => i.id).slice(0, 2)).toEqual(['food_milk', 'food_apple']);
    expect(moveItem(c, 'food_milk', -1)).toBe(c);
  });

  it('기본값 복원: 기본 아이템은 원래대로, 추가한 아이템은 판매 중지로 남김', () => {
    let c = upsertItem(defaultCatalog(), { ...item('food_apple'), price: 50 });
    if (!c.ok) throw new Error();
    const added = upsertItem(c.catalog, { ...draftItem('food', 9), name: '바나나' });
    if (!added.ok) throw new Error();
    const restored = restoreDefaults(added.catalog, defaultCatalog(), 'food');
    expect(findItem(restored, 'food_apple')?.price).toBe(6);
    const banana = restored.items.find((i) => i.name === '바나나');
    expect(banana?.onSale).toBe(false);
    expect(restored.items.filter((i) => i.id === 'food_apple')).toHaveLength(1);
  });
});

describe('상점 설정 공유', () => {
  it('코드로 내보내고 다른 기기에서 읽으면 바뀐 점을 요약한다', () => {
    let src = upsertItem(defaultCatalog(), { ...item('food_apple'), price: 5 });
    if (!src.ok) throw new Error();
    src = upsertItem(src.catalog, { ...draftItem('toy', 9), name: '연' }) as typeof src;
    if (!src.ok) throw new Error();
    const catalog = setOnSale(src.catalog, 'hyg_soap', false);
    const code = encodeShopCode(exportShopSettings(catalog, NOW));
    expect(code.startsWith('GUGU1-')).toBe(true);

    const target = defaultCatalog();
    const r = parseShopSettings(code, target);
    if (!r.ok) throw new Error(r.error);
    expect(r.preview).toMatchObject({ added: 1, priceChanged: 1, saleChanged: 1, skipped: [] });
    const applied = applyShopSettings(target, r.preview.valid);
    expect(findItem(applied, 'food_apple')?.price).toBe(5);
    expect(findItem(applied, 'hyg_soap')?.onSale).toBe(false);
    expect(applied.items.some((i) => i.name === '연')).toBe(true);
    expect(applied.items.filter((i) => i.source === 'reward')).toHaveLength(10);
  });

  it('JSON 파일 내용도 읽는다', () => {
    const r = parseShopSettings(JSON.stringify(exportShopSettings(defaultCatalog(), NOW)), defaultCatalog());
    expect(r.ok).toBe(true);
  });

  it('잘못된 코드는 거부하고, 이상한 아이템은 건너뛴다', () => {
    expect(parseShopSettings('아무말', defaultCatalog()).ok).toBe(false);
    expect(parseShopSettings('GUGU1-@@@', defaultCatalog()).ok).toBe(false);
    const file = exportShopSettings(defaultCatalog(), NOW);
    file.items[0] = { ...file.items[0], price: 99999 };
    const r = parseShopSettings(JSON.stringify(file), defaultCatalog());
    if (!r.ok) throw new Error(r.error);
    expect(r.preview.skipped).toEqual(['사과']);
    expect(r.preview.valid.some((i) => i.id === 'food_apple')).toBe(false);
  });
});

describe('백업', () => {
  it('내보낸 백업을 다시 읽으면 요약이 나온다', () => {
    const save = createInitialSave(NOW);
    save.economy.stars = 42;
    const r = parseBackup(exportBackup(save, NOW));
    if (!r.ok) throw new Error(r.error);
    expect(r.summary.stars).toBe(42);
  });

  it('다른 파일은 거부', () => {
    expect(parseBackup('{"a":1}').ok).toBe(false);
    expect(parseBackup('깨진 파일').ok).toBe(false);
  });
});

describe('PIN', () => {
  it('4자리 숫자만', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });

  it('해시로만 저장하고, 맞는 PIN·복구 코드만 통과', async () => {
    const code = newRecoveryCode();
    const admin = await firstSetup(initialAdmin(), '2580', code);
    expect(admin.pinHash).not.toContain('2580');
    expect(await checkPin(admin, '2580')).toBe(true);
    expect(await checkPin(admin, '0000')).toBe(false);
    expect(await checkRecovery(admin, code.toLowerCase().slice(0, 4) + '-' + code.slice(4))).toBe(true);
    expect(await checkRecovery(admin, 'WRONGCOD')).toBe(false);
  });

  it('PIN을 바꿔도 복구 코드는 그대로 쓸 수 있고, 재발급하면 옛 코드는 안 된다', async () => {
    const code = newRecoveryCode();
    let admin = await firstSetup(initialAdmin(), '1111', code);
    admin = await changePin(admin, '2222');
    expect(await checkPin(admin, '2222')).toBe(true);
    expect(await checkRecovery(admin, code)).toBe(true);
    const code2 = newRecoveryCode();
    admin = await reissueRecovery(admin, code2);
    expect(await checkRecovery(admin, code)).toBe(false);
    expect(await checkRecovery(admin, code2)).toBe(true);
  });

  it('5번 틀리면 1분 잠금', () => {
    let admin = initialAdmin();
    for (let i = 0; i < 4; i++) admin = registerFailure(admin, NOW);
    expect(lockRemaining(admin, NOW)).toBe(0);
    admin = registerFailure(admin, NOW);
    expect(lockRemaining(admin, NOW)).toBe(60_000);
    expect(lockRemaining(admin, NOW + 60_000)).toBe(0);
  });
});
