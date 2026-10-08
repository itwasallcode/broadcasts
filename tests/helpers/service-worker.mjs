export async function mockServiceWorker(page, mode) {
  await page.addInitScript((mode) => {
    const fixture = (window.updateFixture = { mode, attempts: 0, messages: [] });
    const serviceWorker = new EventTarget();
    serviceWorker.controller = mode === 'uncontrolled' ? null : {};
    const worker = new EventTarget();
    worker.state = 'installed';

    function createRegistration() {
      const registration = new EventTarget();
      registration.active = {};
      registration.waiting = null;
      registration.installing = null;
      registration.update = async () => {
        if (registration.invalid) throw new DOMException('Unregistered', 'InvalidStateError');
        if (fixture.mode === 'update-hang') return new Promise(() => {});
        if (fixture.mode === 'install-hang') {
          registration.installing = new EventTarget();
          registration.installing.state = 'installing';
          registration.dispatchEvent(new Event('updatefound'));
        }
      };
      return registration;
    }

    fixture.registration = createRegistration();
    fixture.worker = worker;
    if (mode === 'invalid') fixture.registration.invalid = true;
    if (['activation-hang', 'cancel-reload', 'uncontrolled'].includes(mode)) {
      fixture.registration.waiting = worker;
    }
    worker.postMessage = (message) => {
      fixture.messages.push(message);
      if (fixture.mode === 'activation-hang') return;
      fixture.registration.waiting = null;
      serviceWorker.controller = {};
      serviceWorker.dispatchEvent(new Event('controllerchange'));
    };
    serviceWorker.register = () => {
      fixture.attempts++;
      if (mode === 'register-hang' && fixture.attempts === 1) return new Promise(() => {});
      if (mode === 'register-fail' && fixture.attempts === 1) {
        return Promise.reject(new Error('Offline'));
      }
      if (mode === 'invalid' && fixture.attempts > 1) {
        fixture.registration = createRegistration();
      }
      return Promise.resolve(fixture.registration);
    };
    Object.defineProperty(navigator, 'serviceWorker', { value: serviceWorker, configurable: true });
  }, mode);
}
