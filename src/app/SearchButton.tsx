import { useEffect, useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { SearchDialog } from '../features/search/SearchDialog';

/** The search box in the top bar. Ctrl+K (or Cmd+K) opens it from anywhere. */
export function SearchButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="ml-auto flex max-w-[380px] flex-1 items-center gap-2 rounded-md border border-line bg-bg px-2.5 py-1.5 text-muted max-sm:flex-none"
      >
        <Icon name="search" />
        <span className="max-sm:hidden">Search everything</span>
        <kbd className="ml-auto rounded border border-line px-1.5 font-mono text-[0.7rem] max-sm:hidden">
          Ctrl K
        </kbd>
      </button>
      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </>
  );
}
