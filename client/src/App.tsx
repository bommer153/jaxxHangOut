import { useState } from 'react';
import { socket } from './game/network/socket';
import { GameCanvas } from './components/GameCanvas';
import { NicknameScreen } from './components/NicknameScreen';
import { VoiceControls } from './components/VoiceControls';

export default function App() {
  const [identity, setIdentity] = useState<{ nickname: string; avatarIndex: number } | null>(null);

  const handleJoin = (nickname: string, avatarIndex: number) => {
    setIdentity({ nickname, avatarIndex });
    socket.connect(); // connect only after the user has chosen a name
  };

  if (!identity) {
    return <NicknameScreen onJoin={handleJoin} />;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#2e1508]">
      <GameCanvas nickname={identity.nickname} avatarIndex={identity.avatarIndex} />

      {/* ── Top HUD bar ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-[#1a0e05]/70 backdrop-blur-sm border-b border-[#6b3a18]/40 pointer-events-none select-none">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏠</span>
          <span className="text-[#f6c96b] font-black text-sm tracking-wide">Jaxxx Hangout</span>
        </div>
        <div className="text-[#c8813a]/60 text-xs">WASD / Arrow keys to move</div>
        <div className="text-[#f6c96b]/70 text-xs font-semibold">{identity.nickname}</div>
      </div>

      <VoiceControls />
    </div>
  );
}
