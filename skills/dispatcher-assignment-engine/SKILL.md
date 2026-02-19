# SKILL: dispatcher-assignment-engine

## Goal
Implement queue selection and rotation rules using Excel as source of truth.

## Rules
- Eligible = status === available
- Pick next = smallest queueOrder among eligible
- On assign: set assigned agent to busy
- On busy -> available:
  - boostMode=normal -> reinsert at end
  - boostMode=double -> reinsert in middle
- QueueOrder should remain normalized 1..N

## Inputs
- agents list from Excel:
  - displayName, aadObjectId, status, queueOrder, boostMode
- operation:
  - assignNext(tags, taskName)
  - setUserStatus(aadObjectId, newStatus)

## Outputs
- assignNext -> assigned agent + message
- setUserStatus -> confirmation message

## Acceptance Criteria
- Deterministic ordering
- No in-memory persistence across requests
- Always re-read Excel before decisions
