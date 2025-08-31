# Rules

- do not ask user to run dev server, assume it's already running
- after completion of every user-story, update this file, include implemented story in 'implemented stories' section, explain what was done
- use react-icons for all icons
- use zustand for state management for anything complex

# Guidelines

- make sure all buttons have enough spacing, have some hover effect, and use pointer cursor to indicate they are clickable
- User stories are located in /docs/user-stories
- When creating a new user story put it in a separate file with a next available number.
- ALWAYS run tests and lint after finishing the task to make sure it is really complete
- Implemented user stories are tracked in `/docs/IMPLEMENTED.md`. ALWAYS update that file after you're done with a user story.
- Each user story should have playwright tests implemented
- Each user story should have unit tests implemented
- Playwright tests should ALWAYS run in headless mode, with --reporter=list -x options
- After completing work on a user story ALWAYS make sure to perform spec compliance review with `spec-compliance-reviewer` agent, provide it with the filename of a user-story
- After completing work on a user story ALWAYS make sure to perform architectural review with `minimal-change-reviewer` agent
- Never modify user-stories unless explicitly asked by a user
- in playwright tests redirect console.log and console.error to cli output so you can see why tests are failing

# Directory structure

- /docs/user-stories - user stories
- /docs/prompts - reusable system prompts for ai agents
- /src/components - react components
- /src/services - frontend API services (Snowflake, AI, etc.)
- /src/utils - reusable utility code
- /src/hooks - react hooks

# Implemented Stories

- see /docs/IMPLEMENTED.md for detailed implementation notes
- NEVER modify this file, keep the list of implemented stories in /docs/IMPLEMENTED.md
