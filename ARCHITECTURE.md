# Architecture

## Overview

A single Node.js script that runs on a schedule via cron on a Raspberry Pi Zero 2 W. On each run it checks Shippo for recent activity and sends documents to a Knaon thermal printer via CUPS.

## What It Does

Each cron run performs two jobs over a configurable time window (default: last 60 minutes):

1. **Packing slips** — Fetch PAID orders from Shippo → generate PDF → print via `lp` → delete temp file
2. **Shipping labels** — Fetch shipments with Shippo labels → download label PDF → print via `lp` → delete temp file

Temp files are written to `/tmp` and removed immediately after printing.

## Stack

- **Runtime**: Node.js 24 (TypeScript, compiled via `tsc`)
- **PDF generation**: PDFKit (packing slips only; shipping labels are fetched as PDFs from Shippo)
- **Printing**: CUPS (`lp` command)
- **API**: Shippo SDK

## Source Structure

```
src/
  index.ts           ← single entry point, orchestrates both jobs
  lib/
    pdf-generator.ts ← generatePackingSlip()
    printer.ts       ← printPDF() via CUPS lp command
    shippo.ts        ← fetchOrders(), fetchTransactions()
```

Test scripts (`test-shippo.ts`, `test-pdf.ts`) are for local development only and are excluded from the production bundle.

## Deployment

The script runs on a **Raspberry Pi Zero 2 W** (aarch64, 512MB RAM) connected via USB to the Knaon thermal printer.

### CD Pipeline

On every merge to `main`, GitHub Actions:
1. Bundles `src/index.ts` and all dependencies into a single JS file using `@vercel/ncc`
2. Publishes the bundle as a GitHub Release asset (`bundle.js`)

See issue #26 for implementation status.

### Pi Cron Job

```
curl -fsSL https://github.com/brianespinosa/shippo-packing-slips/releases/latest/download/bundle.js | node -
```

No git, yarn, or npm required on the Pi — only `node` and `curl`.

### Environment

The script requires a `.env` file on the Pi with:

```
SHIPPO_API_TOKEN=shippo_live_...
CUPS_PRINTER_NAME=Knaon
```

See `.env.example` for all available variables.

## Printer

- **Hardware**: Knaon thermal printer (USB)
- **Format**: 4x6 inch labels
- **Interface**: CUPS (`lp -d <printer-name>`)
- **Color**: Black and white only (logo converted to grayscale)
