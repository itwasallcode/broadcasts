import assert from 'node:assert/strict';

import { test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true, ws: false },
  logLevel: 'error',
});
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const browserWindow = {
  setTimeout: (...args) => setTimeout(...args),
  clearTimeout: (...args) => clearTimeout(...args),
  location: { reload() {} },
};
Object.defineProperty(globalThis, 'window', { configurable: true, value: browserWindow });
const serviceWorker = { register() {} };
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { serviceWorker },
});

try {
  const { registerAppWorker, forgetAppWorker, waitForInstallation, reloadApp, withUpdateTimeout } =
    await server.ssrLoadModule('/src/utils/appUpdates.js');

  await test('a stalled registration expires and a retry makes a fresh request', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    forgetAppWorker();
    let attempts = 0;
    let rejectOriginal;
    const recovered = {};
    serviceWorker.register = () => {
      attempts++;
      return attempts === 1
        ? new Promise((_, reject) => {
            rejectOriginal = reject;
          })
        : Promise.resolve(recovered);
    };
    const first = registerAppWorker();
    assert.equal(registerAppWorker(), first);
    const failure = assert.rejects(first, /timed out/);
    t.mock.timers.tick(30000);
    await failure;
    assert.equal(await registerAppWorker(), recovered);
    rejectOriginal(new Error('Late network failure'));
    await Promise.resolve();
    assert.equal(await registerAppWorker(), recovered);
    assert.equal(attempts, 2);
  });

  await test('a rejected or invalidated registration can be replaced', async () => {
    forgetAppWorker();
    serviceWorker.register = () => Promise.reject(new Error('Network failure'));
    await assert.rejects(registerAppWorker(), /Network failure/);
    const recovered = {};
    serviceWorker.register = () => Promise.resolve(recovered);
    assert.equal(await registerAppWorker(), recovered);
    forgetAppWorker();
    const replacement = {};
    serviceWorker.register = () => Promise.resolve(replacement);
    assert.equal(await registerAppWorker(), replacement);
  });

  await test('a stalled check or activation expires instead of waiting forever', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const failure = assert.rejects(withUpdateTimeout(new Promise(() => {})), /timed out/);
    t.mock.timers.tick(30000);
    await failure;
  });

  await test('a cancelled reload expires so the user can retry', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let reloads = 0;
    browserWindow.location.reload = () => {
      reloads++;
    };
    const failure = assert.rejects(reloadApp(), /timed out/);
    assert.equal(reloads, 1);
    t.mock.timers.tick(30000);
    await failure;
  });

  await test('installation handles completion, failure and a stalled worker', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    await waitForInstallation(null);
    const worker = new EventTarget();
    worker.state = 'installing';
    const completed = waitForInstallation(worker);
    worker.state = 'installed';
    worker.dispatchEvent(new Event('statechange'));
    await completed;
    worker.state = 'redundant';
    await assert.rejects(waitForInstallation(worker), /installation failed/);
    worker.state = 'installing';
    const failure = assert.rejects(waitForInstallation(worker), /timed out/);
    t.mock.timers.tick(30000);
    await failure;
  });
} finally {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else delete globalThis.window;
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else delete globalThis.navigator;
  await server.close();
}
