import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface AvatarFrameContainerProps {
  avatarUrl?: string;
  frameUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  avatarClassName?: string;
  onClick?: () => void;
  showSparkles?: boolean;
  isEquipped?: boolean;
  altName?: string;
}

const sizeMap = {
  xs: { container: 'w-7 h-7', avatar: 'w-5 h-5', frameInset: '-inset-1', frameSize: 'w-[calc(100%+8px)] h-[calc(100%+8px)]' },
  sm: { container: 'w-9 h-9', avatar: 'w-7 h-7', frameInset: '-inset-1', frameSize: 'w-[calc(100%+10px)] h-[calc(100%+10px)]' },
  md: { container: 'w-11 h-11', avatar: 'w-9 h-9', frameInset: '-inset-1.5', frameSize: 'w-[calc(100%+12px)] h-[calc(100%+12px)]' },
  lg: { container: 'w-14 h-14', avatar: 'w-11 h-11', frameInset: '-inset-2', frameSize: 'w-[calc(100%+16px)] h-[calc(100%+16px)]' },
  xl: { container: 'w-16 h-16', avatar: 'w-13 h-13', frameInset: '-inset-2.5', frameSize: 'w-[calc(100%+20px)] h-[calc(100%+20px)]' },
  '2xl': { container: 'w-20 h-20', avatar: 'w-16 h-16', frameInset: '-inset-3', frameSize: 'w-[calc(100%+24px)] h-[calc(100%+24px)]' },
};

export const AvatarFrameContainer: React.FC<AvatarFrameContainerProps> = ({
  avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  frameUrl,
  size = 'md',
  className = '',
  avatarClassName = '',
  onClick,
  showSparkles = true,
  isEquipped = false,
  altName = 'Avatar',
}) => {
  const [isHolding, setIsHolding] = useState(false);
  const dims = sizeMap[size] || sizeMap.md;

  const handleTouchStart = () => setIsHolding(true);
  const handleTouchEnd = () => setIsHolding(false);

  const renderFrameOverlay = () => {
    if (!frameUrl) return null;

    if (frameUrl.startsWith('http')) {
      return (
        <img
          src={frameUrl}
          alt="Frame"
          className={`absolute ${dims.frameInset} ${dims.frameSize} object-contain pointer-events-none z-20 transition-all duration-300 filter drop-shadow-[0_0_8px_rgba(255,215,0,0.7)] group-hover:drop-shadow-[0_0_15px_rgba(255,215,0,0.9)]`}
          referrerPolicy="no-referrer"
        />
      );
    }

    if (frameUrl === 'gold-ring') {
      return (
        <div className={`absolute ${dims.frameInset} rounded-full border-2 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] pointer-events-none z-20 animate-pulse`} />
      );
    }

    if (frameUrl === 'neon-ring') {
      return (
        <div className={`absolute ${dims.frameInset} rounded-full border-2 border-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.9)] pointer-events-none z-20`} />
      );
    }

    if (frameUrl === 'cyber-ring') {
      return (
        <div className={`absolute ${dims.frameInset} rounded-full border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)] pointer-events-none z-20`} />
      );
    }

    return null;
  };

  return (
    <div
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={() => setIsHolding(true)}
      onMouseUp={() => setIsHolding(false)}
      onMouseLeave={() => setIsHolding(false)}
      className={`group relative inline-flex items-center justify-center rounded-full shrink-0 avatar-frame-hover-container ${
        onClick ? 'cursor-pointer' : ''
      } ${isHolding ? 'is-holding' : ''} ${dims.container} ${className}`}
    >
      {/* Avatar Image container */}
      <div className={`${dims.avatar} rounded-full overflow-hidden bg-black/60 border border-white/20 flex items-center justify-center relative z-10 shadow-md ${avatarClassName}`}>
        <img
          src={avatarUrl}
          alt={altName}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
          }}
        />
      </div>

      {/* Frame Graphic Overlay */}
      {renderFrameOverlay()}

      {/* Equipped Badge Checkmark if needed */}
      {isEquipped && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-black font-black text-[9px] rounded-full flex items-center justify-center z-30 shadow-md border border-black">
          ✓
        </span>
      )}

      {/* Lấp lánh (Sparkle) Particles on hover / press-hold */}
      {showSparkles && (
        <div className="absolute -inset-2 pointer-events-none z-30 overflow-visible">
          {/* Sparkle 1: Top-Right Golden Star */}
          <span className="sparkle-particle sparkle-particle-1 text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]">
            ✨
          </span>
          {/* Sparkle 2: Bottom-Left Cyan Star */}
          <span className="sparkle-particle sparkle-particle-2 text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">
            ✦
          </span>
          {/* Sparkle 3: Mid-Left Pink Star */}
          <span className="sparkle-particle sparkle-particle-3 text-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.9)]">
            🌟
          </span>
          {/* Sparkle 4: Mid-Right Amber Star */}
          <span className="sparkle-particle sparkle-particle-4 text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.9)] text-[10px]">
            ✨
          </span>
        </div>
      )}
    </div>
  );
};
