/** 학습 기록 — 설계서 9-2 */
import { useMemo, useState } from 'react';
import { ALL_DANS, type Dan, type FactId, factId, getFact, MULTIPLIERS } from '../domain/facts';
import {
  danProgress,
  LEVEL_LABELS,
  type MasteryLevel,
  masteryLevel,
  summarize,
} from '../domain/records';
import { PetSprite } from '../art/PetSprite';
import { ARITH_INFO, ARITH_KINDS } from '../domain/arith';
import { josa } from '../domain/korean';
import { STAGE_LABELS } from '../domain/pet';
import { useGameStore } from '../store/useGameStore';
import './records.css';

/** 색만으로 구분하지 않도록 단계마다 기호를 함께 쓴다. */
const LEVEL_ICONS: Record<MasteryLevel, string> = {
  new: '',
  practice: '!',
  learning: '·',
  growing: '•',
  familiar: '✓',
  perfect: '★',
};
const LEGEND: MasteryLevel[] = ['new', 'practice', 'learning', 'growing', 'familiar', 'perfect'];

const factLabel = (id: FactId) => {
  const f = getFact(id);
  return `${f.a} × ${f.b}`;
};

export function RecordsScreen() {
  const learning = useGameStore((s) => s.learning);
  const pet = useGameStore((s) => s.pet);
  const practice = useGameStore((s) => s.practice);
  const summary = useMemo(() => summarize(learning, Date.now()), [learning]);
  const progress = useMemo(() => danProgress(learning), [learning]);
  const [selected, setSelected] = useState<FactId | null>(null);
  const locked = (dan: Dan) => dan >= 12 && !learning.challengeUnlocked;

  const selectedFact = selected ? getFact(selected) : null;
  const selectedStat = selected ? learning.facts[selected] : null;

  return (
    <section className="records">
      <div className="records__head">
        <h1 className="records__title">학습 기록</h1>
        <a className="btn btn--ghost records__dex" href="#/dex">
          📖 펫 도감
        </a>
      </div>

      <div className="tiles">
        <Tile tone="yellow" label="오늘 푼 문제" value={summary.todayAttempts} unit="개" sub={`맞힌 문제 ${summary.todayCorrect}개`} />
        <Tile tone="pink" label="탐험" value={summary.explorations} unit="번" />
        <Tile tone="sky" label="공부한 날" value={summary.studyDays} unit="일" />
        <Tile tone="lime" label="극복한 문제" value={summary.overcomeTotal} unit="개" />
      </div>

      <div className="neo-card panel">
        <h2 className="panel__title">구구단 지도</h2>
        <p className="panel__hint">칸을 누르면 자세히 볼 수 있어요</p>

        <div className="map" role="grid" aria-label="구구단 지도">
          <div className="map__corner" aria-hidden>×</div>
          {MULTIPLIERS.map((b) => (
            <div key={b} className="map__head" role="columnheader">
              {b}
            </div>
          ))}
          {ALL_DANS.map((dan) => (
            <MapRow
              key={dan}
              dan={dan}
              locked={locked(dan)}
              levelOf={(id) => masteryLevel(learning.facts[id])}
              selected={selected}
              onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
            />
          ))}
        </div>

        {selectedFact && selectedStat ? (
          <div className="map-detail" aria-live="polite">
            <span className={`map-detail__chip level--${masteryLevel(selectedStat)}`}>
              {LEVEL_ICONS[masteryLevel(selectedStat)]}
            </span>
            <div>
              <div className="map-detail__eq">
                {selectedFact.a} × {selectedFact.b} = {selectedFact.product}
              </div>
              <div className="map-detail__sub">
                {selectedStat.attempts === 0
                  ? '아직 안 풀었어요'
                  : `${LEVEL_LABELS[masteryLevel(selectedStat)]} · ${selectedStat.attempts}번 풀어서 ${selectedStat.correct}번 맞혔어요`}
              </div>
            </div>
          </div>
        ) : null}

        <ul className="legend" aria-label="칸 색 설명">
          {LEGEND.map((lv) => (
            <li key={lv}>
              <span className={`legend__swatch level--${lv}`}>{LEVEL_ICONS[lv]}</span>
              {LEVEL_LABELS[lv]}
            </li>
          ))}
        </ul>
      </div>

      <div className="neo-card panel">
        <h2 className="panel__title">단별 진행</h2>
        <p className="panel__hint">11칸이 모두 초록이 되면 마스터!</p>
        <ul className="dan-progress">
          {progress.map((p) => (
            <li key={p.dan} className={p.locked ? 'dan-progress--locked' : ''}>
              <span className="dan-progress__label">{p.locked ? '🔒' : `${p.dan}단`}</span>
              <span className="meter" role="meter" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.familiar} aria-label={`${p.dan}단 익숙한 문제 ${p.familiar}개`}>
                {Array.from({ length: p.total }, (_, i) => (
                  <span key={i} className={`meter__seg ${i < p.familiar ? 'meter__seg--on' : ''}`} />
                ))}
              </span>
              <span className="dan-progress__count">
                {p.locked ? '잠김' : p.mastered ? <span className="badge">🏅 마스터</span> : `${p.familiar}/${p.total}`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="neo-card panel">
        <h2 className="panel__title">문제 종류별 정답률</h2>
        <ul className="type-rates">
          {summary.typeAccuracy.map((t) => (
            <li key={t.type}>
              <span className="type-rates__label">{t.label}</span>
              {t.rate === null ? (
                <span className="type-rates__empty">아직 없어요</span>
              ) : (
                <>
                  <span className="bar" aria-hidden>
                    <span className="bar__fill" style={{ width: `${Math.round(t.rate * 100)}%` }} />
                  </span>
                  <span className="type-rates__value">
                    {Math.round(t.rate * 100)}%<small> ({t.correct}/{t.attempts})</small>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="neo-card panel">
        <h2 className="panel__title">셈 연습</h2>
        <p className="panel__hint">덧셈·뺄셈·보수 기록은 구구단 지도와 따로 모여요</p>
        <ul className="type-rates type-rates--practice">
          {ARITH_KINDS.map((kind) => {
            const rec = practice[kind];
            const rate = rec && rec.attempts > 0 ? rec.correct / rec.attempts : null;
            return (
              <li key={kind}>
                <span className="type-rates__label">
                  {ARITH_INFO[kind].title}
                  {rec?.bestMs != null && <small> ⏱ {(rec.bestMs / 1000).toFixed(1)}초</small>}
                </span>
                {rate === null ? (
                  <span className="type-rates__empty">아직 없어요</span>
                ) : (
                  <>
                    <span className="bar" aria-hidden>
                      <span className="bar__fill" style={{ width: `${Math.round(rate * 100)}%` }} />
                    </span>
                    <span className="type-rates__value">
                      {Math.round(rate * 100)}%<small> ({rec!.correct}/{rec!.attempts})</small>
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {pet.species && pet.evolutionCards.length > 0 && (
        <div className="neo-card panel">
          <h2 className="panel__title">{josa(pet.name, '이의', '의')} 성장 앨범</h2>
          <div className="album">
            {pet.evolutionCards.map((card, i) => (
              <figure key={`${card.stage}-${i}`} className="album__card">
                <PetSprite species={pet.species!} stage={card.stage as Exclude<typeof card.stage, 'egg'>} expression="happy" size={86} />
                <figcaption>
                  <strong>{STAGE_LABELS[card.stage]}</strong>
                  <span>{card.date.replace(/-/g, '.')}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      <div className="lists">
        <div className="neo-card panel panel--lime">
          <h2 className="panel__title">요즘 극복한 문제</h2>
          {summary.recentOvercome.length === 0 ? (
            <p className="panel__empty">어려웠던 문제를 다시 맞히면 여기에 모여요!</p>
          ) : (
            <div className="chips">
              {summary.recentOvercome.map((id) => (
                <span key={id} className="chip">
                  🎉 {factLabel(id)}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="neo-card panel panel--pink">
          <h2 className="panel__title">연습 중인 문제</h2>
          {summary.practicing.length === 0 ? (
            <p className="panel__empty">지금은 연습할 문제가 없어요. 멋져요!</p>
          ) : (
            <div className="chips">
              {summary.practicing.map((id) => (
                <span key={id} className="chip">
                  💪 {factLabel(id)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Tile({ tone, label, value, unit, sub }: { tone: string; label: string; value: number; unit: string; sub?: string }) {
  return (
    <div className={`neo-card tile tile--${tone}`}>
      <div className="tile__label">{label}</div>
      <div className="tile__value">
        {value}
        <small>{unit}</small>
      </div>
      {sub && <div className="tile__sub">{sub}</div>}
    </div>
  );
}

function MapRow({
  dan,
  locked,
  levelOf,
  selected,
  onSelect,
}: {
  dan: Dan;
  locked: boolean;
  levelOf: (id: FactId) => MasteryLevel;
  selected: FactId | null;
  onSelect: (id: FactId) => void;
}) {
  return (
    <>
      <div className={`map__row-head ${dan >= 12 ? 'map__row-head--challenge' : ''}`} role="rowheader">
        {locked ? '🔒' : dan}
      </div>
      {MULTIPLIERS.map((b) => {
        const id = factId(dan, b);
        if (locked) return <div key={id} className="map__cell map__cell--locked" aria-hidden />;
        const level = levelOf(id);
        return (
          <button
            key={id}
            type="button"
            role="gridcell"
            className={`map__cell level--${level} ${selected === id ? 'map__cell--selected' : ''}`}
            onClick={() => onSelect(id)}
            aria-label={`${dan} × ${b}: ${LEVEL_LABELS[level]}`}
          >
            {LEVEL_ICONS[level]}
          </button>
        );
      })}
    </>
  );
}
