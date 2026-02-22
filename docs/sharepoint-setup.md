# SharePoint Excel + Microsoft Graph setup

## Required environment variables

Set these values in your local `.env` file:

- `MicrosoftAppId`
- `MicrosoftAppPassword`
- `PORT` (default `3978`)
- `TENANT_ID`
- `GRAPH_CLIENT_ID`
- `GRAPH_CLIENT_SECRET`
- `SHAREPOINT_SITE_HOSTNAME` (`clicklease.sharepoint.com`)
- `SHAREPOINT_SITE_PATH` (`/sites/TheUsualSuspects`)
- `SHAREPOINT_EXCEL_FILE_PATH` (`Shared Documents/Assignments/dispatcher.xlsx`)
- `EXCEL_TABLE_NAME` (`QueueTable`)
- `LOCK_TABLE_NAME` (`LockTable`)
- `LEADER_AAD_IDS` (optional, comma-separated for production-grade leader checks)

## Graph application permissions

Use **Application permissions** (app-only flow):

- `Sites.ReadWrite.All`
- `Files.ReadWrite.All`

Then grant **Admin consent** for the tenant.

## Confirm access

1. Ensure the app has the two permissions above and consent is granted.
2. Ensure the Excel file exists at:
   `Shared Documents/Assignments/dispatcher.xlsx` under the site:
   `https://clicklease.sharepoint.com/sites/TheUsualSuspects`
3. Start the bot locally and run commands from Emulator. Successful `/status` or `/next` should read/write `QueueTable` and `LockTable` through Graph.
4. If Graph calls fail, verify tenant/client credentials and confirm the app can access the site and document library.
