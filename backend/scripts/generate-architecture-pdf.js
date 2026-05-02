/**
 * Converts docs/architecture-blueprint.md → docs/architecture-blueprint.pdf
 * Uses Puppeteer (already a project dependency) — no extra packages needed.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MD_PATH = path.join(ROOT, 'docs', 'architecture-blueprint.md');
const OUT_PATH = path.join(ROOT, 'docs', 'architecture-blueprint.pdf');

// A4 dimensions in mm
const PAGE_H_MM = 297;
const MARGIN_TOP_MM = 28;
const MARGIN_BOT_MM = 22;
const MARGIN_SIDE_MM = 18;

// ─── Minimal Markdown → HTML converter ───────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function parseMarkdown(md) {
  const lines = md.split('\n');
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ──────────────────────────────────────────────────
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, '').trim();
      i++;
      const codeLines = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      const cls = lang ? ` class="language-${lang}"` : '';
      html.push(`<pre><code${cls}>${codeLines.join('\n')}</code></pre>`);
      i++;
      continue;
    }

    // ── Table ──────────────────────────────────────────────────────────────
    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i]);
        i++;
      }
      const isHeader = rows.length > 1 && /^\|[-| :]+\|/.test(rows[1]);
      html.push('<table>');
      rows.forEach((row, ri) => {
        if (ri === 1 && isHeader) return; // skip separator row
        const cells = row.split('|').filter((_, ci, arr) => ci > 0 && ci < arr.length - 1);
        const tag = ri === 0 && isHeader ? 'th' : 'td';
        html.push('<tr>');
        cells.forEach(cell => html.push(`<${tag}>${inlineMarkdown(cell.trim())}</${tag}>`));
        html.push('</tr>');
      });
      html.push('</table>');
      continue;
    }

    // ── Heading ────────────────────────────────────────────────────────────
    const hMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = inlineMarkdown(escapeHtml(hMatch[2]));
      html.push(`<h${level}>${text}</h${level}>`);
      i++;
      continue;
    }

    // ── Horizontal rule ────────────────────────────────────────────────────
    if (/^---+$/.test(line.trim())) {
      html.push('<hr>');
      i++;
      continue;
    }

    // ── Unordered list ─────────────────────────────────────────────────────
    if (/^(\s*)[-*] /.test(line)) {
      html.push('<ul>');
      while (i < lines.length && /^(\s*)[-*] /.test(lines[i])) {
        const item = lines[i].replace(/^\s*[-*] /, '');
        html.push(`<li>${inlineMarkdown(escapeHtml(item))}</li>`);
        i++;
      }
      html.push('</ul>');
      continue;
    }

    // ── Ordered list ───────────────────────────────────────────────────────
    if (/^\d+\. /.test(line)) {
      html.push('<ol>');
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const item = lines[i].replace(/^\d+\. /, '');
        html.push(`<li>${inlineMarkdown(escapeHtml(item))}</li>`);
        i++;
      }
      html.push('</ol>');
      continue;
    }

    // ── Blank line ─────────────────────────────────────────────────────────
    if (line.trim() === '') {
      i++;
      continue;
    }

    // ── Paragraph ──────────────────────────────────────────────────────────
    html.push(`<p>${inlineMarkdown(escapeHtml(line))}</p>`);
    i++;
  }

  return html.join('\n');
}

// ─── HTML template ────────────────────────────────────────────────────────────

function buildHtml(bodyHtml) {
  // Content area height = page height minus both margins (used to size the cover)
  const contentH = PAGE_H_MM - MARGIN_TOP_MM - MARGIN_BOT_MM;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  /* ── Reset ───────────────────────────────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 10.5pt;
    line-height: 1.65;
    color: #1a1a2e;
    background: #fff;
  }

  /* ── Cover page ─────────────────────────────────────────────────────────── */
  /*
   * height = full printable content area so the cover fills exactly one page.
   * No @page margin: 0 trick needed — Puppeteer's margin option controls spacing.
   * position:relative is required so the absolute stripe child stays contained.
   */
  .cover {
    position: relative;
    width: 100%;
    height: ${contentH}mm;
    overflow: hidden;
    background: linear-gradient(150deg, #0f3460 0%, #16213e 55%, #1a1a2e 100%);
    color: #fff;
    padding: 52pt 60pt 48pt 60pt;
    display: flex;
    flex-direction: column;
    justify-content: center;
    break-after: page;
    page-break-after: always;
  }

  /* Decorative right-edge stripe — contained by position:relative on .cover */
  .cover-stripe {
    position: absolute;
    right: 0;
    top: 0;
    width: 8px;
    height: 100%;
    background: linear-gradient(180deg, #e94560 0%, #a8d8ea 100%);
  }

  /* Decorative top accent bar */
  .cover-accent {
    position: absolute;
    left: 0;
    top: 0;
    height: 5px;
    width: 100%;
    background: linear-gradient(90deg, #e94560 0%, #a8d8ea 100%);
  }

  .cover-badge {
    display: inline-block;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 4px;
    padding: 3px 11px;
    font-size: 7.5pt;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #a8d8ea;
    margin-bottom: 26pt;
  }

  .cover h1 {
    font-size: 28pt;
    font-weight: 700;
    line-height: 1.2;
    color: #fff;
    border: none;
    padding: 0;
    margin: 0 0 10pt 0;
    page-break-before: avoid;
    break-before: avoid;
  }

  .cover-subtitle {
    font-size: 12pt;
    color: rgba(255,255,255,0.7);
    line-height: 1.5;
    margin-bottom: 44pt;
  }

  .cover-meta {
    border-top: 1px solid rgba(255,255,255,0.18);
    padding-top: 18pt;
    display: flex;
    gap: 44pt;
  }

  .cover-meta-item .meta-label {
    display: block;
    font-size: 6.5pt;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
    margin-bottom: 3pt;
  }

  .cover-meta-item .meta-value {
    display: block;
    font-size: 9.5pt;
    color: rgba(255,255,255,0.88);
  }

  /* ── Content wrapper ─────────────────────────────────────────────────────── */
  .content {
    padding: 16pt 0 0 0;
  }

  /* ── Headings ────────────────────────────────────────────────────────────── */
  h1 {
    font-size: 19pt;
    font-weight: 700;
    color: #0f3460;
    border-bottom: 3px solid #e94560;
    padding-bottom: 7pt;
    margin: 28pt 0 14pt;
    break-before: page;
    page-break-before: always;
    break-after: avoid;
    page-break-after: avoid;
  }

  /* First h1 in content should NOT force a page break */
  .content > h1:first-child {
    break-before: avoid;
    page-break-before: avoid;
    margin-top: 0;
  }

  h2 {
    font-size: 13.5pt;
    font-weight: 700;
    color: #0f3460;
    border-left: 4px solid #e94560;
    padding-left: 10pt;
    margin: 22pt 0 9pt;
    break-after: avoid;
    page-break-after: avoid;
  }

  h3 {
    font-size: 11pt;
    font-weight: 700;
    color: #1a1a2e;
    margin: 16pt 0 7pt;
    break-after: avoid;
    page-break-after: avoid;
  }

  h4 {
    font-size: 10pt;
    font-weight: 600;
    color: #333;
    margin: 12pt 0 5pt;
    break-after: avoid;
    page-break-after: avoid;
  }

  /* ── Body text ───────────────────────────────────────────────────────────── */
  p {
    margin: 0 0 7pt;
    orphans: 3;
    widows: 3;
  }

  strong { font-weight: 700; }
  em     { font-style: italic; }

  /* ── Inline code ─────────────────────────────────────────────────────────── */
  code {
    font-family: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
    font-size: 8.5pt;
    background: #f0f4ff;
    border: 1px solid #d0d8f0;
    border-radius: 3px;
    padding: 1px 4px;
    color: #b03060;
  }

  /* ── Code blocks ─────────────────────────────────────────────────────────── */
  pre {
    background: #0d1117;
    border-left: 4px solid #e94560;
    border-radius: 0 5px 5px 0;
    padding: 13pt 15pt;
    margin: 8pt 0 13pt;
    /*
     * overflow:visible + white-space:pre-wrap lets long lines wrap rather than
     * overflow off the page edge — prevents text from bleeding outside the box.
     */
    overflow: visible;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  pre code {
    font-family: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
    font-size: 7.5pt;
    line-height: 1.55;
    background: transparent;
    border: none;
    padding: 0;
    color: #c9d1d9;
    white-space: pre-wrap;
    word-break: break-all;
    display: block;
  }

  /* ── Tables ──────────────────────────────────────────────────────────────── */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 8pt 0 14pt;
    font-size: 9.5pt;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  th {
    background: #0f3460;
    color: #fff;
    font-weight: 600;
    text-align: left;
    padding: 7pt 10pt;
    border: 1px solid #0a2647;
  }

  td {
    padding: 6pt 10pt;
    border: 1px solid #d0d8f0;
    vertical-align: top;
  }

  tr:nth-child(even) td { background: #f5f7ff; }

  /* ── Lists ───────────────────────────────────────────────────────────────── */
  ul, ol {
    margin: 3pt 0 9pt 18pt;
    padding: 0;
  }

  li {
    margin: 2.5pt 0;
    padding-left: 3pt;
  }

  li code { font-size: 8pt; }

  /* ── Dividers ────────────────────────────────────────────────────────────── */
  hr {
    border: none;
    border-top: 1.5px solid #e4e8f4;
    margin: 18pt 0;
  }

</style>
</head>
<body>

<!-- ═══════════════════════ COVER PAGE ═══════════════════════════════════════ -->
<div class="cover">
  <div class="cover-accent"></div>
  <div class="cover-stripe"></div>

  <div class="cover-badge">Internal Technical Documentation</div>

  <h1>CQM System<br>Architectural Blueprint</h1>

  <div class="cover-subtitle">
    Card Quality Management Tracking System<br>
    Full-stack architecture reference for development and operations
  </div>

  <div class="cover-meta">
    <div class="cover-meta-item">
      <span class="meta-label">Stack</span>
      <span class="meta-value">Node.js · Express · PostgreSQL · React 18 · TypeScript</span>
    </div>
    <div class="cover-meta-item">
      <span class="meta-label">Date</span>
      <span class="meta-value">April 2026</span>
    </div>
    <div class="cover-meta-item">
      <span class="meta-label">Version</span>
      <span class="meta-value">1.0</span>
    </div>
  </div>
</div>

<!-- ═══════════════════════ MAIN CONTENT ═════════════════════════════════════ -->
<div class="content">
${bodyHtml}
</div>

</body>
</html>`;
}

// ─── Header / Footer templates ────────────────────────────────────────────────
// Puppeteer header/footer templates run in an isolated context.
// Rules: no external fonts, no flex (unreliable), use table or float layout,
// set font-size on the outermost element (not inherited).

const HEADER_TMPL = `
<div style="
  width: 100%;
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: 7.5pt;
  color: #999;
  padding: 0 ${MARGIN_SIDE_MM}mm;
  display: table;
  table-layout: fixed;
  border-bottom: 0.5px solid #e0e0e0;
  padding-bottom: 3pt;
  margin-top: 10mm;
">
  <span style="display:table-cell; text-align:left;">CQM Architectural Blueprint</span>
  <span style="display:table-cell; text-align:right;">CONFIDENTIAL — Internal Use Only</span>
</div>`;

const FOOTER_TMPL = `
<div style="
  width: 100%;
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: 7.5pt;
  color: #999;
  padding: 0 ${MARGIN_SIDE_MM}mm;
  display: table;
  table-layout: fixed;
  border-top: 0.5px solid #e0e0e0;
  padding-top: 3pt;
  margin-bottom: 8mm;
">
  <span style="display:table-cell; text-align:left;">Card Quality Management System</span>
  <span style="display:table-cell; text-align:right;">
    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
  </span>
</div>`;

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('Reading markdown…');
  const md = fs.readFileSync(MD_PATH, 'utf8');

  console.log('Converting to HTML…');
  const bodyHtml = parseMarkdown(md);
  const fullHtml = buildHtml(bodyHtml);

  // Uncomment to inspect the intermediate HTML:
  // fs.writeFileSync(OUT_PATH.replace('.pdf', '.html'), fullHtml);

  console.log('Launching Puppeteer…');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Use a wide viewport so code blocks don't wrap during rendering
  await page.setViewport({ width: 1240, height: 1754 });

  console.log('Rendering HTML…');
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

  console.log('Generating PDF…');
  await page.pdf({
    path: OUT_PATH,
    format: 'A4',
    printBackground: true,
    // preferCSSPageSize: false ensures Puppeteer's margin option wins over any
    // stray @page rules (there are none in our template, but belt-and-suspenders).
    preferCSSPageSize: false,
    displayHeaderFooter: true,
    headerTemplate: HEADER_TMPL,
    footerTemplate: FOOTER_TMPL,
    // Margins must be large enough to contain the header/footer templates.
    // The header/footer HTML is stamped inside these margin bands.
    margin: {
      top:    `${MARGIN_TOP_MM}mm`,
      bottom: `${MARGIN_BOT_MM}mm`,
      left:   `${MARGIN_SIDE_MM}mm`,
      right:  `${MARGIN_SIDE_MM}mm`,
    },
  });

  await browser.close();

  const stat = fs.statSync(OUT_PATH);
  const kb = (stat.size / 1024).toFixed(1);
  console.log(`\n✓  PDF written → ${OUT_PATH}`);
  console.log(`   Size: ${kb} KB`);
  console.log(`   Margins: top ${MARGIN_TOP_MM}mm / bottom ${MARGIN_BOT_MM}mm / sides ${MARGIN_SIDE_MM}mm`);
})();
