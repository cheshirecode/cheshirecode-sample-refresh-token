# Sample PKCE with Refresh Token Rotation

[Live demo](https://marvelous-cheesecake-c2f667.netlify.app/) for PKCE flow with refresh token rotation. There will be either a `Login` button for authorization redirect or `Logout` if there is already a stored Refresh Token. There is a toggle to count down and refresh token just before expiry (or immediately, if already expired). Codes and tokens are stored in cookies and LocalStorage by default.

[![Netlify Status](https://api.netlify.com/api/v1/badges/fd7ef859-c484-4db3-99be-e143ff1ed188/deploy-status)](https://app.netlify.com/sites/marvelous-cheesecake-c2f667/deploys)

## Overview

- `lib` has the PKCE module.
- `src` has the example website to show how PKCE works.
  - `App.tsx` is the main page
  - `components` has non-business logic components (so far only 1)
  - `styles` for CSS (and maybe design tokens)
  - `services` for neither styles nor components, like hooks or utilites, or test helpers.

## Libraries
- `fetch` for consistent fetch API between browser and Node environment (for tests).
- `dayjs` for time format.
- `js-cookie` for consistent cookies handling between browser and Node environment (for tests).

## How to install

- npm i -g pnpm
- pnpm i

## Basic commands

- Development mode with `pnpm dev`
- Test with `pnpm test`
- Check test coverage with `pnpm coverage`

## Build(s)

- Library/module build with `pnpm build` whose output can be found in `dist` folder.
- Example website build with `pnpm build:site` whose output can be found in `site` folder.
- Vite's library mode is enough for the demo's scope, as monorepos would be the proper (and overkill) solution.
