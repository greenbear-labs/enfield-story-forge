import { Icon } from '../components/ui/Icon';
import { useThemeStore } from './theme';

const META = {
  system: { icon: 'monitor', label: 'Theme: follows your system' },
  light: { icon: 'sun', label: 'Theme: light' },
  dark: { icon: 'moon', label: 'Theme: dark' },
} as const;

export function ThemeToggle() {
  const { choice, cycle } = useThemeStore();
  const { icon, label } = META[choice];
  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon"
      onClick={cycle}
      title={`${label}. Click to change.`}
      aria-label={`${label}. Click to change.`}
    >
      <Icon name={icon} />
    </button>
  );
}
