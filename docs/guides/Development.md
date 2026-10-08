# Development

Built with `React` and `Vite` — see [`package.json`](../../package.json) for the full list of dependencies.

## Prerequisites

- `Node.js` 22 or later (see [`.nvmrc`](../../.nvmrc)).

## Clone

```bash
git clone https://github.com/itwasallcode/broadcasts.git && cd broadcasts
```

## Commands

```bash
# Install Dependencies
npm ci

# Development Server
npm run dev

# Lint
npm run lint

# Unit Tests
npm test

# Browser Tests (Install Chromium Once)
npx playwright install chromium
npm run test:e2e

# Format
npm run format

# Production Build
npm run build

# Preview the Production Build
npm run preview
```

## Testing and Validation

CI runs lint, unit tests and the production build before deployment.

### Data Validation

`npm run build` runs [`validate-data.mjs`](../../scripts/validate-data.mjs) to check the channel data in `src/data/` and stops if it finds missing fields, invalid ID formats or duplicate channel IDs.

### App Updates

Update checks work in the production build in both regular browser tabs and the installed app.

Use `npm run build` followed by `npm run preview` to test the button locally, because update checks are disabled in `npm run dev`.

`npm run test:e2e` builds two versions and verifies the update cycle, saved preferences and error recovery in `Chromium`.

Run these browser tests locally before publishing; CI does not run them.
