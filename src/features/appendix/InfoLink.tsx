import { Link } from '@tanstack/react-router';
import { Icon } from '../../components/ui/Icon';

/** A small (i) link to an Appendix article. */
export function InfoLink({ topic, label = topic }: { topic: string; label?: string }) {
  return (
    <Link
      to="/appendix"
      search={{ topic }}
      className="inline-flex items-center gap-1 text-[0.82rem] font-semibold text-accent"
    >
      <Icon name="info" size={16} />
      {label}
    </Link>
  );
}
