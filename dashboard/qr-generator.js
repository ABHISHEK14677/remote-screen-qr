// QR rendering + styling. Exported for reuse; consumed by viewer.js.

let qrInstance = null;

function buildQr(data, opts = {}) {
  const container = document.getElementById("qrWrap") || document.body;
  if (qrInstance) qrInstance._canvas?.remove?.();
  const el = document.createElement("div");
  el.id = "qrWrap";
  document.getElementById("qr").replaceWith(el);

  qrInstance = new QRCodeStyling({
    width: 420,
    height: 420,
    data,
    qrOptions: { errorCorrectionLevel: "H" },
    dotsOptions: { color: opts.dotColor || "#0f4c81", type: opts.dotStyle || "rounded" },
    cornersSquareOptions: { color: opts.cornerColor || "#e94f37", type: "extra-rounded" },
    cornersDotOptions: { color: opts.cornerColor || "#e94f37" },
    backgroundOptions: { color: "#ffffff" },
    imageOptions: { margin: 8, imageSize: 0.2 },
  });
  qrInstance.append(el);

  // also keep raw <img> fallback
  qrInstance.getRawData("png").then((blob) => {
    const img = document.createElement("img");
    img.id = "qr";
    img.src = URL.createObjectURL(blob);
    img.style.maxWidth = "100%";
    el.append(img);
  });
}

function qrPayload(host, token, deviceId) {
  return `rsx://${host}?t=${token}&d=${deviceId}`;
}

window.QrGen = { buildQr, qrPayload };
