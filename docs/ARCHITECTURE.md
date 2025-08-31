## Thinkbook Architecture

This document outlines the end-to-end architecture of the Thinkbook application: a frontend-only, Jupyter-style notebook with integrated AI chat. It consolidates decisions from user stories 0001–0023 and the README, serving as the implementation guide for current and future work.

### High-Level Overview

- Frontend-only SPA built with Vite, React 18, TypeScript, and Tailwind CSS.
- Persistent client-side storage via LocalForage (IndexedDB) for settings and notebook files.
- AI chat uses Vercel AI SDK (v5) with Google Gemini 2.5 Flash via direct HTTP from the browser.
- Python code runs in-browser using Pyodide (WASM) inside a Web Worker for isolation and performance.
- Optional direct Snowflake REST API integration from the browser using stored hostname and access token.

### Core Application Layout

- File Panel (left sidebar): lists notebook files grouped by `updatedAt` date; supports create/delete/select.
- Main Content (right): unified conversation list combining chat messages and notebook cells in chronological order.
- Header: editable notebook title and settings icon; optional delete icon.
- Fixed Message Input: stays at the bottom for AI chat input with streaming responses.

### Data Model

- NotebookFile
  - id: string (uuid)
  - createdAt: ISO string
  - updatedAt: ISO string (changes on meaningful edits only)
  - title: string
  - cells: Cell[]
  - messages: MessagePart[] (Vercel AI SDK message parts; render parts, not content)

- Cell
  - id: string
  - type: "code" | "markdown" (initial scope: code)
  - text: string (source code)
  - linkedMessageId: string | null (chat message this cell follows)
  - ui: { isEditorVisible: boolean, status: "idle"|"running"|"complete"|"failed"|"cancelled" }
  - output: Array<StdOut | StdErr | TableMessage>

- MessagePart
  - Comes from AI SDK; must be rendered using `parts` array (text/tool-call/tool-result, etc.).

### State Management

- Zustand stores:
  - Notebook files collection and selected notebook id.
  - Conversation items (messages + cells) for the active file.
  - UI flags: editingMessageId, auto-scroll behavior, cell visibility states.
  - Settings (via dedicated storage helpers + hooks): Gemini API key, Snowflake hostname and token.

### Persistence

- LocalForage keys:
  - `gemini-api-key`
  - `snowflake-access-token`
  - `snowflake-hostname`
  - `notebookFiles`: map `{ [id: string]: NotebookFile }` and `lastOpenedNotebookId`.
- Debounced writes to avoid excessive operations.
- `updatedAt` only changes on real content updates: adding/removing messages or cells, editing cell text, or changing title.

### AI Chat Architecture

- Vercel AI SDK v5 with transport configured for direct Google Gemini API calls.
- Model: `gemini-2.5-flash`.
- System prompt: `src/prompts/system-prompt.ts` with notebook-aware guidance.
- Messages are rendered using `message.parts` to support text and tool calls.
- Tool calling:
  - Frontend-only tools under `src/ai-functions/` with Zod parameter validation.
  - Initial tools: `listCells`, `updateCell`, `createCodeCell`, and `describeSnowflakeTable`.
  - Tool calls render as compact icons with expandable details per message.
  - Use `onToolCall` with manual `addToolResult()` and `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls`.

### Notebook Conversation Architecture

- Single chronological list renders both chat messages and cells.
- Each chat message has `messageId`.
- Cells created by AI are linked to the triggering message via `linkedMessageId` and are inserted directly after it.
- User-created cells are appended to the end (no link) and appear after all prior items.
- Auto-scroll triggers only for brand-new items (new message/cell), not for edits, execution updates, or deletions.

### Code Execution Architecture (Pyodide + Worker)

- Pyodide loaded from CDN: `https://cdn.jsdelivr.net/pyodide/v0.28.0/full/`.
- Dedicated Web Worker per page manages a single Pyodide runtime shared across all cells.
- Worker is created once and persists across parent React re-renders.
- Communication contract (postMessage):
  - from main → worker: `runCode({ cellId, code })`, `cancelExecution()`, `setInterruptBuffer(buffer)`, etc.
  - from worker → main: `out`, `err`, `table`, `execution-complete`, `execution-failed`, `execution-cancelled`.
- Streaming output:
  - Redefine `print()`/stderr in Python to immediately forward to JS callbacks set via `pyodide.globals.set()`.
  - Main thread appends output to the target cell in order.
