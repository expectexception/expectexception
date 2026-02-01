import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { isReactSnap } from './utils/isReactSnap';

const rootElement = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Disable PWA service worker usage and aggressively clear caches/service workers
// to avoid stale/offline cached content on mobile devices that can interfere
// with connectivity-limited users. This will unregister any existing service
// workers and delete caches on load.
if ('serviceWorker' in navigator && !isReactSnap()) {
  window.addEventListener('load', async () => {
    try {
      // Unregister any active service workers
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        try {
          await reg.unregister();
          console.log('[PWA] Unregistered service worker:', reg.scope);
        } catch (e) {
          console.warn('[PWA] Failed to unregister SW:', e);
        }
      }

      // Clear all caches created by this origin
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(async (name) => {
          try {
            await caches.delete(name);
            console.log('[PWA] Deleted cache:', name);
          } catch (e) {
            console.warn('[PWA] Failed to delete cache', name, e);
          }
        }));
      }

      // Clear any PWA-related localStorage flags
      try {
        localStorage.removeItem('pwaPromptLastDismissed');
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error('[PWA] Error during SW/cache cleanup:', err);
    }
  });
}
