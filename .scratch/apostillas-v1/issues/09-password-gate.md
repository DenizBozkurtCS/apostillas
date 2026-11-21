# Optional single-password gate for deployment

Status: closed
Blocked by: 01, 08

Per ADR-0001.

## Acceptance criteria

- When `APP_PASSWORD` is set, every route except the login page requires a session cookie obtained by entering it
- When unset, there is no login at all
- Logout action; session cookie is httpOnly, and secure in production

## Comments

**RALPH (2026-11-21):** Added optional single-password gate (ADR-0001): hooks.server.ts redirects every non-public route to /login when APP_PASSWORD is set, login/logout routes, httpOnly session cookie (secure in production); open app when unset.
