/** 별 상점 — 설계서 5-3, 9-2 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hatArtOf } from '../art/HatSprite';
import { PetSprite } from '../art/PetSprite';
import { playSfx } from '../audio/sfx';
import { EffectChips, ItemArt } from '../components/ItemArt';
import { josa } from '../domain/korean';
import { canBuy, CATEGORIES, CATEGORY_LABELS, DEFAULT_MAX_STACK, findItem, type ItemCategory, type ItemDef, ownedCount, shopItems } from '../domain/shop';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import './shop.css';

const GIVE_FAIL: Record<string, string> = {
  full: '지금은 배불러요! 나중에 줄게요.',
  sleeping: '쿨쿨 자고 있어요. 깨어나면 줄게요.',
  cooldown: '방금 놀았어요! 조금 있다가 또 놀자.',
  egg: '알이 깨어나면 줄 수 있어요!',
};

type Modal = { item: ItemDef; phase: 'confirm' | 'bought' | 'given'; message?: string } | null;

export function ShopScreen() {
  const navigate = useNavigate();
  const catalog = useGameStore((s) => s.catalog);
  const economy = useGameStore((s) => s.economy);
  const pet = useGameStore((s) => s.pet);
  const { buyItem, giveItem, wearHat } = useGameStore.getState();
  const [category, setCategory] = useState<ItemCategory>('food');
  const [modal, setModal] = useState<Modal>(null);

  const items = shopItems(catalog, category);
  const hatched = pet.species && pet.stage !== 'egg';

  const open = (item: ItemDef) => {
    playSfx('tap');
    setModal({ item, phase: 'confirm' });
  };

  const purchase = (item: ItemDef) => {
    const r = buyItem(item.id);
    if (!r.ok) return;
    playSfx('coin');
    setModal({ item, phase: 'bought' });
  };

  const giveNow = (item: ItemDef) => {
    if (item.category === 'hat') {
      wearHat(item.id);
      playSfx('capture');
      setModal({ item, phase: 'given', message: '짜잔! 잘 어울려?' });
      return;
    }
    const r = giveItem(item.id, Date.now());
    if (!r.ok) {
      playSfx('gentle');
      setModal({ item, phase: 'given', message: GIVE_FAIL[r.reason] ?? '나중에 줄게요!' });
      return;
    }
    playSfx('correct');
    if (r.evolvedTo) useSessionStore.getState().set({ pendingEvolution: r.evolvedTo });
    if (r.levelUp) useSessionStore.getState().set({ pendingLevelUp: r.levelUp });
    setModal({ item, phase: 'given', message: item.category === 'food' ? '냠냠! 고마워!' : item.category === 'toy' ? '와, 신난다!' : '뽀득뽀득! 개운해!' });
  };

  return (
    <section className="shop">
      <h1 className="shop__title">별 상점</h1>

      <div className="shop-tabs" role="tablist" aria-label="상품 종류">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            className={`shop-tab ${category === c ? 'shop-tab--on' : ''}`}
            onClick={() => {
              playSfx('tap');
              setCategory(c);
            }}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="shop-grid">
        {items.map((item) => {
          const count = ownedCount(economy, item);
          const check = canBuy(economy, item);
          const owned = !item.consumable && count > 0;
          return (
            <button key={item.id} type="button" className={`neo-card shop-card ${owned ? 'shop-card--owned' : ''}`} onClick={() => open(item)}>
              <ItemArt item={item} size={72} />
              <span className="shop-card__name">{item.name}</span>
              <EffectChips item={item} />
              {item.consumable && count > 0 && <span className="shop-card__count">가방 {count}개</span>}
              <span className={`price ${owned ? 'price--owned' : check.ok ? '' : 'price--short'}`}>
                {owned ? '가지고 있어요 ✓' : `★ ${item.price}`}
              </span>
            </button>
          );
        })}
      </div>

      {economy.stars < Math.min(...items.map((i) => i.price), Infinity) && (
        <div className="neo-card shop-hint">
          별이 모자라요! 탐험에서 문제를 풀면 별을 모을 수 있어요.
          <button type="button" className="btn btn--primary" onClick={() => navigate('/explore')}>
            탐험 가기
          </button>
        </div>
      )}

      {modal && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={modal.item.name} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal__card shop-modal">
            {modal.phase === 'confirm' && (
              <ConfirmBody
                item={modal.item}
                stars={economy.stars}
                count={ownedCount(economy, modal.item)}
                onBuy={() => purchase(modal.item)}
                onClose={() => setModal(null)}
                onExplore={() => navigate('/explore')}
                onUseOwned={hatched ? () => giveNow(modal.item) : undefined}
              />
            )}
            {modal.phase !== 'confirm' && (
              <>
                {pet.species && pet.stage !== 'egg' ? (
                  <PetSprite
                    species={pet.species}
                    stage={pet.stage}
                    expression={modal.phase === 'given' ? (modal.item.special ? 'excited' : 'happy') : 'request'}
                    hat={hatArtOf(findItem(catalog, pet.equippedHat ?? ''))}
                    size={150}
                    className="pet-hop"
                  />
                ) : (
                  <ItemArt item={modal.item} size={96} />
                )}
                <p className="modal__title">{modal.phase === 'bought' ? `${josa(modal.item.name, '을', '를')} 샀어요!` : modal.message}</p>
                {modal.phase === 'bought' && (
                  <p className="modal__body">
                    {modal.item.category === 'hat' ? '나의 펫 화면에서 씌워 줄 수 있어요.' : '가방에 넣었어요. 나의 펫 화면에서 줄 수 있어요.'}
                  </p>
                )}
                <button type="button" className="btn btn--primary" onClick={() => setModal(null)}>
                  좋아!
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ConfirmBody({
  item,
  stars,
  count,
  onBuy,
  onClose,
  onExplore,
  onUseOwned,
}: {
  item: ItemDef;
  stars: number;
  count: number;
  onBuy: () => void;
  onClose: () => void;
  onExplore: () => void;
  onUseOwned?: () => void;
}) {
  const owned = !item.consumable && count > 0;
  const full = item.consumable && count >= (item.maxStack ?? DEFAULT_MAX_STACK);
  const need = item.price - stars;
  return (
    <>
      <ItemArt item={item} size={96} />
      <p className="modal__title">{item.name}</p>
      {item.description && <p className="modal__body">{item.description}</p>}
      <EffectChips item={item} />
      {owned ? (
        <>
          <p className="modal__body">이미 가지고 있어요!</p>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              닫기
            </button>
            {onUseOwned && (
              <button type="button" className="btn btn--primary" onClick={onUseOwned}>
                {item.category === 'hat' ? '써 보기' : '놀아 주기'}
              </button>
            )}
          </div>
        </>
      ) : full ? (
        <>
          <p className="modal__body">가방이 꽉 찼어요 ({count}개). 먼저 펫에게 줘 볼까요?</p>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            알겠어!
          </button>
        </>
      ) : need > 0 ? (
        <>
          <p className="modal__body">
            별이 <strong>{need}개</strong> 더 필요해요. 탐험해서 모아 오자!
          </p>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              닫기
            </button>
            <button type="button" className="btn btn--primary" onClick={onExplore}>
              탐험 가기
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="modal__body">
            ★ {item.price}개로 살까요? (남는 별 ★ {stars - item.price})
          </p>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              아니
            </button>
            <button type="button" className="btn btn--primary" onClick={onBuy}>
              살래!
            </button>
          </div>
        </>
      )}
    </>
  );
}
