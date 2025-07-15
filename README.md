# Rules

- do not ask user to run dev server, assume it's already running
- after completion of every user-story, update this file, include implemented story in 'implemented stories' section, explain what was done
- use react-icons for all icons

# Docs

- User stories are located in /docs/user-stories
- When creating a new user story put it in a separate file with a next available number.
- ALWAYS run tests and lint after finishing the task to make sure it is really complete

# Directory structure

- /docs/user-stories - user stories
- /docs/prompts - reusable system prompts for ai agents
- /src/app - nextjs routes
- /src/components - react components
- /src/utils - reusable utility code
- /src/hooks - react hooks

# Implemented user-stories

- **0001.APP.md**: Set up a minimal Next.js application with TypeScript, Tailwind CSS, ESLint, Prettier, and Jest. The application displays a "Hello World" message on the main page and has a basic project structure with a `src` directory.

- **0004.EXECUTION_CANCELLATION.md**: Implemented execution cancellation functionality for long-running Python scripts. Added a "Stop" button that appears during code execution, allowing users to immediately interrupt running code using SharedArrayBuffer and Pyodide's interrupt system. The implementation includes:
  - Security headers (COOP/COEP) in Next.js config for SharedArrayBuffer support
  - Stop button with React icons that appears during execution
  - SharedArrayBuffer interrupt buffer setup (1-byte SharedArrayBuffer wrapped in Uint8Array)
  - Immediate cancellation via SIGINT signal (buffer[0] = 2) to Pyodide
  - Proper Uint8Array creation from SharedArrayBuffer for Pyodide.setInterruptBuffer()
  - Error handling for when SharedArrayBuffer is unavailable
  - Updated worker message types and cancellation flow
  - Comprehensive test coverage including cancellation scenarios
  - Warning UI when SharedArrayBuffer is not supported

- **0005.CODE_CELL_TOGGLE_AND_STATUS.md**: Implemented code cell toggle and status functionality for better notebook UX. Added visibility controls and execution status indicators. The implementation includes:
  - Toggle button with eye icons (FaRegEye/FaRegEyeSlash) to show/hide code editor
  - Default state: code editor hidden, displaying only top-level comment as cell title
  - Status button with colored icons indicating execution state (idle, running, complete, failed, cancelled)
  - Hover tooltips showing available actions ("Run" or "Stop")
  - Top-level comment extraction for collapsed cell titles
  - Smooth CSS transitions for collapsing/expanding code editor
  - Execution status enum with proper state management
  - Updated button styling with appropriate colors and accessibility features
  - Read-only editor during code execution
  - Comprehensive test coverage for toggle and status functionality
  - Responsive design for mobile and desktop viewports (≥320px width)

- **0006.AI_CHAT.md**: Implemented AI chat functionality for real-time assistance while working with code cells. Added streaming AI responses using Gemini 2.0 Flash model via Vercel AI SDK. The implementation includes:
  - Chat component positioned directly above the code cell with multi-line textarea and send button
  - Real-time streaming AI responses from `/api/chat` endpoint using Google Generative AI
  - Keyboard shortcuts: Enter to send, Shift/Ctrl/⌘+Enter for new lines
  - User messages appear immediately with "sending..." state during API calls
  - Auto-scrolling chat history with chronological message display (oldest to newest)
  - Visual differentiation between user (blue) and assistant (gray) messages
  - Auto-resizing textarea that expands with content
  - Session-based conversation persistence (preserved for page duration)
  - Comprehensive error handling for missing API keys and network issues
  - System prompt optimized for Python/Jupyter assistance with practical coding guidance
  - Full test coverage including streaming responses, keyboard interactions, and error scenarios
  - Clean integration with existing CodeEditor component UI patterns

- **0007.AI_FUNCTION_CALLS.md**: Implemented AI function calls for structured interaction with notebook cells. Added deterministic, auditable actions for reading and modifying code cells. The implementation includes:
  - AI function calling via Vercel AI SDK with Zod schema validation
  - `listCells()` function to get snapshot of all cells with ID, type, text content, and output
  - `updateCell(id, text)` function to replace cell contents with new text
  - Function call rendering as conversation balloons with status-colored backgrounds
  - Status indicators: blue (in-progress), green (success), red (failure), orange (cancelled)
  - Each function defined in separate files under `src/ai-functions/` directory
  - Frontend function execution with backend metadata export pattern
  - Real-time function call state management using `onToolCall` callback
  - Multi-step conversation flow with `maxSteps: 5` enabling AI to continue after receiving function results
  - Proper error handling and parameter validation with Zod schemas
  - Integration with current single-cell structure (ready for multiple cells)
  - Comprehensive test coverage for function call rendering and execution
  - Status-specific UI styling with appropriate icons and visual feedback

- **0008.MULTIPLE_CODE_CELLS.md**: Implemented multiple code cells functionality for notebook-style development. Transformed the single-cell interface into a fully-featured multi-cell notebook environment. The implementation includes:
  - **Multiple Cell Management**: New `CellManager` state structure to handle multiple cells with proper tracking of running states and cell IDs
  - **Cell Component**: Extracted cell functionality into reusable `Cell` component with individual Monaco editors, output areas, and controls
  - **Global Controls**: "Run All" button for sequential execution and "Add Cell" button for creating new cells
  - **Single AI Chat**: Unified chat interface at the top that works with all cells via updated `listCells` and `updateCell` functions
  - **Individual Cell Controls**: Each cell has run/stop, toggle visibility, and delete buttons with user confirmation
  - **Execution State Management**: Proper isolation of cell execution states (idle, running, complete, failed, cancelled)
  - **Output Isolation**: Each cell displays only its own stdout/stderr output
  - **Worker Integration**: Shared Pyodide worker with proper state management for sequential execution
  - **Delete Functionality**: FaTrash icon with confirmation dialog for cell removal
  - **Accessibility Features**: WCAG 2.1 AA compliance with proper ARIA labels and keyboard navigation
  - **Type Safety**: Comprehensive TypeScript types for cell data, operations, and state management
  - **Test Coverage**: Updated all tests to work with multi-cell architecture
  - **Real-time Updates**: Live output streaming and execution state updates per cell
  - **Sequential Execution**: "Run All" executes cells in order, waiting for each to complete before starting the next

- **AI Tool Call Rendering Fix**: Fixed the chronological ordering issue in AI chat where tool calls were rendered after subsequent AI responses. Completely eliminated usage of `message.content`, `message.toolInvocations`, and all external function call state management, implementing a pure `message.parts`-only approach. All text, tool call data, status, results, and errors are now extracted directly from the parts array, ensuring perfect chronological order with zero redundant state. This ultra-clean architecture uses a single rendering loop with no external dependencies, guaranteeing that tool calls and responses appear in their exact natural conversation flow. The `ToolCallDisplay` component now receives only the part object and extracts all necessary information directly from it, eliminating any need for separate state tracking.
