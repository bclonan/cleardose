# ADR 0003: Safe user-authored capability templates

## Status

Accepted — 2026-08-30

## Context

Hackathon users need to create new workflow and document-tool demonstrations at runtime. Executing submitted EJS or JavaScript would violate the local sandbox, make review unreliable, and turn imported JSON into code.

## Decision

ClearDose stores capability templates as validated data. `SafeEjsTemplateEngine` implements only escaped dotted paths, comments, and one-level truthy conditionals. Closed input schemas, bounded state arrays, and role/situation/step scope are mandatory. Save, preview, import, register, run, and unload remain distinct actions. Imports clear registration, user tools use a separate `cleardose_user_` namespace, and outputs stop in human review.

## Consequences

- Templates are readable, portable, deterministic, and usable from voice guidance without a code editor.
- They cannot express loops, computed expressions, helper calls, network access, or arbitrary plugins.
- More expressive behavior must be implemented and reviewed as application source behind a typed adapter, not smuggled into a template.