- Cancellation:
  - Use `SharedArrayBuffer` + `pyodide.setInterruptBuffer(new Uint8Array(shared))`.
  - Interrupt is triggered from main thread by setting `buffer[0] = 2`.
  - Security headers required in production for SAB support (COOP/COEP).

### Table Rendering

- Worker detects pandas DataFrame via `display(df)` and posts a `table` message containing up to first 50 rows with columns preserved (e.g., `df.head(50).to_json(orient="split")`).
- Frontend `TableDisplay` component renders inside the cell output after any text output.
- Horizontal overflow handled via `overflow-x-auto`; caption shows total rows if > 50.

### Settings Modal

- Always accessible in the header.
- Auto-opens once on initial load when required values are missing (Gemini key, Snowflake hostname/token as applicable).
- Uses `src/utils/storage.ts` helpers and hooks `useGeminiApiKey()` and `useSnowflakeConfig()`.
- Accessibility: ARIA labels, focus trapping, keyboard navigation.

### Snowflake Service

- `src/services/snowflake.ts` provides direct REST calls:
  - Execute SQL: `{ sql: string }`.
  - Fetch partition: `{ handle: string, partition?: number }`.
- Reads hostname and token from LocalForage; throws descriptive errors if missing.
- Propagates Snowflake errors. Timeout 30s. Types defined for responses.
- Used by AI tool `describeSnowflakeTable(table)` which validates `database.schema.table` and returns rows to be rendered as markdown table in conversation.

### UI Components (indicative)

- `FilePanel`: sidebar with groups by date; create/select; highlights active file.
- `NotebookHeader`: title input and settings/deletion icons; persists onBlur/Enter.
- `ConversationList`: renders interleaved chat messages and cells.
- `ChatMessage`: renders `parts` with text/tool-call icons + expandable JSON details.
- `ChatInput`: fixed at bottom with multiline input and send button; supports Enter/Cmd+Enter behaviors.
- `Cell`: Monaco editor, run/stop buttons, visibility toggle, status indicator, output area.
- `TableDisplay`: renders table payloads with horizontal scrolling and caption.

### Accessibility & UX

- All interactive elements keyboard accessible with clear focus styles and ARIA labels.
- Icons from `react-icons` with consistent sizing and color.
- Smooth scroll for new items; respects `prefers-reduced-motion`.
- Collapsed cells show description extracted from top-level comment.

### Error Handling

- Missing API keys/config emit clear, user-visible errors in chat area.
- Worker execution errors produce stderr output and set cell status to `failed`.
- Cancellation sets cell status to `cancelled` and adds a concise message, without Python stack noise.

### Testing Strategy

- Unit tests (Vitest):
  - Storage helpers and settings hooks.
  - SnowflakeService request building, validation, and error propagation.
  - AI tools parameter validation and reducer logic for item insertion/linking.
  - Conversation rendering order and parts-based message rendering.
  - Cell toggle/status logic; output isolation; run/cancel state transitions.
  - Worker message protocol handling; streaming output appends; table rendering logic.

- E2E tests (Playwright, headless, `--reporter=list -x`):
  - Settings modal auto-open and persistence.
  - Creating/selecting/deleting notebooks; `updatedAt` rules; grouping by date.
  - AI chat streaming; tool-call icons; expandable details.
  - Multiple cells run/cancel; run-all disabled while running; outputs stream.
  - Auto-scroll on new message/cell (not on edits or output updates).

### Performance Considerations

- Single shared Pyodide instance for all cells to allow variable reuse across cells.
- Debounced persistence to LocalForage; avoid saving runtime output in files.
- Virtualized list considered for very long conversations.

### Security Considerations

- Frontend-only architecture: users provide their own API keys and tokens.
- Ensure COOP/COEP headers for SAB in production hosting.
- CORS must allow direct Gemini and Snowflake calls from browser.

### Future Extensions

- Markdown cells with rich rendering.
- SQL cell type leveraging Snowflake directly with result table reuse.
- Import/export of notebooks.
- Collaborative editing and presence.

# System Architecture

Version: 1.0  
Status: Living design document (update when implementing new stories)

## 1. Goals & Non‑Goals

Goals:

