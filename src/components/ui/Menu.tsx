import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface MenuProps {
  /** Renders the trigger button. Spread the props onto a <button>. */
  trigger: (props: {
    'aria-haspopup': 'menu';
    'aria-expanded': boolean;
    'aria-controls': string;
    onClick: () => void;
  }) => ReactNode;
  align?: 'left' | 'right';
  label: string;
  children: (close: () => void) => ReactNode;
}

/** A small dropdown that closes on outside click and Escape. */
export function Menu({ trigger, align = 'left', label, children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      {trigger({
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': id,
        onClick: () => setOpen((o) => !o),
      })}
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={label}
          className={`menu top-[calc(100%+6px)] ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}
