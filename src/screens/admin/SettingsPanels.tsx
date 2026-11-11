/** 학습 설정·소리 설정 — 설계서 10-2 */
import { playSfx } from '../../audio/sfx';
import { useGameStore } from '../../store/useGameStore';
import { Toggle } from './fields';

export function LearningPanel() {
  const settings = useGameStore((s) => s.settings);
  const learning = useGameStore((s) => s.learning);
  const { updateSettings, setChallengeByAdmin } = useGameStore.getState();
  const byMastery = learning.challengeUnlockedBy === 'mastery';

  return (
    <div className="admin-panel">
      <section className="admin-card">
        <h2 className="admin-heading">답 입력 방식</h2>
        <div className="choice-list" role="radiogroup" aria-label="답 입력 방식">
          {(
            [
              ['auto', '자동', '익숙해진 문제는 숫자 키패드로 직접 써요 (권장)'],
              ['choice', '항상 고르기', '모든 문제를 4개 중에서 골라요'],
            ] as const
          ).map(([value, title, desc]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={settings.inputMode === value}
              className={`choice-row ${settings.inputMode === value ? 'choice-row--on' : ''}`}
              onClick={() => updateSettings({ inputMode: value })}
            >
              <strong>{title}</strong>
              <span>{desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <div className="field field--row">
          <span>
            <h2 className="admin-heading">12단·13단 도전 모드</h2>
            <span className="admin-help">
              {byMastery ? '2~9단을 모두 마스터해서 열렸어요.' : '보통은 2~9단을 모두 마스터하면 열려요. 여기서 미리 열 수 있어요.'}
            </span>
          </span>
          <Toggle label="도전 모드 열기" checked={learning.challengeUnlocked} disabled={byMastery} onChange={setChallengeByAdmin} />
        </div>
      </section>
    </div>
  );
}

export function SoundPanel() {
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  return (
    <div className="admin-panel">
      <section className="admin-card">
        <div className="field field--row">
          <h2 className="admin-heading">효과음</h2>
          <Toggle label="효과음" checked={settings.sound} onChange={(v) => updateSettings({ sound: v })} />
        </div>
        <label className="field">
          <span className="field__label">
            음량 <span className="field__hint">{Math.round(settings.volume * 100)}%</span>
          </span>
          <input
            className="range"
            type="range"
            min={0}
            max={100}
            step={10}
            value={Math.round(settings.volume * 100)}
            disabled={!settings.sound}
            onChange={(e) => updateSettings({ volume: Number(e.target.value) / 100 })}
          />
        </label>
        <button type="button" className="btn btn--ghost" disabled={!settings.sound} onClick={() => playSfx('capture')}>
          🔊 들어 보기
        </button>
      </section>
    </div>
  );
}
