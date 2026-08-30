# ADR 0002: Human-controlled agent memory files

- Status: Accepted
- Date: 2026-08-30

## Context

A demo agent benefits from carrying explicit facts, decisions, next steps, and flow references into later interactions. Browsers do not provide a safe universal API for silently inserting prompts or memory into arbitrary LLM products. Medical-context demonstrations also require a strict review boundary.

## Decision

ClearDose prepares a bounded `agent-memory-packet` artifact in `human_review`. The artifact includes structured fields, Markdown, an agent instruction, and a deletion/retention boundary. It excludes inferred clinical facts and unrestricted conversation history.

Copying uses a visible user action. Saving calls `showSaveFilePicker()` directly from that action in a secure supporting browser, then `createWritable()`, `write()`, and `close()`. Unsupported browsers use a normal download link. ClearDose records only the chosen export method in the local flow; it cannot know or claim that an external agent retained the packet.

## Consequences

- No tool call silently writes to disk or another agent.
- The user can inspect and edit inputs before preparing a packet.
- File permission and location remain browser/user decisions.
- Automated cross-agent memory transfer is intentionally out of scope until a standard, permissioned interface exists.
