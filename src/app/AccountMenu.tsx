import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { Menu } from '../components/ui/Menu';
import { toast } from '../components/ui/toast';
import { signOut } from '../features/auth/authActions';
import { useAuthStore } from '../features/auth/authStore';
import { exportMarkdown } from '../lib/entries/exportData';
import { BackupDialog } from './BackupDialog';

export function AccountMenu() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const name = user?.displayName || user?.email || 'Account';
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const [backingUp, setBackingUp] = useState(false);

  const onSignOut = async () => {
    try {
      await signOut();
      await navigate({ to: '/' });
    } catch {
      toast('Couldn’t sign out. Please try again.');
    }
  };

  const onExport = async () => {
    const ws = useAuthStore.getState().workspaceId;
    if (!ws) return;
    try {
      await exportMarkdown(ws);
    } catch (err) {
      console.error('Export failed', err);
      toast('Couldn’t export. Please try again.');
    }
  };

  return (
    <>
      <Menu
        label="Account"
        align="right"
        trigger={(props) => (
          <button
            type="button"
            {...props}
            aria-label="Account menu"
            className="grid size-8 flex-none place-items-center rounded-full border border-line bg-brand-soft font-semibold text-brand"
          >
            {initial}
          </button>
        )}
      >
        {(close) => (
          <>
            <div className="border-b border-line px-2 pt-1 pb-2">
              <div className="truncate font-semibold">{user?.displayName || 'Signed in'}</div>
              {user?.email && <div className="truncate text-[0.8rem] text-muted">{user.email}</div>}
            </div>
            <button
              type="button"
              role="menuitem"
              className="menu-item mt-1"
              onClick={() => {
                close();
                void onExport();
              }}
            >
              <Icon name="download" />
              Export as Markdown
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                close();
                setBackingUp(true);
              }}
            >
              <Icon name="download" />
              Backup and restore…
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-item mt-1 border-t border-line"
              onClick={() => {
                close();
                void onSignOut();
              }}
            >
              <Icon name="logout" />
              Sign out
            </button>
          </>
        )}
      </Menu>
      {backingUp && <BackupDialog onClose={() => setBackingUp(false)} />}
    </>
  );
}
