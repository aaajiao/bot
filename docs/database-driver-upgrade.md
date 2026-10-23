# MongoDB application compatibility

The production cutover completed during the 23 October 2026 maintenance: Bot now uses MongoDB **8.0.34**, feature compatibility version **8.0**, and the database client versions below. Node remains 24.22.1 and Nuxt remains 2.14.12. The existing `.nuxt` files were preserved byte for byte. This does not establish that every old application dependency is maintained or free of vulnerabilities; the database migration remains a separate operator procedure from building this application image.

## Dependency and source changes

The frozen Yarn lock pins Mongoose 9.11.3, MongoDB Node driver 7.7.0, BSON 7.3.3, and mongoose-lean-virtuals 2.1.0. Existing lock selectors outside this dependency change retain their resolved versions. A complete production dependency installation replaces `/app/node_modules`; copying only Mongoose over the old tree can leave incompatible nested MongoDB/BSON modules in the resolution path.

The database-specific API changes are limited to four files, with one additional Nuxt startup compatibility change described below:

- `api/index.js`: remove obsolete connection options, retain a five-connection pool, and fail initial connection cleanly with a generic diagnostic and process exit so the existing restart policy can recover.
- `api/mongo/controllers/itemController.js`: construct references using `new mongoose.Types.ObjectId(...)`.
- `api/mongo/models/item.js` and `project.js`: remove obsolete document `remove` hooks that the existing query-based deletion routes never called.

The existing deletion behavior is intentionally unchanged. Project deletion currently deletes one matching item and then the project, so a project with several items can leave orphan records. Item deletion does not remove its upload. This compatibility change neither adds cascading deletion nor cleans up existing data. Existing file-replacement handling also stays unchanged.

The unchanged, reviewed `api/token-revocations.js` is copied into the new image because the original retained image relied on a production read-only bind for that file. Keep the state and source binds at rollout.

The Nuxt entrypoint additionally disables jiti 0.1's embedded legacy `v8-compile-cache` before loading Nuxt. That cache replaces Node's module compiler with `vm.Script` without a dynamic-import callback. MongoDB 7's runtime adapter uses `import('os')` to build handshake metadata, so the old hook caused a server-selection failure even though a separately launched native Node connection worked. The fixed wrapper preserves Node24's native module compiler; it does not preload Mongoose to hide the problem. The runtime Dockerfile copies this wrapper along with the database adaptation.

## Evidence and boundaries

The isolated Linux amd64 candidate passed:

- 10 Mongoose/model/controller compatibility tests with collection methods mocked.
- 57 authentication and persistent revocation tests using real Linux `flock` and synthetic credentials.
- 11 real API/database checks on each of MongoDB 4.4.30 and 8.0.34: anonymous rejection, login, project/item creation, multipart file metadata, public player response, lean virtuals, updates, invalid references, existing deletion behavior, and durable logout. Each invocation created a random `bot_driver_fixture_*` database, dropped only that database, and verified cleanup.
- A complete retained Nuxt startup using the new dependency tree: homepage, login page and built asset returned 200; synthetic login, authenticated user and logout returned 200; anonymous and revoked-token requests returned 401. This smoke test used network-none isolation and a mocked database; it complements the real database tests rather than replacing them.
- Comparison of 57 retained `.nuxt` files and image startup/environment settings: unchanged. No old MongoDB or BSON package copies remained in the new dependency tree.

A separate clean source build on Node24 also passed, followed by the seven existing runtime/build checks. The frozen source lock already contains Webpack 4.47.0 from the earlier Node24 compatibility work; the old retained image had 4.44.2. Installing that existing lock brings the runtime tree into agreement without rebuilding or changing the retained UI assets.

After discovering that startup interaction, a full Nuxt process without native Mongoose preloading was tested against a real isolated MongoDB 8.0.34 database. Homepage/login/assets, anonymous rejection, synthetic login, authenticated project list and the real public player response all passed. A new regression checks the driver's dynamic import after loading jiti; all eight runtime checks pass. The same 57 retained UI files remain unchanged. The earlier mock-database Nuxt smoke test alone did not cover this interaction.

These tests use synthetic records and temporary state. They do not authorize production writes, prove that an on-disk database upgrade succeeded, or replace final data/hash/index/FCV and website checks after an operator cutover.

