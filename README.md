# Rules

- do not ask user to run dev server, assume it's already running
- after completion of every user-story, update this file, include implemted story in 'implemented stories' section, explain what was done
- use react-icons for all icons

# Docs

- User stories are located in /docs/user-stories
- When creating a new user story put it in a separate file with a next available number.

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

- 0005.CODE_CELL_TOGGLE_AND_STATUS.md – Code cell toggle and status feature implemented with collapsible editor and execution state indicators. Highlights:

  - **CodeCell component** created with toggle and status functionality using React state management
  - **Toggle button** with eye icon (FaRegEye/FaRegEyeSlash) from react-icons to show/hide code editor
  - **Default hidden state** code editor collapsed by default, showing only extracted top-level comment
  - **Comment extraction** parsing Python code to extract and display the first non-empty comment line
  - **Execution state management** tracking 5 states: new, running, complete, failed, cancelled with proper state transitions
  - **Status button** with color-coded indicators and icons showing current execution state
  - **Hover interactions** status button shows "Run" or "Stop" actions on hover with appropriate icons
  - **Smooth animations** CSS transitions for collapsible editor with max-height and opacity changes
  - **Responsive design** flexible layout working on mobile viewports (≥320px width)
  - **Accessibility features** proper aria-labels, keyboard focus styles, and screen reader support
  - **Icon consistency** all icons from react-icons (FaPlay, FaStop, FaCircle, FaCheckCircle, FaTimesCircle, FaSpinner)
  - **State-based styling** different colors for each execution state (gray=new, blue=running, green=complete, red=failed, orange=cancelled)

- 0006.AI_CHAT.md – Inline AI chat assistant added above each code cell. Highlights:

  - **ChatInterface component** with scrollable history panel and responsive design
  - **Keyboard behavior**: Enter sends, Shift/Ctrl/⌘ + Enter inserts newline
  - **Streaming replies** via Vercel AI SDK (`createGoogleGenerativeAI` + `streamText`) calling `gemini-2.5-flash`
  - **System prompt constant** stored in `prompts/system-prompt.ts` (no runtime file I/O)
  - **Conversation state** preserved on client and included with every request
  - **Visual differentiation** between user and assistant messages using Tailwind and react-icons
  - **Loading indicator** shows spinner while the assistant is thinking
  - **Integration** Chat panel rendered above each `CodeCell` without affecting execution engine
  - **Error handling** for missing API key, rate limits, or SDK failures with safe JSON responses
  - **Mobile-friendly** layout and accessibility considerations remain intact

- 0007.AI_FUNCTION_CALLS.md – AI agent function calls implemented for direct notebook cell interaction. Highlights:

  - **Function architecture** with `app/ai-functions/` directory where each function lives in its own file
  - **Function metadata** exported from server (name, description, parameters schema) with frontend implementations
  - **Initial functions** `listCells` and `updateCell` with proper TypeScript interfaces and parameter validation
  - **Function registry** in `app/ai-functions/index.ts` for centralized function management
  - **API integration** updated `/api/chat` route to support tools parameter with Vercel AI SDK
  - **Function call balloons** rendered as separate conversation elements with status-based styling
  - **Status indicators** color-coded balloons (blue=in-progress, green=success, red=failure, orange=cancelled)
  - **Real-time execution** functions execute on frontend with immediate UI feedback and status updates
  - **Cell integration** CodeCell component provides cell data and handles updates from function calls
  - **Output integration** main page passes formatted output string to enable function access to execution results
  - **Extensible design** adding new functions requires only creating a new file in `app/ai-functions/`
  - **Type safety** shared TypeScript types in `types/ai-functions.ts` for consistent interfaces
  - **Error handling** function failures display in red balloons with error messages
  - **One-by-one execution** functions called sequentially as specified in requirements

- 0008.MULTIPLE_CODE_CELLS.md – Multiple code cells feature implemented with comprehensive cell management. Highlights:

  - **Multiple cells architecture** transformed from single cell to cells array with individual execution states
  - **Run All button** executes all cells sequentially from top to bottom, disabled when any cell is running
  - **Add Cell button** creates new empty Python cells at the end of the notebook
  - **Individual cell management** each cell has its own code, output, and execution state
  - **Cell-specific output** output displays within each cell instead of global output section
  - **Delete functionality** trash button with confirmation dialog for each cell (minimum 1 cell required)
  - **Execution state management** proper handling of running states across multiple cells
  - **Non-editable running cells** cells become read-only during execution to prevent conflicts
  - **AI function compatibility** updated `listCells` and `updateCell` functions to work with multiple cells
  - **Sequential execution** "Run All" processes cells one by one with proper state transitions
  - **Cell-specific output clearing** output clears when each cell begins execution
  - **Accessibility compliance** WCAG 2.1 AA features including proper ARIA labels, keyboard navigation, screen reader support
  - **Focus management** proper focus ring styles and tabIndex management for all interactive elements
  - **Status announcements** screen reader announcements for cell execution states and operations
  - **Error handling** robust error handling for cell operations and state management
  - **Responsive design** maintains mobile-friendly layout with proper spacing and controls
