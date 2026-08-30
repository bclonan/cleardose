# Accessibility target

ClearDose is engineered toward **WCAG 2.2 Level AAA** for the complete fictional customer journey. A formal conformance claim still requires representative assistive-technology testing and a human audit; automated checks alone cannot establish AAA conformance.

## Implemented safeguards

- Semantic headings and page landmarks, a skip link, route-specific page titles, and focus movement to the main landmark after navigation
- High-visibility keyboard focus, 44-pixel interactive targets, keyboard-operable native controls, and no custom pointer-only gestures
- Enhanced foreground/background contrast tokens, text transcripts for all voice guidance, visible labels, status announcements, and non-color state labels
- Layout reflow, responsive comparison/tool views, reduced-motion handling, and forced-colors support
- Native `<dialog>` focus containment and Escape behavior for the agent center
- Route-aware voice guidance through the Web Speech API with an always-visible equivalent transcript and playback controls
- Correct `name`, `type`, `autocomplete`, `inputmode`, and section tokens for sign-in, account, contact, and shipping forms
- Standard HTML forms enhanced with declarative WebMCP metadata; no required workflow depends on WebMCP or speech support
- A keyboard-searchable floating tool guide; browser speech recognition only filters the same visible examples and always has a text-input fallback
- A semantic concurrent-flow list, ordered state nodes, button-based event timeline, focusable context JSON, and a text equivalent in the live region
- A print stylesheet that isolates the patient-owned question card while preserving its disclaimer and list structure

## Review checklist

Before making a formal claim, test every route and complete process at 200% and 400% zoom, keyboard-only, Windows High Contrast, reduced motion, and current screen-reader/browser pairs. Confirm enhanced contrast, error recovery, reading order, pronunciation, and voice-control equivalents with users where possible.

Reference: [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
