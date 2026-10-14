import { Link } from '@tanstack/react-router';
import { Icon } from '../../components/ui/Icon';
import { usePlays } from '../../lib/entries/plays';
import { gemBalance, gemsText } from './rewardsModel';

/** The reader's gems, in the header; opens the profile. */
export function GemCount() {
  const plays = usePlays().data;
  if (!plays) return null;
  const gems = gemBalance(plays);
  return (
    <Link to="/paths/profile" className="sp-gems" aria-label={`Your profile: ${gemsText(gems)}`}>
      <Icon name="gem" size={15} />
      {gems}
    </Link>
  );
}
