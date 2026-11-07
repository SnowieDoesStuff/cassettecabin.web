import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Track } from '../types.ts';
import { playCassetteClick } from '../utils/audioEffects.ts';

interface AudioContextType {
  activeTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  previewTrackId: string | null;
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  setVolume: (val: number) => void;
  toggleLoop: () => void;
  fastForward: (secs?: number) => void;
  rewind: (secs?: number) => void;
  seekTo: (secs: number) => void;
  startPreview: (track: Track) => void;
  stopPreview: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Hover preview state
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);

  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Create main audio element
    const audio = new Audio();
    audio.volume = volume;
    audio.loop = isLooping;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (!audio.loop) {
        setIsPlaying(false);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    mainAudioRef.current = audio;

    // Create preview audio element
    const preview = new Audio();
    preview.volume = 0.45;
    previewAudioRef.current = preview;

    return () => {
      audio.pause();
      preview.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  // Update volume
  const setVolume = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (mainAudioRef.current) {
      mainAudioRef.current.volume = clamped;
    }
  };

  // Toggle loop
  const toggleLoop = () => {
    playCassetteClick();
    setIsLooping((prev) => {
      const next = !prev;
      if (mainAudioRef.current) {
        mainAudioRef.current.loop = next;
      }
      return next;
    });
  };

  // Play track
  const playTrack = (track: Track) => {
    stopPreview();
    playCassetteClick();

    if (activeTrack?.id === track.id && mainAudioRef.current) {
      if (isPlaying) {
        mainAudioRef.current.pause();
      } else {
        mainAudioRef.current.play().catch(() => {});
      }
      return;
    }

    setActiveTrack(track);
    if (mainAudioRef.current) {
      mainAudioRef.current.src = track.audioUrl;
      mainAudioRef.current.currentTime = 0;
      mainAudioRef.current.loop = isLooping;
      mainAudioRef.current.volume = volume;
      mainAudioRef.current.play().catch(() => {});
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    playCassetteClick();
    if (!mainAudioRef.current || !activeTrack) return;
    if (isPlaying) {
      mainAudioRef.current.pause();
    } else {
      mainAudioRef.current.play().catch(() => {});
    }
  };

  // Fast-forward
  const fastForward = (secs: number = 10) => {
    playCassetteClick();
    if (mainAudioRef.current) {
      mainAudioRef.current.currentTime = Math.min(
        mainAudioRef.current.duration || Infinity,
        mainAudioRef.current.currentTime + secs
      );
    }
  };

  // Rewind
  const rewind = (secs: number = 10) => {
    playCassetteClick();
    if (mainAudioRef.current) {
      mainAudioRef.current.currentTime = Math.max(0, mainAudioRef.current.currentTime - secs);
    }
  };

  // Seek
  const seekTo = (secs: number) => {
    if (mainAudioRef.current) {
      mainAudioRef.current.currentTime = secs;
      setCurrentTime(secs);
    }
  };

  // Hover Preview
  const startPreview = (track: Track) => {
    // If currently playing full track, avoid clashing unless preview is requested
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);

    // Short 120ms debounce so rapid mousing doesn't fire multiple previews
    previewTimeoutRef.current = setTimeout(() => {
      if (!previewAudioRef.current) return;
      setPreviewTrackId(track.id);
      previewAudioRef.current.src = track.audioUrl;
      previewAudioRef.current.currentTime = 5; // Start 5 seconds in for the good part
      previewAudioRef.current.volume = Math.min(0.5, volume);
      previewAudioRef.current.play().catch(() => {});
    }, 120);
  };

  const stopPreview = () => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    setPreviewTrackId(null);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
  };

  return (
    <AudioContext.Provider
      value={{
        activeTrack,
        isPlaying,
        volume,
        isLooping,
        currentTime,
        duration,
        previewTrackId,
        playTrack,
        togglePlayPause,
        setVolume,
        toggleLoop,
        fastForward,
        rewind,
        seekTo,
        startPreview,
        stopPreview,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
