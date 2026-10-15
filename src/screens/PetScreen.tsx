/** 나의 펫 — 설계서 6장, 9-2 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hatArtOf } from '../art/HatSprite';
import { EggSprite, type PetExpression, PetSprite } from '../art/PetSprite';
import { Confetti } from '../components/Confetti';
import { ItemArt } from '../components/ItemArt';
import { bagItems, findItem, type ItemCategory, type ItemDef, ownedCount } from '../domain/shop';
import { playSfx } from '../audio/sfx';
import { josa } from '../domain/korean';
import {
  AFFECTION_UNLOCKS,
  CARE,
  affectionLevel,
  affectionProgress,
  applyDecay,
  type CareAction,
  cooldownLeft,
  cooldownMinutesLabel,
  growthProgress,
  isSleeping,
  neediest,
  type Species,
  type Stage,
  STAGE_LABELS,
  type StatKey,
} from '../domain/pet';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import './pet.css';
import './shop.css';

type DrawerKey = 'feed' | 'pet' | 'wash' | 'decorate';
type TapReaction = 'hop' | 'highfive' | 'dance';
const HIGHFIVE_LEVEL = 3;
const DANCE_LEVEL = 5;
/** 돌봄 버튼 → 서랍에 보여줄 아이템 종류 */
const DRAWER_CATEGORY: Record<DrawerKey, ItemCategory> = { feed: 'food', pet: 'toy', wash: 'hygiene', decorate: 'hat' };
const DRAWER_TITLE: Record<DrawerKey, string> = { feed: '밥 주기', pet: '놀아 주기', wash: '씻기기', decorate: '꾸미기' };
const FREE_ICON: Record<CareAction, string> = { feed: '🍚', pet: '🤚', wash: '💧', sleep: '🌙' };
/** 아이템 종류 → 펫 동작 */
const CATEGORY_ACTION: Record<Exclude<ItemCategory, 'hat'>, CareAction> = { food: 'feed', toy: 'pet', hygiene: 'wash' };
const ITEM_DONE_LINES: Record<Exclude<ItemCategory, 'hat'>, string> = {
  food: '냠냠! 맛있다!',
  toy: '와, 신난다! 또 놀자!',
  hygiene: '뽀득뽀득! 향기 좋다!',
};
const ITEM_FAIL_LINES: Record<string, string> = {
  full: '지금은 괜찮아! 나중에 줘.',
  sleeping: '쉿, 자고 있어요. 펫을 누르면 깨울 수 있어요.',
  cooldown: '방금 그걸로 놀았어! 조금 있다가 또 하자.',
};

const ACTIONS: { key: CareAction | 'decorate'; icon: string; label: string }[] = [
  { key: 'feed', icon: '🍚', label: '밥' },
  { key: 'pet', icon: '🤚', label: '놀기' },
  { key: 'wash', icon: '🫧', label: '씻기' },
  { key: 'sleep', icon: '🌙', label: '잠' },
  { key: 'decorate', icon: '🎀', label: '꾸미기' },
];

const STATS: { key: StatKey; icon: string; label: string }[] = [
  { key: 'fullness', icon: '🍚', label: '배부름' },
  { key: 'mood', icon: '💗', label: '기분' },
  { key: 'cleanliness', icon: '🫧', label: '깨끗함' },
];

const NEED_LINES: Record<StatKey, string> = {
  fullness: '보고 싶었어! 밥 먹고 싶어.',
  cleanliness: '몸이 근질근질해. 씻겨 줄래?',
  mood: '심심해! 같이 놀자!',
};
const DONE_LINES: Record<CareAction, string> = {
  feed: '냠냠! 맛있다!',
  pet: '헤헤, 간지러워!',
  wash: '뽀득뽀득! 깨끗해졌어!',
  sleep: '하암… 잘 자…',
};
const COOLDOWN_LINES: Record<CareAction, string> = {
  feed: '배불러! 조금 있다가 또 줘.',
  pet: '헤헤, 조금 있다가 또 놀자!',
  wash: '방금 씻었어! 반짝반짝하지?',
  sleep: '아직 졸리지 않아!',
};
const ACTION_EXPRESSION: Record<CareAction, PetExpression> = { feed: 'eat', pet: 'happy', wash: 'happy', sleep: 'sleep' };

