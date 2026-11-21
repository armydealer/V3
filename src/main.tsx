import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register offline service worker so the app works reliably even without internet
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
