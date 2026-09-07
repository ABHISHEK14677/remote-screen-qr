# Remote Screen QR

QR-based remote Android screen access tool for remote support, device testing, and MDM.

> ⚠️ **Authorized use only** — for administering devices you own or have explicit
> permission to support. MediaProjection always requires on-device user consent.

## Architecture

```
[Device app] --MediaProjection--> [WebSocket relay] <--[Operator dashboard]
              ^__________ QR contains pairing token (one-time, 120s TTL) __________|
```

## Components

| Folder        | Tech           | Purpose                    |
| ------------- | -------------- | --------------------------- |
| `android-app` | Kotlin, OkHttp | Screen capture + WS stream  |
| `server`      | Node.js, ws    | Pairing + relay (wss/TLS)   |
| `dashboard`   | HTML/JS        | Live viewer + QR generator  |

---

## Prerequisites

- Node.js **≥ 18** (uses `require("crypto").randomUUID`, top-level `--watch`)
- Python 3 (only used to serve the dashboard's static files) — or any static file server
- Android Studio (Giraffe+) if you're building the Android app

---

## Quick Start (verified working steps)

### 1. Server

The `.env.example` file lives at the **repo root**, not inside `server/`. Run this from the
**repository root**, not from inside `server/`:

```bash
# from the repo root
cp .env.example server/.env
```

Then edit `server/.env` and set a real secret:

```bash
# generate a strong secret
openssl rand -hex 32
```

Paste that value in as `JWT_SECRET=...` inside `server/.env`. Leaving the placeholder
(`change_me_generate_with_openssl_rand_hex_32`) works for local testing but should never
be used anywhere reachable outside your machine.

```bash
cd server
npm install
npm start
```

You should see:

```
Relay listening on :8443
Pairing endpoint:   http://localhost:8443/pair?d=device-01
```

Sanity-check it's alive:

```bash
curl "http://localhost:8443/pair?d=device-01"
```

This should return JSON containing `deviceId`, `token`, `payload`, and `qrDataUrl`. If it
instead crashes the server with `secretOrPrivateKey must have a value`, your `.env` isn't
being picked up — see [Troubleshooting](#troubleshooting--debugging).

### 2. Dashboard

```bash
cd dashboard
python3 -m http.server 8080
# open http://localhost:8080
```

Before opening it, apply the fix in [Troubleshooting](#troubleshooting--debugging) — the
"Generate Pairing QR" button will not work out of the box.

### 3. Android App

Open `android-app/` in Android Studio → Build → Install on device. Grant the screen
capture (MediaProjection) permission when prompted; the app will not stream frames
without it.

---

## Environment Variables

| Variable             | Default (from `.env.example`)                    | Notes |
| --------------------- | ------------------------------------------------- | ----- |
| `JWT_SECRET`           | `change_me_generate_with_openssl_rand_hex_32`      | **Required.** Server crashes on the first `/pair` request without a real value. Generate with `openssl rand -hex 32`. |
| `PORT`                 | `8443`                                             | Port the relay listens on. |
| `TOKEN_TTL_SECONDS`    | `120`                                              | How long a pairing QR stays valid. |
| `PUBLIC_WS_URL`        | `ws://YOUR_COMPUTER_LAN_IP:8443/ws`                | Used to build the QR payload host. Replace `YOUR_COMPUTER_LAN_IP` with your machine's actual LAN IP if the phone is a separate device on the same network. `localhost` will not work from the phone. |

---

## Troubleshooting / Debugging

These are the actual failure modes reproduced while testing this repo — not
hypothetical ones.

### `cp: cannot stat '.env.example': No such file or directory`
You're running `cp .env.example .env` from inside `server/`. The file is at the repo
root. Fix:
```bash
# from the repo root
cp .env.example server/.env
```
Delete any stray file literally named `.env.example .env` at the repo root if present —
it's a leftover mistake, not a real config file, and dotenv will not read it.

### Server crashes immediately on `/pair`:
```
Error: secretOrPrivateKey must have a value
    at auth.js:4 (mintPairingToken)
```
`JWT_SECRET` is undefined — either `server/.env` doesn't exist, or you're launching
`node` from the wrong working directory (dotenv loads `.env` relative to `process.cwd()`,
so `npm start` must be run from inside `server/`). This is an **unhandled exception that
kills the whole process**, so every future request will fail (connection refused) until
you restart the server with a valid secret in place. If you're modifying the server code
yourself, wrap the `/pair` handler body in a `try/catch` and return a `500` instead of
letting it crash the process.

### Browser console: `Uncaught ReferenceError: QrGen is not defined`
`dashboard/index.html` loads `viewer.js` but never loads `qr-generator.js`, even though
`viewer.js` calls `window.QrGen.buildQr(...)` and `window.QrGen.qrPayload(...)`. Add the
missing script tag **before** `viewer.js` in `dashboard/index.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/qr-code-styling@1.6.0/lib/qr-code-styling.min.js"></script>
<script src="qr-generator.js"></script>  <!-- was missing -->
<script src="viewer.js"></script>
```

### Dashboard says "Failed to reach relay"
`dashboard/viewer.js` hardcodes `http://localhost:8443`. This only works if the browser
running the dashboard is on the same machine as the relay server. If you're opening the
dashboard on a phone or a different computer, either:
- Run the dashboard on the same machine as the relay and access it via that machine's
  LAN IP, or
- Edit the `fetch(...)` calls in `viewer.js` to point at the relay's real LAN IP/hostname
  instead of `localhost`.

### QR scans but the Android app never connects
- Confirm `PUBLIC_WS_URL` in `server/.env` uses your computer's actual LAN IP (not
  `localhost` or `127.0.0.1`) — the phone can't resolve either of those to your machine.
- Pairing tokens expire after `TOKEN_TTL_SECONDS` (120s by default) — regenerate the QR
  if too much time passed between generating it and scanning it.
- Only one device and one viewer are allowed per `deviceId` at a time
  (`server/src/pairing.js`). If a stale connection is still holding the slot, restart the
  relay or use a different `deviceId`.

### Using `wss://` in production
The relay itself speaks plain `ws://` (see `server/src/index.js` — it uses
`http.createServer`, not `https`). For real TLS, terminate `wss://` at a reverse proxy
(nginx, Caddy, a load balancer) in front of the relay, or wrap the server with
`https.createServer` and cert files yourself — the code as shipped does not do this for
you despite the docs describing TLS as "enforced in production."

---

## Security

- One-time, short-TTL JWT embedded in the QR payload
- TLS (wss://) must be terminated in front of the relay in production (see above — not
  automatic)
- One viewer per pairing token
- Auto-shutdown when the pairing token expires
