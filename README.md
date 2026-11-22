# SmartLedger Pro 5.0

SmartLedger Pro is a mobile-first business management application for retail and wholesale shops. The 5.0 release is being developed as one consolidated release.

## Current capabilities

- Sales and purchase invoices with GST calculations.
- Retail and wholesale selling-rate presets.
- Inventory, barcode support, stock movement history and bulk CSV import/export.
- Weighted average inventory costing, with sale-time cost snapshots for profit reporting.
- Customer and supplier accounts, ledgers, outstanding balances and invoice-level payment allocations.
- Sales and purchase returns with stock and party-balance adjustments.
- Reports, product margins, customer profitability, business analytics and strategy recommendations.
- Market quotation and recorded price-movement tracking.
- Local JSON backup and restore, plus a data-quality audit.
- Configurable minimum gross-margin alerts.
- Installable web-app manifest and offline app-shell caching.

## Development

Requirements: Node.js 22 or later.

```bash
npm ci
npm run dev
```

Production checks:

```bash
npm run build
npm run lint
```

GitHub Actions runs the production build and ESLint checks on pushes to `main`.

## Android installation

The application includes a web-app manifest and service worker. Deploy it over HTTPS, open it in Chrome on Android, then use **Install app** or **Add to Home screen** from the browser menu. The app shell and previously loaded assets are cached for offline reopening after the first successful visit.

This creates an installable web app (PWA), not an Android APK or a Google Play Store release.

## Data and privacy

Business records are currently stored in the browser's local storage on the device. Backup files should be exported regularly and stored somewhere safe. Restoring a backup overwrites matching SmartLedger data sections on that device.

There is currently no cloud synchronisation or multi-device database.

## SmartLedger AI

The in-app assistant uses deterministic calculations and business rules over saved SmartLedger records. It can summarize recorded sales, costs, margins, outstanding balances, stock and saved price movements. It does not currently connect to an external language model or a live market-price feed; market quotations must be entered manually.

## Release status

SmartLedger Pro 5.0 remains under development. A successful build and lint run do not replace real-device testing, accounting reconciliation, backup/restore testing and final release validation.
