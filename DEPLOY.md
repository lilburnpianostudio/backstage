# Deploy Backstage (one page, ~15 minutes)

This folder is the complete Backstage app (B0 auth + B1 capture). Same free
GitHub Pages pattern as the Play Well Lab, same **lilburnpianostudio** org.
Everything below is clicks; no command line.

## What you are publishing

| File | What it is |
|---|---|
| `index.html` | The app (sign-in, capture, queue, test signal) |
| `app.js` | Capture logic, offline queue, Graph writes |
| `msal-auth.js` | Microsoft sign-in module (MSAL only, no hand-rolled tokens) |
| `vendor/msal-browser.min.js` | Microsoft's auth library, v3.30.0, pinned + vendored (no CDN to rot) |
| `manifest.webmanifest`, `sw.js`, `apple-touch-icon.png`, `icon-512.png` | PWA install + offline shell |
| `DEPLOY.md` | This file |

## Step 1: Create the repository

1. Go to **github.com**, sign in (the account that owns **lilburnpianostudio**).
2. **+** (top-right) → **New repository**.
3. Owner: **lilburnpianostudio** · Name: **backstage** (lowercase) · **Public** · no README.
4. **Create repository**.

## Step 2: Upload the files

1. On the empty repo page click **"uploading an existing file"**.
2. In File Explorer open `PKA-Business\apps\backstage\`, select ALL files
   **including the `vendor` folder** (drag the folder itself; GitHub keeps it).
3. Commit message: `Backstage v1 (B0+B1)` → **Commit changes**.

## Step 3: Turn on GitHub Pages

1. Repo → **Settings** → **Pages**.
2. Source: **Deploy from a branch** · Branch: **main** / root → **Save**.
3. Wait 1-2 minutes. Your URL: **https://lilburnpianostudio.github.io/backstage/**

## Step 4: Tell Azure about the new app (sign-in fails without this)

1. Go to **portal.azure.com**, sign in with the studio Microsoft account.
2. Search **App registrations** → open **Larry Tools**.
3. Left sidebar: **Authentication**.
4. Under **Single-page application** click **Add URI** and enter exactly:
   `https://lilburnpianostudio.github.io/backstage/`
   (If there is no "Single-page application" section: **Add a platform → Single-page application**, then the URI.)
5. **Save**. Leave the old uplink URI alone for now.

## Step 5: Verify on your real iPhone (the definition of done)

1. Open **https://lilburnpianostudio.github.io/backstage/** in Safari.
2. Share button → **Add to Home Screen** → open **Backstage** from the icon.
3. Tap **Sign in with Microsoft**, sign in with the studio account.
4. Type or dictate a test thought → **Send to Team-Inbox**. Within seconds the
   file `backstage-<date>-<id>.md` should exist in `PKA-Business\Team-Inbox\`.
5. **Airplane mode on** → capture another thought → you should see
   "1 queued (offline)". Airplane mode off, reopen the app → it sends itself,
   and the file appears exactly once.
6. Tap **Test signal** → expect green **SIGNAL OK**.
7. Sign out, sign back in: no re-consent screen expected.

If anything fails, note the step number and hand it to Larry.

## Step 6: Retire the old key (do this the same day)

1. Go to **console.anthropic.com** → **API keys**.
2. Delete/disable the UPLINK key (e.g. `uplink2`). Backstage never uses
   Anthropic; this permanently closes the key-in-browser finding (F2).
3. Do NOT reload API credits. Nothing needs them.

Old UPLINK stays untouched and simply stops being used once Backstage passes
Step 5. Larry posts the retirement note when you report "OPUS-09 done".

## Updating Backstage later

Edit the file in `apps\backstage\`, then repo → **Add file → Upload files**,
drag it in, commit. Pages republishes in about a minute. If `sw.js` changed,
bump the `CACHE` name inside it (v1 → v2) so phones fetch the new version.
