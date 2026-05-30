import { useState } from 'react';
import { AVATARS } from '../game/avatars';

interface Props {
  onJoin: (nickname: string, avatarIndex: number) => void;
}

export function NicknameScreen({ onJoin }: Props) {
  const [name, setName]         = useState('');
  const [selected, setSelected] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onJoin(name.trim() || 'Guest', selected);
  };

  return (
    <div className="relative flex items-center justify-center w-full h-screen overflow-hidden bg-[#1a0e05]">

      {/* ── Ambient background layers ── */}
      {/* Warm sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2d1a08] via-[#1a0e05] to-[#0d0702]" />

      {/* Twinkling stars */}
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width:     Math.random() * 2 + 1 + 'px',
            height:    Math.random() * 2 + 1 + 'px',
            top:       Math.random() * 55 + '%',
            left:      Math.random() * 100 + '%',
            opacity:   Math.random() * 0.6 + 0.2,
          }}
        />
      ))}

      {/* House silhouette */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] pointer-events-none select-none">
        {/* Chimney */}
        <div className="absolute bottom-[180px] left-[108px] w-[28px] h-[50px] bg-[#3b1f0a] rounded-sm" />
        {/* Smoke puffs */}
        <div className="absolute bottom-[228px] left-[114px] w-[16px] h-[16px] rounded-full bg-[#8b6845]/30 animate-pulse" />
        <div className="absolute bottom-[240px] left-[110px] w-[12px] h-[12px] rounded-full bg-[#8b6845]/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
        {/* Roof */}
        <svg viewBox="0 0 600 200" className="w-full" fill="none">
          <polygon points="60,200 300,20 540,200" fill="#2a1505" />
          <polygon points="80,200 300,40 520,200" fill="#3b1f0a" />
          {/* Roof ridge highlight */}
          <line x1="300" y1="22" x2="300" y2="22" stroke="#c8813a" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        {/* House body */}
        <div className="relative w-full h-[180px] bg-[#2e1508] border-t-4 border-[#6b3a18] flex items-end justify-center">
          {/* Windows */}
          <div className="absolute top-[24px] left-[80px] w-[70px] h-[70px] bg-[#f6c96b]/20 border-4 border-[#6b3a18] rounded-sm grid grid-cols-2 gap-[3px] p-[4px]">
            <div className="bg-[#f6c96b]/40 rounded-sm" /><div className="bg-[#f6c96b]/30 rounded-sm" />
            <div className="bg-[#f6c96b]/30 rounded-sm" /><div className="bg-[#f6c96b]/40 rounded-sm" />
          </div>
          <div className="absolute top-[24px] right-[80px] w-[70px] h-[70px] bg-[#f6c96b]/20 border-4 border-[#6b3a18] rounded-sm grid grid-cols-2 gap-[3px] p-[4px]">
            <div className="bg-[#f6c96b]/40 rounded-sm" /><div className="bg-[#f6c96b]/30 rounded-sm" />
            <div className="bg-[#f6c96b]/30 rounded-sm" /><div className="bg-[#f6c96b]/40 rounded-sm" />
          </div>
          {/* Door */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60px] h-[90px] bg-[#6b3a18] border-2 border-[#3b1f0a] rounded-t-full flex flex-col items-center justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#f6c96b]" />
            <div className="w-[2px] h-[40px] bg-[#3b1f0a]/40" />
          </div>
          {/* Door light */}
          <div className="absolute bottom-[85px] left-1/2 -translate-x-1/2 w-[100px] h-[20px] bg-[#f6c96b]/10 rounded-full blur-md" />
          {/* Potted plants */}
          <div className="absolute bottom-0 left-[calc(50%-70px)] text-2xl">🪴</div>
          <div className="absolute bottom-0 right-[calc(50%-70px)] text-2xl">🪴</div>
        </div>
        {/* Ground */}
        <div className="w-full h-[24px] bg-[#1a0e05]" />
      </div>

      {/* ── Card ── */}
      <div className="relative z-10 w-[460px] mx-4 bg-[#1e1008]/90 backdrop-blur-md border border-[#6b3a18]/50 rounded-3xl shadow-2xl shadow-black/60 flex flex-col gap-5 p-8">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#f6c96b] via-[#e8a83e] to-[#f6c96b] drop-shadow-lg">
            Jaxxx Hangout
          </h1>
          <p className="text-[#c8813a]/80 text-sm mt-1 font-medium">
            🏡 Your cozy family hangout spot
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#6b3a18] to-transparent" />

        {/* Avatar picker */}
        <div>
          <p className="text-[#c8813a]/70 text-xs uppercase tracking-widest mb-2">Choose your character</p>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map((av, i) => (
              <button
                key={i}
                type="button"
                title={av.name}
                onClick={() => setSelected(i)}
                className={`rounded-xl overflow-hidden border-2 bg-[#2e1508]/60 transition-all duration-150 p-1 ${
                  selected === i
                    ? 'border-[#f6c96b] scale-105 shadow-md shadow-[#f6c96b]/30'
                    : 'border-[#6b3a18]/40 hover:border-[#c8813a]/60'
                }`}
              >
                <img
                  src={av.url}
                  alt={av.name}
                  className="w-full h-16 object-contain"
                  draggable={false}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-[#f6c96b] text-xs mt-2 h-4 font-semibold">
            {AVATARS[selected].name}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#6b3a18] to-transparent" />

        {/* Nickname + join */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Enter your nickname…"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            autoFocus
            className="px-4 py-2.5 rounded-xl bg-[#2e1508]/80 border border-[#6b3a18]/60 text-[#f6e8c8] placeholder-[#6b3a18] outline-none focus:ring-2 focus:ring-[#f6c96b]/50 focus:border-[#f6c96b]/50 transition"
          />
          <button
            type="submit"
            className="py-2.5 bg-gradient-to-r from-[#c8813a] to-[#e8a83e] hover:from-[#e8a83e] hover:to-[#f6c96b] text-[#1a0e05] font-bold rounded-xl transition-all shadow-md shadow-[#c8813a]/30 active:scale-95"
          >
            Enter the Hangout →
          </button>
        </form>
      </div>
    </div>
  );
}
