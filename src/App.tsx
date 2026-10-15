import { useEffect } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { TopBar } from './components/TopBar';
import { BattleScreen } from './screens/BattleScreen';
import { DevGallery } from './screens/DevGallery';
import { ExploreScreen } from './screens/ExploreScreen';
import { HatchScreen } from './screens/HatchScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { PetScreen } from './screens/PetScreen';
import { RecordsScreen } from './screens/RecordsScreen';
import { AdminScreen } from './screens/admin/AdminScreen';
import { ShopScreen } from './screens/ShopScreen';
import { useGameStore } from './store/useGameStore';
import { useSessionStore } from './store/useSessionStore';

/** 알을 고르기 전이면 온보딩으로, 첫 탐험을 마친 알은 부화 화면으로 보낸다. */
function OnboardingGuard() {
  const species = useGameStore((s) => s.pet.species);
  const stage = useGameStore((s) => s.pet.stage);
  const explorations = useGameStore((s) => s.learning.totalExplorations);
  if (!species) return <Navigate to="/welcome" replace />;
  if (stage === 'egg' && explorations > 0) return <Navigate to="/hatch" replace />;
  return <Outlet />;
}

function TabLayout() {
  return (
    <div className="app">
      <TopBar />
      <main className="screen">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}

const fullScreen = (el: JSX.Element) => <div className="app app--full">{el}</div>;

export function App() {
  useEffect(() => {
    const { welcomeBack } = useGameStore.getState().openApp(Date.now());
    if (welcomeBack) useSessionStore.getState().set({ welcomeBack: true });
  }, []);

  return (
    // 정적 호스팅(서버 설정 없음)에서도 새로고침이 되도록 해시 라우터를 쓴다.
    <HashRouter>
      <Routes>
        <Route element={<OnboardingGuard />}>
          <Route element={<TabLayout />}>
            <Route path="/" element={<Navigate to="/pet" replace />} />
            <Route path="/pet" element={<PetScreen />} />
            <Route path="/explore" element={<ExploreScreen />} />
            <Route path="/shop" element={<ShopScreen />} />
            <Route path="/records" element={<RecordsScreen />} />
            <Route path="/admin" element={<AdminScreen />} />
          </Route>
        </Route>
        <Route path="/welcome" element={fullScreen(<OnboardingScreen />)} />
        <Route path="/hatch" element={fullScreen(<HatchScreen />)} />
        {/* 전투는 탭 없이 화면 전체를 쓴다 */}
        <Route path="/battle" element={fullScreen(<BattleScreen />)} />
        {import.meta.env.DEV && <Route path="/dev/gallery" element={<DevGallery />} />}
        <Route path="*" element={<Navigate to="/pet" replace />} />
      </Routes>
    </HashRouter>
  );
}
