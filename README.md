# Remote Screen QR

QR-based remote Android screen access tool for remote support, device testing, and MDM.

> ⚠️ **Authorized use only** — for administering devices you own or have explicit
> permission to support. MediaProjection always requires on-device user consent.

## Architecture
[Device app] --MediaProjection--> [WebSocket relay] <--[Operator dashboard]
       ^__________ QR contains pairing token (one-time, 120s TTL) __________|

## Components
| Folder        | Tech              | Purpose                        |
|---------------|-------------------|--------------------------------|
| `android-app` | Kotlin, OkHttp    | Screen capture + WS stream     |
| `server`      | Node.js, ws       | Pairing + relay (wss/TLS)      |
| `dashboard`   | HTML/JS           | Live viewer + QR generator     |

## Quick Start

### 1. Server
```bash
cd server
cp .env.example .env      # then edit JWT_SECRET
npm install && npm start
