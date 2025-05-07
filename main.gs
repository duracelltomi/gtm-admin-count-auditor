/**
 * @fileoverview Audits GTM accounts for risky admin counts.
 * Exports flagged accounts to a Google Sheet and sends email notification.
 */

/** @constant {number} Delay (in milliseconds) between API calls to avoid quota errors. */
const DELAY_MS = 2100;

/** @constant {number} Minimum number of admins required to be flagged (e.g., single admin risk). */
const MIN_ADMINS = 1;

/** @constant {number} Maximum number of admins before being flagged (e.g., too many admins). */
const MAX_ADMINS = 3;

/** @constant {string} Google Spreadsheet ID where results should be written. Leave empty to skip export. */
const SHEET_ID = ''; // e.g., '1a2B3cD...xyz'

/** @constant {string} Comma-separated email addresses to notify. */
const EMAIL_RECIPIENTS = 'someone@somewhere.tld';

/**
 * Main entry point. Scans GTM accounts, counts admin users,
 * logs flagged accounts, optionally writes them to a Google Sheet,
 * and emails a summary.
 *
 * @returns {void}
 * @throws {Error} If API calls fail unexpectedly.
 */
function listGTMAdminStatus() {
  const results = [];
  const accounts = TagManager.Accounts.list().account || [];

  Logger.log(`🔍 Found ${accounts.length} GTM account(s). Starting processing with ${DELAY_MS}ms delay...`);

  accounts.forEach((account, index) => {
    const accountId = account.accountId;
    const accountName = account.name;
    const parent = `accounts/${accountId}`;

    Logger.log(`➡️ [${index + 1}/${accounts.length}] Processing: "${accountName}" (ID: ${accountId})`);

    let adminCount = 0;

    try {
      const userPermissions = TagManager.Accounts.User_permissions.list(parent).userPermission || [];
      Logger.log(`   👥 Found ${userPermissions.length} user(s)`);

      userPermissions.forEach(userPermission => {
        const access = userPermission.accountAccess;
        if (access && access.permission === 'admin') {
          adminCount++;
        }
      });

      Logger.log(`   🔐 Admins found: ${adminCount}`);

      if (adminCount === MIN_ADMINS || adminCount > MAX_ADMINS) {
        const adminUrl = `https://tagmanager.google.com/#/admin/?accountId=${accountId}`;
        const linkFormula = `=HYPERLINK("${adminUrl}", "Open Admin")`;
        Logger.log(`   ✅ Qualifies — added to results. Link: ${adminUrl}`);
        results.push([accountName, accountId, adminCount, linkFormula]);
      } else {
        Logger.log(`   ℹ️ Does not qualify (admins = ${adminCount})`);
      }

    } catch (error) {
      Logger.log(`   ❌ Error for "${accountName}" (ID: ${accountId}): ${error.message}`);
      throw error;
    }

    if (index < accounts.length - 1) {
      Logger.log(`   ⏳ Sleeping ${DELAY_MS}ms...`);
      Utilities.sleep(DELAY_MS);
    }
  });

  if (results.length === 0) {
    Logger.log(`🚫 No accounts found with only ${MIN_ADMINS} admin or more than ${MAX_ADMINS} admins.`);
    sendEmailNotification(false, '', 0);
    return;
  }

  if (SHEET_ID.trim()) {
    const sheet = writeResultsToTimestampedSheet(results, SHEET_ID);
    if (sheet) {
      sendEmailNotification(true, sheet.getParent().getUrl(), results.length);
    } else {
      sendEmailNotification(false, '', results.length);
    }
  } else {
    Logger.log('📄 No SHEET_ID provided. Skipping sheet export.');
    sendEmailNotification(false, '', results.length);
  }
}

/**
 * Writes the results to a new sheet tab with a timestamp in the provided spreadsheet.
 * Fails gracefully if the spreadsheet can't be accessed or written to.
 *
 * @param {Array<Array<string|number>>} data - The data to write (array of rows).
 * @param {string} sheetId - The ID of the existing Google Spreadsheet.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} The newly created sheet, or null if failed.
 * @throws {Error} If spreadsheet operations fail unexpectedly.
 */
function writeResultsToTimestampedSheet(data, sheetId) {
  let spreadsheet;
  try {
    Logger.log(`📄 Opening spreadsheet with ID: ${sheetId}`);
    spreadsheet = SpreadsheetApp.openById(sheetId);
  } catch (error) {
    Logger.log(`❌ Cannot open spreadsheet. Error: ${error.message}`);
    return null;
  }

  let timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  if (spreadsheet.getSheets().some(s => s.getName() === timestamp)) {
    Logger.log(`⚠️ Sheet "${timestamp}" exists. Appending suffix.`);
    timestamp += ' (Copy)';
  }

  try {
    const sheet = spreadsheet.insertSheet(timestamp);
    const headers = ['Account Name', 'Account ID', 'Admin Count', 'Admin Link'];
    sheet.appendRow(headers);
    data.forEach(row => sheet.appendRow(row));

    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.autoResizeColumns(1, headers.length);

    Logger.log(`✅ Results written to "${timestamp}" at: ${spreadsheet.getUrl()}`);
    return sheet;
  } catch (error) {
    Logger.log(`❌ Error writing sheet: ${error.message}`);
    return null;
  }
}

/**
 * Sends an email notification with results or script log link.
 *
 * @param {boolean} sheetCreated - Whether the spreadsheet was written successfully.
 * @param {string} link - Link to the spreadsheet (if available).
 * @param {number} count - Number of flagged accounts found.
 * @returns {void}
 * @throws {Error} If email sending fails.
 */
function sendEmailNotification(sheetCreated, link, count) {
  const subject = `GTM Admin Audit Results (${count} flagged account${count !== 1 ? 's' : ''})`;

  let body;
  if (sheetCreated && link) {
    body = `✅ GTM admin audit completed.\n\n` +
           `🔍 ${count} account(s) had only ${MIN_ADMINS} or more than ${MAX_ADMINS} admins.\n\n` +
           `📄 View results:\n${link}`;
  } else {
    const scriptId = ScriptApp.getScriptId();
    const logUrl = `https://script.google.com/home/projects/${scriptId}/executions`;

    body = `✅ GTM admin audit completed.\n\n` +
           `🔍 ${count} account(s) had only ${MIN_ADMINS} or more than ${MAX_ADMINS} admins.\n\n` +
           `📋 No spreadsheet used. See the script log:\n${logUrl}`;
  }

  try {
    MailApp.sendEmail({
      to: EMAIL_RECIPIENTS,
      subject: subject,
      body: body
    });
    Logger.log(`📧 Email sent to: ${EMAIL_RECIPIENTS}`);
  } catch (error) {
    Logger.log(`❌ Email failed: ${error.message}`);
    throw error;
  }
}
