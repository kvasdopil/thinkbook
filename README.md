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

- **0009.UNIFIED_CHAT_AND_NOTEBOOK.md**: Implemented the unified chat and notebook interface that merges AI chat messages and code cells into a single chronological conversation view. The implementation includes:
  - **Unified Conversation Architecture**: Replaced separate chat and cell lists with a single `ConversationItem` array that maintains chronological order of messages and cells
  - **Message and Cell Linking**: Added `messageId` to chat messages and `linkedMessageId` to cells, enabling proper context tracking between chat guidance and code execution
  - **Full Viewport Layout**: Conversation occupies full height with `ConversationList` component handling scrolling, while `FixedChatInput` stays pinned at bottom
  - **Seamless Integration**: AI function calls (`listCells`, `updateCell`) work seamlessly with the unified architecture, maintaining all existing functionality
  - **New Component Architecture**: Created modular components including `ConversationList`, `ConversationItem`, `MessageItem`, `ToolCallDisplay`, and `FixedChatInput`
  - **Enhanced User Experience**: Eliminates context switching between chat and cells, providing a notebook-style interface similar to Jupyter where conversation flows naturally
  - **Preserved Functionality**: All existing features (cell execution, AI assistance, function calls, cancellation) work identically within the new unified interface
  - **Type Safety**: Comprehensive TypeScript types for conversation items, proper AI SDK integration, and robust state management
  - **Test Coverage**: Updated all existing tests to work with the new architecture while maintaining full functionality coverage

- **0010.CREATE_CODE_CELL_TOOL.md**: Implemented AI-powered code cell creation for seamless notebook workflow. Added the `createCodeCell` AI function that allows the assistant to programmatically create new code cells during conversations. The implementation includes:
  - **New AI Tool**: `createCodeCell(text)` function with Zod schema validation for creating cells with specified source code
  - **Intelligent Placement**: New cells are automatically inserted immediately after the tool call that created them, maintaining perfect chronological conversation flow
  - **Parent-Child Linking**: Innovative `parentId` system links cells to either the message ID that preceded them or the tool call ID that created them, solving timing issues during AI function execution
  - **Collapsed by Default**: Newly created cells start in collapsed state, showing only the descriptive title derived from top-level comments
  - **Description Extraction**: Utilizes existing `getTopLevelComment()` logic to display meaningful cell titles when collapsed
  - **Smart AI Guidance**: Updated system prompt instructs AI to always include descriptive top-level comments when creating or editing cells for better UX
  - **Seamless Integration**: Works with all existing cell controls (run/stop, toggle visibility, delete) and execution functionality
  - **Real-time Creation**: Uses `toolCall.toolCallId` for immediate cell linking during function execution, eliminating previous timing issues
  - **Type Safety**: Comprehensive TypeScript types and interfaces for all new functionality
  - **Comprehensive Testing**: Full test coverage including successful creation, error handling, ordering, and description extraction scenarios
  - **Enhanced Workflow**: Eliminates manual cell creation steps, keeping conversation flow natural and context-aware

- **0011.MARKDOWN.md**: Implemented full markdown rendering for AI-generated responses to improve readability and usability. Added comprehensive markdown support using react-markdown with custom component styling. The implementation includes:
  - **Full Markdown Support**: AI responses render all standard markdown features including headings, code blocks, tables, lists, links, and inline formatting
  - **Transparent Background**: AI messages use transparent background (`bg-transparent`) without borders to match surrounding conversation UI, as required by the user story
  - **Custom Component Styling**: Created `MarkdownComponents` with Tailwind CSS styling for all markdown elements including proper spacing, colors, and typography
  - **Table Horizontal Scrolling**: Large tables automatically get horizontal scrolling (`overflow-x-auto`) wrapper to prevent container overflow while keeping other content readable
  - **Code Block Styling**: Syntax-highlighted code blocks with dark theme background and proper language detection support
  - **Inline Code**: Distinctive styling for inline code with gray background and proper contrast
  - **List Formatting**: Proper bullet points and numbering for unordered and ordered lists with appropriate indentation
  - **Typography Hierarchy**: Heading levels with proper font sizes and spacing (h1: 2xl, h2: xl, h3: lg) for clear content structure
  - **User Message Preservation**: User messages remain as plain text without markdown processing, maintaining the distinction between user input and AI-generated content
  - **React-Markdown Integration**: Used robust react-markdown library (v10.1.0) with TypeScript support and custom component overrides
  - **Test Coverage**: Added comprehensive tests verifying markdown component configuration, dependency installation, and basic rendering functionality
  - **Clean Architecture**: Markdown rendering only applied to AI assistant messages while preserving existing tool call and user message rendering patterns

