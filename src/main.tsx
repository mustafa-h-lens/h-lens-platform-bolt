import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/half-lens-ds.css';
import './index.css';
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
