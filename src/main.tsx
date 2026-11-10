import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Apply new builds and check for updates when the installed PWA is reopened.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        void registration.update().catch(() => { /* Keep the cached app available offline. */ });
      }
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    check();
  },
});

createRoot(document.getElementById('root')!).render(<App />);