- **0012.SNOWFLAKE_SQL_ENDPOINT.md**: Implemented a secure backend REST endpoint for executing SQL queries and fetching Snowflake result partitions. Added full integration with Snowflake's REST API while keeping database credentials secure on the server side. The implementation includes:
  - **Secure API Endpoint**: POST route at `/api/snowflake` that validates access tokens and environment configuration before processing requests
  - **Dual Functionality**: Supports both SQL query execution (`{ "sql": "SELECT ..." }`) and result partition fetching (`{ "handle": "<id>", "partition": <number?> }`)
  - **Authorization Handling**: Requires `x-snowflake-access-token` header, returns HTTP 400 if missing with descriptive error message
  - **Parameter Validation**: Validates that either `sql` or `handle` is provided, returns HTTP 400 if both are missing
  - **Snowflake Integration**: Forwards requests to Snowflake's REST API with proper headers (`Authorization: Bearer <token>`) and 30-second timeout
  - **Error Propagation**: Captures and forwards Snowflake API errors with HTTP 500 status and original error messages
  - **Environment Configuration**: Reads base URL from `SNOWFLAKE_BASE_URL` environment variable with descriptive error if undefined
  - **TypeScript Types**: Comprehensive type definitions for Snowflake responses (`SnowflakeResult`), request bodies (`SnowflakeRequestBody`), and error responses
  - **Partition Support**: Handles partition parameter conversion to number with fallback to 0, constructs proper GET URLs for partition fetching
  - **Security**: Logs server-side errors without exposing stack traces to clients, uses secure header-based token authentication
  - **Comprehensive Testing**: Full test coverage including successful execution, partition fetching, token validation, parameter validation, error propagation, and edge cases
  - **Node Environment Tests**: Tests run in Node.js environment with proper fetch mocking and environment variable handling
  - **All Quality Gates**: All existing lint, type-check, and Jest test suites pass with the new implementation

- **0013.SETTINGS_MODAL_GEMINI_KEY.md**: Implemented a settings modal to allow users to enter their own Gemini API key. The implementation includes:
  - **Settings Modal**: A new modal component that allows users to enter and save their Gemini API key.
  - **Local Storage**: The API key is saved to local storage using `localforage`.
  - **Custom Hook**: A new `useGeminiApiKey` hook to manage the API key.
  - **API Integration**: The chat API now uses the key from the `x-gemini-api-key` header.
  - **Automatic Prompt**: The settings modal is automatically displayed if the API key is not set.

- **0014.SETTINGS_MODAL_SNOWFLAKE.md**: Extended the settings modal to include Snowflake configuration, allowing users to connect to their own Snowflake accounts. The implementation includes:
  - **Extended Settings Modal**: Added "Snowflake Access Token" and "Snowflake Hostname" fields to the settings modal.
  - **Custom Hook**: Created a `useSnowflakeConfig` hook to manage the Snowflake configuration.
  - **Local Storage**: The Snowflake access token and hostname are saved to local storage.
  - **Dynamic API Backend**: The `/api/snowflake` backend now dynamically constructs the Snowflake API URL from the provided hostname and uses the access token from the request headers.
  - **Automatic Prompt**: The settings modal now also opens automatically if the Snowflake configuration is incomplete.
  - **Updated AI Function**: The AI can now use an `executeSql` function to directly query Snowflake, with any errors being returned to the user in the chat.
  - **Comprehensive Testing**: Updated and added tests for the new settings modal functionality and the backend Snowflake API.

- **0015.DESCRIBE_SNOWFLAKE_TABLE_TOOL.md**: Implemented a new AI tool to describe Snowflake tables for streamlined analytics workflows. The implementation includes:
  - **New AI Tool**: A new AI tool `describeSnowflakeTable(table)` is available to the assistant and properly included in the AI SDK call in `/api/chat`
  - **Frontend Integration**: The tool call is properly handled in the `onToolCall` callback in the frontend Home component, enabling full end-to-end functionality
  - **Zod Validation**: The `table` argument is validated to match the `database.schema.table` pattern using regex validation with clear error messages
  - **Snowflake Integration**: The tool issues a POST request to `/api/snowflake` with the body `{ "sql": "describe table <table>" }` using the existing Snowflake client utility
  - **Consistent Architecture**: Fixed metadata structure inconsistencies between AI functions to follow the same pattern (`{ name, description, parameters }`)
  - **Error Handling**: Comprehensive error handling with Zod validation errors and backend error propagation
  - **Comprehensive Testing**: Unit tests cover successful calls, validation failures, backend error propagation, edge cases, and frontend tool call rendering
  - **Quality Assurance**: All lint, type-check, and existing test suites pass with proper TypeScript type safety (61 tests total)

- **0016.NOTEBOOK_FILE_PANEL.md**: Implemented a notebook file panel for managing multiple notebooks. The implementation includes:
  - **File Panel**: A new `FilePanel` component that lists notebook files, grouped by date.
  - **File Management**: A `useNotebookFiles` hook to manage creating, loading, and saving notebook files to `localforage`.
  - **State Management**: The `Home` component now gets its state from the `useNotebookFiles` hook, and all modifications are persisted.
  - **Persistence**: The application state is saved to `localforage`, and the last active file is reopened on page load.
  - **Testing**: Added tests for the `FilePanel` component and the `useNotebookFiles` hook.

- **0017.NON_INTRUSIVE_UPDATED_AT.md**: Implemented non-intrusive `updatedAt` handling for notebook files. The implementation includes:
  - **Deep-Equality Check**: The `updatedAt` timestamp is now only updated when the file's contents (cells, messages, title) have actually changed.
  - **Lodash Integration**: Used `lodash/isEqual` for performant and reliable deep-equality checks.
  - **Comprehensive Testing**: Added unit tests to cover various scenarios, including no-change, title change, cell change, and message change.
