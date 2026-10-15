import { NavLink } from 'react-router-dom';
import { playSfx } from '../audio/sfx';

const TABS = [
  { to: '/pet', icon: '🐾', label: '나의 펫' },
  { to: '/explore', icon: '⚔️', label: '탐험' },
  { to: '/shop', icon: '🛒', label: '별 상점' },
  { to: '/records', icon: '📊', label: '기록' },
  { to: '/admin', icon: '🔒', label: '관리', subtle: true },
] as const;

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="메뉴">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            ['tab', isActive ? 'tab--active' : '', 'subtle' in t ? 'tab--subtle' : ''].join(' ')
          }
          onClick={() => playSfx('tap')}
        >
          <span className="tab__icon" aria-hidden>
            {t.icon}
          </span>
          <span className="tab__label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
