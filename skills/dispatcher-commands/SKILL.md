# SKILL: dispatcher-commands

## Goal
Parse bot commands and route to services.

## Commands
Leader-only:
- /next <tags...> "<task name>"

Tags: df, dl, inv, act, all

Self-status:
- /available
- /busy
- /break
- /lunch
- /offline
- /status

## Parsing rules
- `/next` requires a quoted task name
- Tags can be in any order; normalize to lowercase
- `/next all "..."` means any queue
- Unknown tags -> reject with help message

## Output format
A normalized command object:
- { type: "next", tags: ["df","dl"], taskName: "..." }
- { type: "status", newStatus: "available" }

## Acceptance Criteria
- Robust parsing with helpful error messages
- Works with extra spaces
- Rejects missing quotes for task name
