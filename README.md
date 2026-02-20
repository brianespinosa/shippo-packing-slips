# shippo-packing-slips

> **Work in progress.** This project is under active development and not yet fully functional. Core features are still being implemented — see the roadmap below.

Automated packing slip and shipping label printer for Shippo orders. Runs on a Raspberry Pi Zero 2 W on a cron schedule, fetches recent activity from the Shippo API, and prints to a Knaon thermal printer via CUPS.

See `ARCHITECTURE.md` for full system design.

## Roadmap

Features are being implemented in this order:

1. **[#35](https://github.com/brianespinosa/shippo-packing-slips/issues/35) Dev toolchain** — replace ESLint + Prettier with Biome, add Lefthook pre-commit hooks, add CI workflow for lint and typecheck
2. **[#30](https://github.com/brianespinosa/shippo-packing-slips/issues/30) Refactor into single entry point** — consolidate `src/index.ts`, write PDFs to `/tmp`, clean up after printing
3. **[#31](https://github.com/brianespinosa/shippo-packing-slips/issues/31) Shipping label printing** — fetch Shippo labels for the time window, download, print, and clean up
4. **[#5](https://github.com/brianespinosa/shippo-packing-slips/issues/5) CUPS printer integration** — send PDFs to the Knaon via `lp`
5. **[#6](https://github.com/brianespinosa/shippo-packing-slips/issues/6) Error handling and logging** — consistent exit codes and cron-friendly output
6. **[#8](https://github.com/brianespinosa/shippo-packing-slips/issues/8) Cron setup on Pi** — configure the scheduled job on the Raspberry Pi
7. **[#33](https://github.com/brianespinosa/shippo-packing-slips/issues/33) Add `.env.example`** — template for local and Pi setup
8. **[#32](https://github.com/brianespinosa/shippo-packing-slips/issues/32) Make repository public** — prerequisite for the CD pipeline
9. **[#26](https://github.com/brianespinosa/shippo-packing-slips/issues/26) CD pipeline** — bundle with `ncc`, publish to GitHub Releases on merge to `main`
10. **[#9](https://github.com/brianespinosa/shippo-packing-slips/issues/9) Deployment guide** — reproduce the full Pi provisioning from scratch

## Requirements

- Node.js 24
- A Shippo account with a production API token
- CUPS with the Knaon printer configured

## Local Development

```bash
yarn install
cp .env.local.example .env.local  # add your SHIPPO_API_TOKEN
yarn generate                      # fetch orders and generate PDFs
```

### Environment Variables

| Variable | Description |
|---|---|
| `SHIPPO_API_TOKEN` | Shippo production API token |
| `SHIPPO_TEST_API_TOKEN` | Shippo test token (optional, for test scripts) |

Values in `.env.local` override `.env`.

### Scripts

| Command | Description |
|---|---|
| `yarn build` | Compile TypeScript |
| `yarn generate` | Build and run the main script |
| `yarn test:api` | Test Shippo API connectivity |
| `yarn test:pdf` | Generate a sample PDF |

## Deployment

The script is deployed to a Raspberry Pi Zero 2 W. On every merge to `main`, GitHub Actions publishes a bundled release. The Pi cron job pulls and runs it directly:

```
curl -fsSL https://github.com/brianespinosa/shippo-packing-slips/releases/latest/download/bundle.js | node -
```

See [issue #26](https://github.com/brianespinosa/shippo-packing-slips/issues/26) for CD pipeline implementation status.
