# Backstage

Backstage is Thomas Music Studio's (formerly Lilburn Piano Studio) installable
phone web app (PWA) for capturing quick thoughts. It is **not** a mirror of the
main PKA-Business vault. This repo holds only the app's source. It is public,
so never commit private data, student or finance information, or secrets.

`DEPLOY.md` covers one-time setup (GitHub Pages, Azure redirect URI, iPhone
verification). This file covers how the code works and how to work in the repo.

## Relationship to the main vault

- The vault lives on OneDrive (`PKA-Business`) and is not reachable from here.
- The app signs in with Microsoft (MSAL) and uses Microsoft Graph to write one
  markdown file per capture into `PKA-Business/Team-Inbox/` on OneDrive, named
  `backstage-<date>-<id>.md`, with front matter (`source: backstage`,
  `sender`, `captured`).
- The repo never reads or writes vault content. The only link is the Graph path
  hard-coded in `app.js` (`INBOX_BASE`). Changing it changes where captures land.
- `DEPLOY.md` mentions the source folder `PKA-Business\apps\backstage\`; that is
  the vault-side copy the files were uploaded from.

## Layout

| Path | Purpose |
|---|---|
| `index.html` | UI: sign-in, capture box, queue, test signal |
| `app.js` | Capture, offline queue (`localStorage`), Graph PUT/DELETE, test signal |
| `msal-auth.js` | Sign-in via MSAL only (`window.BackstageAuth`). No hand-rolled OAuth. |
| `sw.js` | Service worker caching the app shell; cross-origin requests go to the network |
| `manifest.webmanifest`, `*.png` | PWA install metadata and icons |
| `vendor/msal-browser.min.js` | Pinned, vendored MSAL (v3.30.0). Do not swap for a CDN. |

No build step, no package manager, no tests, no CI. Plain browser JavaScript.

## Design rules to preserve

- Every save goes into the queue first, then the queue flushes. Online and
  offline share one code path.
- The capture id (and so the filename) is minted once; retries re-PUT the same
  file, so there are no duplicates.
- Captures are raw: no AI, no polish, no review step.
- If you change `sw.js` or any cached shell file, bump `CACHE` in `sw.js`
  (`backstage-shell-v1` to `v2`) or phones keep the old version.

## Deployment

GitHub Pages serves `main` from the repo root at
`https://lilburnpianostudio.github.io/backstage/`. **Any merge to `main` goes
live in about a minute.** The sign-in redirect URI is registered in Azure for
that URL only.

## Cloud sessions

Can: read the repo, branch, commit, push `cloud/*` branches, open PRs.

Cannot (and must not): reach the OneDrive vault, test real sign-in or Graph
writes (needs a Microsoft account and a phone), push to `main`, merge, or
change Azure or Pages settings.

- Branch names: `cloud/<short-topic>` (for example `cloud/docs-pass`).
- Open one PR per task against `main`. Do not merge; Ben reviews and merges.
- Because `main` deploys, keep changes small and explain in the PR how to verify
  them on a device, since there is nothing to run automatically.
- Use American English.
