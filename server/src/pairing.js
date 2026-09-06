import { randomUUID } from 'node:crypto';
const sessions = new Map();
export function createPairing(ttlSeconds) {
  const id = randomUUID();
  sessions.set(id, Date.now() + ttlSeconds * 1000);
  return id;
}
export function validPairing(id) {
  const expiry = sessions.get(id);
  if (!expiry || expiry < Date.now()) { sessions.delete(id); return false; }
  return true;
}
