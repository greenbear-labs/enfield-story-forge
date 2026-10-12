export interface NamedPerson {
  id: string;
  label: string;
}

export interface NameMatch {
  start: number;
  end: number;
  person: NamedPerson;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Where people's names appear in a piece of text, as whole words and with the
 * same capitals. Longer names win, so "Mira Vale" isn't also counted as "Mira".
 */
export function nameMatches(text: string, people: NamedPerson[]): NameMatch[] {
  const byLength = [...people]
    .filter((p) => p.label.trim())
    .sort((a, b) => b.label.length - a.label.length);
  const found: NameMatch[] = [];
  for (const person of byLength) {
    const re = new RegExp(
      `(?<![\\p{L}\\p{N}])${escape(person.label.trim())}(?![\\p{L}\\p{N}])`,
      'gu',
    );
    for (const m of text.matchAll(re)) {
      const start = m.index;
      const end = start + m[0].length;
      if (!found.some((f) => start < f.end && end > f.start)) found.push({ start, end, person });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}
