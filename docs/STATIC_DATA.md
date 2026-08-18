# Static EVE data

New Eden Companion keeps CCP-owned static game facts separate from private player/session data.

- `data/eve-companion.db` is the existing private runtime database used for encrypted EVE sessions.
- `static/eve-static.db` is a replaceable SQLite database generated from CCP's Static Data Export (SDE).
- `STATIC_DATABASE_PATH` can override the static database location for development or testing.

The generated database is intentionally not committed to Git. A later packaging/update step can ship or refresh a validated database without modifying the user's private database.

## Official source

CCP publishes the current SDE and automation information at:

- https://developers.eveonline.com/static-data
- https://developers.eveonline.com/docs/services/static-data/
- https://developers.eveonline.com/docs/guides/staticdata/

The importer uses the JSON Lines variant because it can be streamed instead of loading large datasets into memory.

## First schema

Schema version `1` imports only the relationships needed to start the New Eden Companion knowledge graph:

- `categories`
- `groups`
- `types`
- `typeMaterials`
- `blueprints`
  - activities
  - materials
  - products
  - required activity skills
- `typeDogma`
  - the six CCP-documented required-skill / required-level attribute pairs

The resulting SQLite tables are:

- `sde_meta`
- `categories`
- `groups`
- `types`
- `type_materials`
- `blueprints`
- `blueprint_activities`
- `blueprint_materials`
- `blueprint_products`
- `blueprint_skills`
- `type_skill_requirements`

Useful indexes are created for product-to-blueprint, material-to-blueprint, and skill lookups.

## Build a database

Download the JSON Lines SDE from CCP and extract it. Then run:

```text
npm run sde:build -- --source <extracted-jsonl-directory> --build <CCP-build-number>
```

The default output is:

```text
static/eve-static.db
```

An alternate location can be supplied with `--output`.

The build number is required rather than accepting the word `latest`. This makes every generated database reproducible and lets bug reports identify the exact CCP data used.

## Safe replacement

The importer does not build directly over the known-good database.

1. Validate that every required source dataset exists.
2. Build a temporary SQLite database beside the destination.
3. Import all rows inside a transaction with foreign keys enabled.
4. Optimize and close the completed database.
5. Replace the previous static database only after the new build succeeds.
6. Restore the previous database if the final file swap fails.

A malformed or incomplete SDE therefore must not destroy the last known-good database.

## Metadata

Each database records:

- New Eden Companion static schema version
- CCP SDE build number
- source format
- build timestamp
- imported dataset list

Runtime code can read these values through `src/lib/sde/database.ts`.

## Updating later

CCP exposes both the latest SDE build number and a per-build change feed. The intended follow-up is a GitHub Actions job that:

1. checks CCP's latest build number;
2. skips work when the repository's packaged database already uses that build;
3. downloads the exact numbered JSON Lines archive;
4. builds a new SQLite database;
5. runs graph/known-item validation tests;
6. publishes the validated static-data artifact independently of private user data.

For the first implementation, full rebuilds are preferred over incremental mutation. Static game data is replaceable and a clean rebuild is easier to validate and roll back.
