/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music, Sparkles } from 'lucide-react';

interface BackgroundMusicProps {
  className?: string;
  showLabel?: boolean;
}

const STORAGE_KEY = 's88_bg_music_muted';

// Reliable low-volume lo-fi ambient track
const LOFI_TRACK_URL = 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3';
const FALLBACK_LOFI_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3';

export default function BackgroundMusic({ className = '', showLabel = true }: BackgroundMusicProps) {
  // Read initial mute state from localStorage (default: false / unmuted, or as stored)
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? saved === 'true' : false;
    } catch (e) {
      return false;
    }
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthCtxRef = useRef<AudioContext | null>(null);
  const synthIntervalRef = useRef<any>(null);

  // Initialize Audio
  useEffect(() => {
    const audio = new Audio(LOFI_TRACK_URL);
    audio.loop = true;
    audio.volume = 0.15; // persistent low-volume lo-fi ambient
    audioRef.current = audio;

    // Error fallback to secondary lo-fi track
    const handleError = () => {
      if (audio.src !== FALLBACK_LOFI_URL) {
        audio.src = FALLBACK_LOFI_URL;
        audio.load();
        if (!isMuted) {
          audio.play().catch(() => startSynthFallback());
        }
      } else {
        startSynthFallback();
      }
    };

    audio.addEventListener('error', handleError);

    // Initial play attempt if not muted
    if (!isMuted) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        // Autoplay blocked by browser policy -> wait for first user click anywhere on page
        const handleFirstInteraction = () => {
          if (audioRef.current && !isMuted) {
            audioRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(() => startSynthFallback());
          }
          window.removeEventListener('click', handleFirstInteraction);
          window.removeEventListener('keydown', handleFirstInteraction);
        };
        window.addEventListener('click', handleFirstInteraction);
        window.addEventListener('keydown', handleFirstInteraction);
      });
    } else {
      audio.pause();
      setIsPlaying(false);
    }

    return () => {
      audio.removeEventListener('error', handleError);
      audio.pause();
      stopSynthFallback();
    };
  }, []);

  // Sync mute/unmute changes and persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isMuted));
    } catch (e) {}

    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (isMuted) {
        audioRef.current.pause();
        setIsPlaying(false);
        stopSynthFallback();
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          // Fallback to Web Audio lo-fi synth if audio element blocked
          startSynthFallback();
        });
      }
    }
  }, [isMuted]);

  // Web Audio Synth Lo-Fi Chords fallback (Works 100% offline & browser-compliant)
  const startSynthFallback = () => {
    if (synthCtxRef.current || isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      synthCtxRef.current = ctx;

      const chords = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [196.00, 246.94, 293.66, 349.23]  // G7
      ];
      let step = 0;

      const playChord = () => {
        if (!synthCtxRef.current || synthCtxRef.current.state === 'closed') return;
        const now = ctx.currentTime;
        const freqs = chords[step % chords.length];
        step++;

        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);

          // Soft lowpass filter for lo-fi warmth
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(600, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.015, now + 0.5);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 4.0);
        });
      };

      playChord();
      synthIntervalRef.current = setInterval(playChord, 4000);
      setIsPlaying(true);
    } catch (e) {
      console.warn('Synth fallback error:', e);
    }
  };

  const stopSynthFallback = () => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    if (synthCtxRef.current) {
      synthCtxRef.current.close().catch(() => {});
      synthCtxRef.current = null;
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  return (
    <button
      onClick={toggleMute}
      type="button"
      className={`
        px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all duration-300 cursor-pointer flex items-center gap-2 select-none active:scale-95
        ${
          !isMuted
            ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:border-cyan-300'
            : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }
        ${className}
      `}
      title={isMuted ? 'Mở nhạc nền Lo-Fi' : 'Tắt nhạc nền Lo-Fi'}
    >
      {!isMuted ? (
        <>
          <div className="relative flex items-center justify-center">
            <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          {showLabel && (
            <span className="flex items-center gap-1">
              <span className="text-cyan-300 font-extrabold uppercase tracking-wider">LO-FI ON</span>
              <span className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 h-full bg-cyan-400 animate-[bounce_1s_infinite_100ms]" />
                <span className="w-0.5 h-2/3 bg-cyan-400 animate-[bounce_1s_infinite_300ms]" />
                <span className="w-0.5 h-4/5 bg-cyan-400 animate-[bounce_1s_infinite_200ms]" />
              </span>
            </span>
          )}
        </>
      ) : (
        <>
          <VolumeX className="w-4 h-4 text-slate-400" />
          {showLabel && <span className="uppercase tracking-wider text-slate-400 font-bold">LO-FI OFF</span>}
        </>
      )}
    </button>
  );
}