- Provide a Jupyter‑style, AI‑augmented notebook fully client‑side for Python execution (Pyodide) with rich chat + code cohabiting a unified conversation timeline.
- Support multiple persistent notebook files (local browser storage) with reliable modified timestamps and rollback editing of user messages.
- Enable AI function (tool) calling to introspect & mutate notebook structure, create new cells, and query Snowflake securely via direct REST API calls from the frontend.
- Stream outputs (stdout, stderr, tables, markdown) and allow immediate cancellation.

Non‑Goals (current):

- Multi‑user real‑time collaboration.
- Cloud sync / server persistence beyond Snowflake proxy.
- Full Jupyter feature parity (magics, kernels, rich MIME bundles beyond defined scope).

## 2. High‑Level Overview

Frontend (Vite, React) orchestrates:

- Unified Conversation List (chat messages + code cells + tool call icons + system outputs) rendered chronologically.
- Execution Engine (Web Worker + Pyodide) for Python code with streaming & cancellation.
- AI Chat Layer (Vercel AI SDK + Gemini model) with tool / function calling.
- Local Persistence Layer (localforage) for Notebook Files & Settings (API keys, Snowflake credentials).
- Settings Modal for dynamic per‑user keys.

```
+---------------------+
|   React (Vite SPA)  |
|  - Zustand Stores   |
|  - Conversation UI  |
|  - File Panel       |
|  - Settings Modal   |
+----------+----------+
           |
           | Web Worker (postMessage)
           v
    +---------------+
    | Pyodide (WASM)|
    | Exec Sandbox  |
    +---------------+
           ^
           | direct HTTPS (browser)
           v
    +------------------+
    | Snowflake REST   |
    +------------------+
           ^
           | localforage (IndexedDB)
           |
    +---------------+
    | Notebook Files|
    +---------------+
```

## 3. Core Functional Domains

1. Conversation & Cells (unified timeline).
2. Python Execution (worker, streaming, cancellation, table capture).
3. AI Interaction (chat, function calls, tool visualizations, rollback edit).
4. Persistence (multiple notebook files, settings, timestamps, title management, deletion).
5. Snowflake Access (secure proxy + AI tooling).
6. UI / Accessibility (responsive, keyboard navigation, ARIA, icons).
7. Testing & Quality (unit, integration, e2e, lint, type checks).

## 4. Technology Choices

- Framework: Vite + React 18.
- Styling: Tailwind CSS (light mode only initially).
- State Management: Zustand (complex shared state: conversation, cells, notebooks, editing). Local component state for ephemeral UI (input fields, toggles).
- Persistence: localforage (IndexedDB fallback). Debounced writes; deep change detection for updatedAt semantics.
- Python Runtime: Pyodide 0.28.0 in Web Worker (CDN) – isolates CPU, enables streaming & interruption.
- Editor: Monaco Editor (per code cell) with Python language support.
- AI SDK: Vercel AI SDK (Gemini 2.5 Flash) with tool calling (maxSteps=5) & streaming. **HARD REQUIREMENT: MUST use useChat hook from Vercel AI SDK. All tool calls MUST be implemented on FRONTEND ONLY in useChat's onToolCall. NEVER attempt to use custom chat implementation.**
- Validation: Zod for tool parameter schemas.
- Icons: react-icons.
- Table Rendering: Custom Tailwind table component from Pyodide messages (no heavy grid libs).
- Markdown Rendering: react-markdown (full standard Markdown) + syntax highlight (future optional) + horizontal scrolling for wide tables.

## 5. Data Models (TypeScript Interfaces - conceptual)

```
// Chat & Tool Parts
interface ChatTextPart { type: 'text'; id: string; content: string; role: 'user' | 'assistant'; }
interface ToolCallPart { type: 'tool-call'; id: string; toolName: string; status: 'pending'|'success'|'error'|'cancelled'; input: any; output?: any; error?: string; }

// Message (collection of parts)
interface ChatMessage { messageId: string; parts: (ChatTextPart | ToolCallPart)[]; createdAt: string; role: 'user' | 'assistant'; }

// Cells
interface CodeCell { id: string; linkedMessageId: string | null; text: string; status: 'idle'|'running'|'complete'|'failed'|'cancelled'; collapsed: boolean; outputs: CellOutput[]; }

// Outputs
interface StdOut { kind: 'stdout'; text: string; }
interface StdErr { kind: 'stderr'; text: string; }
interface TableOutput { kind: 'table'; columns: string[]; rows: any[][]; totalRows: number; previewRows: number; }
interface MarkdownOutput { kind: 'markdown'; text: string; } // AI or future rich outputs

type CellOutput = StdOut | StdErr | TableOutput | MarkdownOutput;

interface NotebookFile {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  title: string; // user editable
  cells: CodeCell[]; // without transient runtime info (omit outputs or keep? decision: persist only text + collapsed + id for portability; exclude outputs for deterministic reload)
  messages: ChatMessage[]; // full conversation including tool parts
}
```

