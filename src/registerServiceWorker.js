// Service Worker Registration for Freshioz Admin PWA
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/admin/sw.js', { scope: '/admin/' })
        .then((registration) => {
          console.log('[PWA Admin] Service Worker registered with scope:', registration.scope);
          registration.update().catch(() => {});
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        })
        .catch((err) => {
          console.warn('[PWA Admin] Service Worker registration failed:', err);
        });
    });
  }
}
