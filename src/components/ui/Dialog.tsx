import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Section color for the dialog's accent, e.g. "shard". */
  sec?: string;
  wide?: boolean;
}

/**
 * A modal panel. Closes on Escape, on the close button, and on a click
 * outside it. Focus moves into it on open and back to where it was on close.
 */
export function Dialog({ title, onClose, children, sec, wide }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(
      '[autofocus], [data-autofocus], textarea, input, select, button:not([data-close])',
    );
    (first ?? ref.current)?.focus();
    // Start typing after any text that's already there (e.g. a Spark Prompt).
    if (first instanceof HTMLTextAreaElement) {
      first.setSelectionRange(first.value.length, first.value.length);
    }
    return () => before?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-sec={sec}
        className={`dialog ${wide ? 'max-w-[640px]' : 'max-w-[480px]'}`}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-[1.15rem]">
            {title}
          </h2>
          <button
            type="button"
            data-close
            className="btn btn-ghost btn-icon"
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