Persistence Decision: Only persist durable information. Cell runtime outputs excluded (recomputed by re‑execution) to keep storage lean. (User stories specify excluding runtime state & outputs on load.)

## 6. Global State Structure (Zustand Stores)

- useConversationStore: messages, editingMessageId, rollback logic (truncate after edit) + auto-scroll flag detection.
- useCellsStore: cells array, create/update/delete, run status, output append, collapse toggling, runAll orchestration, mapping by id.
- useExecutionStore (optional split): shared interrupt buffer, currentlyRunningSet, worker handle.
- useNotebookFiles: activeFileId, map of NotebookFile metadata, load/save operations, deep diff before bump updatedAt, create/delete/select.
- useSettingsStore: geminiApiKey, snowflakeAccessToken, snowflakeHostname (in-memory + watchers hooked to localforage updates).

Separation Rationale: Minimizes unnecessary rerenders and logical coupling; editing message rollback should not re-render Monaco editors except when truncation affects cells.

## 7. Persistence Strategy

- localforage keys:
  - notebookFiles: Record<string, NotebookFile>
  - lastActiveNotebookId: string
  - gemini-api-key
  - snowflake-access-token
  - snowflake-hostname
- Debounced writes (e.g., 300–500 ms) after mutative actions (add message, modify cell text/title, delete cell). Execution state / output updates do NOT trigger persistence.
- Deep Equality Check: Compare structural (cells[].text, messages length, title) before writing to avoid unnecessary updatedAt changes (stories 0016, 0017, 0018).

## 8. Python Execution Architecture

### Worker Lifecycle

- Single dedicated Worker per page load (lazily instantiated). Maintained via ref; never recreated on parent re-renders (story 0002).
- Pyodide loaded from CDN (importScripts). Provide indexURL.
- Message Protocol (main thread -> worker):
  - loadPyodide (one-time)
  - execute { cellId, code }
  - setInterruptBuffer { sharedBuffer }
  - ping (optional health)
- Worker -> main thread messages:
  - ready
  - stdout { cellId, text }
  - stderr { cellId, text }
  - table { cellId, columns, rows, totalRows }
  - execution-complete { cellId }
  - execution-error { cellId, error }
  - execution-cancelled { cellId }

### Streaming Output (story 0003)

- Override Python print() & sys.stderr via context manager; flush each line with postMessage immediately.
- Ensure restoration in finally block.

### Cancellation (story 0004)

- SharedArrayBuffer (Uint8Array length 1) installed via pyodide.setInterruptBuffer inside worker.
- Main thread sets interruptBuffer[0] = 2 to inject SIGINT.
- Worker sends execution-cancelled if KeyboardInterrupt captured.

### Table Display (story 0020)

- Intercept display(df) by monkey-patching Python display function; detect pandas DataFrame type; transform df.head(50).to_json(orient="split") -> columns, data, total length.
- Emit table message after any preceding stdout order preserved.

## 9. AI Chat & Tool Calling Layer

### Message Flow

1. User sends text -> optimistic user message part appended.
2. Streaming begins from Gemini via Vercel AI SDK transport -> assistant parts stream (text chunks unify into final text part) + tool invocation parts (in order) appear as they are issued.
3. Tool invocation part life cycle: pending icon -> success/error -> optional follow-up assistant text.
4. New cell creation by tool (createCodeCell) inserts cell after associated message (linkedMessageId) collapsed by default.
5. listCells provides snapshot (id, type, text, status, output lines truncated or not included depending on scope); updateCell writes text & triggers updatedAt changes.
6. describeSnowflakeTable triggers Snowflake SQL, returns structured rows -> converted to markdown table inside tool output (or via TableOutput part).

### Rollback Editing (story 0023)

- Edit user message -> set editingMessageId -> show textarea.
- Accept send: truncate every conversation item & cell whose linkedMessageId or message order appears after edited message; persist new state; dispatch new AI request.
- Cancel: revert editingMessageId.

### Auto Scroll (story 0022)

