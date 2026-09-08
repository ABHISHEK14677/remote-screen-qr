const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "remote_screen_secret_key_123";

function mintPairingToken(deviceId, ttlSeconds) {
  return jwt.sign({ d: deviceId, jti: require("crypto").randomUUID() },
    SECRET, { expiresIn: Number(ttlSeconds) });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

module.exports = { mintPairingToken, verifyToken };
