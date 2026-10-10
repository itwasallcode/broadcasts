# Contributing

Use [GitHub Issues](https://github.com/itwasallcode/broadcasts/issues) for bugs and proposals, including reproduction steps and browser details for bugs.

For vulnerabilities, follow the [Security Policy](SECURITY.md).

To replace a broken default stream, follow [Update Video IDs](guides/Update-Video-IDs.md).

## Setup

Built with `React` and `Vite` — see [`package.json`](../package.json) for the full list of dependencies.

Use the `Node.js` version in [`.nvmrc`](../.nvmrc).

Clone the repository and enter its directory:

```bash
git clone https://github.com/itwasallcode/broadcasts.git && cd broadcasts
```

Install the dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

See the `scripts` in [`package.json`](../package.json) for development, testing and build commands.

## Testing and Validation

For code changes, run `npm run lint`, `npm test` and `npm run build`, which also validates stream data.

Install [Playwright's required `Chromium` version](https://playwright.dev/docs/browsers#install-browsers):

```bash
npx playwright install chromium
```

Run browser tests for app behavior changes, since `CI` does not run them:

```bash
npm run test:e2e
```

These tests use `Chromium` and do not check real YouTube playback.

Check real playback for player changes and use an iOS device for mobile changes.

To test updates, use a production preview on `localhost`; `Check for Updates` is disabled in development:

```bash
npm run build && npm run preview
```

## Pull Requests

Open pull requests against `master` and use [Conventional Commits](https://www.conventionalcommits.org) for commit messages and PR titles.

Describe what changed and how you tested it in the PR description.
