import { escapeXml, proseBlocks, proseToHtml, type ProseNode } from '../../lib/entries/prose';
import { zipBlob, type ZipFile } from '../../lib/zip';
import { paragraphs, sceneBreakText, type Compiled } from './compile';

/*
 * Word and EPUB files for a compiled manuscript. Both are zips of small XML
 * files, written here by hand so no library is needed.
 */

const isNode = (v: unknown): v is ProseNode =>
  !!v && typeof v === 'object' && typeof (v as ProseNode).type === 'string';
const kids = (node: ProseNode) => (node.content ?? []).filter(isNode);

/* ----- DOCX: standard manuscript format (Times New Roman 12pt, double-spaced, 1" margins) ----- */

const W_NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function runs(node: ProseNode, italic = false): string {
  if (node.type === 'text') {
    const marks = new Set((node.marks ?? []).map((m) => m.type));
    const props = [
      italic !== marks.has('italic') ? '<w:i/>' : '',
      marks.has('bold') ? '<w:b/>' : '',
    ]
      .filter(Boolean)
      .join('');
    return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${escapeXml(node.text ?? '')}</w:t></w:r>`;
  }
  if (node.type === 'hardBreak') return '<w:r><w:br/></w:r>';
  if (node.type === 'mention')
    return `<w:r><w:t xml:space="preserve">${escapeXml(String(node.attrs?.label ?? ''))}</w:t></w:r>`;
  return kids(node)
    .map((n) => runs(n, italic))
    .join('');
}

const textRun = (text: string) => `<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;

const para = (style: string, content: string, extra = '') =>
  `<w:p><w:pPr><w:pStyle w:val="${style}"/>${extra}</w:pPr>${content}</w:p>`;

const pageBreakBefore = '<w:pageBreakBefore/>';

/** A scene's prose as Word paragraphs. The first paragraph (and any after a break) isn't indented. */
function sceneParagraphs(doc: unknown, brk: string): string[] {
  const out: string[] = [];
  let first = true;
  const body = (content: string, extra = '') => {
    out.push(para(first ? 'FirstParagraph' : 'BodyText', content, extra));
    first = false;
  };
  const walk = (node: ProseNode, quote: boolean) => {
    const indent = quote ? '<w:ind w:left="720" w:right="720" w:firstLine="0"/>' : '';
    switch (node.type) {
      case 'paragraph':
        body(runs(node, quote), indent);
        break;
      case 'heading':
        out.push(para('SceneHeading', runs(node)));
        first = true;
        break;
      case 'bulletList':
      case 'orderedList':
        kids(node).forEach((item, i) => {
          const marker = node.type === 'orderedList' ? `${i + 1}. ` : '• ';
          kids(item).forEach((child, j) =>
            child.type === 'paragraph'
              ? out.push(
                  para(
                    'ListText',
                    (j === 0 ? textRun(marker) : '') + runs(child),
                    '<w:ind w:left="720" w:hanging="360"/>',
                  ),
                )
              : walk(child, quote),
          );
        });
        break;
      case 'blockquote':
        kids(node).forEach((child) => walk(child, true));
        break;
      case 'horizontalRule':
        out.push(para('SceneBreak', textRun(brk || ' ')));
        first = true;
        break;
    }
  };
  proseBlocks(doc).forEach((b) => walk(b, false));
  return out;
}

function documentXml(c: Compiled): string {
  const s = c.settings;
  const brk = sceneBreakText(c);
  const body: string[] = [];
  body.push(para('Title', textRun(c.title)));
  if (s.subtitle.trim()) body.push(para('Subtitle', textRun(s.subtitle.trim())));
  if (s.author.trim()) body.push(para('Author', textRun(s.author.trim())));
  const matter = (text: string, style: string) =>
    paragraphs(text).forEach((p, i) =>
      body.push(para(style, textRun(p), i === 0 ? pageBreakBefore : '')),
    );
  if (s.dedication.trim()) matter(s.dedication, 'Dedication');
  if (s.epigraph.trim()) {
    matter(s.epigraph, 'Epigraph');
    if (s.epigraphSource.trim())
      body.push(para('EpigraphSource', textRun(`— ${s.epigraphSource.trim()}`)));
  }
  for (const ch of c.chapters) {
    body.push(para('ChapterHeading', textRun(ch.heading)));
    if (ch.subheading) body.push(para('ChapterSubtitle', textRun(ch.subheading)));
    ch.scenes.forEach((doc, i) => {
      if (i > 0) body.push(para('SceneBreak', textRun(brk || ' ')));
      body.push(...sceneParagraphs(doc, brk));
    });
  }
  const back = (title: string, text: string) => {
    body.push(para('ChapterHeading', textRun(title)));
    paragraphs(text).forEach((p, i) =>
      body.push(para(i === 0 ? 'FirstParagraph' : 'BodyText', textRun(p))),
    );
  };
  if (s.acknowledgements.trim()) back('Acknowledgements', s.acknowledgements);
  if (s.aboutAuthor.trim()) back('About the author', s.aboutAuthor);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W_NS}><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

const style = (id: string, name: string, pPr: string, rPr = '') =>
  `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr>${pPr}</w:pPr>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}</w:style>`;

const centered = '<w:jc w:val="center"/><w:ind w:firstLine="0"/>';

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${W_NS}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="480" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
${style('BodyText', 'Body Text', '<w:ind w:firstLine="720"/>')}
${style('FirstParagraph', 'First Paragraph', '<w:ind w:firstLine="0"/>')}
${style('ListText', 'List Text', '')}
${style('Title', 'Title', `<w:spacing w:before="4320" w:after="240"/>${centered}`, '<w:b/><w:sz w:val="40"/><w:szCs w:val="40"/>')}
${style('Subtitle', 'Subtitle', centered, '<w:i/><w:sz w:val="28"/><w:szCs w:val="28"/>')}
${style('Author', 'Author', `<w:spacing w:before="960"/>${centered}`, '<w:sz w:val="28"/><w:szCs w:val="28"/>')}
${style('Dedication', 'Dedication', `<w:spacing w:before="2880"/>${centered}`, '<w:i/>')}
${style('Epigraph', 'Epigraph', `<w:spacing w:before="2880"/>${centered}`, '<w:i/>')}
${style('EpigraphSource', 'Epigraph Source', centered)}
${style('ChapterHeading', 'Chapter Heading', `<w:keepNext/><w:pageBreakBefore/><w:spacing w:before="2880" w:after="480"/>${centered}<w:outlineLvl w:val="0"/>`, '<w:b/><w:sz w:val="32"/><w:szCs w:val="32"/>')}
${style('ChapterSubtitle', 'Chapter Subtitle', `<w:keepNext/><w:spacing w:after="480"/>${centered}`, '<w:i/>')}
${style('SceneHeading', 'Scene Heading', `<w:keepNext/>${centered}`, '<w:b/>')}
${style('SceneBreak', 'Scene Break', centered)}
</w:styles>`;

export function docxFiles(c: Compiled): ZipFile[] {
  const author = c.settings.author.trim();
  return [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    },
    {
      name: 'word/_rels/document.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: 'word/document.xml', data: documentXml(c) },
    { name: 'word/styles.xml', data: STYLES_XML },
    {
      name: 'docProps/core.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(c.title)}</dc:title>${author ? `<dc:creator>${escapeXml(author)}</dc:creator>` : ''}</cp:coreProperties>`,
    },
  ];
}

