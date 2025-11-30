# Contributing

## Add a new language

1. Add a new language file in `packages/plugin/src/i18n/<language>.json`
2. Add a new language file in `packages/plugin/src/public/_locales/<language>/messages.json`
3. Create PR and wait for approval

## Run plugin in development mode

1. `pnpm i && pnpm init-all`
2. `cd packages/plugin`
3. `pnpm dev`
4. check output `packages/plugin/.output/chrome-mv3`
