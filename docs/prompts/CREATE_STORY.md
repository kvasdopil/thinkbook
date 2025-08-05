You are preparing a new user-story document for the Next.js notebook application.

Follow **exactly** the Markdown layout shown below. Replace every {{placeholder}} with concrete information. Do **not** omit or rename sections. Keep headings (`##`) and list markers (`-`, `1.`) intact so automated tooling can parse the file.

---

# {{NUMBER}}.{{KEBAB_CASE_TITLE}}

## Background

{{Concise context explaining _why_ this feature is needed (2–4 sentences).}}

## User Story

> **As a** {{user persona}} > **I want** {{capability}} > **So that** {{business or user value}}

## Acceptance Criteria

1. {{First observable, testable criterion}}
2. {{Second criterion}}
3. {{…}}

## Technical Notes (optional)

- {{Implementation hints, libraries, constraints}}

## Out of Scope (optional)

- {{Explicitly state what is _not_ included}}

## Potential Pitfalls (optional)

- {{Known tricky areas, common mistakes}}

## Definition of Done

- All acceptance criteria are met
- Unit / integration tests pass
- Lint & type-check succeed
- Documentation (README, Storybook, etc.) is updated

---

````

---

## Formatting & Naming Conventions

1. **File name**: `####.TITLE.md` where `####` is a zero-padded sequence (e.g. `0008`) and `TITLE` is SCREAMING_SNAKE_CASE.
2. **Top-level heading** (`#`) combines the number and Title in _kebab-case_ for URL-friendliness.
3. **Markdown**: Use fenced code blocks and bullet lists like in previous stories (`0001`–`0007`).
4. **Verb tense**: Acceptance criteria are written in the **present tense** describing the _completed_ behaviour.
5. **Icons**: When specifying icons, reference **react-icons** packages as per project rules.

## Authoring Guidelines

- Prioritise **clarity and testability**. Each acceptance criterion must be verifiable.
- Keep the **Background** short; details belong in Technical Notes.
- List **non-functional requirements** (performance, accessibility, security) when relevant.
- If the request is **ambiguous or lacks detail**, the agent **MUST** ask clarifying questions _before_ finalising the story. Include a `Clarifications` section temporarily if needed.
- Maintain consistency with earlier stories for effortless tooling and onboarding.

## Example (abridged)

The following is a shortened excerpt generated with this template:

```markdown
# 0008.dark_mode_toggle

## Background

Many users prefer dark mode to reduce eye strain and improve battery life on OLED devices.

## User Story

> **As a** power user
> **I want** to toggle between light and dark themes
> **So that** I can work comfortably in different lighting conditions.

## Acceptance Criteria

1. A "Theme" toggle is visible in the header on desktop and mobile.
2. The preference is saved to `localStorage` and persists on reload.
3. Default theme follows the user’s OS preference on first visit.

## Definition of Done

- All criteria satisfied
- New E2E test passes in Playwright
````

---

Keep this document up-to-date if formatting rules evolve.

We do not need to estimate tasks or track completion in a user-story, just formulate the requirements and include details that essential for the task.

Make sure to write unit tests and integration tests for the code.

If you're uncertain about anything, ask clarifying questions or list them in a separate section
