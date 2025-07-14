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
