import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';

/** The learning library behind every (i) link. Articles come later. */
export function AppendixPage({ topic }: { topic?: string }) {
  return (
    <div data-sec="learn" className="flex flex-col gap-[22px]">
      <header className="sthead">
        <div className="badge">
          <Icon name="info" size={28} />
        </div>
        <div className="min-w-0">
          <div className="eyebrow">Learn</div>
          <h1>Appendix</h1>
          <p className="mt-1 max-w-[62ch]">
            The craft articles behind every (i) button. Read them when you’re curious, never because
            you have to.
          </p>
        </div>
        <div />
      </header>
      {topic && (
        <section className="panel flex flex-col gap-1 border-l-4 border-l-accent">
          <div className="label">You asked about</div>
          <h2>{topic}</h2>
          <p className="text-muted">This article is being written. It will appear here.</p>
        </section>
      )}
      <section className="flex flex-col gap-2.5">
        <h2 className="text-[1.05rem]">Articles</h2>
        <EmptyState>The first articles arrive in a later build.</EmptyState>
      </section>
    </div>
  );
}
