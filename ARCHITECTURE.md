# Architecture

## Overview

A single Node.js script that runs on a schedule via cron on a Raspberry Pi Zero 2 W. On each run it checks Shippo for recent activity and sends documents to a Knaon thermal printer via CUPS.

## What It Does

Each cron run performs two jobs over a configurable time window (default: last 60 minutes):

1. **Packing slips** — Fetch PAID orders from Shippo → generate PDF → print via `lp` → delete temp file
2. **Shipping labels** — Fetch shipments with Shippo labels → download label PDF → print via `lp` → delete temp file

Temp files are written to `/tmp` and removed immediately after printing.

## Stack

- **Runtime**: Node.js 24 (TypeScript, bundled via `@vercel/ncc`)
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


## Deployment

The script runs on a **Raspberry Pi Zero 2 W** (aarch64, 512MB RAM) connected via USB to the Knaon thermal printer.

### CD Pipeline

On every merge to `main`, GitHub Actions:
1. Bundles `src/index.ts` and all dependencies into a single JS file using `@vercel/ncc`
2. Publishes the bundle and its required assets as GitHub Release assets:
   - `index.js` — the bundle
   - `*.afm` + `sRGB_IEC61966_2_1.icc` — PDFKit font metrics and color profile

Inter font files (`Inter-Regular.ttf`, `Inter-Bold.ttf`) are **not** published in the release — they are sourced directly from the [rsms/inter](https://github.com/rsms/inter) GitHub releases and placed on the Pi once during provisioning.

### Pi Cron Job

The bundle and its asset files must be in the same directory. Download `index.js` to the bundle directory, then run it from there:

```
curl -fsSL https://github.com/brianespinosa/shippo-packing-slips/releases/latest/download/index.js \
  -o ~/bundle/index.js
node ~/bundle/index.js
```

No git, yarn, or npm required on the Pi — only `node`, `curl`, and `unzip` (for initial provisioning).

### Pi Provisioning (one-time setup)

On first setup, the bundle directory must contain all static assets before the cron job runs. These files never change and only need to be downloaded once:

```bash
mkdir -p ~/bundle

# PDFKit assets (from this project's GitHub releases)
RELEASE_BASE=https://github.com/brianespinosa/shippo-packing-slips/releases/latest/download
for f in Helvetica.afm Helvetica-Bold.afm Helvetica-BoldOblique.afm Helvetica-Oblique.afm \
          Times-Roman.afm Times-Bold.afm Times-Italic.afm Times-BoldItalic.afm \
          Courier.afm Courier-Bold.afm Courier-Oblique.afm Courier-BoldOblique.afm \
          Symbol.afm ZapfDingbats.afm sRGB_IEC61966_2_1.icc; do
  curl -fsSL "$RELEASE_BASE/$f" -o ~/bundle/"$f"
done

# Inter fonts (from rsms/inter GitHub releases)
INTER_BASE=https://github.com/rsms/inter/releases/latest/download
curl -fsSL "$INTER_BASE/Inter-4.1.zip" -o /tmp/inter.zip
unzip -p /tmp/inter.zip extras/ttf/Inter-Regular.ttf > ~/bundle/Inter-Regular.ttf
unzip -p /tmp/inter.zip extras/ttf/Inter-Bold.ttf > ~/bundle/Inter-Bold.ttf
rm /tmp/inter.zip
```

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
