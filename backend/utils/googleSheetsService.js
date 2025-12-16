const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises;

/**
 * Google Sheets Service
 * Handles integration with Google Sheets API for importing/exporting data
 */
class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
  }

  /**
   * Initialize Google Sheets API with service account or OAuth2
   */
  async initialize() {
    try {
      // Check if credentials file exists
      const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || 
        path.join(__dirname, '../config/google-credentials.json');

      const credentialsExist = await fs.access(credentialsPath)
        .then(() => true)
        .catch(() => false);

      if (!credentialsExist) {
        console.warn('⚠️  Google Sheets credentials not found. Google Sheets integration disabled.');
        return false;
      }

      const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));

      // Use service account authentication
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('✅ Google Sheets API initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing Google Sheets API:', error.message);
      return false;
    }
  }

  /**
   * Import data from Google Sheet
   * @param {string} spreadsheetId - The Google Sheets ID
   * @param {string} range - The range to read (e.g., 'Sheet1!A1:Z100')
   * @returns {Promise<Array>} Array of row data
   */
  async importFromSheet(spreadsheetId, range = null) {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      if (!this.sheets) {
        throw new Error('Google Sheets API not initialized');
      }

      // If no range specified, get the first sheet's name
      if (!range) {
        const info = await this.getSpreadsheetInfo(spreadsheetId);
        if (info.sheets && info.sheets.length > 0) {
          range = info.sheets[0].title;
        } else {
          throw new Error('No sheets found in spreadsheet');
        }
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Error importing from Google Sheet:', error);
      throw new Error(`Failed to import from Google Sheet: ${error.message}`);
    }
  }

  /**
   * Export data to Google Sheet
   * @param {string} spreadsheetId - The Google Sheets ID (optional, creates new if not provided)
   * @param {Array} data - Array of arrays representing rows
   * @param {string} sheetName - Name of the sheet
   * @returns {Promise<Object>} Object with spreadsheetId and url
   */
  async exportToSheet(data, sheetName = 'Export', spreadsheetId = null) {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      if (!this.sheets) {
        throw new Error('Google Sheets API not initialized');
      }

      let targetSpreadsheetId = spreadsheetId;
      let spreadsheetUrl;

      // Create new spreadsheet if ID not provided
      if (!targetSpreadsheetId) {
        const createResponse = await this.sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: `PMBOK Export - ${new Date().toISOString()}`
            },
            sheets: [{
              properties: {
                title: sheetName
              }
            }]
          }
        });

        targetSpreadsheetId = createResponse.data.spreadsheetId;
        spreadsheetUrl = createResponse.data.spreadsheetUrl;
      }

      // Write data to sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: targetSpreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: data
        }
      });

      if (!spreadsheetUrl) {
        spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`;
      }

      return {
        spreadsheetId: targetSpreadsheetId,
        url: spreadsheetUrl
      };
    } catch (error) {
      console.error('Error exporting to Google Sheet:', error);
      throw new Error(`Failed to export to Google Sheet: ${error.message}`);
    }
  }

  /**
   * Get spreadsheet metadata
   * @param {string} spreadsheetId - The Google Sheets ID
   * @returns {Promise<Object>} Spreadsheet metadata
   */
  async getSpreadsheetInfo(spreadsheetId) {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      if (!this.sheets) {
        throw new Error('Google Sheets API not initialized');
      }

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId
      });

      return {
        title: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => ({
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount
        })),
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      };
    } catch (error) {
      console.error('Error getting spreadsheet info:', error);
      throw new Error(`Failed to get spreadsheet info: ${error.message}`);
    }
  }

  /**
   * Extract spreadsheet ID from URL
   * @param {string} url - Google Sheets URL
   * @returns {string} Spreadsheet ID
   */
  extractSpreadsheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  }
}

// Export singleton instance
module.exports = new GoogleSheetsService();
