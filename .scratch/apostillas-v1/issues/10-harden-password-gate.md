# Harden the password gate before deploying

Status: closed
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

**RALPH (2026-11-21):** Done: wrong passwords are throttled per IP (5 free, then 2s doubling to a 60s cap; a right password clears it). Sessions are HMAC-SHA256 of the password under a random 32-byte secret in <data>/session-secret, made on first use (mode 600). Changing APP_PASSWORD, or deleting the secret file, logs every session out. Deploy note: behind a reverse proxy, set adapter-node's ADDRESS_HEADER (e.g. X-Forwarded-For, with XFF_DEPTH) so the throttle sees real client IPs; otherwise everyone shares the proxy's address and the owner can be made to wait up to 60s.
