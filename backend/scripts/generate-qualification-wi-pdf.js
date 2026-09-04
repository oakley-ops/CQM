/**
 * Converts docs/qualification-work-instructions.md → docs/qualification-work-instructions.pdf
 * Uses Puppeteer (already a project dependency). Screenshots are inlined as base64
 * data URIs so the resulting PDF is fully self-contained.
 *
 * Run:  node backend/scripts/generate-qualification-wi-pdf.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DOCS = path.join(ROOT, 'docs');
const MD_PATH = path.join(DOCS, 'qualification-work-instructions.md');
const OUT_PATH = path.join(DOCS, 'qualification-work-instructions.pdf');

const PAGE_H_MM = 297;
const MARGIN_TOP_MM = 28;
const MARGIN_BOT_MM = 22;
const MARGIN_SIDE_MM = 18;

// ─── helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

// Inline an image file as a base64 data URI (path resolved relative to docs/)
function imageDataUri(src) {
  const abs = path.resolve(DOCS, src);
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

// ─── Markdown → HTML ──────────────────────────────────────────────────────────

function parseMarkdown(md) {
  const lines = md.split('\n');
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Image (whole line):  ![alt](src)
    const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)\s*$/);
    if (imgMatch) {
      const alt = escapeHtml(imgMatch[1]);
      try {
        const uri = imageDataUri(imgMatch[2]);
        html.push(`<figure><img src="${uri}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`);
      } catch (e) {
        html.push(`<p><em>[missing image: ${escapeHtml(imgMatch[2])}]</em></p>`);
      }
      i++;
      continue;
    }

    // Fenced code block
    if (/^```/.test(line)) {
      i++;
      const code = [];
      while (i < lines.length && !/^```/.test(lines[i])) { code.push(escapeHtml(lines[i])); i++; }
      html.push(`<pre><code>${code.join('\n')}</code></pre>`);
      i++;
      continue;
    }

    // Blockquote / callout
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, '')); i++; }
      html.push(`<blockquote>${inlineMarkdown(escapeHtml(quote.join(' ')))}</blockquote>`);
      continue;
    }

    // Table
    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const isHeader = rows.length > 1 && /^\|[-| :]+\|/.test(rows[1]);
      html.push('<table>');
      rows.forEach((row, ri) => {
        if (ri === 1 && isHeader) return;
        const cells = row.split('|').filter((_, ci, arr) => ci > 0 && ci < arr.length - 1);
        const tag = ri === 0 && isHeader ? 'th' : 'td';
        html.push('<tr>');
        cells.forEach(cell => html.push(`<${tag}>${inlineMarkdown(cell.trim())}</${tag}>`));
        html.push('</tr>');
      });
      html.push('</table>');
      continue;
    }

    // Heading
    const hMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      const level = hMatch[1].length;
      html.push(`<h${level}>${inlineMarkdown(escapeHtml(hMatch[2]))}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { html.push('<hr>'); i++; continue; }

    // Unordered list
    if (/^(\s*)[-*] /.test(line)) {
      html.push('<ul>');
      while (i < lines.length && /^(\s*)[-*] /.test(lines[i])) {
        html.push(`<li>${inlineMarkdown(escapeHtml(lines[i].replace(/^\s*[-*] /, '')))}</li>`);
        i++;
      }
      html.push('</ul>');
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      html.push('<ol>');
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        html.push(`<li>${inlineMarkdown(escapeHtml(lines[i].replace(/^\d+\. /, '')))}</li>`);
        i++;
      }
      html.push('</ol>');
      continue;
    }

    if (line.trim() === '') { i++; continue; }

    html.push(`<p>${inlineMarkdown(escapeHtml(line))}</p>`);
    i++;
  }

  return html.join('\n');
}

// ─── HTML template ────────────────────────────────────────────────────────────

function buildHtml(bodyHtml) {
  const contentH = PAGE_H_MM - MARGIN_TOP_MM - MARGIN_BOT_MM;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 10.5pt; line-height: 1.6; color: #1a1a2e; background: #fff; }

  .cover { position: relative; width: 100%; height: ${contentH}mm; overflow: hidden;
    background: linear-gradient(150deg, #0f3460 0%, #16213e 55%, #1a1a2e 100%); color: #fff;
    padding: 52pt 60pt; display: flex; flex-direction: column; justify-content: center;
    break-after: page; page-break-after: always; }
  .cover-stripe { position: absolute; right: 0; top: 0; width: 8px; height: 100%; background: linear-gradient(180deg, #e94560 0%, #a8d8ea 100%); }
  .cover-accent { position: absolute; left: 0; top: 0; height: 5px; width: 100%; background: linear-gradient(90deg, #e94560 0%, #a8d8ea 100%); }
  .cover-badge { display: inline-block; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.22);
    border-radius: 4px; padding: 3px 11px; font-size: 7.5pt; letter-spacing: 2px; text-transform: uppercase; color: #a8d8ea; margin-bottom: 26pt; }
  .cover h1 { font-size: 27pt; font-weight: 700; line-height: 1.2; color: #fff; border: none; padding: 0; margin: 0 0 10pt; }
  .cover-subtitle { font-size: 12pt; color: rgba(255,255,255,0.7); line-height: 1.5; margin-bottom: 44pt; }
  .cover-meta { border-top: 1px solid rgba(255,255,255,0.18); padding-top: 18pt; display: flex; gap: 38pt; flex-wrap: wrap; }
  .cover-meta-item .meta-label { display: block; font-size: 6.5pt; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,0.45); margin-bottom: 3pt; }
  .cover-meta-item .meta-value { display: block; font-size: 9.5pt; color: rgba(255,255,255,0.88); }

  .content { padding: 16pt 0 0; }
  h1 { font-size: 18pt; font-weight: 700; color: #0f3460; border-bottom: 3px solid #e94560; padding-bottom: 7pt; margin: 26pt 0 13pt;
    break-before: page; page-break-before: always; break-after: avoid; page-break-after: avoid; }
  .content > h1:first-child { break-before: avoid; page-break-before: avoid; margin-top: 0; }
  h2 { font-size: 13.5pt; font-weight: 700; color: #0f3460; border-left: 4px solid #e94560; padding-left: 10pt; margin: 20pt 0 9pt; break-after: avoid; page-break-after: avoid; }
  h3 { font-size: 11.5pt; font-weight: 700; color: #1a1a2e; margin: 15pt 0 6pt; break-after: avoid; page-break-after: avoid; }
  h4 { font-size: 10pt; font-weight: 600; color: #333; margin: 12pt 0 5pt; break-after: avoid; }
  p { margin: 0 0 7pt; orphans: 3; widows: 3; }
  strong { font-weight: 700; } em { font-style: italic; }

  code { font-family: 'Cascadia Code', 'Consolas', monospace; font-size: 8.5pt; background: #f0f4ff; border: 1px solid #d0d8f0; border-radius: 3px; padding: 1px 4px; color: #b03060; }
  pre { background: #0d1117; border-left: 4px solid #e94560; border-radius: 0 5px 5px 0; padding: 13pt 15pt; margin: 8pt 0 13pt; break-inside: avoid; page-break-inside: avoid; }
  pre code { font-family: 'Cascadia Code', 'Consolas', monospace; font-size: 8pt; line-height: 1.5; background: transparent; border: none; padding: 0; color: #c9d1d9; white-space: pre-wrap; display: block; }

  blockquote { background: #fff6f0; border-left: 4px solid #e94560; border-radius: 0 5px 5px 0; padding: 9pt 13pt; margin: 9pt 0 13pt; color: #5a3a30; font-size: 10pt; break-inside: avoid; }

  table { border-collapse: collapse; width: 100%; margin: 8pt 0 14pt; font-size: 9.5pt; break-inside: avoid; page-break-inside: avoid; }
  th { background: #0f3460; color: #fff; font-weight: 600; text-align: left; padding: 7pt 10pt; border: 1px solid #0a2647; }
  td { padding: 6pt 10pt; border: 1px solid #d0d8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f5f7ff; }

  ul, ol { margin: 3pt 0 9pt 18pt; padding: 0; }
  li { margin: 2.5pt 0; padding-left: 3pt; }
  hr { border: none; border-top: 1.5px solid #e4e8f4; margin: 16pt 0; }

  figure { margin: 12pt 0 16pt; break-inside: avoid; page-break-inside: avoid; text-align: center; }
  figure img { max-width: 100%; height: auto; border: 1px solid #ccd4e6; border-radius: 6px; box-shadow: 0 2px 8px rgba(15,52,96,0.12); }
  figcaption { font-size: 8.5pt; color: #6b7280; margin-top: 5pt; font-style: italic; }
</style></head><body>

<div class="cover">
  <div class="cover-accent"></div><div class="cover-stripe"></div>
  <div class="cover-badge">Quality Work Instruction</div>
  <h1>Performing a Qualification<br>in NEXUS</h1>
  <div class="cover-subtitle">Quality Control Hub — NEXUS Qualification Hub<br>Step-by-step procedure with screenshots</div>
  <div class="cover-meta">
    <div class="cover-meta-item"><span class="meta-label">Document</span><span class="meta-value">WI-NEXUS-QUAL-001</span></div>
    <div class="cover-meta-item"><span class="meta-label">Standard</span><span class="meta-value">Mastercard CQMAP V3.A</span></div>
    <div class="cover-meta-item"><span class="meta-label">Version</span><span class="meta-value">1.0</span></div>
    <div class="cover-meta-item"><span class="meta-label">Date</span><span class="meta-value">June 2026</span></div>
  </div>
</div>

<div class="content">
${bodyHtml}
</div>
</body></html>`;
}

const HEADER_TMPL = `
<div style="width:100%;font-family:'Segoe UI',Arial,sans-serif;font-size:7.5pt;color:#999;padding:0 ${MARGIN_SIDE_MM}mm;display:table;table-layout:fixed;border-bottom:0.5px solid #e0e0e0;padding-bottom:3pt;margin-top:10mm;">
  <span style="display:table-cell;text-align:left;">WI-NEXUS-QUAL-001 — Performing a Qualification</span>
  <span style="display:table-cell;text-align:right;">CONFIDENTIAL — Internal Use Only</span>
</div>`;

const FOOTER_TMPL = `
<div style="width:100%;font-family:'Segoe UI',Arial,sans-serif;font-size:7.5pt;color:#999;padding:0 ${MARGIN_SIDE_MM}mm;display:table;table-layout:fixed;border-top:0.5px solid #e0e0e0;padding-top:3pt;margin-bottom:8mm;">
  <span style="display:table-cell;text-align:left;">Quality Control Hub · NEXUS</span>
  <span style="display:table-cell;text-align:right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`;

// ─── main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('Reading markdown…');
  const md = fs.readFileSync(MD_PATH, 'utf8');
  console.log('Converting to HTML (inlining screenshots)…');
  const fullHtml = buildHtml(parseMarkdown(md));

  console.log('Launching Puppeteer…');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1240, height: 1754 });
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

  console.log('Generating PDF…');
  await page.pdf({
    path: OUT_PATH, format: 'A4', printBackground: true, preferCSSPageSize: false,
    displayHeaderFooter: true, headerTemplate: HEADER_TMPL, footerTemplate: FOOTER_TMPL,
    margin: { top: `${MARGIN_TOP_MM}mm`, bottom: `${MARGIN_BOT_MM}mm`, left: `${MARGIN_SIDE_MM}mm`, right: `${MARGIN_SIDE_MM}mm` },
  });
  await browser.close();

  const kb = (fs.statSync(OUT_PATH).size / 1024).toFixed(1);
  console.log(`\n✓  PDF written → ${OUT_PATH}`);
  console.log(`   Size: ${kb} KB`);
})();
