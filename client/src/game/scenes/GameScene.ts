import Phaser from 'phaser';
import { socket } from '../network/socket';
import { RemotePlayer } from '../RemotePlayer';
import {
  PlayerState,
  RoomState,
  PlayerUpdatePayload,
  PlayerDisconnectPayload,
  SOCKET_EVENTS,
} from '../../../../shared/types';
import { AVATARS, avatarKey } from '../avatars';

// ─── Constants ───────────────────────────────────────────────────────────────

const TILE          = 32;
const PLAYER_SPEED  = 160;
const EMIT_INTERVAL = 50; // ms — ~20 position broadcasts per second

// ─── Room map ────────────────────────────────────────────────────────────────
//
// Tile legend:
//   0  = hardwood floor (walkable)
//   1  = wall
//   2  = carpet / rug tile (walkable, different colour)
//   3  = kitchen tile (walkable, light tile)
//   4  = furniture / obstacle (solid, not a wall but blocks movement)
//   5  = door tile (open passage, walkable, decorative threshold)
//   6  = welcome mat (walkable)
//
// 34 columns × 26 rows  →  1088 × 832 world pixels
// ─────────────────────────────────────────────────────────────────────────────
// Rooms:
//   A) Living Room   — top-left quadrant, carpet (2), sofa/TV furniture (4)
//   B) Kitchen       — top-right quadrant, tile floor (3), counter furniture (4)
//   C) Hallway       — centre vertical strip connecting rooms
//   D) Family Room   — bottom-left, carpet (2), couch cluster
//   E) Dining Room   — bottom-right, hardwood (0), table cluster
//
const ROOM_MAP: number[][] = [
  // col→ 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33
  /*  0 */[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  /*  1 */[1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 0, 0, 0, 0, 0, 1],
  /*  2 */[1, 2, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 1, 1, 3, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 0, 0, 0, 0, 0, 1],
  /*  3 */[1, 2, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 3, 4, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 0, 0, 0, 0, 0, 1],
  /*  4 */[1, 2, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 1, 1, 3, 4, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 0, 0, 0, 0, 0, 1],
  /*  5 */[1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 3, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 0, 0, 0, 0, 0, 1],
  /*  6 */[1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 3, 1, 1, 0, 0, 0, 0, 0, 1],
  /*  7 */[1, 2, 2, 2, 2, 2, 2, 4, 4, 4, 2, 2, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 4, 3, 1, 1, 0, 0, 0, 0, 0, 1],
  /*  8 */[1, 2, 2, 2, 2, 2, 2, 4, 2, 4, 2, 2, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 3, 5, 5, 0, 0, 0, 0, 0, 1],
  /*  9 */[1, 2, 2, 2, 2, 2, 2, 4, 4, 4, 2, 2, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 0, 0, 0, 0, 0, 1],
  /* 10 */[1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 0, 0, 0, 0, 0, 1],
  /* 11 */[1, 1, 1, 1, 1, 1, 5, 5, 5, 5, 1, 1, 1, 1, 1, 1, 1, 5, 5, 5, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1],
  /* 12 */[1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  /* 13 */[1, 1, 1, 1, 1, 1, 6, 6, 6, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  /* 14 */[1, 1, 1, 1, 1, 1, 5, 5, 5, 5, 1, 1, 1, 1, 1, 5, 5, 5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1],
  /* 15 */[1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  /* 16 */[1, 2, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  /* 17 */[1, 2, 4, 2, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  /* 18 */[1, 2, 4, 2, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  /* 19 */[1, 2, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  /* 20 */[1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  /* 21 */[1, 2, 2, 2, 2, 2, 2, 4, 4, 4, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 1],
  /* 22 */[1, 2, 2, 2, 2, 2, 2, 4, 2, 4, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 1],
  /* 23 */[1, 2, 2, 2, 2, 2, 2, 4, 4, 4, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 1],
  /* 24 */[1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 1],
  /* 25 */[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// ─── Scene ───────────────────────────────────────────────────────────────────

// Display size of each avatar in the game world.
// Avatars are roughly square head-shots; 48 px gives a good scale vs the 32 px tiles.
const AVATAR_SIZE  = 48;
// Nickname label sits just above the top of the avatar sprite.
const LABEL_OFFSET = AVATAR_SIZE / 2 + 6; // 30

export class GameScene extends Phaser.Scene {
  // Identity — passed in from GameCanvas via config factory
  private readonly nickname: string;
  private readonly avatarIndex: number;

  // Local player
  private player!: Phaser.Physics.Arcade.Sprite;
  private localLabel!: Phaser.GameObjects.Text;
  private walls!: Phaser.Physics.Arcade.StaticGroup;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up:    Phaser.Input.Keyboard.Key;
    down:  Phaser.Input.Keyboard.Key;
    left:  Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  // Multiplayer
  private remotePlayers = new Map<string, RemotePlayer>();
  private lastEmitTime  = 0;
  private wasMoving     = false;

  constructor(nickname: string, avatarIndex: number) {
    super({ key: 'GameScene' });
    this.nickname    = nickname;
    this.avatarIndex = avatarIndex;
  }

  // ── preload ────────────────────────────────────────────────────────────────
  //
  // Textures are painted with Phaser's Graphics API and baked into the
  // texture cache via generateTexture(). This means zero external assets
  // for the prototype — we can swap in real sprites later without touching
  // any other code (just change the texture key used in create()).
  //
  preload(): void {
    // ── Wall tile (interior walls — warm cream plaster) ───────────────────────
    const wallGfx = this.add.graphics();
    wallGfx.fillStyle(0x8b6340);           // warm tan
    wallGfx.fillRect(0, 0, TILE, TILE);
    wallGfx.fillStyle(0x7a5530);
    wallGfx.fillRect(0, 0, TILE, 2);      // top shadow
    wallGfx.fillRect(0, 0, 2, TILE);      // left shadow
    wallGfx.fillStyle(0xa07040);
    wallGfx.fillRect(2, 2, TILE - 4, TILE - 4); // inner lighter panel
    wallGfx.generateTexture('wall', TILE, TILE);
    wallGfx.destroy();

    // ── Hardwood floor tile ───────────────────────────────────────────────────
    const hwGfx = this.add.graphics();
    hwGfx.fillStyle(0xb5844a);
    hwGfx.fillRect(0, 0, TILE, TILE);
    hwGfx.fillStyle(0xa07040, 0.6);
    hwGfx.fillRect(0, 0, TILE, 2);       // plank top edge
    hwGfx.fillStyle(0xc8985a, 0.5);
    hwGfx.fillRect(0, TILE / 2, TILE, 1); // mid-plank highlight
    hwGfx.lineStyle(1, 0x8b6340, 0.3);
    hwGfx.lineBetween(0, 0, TILE, 0);
    hwGfx.generateTexture('floor_hw', TILE, TILE);
    hwGfx.destroy();

    // ── Carpet tile ───────────────────────────────────────────────────────────
    const carpGfx = this.add.graphics();
    carpGfx.fillStyle(0x7c5c8a);          // soft purple carpet
    carpGfx.fillRect(0, 0, TILE, TILE);
    carpGfx.fillStyle(0x6a4a78, 0.5);
    carpGfx.fillRect(0, 0, TILE, 1);
    carpGfx.fillRect(0, 0, 1, TILE);
    carpGfx.fillStyle(0x9a7aaa, 0.3);
    carpGfx.fillRect(2, 2, TILE - 4, TILE - 4);
    carpGfx.generateTexture('floor_carpet', TILE, TILE);
    carpGfx.destroy();

    // ── Kitchen tile ──────────────────────────────────────────────────────────
    const kitGfx = this.add.graphics();
    kitGfx.fillStyle(0xe8d8b0);           // creamy white tile
    kitGfx.fillRect(0, 0, TILE, TILE);
    kitGfx.lineStyle(1, 0xc8b880, 0.8);
    kitGfx.strokeRect(0, 0, TILE, TILE);
    kitGfx.lineStyle(1, 0xddc88a, 0.4);
    kitGfx.lineBetween(TILE / 2, 0, TILE / 2, TILE);
    kitGfx.lineBetween(0, TILE / 2, TILE, TILE / 2);
    kitGfx.generateTexture('floor_kitchen', TILE, TILE);
    kitGfx.destroy();

    // ── Furniture / obstacle tile ─────────────────────────────────────────────
    const furnGfx = this.add.graphics();
    furnGfx.fillStyle(0x5c3d1e);          // dark wood
    furnGfx.fillRect(0, 0, TILE, TILE);
    furnGfx.fillStyle(0x7a5530);
    furnGfx.fillRect(2, 2, TILE - 4, TILE - 4);
    furnGfx.fillStyle(0x9a7040, 0.5);
    furnGfx.fillRect(4, 4, TILE - 8, TILE - 8);
    furnGfx.generateTexture('furniture', TILE, TILE);
    furnGfx.destroy();

    // ── Door threshold tile ───────────────────────────────────────────────────
    const doorGfx = this.add.graphics();
    doorGfx.fillStyle(0xc8a060);          // lighter threshold strip
    doorGfx.fillRect(0, 0, TILE, TILE);
    doorGfx.fillStyle(0xe8c888, 0.6);
    doorGfx.fillRect(2, 2, TILE - 4, TILE - 4);
    doorGfx.generateTexture('door', TILE, TILE);
    doorGfx.destroy();

    // ── Welcome mat tile ──────────────────────────────────────────────────────
    const matGfx = this.add.graphics();
    matGfx.fillStyle(0xb5844a);           // same as hardwood base
    matGfx.fillRect(0, 0, TILE, TILE);
    matGfx.fillStyle(0xe05030);           // red mat
    matGfx.fillRect(3, 3, TILE - 6, TILE - 6);
    matGfx.fillStyle(0xf07050, 0.6);
    matGfx.fillRect(5, 5, TILE - 10, TILE - 10);
    matGfx.generateTexture('mat', TILE, TILE);
    matGfx.destroy();

    // ── Avatar portraits (one texture per character) ─────────────────────────
    AVATARS.forEach((av, i) => this.load.image(avatarKey(i), av.url));
  }

  // ── create ─────────────────────────────────────────────────────────────────
  create(): void {
    const cols   = ROOM_MAP[0].length;  // 34
    const rows   = ROOM_MAP.length;     // 26
    const worldW = cols * TILE;         // 1088 px
    const worldH = rows * TILE;         // 832 px

    // ── Floor layer (drawn first, under everything) ───────────────────────────
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const t = ROOM_MAP[row][col];
        let key: string;
        if      (t === 2)              key = 'floor_carpet';
        else if (t === 3)              key = 'floor_kitchen';
        else if (t === 5 || t === 6)   key = (t === 6) ? 'mat' : 'door';
        else if (t === 0 || t === 4)   key = 'floor_hw';
        else continue; // walls drawn separately
        this.add.image(col * TILE + TILE / 2, row * TILE + TILE / 2, key).setDepth(0);
      }
    }

    // ── Walls & furniture (static physics groups) ────────────────────────────
    this.walls = this.physics.add.staticGroup();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const t = ROOM_MAP[row][col];
        if (t === 1) {
          this.walls.create(col * TILE + TILE / 2, row * TILE + TILE / 2, 'wall').setDepth(1);
        } else if (t === 4) {
          // Invisible physics blocker — decals drawn by addFurnitureDecals()
          this.walls.create(col * TILE + TILE / 2, row * TILE + TILE / 2, 'furniture')
            .setDepth(2).setAlpha(0);
        }
      }
    }
    this.walls.refresh();
    this.addFurnitureDecals();

    // ── Room labels ───────────────────────────────────────────────────────────
    const labelStyle = {
      fontSize: '9px', fontFamily: 'Arial', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3, alpha: 0.55, resolution: 2,
    };
    const rooms: Array<[string, number, number]> = [
      ['Living Room',  6 * TILE,  5 * TILE],
      ['Kitchen',     19 * TILE,  5 * TILE],
      ['Hallway',     16 * TILE, 12 * TILE],
      ['Family Room',  6 * TILE, 19 * TILE],
      ['Dining Room', 24 * TILE, 19 * TILE],
    ];
    rooms.forEach(([name, x, y]) =>
      this.add.text(x, y, name, labelStyle).setOrigin(0.5).setDepth(3).setAlpha(0.55),
    );

    // ── "Jaxxx Hangout" title sign above the hallway entrance ─────────────────
    const signX = 16 * TILE;
    const signY = 12 * TILE - 6;

    // Sign backing plate
    const sign = this.add.graphics().setDepth(3);
    sign.fillStyle(0x3b1f0a, 0.92);
    sign.fillRoundedRect(signX - 88, signY - 14, 176, 28, 6);
    sign.lineStyle(2, 0xf6c96b, 0.9);
    sign.strokeRoundedRect(signX - 88, signY - 14, 176, 28, 6);

    this.add.text(signX, signY, '🏠 Jaxxx Hangout', {
      fontSize: '10px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#f6c96b', stroke: '#3b1f0a', strokeThickness: 3, resolution: 2,
    }).setOrigin(0.5).setDepth(4);

    // ── Spawn ─────────────────────────────────────────────────────────────────
    // Spawn in the hallway (row 12-13, around col 12)
    const spawnX = 12 * TILE + TILE / 2;
    const spawnY = 12 * TILE + TILE / 2;

    this.player = this.physics.add
      .sprite(spawnX, spawnY, avatarKey(this.avatarIndex))
      .setDisplaySize(AVATAR_SIZE, AVATAR_SIZE)
      .setDepth(5);
    this.player.setCollideWorldBounds(true);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(22, 22);

    // Local player nickname label
    this.localLabel = this.add
      .text(spawnX, spawnY - LABEL_OFFSET, this.nickname, {
        fontSize:        '10px',
        fontFamily:      'Arial',
        color:           '#ffffff',
        stroke:          '#000000',
        strokeThickness: 3,
        resolution:      2,
      })
      .setOrigin(0.5)
      .setDepth(10);

    // ── Collisions ───────────────────────────────────────────────────────────
    //
    // addCollider wires up continuous overlap testing between two groups.
    // Arcade physics resolves the collision by pushing the player out of
    // the wall using velocity-based separation — no tunnelling at our speed.
    //
    this.physics.add.collider(this.player, this.walls);

    // ── Camera ───────────────────────────────────────────────────────────────
    //
    // setBounds stops the camera from panning outside the world.
    // startFollow with lerp values (0.08, 0.08) creates smooth "easing"
    // — the camera glides toward the player rather than snapping.
    // setZoom(1.5) shows ~640×427 world pixels on a 960×640 viewport,
    // giving that intimate Among Us feel where the map is larger than the view.
    //
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.setBackgroundColor('#2e1508');

    // Physics world bounds
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Input
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // ── Multiplayer ─────────────────────────────────────────────────────────
    this.setupSocketListeners();
    socket.emit(SOCKET_EVENTS.PLAYER_JOIN, {
      nickname:    this.nickname,
      avatarIndex: this.avatarIndex,
    });
  }

  // ── Furniture decals ────────────────────────────────────────────────────────
  // All shapes are purely visual (no physics bodies).
  // The tile-4 static bodies above handle collision; these provide rich visuals.
  private addFurnitureDecals(): void {
    const T  = TILE;
    const px = (col: number) => col * T + T / 2;
    const py = (row: number) => row * T + T / 2;
    const D  = 2.5; // above floor & furniture tile (depth 2), below player (5)

    // ── Drawing helpers ──────────────────────────────────────────────────────

    const rug = (cx: number, cy: number, tw: number, th: number, col: number) => {
      const g = this.add.graphics().setDepth(0.5);
      const w = tw * T, h = th * T;
      g.fillStyle(col, 0.55);
      g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
      g.lineStyle(2, 0x000000, 0.18);
      g.strokeRoundedRect(cx - w / 2 + 4, cy - h / 2 + 4, w - 8, h - 8, 5);
    };

    const tv = (cx: number, cy: number, tiles: number) => {
      const w = tiles * T, h = T;
      const g = this.add.graphics().setDepth(D);
      // cabinet body
      g.fillStyle(0x3a2510);
      g.fillRoundedRect(cx - w / 2 + 1, cy - h / 2 + 2, w - 2, h - 4, 3);
      // screen bezel
      g.fillStyle(0x0a0a18);
      g.fillRoundedRect(cx - w / 2 + 5, cy - h / 2 + 5, w - 10, h - 12, 2);
      // screen glow
      g.fillStyle(0x1a4a9a, 0.65);
      g.fillRoundedRect(cx - w / 2 + 6, cy - h / 2 + 6, w - 12, h - 14, 2);
      // standby LED
      g.fillStyle(0x00dd66);
      g.fillCircle(cx + w / 2 - 7, cy + h / 2 - 7, 2);
      // stand
      g.fillStyle(0x555555);
      g.fillRect(cx - 5, cy + h / 2 - 4, 10, 3);
    };

    const sofa = (cx: number, cy: number, tiles: number, col: number) => {
      const w = tiles * T, h = T;
      const g = this.add.graphics().setDepth(D);
      // back cushion row
      g.fillStyle(col);
      g.fillRect(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, Math.floor(h / 3));
      // darker back
      g.fillStyle(0x000000, 0.25);
      g.fillRect(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, 4);
      // seat
      g.fillStyle(col);
      g.fillRoundedRect(cx - w / 2 + 2, cy - h / 2 + Math.floor(h / 3), w - 4, h - Math.floor(h / 3) - 2, 3);
      // armrests
      g.fillStyle(0x000000, 0.2);
      g.fillRoundedRect(cx - w / 2 + 1, cy - h / 2 + 2, 6, h - 3, 2);
      g.fillRoundedRect(cx + w / 2 - 7, cy - h / 2 + 2, 6, h - 3, 2);
      // cushion dividers
      g.lineStyle(1, 0x000000, 0.2);
      for (let i = 1; i < tiles; i++) {
        g.lineBetween(
          cx - w / 2 + i * T, cy - h / 2 + Math.floor(h / 3),
          cx - w / 2 + i * T, cy + h / 2 - 2,
        );
      }
    };

    const armchair = (cx: number, cy: number, col: number) => {
      const s = T - 6;
      const g = this.add.graphics().setDepth(D);
      // shadow
      g.fillStyle(0x000000, 0.18);
      g.fillRoundedRect(cx - s / 2 + 1, cy - s / 2 + 1, s, s, 4);
      // body
      g.fillStyle(col);
      g.fillRoundedRect(cx - s / 2, cy - s / 2, s, s, 4);
      // back
      g.fillStyle(0x000000, 0.22);
      g.fillRect(cx - s / 2, cy - s / 2, s, 5);
      // cushion highlight
      g.fillStyle(0xffffff, 0.1);
      g.fillRoundedRect(cx - s / 2 + 5, cy - s / 2 + 7, s - 10, s - 12, 3);
      // armrests
      g.fillStyle(0x000000, 0.15);
      g.fillRect(cx - s / 2, cy - s / 2 + 4, 5, s - 6);
      g.fillRect(cx + s / 2 - 5, cy - s / 2 + 4, 5, s - 6);
    };

    const bookshelf = (cx: number, cy: number, rows: number) => {
      const w = T, h = rows * T;
      const g = this.add.graphics().setDepth(D);
      g.fillStyle(0x5c3a18);
      g.fillRect(cx - w / 2 + 1, cy - h / 2, w - 2, h);
      const bkColors = [0xd04020, 0x2060c0, 0x208040, 0xc0a010, 0x8020b0, 0xc05010];
      const slotsPerRow = rows * 2;
      for (let r = 0; r < slotsPerRow; r++) {
        const sy = cy - h / 2 + (r * h / slotsPerRow) + 2;
        const sh = h / slotsPerRow - 5;
        // shelf plank
        g.fillStyle(0x3a2208);
        g.fillRect(cx - w / 2 + 1, sy - 1, w - 2, 2);
        // books
        let bx = cx - w / 2 + 3;
        let bi = 0;
        while (bx < cx + w / 2 - 4) {
          const bw = 3 + (bi % 3);
          g.fillStyle(bkColors[(bi + r) % bkColors.length]);
          g.fillRect(bx, sy, bw, sh);
          bx += bw + 1;
          bi++;
        }
      }
    };

    const counter = (cx: number, cy: number, tiles: number) => {
      const w = tiles * T, h = T;
      const g = this.add.graphics().setDepth(D);
      // cabinet face
      g.fillStyle(0xd4a87c);
      g.fillRect(cx - w / 2 + 1, cy - h / 2 + 1, w - 2, h - 2);
      // marble top strip
      g.fillStyle(0xece0cc);
      g.fillRect(cx - w / 2 + 1, cy - h / 2 + 1, w - 2, 7);
      // cabinet door outlines
      g.lineStyle(1, 0xb08860, 0.8);
      for (let i = 0; i < tiles; i++) {
        g.strokeRect(cx - w / 2 + i * T + 3, cy - h / 2 + 9, T - 6, h - 14);
        g.fillStyle(0x909090);
        g.fillRect(cx - w / 2 + i * T + T / 2 - 5, cy + 2, 10, 3);
      }
    };

    const counterV = (cx: number, cy: number, tiles: number) => {
      const w = T, h = tiles * T;
      const g = this.add.graphics().setDepth(D);
      g.fillStyle(0xd4a87c);
      g.fillRect(cx - w / 2 + 1, cy - h / 2 + 1, w - 2, h - 2);
      g.fillStyle(0xece0cc);
      g.fillRect(cx - w / 2 + 1, cy - h / 2 + 1, 7, h - 2);
      g.lineStyle(1, 0xb08860, 0.8);
      for (let i = 0; i < tiles; i++) {
        g.strokeRect(cx - w / 2 + 9, cy - h / 2 + i * T + 3, w - 14, T - 6);
        g.fillStyle(0x909090);
        g.fillRect(cx + 2, cy - h / 2 + i * T + T / 2 - 5, 3, 10);
      }
    };

    const stove = (cx: number, cy: number) => {
      const g = this.add.graphics().setDepth(D);
      g.fillStyle(0x484848);
      g.fillRect(cx - T / 2 + 1, cy - T / 2 + 1, T - 2, T - 2);
      g.fillStyle(0x303030);
      g.fillRect(cx - T / 2 + 3, cy - T / 2 + 3, T - 6, T - 6);
      const burners: Array<[number, number]> = [
        [cx - 8, cy - 7], [cx + 8, cy - 7],
        [cx - 8, cy + 7], [cx + 8, cy + 7],
      ];
      burners.forEach(([bx, by]) => {
        g.lineStyle(2, 0x888888); g.strokeCircle(bx, by, 5);
        g.lineStyle(1, 0x505050); g.strokeCircle(bx, by, 3);
      });
    };

    const fridge = (cx: number, cy: number) => {
      const w = T, h = T * 2;
      const g = this.add.graphics().setDepth(D);
      g.fillStyle(0xd8e8d8);
      g.fillRoundedRect(cx - w / 2 + 1, cy - h / 2 + 1, w - 2, h - 2, 3);
      g.lineStyle(1, 0xb8c8b8);
      g.lineBetween(cx - w / 2 + 1, cy, cx + w / 2 - 1, cy);
      // handles
      g.fillStyle(0xa0a8a0);
      g.fillRect(cx + w / 2 - 7, cy - h / 2 + 8, 3, 10);
      g.fillRect(cx + w / 2 - 7, cy + 5,         3, 10);
    };

    const plant = (cx: number, cy: number) => {
      const g = this.add.graphics().setDepth(D);
      // pot
      g.fillStyle(0xb86030); g.fillRect(cx - 7, cy + 4, 14, 10);
      g.fillStyle(0x904820); g.fillRect(cx - 8, cy + 3, 16, 4);
      g.fillStyle(0x2a1a08); g.fillRect(cx - 6, cy + 4, 12, 4);
      // leaves
      g.fillStyle(0x287838); g.fillCircle(cx,     cy - 3, 8);
      g.fillStyle(0x38a848); g.fillCircle(cx - 5, cy,     6);
      g.fillStyle(0x38a848); g.fillCircle(cx + 5, cy,     6);
      g.fillStyle(0x50c060, 0.7); g.fillCircle(cx, cy - 6, 5);
    };

    const lamp = (cx: number, cy: number) => {
      const g = this.add.graphics().setDepth(D);
      // soft glow halo
      g.fillStyle(0xfff0a0, 0.14); g.fillCircle(cx, cy - 4, 20);
      // base disc
      g.fillStyle(0x887860); g.fillEllipse(cx, cy + 12, 12, 5);
      // pole
      g.lineStyle(2, 0x887860); g.lineBetween(cx, cy + 10, cx, cy - 10);
      // shade
      g.fillStyle(0xf8e870, 0.9);
      g.fillTriangle(cx - 10, cy - 8, cx + 10, cy - 8, cx, cy - 20);
      g.lineStyle(1, 0xd8c040);
      g.strokeTriangle(cx - 10, cy - 8, cx + 10, cy - 8, cx, cy - 20);
    };

    const coffeeTable = (cx: number, cy: number, tw: number, th: number) => {
      const w = tw * T - 6, h = th * T - 6;
      const g = this.add.graphics().setDepth(D);
      // shadow
      g.fillStyle(0x000000, 0.18);
      g.fillRoundedRect(cx - w / 2 + 2, cy - h / 2 + 2, w, h, 6);
      // glass top
      g.fillStyle(0x9cc4d4, 0.45);
      g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 6);
      g.lineStyle(2, 0x80a8bc, 0.8);
      g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 6);
      // legs
      g.fillStyle(0x7a5530);
      const legs: Array<[number, number]> = [
        [cx - w / 2 + 5, cy - h / 2 + 5],
        [cx + w / 2 - 5, cy - h / 2 + 5],
        [cx - w / 2 + 5, cy + h / 2 - 5],
        [cx + w / 2 - 5, cy + h / 2 - 5],
      ];
      legs.forEach(([lx, ly]) => g.fillRect(lx - 2, ly - 2, 4, 4));
    };

    const diningTable = (cx: number, cy: number, tw: number, th: number) => {
      const w = tw * T - 8, h = th * T - 8;
      const g = this.add.graphics().setDepth(D);
      // shadow
      g.fillStyle(0x000000, 0.22); g.fillEllipse(cx + 3, cy + 4, w, h);
      // top
      g.fillStyle(0x7a5530); g.fillEllipse(cx, cy, w, h);
      // wood grain
      g.fillStyle(0x9a7550, 0.38); g.fillEllipse(cx - 8, cy - 8, w * 0.55, h * 0.55);
      // rim
      g.lineStyle(3, 0x5a3a18); g.strokeEllipse(cx, cy, w, h);
      // place settings
      const plates: Array<[number, number]> = [
        [cx,             cy - h / 2 + 14],
        [cx,             cy + h / 2 - 14],
        [cx - w / 2 + 14, cy],
        [cx + w / 2 - 14, cy],
      ];
      plates.forEach(([ppx, ppy]) => {
        g.fillStyle(0xf0e8d8, 0.9); g.fillCircle(ppx, ppy, 7);
        g.fillStyle(0xddd0b8, 0.7); g.fillCircle(ppx, ppy, 4);
      });
    };

    // ── Placement ───────────────────────────────────────────────────────────

    // ─── LIVING ROOM (cols 1-11, rows 1-10, purple carpet) ──────────────────
    rug(px(5), py(5), 7, 6, 0x8040b0);
    // TV unit at top cluster (row 2, cols 2-4)
    tv(px(3), py(2), 3);
    // Sofa facing TV (row 4, cols 2-4)
    sofa(px(3), py(4), 3, 0x2a5888);
    // Floor lamp beside TV area
    lamp(px(5), py(3));
    // Bookshelf against right wall
    bookshelf(px(11), py(3), 3);
    // Couch at bottom cluster (row 7, cols 7-9)
    sofa(px(8), py(7), 3, 0x334878);
    // Armchairs flanking coffee table
    armchair(px(6), py(8), 0x2a5888);
    armchair(px(10), py(8), 0x2a5888);
    // Coffee table in sitting nook
    coffeeTable(px(8), py(9), 2, 1);
    // Accent plants
    plant(px(11), py(10));
    plant(px(1),  py(1));

    // ─── KITCHEN (cols 14-25, rows 1-10, cream tiles) ───────────────────────
    // U-shaped counter (rows 2-5, cols 15-17)
    counter(px(16),  py(2), 3);              // top counter
    stove(px(16),    py(3));                 // stove on top run
    counterV(px(15), py(4), 2);             // left vertical run
    counterV(px(17), py(4), 2);             // right vertical run
    counter(px(16),  py(5), 3);             // bottom counter
    // Right appliance cluster (rows 6-8, cols 22-24)
    counter(px(23),  py(6), 3);             // top shelf
    fridge((px(22) + px(22)) / 2, py(7) + T / 2); // fridge spans rows 7-8 col 22
    stove(px(23),    py(7));                 // stove col 23
    stove(px(24),    py(7));                 // second burner col 24
    counter(px(23),  py(8), 3);             // bottom shelf
    // Kitchen nook table
    coffeeTable(px(20), py(9), 2, 1);
    // Plants on windowsill
    plant(px(25), py(2));
    plant(px(25), py(9));

    // ─── HALLWAY (rows 11-14) ───────────────────────────────────────────────
    plant(px(10), py(12));
    plant(px(25), py(13));
    plant(px(32), py(12));
    coffeeTable(px(22), py(12), 2, 1);

    // ─── FAMILY ROOM (cols 1-13, rows 15-24, purple carpet) ────────────────
    rug(px(7), py(19), 7, 6, 0x6030a0);
    // TV console (row 16, cols 2-4)
    tv(px(3), py(16), 3);
    // Armchair pair facing TV (rows 17-18)
    armchair(px(2), py(18), 0xb05820);
    armchair(px(4), py(18), 0xb05820);
    coffeeTable(px(3), py(20), 2, 1);
    // Sofa cluster (rows 21-23, cols 7-9)
    sofa(px(8), py(21), 3, 0x4a3880);
    coffeeTable(px(8), py(23), 2, 1);
    lamp(px(5), py(17));
    // Plants
    plant(px(13), py(15));
    plant(px(13), py(24));
    plant(px(1),  py(24));

    // ─── DINING ROOM (cols 15-32, rows 15-24, hardwood) ────────────────────
    // Dining table centered on cols 18-21, rows 16-19
    diningTable((px(18) + px(21)) / 2, (py(16) + py(19)) / 2, 4, 4);
    // Chairs around the table (on walkable tiles)
    armchair(px(19), py(15), 0xa86030);
    armchair(px(20), py(15), 0xa86030);
    armchair(px(17), py(17), 0xa86030);
    armchair(px(22), py(17), 0xa86030);
    armchair(px(17), py(18), 0xa86030);
    armchair(px(22), py(18), 0xa86030);
    armchair(px(19), py(20), 0xa86030);
    armchair(px(20), py(20), 0xa86030);
    // Buffet/sideboard (rows 21-24, cols 22-26)
    counter(px(24),  py(21), 4);
    counterV(px(22), py(23), 2);
    counterV(px(26), py(23), 2);
    counter(px(24),  py(24), 4);
    // Lamps and plants
    lamp(px(28),  py(18));
    lamp(px(16),  py(19));
    plant(px(32), py(16));
    plant(px(32), py(23));
    plant(px(15), py(24));
  }

  // ── Socket listeners ──────────────────────────────────────────────────────
  private setupSocketListeners(): void {
    const onRoomState = (state: RoomState) => {
      Object.values(state.players).forEach(p => this.spawnRemote(p));
    };
    const onPlayerJoined = (player: PlayerState) => {
      this.spawnRemote(player);
    };
    const onPlayerUpdate = (data: PlayerUpdatePayload) => {
      this.remotePlayers.get(data.id)?.moveTo(data.x, data.y);
    };
    const onPlayerDisconnect = (data: PlayerDisconnectPayload) => {
      const r = this.remotePlayers.get(data.id);
      if (r) { r.destroy(); this.remotePlayers.delete(data.id); }
    };

    socket.on(SOCKET_EVENTS.ROOM_STATE,        onRoomState);
    socket.on(SOCKET_EVENTS.PLAYER_JOINED,     onPlayerJoined);
    socket.on(SOCKET_EVENTS.PLAYER_UPDATE,     onPlayerUpdate);
    socket.on(SOCKET_EVENTS.PLAYER_DISCONNECT, onPlayerDisconnect);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      socket.off(SOCKET_EVENTS.ROOM_STATE,        onRoomState);
      socket.off(SOCKET_EVENTS.PLAYER_JOINED,     onPlayerJoined);
      socket.off(SOCKET_EVENTS.PLAYER_UPDATE,     onPlayerUpdate);
      socket.off(SOCKET_EVENTS.PLAYER_DISCONNECT, onPlayerDisconnect);
    });
  }

  private spawnRemote(player: PlayerState): void {
    if (player.id === socket.id || this.remotePlayers.has(player.id)) return;
    this.remotePlayers.set(
      player.id,
      new RemotePlayer(this, player.id, player.x, player.y, player.nickname, player.avatarIndex),
    );
  }

  // ── update ─────────────────────────────────────────────────────────────────
  update(time: number): void {
    const { up, down, left, right } = this.wasd;
    const ar = this.cursors;

    let vx = 0;
    let vy = 0;

    if (left.isDown  || ar.left.isDown)  vx -= PLAYER_SPEED;
    if (right.isDown || ar.right.isDown) vx += PLAYER_SPEED;
    if (up.isDown    || ar.up.isDown)    vy -= PLAYER_SPEED;
    if (down.isDown  || ar.down.isDown)  vy += PLAYER_SPEED;

    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }
    this.player.setVelocity(vx, vy);

    if (vx < 0)       this.player.setFlipX(true);
    else if (vx > 0)  this.player.setFlipX(false);

    // ── Throttled position broadcast ─────────────────────────────────────────
    const isMoving = vx !== 0 || vy !== 0;
    if (isMoving && time - this.lastEmitTime >= EMIT_INTERVAL) {
      this.lastEmitTime = time;
      socket.emit(SOCKET_EVENTS.PLAYER_MOVE, { x: this.player.x, y: this.player.y });
    }
    // Final position on stop — remote players snap to correct resting spot
    if (this.wasMoving && !isMoving) {
      socket.emit(SOCKET_EVENTS.PLAYER_MOVE, { x: this.player.x, y: this.player.y });
    }
    this.wasMoving = isMoving;

    // ── Update local label & remote player lerp ───────────────────────────────
    this.localLabel.setPosition(this.player.x, this.player.y - LABEL_OFFSET);
    this.remotePlayers.forEach(r => r.update());
  }
}
