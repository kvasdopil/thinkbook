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