## Completed production acceptance

The final application image (`7a48aab79ff7…`) includes the Nuxt compile-cache fix. At acceptance, the production Bot container was stable with restart count **0**. Login using the original account succeeded. Authenticated reads returned **7 projects and 83 items**; all **7 public player responses** matched their pre-upgrade complete-content hashes. The shared two-site public acceptance suite passed **17/17** checks, including unchanged static bytes and anonymous-access protection. No new application data or SMTP message was needed for those read checks.

The deployed database reported MongoDB 8.0.34 with FCV 8.0. The final image retained all **57** original `.nuxt` files unchanged. These are observed cutover results, not an ongoing monitoring or future uptime guarantee.

The regression source is `ops/runtime/test-node24.cjs`. `yarn test:node24` runs its eight checks, including loading Nuxt/jiti and then exercising the real MongoDB driver's dynamic import; `yarn test` includes that command. This particular regression is offline. `yarn test:database:integration` separately runs the real database/API fixture against an explicitly isolated MongoDB endpoint. The complete Nuxt-plus-real-database startup was also executed during this maintenance, as described above; it is distinct from those two test commands.

## Build and deployment contract

Run from the repository root with Docker available. The fixture target contains only public source and dependencies:

```sh
docker build --platform linux/amd64 --target fixture \
  -f ops/runtime/Dockerfile.database-upgrade -t bot-database-fixture:reviewed .
docker run --rm --network none bot-database-fixture:reviewed --test test/mongoose-compatibility.js
docker run --rm --network none bot-database-fixture:reviewed test/auth-hardening.js
```

For integration, an operator must first create a dedicated isolated Mongo container. Join only that container's network namespace, set `BOT_TEST_ISOLATED=1`, `BOT_TEST_MONGO_BASE=mongodb://127.0.0.1:27017`, and `BOT_TEST_EXPECTED_VERSION=4.4.30` or `8.0.34`, then run `test/mongodb-integration.js`. The script refuses non-loopback URLs, credentials, an existing database path, or an unreviewed server version. It never accepts a production connection string.

Build the private runtime target using a local tag verified to resolve to the approved current production image ID:

```sh
docker build --platform linux/amd64 --target runtime \
  --build-arg RETAINED_IMAGE=private-local-tag:reviewed \
  -f ops/runtime/Dockerfile.database-upgrade -t private-local-bot:candidate .
```

The runtime image inherits private configuration and possible retained data from its base. Never publish it or put image archives into Git. Its complete production dependencies come from the pinned official Node24 Alpine stage with `--frozen-lockfile --production=true --ignore-scripts --ignore-optional`. MongoDB/Mongoose's used paths are JavaScript; the real integration and startup tests verify the resulting installation.

The operator must replace the active read-only `/app/api/index.js` bind with the matching new source at the same time as the image. Preserve the unchanged token-revocation source bind, `/app/maintenance-state`, uploads, private environment, ports, network, log settings, and startup/restart policy. Otherwise an old bind will override the new image's API entrypoint. Verify all four changed API source hashes inside the running container.

Keep the old application image, source bind and stopped original database data for rollback. An old image is not a safe rollback against a newly advanced database by assumption; restore the reviewed application/database pair and reconcile any writes made after cutover. Do not overwrite or downgrade the original database directory as part of this application recipe.

## Primary references

- [Mongoose 6 migration](https://mongoosejs.com/docs/migrating_to_6.html): connection options and pool changes.
- [Mongoose 7 migration](https://mongoosejs.com/docs/migrating_to_7.html): ObjectId construction and removal of document `remove`.
- [Mongoose 8 migration](https://mongoosejs.com/docs/migrating_to_8.html) and [Mongoose 9 migration](https://mongoosejs.com/docs/migrating_to_9.html).
- [Mongoose server compatibility](https://mongoosejs.com/docs/compatibility.html): the current Mongoose 9 table explicitly includes MongoDB 8; it does not currently establish MongoDB 9 support. This deployment makes no MongoDB 9 compatibility claim.
- [MongoDB driver compatibility](https://www.mongodb.com/docs/drivers/compatibility/): driver 7.7 and Node24 compatibility, including the tested 4.4 and 8.0 server branches.
- [MongoDB Node release notes](https://www.mongodb.com/docs/drivers/node/current/reference/release-notes/).
