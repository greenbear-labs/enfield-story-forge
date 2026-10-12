import { Link } from '@tanstack/react-router';
import { Icon } from '../../components/ui/Icon';
import { ARTICLE_GROUPS, ARTICLES, articleFor, type Article } from './articles';
import { ArticleBody } from './ArticleBody';

/** The learning library behind every (i) link: an index, or one article. */
export function AppendixPage({ topic }: { topic?: string }) {
  const article = articleFor(topic);
  return article ? <ArticleView article={article} /> : <Index missing={topic} />;
}

function Index({ missing }: { missing?: string }) {
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
      {missing && (
        <section className="panel flex flex-col gap-1 border-l-4 border-l-accent">
          <div className="label">You asked about</div>
          <h2>{missing}</h2>
          <p className="text-muted">This article is still being written.</p>
        </section>
      )}
      {ARTICLE_GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-2.5" aria-label={group}>
          <h2 className="text-[1.05rem]">{group}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {ARTICLES.filter((a) => a.group === group).map((a) => (
              <ArticleCard key={a.title} article={a} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      to="/appendix"
      search={{ topic: article.title }}
      data-sec={article.sec}
      className="entry-card"
    >
      <h3 className="text-[1.02rem]">{article.title}</h3>
      <p className="text-[0.88rem] text-muted">{article.summary}</p>
    </Link>
  );
}

function ArticleView({ article }: { article: Article }) {
  const more = ARTICLES.filter((a) => a.group === article.group && a !== article);
  return (
    <div data-sec={article.sec} className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <Link
        to="/appendix"
        className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
      >
        <Icon name="arrowLeft" size={16} />
        Appendix
      </Link>
      <article className="panel flex flex-col gap-3 border-t-4 border-t-accent">
        <div className="label text-accent">{article.group}</div>
        <h1 className="text-[1.9rem] max-sm:text-[1.55rem]">{article.title}</h1>
        <p className="font-display text-[1.1rem] text-muted">{article.summary}</p>
        <div className="border-t border-line pt-3">
          <ArticleBody body={article.body} />
        </div>
      </article>
      {more.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[1.05rem]">More in {article.group.toLowerCase()}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {more.map((a) => (
              <ArticleCard key={a.title} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
