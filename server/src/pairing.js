/** Session pairing registry: one device + one viewer per deviceId. */
const sessions = new Map(); // deviceId -> { device: ws|null, viewers: Set }

function getSession(deviceId) {
  if (!sessions.has(deviceId)) {
    sessions.set(deviceId, { device: null, viewers: new Set() });
  }
  return sessions.get(deviceId);
}

function registerDevice(deviceId, ws) {
  const s = getSession(deviceId);
  if (s.device && s.device.readyState === 1) return false; // device slot taken
  s.device = ws;
  return true;
}

function registerViewer(deviceId, ws, maxViewers = 1) {
  const s = getSession(deviceId);
  if (s.viewers.size >= maxViewers) return false;
  s.viewers.add(ws);
  return true;
}

function removeSocket(deviceId, ws) {
  const s = sessions.get(deviceId);
  if (!s) return;
  if (s.device === ws) s.device = null;
  s.viewers.delete(ws);
  if (!s.device && s.viewers.size === 0) sessions.delete(deviceId);
}

function forward(deviceId, data) {
  const s = sessions.get(deviceId);
  if (!s) return;
  for (const v of s.viewers) if (v.readyState === 1) v.send(data);
}

module.exports = { registerDevice, registerViewer, removeSocket, forward, getSession };
