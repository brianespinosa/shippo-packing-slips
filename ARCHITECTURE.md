# Architecture & Implementation Plan

## Project Overview

Automated system to generate and print custom packing slips for e-commerce orders using the Shippo API as the central integration point.

## Goals

1. **Phase 1 (MVP)**: Manual script to fetch orders and print custom packing slips
2. **Phase 2**: Automated cron-based execution

## Scope

### In Scope
- Fetch order/shipment data from Shippo API for a time range
- Generate custom-designed packing slip PDFs using Shippo data
- Print packing slips to Knaon thermal printer (4x6 format)
- Run via cron job on configurable schedule
- Support for macOS (initial) and Raspberry Pi (future deployment)

### Explicitly Out of Scope
- Shipping label generation (Shippo handles this separately)
- UI/dashboard
- State tracking/database (use time-window queries only)
- Webhooks or real-time triggers
- Retry logic or notification systems
- Multi-printer support

## Technical Decisions

### Technology Stack
- **Language**: Node.js with TypeScript
  - Rationale: Team familiarity, excellent PDF libraries, minimal setup overhead
  - Setup: Homebrew on macOS, apt-get on Raspberry Pi

### Label Format
- **Format**: PDF
  - Rationale: Custom packing slip layouts require flexible design capabilities
  - ZPL rejected: Too complex for custom layout design/iteration

### Printer
- **Hardware**: Knaon thermal printer (USB connection)
- **Format**: 4x6 labels
- **Connection**: Direct USB to host device

### Deployment
- **Initial**: MacBook Pro (USB connected to printer)
- **Future**: Raspberry Pi (USB connected to printer)
- **Architecture**: Local execution on device with printer access

### Order Detection
- **Method**: Time-window queries (stateless)
- **Rationale**: No database/state tracking needed - query Shippo for orders within time range
- **Execution**: Cron job scheduled once daily
  - **Initial schedule**: Once per day (e.g., 9:00 AM)
  - **Time window**: Last 24 hours
  - **Configuration**: Time should be easily configurable for future adjustments (multiple times per day, different hours, etc.)

## Architecture

```
┌─────────────────┐
│ E-commerce      │
│ Platforms       │
│ (Etsy, etc.)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Shippo API      │
│ (Integration    │
│  Layer)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Our Script      │
│ (Node/TS)       │
│                 │
│ 1. Fetch orders │
│ 2. Generate PDF │
│ 3. Print        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Knaon Printer   │
│ (USB)           │
└─────────────────┘
```

## Implementation Phases

### Phase 1: Manual Script (MVP)

**Goal**: Run a command that fetches recent orders and prints packing slips

**Tasks**:
1. Set up Node/TypeScript project with Shippo SDK
2. Implement Shippo API authentication and order fetching
3. Design packing slip layout (what data to include, formatting)
4. Implement PDF generation for packing slips
5. Implement printer communication (send PDF to Knaon via CUPS/lp)
6. Command-line interface: `npm run print -- --hours 24`

**Deliverables**:
- Working script that prints packing slips for orders in specified time range
- Configuration for Shippo API credentials
- Documented packing slip design

### Phase 2: Automated Execution

**Goal**: Run automatically on schedule without manual intervention

**Tasks**:
1. Create cron job configuration
2. Add logging for monitoring (file-based, no external services)
3. Handle edge cases (no orders, printer offline)
4. Documentation for cron setup on macOS and Raspberry Pi

**Deliverables**:
- Cron job running every N hours
- Log files for troubleshooting
- Deployment documentation

## Packing Slip Design

### Available Data from Shippo Orders API

**Order-level fields**:
- `order_number` - Custom reference (e.g., "#1068")
- `order_status` - Status (PAID, SHIPPED, etc.)
- `placed_at` - ISO 8601 timestamp
- `currency` - Currency code

**Address fields** (`to_address`):
- Name, company
- Street, city, state, zip, country
- Phone, email

**Line items** (per product):
- `sku` - Product identifier
- `title` - Item name
- `quantity` - Number of units
- `total_price` - Item cost
- `weight` / `weight_unit` - Item weight

**Financial fields**:
- `subtotal_price` - Item costs
- `shipping_cost` / `shipping_cost_currency` - Delivery fee
- `total_tax` - Tax amount
- `total_price` - Final amount

### Packing Slip Content (FINALIZED)

Based on Shippo's example packing slip with modifications for conciseness.

**Header Section:**
- Title: "Packing Slip for Order [number]"
- **From Address** with logo:
  - Business name
  - Full street address
  - Company logo (color from Shippo, converted to B&W via CSS filter)
- **Ship To:**
  - Customer name
  - Full shipping address
- **Order Details:**
  - Order ID
  - Order Date

**Items Section:**
- **Total items count** (above table) - e.g., "Total Items: 12"
  - Critical for multi-page verification to ensure no pages are missed
- **Items table** with headers: ITEMS | QTY
  - Each line item shows:
    - Product title (single line, truncated with ellipsis via CSS)
    - Variant details (e.g., "Red AAA (36)")
    - Quantity
  - No grouping - variants treated as separate items (matches data structure)

**Excluded:**
- ❌ SKU (not needed on packing slip)
- ❌ Pricing information (already on invoice/receipt)
- ❌ Shipping costs
- ❌ Weights

**Key Design Decisions:**
1. **Product title truncation**: Use CSS `text-overflow: ellipsis; white-space: nowrap; overflow: hidden;`
   - Prevents verbose SEO titles from making slip too long
   - Single line per item keeps it compact
2. **Logo handling**: Use local logo file from `/assets` directory, apply `filter: grayscale(100%)` for thermal printing
   - Shippo API does not expose account logos
   - Logo stored locally for reliable access
