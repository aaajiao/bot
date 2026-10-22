# Source builds on Node 24

Use Node **24.22.1** and Yarn Classic **1.22.22**. `yarn.lock` is the canonical dependency lock. Do not run npm install against the historical package-lock.json; remove that obsolete second lock when adopting this build route. Do not commit node_modules, .nuxt, credentials, upload data, or maintenance-state.

```sh
yarn install --frozen-lockfile --ignore-optional --non-interactive
yarn build
yarn test:node24
```

The build uses no database or application credentials: the wrapper disables the server during compilation. Run builds outside the small production VPS. For production startup, supply the existing private application environment and mounts, then run:

```sh
yarn start
```

This invokes `node ops/runtime/nuxt-node24.cjs start`, sets production mode, and binds `0.0.0.0:3000` unless HOST/PORT explicitly override them. Preserve the existing private configuration, uploads and durable token-revocation directory. A build test is not deployment approval or a live login test.

## Compatibility changes

- Nuxt stays **2.14.12**. Its bundled esm3 configuration loader fails on Node24. The CommonJS wrapper loads our CommonJS config with Node's native require, then uses Nuxt's already-installed jiti for ESM-style Nuxt modules. It also avoids the obsolete CLI's incompatible macOS terminal-size helper.
- The only dependency updates are **webpack 4.44.2 → 4.47.0** and its required **enhanced-resolve 4.5.0** (the pre-existing 4.3.0 remains for its other consumers). The Yarn resolution pins webpack exactly. The official [webpack 4.47 release](https://github.com/webpack/webpack/releases/tag/v4.47.0) supplies its own MD4 implementation on modern Node. Do **not** enable `--openssl-legacy-provider` at build or runtime. The offline test confirms native OpenSSL MD4 remains unavailable.
- The build-time version check reads metadata for the locked @nuxt/ufo 0.5.2 and vuex 3.6.0 from their public entry locations because their old exports wildcards no longer expose package.json. This fallback is limited to those two metadata requests and only installed in build mode. Runtime module imports are unchanged.

## Verified scope

On macOS arm64, official Node24.22.1 archive SHA256 was checked against the official SHASUMS256.txt; original frozen installs passed, then the minimal lock change passed a frozen install. A build with .nuxt absent generated all manifest assets. Seven offline checks passed: listener/configuration, overrides, server-disabled build, invalid arguments, metadata scope, modern webpack hashing without legacy OpenSSL, and generated player/login/admin assets.

Only the old Browserslist database warning remains; that data was not refreshed as part of this narrowly scoped compatibility change. This is not an upgrade or complete vulnerability audit of the legacy Nuxt/Vue dependency tree. Linux container startup and real-site validation are separate deployment checks; do not infer them solely from a successful source build.
