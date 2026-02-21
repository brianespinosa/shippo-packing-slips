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
| `CRON_TIME_WINDOW_MINUTES` | Minutes to look back on each cron run (default: 60) |
| `CUPS_PRINTER_NAME` | CUPS destination name for the printer (e.g. `Knaon`) |
| `COMPANY_NAME` | Company name rendered in bold on packing slip header (required) |
| `COMPANY_ADDRESS_LINE_1` | First address line (optional) |
| `COMPANY_ADDRESS_LINE_2` | Second address line (optional) |
| `COMPANY_ADDRESS_LINE_3` | Third address line (optional) |
| `COMPANY_LOGO_PATH` | Absolute or relative path to logo image (optional) |
| `INCLUDE_ALL_ORDER_STATUSES` | Set to `true` to fetch all order statuses instead of only `PAID` (optional) |

Values in `.env.local` override `.env`.

### Scripts

| Command | Description |
|---|---|
| `yarn build` | Compile TypeScript |
| `yarn generate` | Build and run the main script |

## Deployment

The script is deployed to a Raspberry Pi Zero 2 W. On every merge to `main`, GitHub Actions publishes a bundled release. The Pi runs `index.js` on a cron schedule from `~/`:

```
0 * * * * cd /home/bje && node /home/bje/bundle/index.js >> /home/bje/cron.log 2>&1
```

To update after a new release:

```bash
curl -fsSL https://github.com/brianespinosa/shippo-packing-slips/releases/latest/download/index.js \
  -o ~/bundle/index.js
```

See `ARCHITECTURE.md` for full provisioning instructions including one-time asset setup.