3. **No grouping**: Variants are separate line items (simpler, matches API data structure)

### Layout Constraints
- 4x6 inch format
- Thermal printer (black and white only)
- Target: Fit reasonable order (10-15 items) on single page
- Multi-page support for larger orders (hence total items count)

### Design Approach
- **Primary: PDFKit** (Programmatic PDF generation)
  - **Rationale**:
    - Lightweight (~500KB, no browser dependency)
    - Server-side native (designed for Node.js automation)
    - Built-in text truncation (`ellipsis: true` option)
    - Perfect for cron automation
    - No headless browser overhead
  - **Text truncation**: `doc.text(longText, x, y, { width: 200, ellipsis: true })`
  - **Logo**: Load local file from `/assets` and embed in PDF

- **Backup: pdfmake** (Declarative/JSON-based)
  - Higher-level API if PDFKit proves difficult
  - Also server-side, no browser dependency
  - Declarative document structure

- **Ruled out**:
  - ❌ Puppeteer: Browser dependency (headless Chrome), 170MB overhead
  - ❌ jsPDF: Client-side focused, not ideal for server automation

## Shippo API Integration

### Authentication
- **Method**: HTTP header `Authorization: ShippoToken <token>`
- API key stored in environment variable or config file
- Never commit credentials to repository
- Tokens available in Shippo API settings page (live or test)

### Key API Findings

**Orders Endpoint**:
- `GET /orders` - Lists orders (paginated, 25 results default)
- **Supports date filtering**:
  - `start_date` - Orders placed after this date/time (ISO 8601 UTC)
  - `end_date` - Orders placed before this date/time (ISO 8601 UTC)
- **Other filters**:
  - `shop_app` - Filter by store platform (e.g., "etsy", "shopify")
  - `order_status` - Filter by status (array notation: `?order_status[]=PAID`)
- **Pagination**: `page` parameter
- Contains rich data: order_number, line_items (SKU, title, quantity, price), addresses, status, placed_at date

**Shipments Endpoint** (not used for this project):
- Shipments are only created when labels are purchased
- Not suitable for fetching new orders that need packing slips

### Data Retrieval Strategy

**DECISION: Use Orders endpoint with date filtering**

**Why Orders endpoint?**
- Shipment objects are only created when shipping labels are purchased
- Etsy orders are imported as Order objects automatically
- We need to print packing slips for NEW orders before they ship
- Orders endpoint supports date filtering via `start_date` and `end_date` parameters

**Implementation approach**:
```
GET /orders?start_date=<N hours ago>&end_date=<now>
```

Example for last 4 hours:
```
GET /orders?start_date=2026-02-02T10:00:00&end_date=2026-02-02T14:00:00
```

**Additional filtering options** (if needed later):
- `shop_app=etsy` - Filter to only Etsy orders
- `order_status[]=PAID` - Filter by order status

**Benefits**:
- Simple, efficient server-side filtering
- Single API call (or few if paginated)
- Gets complete order data for packing slips
- No client-side filtering needed

### Rate Limiting
- Understand Shippo's rate limits (TBD from documentation)
- For MVP with cron every few hours, unlikely to be an issue

## Deployment Considerations

### macOS (Initial)
- Node.js via Homebrew
- Printer connected via USB
- Cron via `crontab -e`

### Raspberry Pi (Future)
- Node.js via apt-get or nvm
- Printer connected via USB
- Ensure sufficient memory for PDF generation
- Cron via `crontab -e`

### Configuration
- Environment variables for Shippo API key
- Config file for time range, printer settings
- Keep device-specific config separate from code

## Error Handling

**MVP Approach:**
- Log errors to file with timestamp and details
- Exit with non-zero error code (prevents continuing with bad state)
- **Rationale**: Prevents burning labels if something is wrong
- **Error scenarios**:
  - Printer offline/unavailable
  - Shippo API errors
  - PDF generation failures
  - Network issues

**Log file format:**
- Location: `./logs/packing-slips.log` (or similar)
- Include: timestamp, error type, error message, stack trace if applicable

**Future enhancement:**
- Discord or Slack notifications for errors
- Allows real-time alerts when automated job fails

**Exit codes:**
- `0` - Success (orders processed and printed)
- `1` - General error (printer, API, PDF generation)
- `2` - Configuration error (missing API key, etc.)

## Implementation Plan

### Phase 1: MVP - Manual Script

**Goal**: Run a command to fetch recent orders and print packing slips

**Tasks**:
1. **Project Setup**
   - Initialize Node.js/TypeScript project
   - Install dependencies: Shippo SDK, PDFKit
   - Set up environment variables for API key
   - Create project structure

2. **Shippo API Integration**
   - Implement authentication with Shippo API
   - Create function to fetch orders by date range
   - Test API connectivity with test token
   - Handle pagination if needed

3. **PDF Generation**
   - Design packing slip layout with PDFKit
   - Implement header (logo, from address, ship-to, order details)
   - Implement items table with text truncation
   - Add total items count
   - Test with sample order data

4. **Printer Integration**
   - Research CUPS/`lp` command for Knaon printer
   - Implement function to send PDF to printer
   - Test printing with sample PDF

5. **Error Handling & Logging**
   - Set up log file system
   - Implement error handling for API, PDF, and printer errors
   - Define exit codes

6. **CLI Interface**
   - Create command: `npm run print -- --hours 24`
   - Add configuration options (time range, dry-run mode)

### Phase 2: Automation

**Goal**: Run automatically on schedule

**Tasks**:
1. Create cron job configuration
2. Set up daily schedule (configurable time)
3. Test automated execution
4. Document deployment steps for macOS and Raspberry Pi

### Future Enhancements
- Discord/Slack error notifications
- Web dashboard for monitoring
- Support for multiple printers
- Retry logic for failed prints
