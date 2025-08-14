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
- Each user story should have playwright tests implemented

## Implemented stories

- see /docs/IMPLEMENTED.md
  - 0011.MARKDOWN: AI outputs render as full Markdown via `react-markdown` with support for tables, lists, and code blocks. Added scoped styles and tests.

# Directory structure

- /docs/user-stories - user stories
- /docs/prompts - reusable system prompts for ai agents
- /src/app - nextjs routes
- /src/components - react components
- /src/utils - reusable utility code
- /src/hooks - react hooks
