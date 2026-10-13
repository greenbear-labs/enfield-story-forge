import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon, type IconName } from '../../components/ui/Icon';
import type { StationPath } from '../../app/navigation';
import type { Section } from '../../data/types';
import { ToolCard, type ToolDef } from './ToolCard';

export interface StationContent {
  sec: Section;
  icon: IconName;
  title: string;
  /** Overrides the default eyebrow ("Station 1 of 4" or "Companion workshop"). */
  eyebrow?: string;
  /** Position in the journey, 1 to 4. Leave out for companion workshops. */
  num?: number;
  blurb: string;
  /** Label for the (i) link to the appendix, e.g. "What is a story shard?" */
  infoLabel: string;
  next?: { label: string; to: StationPath; sec: Section };
  tools: ToolDef[];
  collections?: { title: string; empty: string }[];
  library: { title: string; empty: string };
}

/** A titled block on a station page. `actions` sit to the right of the title. */
export function StationSection({
  title,
  actions,
  children,
  id,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  /** For links straight to this section. */
  id?: string;
}) {
  return (
    <section id={id} className="flex scroll-mt-4 flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[1.05rem]">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

interface StationPageProps {
  content: StationContent;
  /** Handlers for the tools that are built, by tool name. */
  toolActions?: Record<string, () => void>;
  /** The live collections and library. Without it, their empty states are shown. */
  children?: ReactNode;
}

/** The three-part page every station uses: header, tools, then collections and library. */
export function StationPage({ content, toolActions, children }: StationPageProps) {
  const { sec, icon, title, num, blurb, infoLabel, next, tools, collections, library } = content;
  const eyebrow = content.eyebrow ?? (num ? `Station ${num} of 4` : 'Companion workshop');

  return (
    <div data-sec={sec} className="flex flex-col gap-[22px]">
      <header className="sthead">
        <div className="badge">
          <Icon name={icon} size={28} />
        </div>
        <div className="min-w-0">
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p className="mt-1 max-w-[62ch]">{blurb}</p>
          <Link
            to="/appendix"
            search={{ topic: infoLabel }}
            className="mt-1.5 inline-flex items-center gap-1 text-[0.82rem] font-semibold text-accent"
          >
            <Icon name="info" size={16} />
            {infoLabel}
          </Link>
        </div>
        {next ? (
          <div className="z-[1] flex flex-col items-start gap-1 sm:items-end">
            <span className="label">Next station</span>
            <Link to={next.to} data-sec={next.sec} className="btn btn-small text-accent">
              {next.label} →
            </Link>
          </div>
        ) : (
          <div />
        )}
      </header>

      <StationSection title="Tools">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
          {tools.map((tool) => (
            <ToolCard key={tool.name} tool={tool} onOpen={toolActions?.[tool.name]} />
          ))}
        </div>
      </StationSection>

      {children ?? (
        <>
          {collections?.map((c) => (
            <StationSection key={c.title} title={c.title}>
              <EmptyState>{c.empty}</EmptyState>
            </StationSection>
          ))}
          <StationSection title={library.title}>
            <EmptyState>{library.empty}</EmptyState>
          </StationSection>
        </>
      )}
    </div>
  );
}
