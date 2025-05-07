# Google Tag Manager Admin User Auditor Script

A simple Google Apps Script to check how many admins are currently present in a GTM account.

One of the highest security risks with Google Tag Manager is having only one administrator.  
If, for any reason, that one administrator account is lost, the entire Google Tag Manager account becomes unusable.

When you don’t have admin access to a GTM account, Google provides no way to add a new administrator other than through an existing admin.  
Checking which GTM accounts are at risk is a wise move to identify where you could add another admin.

On the other hand, having too many admins could also cause security issues. One could argue how many admins are too many, but more than three may pose a risk.  
This threshold is configurable in the script, so your definition of "too many" is considered during the audit process.

## 🚫 Limitations

- **GTM API quota limits:**  
  https://developers.google.com/tag-platform/tag-manager/api/v2/limits-quotas  
  - This script throttles API calls using a 2100 ms wait time, which slows down the audit process but helps mitigate quota issues.  
  - The per-project, per-day quota may limit your ability to use a single instance of this script with many GTM containers.

- **Google Apps Script runtime:**  
  Limited to 6 minutes.  
  https://developers.google.com/apps-script/guides/services/quotas

## ⚙️ Installation

1. **Use the same Google account for all steps.**

2. Go to the [Google Cloud Console](https://console.cloud.google.com/):
   - [Create a new project](https://developers.google.com/workspace/guides/create-project) or select an existing one.
   - Ensure [billing is enabled](https://cloud.google.com/billing/docs/how-to/modify-project) (this script will not incur extra costs).
   - [Enable the required APIs](https://cloud.google.com/endpoints/docs/openapi/enable-api), if not already enabled:
     - [Tag Manager API](https://console.cloud.google.com/apis/api/tagmanager.googleapis.com/)
   - [Set up the OAuth consent screen](https://developers.google.com/workspace/guides/configure-oauth-consent) and add these scopes:
     - `https://www.googleapis.com/auth/tagmanager.manage.users`
     - `https://www.googleapis.com/auth/tagmanager.readonly`

3. Go to [Google Apps Script](https://script.google.com/):
   - Click **New Project**.
   - Rename the project (e.g., _Audit GTM Admins_).
   - Under **Google Cloud Platform (GCP) Project**, click **Change project** and enter your project **number** (not the ID). Find it on your [Google Cloud Dashboard](https://console.cloud.google.com/home/dashboard).
   - Copy all files from this repository into your Apps Script project.
   - Update script parameters at the top of the file (see below).

4. Run the test:
   - Manually run the `listGTMAdminStatus()` function in `main.gs`.
   - Grant the required permissions during the first run.

5. Automate the audit:
   - Go to **Triggers** in your Apps Script project.
   - Create a time-driven trigger (e.g., weekly) for `listGTMAdminStatus()`.

## 🔧 Parameters

You can change default parameters at the top of the script:

```js
/** @constant {number} Delay (in milliseconds) between API calls to avoid quota errors. */
const DELAY_MS = 2100;

/** @constant {number} Minimum number of admins required to be flagged (e.g., single admin risk). */
const MIN_ADMINS = 1;

/** @constant {number} Maximum number of admins before being flagged (e.g., too many admins). */
const MAX_ADMINS = 3;

/** @constant {string} Google Spreadsheet ID where results should be written. Leave empty to skip export. */
const SHEET_ID = ''; // e.g., '1a2B3cD...xyz'

/** @constant {string} Comma-separated email addresses to notify. */
const EMAIL_RECIPIENTS = 'somebody@somewhere.tld';
```

## 🙋 Support

This is an open-source project I created in my free time to give back to the community.  
Support is therefore limited, but you're welcome to open issues on the [Issues](../../issues) tab — response times may vary.

💡 PRs and suggestions are always welcome!

