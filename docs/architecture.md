# Architecture

## Overview

┌────────────────┐    MediaProjection     ┌──────────────┐   wss    ┌───────────────┐
│  Android App   │ ── JPEG frames ───────▶│  Relay Server│◀────wss──│   Dashboard   │
│ (streamer)     │                        │  (Node.js)   │          │ (viewer + QR) │
└───────▲────────┘                        └──────▲───────┘          └───────┬───────┘
        │            scans QR (JWT pairing token)│                          │
        └────────────────────────────────────────┴──────────────────────────┘
                    QR payload: rsx://<host>?t=<one-time JWT>&d=<deviceId>

## Flow
1. Operator opens dashboard → server mints one-time JWT (TTL 120s) for a device ID.
2. Dashboard renders styled QR containing the relay URL + token.
3. Android app scans QR (ZXing), connects via WSS as `role=device`.
4. Dashboard connects as `role=viewer` for the same device ID; server pairs them.
5. App captures screen via MediaProjection, compresses frames to JPEG, streams
   binary WebSocket messages.
6. Server forwards device frames to the paired viewer only.
7. When the token expires or the socket closes, the session is torn down.

## Security Model
- JWT is single-use and short-lived; verified server-side on connect.
- Relay enforces one device + one viewer per session.
- TLS mandatory in production (terminate at reverse proxy or wss server).
- No frames are persisted; relay is stateless beyond the live session map.

## Future Extensions
- Touch/control injection (Accessibility / instrumentation channel)
- E2E encryption of frame stream (libsodium sealed boxes)
- Multi-viewer read-only sessions with per-viewer tokens
