# Security Policy

## Reporting a vulnerability

If you discover a security issue in Viewer, please report it privately rather than opening a public issue.

**Email**: [open a private security advisory on GitHub](https://github.com/coltonkirsten/viewer/security/advisories/new)

Please include:
- A description of the issue
- Steps to reproduce
- The affected version or commit
- Any suggested mitigation

You can expect an initial response within 7 days.

## Scope

Security reports are accepted for:
- The Electron viewer app (`apps/viewer/`)
- The AI daemons (`apps/agent-daemon/`, `apps/raven-daemon/`)
- The Flask AI backend (`apps/raven/`)

## API keys and credentials

Viewer never bundles API keys. All keys are read from environment variables at runtime. If you find a key committed to the repository, please report it as a security issue.

## Supported versions

Only the latest commit on `main` receives security updates while the project is pre-1.0.
