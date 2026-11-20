# Single user, local-first, deployable later

apostillas serves exactly one reader, so there is no user model, sign-up, or per-user data scoping. It runs first as a local server with its data in a single file on disk, and is built so the same process can later be deployed to a host (e.g. for phone access) behind a single password. We rejected multi-user (auth and tenancy cost for no current need) and browser-only storage (IndexedDB can be wiped and doesn't sync across devices).
