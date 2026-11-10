import { useState } from 'react';
import { fieldDans, FIELDS, type FieldId } from '../domain/field/fields';
import { useGameStore } from '../store/useGameStore';
import './field.css';

/** 필드 사이를 오갈 때 보이는 화면: 필드 이름 · 단 + 곱셈 한 줄 */
export function FieldLoading({ field }: { field: FieldId }) {
  const unlocked = useGameStore((s) => s.learning.challengeUnlocked);
  const dans = fieldDans(field, unlocked);
  const [fact] = useState(() => {
    const dan = dans[Math.floor(Math.random() * dans.length)];
    const n = 2 + Math.floor(Math.random() * 8);
    return `${dan} × ${n} = ${dan * n}`;
  });
  return (
    <section className="fieldmode floading" role="status" aria-label="불러오는 중">
      <div className="floading__name">
        {FIELDS[field].name} · {dans.join('·')}단
      </div>
      <div className="floading__fact">{fact}</div>
      <div className="floading__hint">불러오는 중…</div>
    </section>
  );
}
