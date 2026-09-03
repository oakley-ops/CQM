const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Find Chrome executable on Windows
 */
function findChromeOnWindows() {
  const possiblePaths = [
    // Chrome default installation paths
    process.env['PROGRAMFILES'] && path.join(process.env['PROGRAMFILES'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['LOCALAPPDATA'] && path.join(process.env['LOCALAPPDATA'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
    // Edge (Chromium)
    process.env['PROGRAMFILES'] && path.join(process.env['PROGRAMFILES'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    // Brave
    process.env['PROGRAMFILES'] && path.join(process.env['PROGRAMFILES'], 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    process.env['LOCALAPPDATA'] && path.join(process.env['LOCALAPPDATA'], 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
  ].filter(Boolean);

  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      logger.info(`Found Chrome/Chromium at: ${chromePath}`);
      return chromePath;
    }
  }
  return null;
}

const OVERLAY_PEEL_TEST_ID = '#3015#';
const PEEL_PAGE_LABELS = ['Card Center Data', 'Card Edge Data'];

/** Decode the encoded notes field used by OverlayPeel: "sectionId|sectionType|frontBack" */
function decodeOverlayNotes(notes) {
  const [sectionId = '', sectionType = 'Edge', frontBack = ''] = (notes || '').split('|');
  return { sectionId, sectionType, frontBack };
}

/**
 * PDF Service - Generates professional PDF reports using Puppeteer
 */
class PDFService {
  /**
   * Generate PDF from HTML content
   */
  async generatePDF(html, options = {}) {
    let browser = null;
    let page = null;

    try {
      logger.info('Launching Puppeteer browser...');

      // Build launch options
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--disable-background-networking'
        ],
        timeout: 60000
      };

      // On Windows, try to find Chrome if Puppeteer doesn't have bundled browser
      if (process.platform === 'win32') {
        const chromePath = findChromeOnWindows();
        if (chromePath) {
          launchOptions.executablePath = chromePath;
          logger.info(`Using system Chrome: ${chromePath}`);
        }
      }

      browser = await puppeteer.launch(launchOptions);

      logger.info('Browser launched successfully');

      page = await browser.newPage();
      logger.info('New page created');

      // Set viewport for better rendering
      await page.setViewport({ width: 1200, height: 800 });

      // Set content and wait for it to load
      logger.info('Setting page content...');
      await page.setContent(html, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
        timeout: 30000
      });
      logger.info('Page content loaded');

      // Generate PDF
      logger.info('Generating PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '10mm',
          bottom: '15mm',
          left: '10mm'
        },
        timeout: 30000,
        ...options
      });

      const buf = Buffer.from(pdfBuffer);
      logger.info(`PDF generated successfully, buffer size: ${buf.length} bytes`);
      return buf;
    } catch (error) {
      logger.error('Error generating PDF:', error);
      throw error;
    } finally {
      // Clean up
      if (page) {
        await page.close().catch(() => {});
      }
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * Generate Test Session Report PDF
   * @param {object} session
   * @param {object[]} entries
   * @param {Map<number,object>} metadataMap  test_definition_id → raw metadata row (including pdf_pages)
   */
  async generateSessionReport(session, entries, metadataMap = new Map()) {
    // Calculate statistics
    const totalTests = entries.length;
    const passedTests = entries.filter(e => e.pass_status === true).length;
    const failedTests = entries.filter(e => e.pass_status === false).length;
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    // Group entries by category
    const entriesByCategory = {};
    entries.forEach(entry => {
      const categoryName = entry.definition?.category?.category_name || 'Uncategorized';
      const categoryCode = entry.definition?.category?.category_code || 'N/A';
      const key = `${categoryCode}|${categoryName}`;
      if (!entriesByCategory[key]) {
        entriesByCategory[key] = { categoryName, categoryCode, entries: [] };
      }
      entriesByCategory[key].entries.push(entry);
    });

    // Format dates
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        return new Date(dateStr).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return 'N/A';
      }
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        return new Date(dateStr).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return 'N/A';
      }
    };

    // Build category sections HTML
    let categorySectionsHtml = '';
    // Collect PDF pages to append at the end of the report
    const appendixPages = []; // { label, url }[]

    Object.values(entriesByCategory).forEach(category => {
      // Split OverlayPeel entries from regular entries
      const overlayEntries = category.entries.filter(e => e.definition?.test_id === OVERLAY_PEEL_TEST_ID);
      const regularEntries = category.entries.filter(e => e.definition?.test_id !== OVERLAY_PEEL_TEST_ID);

      // ── Regular entries table ──
      let regularTableHtml = '';
      if (regularEntries.length > 0) {
        let rowsHtml = '';
        regularEntries.forEach(entry => {
          const testCode = entry.definition?.test_code || entry.definition?.test_id || 'N/A';
          const testName = entry.definition?.test_name || 'N/A';
          const unit = entry.definition?.unit_of_measure || entry.definition?.unit_of_measurement || '';

          let valueHtml = '-';
          if (entry.measurement_value !== null && entry.measurement_value !== undefined) {
            valueHtml = `${entry.measurement_value}${unit ? ' ' + unit : ''}`;
          } else if (entry.assessment_value) {
            valueHtml = entry.assessment_value;
          }

          let resultHtml = '<span class="result-pending">PENDING</span>';
          if (entry.pass_status === true) {
            resultHtml = '<span class="result-pass">PASS</span>';
          } else if (entry.pass_status === false) {
            resultHtml = '<span class="result-fail">FAIL</span>';
          }
          if (entry.retest_required) {
            resultHtml += ' <span class="retest-badge">RETEST</span>';
          }

          rowsHtml += `
            <tr>
              <td class="test-code">${testCode}</td>
              <td>${testName}</td>
              <td class="value-cell">${valueHtml}</td>
              <td>${resultHtml}</td>
              <td class="notes-cell">${entry.notes || '-'}</td>
            </tr>
          `;
        });

        regularTableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width:15%">Test Code</th>
                <th style="width:25%">Test Name</th>
                <th style="width:15%">Value</th>
                <th style="width:12%">Result</th>
                <th style="width:33%">Notes</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        `;
      }

      // ── OverlayPeel specialized table ──
      let overlayHtml = '';
      if (overlayEntries.length > 0) {
        const defId = overlayEntries[0].test_definition_id;
        const metadata = metadataMap.get(defId);

        // Collect stored PDF pages for the appendix
        if (metadata && Array.isArray(metadata.pdf_pages) && metadata.pdf_pages.length > 0) {
          metadata.pdf_pages.forEach((url, i) => {
            appendixPages.push({ label: PEEL_PAGE_LABELS[i] || `Page ${i + 1}`, url });
          });
        }

        // Metadata header row
        const metaItems = [];
        if (metadata) {
          if (metadata.sampled_by) metaItems.push(`<b>Sampled By:</b> ${metadata.sampled_by}`);
          if (metadata.technician) metaItems.push(`<b>Technician:</b> ${metadata.technician}`);
          if (metadata.temperature_c != null) metaItems.push(`<b>Temp:</b> ${metadata.temperature_c}°C`);
          if (metadata.humidity_pct != null) metaItems.push(`<b>Humidity:</b> ${metadata.humidity_pct}%`);
          if (metadata.extra_data?.testCategory) metaItems.push(`<b>Test Category:</b> ${metadata.extra_data.testCategory}`);
        }
        const metaHtml = metaItems.length > 0
          ? `<div style="font-size:9px;color:#555;margin:6px 0;">${metaItems.join(' &nbsp;·&nbsp; ')}</div>`
          : '';
        const jobNotesHtml = metadata?.job_notes
          ? `<div style="font-size:9px;color:#666;font-style:italic;margin-bottom:6px;">Notes: ${metadata.job_notes}</div>`
          : '';

        let overlayRowsHtml = '';
        overlayEntries.forEach(e => {
          const { sectionId, sectionType, frontBack } = decodeOverlayNotes(e.notes);
          const minPeel = e.measurement_value != null ? parseFloat(e.measurement_value).toFixed(2) : '-';
          const maxPeel = e.secondary_measurement_value != null ? parseFloat(e.secondary_measurement_value).toFixed(2) : '-';
          const threshold = sectionType === 'Center' ? '≥ 3.5' : '≥ 5.0';
          let resultHtml = '<span style="color:#999">—</span>';
          if (e.pass_status === true) resultHtml = '<span class="result-pass">PASS</span>';
          else if (e.pass_status === false) resultHtml = '<span class="result-fail">FAIL</span>';

          overlayRowsHtml += `
            <tr>
              <td>${sectionId || '—'}</td>
              <td style="text-align:center">${sectionType}</td>
              <td style="text-align:center">${frontBack || '—'}</td>
              <td style="text-align:center;font-weight:bold">${minPeel}</td>
              <td style="text-align:center">${maxPeel}</td>
              <td style="text-align:center;font-size:9px;color:#888">${threshold}</td>
              <td style="text-align:center">${resultHtml}</td>
            </tr>
          `;
        });

        const defName = overlayEntries[0].definition?.test_name || 'Overlay Peel Strength';
        overlayHtml = `
          <div style="margin-top:${regularEntries.length > 0 ? '12px' : '0'}">
            <div style="font-size:10px;font-weight:bold;color:#1565c0;margin-bottom:2px;">${defName}</div>
            ${metaHtml}${jobNotesHtml}
            <table>
              <thead>
                <tr style="background:#fff8e1">
                  <th style="width:14%">Section ID</th>
                  <th style="width:10%;text-align:center">Type</th>
                  <th style="width:12%;text-align:center">Front/Back</th>
                  <th style="width:16%;text-align:center">Min Peel (N/cm)</th>
                  <th style="width:16%;text-align:center">Max Peel (N/cm)</th>
                  <th style="width:12%;text-align:center">Threshold</th>
                  <th style="width:10%;text-align:center">Result</th>
                </tr>
              </thead>
              <tbody>${overlayRowsHtml}</tbody>
            </table>
          </div>
        `;
      }

      categorySectionsHtml += `
        <div class="category-section">
          <div class="category-header">
            <span class="category-name">${category.categoryName}</span>
            <span class="category-code">${category.categoryCode}</span>
          </div>
          ${regularTableHtml}
          ${overlayHtml}
        </div>
      `;
    });

    if (Object.keys(entriesByCategory).length === 0) {
      categorySectionsHtml = '<p style="text-align: center; color: #666; padding: 20px;">No test entries recorded.</p>';
    }

    // Build appendix section (PDF graphs)
    let appendixHtml = '';
    if (appendixPages.length > 0) {
      const imagesHtml = appendixPages.map(({ label, url }) => `
        <div style="margin-bottom:20px;page-break-inside:avoid;">
          <div style="font-size:10px;font-weight:bold;color:#555;margin-bottom:5px;">${label}</div>
          <img src="${url}" style="width:100%;border:1px solid #ddd;border-radius:3px;display:block;" />
        </div>
      `).join('');

      appendixHtml = `
        <div class="section" style="page-break-before:always;">
          <div class="section-title">Appendix: Peel Strength Graphs</div>
          ${imagesHtml}
        </div>
      `;
    }

    // Build approval section HTML
    let approvalHtml = '';
    if (session.status === 'approved' || session.status === 'submitted') {
      let approvalItems = '';
      if (session.submitted_at) {
        approvalItems += `
          <div class="info-item">
            <div class="info-label">Submitted At</div>
            <div class="info-value">${formatDateTime(session.submitted_at)}</div>
          </div>
        `;
      }
      if (session.approved_at) {
        approvalItems += `
          <div class="info-item">
            <div class="info-label">Approved At</div>
            <div class="info-value">${formatDateTime(session.approved_at)}</div>
          </div>
        `;
      }
      if (session.approver) {
        approvalItems += `
          <div class="info-item">
            <div class="info-label">Approved By</div>
            <div class="info-value">${session.approver.first_name} ${session.approver.last_name}</div>
          </div>
        `;
      }
      if (approvalItems) {
        approvalHtml = `
          <div class="section">
            <div class="section-title">Approval Information</div>
            <div class="info-grid">${approvalItems}</div>
          </div>
        `;
      }
    }

    // Build general notes HTML
    let notesHtml = '';
    if (session.general_notes) {
      notesHtml = `
        <div class="general-notes">
          <div class="general-notes-title">General Notes</div>
          <div class="general-notes-content">${session.general_notes}</div>
        </div>
      `;
    }

    // Generate complete HTML
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Test Session Report - ${session.session_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      background: #fff;
    }
    .header {
      background: #1976d2;
      color: white;
      padding: 20px 25px;
      margin-bottom: 20px;
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header h1 {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .header .subtitle {
      font-size: 12px;
      opacity: 0.9;
    }
    .header .session-number {
      background: rgba(255,255,255,0.2);
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: bold;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 8px;
    }
    .status-draft { background: #9e9e9e; }
    .status-submitted { background: #2196f3; }
    .status-approved { background: #4caf50; }
    .status-rejected { background: #f44336; }
    .content {
      padding: 0 25px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      color: #1976d2;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 2px solid #e3f2fd;
    }
    .info-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .info-item {
      flex: 1 1 23%;
      min-width: 120px;
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      border-left: 3px solid #1976d2;
    }
    .info-label {
      font-size: 9px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 3px;
    }
    .info-value {
      font-size: 11px;
      font-weight: bold;
      color: #333;
    }
    .stats-grid {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-card {
      flex: 1;
      text-align: center;
      padding: 15px 10px;
      border-radius: 6px;
      background: #f5f5f5;
    }
    .stat-card.total { border-top: 3px solid #1976d2; }
    .stat-card.passed { border-top: 3px solid #4caf50; }
    .stat-card.failed { border-top: 3px solid #f44336; }
    .stat-card.rate { border-top: 3px solid #ff9800; }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
    }
    .stat-card.total .stat-value { color: #1976d2; }
    .stat-card.passed .stat-value { color: #4caf50; }
    .stat-card.failed .stat-value { color: #f44336; }
    .stat-card.rate .stat-value { color: #ff9800; }
    .stat-label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .category-section {
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .category-header {
      background: #e3f2fd;
      padding: 8px 12px;
      border-radius: 4px 4px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .category-name {
      font-size: 12px;
      font-weight: bold;
      color: #1565c0;
    }
    .category-code {
      background: #1976d2;
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      background: #fafafa;
      padding: 8px 6px;
      text-align: left;
      font-weight: bold;
      color: #555;
      border-bottom: 2px solid #ddd;
    }
    td {
      padding: 8px 6px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .result-pass {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: bold;
      font-size: 9px;
      display: inline-block;
    }
    .result-fail {
      background: #ffebee;
      color: #c62828;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: bold;
      font-size: 9px;
      display: inline-block;
    }
    .result-pending {
      background: #fff3e0;
      color: #e65100;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: bold;
      font-size: 9px;
      display: inline-block;
    }
    .retest-badge {
      background: #fff3e0;
      color: #e65100;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 8px;
      font-weight: bold;
      margin-left: 4px;
    }
    .test-code {
      font-family: monospace;
      font-size: 9px;
      color: #666;
    }
    .notes-cell {
      font-size: 9px;
      color: #666;
      font-style: italic;
      max-width: 150px;
      word-wrap: break-word;
    }
    .value-cell {
      font-weight: bold;
    }
    .general-notes {
      background: #fffde7;
      border-left: 3px solid #ffc107;
      padding: 10px 12px;
      margin-top: 12px;
      border-radius: 0 4px 4px 0;
    }
    .general-notes-title {
      font-weight: bold;
      margin-bottom: 4px;
      color: #f57c00;
      font-size: 11px;
    }
    .general-notes-content {
      white-space: pre-wrap;
      color: #666;
      font-size: 10px;
    }
    .signature-section {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      gap: 20px;
    }
    .signature-box {
      flex: 1;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-bottom: 4px;
      margin-top: 35px;
    }
    .signature-label {
      font-size: 9px;
      color: #666;
    }
    .footer {
      margin-top: 25px;
      padding: 15px 25px;
      background: #f5f5f5;
      border-top: 1px solid #ddd;
    }
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <div>
        <h1>Quality Test Session Report</h1>
        <div class="subtitle">Card Quality Management System</div>
        <span class="status-badge status-${session.status}">${session.status.toUpperCase()}</span>
      </div>
      <div class="session-number">${session.session_number}</div>
    </div>
  </div>

  <div class="content">
    <div class="section">
      <div class="section-title">Session Information</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Card Type</div>
          <div class="info-value">${session.card_type || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Manufacturing Stage</div>
          <div class="info-value">${session.manufacturing_stage || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Batch/Lot Number</div>
          <div class="info-value">${session.batch_lot_number || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Test Date</div>
          <div class="info-value">${formatDate(session.test_date)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Card Serial Number</div>
          <div class="info-value">${session.card_serial_number || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Equipment ID</div>
          <div class="info-value">${session.equipment_id || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Inspector</div>
          <div class="info-value">${session.inspector ? session.inspector.first_name + ' ' + session.inspector.last_name : 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Report Generated</div>
          <div class="info-value">${formatDateTime(new Date().toISOString())}</div>
        </div>
      </div>
      ${notesHtml}
    </div>

    <div class="section">
      <div class="section-title">Test Summary</div>
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-value">${totalTests}</div>
          <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat-card passed">
          <div class="stat-value">${passedTests}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat-card failed">
          <div class="stat-value">${failedTests}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat-card rate">
          <div class="stat-value">${passRate}%</div>
          <div class="stat-label">Pass Rate</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Test Results by Category</div>
      ${categorySectionsHtml}
    </div>

    ${approvalHtml}

    ${appendixHtml}

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Inspector Signature</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">QC Manager Signature</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Date</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-content">
      <div>Card Quality Management System - Confidential</div>
      <div>Generated: ${formatDateTime(new Date().toISOString())}</div>
    </div>
  </div>
</body>
</html>`;

    return this.generatePDF(html);
  }
}

// Export singleton instance
module.exports = new PDFService();
