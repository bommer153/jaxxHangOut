import Phaser from 'phaser';

/**
 * BootScene — asset pre-loader placeholder.
 *
 * Right now it immediately hands off to GameScene.
 *
 * FUTURE STEPS: Load spritesheets, tilemaps, and audio here.
 * Display a progress bar via `this.load.on('progress', callback)`.
 * Only call `this.scene.start('GameScene')` once loading is complete.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
