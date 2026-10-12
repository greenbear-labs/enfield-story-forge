import { describe, expect, it } from 'vitest';
import type { Entry } from '../../data/types';
import { docxFiles, epubFiles } from './bookFiles';
import { compile } from './compile';

const prose = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Salt & ' },
        { type: 'text', text: 'brine', marks: [{ type: 'italic' }] },
      ],
    },
    { type: 'horizontalRule' },
    { type: 'paragraph', content: [{ type: 'text', text: '<Later>' }] },
  ],
};
const book = {
  id: 'b',
  type: 'book',
  title: 'Salt Key',
  fields: { compile: { author: 'A. Green', dedication: 'For R.' } },
} as unknown as Entry;
const chapter = { id: 'c1', type: 'chapter', title: 'Chapter 1', fields: {} } as unknown as Entry;
const scene = { id: 's1', type: 'scene', title: '', fields: {}, wordCount: 3 } as unknown as Entry;
const compiled = compile(book, [chapter], () => [scene], new Map([['s1', prose]]));
const file = (files: { name: string; data: unknown }[], name: string) =>
  String(files.find((f) => f.name === name)?.data);

describe('docx', () => {
  const files = docxFiles(compiled);
  const doc = file(files, 'word/document.xml');

  it('has the parts Word needs', () => {
    expect(files.map((f) => f.name)).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'word/_rels/document.xml.rels',
      'word/document.xml',
      'word/styles.xml',
      'docProps/core.xml',
    ]);
  });

  it('writes styled, escaped paragraphs with scene breaks', () => {
    expect(doc).toContain(
      '<w:pStyle w:val="Title"/></w:pPr><w:r><w:t xml:space="preserve">Salt Key</w:t>',
    );
    expect(doc).toContain('<w:pStyle w:val="ChapterHeading"/>');
    expect(doc).toContain('Salt &amp; ');
    expect(doc).toContain('<w:rPr><w:i/></w:rPr><w:t xml:space="preserve">brine');
    expect(doc).toContain(
      '<w:pStyle w:val="SceneBreak"/></w:pPr><w:r><w:t xml:space="preserve">* * *',
    );
    expect(doc).toContain('&lt;Later&gt;');
    // After a break, the first paragraph isn't indented.
    expect(doc.split('SceneBreak')[1]).toMatch(
      /^"\/><\/w:pPr>.*?<w:pStyle w:val="FirstParagraph"\/>/,
    );
  });
});

describe('epub', () => {
  const files = epubFiles(compiled, 'b', new Date('2026-10-12T20:00:00.123Z'));

  it('starts with the mimetype and lists every page in the spine', () => {
    expect(files[0]).toEqual({ name: 'mimetype', data: 'application/epub+zip' });
    const opf = file(files, 'OEBPS/content.opf');
    expect(opf).toContain('<meta property="dcterms:modified">2026-10-12T20:00:00Z</meta>');
    expect(opf).toContain('<dc:creator>A. Green</dc:creator>');
    for (const id of ['title', 'dedication', 'chapter-1'])
      expect(opf).toContain(`<itemref idref="${id}"/>`);
  });

  it('turns scene breaks into the chosen mark', () => {
    const ch = file(files, 'OEBPS/chapter-1.xhtml');
    expect(ch).toContain('<h1>Chapter One</h1>');
    expect(ch).toContain('<p>Salt &amp; <em>brine</em></p>');
    expect(ch).toContain('<p class="break">* * *</p>');
    expect(ch).not.toContain('<hr/>');
  });

  it('lists chapters, not the title page, in the contents', () => {
    const nav = file(files, 'OEBPS/nav.xhtml');
    expect(nav).toContain('href="chapter-1.xhtml"');
    expect(nav).not.toContain('href="title.xhtml"');
  });
});