- useEffect monitors conversation item count; if new item appended & user near bottom, scrollIntoView last item (smooth unless prefers-reduced-motion).

### Tool Call Icon Rendering (story 0021)

- Each tool call part rendered as inline icon group before assistant continuation text.
- Click/keyboard toggles expansion with JSON details; icon reused inside expanded panel.

## 10. Unified Conversation Composition

Render order produced by merging arrays:

- Start from chronological sequence: [messages and the cells immediately following the message they link to]. Each CodeCell stores linkedMessageId referencing previous chat message (or null for earliest cells if any). On createCodeCell, we compute correct insertion index.
- Keys: messageId for messages; `cell-${cell.id}` for cells.
- Editing overlay: apply opacity-70 to items whose index > editing target index.

## 11. UI Component Hierarchy (Representative)

- AppLayout
  - Sidebar (FilePanel)
    - NotebookList (grouped by date: Today, Yesterday, Earlier)
  - MainPane
    - NotebookHeader (Title input + Settings + Delete icons)
    - ConversationList (virtualizable future)
      - ConversationItem (delegates to ChatMessageView | CodeCellView)
        - ChatMessageView
          - MessagePartsRenderer
            - TextPart
            - ToolCallIconsRow
              - ToolCallIcon (expansion panel)
        - CodeCellView
          - CellHeader (Run/Stop, Status, Collapse toggle, Delete)
          - CodeEditor (Monaco) (hidden when collapsed)
          - OutputsRenderer (stdout/stderr segments, TableDisplay components)
    - MessageInputBar (textarea + send)
- ModalRoot
  - SettingsModal (Gemini Key, Snowflake Token, Hostname)

Support Components: TableDisplay, MarkdownRenderer, Tooltip, ConfirmDeletion (native confirm currently), AutoScrollAnchor.

## 12. Snowflake Access Architecture (Stories 0012, 0014, 0015)

- Frontend obtains token & hostname from settings store; constructs direct URL `https://${hostname}/api/v2/statements`.
- Requests are sent directly from the browser with `Authorization: Bearer <token>`.
- Request body: either `{ sql }` or `{ handle, partition }` (partition defaults to 0 when omitted).
- `describeSnowflakeTable` tool composes `describe table <table>` and uses the same service.
- Errors from Snowflake propagated to UI; missing config throws descriptive client-side errors.

## 13. Settings Modal (Stories 0013, 0014)

- Controlled by global settings store.
- Auto-open logic on mount if any required value missing.
- Focus trap + keyboard accessible.
- Persists keys via localforage; watchers keep in-memory state synchronized.

## 14. Notebook Files (Stories 0016–0019)

- Files grouped by updatedAt date only (YYYY-MM-DD). Group labels derived (Today, Yesterday, etc.).
- Opening file loads messages & cells into active stores (clearing transient execution state & outputs).
- Title editing: onBlur or Enter triggers persistence; deep diff ensures updatedAt only when changed.
- Deletion: confirm -> remove from map -> select next file by updatedAt desc -> if none, create a new blank file.
- Non-intrusive updatedAt logic (0017) ensures viewing does not mutate ordering.

## 15. Execution Flow Examples

### Run Single Cell

1. User clicks Run -> cell status running; outputs cleared.
2. Main thread posts execute message.
3. Worker streams stdout/stderr/table messages; store appends outputs.
4. On completion or error: status updated; run button re-enabled.

### Cancel Execution

1. User clicks Stop -> main thread sets interruptBuffer[0] = 2.
2. Worker raises KeyboardInterrupt -> sends execution-cancelled.
3. UI sets cell status cancelled; outputs include cancellation message.

### AI Create Code Cell

1. Tool invocation appears (pending icon).
2. Tool logic inserts collapsed cell after associated message (linkedMessageId referencing triggering message).
3. Tool completes – icon green; cell visible in conversation (collapsed description derived from top comment).
4. Auto-scroll triggers.

### Rollback Edit

1. User clicks previous message; enters edit mode.
2. After editing + Send: truncate future items (messages & cells), persist new conversation & cells snapshot, updatedAt bump.
3. New AI request streams; conversation grows from edited point.

## 16. Message & Cell Linking Rules

- Each newly appended user message gets messageId.
- Assistant message(s) that follow have their own messageId values.
- When user manually adds a cell (Add Cell button) or AI creates a cell, cell.linkedMessageId = messageId of immediately preceding chat message (or null if none exist yet).
- For rollback, any cell whose linkedMessageId corresponds to removed messages is also removed.

