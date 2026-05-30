import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

/**
 * createGameConfig — factory called once per session with the player's
 * identity.  We instantiate scenes directly (`new GameScene(...)`) so we
 * can pass constructor arguments; Phaser accepts pre-built instances in
 * the `scene` array alongside plain classes.
 */
export function createGameConfig(
  parent: HTMLElement,
  nickname: string,
  avatarIndex: number,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#2e1508',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    render: {
      // pixelArt off so avatar portraits scale smoothly (bilinear filtering).
      // Tile textures are drawn at tile-exact sizes so they still look crisp.
      pixelArt: false,
      antialias: true,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [new BootScene(), new GameScene(nickname, avatarIndex)],
  };
}
