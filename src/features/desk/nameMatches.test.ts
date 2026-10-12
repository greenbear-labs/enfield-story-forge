import { describe, expect, it } from 'vitest';
import { nameMatches } from './nameMatches';

const people = [
  { id: 'm', label: 'Mira' },
  { id: 'mv', label: 'Mira Vale' },
  { id: 't', label: 'Tam' },
  { id: 'q', label: 'Dr. Q' },
];

const names = (text: string) => nameMatches(text, people).map((m) => text.slice(m.start, m.end));

describe('name detection', () => {
  it('finds whole names with matching capitals', () => {
    expect(names('Mira saw Tam. Tamsin and mira did not.')).toEqual(['Mira', 'Tam']);
  });

  it('prefers the longer name', () => {
    const found = nameMatches('Mira Vale met Mira.', people);
    expect(found.map((m) => m.person.id)).toEqual(['mv', 'm']);
  });

  it('copes with punctuation in names and around them', () => {
    expect(names('“Dr. Q?” asked Tam’s sister. (Mira)')).toEqual(['Dr. Q', 'Tam', 'Mira']);
  });
});
