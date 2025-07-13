# Rules

- do not ask user to run dev server, assume it's already running
- after completion of every user-story, update this file, include implemted story in 'implemented stories' section, explain what was done

# Docs

- User stories are located in /docs/user-stories

# Directory structure

- /app - nextjs routes
- /components - react components
- /utils - reusable utility code
- /hooks - react hooks

# Implemented user-stories

- 0001.APP.md – Initial "hello world" single-page application implemented. Highlights:

  - Next.js App Router scaffold created with TypeScript support
  - Tailwind CSS configured for styling
  - ESLint (Airbnb config) + Prettier set up for linting and formatting
  - Root route (`/`) now renders a minimal **Hello, World!** heading via `app/page.tsx`

- 0002.JUPYTER_ENGINE.md – Jupyter notebook engine implemented with web worker and UI. Highlights:

  - **Monaco Editor** integrated for Python code editing with syntax highlighting
  - **Pyodide** loaded from CDN running in a Web Worker for Python execution
  - **Web Worker communication** set up for non-blocking Python code execution
  - **Output display** capturing stdout/stderr from Python execution
  - **UI components** include code editor, run button, and output terminal-style display
  - **Error handling** for initialization failures and execution errors
  - **Status indicators** showing initialization and execution states

- 0003.STREAMING_OUTPUT.md – Real-time streaming output for Python execution. Highlights:

  - **Streaming output** displaying print statements in real-time as they execute
  - **Auto-scroll functionality** keeping output visible during long-running scripts
  - **Output differentiation** with color-coded stdout (green) and stderr (red) messages
  - **Per-call granularity** sending each print statement immediately to the UI
  - **Proper print redefinition** avoiding recursion and keyword conflicts
  - **Shared message types** for consistent worker-main thread communication

- 0004.EXECUTION_CANCELLATION.md – Execution cancellation feature implemented with SharedArrayBuffer. Highlights:
  - **SharedArrayBuffer cancellation** using `pyodide.setInterruptBuffer()` for immediate cancellation of any Python code
  - **Security headers** added (`Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy`) to enable SharedArrayBuffer
  - **Availability detection** checking SharedArrayBuffer support and showing error when not available
  - **Stopping state** providing immediate feedback when cancellation is requested
  - **Progressive button states** showing "Stop" → "Stopping..." → "Run Code" flow
  - **KeyboardInterrupt handling** using standard Python exception for SharedArrayBuffer cancellation
  - **UI feedback** showing "Stopping execution..." and "Execution interrupted by user" messages
  - **Clean state reset** allowing new code execution immediately after cancellation
  - **Status indicators** showing SharedArrayBuffer availability and cancellation capabilities

# Next user story to implement

- All current user stories have been implemented. The Jupyter notebook engine now supports Python code execution with real-time streaming output and immediate execution cancellation via SharedArrayBuffer.
