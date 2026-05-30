/**
 * shared/types.ts — imported by BOTH client and server.
 *
 * Keeping types here ensures the two sides always agree on the shape
 * of data sent over Socket.IO. A mismatch here causes a compile error,
 * not a silent runtime bug.
 *
 * For step 1 (local only) these types aren't used yet, but they're here
 * so the folder structure is ready for the multiplayer step.
 */

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  nickname: string;
  avatarIndex: number; // 0-15, index into the 4×4 Sprites.png sheet
}

export interface RoomState {
  id: string;
  players: Record<string, PlayerState>;
}

// ─── Socket event payload types ──────────────────────────────────────────────

/** Client → Server: announce yourself when you load the game. */
export interface JoinPayload {
  nickname: string;
  avatarIndex: number;
}

/** Client → Server: throttled position update while moving. */
export interface MovePayload {
  x: number;
  y: number;
}

/** Server → Clients: a specific player's position changed. */
export interface PlayerUpdatePayload {
  id: string;
  x: number;
  y: number;
}

/** Server → Clients: a player left. */
export interface PlayerDisconnectPayload {
  id: string;
}

// ─── Event name constants ─────────────────────────────────────────────────────
// Both sides import this object — a typo is a compile error, not a silent bug.

export const SOCKET_EVENTS = {
  // client → server
  PLAYER_JOIN:       'player:join',
  PLAYER_MOVE:       'player:move',

  // server → clients
  ROOM_STATE:        'room:state',        // full snapshot sent to the joiner
  PLAYER_JOINED:     'player:joined',     // new player entered the room
  PLAYER_UPDATE:     'player:update',     // position update from another player
  PLAYER_DISCONNECT: 'player:disconnect', // a player left
} as const;

export const WEBRTC_EVENTS = {
  OFFER:  'webrtc:offer',
  ANSWER: 'webrtc:answer',
  ICE:    'webrtc:ice',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
