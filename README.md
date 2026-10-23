# Bot Gluttony

Bot Gluttony is a browser-based editor and player for multimedia artworks. It combines images, video, audio and embedded web pages on a stage, with controls for position, size, layer order and timing. Each project has its own public player page.

The interface describes it as **“A Player for DOM Elements.”** This repository contains the software used by [bot-gluttony.com](https://bot-gluttony.com/). Artwork records and uploaded media are stored separately and are not included in Git.

## Using it

**Visitors:** open a shared project URL, `/<project-id>`, to view the composition. Viewing a project does not require a login.

**Administrators:** sign in at `/login`, then open `/admin` to create or manage projects.

1. Set the project's title, stage dimensions and background colour.
2. Open its editor at `/admin/<project-id>` and add media or an embedded web page.
3. Arrange the elements and set their timing, then save.
4. Use the preview button to open the public player; share that page's URL.

Editing, uploads and deletion require authentication. The editor is built with Nuxt 2 / Vue 2; its Express API stores project and media metadata in MongoDB.

## Build and run

Use **Node 24.22.1** and **Yarn 1.22.22**. The deployed database is MongoDB 8.0.34.

```sh
yarn install --frozen-lockfile --ignore-optional
yarn build
```

Before starting, create a private `.env` using [`.env.example`](.env.example) and set the MongoDB connection, administrator credentials and JWT secret. The authenticated runtime requires Linux with `/usr/bin/flock` and a persistent private directory mounted at `/app/maintenance-state` with mode `0700`. Keep uploads and authentication state persistent and outside Git.

```sh
yarn start
```

The default port is `3000`. Use these build/start commands, which include the Node 24 compatibility entrypoint. After building, `yarn test:node24` runs the loader and build checks; `yarn test` runs the full offline suite on Linux.

## Further documentation

- [Source builds and development checks](docs/source-build-node24.md)
- [Runtime and deployment requirements](docs/runtime-maintenance.md)
- [MongoDB compatibility, tests and upgrade results](docs/database-driver-upgrade.md)
- [Shared server operations](ops/shared-host/README.md)
