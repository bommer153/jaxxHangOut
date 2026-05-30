import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import {
  PlayerState,
  RoomState,
  JoinPayload,
  MovePayload,
  SOCKET_EVENTS,
} from '../../shared/types';

// ─── Setup ────────────────────────────────────────────────────────────────────

const app        = express();
const httpServer = createServer(app);

const IS_PROD = process.env.NODE_ENV === 'production';

const io = new Server(httpServer, {
  cors: {
    // Dev: allow any localhost port.
    // Prod: same-origin (client is served by this server), plus any
    //       custom domain set via ALLOWED_ORIGIN env var.
    origin: IS_PROD
      ? [process.env.ALLOWED_ORIGIN ?? ''].filter(Boolean)
      : /^http:\/\/localhost(:\d+)?$/,
    methods: ['GET', 'POST'],
  },
});

// ─── In-memory state ──────────────────────────────────────────────────────────
//
// A plain Map is all we need for one room.
// When we add multiple rooms this becomes Map<roomId, Map<socketId, PlayerState>>.
//
const players = new Map<string, PlayerState>();

// ─── Socket event handlers ────────────────────────────────────────────────────

io.on('connection', (socket: Socket) => {
  console.log(`[+] socket connected   id=${socket.id}`);

  // ── player:join ─────────────────────────────────────────────────────────────
  //
  // Client fires this once after connecting, sending their chosen nickname
  // and colour. We record the player, send them the full current room state,
  // then tell everyone else a new player arrived.
  //
  socket.on(SOCKET_EVENTS.PLAYER_JOIN, (data: JoinPayload) => {
    const player: PlayerState = {
      id:          socket.id,
      x:           480,           // world-center spawn — matches GameScene spawn
      y:           352,
      nickname:    (data.nickname ?? 'Guest').slice(0, 20), // cap length
      avatarIndex: Math.min(Math.max(Math.floor(data.avatarIndex ?? 0), 0), 11),
    };

    players.set(socket.id, player);
    console.log(`[join] "${player.nickname}"  id=${socket.id}  total=${players.size}`);

    // 1. Send the joiner a snapshot of everyone currently in the room
    const roomState: RoomState = {
      id:      'main',
      players: Object.fromEntries(players),
    };
    socket.emit(SOCKET_EVENTS.ROOM_STATE, roomState);

    // 2. Tell everyone else about the new arrival
    socket.broadcast.emit(SOCKET_EVENTS.PLAYER_JOINED, player);
  });

  // ── player:move ─────────────────────────────────────────────────────────────
  //
  // Client sends this ~20 times/sec (throttled in GameScene).
  // We update our server-side copy and relay to all other clients.
  //
  // Why relay instead of authoritative movement?
  // For a social hangout game with no competitive element, client-authoritative
  // movement is fine and keeps latency low. In a game where cheating matters
  // you'd validate here instead of blindly forwarding.
  //
  socket.on(SOCKET_EVENTS.PLAYER_MOVE, (data: MovePayload) => {
    const player = players.get(socket.id);
    if (!player) return; // player:join not yet received, ignore

    player.x = data.x;
    player.y = data.y;

    // Broadcast to everyone except the sender (they already know their position)
    socket.broadcast.emit(SOCKET_EVENTS.PLAYER_UPDATE, {
      id: socket.id,
      x:  data.x,
      y:  data.y,
    });
  });

  // ── disconnect ───────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const player = players.get(socket.id);
    if (!player) return; // disconnected before player:join

    players.delete(socket.id);
    console.log(`[-] "${player.nickname}" left  reason=${reason}  total=${players.size}`);

    // Tell everyone to remove this player's sprite
    io.emit(SOCKET_EVENTS.PLAYER_DISCONNECT, { id: socket.id });
  });

  // ── WebRTC signaling relay ───────────────────────────────────────────────────
  //
  // The server does NOT understand WebRTC — it is a pure relay.
  // Each message has a `to` field (target socket ID). The server
  // just stamps `from: socket.id` and forwards to the right recipient.
  // This is the standard signaling pattern for peer-to-peer WebRTC.
  //
  socket.on('webrtc:offer',  (d: { to: string; offer: unknown })     => io.to(d.to).emit('webrtc:offer',  { from: socket.id, offer:     d.offer }));
  socket.on('webrtc:answer', (d: { to: string; answer: unknown })    => io.to(d.to).emit('webrtc:answer', { from: socket.id, answer:    d.answer }));
  socket.on('webrtc:ice',    (d: { to: string; candidate: unknown }) => io.to(d.to).emit('webrtc:ice',    { from: socket.id, candidate: d.candidate }));
});

// ─── HTTP endpoints ───────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', players: players.size });
});

// In production, serve the pre-built React/Phaser client from client/dist.
if (IS_PROD) {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Start ─────────────────────────────────────────────────────────────────

// Cloud platforms (Railway, Render, Fly.io) inject PORT automatically.
const PORT = Number(process.env.PORT ?? 3001);

httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] ❌ Port ${PORT} is already in use.`);
    console.error(`[server]    Run this to free it:  npx kill-port ${PORT}`);
    process.exit(1);
  } else {
    throw err;
  }
});

httpServer.listen(PORT, () => {
  console.log(`[server] ✅ Listening → http://localhost:${PORT}`);
});
