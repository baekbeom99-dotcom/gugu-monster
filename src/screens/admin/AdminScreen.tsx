/** 관리자 모드 — 설계서 10장. 화면을 떠나거나 2분 동안 아무것도 안 하면 다시 잠긴다. */
import { useEffect, useState } from 'react';
import { IDLE_LOCK_MS } from '../../domain/admin';
import { DataPanel, SecurityPanel } from './DataSecurityPanels';
import { ItemsPanel } from './ItemsPanel';
import { LockScreen } from './LockScreen';
import { PetPanel } from './PetPanel';
import { LearningPanel, SoundPanel } from './SettingsPanels';
import { SharePanel } from './SharePanel';
import './admin.css';

type Menu = 'pet' | 'items' | 'share' | 'learning' | 'sound' | 'data' | 'security';

const MENUS: { key: Menu; icon: string; title: string; desc: string }[] = [
  { key: 'pet', icon: '🐾', title: '펫 관리', desc: '지금 펫·칭호 미리보기, 새 펫 시작하기' },
  { key: 'items', icon: '🛒', title: '상점 아이템 관리', desc: '가격·효과 바꾸기, 새 아이템, 판매 중지' },
  { key: 'share', icon: '🔗', title: '상점 설정 공유', desc: '다른 기기로 보내기·불러오기' },
  { key: 'learning', icon: '📚', title: '학습 설정', desc: '답 입력 방식, 12·13단 도전 모드' },
  { key: 'sound', icon: '🔊', title: '소리 설정', desc: '효과음 켜기·끄기, 음량' },
  { key: 'data', icon: '💾', title: '데이터 관리', desc: '백업·불러오기, 전체 초기화' },
  { key: 'security', icon: '🔐', title: '보안', desc: 'PIN 바꾸기, 복구 코드' },
];

export function AdminScreen() {
  const [unlocked, setUnlocked] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);

  // 2분 동안 손대지 않으면 잠금
  useEffect(() => {
    if (!unlocked) return;
    let timer = setTimeout(() => setUnlocked(false), IDLE_LOCK_MS);
    const poke = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setUnlocked(false), IDLE_LOCK_MS);
    };
    window.addEventListener('pointerdown', poke);
    window.addEventListener('keydown', poke);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', poke);
      window.removeEventListener('keydown', poke);
    };
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked) setMenu(null);
  }, [unlocked]);

  if (!unlocked) {
    return (
      <section className="admin">
        <LockScreen onUnlock={() => setUnlocked(true)} />
      </section>
    );
  }

  const current = MENUS.find((m) => m.key === menu);
  return (
    <section className="admin">
      <header className="admin__bar">
        {menu ? (
          <button type="button" className="icon-button" aria-label="관리 메뉴로" onClick={() => setMenu(null)}>
            ←
          </button>
        ) : (
          <span className="admin__badge">어른용</span>
        )}
        <h1 className="admin__title">{current ? current.title : '관리자 모드'}</h1>
        <button type="button" className="btn btn--ghost admin__lock" onClick={() => setUnlocked(false)}>
          🔒 잠그기
        </button>
      </header>

      {!menu && (
        <div className="admin-menu">
          {MENUS.map((m) => (
            <button key={m.key} type="button" className="neo-card admin-menu__item" onClick={() => setMenu(m.key)}>
              <span className="admin-menu__icon" aria-hidden>
                {m.icon}
              </span>
              <span>
                <strong>{m.title}</strong>
                <span>{m.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {menu === 'pet' && <PetPanel />}
      {menu === 'items' && <ItemsPanel />}
      {menu === 'share' && <SharePanel />}
      {menu === 'learning' && <LearningPanel />}
      {menu === 'sound' && <SoundPanel />}
      {menu === 'data' && <DataPanel />}
      {menu === 'security' && <SecurityPanel />}
    </section>
  );
}
