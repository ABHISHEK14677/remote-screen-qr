# Remote Screen QR

Consent-based Android screen sharing paired to an operator dashboard with a QR code.

## Components

- `android-app/` — Android client. Screen capture always begins through Android's system consent dialog.
- `server/` — pairing and signaling relay; no persistent access tokens are issued.
- `dashboard/` — browser viewer and pairing-QR generator.

## Safety model

Pairing sessions are short-lived and should be protected with TLS in production. The Android app must display a persistent foreground notification while sharing and offer a visible stop control.

See [the architecture notes](docs/architecture.md).
