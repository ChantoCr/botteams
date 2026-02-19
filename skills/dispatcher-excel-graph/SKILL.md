# SKILL: dispatcher-excel-graph

## Goal
Read and update Excel Online table via Microsoft Graph API.

## Excel Table
Name: EXCEL_TABLE_NAME (default QueueTable)
Columns:
- displayName
- aadObjectId
- status
- queueOrder
- boostMode
- lastUpdatedUtc

## Operations
- getAgents()
- updateAgentStatus(aadObjectId, status)
- updateQueueOrders([{aadObjectId, queueOrder}, ...])

## Auth
Use Entra ID client credentials (app permissions) with MSAL.

## Acceptance Criteria
- Works with small tables (9 people)
- Updates are atomic enough for small team usage
- Proper error handling and meaningful logs
