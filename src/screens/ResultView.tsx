import { DAN_COLORS } from '../art/colors';
import { MonsterSprite } from '../art/MonsterSprite';
import { Confetti } from '../components/Confetti';
import { hatArtOf } from '../art/HatSprite';
import { EggSprite, PetSprite } from '../art/PetSprite';
import { findItem } from '../domain/shop';
import type { MonsterSlot } from '../domain/battle';
import type { Dan } from '../domain/facts';
import { DAN_TRIAL_MASTER_MS, type TrialOutcome } from '../domain/progress';
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
  /** 단 도전 결과 (단 골라 탐험일 때만) */
  trial?: (TrialOutcome & { dan: Dan }) | null;
  /** 풀이 시간 (모든 탐험) */
  solveMs?: number | null;
  /** 푼 문제 수 (다시 푼 문제 포함) */
  attempts?: number;
  /** 추천 탐험: 정답 별을 빠르기로 줬다 */
  speedBonus?: boolean;
  onAgain: () => void;
  onPet: () => void;
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}초`;

export function ResultView({ monsters, tally, finish, trial, solveMs, attempts, speedBonus, onAgain, onPet }: Props) {
  const pet = useGameStore((s) => s.pet);
  const catalog = useGameStore((s) => s.catalog);
  const isEgg = pet.stage === 'egg';
  const lines = [
    // 정답이 없을 때 '0개'를 굳이 보여주지 않는다.
    ...(tally.correct > 0 ? [{ label: speedBonus ? `정답 ${tally.correct}개 (빠를수록 별 더!)` : `정답 ${tally.correct}개`, stars: tally.correctStars }] : []),
    { label: `몬스터 친구 ${monsters.length}마리`, stars: tally.captureStars },
    ...(tally.overcome > 0 ? [{ label: `어려웠던 문제 극복 ${tally.overcome}개`, stars: tally.overcomeStars }] : []),
    ...finish.bonuses,
    ...(trial && trial.bonus > 0 ? [{ label: `${trial.dan}단 MASTER 보너스`, stars: trial.bonus }] : []),
  ];
  const total = lines.reduce((sum, l) => sum + l.stars, 0);
  const bigMoment = finish.newlyMastered.length > 0 || finish.challengeJustUnlocked || !!finish.evolvedTo || !!trial?.justMastered;
  const petLine = trial?.justMastered
    ? `${trial.dan}단 11문제를 33초 안에! MASTER야!`
    : trial && trial.newBest && trial.record.plays > 1
      ? '최고 기록이야! 점점 빨라지고 있어!'
      : finish.challengeJustUnlocked
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
      <h1 className="result__title">{trial ? `${trial.dan}단 도전 완료!` : '탐험 성공!'}</h1>
      {trial && (
        <div className={`neo-card trial-result ${trial.record.master ? 'trial-result--master' : ''}`}>
          <span className="trial-result__label">11문제 모두 맞힌 시간</span>
          <strong className="trial-result__time">⏱ {seconds(trial.timeMs)}</strong>
          <span className="trial-result__sub">
            {trial.newBest ? '최고 기록!' : `최고 기록 ${seconds(trial.record.bestMs ?? trial.timeMs)}`}
            {' · '}
            {trial.mistakes > 0
              ? `틀린 문제 ${trial.mistakes}개 — MASTER는 하나도 안 틀려야 해요`
              : trial.timeMs <= DAN_TRIAL_MASTER_MS
                ? 'MASTER 기준 통과 (오답 0개 · 33초 안)'
                : `오답 0개! MASTER까지 ${seconds(trial.timeMs - DAN_TRIAL_MASTER_MS)} 더 빠르게!`}
          </span>
        </div>
      )}
      {!trial && solveMs != null && (
        <div className="neo-card trial-result">
          <span className="trial-result__label">풀이에 걸린 시간</span>
          <strong className="trial-result__time">⏱ {seconds(solveMs)}</strong>
          {attempts ? (
            <span className="trial-result__sub">
              {attempts}문제 · 한 문제에 평균 {seconds(solveMs / attempts)}
            </span>
          ) : null}
        </div>
      )}
      {trial?.justMastered && <div className="banner banner--master">🏆 {trial.dan}단 MASTER 달성!</div>}
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
      {(finish.troubles ?? []).length > 0 && (
        <div className="banner banner--trouble">
          {finish.troubles.includes('sick') && `🤒 ${josa(pet.name, '이가', '가')} 탐험하다 아파졌어요. 주사를 맞혀 주세요! `}
          {finish.troubles.includes('poop') && `💩 ${josa(pet.name, '이가', '가')} 똥을 쌌어요. 치워 주세요!`}
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
            <span className="result__xp">{isEgg ? '알이 따뜻해졌어요!' : `성장 점수 +${tally.xp}${finish.affection > 0 ? ` · ♥ 친밀도 +${finish.affection}` : ''}`}</span>
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
