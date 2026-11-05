import React from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, Repeat, Disc3 } from 'lucide-react';
import { useAudio } from '../context/AudioContext.tsx';
import { playPopSound } from '../utils/audioEffects.ts';

interface BottomPlayerBarProps {
  onOpenSongPage: () => void;
  currentView: string;
}

export const BottomPlayerBar: React.FC<BottomPlayerBarProps> = ({
  onOpenSongPage,
  currentView,
}) => {
  const {
    activeTrack,
    isPlaying,
    volume,
    isLooping,
    currentTime,
    duration,
    togglePlayPause,
    setVolume,
    toggleLoop,
    fastForward,
    rewind,
    seekTo,
  } = useAudio();

  // If on song page or no active track, hide bottom bar
  if (!activeTrack || currentView === 'song') return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#F2ECE1]/95 dark:bg-[#1E1916]/95 backdrop-blur-md border-t border-[#E2D7C8] dark:border-[#3D332C] shadow-lg animate-fade-in select-none">
      {/* Top thin progress bar */}
      <div
        onClick={(e) => {
          if (duration <= 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = (e.clientX - rect.left) / rect.width;
          seekTo(pos * duration);
        }}
        className="w-full h-1.5 bg-[#E2D7C8] dark:bg-[#3D332C] cursor-pointer"
      >
        <div
          className="h-full bg-[#B5734C] transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Track Info & Cassette icon (Clickable to open song page) */}
        <div
          onClick={() => {
            playPopSound();
            onOpenSongPage();
          }}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[#E2D7C8] border border-[#B5734C]">
            <img
              src={activeTrack.thumbnailUrl}
              alt={activeTrack.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Disc3 className="w-5 h-5 text-white animate-spin-tape-fast" />
              </div>
            )}
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#3E2F26] dark:text-[#F3EDE2] group-hover:text-[#B5734C] transition-colors truncate max-w-[140px] sm:max-w-xs">
              {activeTrack.title}
            </h4>
            <p className="text-[11px] text-[#8C7564] dark:text-[#A8988A] truncate max-w-[120px] sm:max-w-xs">
              {activeTrack.authorName}
            </p>
          </div>
        </div>

        {/* Center: Play Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => rewind(10)}
            className="p-1.5 rounded-lg text-[#5A4538] dark:text-[#D5C8B8] hover:bg-[#EADDCB] dark:hover:bg-[#382D25] hidden sm:block"
            title="Rewind 10s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlayPause}
            className="p-2.5 rounded-xl bg-[#B5734C] hover:bg-[#9E603B] text-white shadow-md transform active:scale-95 transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => fastForward(10)}
            className="p-1.5 rounded-lg text-[#5A4538] dark:text-[#D5C8B8] hover:bg-[#EADDCB] dark:hover:bg-[#382D25] hidden sm:block"
            title="Fast Forward 10s"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleLoop}
            className={`p-1.5 rounded-lg transition-colors hidden md:block ${
              isLooping
                ? 'text-[#B5734C] bg-[#EADDCB] dark:bg-[#382D25]'
                : 'text-[#8C7564] hover:text-[#5A4538]'
            }`}
            title={isLooping ? 'Loop active' : 'Loop off'}
          >
            <Repeat className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono text-[#8C7564] hidden lg:inline">
            {formatTime(currentTime)} / {formatTime(duration || activeTrack.duration)}
          </span>
        </div>

        {/* Right: Volume slider */}
        <div className="flex items-center gap-2 max-w-[120px] sm:max-w-[150px]">
          <Volume2 className="w-4 h-4 text-[#8C7564] shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full accent-[#B5734C] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
