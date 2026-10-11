import { useNavigate } from '@tanstack/react-router';
import { Icon } from '../components/ui/Icon';
import { Menu } from '../components/ui/Menu';
import { toast } from '../components/ui/toast';
import { signOut } from '../features/auth/authActions';
import { useAuthStore } from '../features/auth/authStore';

export function AccountMenu() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const name = user?.displayName || user?.email || 'Account';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  const onSignOut = async () => {
    try {
      await signOut();
      await navigate({ to: '/' });
    } catch {
      toast('Couldn’t sign out. Please try again.');
    }
  };

  return (
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
              void onSignOut();
            }}
          >
            <Icon name="logout" />
            Sign out
          </button>
        </>
      )}
    </Menu>
  );
}
