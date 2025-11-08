const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin
admin.initializeApp();

// Google Sheets configuration
// TODO: Replace with your actual Google Sheets ID
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1HZkgJXzFa0OSuZCOBvj0eKoHvZrhUPfD-yZVTHOA_vE';

/**
 * Initialize Google Sheets API
 * Make sure you have set up a service account and downloaded the JSON key
 */
function getGoogleSheetsClient() {
  // TODO: Replace with your service account credentials
  // Option 1: Use environment variable with the service account JSON content
  // Option 2: Store the service account JSON file in functions folder (not recommended for production)
  
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY 
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    : require('./service-account-key.json'); // Not recommended for production

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Format date to Vietnamese format (DD/MM/YYYY)
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format number to Vietnamese currency
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
}

/**
 * Cloud Function triggered when a new report is added to Firebase
 * This function will automatically sync the data to Google Sheets
 */
exports.syncReportToSheets = functions.database
  .ref('/reports/{reportId}')
  .onCreate(async (snapshot, context) => {
    try {
      const reportData = snapshot.val();
      const reportId = context.params.reportId;

      console.log('New report added:', reportId, reportData);

      // Get Google Sheets client
      const sheets = getGoogleSheetsClient();

      // Prepare row data matching the form fields
      // Headers: Tên, Email, Ngày, Ca, Sản phẩm, Thị trường, TKQC, CPQC, Số Mess/Cmt, Số đơn, Doanh số
      const rowData = [
        reportData.name,
        reportData.email,
        formatDate(reportData.date),
        reportData.shift,
        reportData.product,
        reportData.market,
        reportData.tkqc,
        reportData.cpqc,
        reportData.mess_cmt,
        reportData.orders,
        reportData.revenue,
        reportData.timestamp, // Optional: timestamp for tracking
      ];

      // Append the row to the Google Sheet
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:L', // Adjust range if you have different sheet name
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });

      console.log('Successfully synced to Google Sheets:', response.data);

      // Update the report status in Firebase
      await admin.database()
        .ref(`/reports/${reportId}`)
        .update({
          status: 'synced',
          syncedAt: admin.database.ServerValue.TIMESTAMP,
          sheetsRowNumber: response.data.updates.updatedRange,
        });

      return { success: true, message: 'Report synced to Google Sheets' };

    } catch (error) {
      console.error('Error syncing to Google Sheets:', error);
      
      // Update error status in Firebase
      await admin.database()
        .ref(`/reports/${context.params.reportId}`)
        .update({
          status: 'error',
          error: error.message,
        });

      throw new functions.https.HttpsError('internal', 'Failed to sync report to Google Sheets');
    }
  });

/**
 * HTTP Cloud Function to manually sync a report to Google Sheets
 * This can be used as a fallback if automatic sync fails
 */
exports.manualSyncToSheets = functions.https.onCall(async (data, context) => {
  try {
    const { reportId } = data;

    if (!reportId) {
      throw new functions.https.HttpsError('invalid-argument', 'Report ID is required');
    }

    // Get report data from Firebase
    const snapshot = await admin.database().ref(`/reports/${reportId}`).once('value');
    const reportData = snapshot.val();

    if (!reportData) {
      throw new functions.https.HttpsError('not-found', 'Report not found');
    }

    // Get Google Sheets client
    const sheets = getGoogleSheetsClient();

    // Prepare row data
    const rowData = [
      reportData.name,
      reportData.email,
      formatDate(reportData.date),
      reportData.shift,
      reportData.product,
      reportData.market,
      reportData.tkqc,
      reportData.cpqc,
      reportData.mess_cmt,
      reportData.orders,
      reportData.revenue,
      reportData.timestamp,
    ];

    // Append to Google Sheets
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    });

    // Update status
    await admin.database()
      .ref(`/reports/${reportId}`)
      .update({
        status: 'synced',
        syncedAt: admin.database.ServerValue.TIMESTAMP,
        sheetsRowNumber: response.data.updates.updatedRange,
      });

    return { success: true, message: 'Report manually synced to Google Sheets' };

  } catch (error) {
    console.error('Error in manual sync:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * HTTP Cloud Function to save report to both Firebase and Google Sheets
 * This is the main function to use - saves to both locations simultaneously
 */
exports.saveReport = functions.https.onCall(async (data, context) => {
  try {
    const reportData = data;

    // Validate required fields
    const requiredFields = ['name', 'email', 'date', 'shift', 'product', 'market', 'cpqc', 'mess_cmt', 'orders', 'revenue'];
    for (const field of requiredFields) {
      if (!reportData[field]) {
        throw new functions.https.HttpsError('invalid-argument', `Missing required field: ${field}`);
      }
    }

    console.log('Saving report:', reportData);

    // Add timestamp
    const timestamp = admin.database.ServerValue.TIMESTAMP;
    const reportWithTimestamp = {
      ...reportData,
      timestamp,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    // Save to Firebase Realtime Database
    const firebaseRef = await admin.database()
      .ref('/reports')
      .push(reportWithTimestamp);
    
    const reportId = firebaseRef.key;
    console.log('Saved to Firebase with ID:', reportId);

    // Save to Google Sheets
    try {
      const sheets = getGoogleSheetsClient();

      const rowData = [
        reportData.name,
        reportData.email,
        formatDate(reportData.date),
        reportData.shift,
        reportData.product,
        reportData.market,
        reportData.tkqc || '',
        reportData.cpqc,
        reportData.mess_cmt,
        reportData.orders,
        reportData.revenue,
        new Date().toISOString(),
      ];

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:L',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });

      console.log('Saved to Google Sheets:', response.data.updates.updatedRange);

      // Update Firebase with sync status
      await firebaseRef.update({
        status: 'synced',
        syncedAt: admin.database.ServerValue.TIMESTAMP,
        sheetsRowNumber: response.data.updates.updatedRange,
      });

      return {
        success: true,
        message: 'Report saved to both Firebase and Google Sheets',
        reportId,
        sheetsRange: response.data.updates.updatedRange,
      };

    } catch (sheetsError) {
      console.error('Error saving to Google Sheets:', sheetsError);
      
      // Update Firebase with error status
      await firebaseRef.update({
        status: 'sheets_error',
        error: sheetsError.message,
      });

      // Still return success for Firebase, but note the Sheets error
      return {
        success: true,
        message: 'Report saved to Firebase, but failed to save to Google Sheets',
        reportId,
        error: sheetsError.message,
        sheetsError: true,
      };
    }

  } catch (error) {
    console.error('Error saving report:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * HTTP Cloud Function to initialize Google Sheets with headers
 * Run this once to set up your Google Sheet with proper headers
 */
exports.initializeSheet = functions.https.onCall(async (data, context) => {
  try {
    const sheets = getGoogleSheetsClient();

    // Headers for the Google Sheet
    const headers = [
      'Tên',
      'Email',
      'Ngày',
      'Ca',
      'Sản phẩm',
      'Thị trường',
      'TKQC',
      'CPQC',
      'Số Mess/Cmt',
      'Số đơn',
      'Doanh số',
      'Timestamp',
    ];

    // Check if sheet already has headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:L1',
    });

    if (response.data.values && response.data.values.length > 0) {
      return { success: true, message: 'Headers already exist' };
    }

    // Add headers to the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:L1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });

    // Format the header row (bold, background color)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.18, green: 0.49, blue: 0.18 },
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      },
    });

    return { success: true, message: 'Sheet initialized with headers' };

  } catch (error) {
    console.error('Error initializing sheet:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
