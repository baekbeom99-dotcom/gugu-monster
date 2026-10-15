/** 상점 아이템 관리 — 설계서 10-3 */
import { useState } from 'react';
import { HatIcon } from '../../art/HatSprite';
import { EffectChips, ItemArt } from '../../components/ItemArt';
import { defaultCatalog } from '../../data/defaultCatalog';
import { ITEM_ICONS } from '../../data/itemIcons';
import {
  balanceHint,
  CATEGORY_EFFECTS,
  canDelete,
  draftItem,
  EDITABLE_HAT_SHAPES,
  HAT_COLORS,
  HAT_SHAPE_LABELS,
  LIMITS,
  validateItem,
} from '../../domain/catalogRules';
import { josa } from '../../domain/korean';
import { CATEGORIES, CATEGORY_LABELS, DEFAULT_MAX_STACK, findItem, type ItemCategory, type ItemDef } from '../../domain/shop';
import { useGameStore } from '../../store/useGameStore';
import { Field, NumberField, Toggle } from './fields';

const EFFECT_LABELS: Record<string, string> = { fullness: '🍚 배부름', mood: '💗 기분', cleanliness: '🫧 깨끗함', affection: '♥ 친밀도' };

export function ItemsPanel() {
  const catalog = useGameStore((s) => s.catalog);
  const { setItemOnSale, moveCatalogItem, restoreCatalog } = useGameStore.getState();
  const [category, setCategory] = useState<ItemCategory>('food');
  const [editing, setEditing] = useState<ItemDef | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<'category' | 'all' | null>(null);

  const items = catalog.items
    .filter((i) => i.category === category)
    .sort((a, b) => Number(a.source === 'reward') - Number(b.source === 'reward') || a.order - b.order || a.price - b.price);
  const sellable = items.filter((i) => i.source !== 'reward');

  if (editing) return <ItemEditor initial={editing} isNew={!findItem(catalog, editing.id)} onClose={() => setEditing(null)} />;

  return (
    <div className="admin-panel">
      <div className="shop-tabs">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className={`shop-tab ${category === c ? 'shop-tab--on' : ''}`} onClick={() => setCategory(c)}>
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <ul className="item-rows">
        {items.map((item) => {
          const reward = item.source === 'reward';
          const idx = sellable.findIndex((i) => i.id === item.id);
          return (
            <li key={item.id} className={`item-row ${!item.onSale && !reward ? 'item-row--off' : ''} ${reward ? 'item-row--reward' : ''}`}>
              <button type="button" className="item-row__main" onClick={() => !reward && setEditing(item)} disabled={reward}>
                <ItemArt item={item} size={44} />
                <span className="item-row__text">
                  <strong>{item.name}</strong>
                  <span>
                    {reward ? '비매품 · 마스터 보상' : `★ ${item.price}`}
                    {item.source === 'custom' && ' · 추가함'}
                    {!item.onSale && !reward && ' · 판매 중지'}
                  </span>
                </span>
              </button>
              {!reward && (
                <span className="item-row__tools">
                  <Toggle label={`${item.name} 판매`} checked={item.onSale} onChange={(v) => setItemOnSale(item.id, v)} />
                  <span className="order-btns">
                    <button type="button" aria-label={`${item.name} 위로`} disabled={idx <= 0} onClick={() => moveCatalogItem(item.id, -1)}>
                      ▲
                    </button>
                    <button type="button" aria-label={`${item.name} 아래로`} disabled={idx >= sellable.length - 1} onClick={() => moveCatalogItem(item.id, 1)}>
                      ▼
                    </button>
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <button type="button" className="btn btn--primary" onClick={() => setEditing(draftItem(category, sellable.length + 1))}>
        ＋ {CATEGORY_LABELS[category]} 추가
      </button>
      <div className="admin-actions">
        <button type="button" className="btn btn--ghost" onClick={() => setConfirmRestore('category')}>
          {CATEGORY_LABELS[category]} 기본값 복원
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setConfirmRestore('all')}>
          전체 기본값 복원
        </button>
      </div>

      {confirmRestore && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__card">
            <p className="modal__title">기본값으로 되돌릴까요?</p>
            <p className="modal__body">
              {confirmRestore === 'all' ? '모든 종류' : CATEGORY_LABELS[category]}의 기본 아이템이 처음 가격·효과로 돌아가요. 직접 추가한 아이템은 지우지 않고 판매 중지로 바꿔요.
            </p>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmRestore(null)}>
                아니요
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  restoreCatalog(confirmRestore === 'all' ? undefined : category);
                  setConfirmRestore(null);
                }}
              >
                되돌리기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemEditor({ initial, isNew, onClose }: { initial: ItemDef; isNew: boolean; onClose: () => void }) {
  const economy = useGameStore((s) => s.economy);
  const { saveItem, deleteCatalogItem } = useGameStore.getState();
  const [item, setItem] = useState<ItemDef>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rules = CATEGORY_EFFECTS[item.category];
  const defaultPrice = item.source === 'default' ? findItem(defaultCatalog(), item.id)?.price : undefined;
  const hint = balanceHint(item);
  const patch = (p: Partial<ItemDef>) => {
    setItem((i) => ({ ...i, ...p }));
    setErrors([]);
  };
  const setEffect = (key: string, v: number) => patch({ effects: { ...item.effects, [key]: v } });

  const save = () => {
    const cleaned: ItemDef = {
      ...item,
      // 0인 효과는 저장하지 않는다
      effects: Object.fromEntries(Object.entries(item.effects).filter(([, v]) => v !== 0)),
    };
    const errs = validateItem(cleaned);
    if (errs.length) return setErrors(errs);
    const r = saveItem(cleaned);
    if (!r.ok) return setErrors(r.errors);
    onClose();
  };

  return (
    <div className="admin-panel">
      <h2 className="admin-heading">{isNew ? `새 ${CATEGORY_LABELS[item.category]}` : `${initial.name} 고치기`}</h2>

      <div className="neo-card editor-preview" aria-label="상점 미리보기">
        <ItemArt item={item} size={64} />
        <span className="shop-card__name">{item.name || '이름'}</span>
        <EffectChips item={item} />
        <span className="price">★ {Number.isFinite(item.price) ? item.price : '?'}</span>
      </div>

      <Field label="이름" hint={`${[...item.name].length}/${LIMITS.nameMax}`}>
        <input className="admin-input" value={item.name} maxLength={LIMITS.nameMax + 2} onChange={(e) => patch({ name: e.target.value })} />
      </Field>

      {item.category === 'hat' ? (
        <>
          <Field label="모자 모양">
            <span className="picker">
              {EDITABLE_HAT_SHAPES.map((shape) => (
                <button
                  key={shape}
                  type="button"
                  className={`picker__cell ${item.art.hatShape === shape ? 'picker__cell--on' : ''}`}
                  onClick={() => patch({ art: { ...item.art, hatShape: shape } })}
                  aria-label={HAT_SHAPE_LABELS[shape]}
                >
                  <HatIcon art={{ shape, color: item.art.hatColor ?? HAT_COLORS[0] }} size={44} />
                </button>
              ))}
            </span>
          </Field>
          <Field label="색">
            <span className="picker">
              {HAT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`swatch ${item.art.hatColor === color ? 'swatch--on' : ''}`}
                  style={{ background: color }}
                  onClick={() => patch({ art: { ...item.art, hatColor: color } })}
                  aria-label={`색 ${color}`}
                />
              ))}
            </span>
          </Field>
        </>
      ) : (
        <Field label="그림">
          <span className="picker">
            {Object.entries(ITEM_ICONS)
              .filter(([, v]) => v.group === item.category)
              .map(([key, v]) => (
                <button
                  key={key}
                  type="button"
                  className={`picker__cell picker__cell--emoji ${item.art.icon === key ? 'picker__cell--on' : ''}`}
                  onClick={() => patch({ art: { icon: key } })}
                  aria-label={v.label}
                  title={v.label}
                >
                  {v.glyph}
                </button>
              ))}
          </span>
        </Field>
      )}

      <NumberField
        label="가격"
        unit="★"
        value={item.price}
        min={LIMITS.price.min}
        max={LIMITS.price.max}
        hint={defaultPrice !== undefined ? `기본값 ${defaultPrice}★` : undefined}
        onChange={(v) => patch({ price: v })}
      />

      {rules.editable.map((key) => (
        <NumberField
          key={key}
          label={EFFECT_LABELS[key]}
          value={item.effects[key] ?? 0}
          min={0}
          max={key === 'affection' ? LIMITS.affection.max : LIMITS.stat.max}
          step={key === 'affection' ? 1 : 5}
          hint={key === rules.main ? '주 효과 · 1 이상' : undefined}
          onChange={(v) => setEffect(key, v)}
        />
      ))}

      {item.category === 'toy' && (
        <NumberField
          label="다시 놀기까지"
          unit="분"
          value={item.cooldownMin ?? 30}
          min={LIMITS.cooldownMin.min}
          max={LIMITS.cooldownMin.max}
          step={5}
          onChange={(v) => patch({ cooldownMin: v })}
        />
      )}
      {item.consumable && (
        <NumberField
          label="가방에 최대"
          unit="개"
          value={item.maxStack ?? DEFAULT_MAX_STACK}
          min={LIMITS.maxStack.min}
          max={LIMITS.maxStack.max}
          onChange={(v) => patch({ maxStack: v })}
        />
      )}

      <Field label="설명" hint={`${(item.description ?? '').length}/${LIMITS.descMax}`}>
        <input className="admin-input" value={item.description ?? ''} maxLength={LIMITS.descMax} onChange={(e) => patch({ description: e.target.value })} />
      </Field>

      <div className="field field--row">
        <span className="field__label">상점에서 팔기</span>
        <Toggle label="상점에서 팔기" checked={item.onSale} onChange={(v) => patch({ onSale: v })} />
      </div>

      {hint && <p className="admin-note admin-note--warn">⚠ {hint} (저장은 할 수 있어요)</p>}
      {errors.length > 0 && (
        <ul className="admin-note admin-note--error" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="admin-actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          취소
        </button>
        <button type="button" className="btn btn--primary" onClick={save}>
          저장
        </button>
      </div>
      {!isNew && item.source === 'custom' && (
        <button
          type="button"
          className="link-button link-button--danger"
          disabled={!canDelete(item, economy)}
          onClick={() => setConfirmDelete(true)}
        >
          {canDelete(item, economy) ? '이 아이템 지우기' : '학생이 가지고 있어서 지울 수 없어요 (판매 중지는 할 수 있어요)'}
        </button>
      )}

      {confirmDelete && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__card">
            <p className="modal__title">{josa(item.name, '을', '를')} 지울까요?</p>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>
                아니요
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  deleteCatalogItem(item.id);
                  onClose();
                }}
              >
                지우기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

