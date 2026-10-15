import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// 공통 스타일을 먼저 불러와야 화면별 스타일이 그 위에 덮어쓸 수 있다.
import './styles.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
