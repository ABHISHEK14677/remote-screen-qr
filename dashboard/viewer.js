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
    const res = await fetch(`http://localhost:8443/pair?d=${encodeURIComponent(deviceId)}`);
    if (!res.ok) throw new Error("relay error " + res.status);
    const data = await res.json();

    // If QrGen is loaded, use it; otherwise fallback to the server's generated QR code
    if (window.QrGen && typeof window.QrGen.qrPayload === "function") {
      const host = new URL(data.payload.replace("rsx://", "https://")).host;
      const payload = window.QrGen.qrPayload(host, data.token, deviceId);
      window.QrGen.buildQr(payload, {
        dotColor: $("dotColor").value,
        cornerColor: $("cornerColor").value,
        dotStyle: $("dotStyle").value,
      });
    } else {
      // Fallback: display the pre-rendered QR image directly from the server
      let qrImg = document.getElementById("qr") || document.querySelector("#qrContainer img");
      if (!qrImg) {
        qrImg = document.createElement("img");
        qrImg.id = "qr";
        const container = document.getElementById("qrContainer") || document.querySelector(".panel") || document.body;
        container.appendChild(qrImg);
      }
      qrImg.src = data.qrDataUrl;
      qrImg.style.display = "block";
      qrImg.style.maxWidth = "280px";
      qrImg.style.margin = "12px auto";
    }

    status.textContent = `QR ready — expires in ${data.ttl}s. Scan with the Android app.`;
  } catch (e) {
    status.textContent = "Failed to reach relay: " + e.message;
  }
}

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