export const docxBlob = (c: Compiled) =>
  zipBlob(docxFiles(c), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

/* ----- EPUB 3 (with an NCX table of contents for older readers) ----- */

const EPUB_CSS = `body { font-family: serif; line-height: 1.5; margin: 0 5%; }
p { margin: 0; text-indent: 1.5em; }
p.first, h1 + p, h2 + p, h3 + p, .break + p, blockquote p { text-indent: 0; }
h1, h2 { text-align: center; margin: 3em 0 0.4em; font-weight: bold; }
.chapter-subtitle { text-align: center; font-style: italic; text-indent: 0; margin-bottom: 2em; }
.break { text-align: center; text-indent: 0; margin: 1em 0; }
blockquote { margin: 1em 2em; font-style: italic; }
.title-page { text-align: center; margin-top: 30%; }
.title-page h1 { font-size: 2em; margin: 0; }
.subtitle { text-align: center; text-indent: 0; font-style: italic; margin-top: 0.5em; }
.author { text-align: center; text-indent: 0; margin-top: 3em; font-size: 1.2em; }
.matter { text-align: center; margin-top: 30%; font-style: italic; }
.matter p { text-indent: 0; margin-bottom: 0.6em; }
.source { font-style: normal; }
`;

const xhtml = (title: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">
<head><meta charset="UTF-8"/><title>${escapeXml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
${body}
</body>
</html>`;

interface EpubPage {
  id: string;
  title: string;
  body: string;
  /** Listed in the table of contents. */
  toc: boolean;
}

function epubPages(c: Compiled): EpubPage[] {
  const s = c.settings;
  const breakHtml = `<p class="break">${escapeXml(sceneBreakText(c)) || '&#160;'}</p>`;
  const ps = (text: string) => paragraphs(text).map((p) => `<p>${escapeXml(p)}</p>`);
  const pages: EpubPage[] = [
    {
      id: 'title',
      title: c.title,
      toc: false,
      body: [
        '<section class="title-page" epub:type="titlepage">',
        `<h1>${escapeXml(c.title)}</h1>`,
        s.subtitle.trim() ? `<p class="subtitle">${escapeXml(s.subtitle.trim())}</p>` : '',
        s.author.trim() ? `<p class="author">${escapeXml(s.author.trim())}</p>` : '',
        '</section>',
      ].join('\n'),
    },
  ];
  if (s.dedication.trim())
    pages.push({
      id: 'dedication',
      title: 'Dedication',
      toc: false,
      body: `<section class="matter" epub:type="dedication">${ps(s.dedication).join('')}</section>`,
    });
  if (s.epigraph.trim())
    pages.push({
      id: 'epigraph',
      title: 'Epigraph',
      toc: false,
      body: `<section class="matter" epub:type="epigraph">${ps(s.epigraph).join('')}${
        s.epigraphSource.trim()
          ? `<p class="source">— ${escapeXml(s.epigraphSource.trim())}</p>`
          : ''
      }</section>`,
    });
  c.chapters.forEach((ch, i) => {
    const scenes = ch.scenes
      .map(
        (doc, j) =>
          (j > 0 ? `${breakHtml}\n` : '') + proseToHtml(doc).replaceAll('<hr/>', breakHtml),
      )
      .join('\n');
    pages.push({
      id: `chapter-${i + 1}`,
      title: ch.subheading ? `${ch.heading}: ${ch.subheading}` : ch.heading,
      toc: true,
      body: `<section epub:type="chapter">\n<h1>${escapeXml(ch.heading)}</h1>\n${
        ch.subheading ? `<p class="chapter-subtitle">${escapeXml(ch.subheading)}</p>\n` : ''
      }${scenes}\n</section>`,
    });
  });
  const back = (id: string, title: string, text: string, type: string) =>
    pages.push({
      id,
      title,
      toc: true,
      body: `<section epub:type="${type}">\n<h1>${title}</h1>\n${ps(text).join('\n')}\n</section>`,
    });
  if (s.acknowledgements.trim())
    back('acknowledgements', 'Acknowledgements', s.acknowledgements, 'acknowledgments');
  if (s.aboutAuthor.trim()) back('about', 'About the author', s.aboutAuthor, 'contributors');
  return pages;
}

export function epubFiles(c: Compiled, id: string, modified: Date): ZipFile[] {
  const pages = epubPages(c);
  const author = c.settings.author.trim();
  const when = modified.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const tocPages = pages.filter((p) => p.toc);
  return [
    // Must come first, uncompressed: readers sniff it.
    { name: 'mimetype', data: 'application/epub+zip' },
    {
      name: 'META-INF/container.xml',
      data: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
    },
    {
      name: 'OEBPS/content.opf',
      data: `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="en">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="book-id">urn:enfield-story-forge:${id}</dc:identifier>
<dc:title>${escapeXml(c.title)}</dc:title>
${author ? `<dc:creator>${escapeXml(author)}</dc:creator>` : ''}
<dc:language>en</dc:language>
<meta property="dcterms:modified">${when}</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
<item id="css" href="style.css" media-type="text/css"/>
${pages.map((p) => `<item id="${p.id}" href="${p.id}.xhtml" media-type="application/xhtml+xml"/>`).join('\n')}
</manifest>
<spine toc="ncx">
${pages.map((p) => `<itemref idref="${p.id}"/>`).join('\n')}
</spine>
</package>`,
    },
    {
      name: 'OEBPS/nav.xhtml',
      data: xhtml(
        'Contents',
        `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>\n${tocPages
          .map((p) => `<li><a href="${p.id}.xhtml">${escapeXml(p.title)}</a></li>`)
          .join('\n')}\n</ol></nav>`,
      ),
    },
    {
      name: 'OEBPS/toc.ncx',
      data: `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="urn:enfield-story-forge:${id}"/></head>
<docTitle><text>${escapeXml(c.title)}</text></docTitle>
<navMap>
${tocPages
  .map(
    (p, i) =>
      `<navPoint id="nav-${i + 1}" playOrder="${i + 1}"><navLabel><text>${escapeXml(p.title)}</text></navLabel><content src="${p.id}.xhtml"/></navPoint>`,
  )
  .join('\n')}
</navMap>
</ncx>`,
    },
    { name: 'OEBPS/style.css', data: EPUB_CSS },
    ...pages.map((p) => ({ name: `OEBPS/${p.id}.xhtml`, data: xhtml(p.title, p.body) })),
  ];
}

/** The book's EPUB. `id` (the book's id) stays the same across exports, so readers see one book. */
export const epubBlob = (c: Compiled, id: string) =>
  zipBlob(epubFiles(c, id, new Date()), 'application/epub+zip');
