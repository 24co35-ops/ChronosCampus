/**
 * sw.ts — Service Worker Registration Helper
 * Registers /sw.js in the browser for offline PWA installation
 */

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[ChronosCampus:PWA] Service Worker registered with scope:", registration.scope);
          resolve(registration);
        })
        .catch((error) => {
          console.warn("[ChronosCampus:PWA] Service Worker registration failed:", error);
          resolve(null);
        });
    });
  });
}