## 17. Markdown & Table Rendering (Stories 0011, 0020)

- react-markdown to render AI assistant text parts + potential markdown outputs.
- Tables from DataFrame: <div class="overflow-x-auto"> wrapping <table>. Caption appears when totalRows > previewRows.
- Large tables horizontally scroll only; vertical length limited to first 50 rows.

## 18. Tool Call Icon Rendering (Story 0021)

- Part statuses map to color-coded circular icons (green check, red times, blue spinner, orange minus).
- Tooltip: tool name + status.
- Expanded panel: same icon + name + JSON (parameters + output/error) color-coded (green success, red error, yellow cancelled) without extra borders.

## 19. Auto Scroll Behavior (Story 0022)

- Track previous length ref; if newLength > oldLength and nearBottom threshold (<= 100px slack) then scroll last item (smooth vs auto).
- Execution output updates do not alter length -> no scroll.

## 20. Accessibility & UX Guidelines

- All interactive elements: role / aria-label, keyboard focus ring (Tailwind focus-visible utilities).
- Icons sized consistently (e.g., 16–20px) with accessible contrast ratios.
- Modal: focus trap, ESC closes (except when mandatory initial key prompt). Prevent background scroll.
- Reduced motion preference disables smooth scroll animation.

## 21. Performance Considerations

- Virtualize ConversationList (future) once item count grows; abstract list API to allow drop-in virtualization (react-window/react-virtuoso).
- Debounce persistence writes.
- Avoid storing large outputs; skip persistence of ephemeral outputs.
- Worker isolation prevents UI jank.
- Lazy load Monaco & Pyodide (split dynamic imports).

## 22. Security Considerations

- SharedArrayBuffer requires COOP/COEP headers. For Vite dev, configure a proxy/dev server headers; for production static hosting, configure headers at the hosting platform (e.g., Netlify/Vercel/Cloudflare Pages) to enable COOP/COEP.
- User-provided API keys stored in localforage (unencrypted); warn users not to use production secrets (future encrypt or server-based key vault for multi-user SaaS).
- Snowflake tokens passed only via HTTPS; never persisted server-side.
- Sanitize AI tool parameters (Zod); prevent code injection in dynamic HTML (markdown renderer with safe defaults; disable raw HTML if not needed).

## 23. Extensibility Patterns

- Adding New Tool:
  1. Create schema in src/ai-functions/<tool>.ts exporting { name, description, parameters }.
  2. Register tool in frontend AI SDK tools map (no backend routes).
  3. Frontend: Add part renderer if new part type required; otherwise generic tool-call part.
  4. Update tests for invocation + UI icon + schema validation.
- Adding New Output Type: Extend CellOutput union + Worker message type + renderer switch; maintain insertion order.
- Adding New Cell Type (e.g., Markdown cell): Introduce cell.type field, differentiate editing component & execution semantics (no worker run). Ensure persistence & listCells update.

## 24. Testing Strategy

Layers:

1. Unit (Jest / Vitest):
   - Stores (reducers/mutations: cells, conversation, notebook files updatedAt logic).
   - Utility functions (diff detection, description extraction from top comment, table JSON parsing, markdown renderer wrappers).
   - Tool implementations (listCells, updateCell, createCodeCell, describeSnowflakeTable validation & behavior).
2. Integration:
   - Web Worker lifecycle (mock Worker or run real in jsdom with message simulation).
   - Snowflake service: mock direct REST calls to Snowflake endpoint and validate URL/header construction.
   - AI SDK streaming: mock Gemini transport responses and tool metadata exposure.
3. E2E (Playwright headless):
   - Hello World baseline.
   - Multi-cell run all & streaming output appears incrementally.
   - Cancellation mid-execution.
   - Collapse/expand code cells & status icons.
   - AI chat message streaming & tool calls (icons + expanded JSON).
   - Create code cell via tool and manual add; auto-scroll behavior.
   - File Panel: create, switch, updatedAt unchanged on open, changed on edit, delete, title edit persistence.
   - Rollback editing scenario (truncate & regenerate).
4. Regression Guards:
   - Snapshot tests for structural rendering (conversation ordering).
   - Worker message protocol contract tests.

Key Test Scenarios Mapped to Stories:

