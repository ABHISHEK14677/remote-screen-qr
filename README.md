# Remote Screen QR

QR-based remote Android screen access tool for remote support, device testing, and MDM.

⚠️ **Authorized use only** — for administering devices you own or have explicit permission to support.

## Architecture
[Device app] --MediaProjection--> [WebSocket relay] <--[Operator dashboard]
       ^__________ QR contains pairing token (one-time, 120s TTL) __________|

## Components
| Folder        | Tech          | Purpose                        |
|---------------|---------------|--------------------------------|
| `android-app` | Kotlin, OkHttp| Screen capture + WS stream     |
| `server`      | Node.js, ws   | Pairing + relay (wss/TLS)      |
| `dashboard`   | HTML/JS       | Live viewer + QR generator     |

## Quick Start
### Server
    cd server
    cp .env.example .env   # then edit JWT_SECRET
    npm install && npm start

### Dashboard
    cd dashboard && python3 -m http.server 8080

### Android
    # Open android-app/ in Android Studio, build, install

## Security
- One-time short-TTL JWT in QR payload
- TLS (wss://) enforced
- One viewer per pairing token
- Auto-shutdown on token expiry

## License
MIT
