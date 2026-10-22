# Bot Gluttony

A player for DOM elements. This repository now tracks the source actually deployed by the artwork, including its Nuxt 2 interface, project editor and player. Earlier implementations remain in Git history.

## Build and run

Use Node 24.22.1 and Yarn 1.22.22.

```sh
yarn install --frozen-lockfile --ignore-optional
yarn build
yarn start
```

Copy `.env.example` to a private `.env` and configure the existing MongoDB and login credentials. Preserve uploaded media outside Git. Bind a persistent private directory to `/app/maintenance-state` (0700); authentication deliberately fails closed if the persistent mount is missing or unreadable. Run behind the documented HTTPS reverse proxy.

Nuxt remains 2.14.12. A small CommonJS entry point handles its old loader on current Node. Webpack stays on major 4 with the 4.47.0 maintenance release; the OpenSSL legacy provider is not enabled. `yarn.lock` is the sole authoritative dependency lock. See `docs/source-build-node24.md`.

## Authentication and archive maintenance

Only exact login and read-only project-detail POST routes allow anonymous access. Editing, deletion and upload require a valid token. Tokens expire after 24 hours and have random identifiers; logout persists a SHA-256 revocation digest until expiry. Revocations use atomic private files, a kernel lock, size/count caps and cleanup. Old unbounded tokens must be replaced by logging in again. Root SSH access is not changed.

Run `yarn test:node24` for build/loader checks. On Linux with `/usr/bin/flock`, run `yarn test:auth` for isolated authorization, expiry, logout, persistence and failure-mode regression tests; database/controllers/uploads are stubbed and no production records are changed.

The artwork's project records and media are not included in Git. Local licence embed copies in `static/archive-embeds/` preserve previously external artwork panels; their manifest records sources. HTTPS redirects preserve paths and queries. Player layout and project content remain unchanged.

`ops/` documents shared certificate renewal, port boundaries and bounded logs for this VPS and its companion Email Trek project. See `docs/runtime-maintenance.md` for private retained-image migration and limitations. Do not publish private retained-server images: they may contain historic runtime configuration. Application framework and database major versions remain unchanged, and old dependencies still need a separate future lifecycle decision.
