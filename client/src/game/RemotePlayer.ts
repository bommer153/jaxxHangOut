import Phaser from 'phaser';
import { avatarKey } from './avatars';

/**
 * LERP factor — how fast remote players catch up to their server position.
 * 0.18 = smooth but ~5 frames behind real position at 60fps.
 * Raise to 0.3+ for snappier (but jerkier) movement.
 */
const LERP = 0.18;

/**
 * RemotePlayer — renders one other player in the scene.
 *
 * Movement is NOT physics-driven. Instead we store a `targetX/Y`
 * (last known server position) and lerp the sprite toward it every frame.
 * This hides network jitter without adding physics overhead.
 *
 * The sprite uses the shared 'avatars' spritesheet and displays the frame
 * matching the remote player's chosen avatar.
 */
export class RemotePlayer {
  readonly id: string;

  private sprite: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;

  private targetX: number;
  private targetY: number;

  constructor(
    scene: Phaser.Scene,
    id: string,
    x: number,
    y: number,
    nickname: string,
    avatarIndex: number,
  ) {
    this.id      = id;
    this.targetX = x;
    this.targetY = y;

    // Depth 4 → below local player (depth 5) so local player renders on top
    this.sprite = scene.add
      .image(x, y, avatarKey(avatarIndex))
      .setDisplaySize(48, 48)
      .setDepth(4);

    this.label = scene.add
      .text(x, y - 30, nickname, {
        fontSize:        '10px',
        fontFamily:      'Arial',
        color:           '#ffffff',
        stroke:          '#000000',
        strokeThickness: 3,
        resolution:      2,
      })
      .setOrigin(0.5)
      .setDepth(9);
  }

  /** Call every frame — smoothly moves the sprite toward the last known position. */
  update(): void {
    this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, LERP);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, LERP);
    this.label.setPosition(this.sprite.x, this.sprite.y - 30);

    // Mirror sprite when moving left (same trick as local player)
    if      (this.targetX < this.sprite.x - 0.5) this.sprite.setFlipX(true);
    else if (this.targetX > this.sprite.x + 0.5) this.sprite.setFlipX(false);
  }

  /** Received a new position from the server — update the lerp target. */
  moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  destroy(): void {
    this.sprite.destroy();
    this.label.destroy();
  }
}
