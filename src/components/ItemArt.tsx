/** 아이템 그림·효과 표시 (상점·서랍 공통) */
import { HatIcon, hatArtOf } from '../art/HatSprite';
import { iconGlyph } from '../data/itemIcons';
import type { ItemDef } from '../domain/shop';

const TILE_COLORS: Record<ItemDef['category'], string> = {
  food: 'var(--orange)',
  hygiene: 'var(--sky)',
  toy: 'var(--pink)',
  hat: 'var(--violet)',
};

export function ItemArt({ item, size = 64 }: { item: ItemDef; size?: number }) {
  const hat = hatArtOf(item);
  return (
    <span className="item-art" style={{ width: size, height: size, background: TILE_COLORS[item.category] }} aria-hidden>
      {hat ? <HatIcon art={hat} size={size * 0.9} /> : <span style={{ fontSize: size * 0.58 }}>{iconGlyph(item.art.icon)}</span>}
    </span>
  );
}

const EFFECT_ICONS: Record<string, string> = { fullness: '🍚', mood: '💗', cleanliness: '🫧', affection: '♥' };

export function EffectChips({ item }: { item: ItemDef }) {
  const entries = Object.entries(item.effects).filter(([, v]) => v);
  if (item.category === 'hat') return <span className="effect-chips"><span className="effect">꾸미기</span></span>;
  return (
    <span className="effect-chips">
      {entries.map(([k, v]) => (
        <span key={k} className={`effect effect--${k}`}>
          {EFFECT_ICONS[k]}+{v}
        </span>
      ))}
    </span>
  );
}
