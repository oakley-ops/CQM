/**
 * Generates NEXUS-Hub-Work-Instruction.pdf from the markdown source.
 * Run from docs/nexus-work-instruction/:
 *   node generate-pdf.js
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('../../backend/node_modules/puppeteer');

const dir = __dirname;
const mdPath = path.join(dir, 'NEXUS-Hub-Work-Instruction.md');
const outPath = path.join(dir, 'NEXUS-Hub-Work-Instruction.pdf');

const md = fs.readFileSync(mdPath, 'utf8');

// Minimal markdown → HTML conversion (tables, headings, code, bold, italic, images, lists, hr, links)
function mdToHtml(text) {
  let html = text;

  // Fenced code blocks
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Tables
  html = html.replace(/^\|(.+)\|\s*\n\|[-| :]+\|\s*\n((?:\|.+\|\s*\n)*)/gm, (_, header, body) => {
    const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const tds = row.split('|').filter(c => c !== '').map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('\n');
    return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>\n`;
  });

  // Headings
  html = html.replace(/^#{6} (.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#{5} (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#{4} (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^#{3} (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#{2} (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Images (before links)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const abs = path.join(dir, src).replace(/\\/g, '/');
    return `<img src="file:///${abs}" alt="${alt}" style="max-width:100%;border:1px solid #ddd;border-radius:4px;margin:12px 0;">`;
  });

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Unordered lists
  html = html.replace(/((?:^- .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('');
    return `<ul>${items}</ul>\n`;
  });

  // Ordered lists
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol>${items}</ol>\n`;
  });

  // Paragraphs (double newline)
  html = html.replace(/\n\n(?!<[htuobp])/g, '\n<br>\n');

  return html;
}

const body = mdToHtml(md);

const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.55;
    color: #222;
    padding: 0;
  }
  h1 { font-size: 20pt; color: #1565c0; border-bottom: 3px solid #1565c0; padding-bottom: 6px; margin: 24px 0 12px; }
  h2 { font-size: 14pt; color: #1565c0; border-bottom: 1.5px solid #bbdefb; padding-bottom: 4px; margin: 20px 0 10px; }
  h3 { font-size: 12pt; color: #1976d2; margin: 16px 0 8px; }
  h4 { font-size: 11pt; color: #333; margin: 12px 0 6px; }
  h5, h6 { font-size: 10pt; color: #555; margin: 10px 0 4px; }
  p, li { margin-bottom: 4px; }
  ul, ol { padding-left: 22px; margin: 6px 0 10px; }
  li { margin-bottom: 3px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
    font-size: 9pt;
  }
  th {
    background: #1565c0;
    color: white;
    padding: 6px 8px;
    text-align: left;
    font-weight: 600;
  }
  td {
    padding: 5px 8px;
    border: 1px solid #ddd;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #f5f8ff; }
  code {
    background: #f0f0f0;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: 'Consolas', monospace;
    font-size: 8.5pt;
  }
  pre {
    background: #f4f4f4;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    margin: 8px 0;
    overflow: auto;
    font-size: 8pt;
  }
  pre code { background: none; padding: 0; }
  blockquote {
    border-left: 4px solid #1976d2;
    background: #e3f2fd;
    padding: 8px 12px;
    margin: 10px 0;
    border-radius: 0 4px 4px 0;
    font-style: normal;
  }
  hr {
    border: none;
    border-top: 1px solid #ccc;
    margin: 20px 0;
  }
  img {
    max-width: 100%;
    display: block;
    margin: 12px auto;
  }
  a { color: #1565c0; }
  .cover {
    text-align: center;
    padding: 60px 40px;
    background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
    color: white;
    margin-bottom: 30px;
    border-radius: 8px;
  }
  .cover h1 { color: white; border-bottom: 2px solid rgba(255,255,255,0.4); font-size: 26pt; margin: 0 0 16px; }
  .cover .meta { font-size: 10pt; opacity: 0.9; margin-top: 6px; }
  .content { padding: 0 10px; }
  strong { font-weight: 700; }
  em { font-style: italic; }
</style>
</head>
<body>
<div class="cover">
  <h1>NEXUS Hub</h1>
  <h2 style="color:rgba(255,255,255,0.85);border:none;font-size:14pt;">Work Instruction</h2>
  <div class="meta">Document ID: WI-NEXUS-001 &nbsp;|&nbsp; Revision: 1.0 &nbsp;|&nbsp; Effective: 2026-05-04</div>
  <div class="meta">Owner: Quality Systems &nbsp;|&nbsp; Classification: Internal</div>
  <div class="meta" style="margin-top:20px;font-size:9pt;opacity:0.7;">Mastercard CQMAP V3.A Vendor Audit Management</div>
</div>
<div class="content">
${body}
</div>
</body>
</html>`;

const htmlPath = path.join(dir, '_temp.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: outPath,
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' },
    printBackground: true,
  });
  await browser.close();
  fs.unlinkSync(htmlPath);
  console.log('PDF generated:', outPath);
})();
