const UPDATE_TIMEOUT = 30000;

// Registration is shared so React StrictMode does not register a second worker.
let registrationPromise;

export function registerAppWorker() {
  if (!registrationPromise) {
    const attempt = withUpdateTimeout(
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: 'none',
      })
    ).catch((error) => {
      // A late failure must not clear a newer retry's registration.
      if (registrationPromise === attempt) registrationPromise = undefined;
      throw error;
    });
    registrationPromise = attempt;
  }
  return registrationPromise;
}

export function forgetAppWorker() {
  registrationPromise = undefined;
}

export function reloadApp() {
  // A cancelled navigation must leave the update button usable.
  return withUpdateTimeout(new Promise(() => window.location.reload()));
}

export function withUpdateTimeout(promise) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('Update timed out')), UPDATE_TIMEOUT);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

export function waitForInstallation(worker) {
  if (!worker) return Promise.resolve();
  let onStateChange;
  return withUpdateTimeout(
    new Promise((resolve, reject) => {
      onStateChange = () => {
        if (worker.state === 'redundant') {
          reject(new Error('Update installation failed'));
        } else if (['installed', 'activating', 'activated'].includes(worker.state)) {
          resolve();
        }
      };
      worker.addEventListener('statechange', onStateChange);
      onStateChange();
    })
  ).finally(() => worker.removeEventListener('statechange', onStateChange));
}
