# Sample PKCE with Refresh Token Rotation

- [Live demo](https://marvelous-cheesecake-c2f667.netlify.app/) for PKCE flow with refresh token rotation.-
- For non-logged in users, there is a  `Login` button for authorization redirect
- For 'logged in' users (supposedly with refresh token), there will be `Logout` button to clear token and go back to login.
- There is a toggle to count down and refresh token just before expiry (or immediately, if already expired). Without auto-refresh, token refresh takes place on page load.
- Codes and tokens are stored in cookies and LocalStorage by default.

[![Netlify Status](https://api.netlify.com/api/v1/badges/fd7ef859-c484-4db3-99be-e143ff1ed188/deploy-status)](https://app.netlify.com/sites/marvelous-cheesecake-c2f667/deploys)

## Overview

- `lib` has the PKCE module.
- `src` has the example website to show how PKCE works, by importing `lib` module and executes PKCE token exchange and refresh flows.
  - `App.tsx` is the main page
  - `components` has non-business logic components (so far only 1)
  - `styles` for CSS (and maybe design tokens) but most stylings are done via [atomic classes](https://unocss.dev/)
  - `services` for neither styles nor components, like hooks or utilites, or test helpers.
- Testing is done with:
  - `vitest` as runner.
  - `testing-library` and `jsdom` for React rendering, besides default Node env for plain JS such as `lib` module.
  - Ideally integration over unit testing to reduce mocking surfaces and less time than E2E/headless browser setup such as BrowserStack.

## Libraries

Minimal setup to leave implementation room for actual business logic:

- `fetch` for consistent fetch API between browser and Node environment (for tests).
- `dayjs` for time format.
- `js-cookie` for consistent cookies handling between browser and Node environment (for tests).

## How to install

- npm i -g pnpm
- pnpm i

OR `npm i` would also work, by ignoring the commited pnpm lockfile.

## Basic commands

- Development mode with `pnpm dev`
- Test with `pnpm test`
- Check test coverage with `pnpm coverage`

## Build(s)

- Library/module build with `pnpm build` whose output can be found in `dist` folder.
- Example website build with `pnpm build:site` whose output can be found in `site` folder.
- Vite's library mode is enough for the demo's scope, as monorepos would be the proper (and overkill) solution.
