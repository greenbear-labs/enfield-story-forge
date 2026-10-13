import { describe, expect, it } from 'vitest';
import { proseText } from '../../lib/entries/prose';
import { readZipFile } from '../../lib/unzip';
import { zipBytes } from '../../lib/zip';
import {
  buildDraft,
  docxBlocks,
  draftScenes,
  draftWords,
  markdownInline,
  readDraftFile,
  textBlocks,
} from './importModel';

const sceneTexts = (draft: ReturnType<typeof buildDraft>) =>
  draft.chapters.map((c) => [c.title, ...c.scenes.map((s) => `${s.title}: ${proseText(s.doc)}`)]);

describe('reading Markdown', () => {
  it('reads bold and italic, and leaves snake_case alone', () => {
    expect(markdownInline('She said **no**, *twice*, to file_name.')).toEqual([
      { type: 'text', text: 'She said ' },
      { type: 'text', text: 'no', marks: [{ type: 'bold' }] },
      { type: 'text', text: ', ' },
      { type: 'text', text: 'twice', marks: [{ type: 'italic' }] },
      { type: 'text', text: ', to file_name.' },
    ]);
  });

  it('makes chapters from headings and scenes from breaks, with the title on top', () => {
    const md = [
      '# Salt Key',
      '',
      '## Chapter 1',
      '',
      'Mira woke to the sound',
      'of gulls.',
      '',
      '* * *',
      '',
      'Tomas was already gone.',
      '',
      '## Chapter 2',
      '',
      '### The harbor',
      '',
      'The boats were burning.',
      '',
      '\\* \\* \\*',
      '',
      'Nobody came.',
    ].join('\n');
    const draft = buildDraft(textBlocks(md), 'file name');
    expect(draft.title).toBe('Salt Key');
    expect(sceneTexts(draft)).toEqual([
      [
        'Chapter 1',
        'Scene 1: Mira woke to the sound of gulls.',
        'Scene 2: Tomas was already gone.',
      ],
      ['Chapter 2', 'The harbor: The boats were burning.', 'Scene 2: Nobody came.'],
    ]);
    expect(draftScenes(draft)).toBe(4);
    expect(draftWords(draft)).toBe(17);
  });

  it('finds "Chapter" lines in plain text, but not sentences that start with "Part"', () => {
    const txt = [
      'Prologue',
      'It was cold.',
      'Chapter One: The Fall',
      'Part of me wanted to go.',
      'CHAPTER 2',
      'She went.',
    ].join('\n');
    const draft = buildDraft(textBlocks(txt, false), 'my-draft');
    expect(draft.title).toBe('my-draft');
    expect(sceneTexts(draft)).toEqual([
      ['Prologue', 'Scene 1: It was cold.'],
      ['Chapter One: The Fall', 'Scene 1: Part of me wanted to go.'],
      ['CHAPTER 2', 'Scene 1: She went.'],
    ]);
  });

  it('puts a draft with no chapters into one chapter', () => {
    const draft = buildDraft(textBlocks('One.\n\nTwo.\n\n***\n\nThree.'), 'Notes');
    expect(sceneTexts(draft)).toEqual([['Chapter 1', 'Scene 1: One.\n\nTwo.', 'Scene 2: Three.']]);
    expect(draft.chapters[0]!.scenes[0]!.doc.content).toHaveLength(2);
  });
});

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const para = (text: string, style = '', run = '') =>
  `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r>${run ? `<w:rPr>${run}</w:rPr>` : ''}<w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
const documentXml = (...paras: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body>${paras.join('')}</w:body></w:document>`;

describe('reading Word', () => {
  const xml = documentXml(
    para('The Drowned Bell', 'Title'),
    para('One', 'Heading1'),
    `<w:p><w:r><w:t xml:space="preserve">She rang it </w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>once</w:t></w:r><w:r><w:rPr><w:b w:val="0"/></w:rPr><w:t>.</w:t></w:r></w:p>`,
    para('#'),
    `<w:p><w:r><w:t>Then</w:t></w:r><w:r><w:br/><w:t>again.</w:t></w:r><w:r><w:delText>gone</w:delText></w:r></w:p>`,
    `<w:p><w:r><w:pict><v:rect o:hr="t" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"/></w:pict></w:r></w:p>`,
    para('A third scene.'),
    para('Two', 'Heading1'),
    para('   '),
    para('The end.'),
  );

  it('reads headings, marks, line breaks and scene breaks, and skips deleted text', () => {
    const draft = buildDraft(docxBlocks(xml), 'file');
    expect(draft.title).toBe('The Drowned Bell');
    expect(draft.chapters.map((c) => c.title)).toEqual(['One', 'Two']);
    const [first, second, third] = draft.chapters[0]!.scenes;
    expect(proseText(third!.doc)).toBe('A third scene.');
    expect(first!.doc.content![0]!.content).toEqual([
      { type: 'text', text: 'She rang it ' },
      { type: 'text', text: 'once', marks: [{ type: 'italic' }] },
      { type: 'text', text: '.' },
    ]);
    expect(second!.doc.content![0]!.content).toEqual([
      { type: 'text', text: 'Then' },
      { type: 'hardBreak' },
      { type: 'text', text: 'again.' },
    ]);
  });

  it('opens a compressed .docx file', async () => {
    const data = new TextEncoder().encode(xml);
    const deflated = new Uint8Array(
      await new Response(
        new ReadableStream<BufferSource>({
          start(controller) {
            controller.enqueue(data);
            controller.close();
          },
        }).pipeThrough(new CompressionStream('deflate-raw')),
      ).arrayBuffer(),
    );
    // Write a zip, then mark the document as deflated and swap in the compressed bytes.
    const zip = deflatedZip('word/document.xml', data, deflated);
    expect(new TextDecoder().decode((await readZipFile(zip, 'word/document.xml'))!)).toBe(xml);
    const file = new File([zip as BlobPart], 'Bell.docx');
    const draft = await readDraftFile(file);
    expect(draft.chapters).toHaveLength(2);
  });

  it('reads a stored zip, and says plainly when a file isn’t a Word document', async () => {
    const stored = zipBytes([{ name: 'word/document.xml', data: xml }]);
    expect(await readZipFile(stored, 'missing.xml')).toBeNull();
    await expect(readDraftFile(new File(['hello'], 'x.docx'))).rejects.toThrow(/Word document/);
    await expect(readDraftFile(new File(['hello'], 'x.pdf'))).rejects.toThrow(/Choose a Word/);
  });
});

/** A one-file zip whose entry is deflated (method 8), as Word writes them. */
function deflatedZip(name: string, raw: Uint8Array, deflated: Uint8Array): Uint8Array {
  const stored = zipBytes([{ name, data: raw }]);
  const view = new DataView(stored.buffer);
  const nameLength = view.getUint16(26, true);
  const header = stored.slice(0, 30 + nameLength);
  const central = stored.slice(30 + nameLength + raw.length);
  const h = new DataView(header.buffer);
  h.setUint16(8, 8, true);
  h.setUint32(18, deflated.length, true);
  const c = new DataView(central.buffer);
  c.setUint16(10, 8, true);
  c.setUint32(20, deflated.length, true);
  // The end record's central directory offset moves with the shorter data.
  const end = central.length - 22;
  c.setUint32(end + 16, header.length + deflated.length, true);
  const out = new Uint8Array(header.length + deflated.length + central.length);
  out.set(header);
  out.set(deflated, header.length);
  out.set(central, header.length + deflated.length);
  return out;
}
