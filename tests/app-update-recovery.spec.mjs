import { expect, test } from '@playwright/test';

import { blockExternalRequests, startServer } from './helpers/server.mjs';
import { mockServiceWorker } from './helpers/service-worker.mjs';

let server;
test.beforeEach(async ({ context }) => {
  server = await startServer();
  await blockExternalRequests(context, server.url);
});
test.afterEach(async ({ context }) => {
  await context.close();
  await server.close();
});

async function open(page, mode) {
  await page.clock.install();
  await mockServiceWorker(page, mode);
  await page.goto(server.url);
  await page.getByRole('button', { name: 'Toggle menu' }).click();
  return page.locator('.app-update-btn');
}

for (const mode of ['register-hang', 'register-fail', 'update-hang', 'install-hang', 'invalid']) {
  test(`check recovers from ${mode}`, async ({ page }) => {
    const button = await open(page, mode);
    if (mode === 'register-hang') {
      await page.clock.fastForward(30001);
    } else if (mode !== 'register-fail') {
      await button.click();
      if (mode.endsWith('-hang')) {
        await expect(button).toHaveAttribute('data-status', 'checking');
        await expect(button).toBeDisabled();
        await page.clock.fastForward(30001);
      }
    }
    await expect(button).toHaveText('Check Failed — Retry');
    await expect(button).toBeEnabled();
    await page.evaluate(() => {
      window.updateFixture.mode = 'normal';
      window.updateFixture.registration.installing = null;
    });
    await button.click();
    await expect(button).toHaveText('Up to Date');
    if (mode.startsWith('register') || mode === 'invalid') {
      expect(await page.evaluate(() => window.updateFixture.attempts)).toBe(2);
    }
    if (mode === 'invalid') {
      await page.evaluate(() => {
        const { registration, worker } = window.updateFixture;
        registration.waiting = worker;
        registration.dispatchEvent(new Event('updatefound'));
      });
      await expect(button).toHaveText('Update and Reload');
    } else {
      await page.clock.fastForward(3001);
      await expect(button).toHaveText('Check for Updates');
    }
  });
}

test('activation timeout retries SKIP_WAITING and reloads with one click', async ({ page }) => {
  const button = await open(page, 'activation-hang');
  await expect(button).toHaveText('Update and Reload');
  await button.click();
  await expect(button).toHaveText('Updating…');
  await expect(button).toBeDisabled();
  await page.clock.fastForward(30001);
  await expect(button).toHaveText('Update Failed — Retry');
  await expect(button).toBeEnabled();
  expect(await page.evaluate(() => window.updateFixture.messages)).toEqual([
    { type: 'SKIP_WAITING' },
  ]);
  await page.evaluate(() => {
    window.updateFixture.mode = 'normal';
  });
  await Promise.all([page.waitForEvent('load'), button.click()]);
});

test('retry recovers when the waiting worker has disappeared', async ({ page }) => {
  const button = await open(page, 'activation-hang');
  await button.click();
  await expect(button).toHaveText('Updating…');
  await page.clock.fastForward(30001);
  await expect(button).toHaveText('Update Failed — Retry');
  await page.evaluate(() => {
    window.updateFixture.mode = 'normal';
    window.updateFixture.registration.waiting = null;
  });
  await button.click();
  await expect(button).toHaveText('Up to Date');
  await page.clock.fastForward(3001);
  await expect(button).toHaveText('Check for Updates');
});

test('a cancelled reload can be retried with one click', async ({ page }) => {
  const button = await open(page, 'cancel-reload');
  await page.evaluate(() => {
    window.onbeforeunload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
  });
  const dismissed = new Promise((resolve) => {
    page.once('dialog', async (dialog) => {
      await dialog.dismiss();
      resolve();
    });
  });
  await button.click();
  await dismissed;
  await expect(button).toHaveText('Updating…');
  await page.clock.fastForward(30001);
  await expect(button).toHaveText('Update Failed — Retry');
  await expect(button).toBeEnabled();
  await page.evaluate(() => {
    window.onbeforeunload = null;
  });
  await Promise.all([page.waitForEvent('load'), button.click()]);
});

test('an uncontrolled page can show and apply a waiting update', async ({ page }) => {
  const button = await open(page, 'uncontrolled');
  expect(await page.evaluate(() => navigator.serviceWorker.controller)).toBeNull();
  await expect(button).toHaveText('Update and Reload');
  await expect(button).toBeEnabled();
  await Promise.all([page.waitForEvent('load'), button.click()]);
});
