import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { requireOperator } from './auth.js';
import { createPairing, validPairing } from './pairing.js';

const app = express(); const httpServer = createServer(app); const io = new Server(httpServer, { cors: { origin: false } });
const ttl = Number(process.env.PAIRING_TTL_SECONDS || 300);
app.post('/pairings', requireOperator, (_req, res) => res.json({ pairingId: createPairing(ttl), expiresIn: ttl }));
io.on('connection', socket => socket.on('join', ({ pairingId, role }) => {
  if (!validPairing(pairingId) || !['viewer', 'device'].includes(role)) return socket.disconnect(true);
  socket.join(pairingId); socket.to(pairingId).emit('peer-joined', { role });
  socket.on('signal', data => socket.to(pairingId).emit('signal', data));
}));
httpServer.listen(process.env.PORT || 3000);
