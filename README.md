# Rules

- do not ask user to run dev server, assume it's already running
- after completion of every user-story, update this file, include implemented story in 'implemented stories' section, explain what was done
- use react-icons for all icons

# Guidelines

- make sure all buttons have enough spacing, have some hover effect, and use pointer cursor to indicate they are clickable

# Docs

- User stories are located in /docs/user-stories
- When creating a new user story put it in a separate file with a next available number.
- ALWAYS run tests and lint after finishing the task to make sure it is really complete
- Implemented user stories are tracked in `docs/IMPLEMENTED.md`. ALWAYS update that file after you're done with a user story.

## Implemented stories

- 0001.APP
- 0002.JUPYTER_ENGINE
- 0003.STREAMING_OUTPUT — Real-time stdout/stderr streaming from the Pyodide worker with unified `{ type: 'out'|'err', value }` messages; UI appends progressively and preserves error handling.
- 0004.EXECUTION_CANCELLATION — Added Stop button and immediate interruption via SharedArrayBuffer. Main thread sets `Uint8Array(sab)[0] = 2` to signal SIGINT; worker maps `KeyboardInterrupt` to `execution-cancelled`, UI prints "Execution interrupted by user" and re-enables Run. Required COOP/COEP headers added in `next.config.ts`.
- 0005.CODE_CELL_TOGGLE_AND_STATUS — Added eye toggle to show/hide the code editor (default hidden), display top-level comment when collapsed, and a status button showing idle/running/complete/failed/cancelled with icons and colors. Status button runs or stops on click; smooth collapse/expand animation and accessible labels included. Added Playwright tests.
- 0006.AI_CHAT — In-page AI chat above the code cell. Multi-line input with Cmd/Ctrl+Enter to send, streaming responses from `/api/chat` using Vercel AI SDK with `gemini-2.5-flash`. Messages render via `parts`, with session-scoped history and status indicator.

# Directory structure

- /docs/user-stories - user stories
- /docs/prompts - reusable system prompts for ai agents
- /src/app - nextjs routes
- /src/components - react components
- /src/utils - reusable utility code
- /src/hooks - react hooks
