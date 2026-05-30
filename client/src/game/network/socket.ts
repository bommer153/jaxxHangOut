import { io, Socket } from 'socket.io-client';

/**
 * socket.ts — singleton Socket.IO client.
 *
 * One socket connection for the entire app lifetime.
 * Import this file anywhere to get the same instance:
 *
 *   import { socket } from './network/socket';
 *
 * WHY A SINGLETON:
 *   Creating multiple socket instances from different components would open
 *   multiple TCP connections to the server — each would look like a different
 *   player. A singleton ensures one player = one connection.
 *
 * autoConnect: false means the socket stays disconnected until we
 * explicitly call socket.connect(). We do that after the player types
 * their nickname. For now (connection test) we call it immediately below.
 */
// In development the server runs on a separate port (3001).
// In production the client is served by the same Express server, so we
// connect to whatever origin the page was loaded from.
const SERVER_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001')
  : window.location.origin;

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,   // we control when to connect
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1500,
});

// ─── Lifecycle logging (visible in browser DevTools → Console) ────────────────

socket.on('connect', () => {
  console.log('[socket] ✅ Connected to server  id =', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[socket] ❌ Disconnected  reason =', reason);
});

socket.on('connect_error', (err) => {
  console.error('[socket] Connection error:', err.message);
});
