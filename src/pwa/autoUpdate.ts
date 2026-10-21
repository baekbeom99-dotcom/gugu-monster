/**
 * 새 버전 자동 적용 (v1.31).
 * - 탭으로 돌아올 때, 그리고 켜 둔 동안 30분마다 새 버전이 있는지 확인한다.
 * - 새 서비스 워커가 화면을 넘겨받으면(새 버전 준비 끝), 문제를 풀고 있지 않을 때 조용히 새로고침한다.
 *   전투·셈 연습·무한의 계단·부화·처음 시작·관리자 화면이나 글자를 입력하는 중이면, 그 화면을 벗어날 때까지 기다린다.
 * 서비스 워커는 skipWaiting + clientsClaim(registerType 'autoUpdate')이라 받자마자 넘겨받는다.
 */

/** 새 버전을 확인하는 간격 */
export const UPDATE_CHECK_MS = 30 * 60 * 1000;

/** 이 화면에 있는 동안은 새로고침하지 않는다 (푸는 흐름·입력이 끊기지 않게) */
const BUSY_ROUTES = ['/battle', '/practice', '/stairs', '/hatch', '/welcome', '/admin'];

/** 해시 주소(#/stairs?x=1 등)가 문제를 푸는 중인 화면인지 */
export function isBusyRoute(hash: string): boolean {
  const path = hash.replace(/^#/, '').split('?')[0] || '/';
  return BUSY_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));
}

function isTyping(): boolean {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
}

export function startAutoUpdate(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const base = import.meta.env.BASE_URL;
  let ready = false;

  const tryReload = () => {
    if (!ready || isBusyRoute(location.hash) || isTyping()) return;
    ready = false;
    location.reload();
  };

  window.addEventListener('load', () => {
    // 처음 설치될 때는 넘겨받아도 새로고침할 필요가 없다
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      ready = true;
      tryReload();
    });

    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .then((reg) => {
        const check = () => {
          if (navigator.onLine) reg.update().catch(() => undefined);
        };
        setInterval(check, UPDATE_CHECK_MS);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
      })
      .catch(() => undefined);
  });

  // 새 버전이 기다리는 중이면 화면을 옮기거나 탭을 오갈 때 다시 시도
  window.addEventListener('hashchange', tryReload);
  document.addEventListener('visibilitychange', tryReload);
  document.addEventListener('focusout', () => setTimeout(tryReload, 0));
}
