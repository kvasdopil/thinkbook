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
