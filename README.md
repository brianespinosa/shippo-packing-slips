# shippo-packing-slips

Automated packing slip and shipping label printer for Shippo orders. Runs on a Raspberry Pi Zero 2 W on a cron schedule, fetches recent activity from the Shippo API, and prints to a Knaon thermal printer via CUPS.

See `ARCHITECTURE.md` for full system design.

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

See issue #26 for CD pipeline implementation status.
