## 0001.APP

- Set up Next.js (App Router) with TypeScript and Tailwind CSS under `src/`
- Configured ESLint (flat config) and integrated Prettier with `eslint-config-prettier`
- Added `.prettierrc` (single quotes, trailing commas, semi; 100 cols)
- Enabled Turbopack for `dev` script
- Forced light color scheme in `globals.css` and `layout.tsx`
- Added simple homepage that renders "Hello World"
- Added Playwright config and e2e test `tests/hello-world.spec.ts`
- Added scripts: `dev`, `build`, `start`, `lint` (includes `tsc`), `format`, `type-check`, `test`
- Created stub directories: `src/components`, `src/utils`, `src/hooks`

## 0002.JUPYTER_ENGINE

- Added Monaco editor on the homepage with Python language mode
- Implemented a Pyodide web worker (`src/workers/pyodide.worker.ts`) loading v0.28.0 from CDN
- "Run" button executes Python code via the worker; stdout/stderr stream to the UI
- Output is displayed below the editor as plain text
- Worker is bundled with `new Worker(new URL('./worker.ts', import.meta.url))`
- Worker lifecycle is stable across parent re-renders; only initialized once and terminated on unmount
- Tests added and passing:
  - `tests/hello-world.spec.ts` updated to check "Python Runner" heading
  - `tests/jupyter-engine-worker.spec.ts` verifies streaming output and persistence across re-renders

## 0003.STREAMING_OUTPUT

- Enabled real-time streaming of Python `stdout` and `stderr` via Pyodide's `setStdout`/`setStderr`
- Unified worker message types for logs to `{ type: 'out' | 'err', value: string }`
- Preserved other worker messages: `ready`, `result`, `error`, `done`
- UI appends output progressively and keeps the Run button disabled during execution
- Error handling continues to surface errors inline and signals completion with `done`
- Existing e2e test `tests/jupyter-engine-worker.spec.ts` asserts streaming behavior and worker persistence across parent re-renders

## 0004.EXECUTION_CANCELLATION

- Added Stop button to `PythonRunner` shown during execution
- Implemented cancellation via SharedArrayBuffer: main thread creates `new SharedArrayBuffer(1)` and sends to worker; on Stop sets `Uint8Array(sab)[0] = 2`
- Worker applies `setInterruptBuffer` and maps `KeyboardInterrupt` to `{ type: 'execution-cancelled' }`
- UI shows "Stopping..." immediately and then "Execution interrupted by user"
- Re-enabled Run after cancellation (`done` message)
- Added COOP/COEP headers in `next.config.ts` to enable SharedArrayBuffer
- Added e2e test to cancel an infinite loop

## 0005.CODE_CELL_TOGGLE_AND_STATUS

- Added code editor visibility toggle with `FaRegEye`/`FaRegEyeSlash`, default hidden
- When collapsed, show the top-level Python comment block as markdown-like text
- Added a status button with icons/colors for `idle`, `running`, `complete`, `failed`, `cancelled`
- Status button starts run (when idle/complete/failed/cancelled) and stops (when running)
- Smooth CSS transition using `max-height`/opacity with responsive layout
- Accessibility: `aria-label`/`title` on buttons and keyboard focusable elements
- Added Playwright tests `tests/code-cell-toggle-and-status.spec.ts`

## 0006.AI_CHAT

- Added chat panel above the code cell using `useChat` from Vercel AI SDK
- Streaming backend at `src/app/api/chat/route.ts` using `gemini-2.5-flash`
- System prompt embedded in the route for now; renders assistant/user messages via `message.parts`
- Keyboard: Cmd/Ctrl+Enter sends; Shift/Enter for newline
- Status shown via `status` from `useChat`

## 0007.AI_FUNCTION_CALLS

- Added `src/ai-functions/` with Zod schemas and metadata for tools: `listCells()` and `updateCell(id, text)`
- Wired tools into `/api/chat` with `maxSteps: 5`; backend exports metadata only
- Implemented a lightweight notebook store `useNotebook` to track cells with `{id, type, text, status, output}`
- `PythonRunner` registers a cell and syncs status/output; exposes controller to update text
- `AIChat` executes tool calls on the client via `onToolCall`, validates with Zod, and sends results with `addToolResult`
- Chat UI renders `parts` only and shows function call/result balloons with status colors (blue/green/red)

## 0008.MULTIPLE_CODE_CELLS

- Notebook store now maintains an ordered list of cells and exposes controllers per cell (`run`, `stop`, `setText`, `isRunning`), plus `deleteCell`
- `PythonRunner` refactored to accept a cell `id`, be read-only while running, and provide a delete action with confirmation
- Page renders a single AI chat and a list of Python cells with controls for "Run All" and "+ Add Cell"; "Run All" executes sequentially top-to-bottom; actions disabled while any cell is running
- Each cell isolates its own output, clears output on run, and updates status to complete/cancelled/failed accordingly

## 0009.UNIFIED_CHAT_AND_NOTEBOOK

- Added `linkedMessageId` to `NotebookCell` to associate cells with the preceding chat message (or `null` if none)
- Implemented `UnifiedConversation` component that renders a single chronological list combining chat messages and notebook cells
- New cells are appended after the current last conversation item and linked to the last message id
- Conversation area is scrollable; input panel is fixed at the bottom; run-all and add-cell controls moved into the conversation header
- Code split into dedicated components under `src/components` and integrated on the homepage

## 0011.MARKDOWN

- Integrated `react-markdown` with `remark-gfm` to render assistant AI outputs as full Markdown (headings, lists, tables, code blocks)
- Added `MarkdownRenderer` component and scoped styles under `.ai-markdown` ensuring full-width content with no background/border
- Ensured large tables and code blocks scroll horizontally within the output area only
- Updated mock AI response to include Markdown for testing; added Playwright assertions in `tests/ai-chat.spec.ts`
- No a11y changes; text-only rendering
