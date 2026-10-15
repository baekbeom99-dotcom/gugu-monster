import { playSfx } from '../audio/sfx';
import { useGameStore } from '../store/useGameStore';

export function TopBar() {
  const stars = useGameStore((s) => s.economy.stars);
  const sound = useGameStore((s) => s.settings.sound);
  const updateSettings = useGameStore((s) => s.updateSettings);

  const toggleSound = () => {
    updateSettings({ sound: !sound });
    // 켤 때는 바로 소리로 확인시켜 준다.
    if (!sound) setTimeout(() => playSfx('tap'), 0);
  };

  return (
    <header className="topbar">
      <div className="stars" aria-label={`보유 별 ${stars}개`}>
        <span aria-hidden>★</span>
        <strong>{stars}</strong>
      </div>
      <button
        type="button"
        className="icon-button"
        onClick={toggleSound}
        aria-label={sound ? '효과음 끄기' : '효과음 켜기'}
        aria-pressed={sound}
      >
        {sound ? '🔊' : '🔇'}
      </button>
    </header>
  );
}