- 0002 Worker persistence & re-render safety.
- 0003 Streaming prints & delay simulation.
- 0004 Immediate cancellation in infinite loop.
- 0005 Toggle visibility + status icons stable.
- 0006 Chat send + streaming assistant.
- 0007 Function call order & status transitions.
- 0008 Run All sequential + isolation.
- 0009 Unified ordering of mixed items.
- 0010 createCodeCell insertion & collapsed description.
- 0011 Markdown full syntax (tables, code blocks, lists).
- 0012 / 0014 Snowflake header validation & partition fetch.
- 0013 Settings modal auto open & key usage.
- 0015 describeSnowflakeTable validation & markdown output.
- 0016–0019 Notebook file CRUD, updatedAt semantics, title & deletion.
- 0020 Table display row limit & caption.
- 0021 Tool call icons & expand/collapse.
- 0022 Auto-scroll on append only.
- 0023 Rollback edit truncation.

Automation:

- CI script: lint -> type-check -> unit tests -> build -> Playwright tests.

## 25. Error Handling Principles

- Surface user-actionable messages (missing API keys, Snowflake headers) in chat or UI banners.
- Worker exceptions -> execution-error message with sanitized reason.
- Tool errors mark tool call icon red & include error JSON in expandable panel.

## 26. Logging & Diagnostics

- Console.debug for dev (worker initialization, tool registration).
- Console.error for API route failures (Snowflake proxy) – do not leak stack to client.
- Potential future: in-memory log ring for diagnostics panel.

## 27. Configuration & Environment

- Vite dev server config: set response headers for COOP/COEP if testing cancellation locally; production: configure COOP/COEP headers at host (e.g., Netlify/Vercel/Cloudflare Pages). Static asset caching for Pyodide scripts controlled by CDN.
- Environment variables minimized (Gemini + Snowflake host replaced by client-managed values after stories 0013 & 0014).

## 28. Deployment Considerations

- Static SPA deployment (Vite build output) to a static host or CDN. Ensure headers supported for COOP/COEP; no server functions are required.
- CDN caching friendly; Pyodide loaded from external CDN (monitor version pin).

## 29. Risks & Mitigations

| Risk                                     | Impact              | Mitigation                                                                           |
| ---------------------------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| Worker freeze on heavy computation       | UI unresponsive     | Keep Python in worker only; allow cancel via interrupt buffer                        |
| Large conversation memory growth         | Performance degrade | Virtualization, prune strategy (future), exclude outputs from persistence            |
| User stores invalid Snowflake hostname   | Failed queries      | Normalization & validation (prepend protocol if missing; warn)                       |
| Race during rollback editing & streaming | Inconsistent state  | Pause accepting new AI stream while editingMessageId active (queue or abort request) |
| Tool output JSON huge                    | Render lag          | Collapse by default, lazy expansion code block                                       |
| Inaccurate updatedAt                     | Misleading ordering | Deep structural diff before bump                                                     |

## 30. Future Extensions (Design Hooks Present)

- Markdown cells as first-class type (extend CodeCell union).
- Rich media outputs (images, plots) via additional worker message kind.
- Collaborative mode via WebSocket layer substituting localforage with remote sync provider.
- Server persistence & sharing (introduce user auth, encryption for API keys server-side).
- Search across notebook files (index messages & cell text in local mini search index).
- Execution queue prioritization and concurrency limiting for parallel cell runs.

## 31. Implementation Conventions

- Filenames: kebab-case for components; hooks prefixed use; ai-functions folder for tool definitions.
- Avoid default exports (clarity in refactors & tree-shaking).
- All icons from react-icons; consistent sizing via Tailwind utilities.
- Shared types in `src/types/` (e.g., executionMessages.ts, conversation.ts) to prevent drift.
- Worker message types mirrored in a single source-of-truth module imported by both main & worker via path alias.

## 32. Checklist for Adding New Stories

1. Update this ARCHITECTURE.md if new architectural component or data model introduced.
2. Define new types centrally.
3. Add tool (if needed) with schema + tests.
4. Ensure persistence changes respect updatedAt semantics.
5. Add unit + e2e coverage; run full lint + type + tests.
6. Update IMPLEMENTED.md & README.
7. Perform spec compliance review per CLAUDE.md rules.

---

This architecture document should be revised when introducing: new output modalities, multi-user features, or large-scale performance optimizations (virtualization, caching, diff-based rendering). Keep it aligned with actual code to preserve its value as a living guide.
