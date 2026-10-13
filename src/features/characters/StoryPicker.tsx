import type { Story } from './castModel';
import { storyName } from './castModel';

/**
 * Options for choosing a story: each series (its whole cast) with its books
 * under it, then the standalone stories, then groups. Put inside a <select>.
 */
export function StoryOptions({ stories, skip }: { stories: Story[]; skip?: Set<string> }) {
  const shown = stories.filter((s) => !skip?.has(s.story.id));
  const series = shown.filter((s) => s.story.type === 'series');
  const standalone = shown.filter((s) => s.story.type === 'book' && !s.series);
  const groups = shown.filter((s) => s.story.type === 'cast_group');
  const booksOf = (id: string) => shown.filter((s) => s.series?.id === id);
  // A series' books show under it even if the series itself is skipped.
  const seriesIds = new Set(
    stories.filter((s) => s.story.type === 'series').map((s) => s.story.id),
  );
  return (
    <>
      {[...seriesIds].map((id) => {
        const whole = series.find((s) => s.story.id === id);
        const books = booksOf(id);
        if (!whole && books.length === 0) return null;
        const name = storyName(stories.find((s) => s.story.id === id)!.story);
        return (
          <optgroup key={id} label={name}>
            {whole && <option value={id}>{name} (the whole series)</option>}
            {books.map((b) => (
              <option key={b.story.id} value={b.story.id}>
                {storyName(b.story)}
              </option>
            ))}
          </optgroup>
        );
      })}
      {standalone.length > 0 && (
        <optgroup label={seriesIds.size ? 'Standalone stories' : 'Stories'}>
          {standalone.map((s) => (
            <option key={s.story.id} value={s.story.id}>
              {storyName(s.story)}
            </option>
          ))}
        </optgroup>
      )}
      {groups.length > 0 && (
        <optgroup label="Groups">
          {groups.map((s) => (
            <option key={s.story.id} value={s.story.id}>
              {storyName(s.story)}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );
}
