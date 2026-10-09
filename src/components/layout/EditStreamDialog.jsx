import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { StreamForm } from '@/components/layout/StreamForm';

export function EditStreamDialog({ stream, streams, shared, returnFocusTarget, onSave, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    dialog.querySelector('input')?.focus();
    return () => {
      dialog.close();
      returnFocusTarget?.focus();
    };
  }, [returnFocusTarget]);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="playlist-dialog"
      aria-labelledby="playlist-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = event.currentTarget.querySelectorAll('input, button');
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <StreamForm
        stream={stream}
        streams={streams}
        shared={shared}
        onSave={(videoId, label) => {
          const error = onSave(stream.id, videoId, label);
          if (error) return error;
          onClose();
        }}
        onCancel={onClose}
      />
    </dialog>,
    document.body
  );
}
