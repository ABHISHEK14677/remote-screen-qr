require("dotenv").config();
const crypto = require("crypto");
const http = require("http");
const { WebSocketServer } = require("ws");
const QRCode = require("qrcode");
const { mintPairingToken, verifyToken } = require("./auth");
const pairing = require("./pairing");

const PORT = Number(process.env.PORT || 8443);
const TTL = Number(process.env.TOKEN_TTL_SECONDS || 120);
const PUBLIC_WS_URL = process.env.PUBLIC_WS_URL || `wss://localhost:${PORT}/ws`;

const server = http.createServer(async (req, res) => {
  // CORS for dashboard
  res.setHeader("Access-Control-Allow-Origin", "*");

  // GET /pair?d=device-01  -> { url, qrDataUrl }
  if (req.url?.startsWith("/pair")) {
    const url = new URL(req.url, "http://x");
    const deviceId = url.searchParams.get("d") || `device-${crypto.randomBytes(3).toString("hex")}`;
    const token = mintPairingToken(deviceId, TTL);
    const payload = `rsx://${new URL(PUBLIC_WS_URL).host}?t=${token}&d=${deviceId}`;
    const qrDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: "H", width: 600, margin: 2,
      color: { dark: "#0f4c81", light: "#ffffff" },
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ deviceId, token, payload, qrDataUrl, ttl: TTL }));
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://x");
  const role = url.searchParams.get("role");
  const deviceId = url.searchParams.get("d");
  const token = url.searchParams.get("t");

  if (!deviceId || !token || !verifyToken(token)) {
    ws.close(4001, "invalid or expired token");
    return;
  }

  if (role === "device") {
    if (!pairing.registerDevice(deviceId, ws)) {
      ws.close(4002, "device slot already taken");
      return;
    }
    console.log(`[+] device connected: ${deviceId}`);
  } else if (role === "viewer") {
    if (!pairing.registerViewer(deviceId, ws)) {
      ws.close(4003, "viewer limit reached");
      return;
    }
    console.log(`[+] viewer connected: ${deviceId}`);
  } else {
    ws.close(4000, "unknown role");
    return;
  }

  ws.on("message", (data, isBinary) => {
    if (role === "device" && isBinary) {
      pairing.forward(deviceId, data);
    }
  });

  ws.on("close", () => {
    pairing.removeSocket(deviceId, ws);
    console.log(`[-] ${role} disconnected: ${deviceId}`);
  });
});

server.listen(PORT, () => {
  console.log(`Relay listening on :${PORT}`);
  console.log(`Pairing endpoint:   http://localhost:${PORT}/pair?d=device-01`);
});
