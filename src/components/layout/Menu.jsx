import { useCallback, useEffect, useRef } from 'react';

import { AddStreamForm } from '@/components/layout/AddStreamForm';
import { LayoutButtons } from '@/components/layout/LayoutButtons';
import { StreamList } from '@/components/streams/StreamList';

import { MOBILE_RECOMMENDED_LAYOUTS, STANDARD_LAYOUTS } from '@/constants/layouts';

export function Menu({
  layout,
  onLayoutChange,
  streams,
  onReorderStreams,
  onAddStream,
  onRemoveStream,
  onResetStreams,
  isOpen,
  onClose,
  returnFocusRef,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    const returnFocusTarget = returnFocusRef.current;
    const getControls = () => panel.querySelectorAll('button:not(:disabled), input:not(:disabled)');
    (getControls()[0] ?? panel).focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Tab') {
        const controls = getControls();
        const first = controls[0] ?? panel;
        const last = controls[controls.length - 1] ?? panel;
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === panel)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    panel.addEventListener('keydown', handleKeyDown);
    return () => {
      panel.removeEventListener('keydown', handleKeyDown);
      returnFocusTarget?.focus();
    };
  }, [isOpen, onClose, returnFocusRef]);

  const handleLayoutSelect = useCallback(
    (e) => {
      const value = e.currentTarget.dataset.value;
      if (value) {
        onLayoutChange(value);
        onClose();
      }
    },
    [onLayoutChange, onClose]
  );

  const handleReset = useCallback(() => {
    if (window.confirm('Reset streams to the original list?')) {
      onResetStreams();
    }
  }, [onResetStreams]);

  return (
    <>
      <div
        ref={panelRef}
        id="stream-menu"
        className={`menu-panel ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="Stream settings"
        aria-modal={isOpen ? true : undefined}
        tabIndex={-1}
        inert={!isOpen}
      >
        <section className="menu-section">
          <p className="menu-label">GRID</p>
          <LayoutButtons options={STANDARD_LAYOUTS} layout={layout} onSelect={handleLayoutSelect} />
          <div className="layout-subgroup">
            <p className="layout-subgroup-label">RECOMMENDED FOR MOBILE</p>
            <LayoutButtons
              options={MOBILE_RECOMMENDED_LAYOUTS}
              layout={layout}
              onSelect={handleLayoutSelect}
            />
          </div>
        </section>

        <section className="menu-section">
          <div className="streams-header">
            <p className="menu-label">STREAMS</p>
            <button className="reset-btn" onClick={handleReset} title="Reset to defaults">
              Reset
            </button>
          </div>

          <StreamList
            streams={streams}
            onReorderStreams={onReorderStreams}
            onRemoveStream={onRemoveStream}
          />

          <AddStreamForm streams={streams} onAddStream={onAddStream} />
        </section>
      </div>

      {isOpen && <div className="menu-backdrop" onClick={onClose} />}
    </>
  );
}
