/**
 * Service Worker Registration
 * Registers a service worker for PWA capabilities
 */

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('ServiceWorker registration failed:', error);
        });
    });
  }
}

/**
 * Check if the app can be installed as PWA
 * @returns Promise that resolves when PWA can be installed
 */
export function checkPwaInstallable(): Promise<boolean> {
  return new Promise((resolve) => {
    let deferredPrompt: any = null;

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      // Update UI to notify the user they can install the PWA
      resolve(true);
    });

    // If the event wasn't triggered within 3 seconds, resolve as not installable
    setTimeout(() => {
      if (!deferredPrompt) {
        resolve(false);
      }
    }, 3000);
  });
}

/**
 * Show the install prompt for PWA
 * @returns Promise that resolves with the outcome of the prompt
 */
export function showPwaInstallPrompt(): Promise<boolean> {
  return new Promise((resolve) => {
    const deferredPrompt = (window as any).deferredPrompt;
    if (!deferredPrompt) {
      resolve(false);
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        resolve(true);
      } else {
        console.log('User dismissed the install prompt');
        resolve(false);
      }
      // Clear the deferredPrompt for next time
      delete (window as any).deferredPrompt;
    });
  });
}