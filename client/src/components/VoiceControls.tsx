import { useState } from 'react';
import { voiceChat } from '../game/network/VoiceChat';

type VoiceState = 'idle' | 'active' | 'muted';

export function VoiceControls() {
  const [state, setState] = useState<VoiceState>('idle');

  const enableVoice = async () => {
    await voiceChat.init();
    setState(voiceChat.isReady ? 'active' : 'idle');
  };

  const toggleMute = () => {
    setState(voiceChat.toggleMute() ? 'muted' : 'active');
  };

  if (state === 'idle') {
    return (
      <button
        onClick={enableVoice}
        className="absolute bottom-4 right-4 flex items-center gap-2 bg-[#2e1508]/80 hover:bg-[#3b1f0a]/90 border border-[#6b3a18]/60 text-[#f6c96b] text-sm px-4 py-2 rounded-full backdrop-blur transition-colors shadow-lg"
      >
        <span>🎤</span>
        <span>Enable Voice</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleMute}
      className={`absolute bottom-4 right-4 flex items-center gap-2 text-sm px-4 py-2 rounded-full backdrop-blur transition-colors shadow-lg border ${
        state === 'muted'
          ? 'bg-red-900/80 hover:bg-red-800/90 border-red-700/60 text-red-200'
          : 'bg-[#2e1508]/80 hover:bg-[#3b1f0a]/90 border-[#f6c96b]/40 text-[#f6c96b]'
      }`}
    >
      <span>{state === 'muted' ? '🔇' : '🎙️'}</span>
      <span>{state === 'muted' ? 'Unmute' : 'Live'}</span>
    </button>
  );
}
