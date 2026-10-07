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

# Format
npm run format

# Production Build
npm run build

# Preview the Production Build
npm run preview
```

## Data Validation

`npm run build` runs [`validate-data.mjs`](../../scripts/validate-data.mjs) to check the channel data in `src/data/` and stops if it finds missing fields, invalid ID formats or duplicate channel IDs.
