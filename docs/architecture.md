# Architecture

1. The dashboard requests a short-lived pairing ID from the relay and encodes it in a QR code.
2. The Android client scans the QR code, validates the server origin, and joins that pairing ID.
3. The client requests Android MediaProjection consent. It streams only after the user approves it.
4. The relay forwards WebRTC signaling; media flows peer-to-peer when possible, otherwise through a configured TURN server.
5. Either participant can end the session; the client foreground service immediately stops capture.

Production deployments should use HTTPS/WSS, authenticated operators, rate limits, expiry, audit logs, and a TURN server with ephemeral credentials.
