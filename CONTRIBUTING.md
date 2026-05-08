# Contributing to Viewer

Thanks for your interest. This project is in active development and contributions are welcome.

## Getting set up

```bash
git clone https://github.com/coltonkirsten/viewer.git
cd viewer/apps/viewer
npm install
npm run dev
```

If you're working on the AI backend, also see `apps/raven/` and create a `.env` from `.env.example` at the repo root.

## Workflow

1. Open an issue first for anything beyond a small bug fix or doc improvement. This avoids duplicate work and lets us align on direction.
2. Fork the repo and create a branch with a short descriptive name (`feat/file-explorer-keyboard-nav`, `fix/window-restore-tab-id`).
3. Make your change. Keep PRs scoped — one feature or fix per PR.
4. Run `npm run lint` and confirm the app still launches with `npm run dev`.
5. Open the PR. Reference the issue in the description.

## What makes a good PR

- A clear description of what changed and why
- Before/after screenshots or screen recordings for UI changes
- New apps include a brief README in their app folder
- No new top-level directories without prior discussion (per `AGENTS.md`)
- No bundled credentials, API keys, or personal data

## App authoring

If you're adding a new viewer app, see the "Building a New App" section in `README.md` and the full reference in `AGENTS.md`. Stick to the two-file pattern (`index.ts` registration + your component) and register the app in `apps/viewer/src/apps/index.ts`.

## Code style

- TypeScript for new code in `apps/viewer/`
- Functional React components with hooks
- Tailwind for styling
- `kebab-case` for directories and files
- Existing patterns in `apps/viewer/src/apps/` are the reference

## Reporting bugs

Open an issue with:
- What you did
- What you expected
- What happened instead
- OS, Node version, and Viewer commit

## Questions

Open a GitHub Discussion for questions about architecture, roadmap, or app ideas.
