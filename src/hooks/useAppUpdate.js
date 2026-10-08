import { useCallback, useEffect, useRef, useState } from 'react';

import {
  forgetAppWorker,
  registerAppWorker,
  reloadApp,
  waitForInstallation,
  withUpdateTimeout,
} from '@/utils/appUpdates';

const supported = import.meta.env.PROD && 'serviceWorker' in navigator;

export function useAppUpdate() {
  const [status, setStatus] = useState(
    import.meta.env.DEV ? 'development' : supported ? 'idle' : 'unavailable'
  );
  const busy = useRef(false);
  const needsReload = useRef(false);
  const observeRegistration = useRef(() => {});

  const getRegistration = useCallback(async () => {
    const registration = await registerAppWorker();
    observeRegistration.current(registration);
    return registration;
  }, []);

  const findUpdate = useCallback(async () => {
    const registration = await getRegistration();
    if (!registration.waiting && !needsReload.current) {
      if (!navigator.onLine) throw new Error('The app is offline');
      await withUpdateTimeout(registration.update());
      await waitForInstallation(registration.installing);
    }
    return registration;
  }, [getRegistration]);

  useEffect(() => {
    if (status !== 'current') return;
    const timer = window.setTimeout(() => {
      setStatus((value) => (value === 'current' ? 'idle' : value));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!supported) return;
    let disposed = false;
    let registration;
    let controller = navigator.serviceWorker.controller;
    const workers = new Set();

    function onControllerChange() {
      const next = navigator.serviceWorker.controller;
      if (controller && next && next !== controller) {
        needsReload.current = true;
        if (!busy.current) setStatus('available');
      }
      controller = next;
    }

    function onStateChange() {
      if (registration.waiting && !busy.current) {
        setStatus('available');
      }
    }

    function onUpdateFound() {
      const worker = registration.installing;
      if (worker && !workers.has(worker)) {
        workers.add(worker);
        worker.addEventListener('statechange', onStateChange);
      }
      onStateChange();
    }

    function detachRegistration() {
      registration?.removeEventListener('updatefound', onUpdateFound);
      for (const worker of workers) worker.removeEventListener('statechange', onStateChange);
      workers.clear();
    }

    observeRegistration.current = (value) => {
      if (registration === value) return;
      detachRegistration();
      registration = value;
      registration.addEventListener('updatefound', onUpdateFound);
      onUpdateFound();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    getRegistration().catch(() => {
      if (!disposed && !busy.current) setStatus('error');
    });

    return () => {
      disposed = true;
      observeRegistration.current = () => {};
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      detachRegistration();
    };
  }, [getRegistration]);

  const checkForUpdates = useCallback(async () => {
    if (!supported || busy.current) return;
    busy.current = true;
    setStatus('checking');
    try {
      if (needsReload.current) {
        setStatus('available');
        return;
      }
      const registration = await findUpdate();
      setStatus(registration.waiting || needsReload.current ? 'available' : 'current');
    } catch (error) {
      if (error?.name === 'InvalidStateError') forgetAppWorker();
      setStatus('error');
    } finally {
      busy.current = false;
    }
  }, [findUpdate]);

  const applyUpdate = useCallback(async () => {
    if (!supported || busy.current) return;
    busy.current = true;
    setStatus('updating');
    let onControllerChange;
    try {
      // Another tab may already have activated the update.
      if (!needsReload.current) {
        const registration = await findUpdate();
        if (!needsReload.current) {
          const worker = registration.waiting;
          if (!worker) {
            setStatus('current');
            return;
          }
          await withUpdateTimeout(
            new Promise((resolve) => {
              onControllerChange = () => {
                if (!navigator.serviceWorker.controller) return;
                needsReload.current = true;
                resolve();
              };
              navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
              worker.postMessage({ type: 'SKIP_WAITING' });
            })
          );
        }
      }
      await reloadApp();
    } catch (error) {
      if (error?.name === 'InvalidStateError') forgetAppWorker();
      setStatus('update-error');
    } finally {
      if (onControllerChange) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      }
      busy.current = false;
    }
  }, [findUpdate]);

  return { status, checkForUpdates, applyUpdate };
}
