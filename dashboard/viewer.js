// Operator dashboard logic: pairing QR + live screen viewer.

const $ = (id) => document.getElementById(id);
const canvas = $("screen");
const ctx = canvas.getContext("2d");
let ws = null;

// ---------- Pairing ----------
async function generatePairing() {
  const deviceId = $("deviceId").value.trim() || "device-01";
  const status = $("status");
  try {
    // Relay server must be reachable; adjust host if remote
    const res = await fetch(`http://localhost:8443/pair?d=${encodeURIComponent(deviceId)}`);
    if (!res.ok) throw new Error("relay error " + res.status);
    const data = await res.json();

    // Use styled QR library
    const host = new URL(data.payload.replace("rsx://", "https://")).host;
    const payload = window.QrGen.qrPayload(host, data.token, deviceId);
    window.QrGen.buildQr(payload, {
      dotColor: $("dotColor").value,
      cornerColor: $("cornerColor").value,
      dotStyle: $("dotStyle").value,
    });

    status.textContent = `QR ready — expires in ${data.ttl}s. Scan with the Android app.`;
  } catch (e) {
    status.textContent = "Failed to reach relay: " + e.message;
  }
}

$("pairBtn").addEventListener("click", generatePairing);
$("restyleBtn").addEventListener("click", () => generatePairing());

// ---------- Viewer ----------
function connectViewer() {
  const deviceId = $("deviceId").value.trim() || "device-01";
  // Viewer token: in production mint a viewer JWT server-side; demo uses /pair token
  fetch(`http://localhost:8443/pair?d=${encodeURIComponent(deviceId)}&_=${Date.now()}`)
    .then(r => r.json())
    .then(data => {
      const url = `wss://localhost:8443/ws?role=viewer&d=${deviceId}&t=${data.token}`;
      // Local dev: use ws:// — change to wss:// with real TLS in production
      const devUrl = url.replace("wss://", "ws://");
      ws = new WebSocket(devUrl);
      ws.binaryType = "blob";

      ws.onopen = () => $("status").textContent = "Viewer connected. Waiting for frames…";
      ws.onmessage = (ev) => {
        if (typeof ev.data === "string") return; // ignore control msgs
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(ev.data);
      };
      ws.onclose = (ev) => { $("status").textContent = "Viewer closed: " + ev.reason; };
      ws.onerror = () => $("status").textContent = "Viewer error.";
    });
}

$("connectBtn").addEventListener("click", connectViewer);
$("disconnectBtn").addEventListener("click", () => ws?.close());
