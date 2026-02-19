# SKILL: dispatcher-auth

## Goal
Implement authorization rules:
- Only leaders can execute `/next`
- Any user can execute self-status commands

## Leaders
Randall, Eduardo, Jorge, Gabriel

## Inputs
- context.activity.from (Teams user)
- displayName and/or aadObjectId (preferred)

## Output
- allow/deny decision
- standardized error message for unauthorized users

## Acceptance Criteria
- `/next ...` rejects non-leaders with clear message
- Status commands work for everyone
- Authorization uses stable IDs if available; falls back to displayName only for local/testing

## Files to touch
- src/bot.js
- src/services/authService.js (if created)

## Notes
Avoid trusting user-provided text for identity.
Prefer Teams/AAD identifiers from the message context.
