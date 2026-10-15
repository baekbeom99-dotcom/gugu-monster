/** 전투 화면의 동료: 내 펫이 응원한다 (부화 전이면 알이 흔들린다) — 설계서 8장 */
import { hatArtOf } from '../art/HatSprite';
import { EggSprite, type PetExpression, PetSprite } from '../art/PetSprite';
import { findItem } from '../domain/shop';
import { useGameStore } from '../store/useGameStore';

export type BuddyMood = 'idle' | 'cheer' | 'worry' | 'party';

/** 오답에도 슬픈 표정 대신 '응원' 표정 */
const EXPRESSION: Record<BuddyMood, PetExpression> = { idle: 'idle', cheer: 'happy', worry: 'cheer', party: 'excited' };

export function Buddy({ message, mood }: { message: string | null; mood: BuddyMood }) {
  const species = useGameStore((s) => s.pet.species);
  const stage = useGameStore((s) => s.pet.stage);
  // 선택자는 값 그대로 꺼내고(새 객체를 만들면 매번 다시 그려진다), 모자 그림은 밖에서 만든다.
  const catalog = useGameStore((s) => s.catalog);
  const hatId = useGameStore((s) => s.pet.equippedHat);
  const hat = hatArtOf(findItem(catalog, hatId ?? ''));
  return (
    <div className={`buddy buddy--${mood}`}>
      {message && <div className="buddy__bubble">{message}</div>}
      <span className="buddy__pet" aria-hidden>
        {!species ? null : stage === 'egg' ? (
          <EggSprite species={species} size={58} className="egg-wobble" />
        ) : (
          <PetSprite species={species} stage={stage} expression={EXPRESSION[mood]} size={64} hat={hat} />
        )}
      </span>
    </div>
  );
}