/** 30초마다 현재 시각을 갱신 (대기 시간·상태 감소 표시) */
function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function PetScreen() {
  const navigate = useNavigate();
  const storedPet = useGameStore((s) => s.pet);
  const learning = useGameStore((s) => s.learning);
  const care = useGameStore((s) => s.care);
  const wakePet = useGameStore((s) => s.wakePet);
  const catalog = useGameStore((s) => s.catalog);
  const economy = useGameStore((s) => s.economy);
  const { giveItem, wearHat } = useGameStore.getState();
  const [drawer, setDrawer] = useState<DrawerKey | null>(null);
  const session = useSessionStore();
  const now = useNow();
  const pet = useMemo(() => applyDecay(storedPet, now), [storedPet, now]);

  const [action, setAction] = useState<{ key: CareAction; at: number; special?: boolean; reaction?: TapReaction } | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [evolution, setEvolution] = useState<Stage | null>(session.pendingEvolution);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (session.pendingEvolution) session.set({ pendingEvolution: null });
    if (session.pendingLevelUp) {
      showLevelUp(session.pendingLevelUp);
      session.set({ pendingLevelUp: null });
    }
    // 화면을 처음 열 때 한 번만
  }, []);

  const showLevelUp = (lv: number) => {
    const unlock = AFFECTION_UNLOCKS.find((u) => u.level === lv);
    playSfx('star');
    setToast(`친밀도 Lv${lv}!${unlock ? ` ${unlock.label}를 배웠어요` : ''}`);
    setTimeout(() => setToast(null), 2600);
  };

  if (!pet.species) return null;
  const sleeping = isSleeping(pet, now);

  if (pet.stage === 'egg') {
    return (
      <section className="pet-home">
        <div className="neo-card room">
          <EggSprite species={pet.species} size={190} className="egg-wobble" />
        </div>
        <div className="neo-card speech">첫 탐험을 다녀오면 알이 깨어나요!</div>
        <button type="button" className="explore-cta" onClick={() => navigate('/battle?mode=diagnostic')}>
          👾 첫 탐험 떠나기
        </button>
      </section>
    );
  }

  const stage = pet.stage;
  const lv = affectionLevel(pet.affection);
  const acting = action && now - action.at < 1600 ? action.key : null;
  const need = neediest(pet);
  const expression: PetExpression = sleeping
    ? 'sleep'
    : acting
      ? action?.special || action?.reaction === 'dance' || action?.reaction === 'highfive'
        ? 'excited'
        : ACTION_EXPRESSION[acting]
      : session.welcomeBack
        ? 'excited'
        : need
          ? 'request'
          : 'idle';
  const speech =
    line ??
    (session.welcomeBack
      ? `보고 싶었어! 다시 와 줘서 고마워!`
      : sleeping
        ? '쿨쿨… (펫을 누르면 깨울 수 있어요)'
        : session.feedTutorial
          ? "배고파! '밥' 버튼을 눌러 줄래?"
          : need
            ? NEED_LINES[need]
            : `${josa(pet.name, '이랑', '랑')} 오늘도 즐겁게!`);

  const doAction = (key: CareAction) => {
    if (session.welcomeBack) session.set({ welcomeBack: false });
    setDrawer(null);
    const t = Date.now();
    const r = care(key, t);
    if (!r.ok) {
      playSfx('gentle');
      setLine(r.reason === 'sleeping' ? '쉿, 자고 있어요. 펫을 누르면 깨울 수 있어요.' : COOLDOWN_LINES[key]);
      return;
    }
    playSfx(key === 'sleep' ? 'lullaby' : 'correct');
    setAction({ key, at: t });
    setLine(DONE_LINES[key]);
    if (key === 'feed' && session.feedTutorial) session.set({ feedTutorial: false });
    if (r.levelUp) showLevelUp(r.levelUp);
    if (r.evolvedTo) setEvolution(r.evolvedTo);
    setTimeout(() => setAction((a) => (a?.at === t ? null : a)), 1600);
  };

  const giveFromBag = (item: ItemDef) => {
    setDrawer(null);
    if (item.category === 'hat') {
      const wearing = pet.equippedHat === item.id;
      wearHat(wearing ? null : item.id);
      playSfx(wearing ? 'tap' : 'capture');
      setAction({ key: 'pet', at: Date.now(), special: !wearing });
      setLine(wearing ? '모자를 벗었어!' : `${item.name}! 잘 어울려?`);
      return;
    }
    const key = CATEGORY_ACTION[item.category];
    const t = Date.now();
    const r = giveItem(item.id, t);
    if (!r.ok) {
      playSfx('gentle');
      setLine(ITEM_FAIL_LINES[r.reason] ?? '나중에 줄게!');
      return;
    }
    playSfx('correct');
    setAction({ key, at: t, special: item.special });
    setLine(item.special ? `우와, ${item.name}! 최고야!` : ITEM_DONE_LINES[item.category]);
    if (key === 'feed' && session.feedTutorial) session.set({ feedTutorial: false });
    if (r.levelUp) showLevelUp(r.levelUp);
    if (r.evolvedTo) setEvolution(r.evolvedTo);
    setTimeout(() => setAction((a) => (a?.at === t ? null : a)), 1600);
  };

  const openDrawer = (key: DrawerKey) => {
    if (session.welcomeBack) session.set({ welcomeBack: false });
    playSfx('tap');
    setDrawer(key);
  };

  const tapPet = () => {
    if (session.welcomeBack) session.set({ welcomeBack: false });
    if (sleeping) {
      wakePet();
      playSfx('tap');
      setLine('하암~ 잘 잤다!');
      return;
    }
    // 친밀도가 오르면 새 반응이 열린다: Lv3 하이파이브, Lv5 춤추기 (설계서 6-4)
    const reactions: TapReaction[] = ['hop'];
    if (lv >= HIGHFIVE_LEVEL) reactions.push('highfive');
    if (lv >= DANCE_LEVEL) reactions.push('dance');
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];
    playSfx(reaction === 'hop' ? 'tap' : 'combo');
    setAction({ key: 'pet', at: Date.now(), reaction });
    setLine(
      reaction === 'highfive'
        ? '하이파이브! 짝!'
        : reaction === 'dance'
          ? '룰루~ 같이 춤추자!'
          : ['헤헤!', '나 불렀어?', '오늘 구구단 할까?', '좋아좋아!'][Math.floor(Math.random() * 4)],
    );
  };

  const growth = growthProgress(pet, learning.studyDays.length, learning.totalExplorations);

  return (
    <section className="pet-home">
      <header className="pet-head">
        <h1 className="pet-name">{pet.name}</h1>
        <span className="pet-chip">{STAGE_LABELS[stage]}</span>
        <span className="pet-chip pet-chip--love" aria-label={`친밀도 레벨 ${lv}`}>
          ♥ Lv{lv}
          <span className="mini-bar" aria-hidden>
            <span style={{ width: `${Math.round(affectionProgress(pet.affection) * 100)}%` }} />
          </span>
        </span>
      </header>

      <div className={`neo-card room ${sleeping ? 'room--night' : ''}`}>
        <div className="neo-card speech speech--room" key={speech}>
          {speech}
        </div>
        <button
          type="button"
          className={`pet-button ${session.welcomeBack ? 'pet-run-in' : acting ? `pet-act pet-act--${action?.reaction === 'dance' ? 'dance' : acting}` : 'pet-breathe'}`}
          onClick={tapPet}
          aria-label={sleeping ? `${pet.name} 깨우기` : `${pet.name} 쓰다듬기`}
        >
          <PetSprite species={pet.species} stage={stage} expression={expression} size={210} hat={hatArtOf(findItem(catalog, pet.equippedHat ?? ''))} />
          {acting === 'wash' && <span className="bubbles" aria-hidden />}
          {acting === 'feed' && <span className="food" aria-hidden>🍚</span>}
          {acting && action?.reaction === 'highfive' && <span className="highfive" aria-hidden>✋</span>}
        </button>
        <div className="rug" aria-hidden />
      </div>

      <div className="neo-card gauges">
        {STATS.map((s) => (
          <div key={s.key} className="gauge">
            <span className="gauge__label">
              <span aria-hidden>{s.icon}</span> {s.label}
            </span>
            <span className={`gauge__bar gauge__bar--${s.key}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pet[s.key])} aria-label={s.label}>
              <span style={{ width: `${Math.round(pet[s.key])}%` }} />
            </span>
          </div>
        ))}
      </div>

      <div className="care-grid">
        {ACTIONS.map((a) => {
          const left = a.key === 'decorate' ? 0 : cooldownLeft(pet, a.key, now);
          const tutorial = a.key === 'feed' && session.feedTutorial;
          const hasItems = a.key !== 'sleep' && bagItems(economy, catalog, DRAWER_CATEGORY[a.key]).length > 0;
          const waiting = a.key !== 'decorate' && (sleeping || (left > 0 && !hasItems));
          return (
            <button
              key={a.key}
              type="button"
              className={`care ${waiting ? 'care--waiting' : ''} ${tutorial ? 'care--tutorial' : ''}`}
              onClick={() => (a.key === 'sleep' ? doAction('sleep') : openDrawer(a.key))}
            >
              <span className="care__icon" aria-hidden>
                {a.icon}
              </span>
              <span className="care__label">{a.label}</span>
              {left > 0 && <span className="care__wait">{cooldownMinutesLabel(left)}</span>}
            </button>
          );
        })}
      </div>

      <button type="button" className="explore-cta" onClick={() => navigate('/explore')}>
        👾 탐험 가기!
      </button>

      <div className="neo-card growth">
        {growth.next ? (
          <>
            <div className="growth__title">다음 성장: {STAGE_LABELS[growth.next]}</div>
            <GrowthRow label="성장 점수" have={growth.xp.have} need={growth.xp.need} />
            <GrowthRow label="공부한 날" have={growth.studyDays.have} need={growth.studyDays.need} unit="일" />
            {growth.explorations.need > 0 && (
              <GrowthRow label="탐험" have={growth.explorations.have} need={growth.explorations.need} unit="번" />
            )}
          </>
        ) : (
          <div className="growth__title">다 자랐어요! 특별한 모습은 곧 공개될 거예요 ✨</div>
        )}
      </div>

      {drawer && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label={DRAWER_TITLE[drawer]} onClick={(e) => e.target === e.currentTarget && setDrawer(null)}>
          <div className="drawer__sheet">
            <div className="drawer__head">
              <h2 className="drawer__title">{DRAWER_TITLE[drawer]}</h2>
              <button type="button" className="icon-button" aria-label="닫기" onClick={() => setDrawer(null)}>
                ✕
              </button>
            </div>
            <div className="drawer__list">
              {drawer !== 'decorate' && (
                <button
                  type="button"
                  className={`bag-item bag-item--free ${cooldownLeft(pet, drawer, now) > 0 ? 'bag-item--waiting' : ''} ${drawer === 'feed' && session.feedTutorial ? 'bag-item--tutorial' : ''}`}
                  onClick={() => doAction(drawer)}
                >
                  <span className="item-art" style={{ width: 52, height: 52, background: 'var(--yellow)', fontSize: 30 }} aria-hidden>
                    {FREE_ICON[drawer]}
                  </span>
                  {CARE[drawer].label}
                  <span className="bag-item__tag">{cooldownLeft(pet, drawer, now) > 0 ? cooldownMinutesLabel(cooldownLeft(pet, drawer, now)) : '무료'}</span>
                </button>
              )}
              {drawer === 'decorate' && pet.equippedHat && (
                <button type="button" className="bag-item" onClick={() => giveFromBag(findItem(catalog, pet.equippedHat!)!)}>
                  <span className="item-art" style={{ width: 52, height: 52, background: 'var(--paper)', fontSize: 28 }} aria-hidden>
                    🙅
                  </span>
                  모자 벗기
                </button>
              )}
              {bagItems(economy, catalog, DRAWER_CATEGORY[drawer]).map((item) => {
                const wait = item.category === 'toy' ? cooldownLeft(pet, item.id, now) : 0;
                const worn = pet.equippedHat === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`bag-item ${worn ? 'bag-item--worn' : ''} ${wait > 0 ? 'bag-item--waiting' : ''}`}
                    onClick={() => giveFromBag(item)}
                  >
                    <ItemArt item={item} size={52} />
                    {item.name}
                    {item.consumable && <span className="bag-item__tag">{ownedCount(economy, item)}개</span>}
                    {wait > 0 && <span className="bag-item__tag">{cooldownMinutesLabel(wait)}</span>}
                    {worn && <span className="bag-item__tag">쓰는 중</span>}
                  </button>
                );
              })}
            </div>
            {bagItems(economy, catalog, DRAWER_CATEGORY[drawer]).length === 0 && (
              <div className="drawer__empty">
                {drawer === 'decorate' ? '아직 모자가 없어요.' : '가방이 비었어요.'} 별 상점에서 살 수 있어요!
                <button type="button" className="btn btn--primary" onClick={() => navigate('/shop')}>
                  별 상점 가기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
      {evolution && (
        <EvolutionOverlay species={pet.species} stage={evolution as Exclude<Stage, 'egg'>} name={pet.name} onClose={() => setEvolution(null)} />
      )}
    </section>
  );
}

function GrowthRow({ label, have, need, unit = '' }: { label: string; have: number; need: number; unit?: string }) {
  const done = have >= need;
  return (
    <div className={`growth__row ${done ? 'growth__row--done' : ''}`}>
      <span>{done ? '✅' : '⬜'} {label}</span>
      <span className="mini-bar mini-bar--wide" aria-hidden>
        <span style={{ width: `${Math.min(100, Math.round((have / need) * 100))}%` }} />
      </span>
      <span className="growth__num">
        {Math.min(have, need)}/{need}
        {unit}
      </span>
    </div>
  );
}

function EvolutionOverlay({
  species,
  stage,
  name,
  onClose,
}: {
  species: Species;
  stage: Exclude<Stage, 'egg'>;
  name: string;
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setRevealed(true);
      playSfx('fanfare');
    }, 1400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="진화">
      {revealed && <Confetti />}
      <div className="modal__card evolution">
        <div className={revealed ? 'pop-in' : 'evolution__silhouette'}>
          <PetSprite species={species} stage={stage} expression={revealed ? 'excited' : 'idle'} size={200} />
        </div>
        {revealed ? (
          <>
            <p className="modal__title">
              {josa(name, '이가', '가')} {josa(STAGE_LABELS[stage], '으로', '로')} 자랐어요!
            </p>
            <p className="modal__body">기념 카드를 학습 기록에 넣어 두었어요.</p>
            <button type="button" className="btn btn--primary" onClick={onClose}>
              멋져!
            </button>
          </>
        ) : (
          <p className="modal__title">어? {josa(name, '이가', '가')} 빛나고 있어요…</p>
        )}
      </div>
    </div>
  );
}
