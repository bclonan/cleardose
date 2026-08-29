# Architecture

```mermaid
flowchart TD
  UI[Vue pages and components] --> Store[Pinia pharmacy store]
  Tools[WebMCP tools] --> Store
  Store --> Facade[ClearDose facade]
  Facade --> Repos[Repository adapters]
  Repos --> DAO[Browser state DAO]
  DAO --> Storage[LocalStorage or memory]
  Facade --> DTO[Sanitized DTOs]
  DTO --> Store
```

## Layer responsibilities

| Layer | Location | Responsibility |
|---|---|---|
| Presentation | `src/views`, `src/components` | Render DTOs, collect input, dispatch Pinia actions |
| Component adapters | `src/presentation`, `src/composables/useAgentReadyComponent.js` | Replace component behavior and compose component-scoped tools via props |
| Reactive state | `src/stores/pharmacyStore.js` | Hold UI state and make facade use cases reactive |
| Application | `src/application/facades` | Framework-independent use-case API shared by UI and agents |
| Domain transfer | `src/domain/dto` | Validate, clone, freeze, and sanitize data crossing layers |
| Repository adapters | `src/infrastructure/repositories` | Catalog, customer, cart, prescription, and order persistence behavior |
| DAO | `src/infrastructure/persistence` | Serialize/reset the complete mock state |
| Agent transport | `src/infrastructure/webmcp` | Register, namespace, execute, diagnose, and unregister tools |
| Composition root | `src/app/createClearDosePlugin.js` | Wire Pinia, facade, adapters, component registry, and default tools |

## Mutation path

UI components and WebMCP tools both invoke Pinia actions. The action delegates to the facade, the facade coordinates repository adapters, and the DAO persists one state transaction. Pinia then refreshes from sanitized DTOs. This keeps every screen and tool synchronized.

## Swapping implementations

- Replace `createClearDoseBrowserAdapter()` with an HTTP or IndexedDB adapter implementing the same repository methods.
- Pass a custom `dataAdapter`, `facade`, `webMcpAdapter`, or `toolRegistry` into `createClearDosePlugin()`.
- Pass `adapter`, `mcpTools`, `mcpContext`, and `registerMcp` to any reusable component.
