import { socket } from './socket';
import {
  PlayerState,
  RoomState,
  PlayerDisconnectPayload,
  SOCKET_EVENTS,
  WEBRTC_EVENTS,
} from '../../../../shared/types';

/**
 * Public STUN servers — help peers discover each other's public IP.
 * For LAN play only, STUN isn't needed, but it's free to include.
 * For production add TURN servers (relay) to handle strict NATs.
 */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * VoiceChat — manages WebRTC peer connections for voice.
 *
 * ARCHITECTURE (mesh topology):
 *   Every player connects directly to every other player.
 *   Works well up to ~6–8 players. For larger rooms, use SFU (e.g. mediasoup).
 *
 * WHO INITIATES:
 *   When player B joins and player A is already in the room:
 *     • Server broadcasts `player:joined` to A
 *     • A creates an offer → sends to B via server relay
 *     • B receives offer → creates answer → sends back
 *     • Both exchange ICE candidates → connection established
 *   Player B passively answers; existing players actively offer.
 *
 * SIGNALING via Socket.IO:
 *   The Socket.IO server is a dumb relay — it stamps `from: socket.id`
 *   and forwards webrtc:offer / webrtc:answer / webrtc:ice to the target.
 */
class VoiceChat {
  private localStream: MediaStream | null = null;
  private peers = new Map<string, RTCPeerConnection>();
  private _muted   = false;
  private _ready   = false;

  /**
   * All socket IDs currently in the room (excluding our own).
   * Populated from room:state and player:joined before voice is enabled,
   * so we know who to call when the user finally clicks "Enable Voice".
   */
  private knownPeers = new Set<string>();

  /**
   * Offers that arrived before the microphone stream was ready.
   * Processed in order as soon as init() completes.
   */
  private pendingOffers: Array<{ peerId: string; offer: RTCSessionDescriptionInit }> = [];

  constructor() {
    // Wire signaling immediately so events are never missed regardless of
    // when (or whether) the user clicks "Enable Voice".
    this.wireSignaling();
  }

  /** Call when the user clicks "Enable Voice". Triggers mic permission dialog. */
  async init(): Promise<void> {
    if (this._ready) return;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      this._ready = true;
    } catch (err) {
      console.warn('[voice] Mic permission denied or unavailable:', err);
      return;
    }

    console.log('[voice] ✅ Microphone ready');

    // Answer any offers that buffered while we were waiting for mic permission.
    const pending = [...this.pendingOffers];
    this.pendingOffers = [];
    const answeredIds = new Set<string>();
    for (const { peerId, offer } of pending) {
      await this.answerOffer(peerId, offer);
      answeredIds.add(peerId);
    }

    // Call peers that are already in the room and haven't been reached yet.
    // This handles the case where voice was enabled after joining a room that
    // already had other players (their player:joined events were missed earlier).
    this.knownPeers.forEach(id => {
      if (!answeredIds.has(id) && !this.peers.has(id)) {
        this.callPeer(id);
      }
    });
  }

  // ── Signaling wiring ───────────────────────────────────────────────────────

  private wireSignaling(): void {
    // Track existing players so we can call them if voice is enabled later.
    socket.on(SOCKET_EVENTS.ROOM_STATE, (state: RoomState) => {
      Object.keys(state.players).forEach(id => {
        if (id !== socket.id) this.knownPeers.add(id);
      });
    });

    // Existing player → new joiner: send an offer when someone new arrives.
    socket.on(SOCKET_EVENTS.PLAYER_JOINED, (player: PlayerState) => {
      this.knownPeers.add(player.id);
      if (this._ready) this.callPeer(player.id);
    });

    // New joiner → existing player: receive offer, send answer.
    // If the stream isn't ready yet, buffer the offer for processing in init().
    socket.on(WEBRTC_EVENTS.OFFER, async (msg: { from: string; offer: RTCSessionDescriptionInit }) => {
      if (!this._ready) {
        this.pendingOffers.push({ peerId: msg.from, offer: msg.offer });
        return;
      }
      await this.answerOffer(msg.from, msg.offer);
    });

    // Receive answer to our offer
    socket.on(WEBRTC_EVENTS.ANSWER, async (msg: { from: string; answer: RTCSessionDescriptionInit }) => {
      await this.peers.get(msg.from)?.setRemoteDescription(msg.answer);
    });

    // Exchange ICE candidates (NAT traversal)
    socket.on(WEBRTC_EVENTS.ICE, (msg: { from: string; candidate: RTCIceCandidateInit }) => {
      this.peers.get(msg.from)
        ?.addIceCandidate(new RTCIceCandidate(msg.candidate))
        .catch(console.error);
    });

    // Clean up when the remote peer disconnects
    socket.on(SOCKET_EVENTS.PLAYER_DISCONNECT, ({ id }: PlayerDisconnectPayload) => {
      this.knownPeers.delete(id);
      this.closePeer(id);
    });
  }

  // ── Peer management ────────────────────────────────────────────────────────

  private async callPeer(peerId: string): Promise<void> {
    if (!this.localStream) return;
    const peer = this.buildPeer(peerId);
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit(WEBRTC_EVENTS.OFFER, { to: peerId, offer });
    } catch (err) {
      console.error('[voice] createOffer failed:', err);
    }
  }

  private async answerOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.localStream) return;
    const peer = this.buildPeer(peerId);
    try {
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit(WEBRTC_EVENTS.ANSWER, { to: peerId, answer });
    } catch (err) {
      console.error('[voice] createAnswer failed:', err);
    }
  }

  private buildPeer(peerId: string): RTCPeerConnection {
    this.closePeer(peerId); // close any stale connection first

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peers.set(peerId, peer);

    // Add our audio tracks so the remote peer hears us
    this.localStream!.getTracks().forEach(track =>
      peer.addTrack(track, this.localStream!),
    );

    // When their audio arrives, play it immediately
    peer.ontrack = (ev) => {
      const audio = new Audio();
      audio.srcObject = ev.streams[0];
      audio.autoplay = true;
      audio.play().catch(console.error);
    };

    // Send ICE candidates to the peer via the server relay
    peer.onicecandidate = (ev) => {
      if (ev.candidate) {
        socket.emit(WEBRTC_EVENTS.ICE, { to: peerId, candidate: ev.candidate });
      }
    };

    peer.onconnectionstatechange = () => {
      console.log(`[voice] ${peerId} → ${peer.connectionState}`);
      if (peer.connectionState === 'failed') this.closePeer(peerId);
    };

    return peer;
  }

  private closePeer(id: string): void {
    const peer = this.peers.get(id);
    if (peer) {
      peer.close();
      this.peers.delete(id);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  toggleMute(): boolean {
    this._muted = !this._muted;
    this.localStream?.getAudioTracks().forEach(t => (t.enabled = !this._muted));
    return this._muted;
  }

  get isMuted(): boolean { return this._muted; }
  get isReady(): boolean { return this._ready; }
}

/** Singleton — one voice session for the entire app lifetime. */
export const voiceChat = new VoiceChat();
