# Harden the password gate before deploying

Status: needs-triage
Blocked by: 09

Do this before putting apostillas on the internet. On a single machine or home
network neither gap matters much. Found while reviewing issue 09 (2026-11-21).

## Acceptance criteria

- Repeated wrong passwords are slowed down (e.g. an increasing delay or a
  short lockout after several failures), so the password can't be guessed by
  trying many in a row. It must not let someone else lock the owner out for long.
- The session cookie is no longer an unsalted SHA-256 of the password. Sign
  it (HMAC) with a random secret kept in the data folder and created on first
  use, so a stolen cookie reveals nothing about the password and offline
  guessing from it is impossible.
- Changing `APP_PASSWORD` still logs out every existing session.

## Comments
