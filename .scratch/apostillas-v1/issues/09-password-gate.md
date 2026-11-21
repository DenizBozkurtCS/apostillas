# Optional single-password gate for deployment

Status: ready-for-agent
Blocked by: 01, 08

Per ADR-0001.

## Acceptance criteria

- When `APP_PASSWORD` is set, every route except the login page requires a session cookie obtained by entering it
- When unset, there is no login at all
- Logout action; session cookie is httpOnly, and secure in production
