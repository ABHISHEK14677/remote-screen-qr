const jwt = require("jsonwebtoken");

function mintPairingToken(deviceId, ttlSeconds) {
  return jwt.sign({ d: deviceId, jti: require("crypto").randomUUID() },
    process.env.JWT_SECRET, { expiresIn: Number(ttlSeconds) });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { mintPairingToken, verifyToken };
