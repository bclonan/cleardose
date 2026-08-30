# Capability Studio

Open `/#/studio` to create and exercise a local ClearDose capability without editing application source.

## Four review steps

1. Choose a document tool or workflow and provide a stable snake_case name, clear outcome, and full human example prompt.
2. Declare zero to twelve typed inputs and a `{ role, situation, step }` scope. ClearDose produces a closed JSON Schema with `additionalProperties: false`.
3. Write a safe EJS-shaped body. Workflows also declare two to twelve unique snake_case states. The optional voice guide always has a persistent text equivalent.
4. Supply sample JSON, preview the rendered result, save the local draft, then separately choose whether to register/load it. The live viewer exposes every resulting state and event.

## Template language

```text
# Questions about <%= input.drug_name %>
<% if input.visit_goal %>
Goal: <%= input.visit_goal %>
<% endif %>
```

Allowed constructs are escaped path interpolation, comments, and one-level conditionals. Values are HTML escaped. The engine rejects raw `<%-` output, arbitrary EJS or JavaScript, functions, loops, imports, nested or unmatched conditionals, `constructor`/`prototype` paths, and bodies above 12,000 characters.

## Lifecycle and naming

- Save and preview are local draft actions; neither registers a tool.
- Tools register as `cleardose_user_<name>` and use `machine.dynamic.user-tool-<name>.v1`.
- Workflows load as `user-workflow-<name>` and display `machine.dynamic.user-workflow-<name>.v1`.
- Registration choice persists on this device. Unload keeps the draft.
- Imported JSON always becomes a new unregistered draft.
- Running a document tool creates a local `dynamic-document` artifact in human review.

Template records are intentionally portable JSON, not executable plugins. Promoting a template into the checked-in built-in catalog still requires the normal source review, eval, and release process.
