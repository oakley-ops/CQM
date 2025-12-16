const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

/**
 * PDF Generator Utility
 * Generates professional PDF reports for the PMBOK system
 */

class PDFGenerator {
  constructor() {
    this.pageWidth = 595.28; // A4 width in points
    this.pageHeight = 841.89; // A4 height in points
    this.margin = 50;
    this.contentWidth = this.pageWidth - (2 * this.margin);
  }

  /**
   * Generate Status Report PDF
   */
  async generateStatusReport(data) {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);
    let yPosition = this.pageHeight - this.margin;

    // Helper function to add new page if needed
    const checkPageBreak = (requiredSpace) => {
      if (yPosition - requiredSpace < this.margin) {
        page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);
        yPosition = this.pageHeight - this.margin;
        return true;
      }
      return false;
    };

    // Helper function to draw text
    const drawText = (text, x, y, options = {}) => {
      const {
        font = helvetica,
        size = 12,
        color = rgb(0, 0, 0),
        maxWidth = this.contentWidth
      } = options;

      page.drawText(text, {
        x,
        y,
        size,
        font,
        color,
        maxWidth
      });
    };

    // Helper function to wrap text
    const wrapText = (text, maxWidth, font, fontSize) => {
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    };

    // Title
    drawText('PROJECT STATUS REPORT', this.margin, yPosition, {
      font: helveticaBold,
      size: 24,
      color: rgb(0.2, 0.3, 0.6)
    });
    yPosition -= 40;

    // Project Information
    drawText(`Project: ${data.project.name}`, this.margin, yPosition, {
      font: helveticaBold,
      size: 14
    });
    yPosition -= 25;

    drawText(`Report Period: ${data.period || 'Weekly'}`, this.margin, yPosition, {
      font: helvetica,
      size: 12
    });
    yPosition -= 20;

    drawText(`Generated: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, this.margin, yPosition, {
      font: helvetica,
      size: 12,
      color: rgb(0.4, 0.4, 0.4)
    });
    yPosition -= 40;

    // Overall Status Section
    checkPageBreak(100);
    drawText('OVERALL PROJECT STATUS', this.margin, yPosition, {
      font: helveticaBold,
      size: 16,
      color: rgb(0.2, 0.3, 0.6)
    });
    yPosition -= 5;

    // Draw line under section header
    page.drawLine({
      start: { x: this.margin, y: yPosition },
      end: { x: this.pageWidth - this.margin, y: yPosition },
      thickness: 2,
      color: rgb(0.2, 0.3, 0.6)
    });
    yPosition -= 25;

    // Status indicator
    const statusColor = data.overallStatus?.color === 'green' ? rgb(0.2, 0.7, 0.3) :
                       data.overallStatus?.color === 'yellow' ? rgb(0.9, 0.7, 0.1) :
                       rgb(0.9, 0.2, 0.2);

    page.drawRectangle({
      x: this.margin,
      y: yPosition - 15,
      width: 20,
      height: 20,
      color: statusColor
    });

    drawText(`Status: ${data.overallStatus?.label || 'ON TRACK'}`, this.margin + 30, yPosition, {
      font: helveticaBold,
      size: 12
    });
    yPosition -= 40;

    // Key Metrics Section
    checkPageBreak(200);
    drawText('KEY METRICS', this.margin, yPosition, {
      font: helveticaBold,
      size: 16,
      color: rgb(0.2, 0.3, 0.6)
    });
    yPosition -= 5;

    page.drawLine({
      start: { x: this.margin, y: yPosition },
      end: { x: this.pageWidth - this.margin, y: yPosition },
      thickness: 2,
      color: rgb(0.2, 0.3, 0.6)
    });
    yPosition -= 25;

    // Budget Metrics
    if (data.budget) {
      drawText('Budget:', this.margin, yPosition, {
        font: helveticaBold,
        size: 12
      });
      yPosition -= 20;

      drawText(`  • Planned: $${data.budget.planned}`, this.margin + 10, yPosition, {
        font: helvetica,
        size: 11
      });
      yPosition -= 18;

      drawText(`  • Actual: $${data.budget.actual}`, this.margin + 10, yPosition, {
        font: helvetica,
        size: 11
      });
      yPosition -= 18;

      drawText(`  • Variance: $${data.budget.variance} (${data.budget.variancePercent}%)`, this.margin + 10, yPosition, {
        font: helvetica,
        size: 11,
        color: data.budget.variancePercent < 0 ? rgb(0.9, 0.2, 0.2) : rgb(0.2, 0.7, 0.3)
      });
      yPosition -= 25;
    }

    // Schedule Metrics
    if (data.schedule) {
      drawText('Schedule:', this.margin, yPosition, {
        font: helveticaBold,
        size: 12
      });
      yPosition -= 20;

      drawText(`  • Total Tasks: ${data.schedule.totalTasks}`, this.margin + 10, yPosition, {
        font: helvetica,
        size: 11
      });
      yPosition -= 18;

      drawText(`  • Completed: ${data.schedule.completedTasks}`, this.margin + 10, yPosition, {
        font: helvetica,
        size: 11
      });
      yPosition -= 18;

      drawText(`  • Overdue: ${data.schedule.overdueTasks}`, this.margin + 10, yPosition, {
        font: helvetica,
        size: 11,
        color: data.schedule.overdueTasks > 0 ? rgb(0.9, 0.2, 0.2) : rgb(0.2, 0.7, 0.3)
      });
      yPosition -= 18;

      drawText(`  • Progress: ${data.schedule.progress}%`, this.margin + 10, yPosition, {
        font: helvetica,
        size: 11
      });
      yPosition -= 25;
    }

    // Quality Metrics
    if (data.quality) {
      checkPageBreak(120);
      drawText('Quality:', this.margin, yPosition, {
        font: helveticaBold,
        size: 12
      });
      yPosition -= 20;

      drawText(`  • Pass Rate: ${data.quality.passRate}%`, this.margin + 10, yPosition, {
        font: helvetica,
        size: 11
      });
      yPosition -= 18;

      drawText(`  • Open Defects: ${data.quality.openDefects}`, this.margin + 10, yPosition, {
        font: helvetica,
        size: 11,
        color: data.quality.openDefects > 5 ? rgb(0.9, 0.2, 0.2) : rgb(0.2, 0.7, 0.3)
      });
      yPosition -= 18;

      drawText(`  • Critical Defects: ${data.quality.criticalDefects}`, this.margin + 10, yPosition, {
        font: helvetica,
        size: 11,
        color: data.quality.criticalDefects > 0 ? rgb(0.9, 0.2, 0.2) : rgb(0.2, 0.7, 0.3)
      });
      yPosition -= 25;
    }

    // Risk Metrics
    if (data.risks) {
      checkPageBreak(100);
      drawText('Risks:', this.margin, yPosition, {
        font: helveticaBold,
        size: 12
      });
      yPosition -= 20;

      drawText(`  • Active Risks: ${data.risks.active}`, this.margin + 10, yPosition, {
        font: helvetica,
        size: 11
      });
      yPosition -= 18;

      drawText(`  • High Priority: ${data.risks.high}`, this.margin + 10, yPosition, {
        font: helvetica,
        size: 11,
        color: data.risks.high > 0 ? rgb(0.9, 0.7, 0.1) : rgb(0.2, 0.7, 0.3)
      });
      yPosition -= 18;

      drawText(`  • Critical: ${data.risks.critical}`, this.margin + 10, yPosition, {
        font: helvetica,
        size: 11,
        color: data.risks.critical > 0 ? rgb(0.9, 0.2, 0.2) : rgb(0.2, 0.7, 0.3)
      });
      yPosition -= 35;
    }

    // Accomplishments Section
    if (data.recentAccomplishments && data.recentAccomplishments.length > 0) {
      checkPageBreak(150);
      drawText('RECENT ACCOMPLISHMENTS', this.margin, yPosition, {
        font: helveticaBold,
        size: 16,
        color: rgb(0.2, 0.3, 0.6)
      });
      yPosition -= 5;

      page.drawLine({
        start: { x: this.margin, y: yPosition },
        end: { x: this.pageWidth - this.margin, y: yPosition },
        thickness: 2,
        color: rgb(0.2, 0.3, 0.6)
      });
      yPosition -= 25;

      for (const accomplishment of data.recentAccomplishments) {
        checkPageBreak(80);
        
        drawText(`• ${accomplishment.title}`, this.margin, yPosition, {
          font: helveticaBold,
          size: 11
        });
        yPosition -= 18;

        if (accomplishment.description) {
          const lines = wrapText(accomplishment.description, this.contentWidth - 20, helvetica, 10);
          for (const line of lines) {
            checkPageBreak(15);
            drawText(line, this.margin + 10, yPosition, {
              font: helvetica,
              size: 10,
              color: rgb(0.3, 0.3, 0.3)
            });
            yPosition -= 15;
          }
        }
        yPosition -= 10;
      }
      yPosition -= 10;
    }

    // Active Issues Section
    if (data.activeIssues && data.activeIssues.length > 0) {
      checkPageBreak(150);
      drawText('ACTIVE ISSUES & CONCERNS', this.margin, yPosition, {
        font: helveticaBold,
        size: 16,
        color: rgb(0.2, 0.3, 0.6)
      });
      yPosition -= 5;

      page.drawLine({
        start: { x: this.margin, y: yPosition },
        end: { x: this.pageWidth - this.margin, y: yPosition },
        thickness: 2,
        color: rgb(0.2, 0.3, 0.6)
      });
      yPosition -= 25;

      for (const issue of data.activeIssues.slice(0, 10)) {
        checkPageBreak(60);
        
        const issueType = issue.type === 'change-request' ? 'Change Request' :
                         issue.type === 'defect' ? 'Defect' : 'Overdue Task';
        
        drawText(`• [${issueType}] ${issue.title}`, this.margin, yPosition, {
          font: helveticaBold,
          size: 11,
          color: rgb(0.9, 0.2, 0.2)
        });
        yPosition -= 18;

        if (issue.priority) {
          drawText(`  Priority: ${issue.priority}`, this.margin + 10, yPosition, {
            font: helvetica,
            size: 10,
            color: rgb(0.4, 0.4, 0.4)
          });
          yPosition -= 15;
        }

        if (issue.severity) {
          drawText(`  Severity: ${issue.severity}`, this.margin + 10, yPosition, {
            font: helvetica,
            size: 10,
            color: rgb(0.4, 0.4, 0.4)
          });
          yPosition -= 15;
        }

        yPosition -= 10;
      }
      yPosition -= 10;
    }

    // Upcoming Milestones Section
    if (data.milestones && data.milestones.upcoming && data.milestones.upcoming.length > 0) {
      checkPageBreak(150);
      drawText('UPCOMING MILESTONES', this.margin, yPosition, {
        font: helveticaBold,
        size: 16,
        color: rgb(0.2, 0.3, 0.6)
      });
      yPosition -= 5;

      page.drawLine({
        start: { x: this.margin, y: yPosition },
        end: { x: this.pageWidth - this.margin, y: yPosition },
        thickness: 2,
        color: rgb(0.2, 0.3, 0.6)
      });
      yPosition -= 25;

      for (const milestone of data.milestones.upcoming) {
        checkPageBreak(50);
        
        drawText(`• ${milestone.name}`, this.margin, yPosition, {
          font: helveticaBold,
          size: 11
        });
        yPosition -= 18;

        const dueDate = new Date(milestone.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        drawText(`  Due: ${dueDate}`, this.margin + 10, yPosition, {
          font: helvetica,
          size: 10,
          color: rgb(0.4, 0.4, 0.4)
        });
        yPosition -= 15;

        drawText(`  Status: ${milestone.status}`, this.margin + 10, yPosition, {
          font: helvetica,
          size: 10,
          color: rgb(0.4, 0.4, 0.4)
        });
        yPosition -= 20;
      }
    }

    // Footer on all pages
    const pages = pdfDoc.getPages();
    pages.forEach((p, index) => {
      p.drawText(`Page ${index + 1} of ${pages.length}`, {
        x: this.pageWidth / 2 - 30,
        y: 30,
        size: 10,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5)
      });

      p.drawText('Generated by PMBOK Project Management System', {
        x: this.margin,
        y: 30,
        size: 8,
        font: helvetica,
        color: rgb(0.6, 0.6, 0.6)
      });
    });

    return await pdfDoc.save();
  }

  /**
   * Generate Executive Dashboard PDF
   */
  async generateExecutiveDashboard(data) {
    // Similar structure to status report but with executive summary focus
    // This can be implemented similarly to the status report
    return await this.generateStatusReport(data);
  }
}

module.exports = new PDFGenerator();
