# AGENTS.md — Clicklease Dispatcher Bot

## Purpose
Build and maintain a Microsoft Teams Dispatcher Bot for task assignment.
The bot enforces leader-only assignment, reads a live queue from Excel Online,
and applies circular rotation rules with special reinsertion behavior.

## Tech Stack
- Backend: Node.js + Express (Bot Framework endpoint `/api/messages`)
- Bot: Microsoft Bot Framework (Teams channel via Azure Bot registration)
- Persistence (source of truth): Excel Online (Microsoft 365) via Microsoft Graph API
- Azure: Bot Registration only (provides MicrosoftAppId + MicrosoftAppPassword)
- Hosting: Render recommended for production webhook HTTPS endpoint
  - Local dev uses Bot Framework Emulator
  - Local-to-cloud testing can use ngrok (optional)

## Credentials & Env
We already have:
- MicrosoftAppId (from Azure Bot)
- MicrosoftAppPassword (Client Secret VALUE)
These MUST be stored in `.env` and loaded via dotenv.

Required env:
- MicrosoftAppId=
- MicrosoftAppPassword=
- PORT=3978
- TENANT_ID=
- GRAPH_CLIENT_ID=
- GRAPH_CLIENT_SECRET=
- EXCEL_DRIVE_ITEM_ID=
- EXCEL_TABLE_NAME=QueueTable

Never commit secrets.

## Roles & Permissions
Only leaders can assign work using `/next`:
Leaders:
- Randall
- Eduardo
- Jorge
- Gabriel

All users can update their own status:
- /available
- /busy
- /break
- /lunch
- /offline

Important: In production, authorization should rely on stable identifiers (AAD Object IDs),
not display names, to avoid impersonation.

## Queue & Status Model (Excel is the source of truth)
Statuses:
- available
- busy
- break
- lunch
- offline

Recommended Excel table columns:
- displayName
- aadObjectId
- status
- queueOrder (integer: 1..N)
- boostMode (normal|double)
- lastUpdatedUtc

## Assignment Rules (Critical)
### Eligibility
Only `available` users can be assigned.

### Circular rotation ("green order")
The next assignment goes to the user with the smallest queueOrder among eligible users.

### On assignment
- The assigned user is immediately set to `busy` in Excel.

### On completion (busy → available)
When a user changes from `busy` to `available`, they are reinserted into the queue:
- default (boostMode=normal): inserted at the end
- boostMode=double: inserted in the middle

This supports cases where someone needs to take more work than others.

## Commands
Leader-only:
/next <tags...> "<task name>"

Tags:
- df  (Doc fee review)
- dl  (Driver License Review)
- inv (Invoice Review)
- act (Activation)
- all (any task)

Examples:
- /next df dl "DL app #123"
- /next df "Doc fee review - app 456"
- /next inv act "Invoice+Activation 789"
- /next all "Any next task 001"

## Development Workflow
Local:
- Start server: `node src/server.js`
- Emulator: connect to `http://localhost:3978/api/messages`

PR workflow:
1. Implement changes with minimal scope
2. Add/update skill docs in `/skills/*/SKILL.md` as needed
3. Run quick checks (manual smoke test)
4. Create PR with:
   - summary
   - what changed
   - how tested

## Non-goals (for now)
- Direct Salesforce API assignment (blocked)
Future: integrate Salesforce API once bot is stable.

## Notes on “Free”
Goal is to stay on free tiers for development:
- Azure Bot: F0 free tier (if available in subscription/region)
- Excel Online: included with M365 license
- Hosting: Render free can be used for initial testing (may sleep); org-grade hosting can be requested from IT later.
