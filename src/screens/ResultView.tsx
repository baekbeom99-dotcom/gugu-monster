import { DAN_COLORS } from '../art/colors';
import { MonsterSprite } from '../art/MonsterSprite';
import { Confetti } from '../components/Confetti';
import { hatArtOf } from '../art/HatSprite';
import { EggSprite, PetSprite } from '../art/PetSprite';
import { findItem } from '../domain/shop';
import type { MonsterSlot } from '../domain/battle';
import { josa } from '../domain/korean';
import { STAGE_LABELS } from '../domain/pet';
import { useGameStore, type ExplorationOutcome } from '../store/useGameStore';

export interface Tally {
  correct: number;
  correctStars: number;
  captureStars: number;
  overcome: number;
  overcomeStars: number;
  slept: number;
  /** 펫 성장 점수 */
  xp: number;
}

interface Props {
  monsters: MonsterSlot[];
  tally: Tally;
  finish: ExplorationOutcome;
  onAgain: () => void;
  onPet: () => void;
}

export function ResultView({ monsters, tally, finish, onAgain, onPet }: Props) {
  const pet = useGameStore((s) => s.pet);
  const catalog = useGameStore((s) => s.catalog);
  const isEgg = pet.stage === 'egg';
  const lines = [
    // 정답이 없을 때 '0개'를 굳이 보여주지 않는다.
    ...(tally.correct > 0 ? [{ label: `정답 ${tally.correct}개`, stars: tally.correctStars }] : []),
    { label: `몬스터 친구 ${monsters.length}마리`, stars: tally.captureStars },
    ...(tally.overcome > 0 ? [{ label: `어려웠던 문제 극복 ${tally.overcome}개`, stars: tally.overcomeStars }] : []),
    ...finish.bonuses,
  ];
  const total = lines.reduce((sum, l) => sum + l.stars, 0);
  const bigMoment = finish.newlyMastered.length > 0 || finish.challengeJustUnlocked || !!finish.evolvedTo;
  const petLine = finish.challengeJustUnlocked
    ? '우리 더 강해졌어! 황금 몬스터도 잡자!'
    : finish.newlyMastered.length > 0
      ? `${finish.newlyMastered.join('·')}단 마스터! 최고야!`
      : finish.evolvedTo
        ? '나 자랐어! 고마워!'
        : tally.overcome > 0
          ? '어려웠던 문제도 해냈어!'
          : `별을 ${total}개나 모았어!`;

  return (
    <div className="result">
      {bigMoment && <Confetti />}
      <h1 className="result__title">탐험 성공!</h1>
      {tally.slept > 0 && <p className="result__note">몬스터가 지쳐서 잠들었어요. 우리가 이겼어요!</p>}

      <div className="result__monsters">
        {monsters.map((m, i) => (
          <div key={i} className="result__monster" style={{ animationDelay: `${i * 0.15}s` }}>
            <MonsterSprite kind={m.kind} color={DAN_COLORS[m.dan]} golden={m.golden} mood={m.status === 'sleeping' ? 'sleep' : 'happy'} size={88} />
          </div>
        ))}
      </div>

      {finish.newlyMastered.map((dan) => (
        <div key={dan} className="banner banner--master">
          🏅 {dan}단 마스터!{finish.grantedHats.includes(`hat_master_${dan}`) && ' 마스터 모자를 받았어요 🎓'}
        </div>
      ))}
      {finish.challengeJustUnlocked && <div className="banner banner--challenge">✨ 도전의 문이 열렸어! 12단·13단에 도전해 보자!</div>}
      {finish.evolvedTo && finish.evolvedTo !== 'egg' && (
        <div className="banner banner--evolve">
          ✨ {josa(pet.name, '이가', '가')} {josa(STAGE_LABELS[finish.evolvedTo], '으로', '로')} 자랐어요!
        </div>
      )}

      <ul className="result__lines">
        {lines.map((l) => (
          <li key={l.label}>
            <span>{l.label}</span>
            <strong>+{l.stars} ★</strong>
          </li>
        ))}
        <li className="result__total">
          <span>모은 별</span>
          <strong>+{total} ★</strong>
        </li>
      </ul>

      {pet.species && (
        <div className="result__pet">
          {isEgg ? (
            <EggSprite species={pet.species} cracks={2} size={110} className="egg-shake" />
          ) : (
            <PetSprite species={pet.species} stage={pet.stage as Exclude<typeof pet.stage, 'egg'>} expression="excited" size={110} className="pet-hop" hat={hatArtOf(findItem(catalog, pet.equippedHat ?? ''))} />
          )}
          <span className="result__say">
            {!isEgg && <span className="buddy__bubble">{petLine}</span>}
            <span className="result__xp">{isEgg ? '알이 따뜻해졌어요!' : `성장 점수 +${tally.xp}`}</span>
          </span>
        </div>
      )}

      <div className={`result__actions ${isEgg ? 'result__actions--single' : ''}`}>
        {!isEgg && (
          <button type="button" className="btn btn--ghost" onClick={onAgain}>
            한 번 더!
          </button>
        )}
        <button type="button" className="btn btn--primary" onClick={onPet}>
          {isEgg ? '알이 흔들려요! 🥚' : '펫에게 가기'}
        </button>
      </div>
    </div>
  );
}
