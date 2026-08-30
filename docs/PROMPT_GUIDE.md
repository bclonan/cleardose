# Prompt and voice guide

The floating **Prompt guide** button is present on every route. It opens an accessible modal containing all 22 built-in capabilities plus any explicitly registered local tools, grouped by domain. Each entry shows its imperative/declarative tag, purpose, mutation label, machine id, and one full conversational example prompt.

Every prompt stays visible so a person can read it in voice mode or type it manually. **Copy this exact prompt** uses the Clipboard API and falls back to a temporary selected textarea when permission is denied. **Read aloud** is optional speech synthesis. A failed copy is announced with manual-selection guidance rather than silently failing.

The search field filters names, descriptions, and examples. Where the browser exposes `SpeechRecognition` or `webkitSpeechRecognition`, **Voice search** fills that same field from one spoken phrase. Speech is progressive enhancement: unsupported or denied recognition leaves the searchable text experience intact, and no spoken query is persisted by ClearDose.

Example categories include:

- UDI search, exact entry lookup, fictional price comparison, and related records;
- intentionally incomplete synthetic interaction review and local procurement planning;
- workflow/event inspection and stable section highlighting;
- the two-call doctor-question-card handoff;
- local cart read and exact-package mutation.

Prompts deliberately name safety boundaries, such as “discussion-only,” “fictional,” “do not order,” and “do not call them substitutes.” They are examples, not rigid orchestration instructions.

The separate floating **Demo shortcuts** CTA opens `/#/shortcuts`, where complete single- and multi-step chains can be copied or read aloud using the route-aware voice journey. A timed visual analog is explicitly labeled as a simulation and never claims an external agent ran.
