import { UpdateStatusIcon } from '@/components/ui/UpdateStatusIcon';

import { useAppUpdate } from '@/hooks/useAppUpdate';

const MESSAGES = {
  available: 'A new version is ready.',
  current: 'App is up to date.',
  error: 'Could not check for updates. Please try again.',
  'update-error': 'Could not apply the update. Please try again.',
  development: 'Update checks are disabled in development mode.',
  unavailable: 'Update checks are unavailable here.',
};

const LABELS = {
  checking: 'Checking…',
  updating: 'Updating…',
  available: 'Update and Reload',
  current: 'Up to Date',
  error: 'Check Failed — Retry',
  'update-error': 'Update Failed — Retry',
};

export function AppUpdate() {
  const { status, checkForUpdates, applyUpdate } = useAppUpdate();
  const isBusy = status === 'checking' || status === 'updating';
  const canUpdate = status === 'available' || status === 'update-error';
  const label = LABELS[status] ?? 'Check for Updates';

  return (
    <div className="app-update">
      <button
        type="button"
        className="app-update-btn"
        data-status={status}
        onClick={canUpdate ? applyUpdate : checkForUpdates}
        disabled={isBusy || status === 'unavailable' || status === 'development'}
        title={MESSAGES[status]}
        aria-live="polite"
        aria-atomic="true"
        aria-busy={isBusy}
      >
        <span className={`app-update-icon${isBusy ? ' is-spinning' : ''}`} aria-hidden="true">
          <UpdateStatusIcon status={status} />
        </span>
        <span>{label}</span>
      </button>
    </div>
  );
}
