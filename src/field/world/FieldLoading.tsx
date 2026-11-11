import { useState } from 'react';
import type { Dan } from '../../domain/facts';
import { fieldDans, FIELDS, type MapId, TOWN_NAME } from '../../domain/field/fields';
import { useGameStore } from '../../store/useGameStore';
import './field.css';

/** 마을에서 보여 줄 곱셈의 단 */
const TOWN_DANS: Dan[] = [2, 3, 4, 5, 6, 7, 8, 9];

/** 지도 사이를 오갈 때 보이는 화면: 필드 이름 · 단(마을은 이름만) + 곱셈 한 줄 */
export function FieldLoading({ map }: { map: MapId }) {
  const unlocked = useGameStore((s) => s.learning.challengeUnlocked);
  const dans = map === 'town' ? TOWN_DANS : fieldDans(map, unlocked);
  const [fact] = useState(() => {
    const dan = dans[Math.floor(Math.random() * dans.length)];
    const n = 2 + Math.floor(Math.random() * 8);
    return `${dan} × ${n} = ${dan * n}`;
  });
  return (
    <section className="fieldmode floading" role="status" aria-label="불러오는 중">
      <div className="floading__name">
        {map === 'town' ? TOWN_NAME : `${FIELDS[map].name} · ${dans.join('·')}단`}
      </div>
      <div className="floading__fact">{fact}</div>
      <div className="floading__hint">불러오는 중…</div>
    </section>
  );
}
