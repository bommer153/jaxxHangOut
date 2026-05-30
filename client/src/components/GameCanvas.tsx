import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../game/config';

interface Props {
  nickname: string;
  avatarIndex: number;
}

export function GameCanvas({ nickname, avatarIndex }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef      = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    gameRef.current = new Phaser.Game(
      createGameConfig(containerRef.current, nickname, avatarIndex),
    );

    const onResize = () => gameRef.current?.scale.refresh();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  // nickname is set once at join and never changes — effect runs once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="w-full h-screen overflow-hidden" />;
}
