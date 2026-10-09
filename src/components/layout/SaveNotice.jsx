export function SaveNotice({ onRetry, onSaved }) {
  return (
    <div className="save-notice">
      <div role="alert">
        <strong>Changes Not Saved</strong>
        <p>Your latest changes may be lost if you close or reload the app.</p>
      </div>
      <button
        type="button"
        className="playlist-action"
        onClick={() => {
          if (onRetry()) onSaved();
        }}
      >
        Retry
      </button>
    </div>
  );
}
