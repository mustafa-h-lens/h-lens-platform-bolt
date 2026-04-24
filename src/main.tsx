import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/half-lens-ds.css';
import './index.css';
// Global responsive layer — loaded last so its overrides win the cascade.
import './styles/responsive.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { PullToRefresh } from './components/shared/PullToRefresh';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <PullToRefresh>
        <App />
      </PullToRefresh>
    </ThemeProvider>
  </StrictMode>
);
