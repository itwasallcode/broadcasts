import { RefreshIcon } from '@/components/ui/RefreshIcon';

const PATHS = {
  current: 'm3 8 3 3 7-7',
  available: 'M8 2v8m-3-3 3 3 3-3M3 11v3h10v-3',
  error: 'M8 5v3m0 3h.01M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13',
};

export function UpdateStatusIcon({ status }) {
  const path = PATHS[status === 'update-error' ? 'error' : status];
  if (!path) return <RefreshIcon />;

  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
