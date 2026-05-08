# Viewer Project Mistakes Log

This file captures errors, corrections, and lessons learned during Viewer development. Task agents MUST read this before implementing features.

## How to Use This Log

**For Task Agents:**
1. Read this file before starting implementation
2. Check if your task relates to any documented mistakes
3. Apply the "Fix" approaches to avoid repeating errors

**For Adding New Entries:**
- Add entries immediately after discovering a mistake
- Be specific about what went wrong and how to fix it
- Include the date for context

---

## Architecture Mistakes

Structural and design-level errors.

**Pattern:** Creating new state outside the Zustand store system.
**Fix:** All shared state belongs in `src/stores/`. Check existing stores before adding new ones. Use the established patterns from `appStore.ts`.
**Date:** 2026-02-01

---

## Syntax & Code Mistakes

Language-specific errors, typos, incorrect API usage.

<!--
Pattern: [What went wrong]
Fix: [Correct approach]
Date: [YYYY-MM-DD]
-->

---

## Tooling Mistakes

Build tools, dev environment, dependencies.

**Pattern:** Running `npm install` in the wrong directory (monorepo root vs app directory).
**Fix:** Always run npm commands from `~/Desktop/Projects/VIEWER/apps/viewer/`. The monorepo structure requires being in the correct workspace.
**Date:** 2026-02-01

---

## Pattern Mistakes

Incorrect usage of project patterns, conventions, or idioms.

**Pattern:** Adding inline styles instead of using Tailwind.
**Fix:** Viewer uses Tailwind CSS exclusively. Use utility classes, not inline styles or CSS modules.
**Date:** 2026-02-01

**Pattern:** Creating new IPC handlers without documenting them.
**Fix:** All IPC handlers must be documented in `docs/API_REFERENCE.md`. Add the handler signature and description.
**Date:** 2026-02-01

---

## Viewer-Specific Patterns

**Pattern:** Modifying app registration without updating the app manifest.
**Fix:** When adding/modifying apps, update both the component and the app registry in `src/apps/`. Check `AGENTS.md` for the app system architecture.
**Date:** 2026-02-01

**Pattern:** Not handling window focus states in new components.
**Fix:** Viewer apps need to handle active/inactive states. Use the `useWindowFocus` hook or subscribe to the app store's active window state.
**Date:** 2026-02-01
