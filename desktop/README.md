# Time Tracker — Desktop (Electron, Windows)

Wraps the same React UI as the web app and adds the two things a browser can't do:

- **Silent screenshots** on a timer (`desktopCapturer`), uploaded to the private
  `screenshots` Supabase Storage bucket.
- **System-wide keyboard/mouse metering** (`uiohook-napi`) that counts activity
  even when the window is unfocused.

The renderer checks `IS_DESKTOP = !!(window.ttDesktop && window.ttDesktop.isDesktop)`
and, when true, uses the bridge instead of the focus-gated web listeners.

## The `window.ttDesktop` bridge (preload.js)

| Method | Purpose |
| --- | --- |
| `isDesktop` | `true` — feature flag the UI checks |
| `start({ sessionId, intervalMin })` | begin screenshots + reset/begin global metering |
| `stop()` | stop screenshots + metering |
| `onShot(cb)` | `cb({ sessionId, dataUrl })` per capture; renderer uploads it |
| `getActivity()` | `{ keystrokes, clicks }` accumulated since `start()` |

Screenshots are captured in the **main** process and uploaded from the
**renderer** (which owns the authenticated Supabase client).

## Where the UI comes from (changed — see below)

As of the desktop-shell repoint, `main.js` no longer loads a bundled local
build. It points `loadURL` straight at the live, hosted Track Time route —
the timetracker module that was ported into the **RDZ Deliveries** Next.js
app (`deliveries-app`, a separate repo): `https://deliveries-app-seven.vercel.app/timetracker`.
A deploy of that app reaches every installed desktop client immediately, the
same pattern the deliveries driver APK already uses (Capacitor's `server.url`).
This `web/` Vite app is no longer what the desktop shell loads — it's now
only whatever the standalone Vercel deployment of `web/` still serves, if
anything still points at it. The desktop-only bridge behavior (this file's
table below) was ported into the Next.js route
(`deliveries-app/src/lib/timetracker/desktop.ts`), which checks the same
`window.ttDesktop` global at runtime.

## Run in development

```bash
# 1) start the deliveries-app dev server (from its own repo)
npm run dev   # in deliveries-app, serves /timetracker on :3000

# 2) launch Electron pointed at it
npm run dev --prefix desktop
```

`desktop`'s dev script sets `TT_DEV_URL=http://localhost:3000/timetracker`, so
the Electron window loads the live dev UI (hot reload works).

## Package a Windows installer

```bash
npm run build --prefix desktop    # electron-builder → NSIS installer in desktop/dist
```

No `web/` build step is needed anymore — the packaged app always loads the
hosted URL above, same as a dev run does when `TT_DEV_URL` isn't set to
something else.

## Notes / gotchas

- **uiohook-napi** is a native module. If its prebuilt binary is missing for
  your Node/Electron ABI, run `npx electron-rebuild -f -w uiohook-napi` in
  `desktop/`. The app still launches without it (global metering just disabled).
- On Windows, global hooks may prompt for accessibility/input permissions the
  first time — allow them.
- Supabase keys are no longer baked into this repo's build at all — the
  loaded page is deliveries-app's, using its own env vars.
