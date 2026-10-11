import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { useAppStore } from './store/useAppStore';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

// Exposed so the e2e suite (and curious users in devtools) can inspect app state.
(window as unknown as { __cosmovision: typeof useAppStore }).__cosmovision = useAppStore;

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
