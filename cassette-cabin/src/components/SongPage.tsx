import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Repeat,
  Volume2,
  VolumeX,
  ListPlus,
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  Send,
  User as UserIcon,
  Disc3,
  Calendar,
} from 'lucide-react';
import { Track, Comment, User } from '../types.ts';
import { useAudio } from '../context/AudioContext.tsx';
import { CassetteSvg } from './CassetteSvg.tsx';
import { playPopSound, playCassetteClick } from '../utils/audioEffects.ts';

interface SongPageProps {
  track: Track;
  currentUser: User | null;
  onBack: () => void;
  onOpenPlaylistModal: (trackId: string) => void;
  onSelectUser: (userId: string) => void;
  onRequireAuth: () => void;
}

export const SongPage: React.FC<SongPageProps> = ({
  track,
  currentUser,
  onBack,
  onOpenPlaylistModal,
  onSelectUser,
  onRequireAuth,
}) => {
  const {
    activeTrack,
    isPlaying,
    volume,
    isLooping,
    currentTime,
    duration,
    playTrack,
    togglePlayPause,
    setVolume,
    toggleLoop,
    fastForward,
    rewind,
    seekTo,
  } = useAudio();

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCurrentTrackPlaying = activeTrack?.id === track.id && isPlaying;

  // Fetch comments
  useEffect(() => {
    fetch(`/api/tracks/${track.id}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (data.comments) setComments(data.comments);
      })
      .catch(() => {});
  }, [track.id]);

  const handlePlayToggle = () => {
    playCassetteClick();
    if (activeTrack?.id !== track.id) {
      playTrack(track);
    } else {
      togglePlayPause();
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!commentInput.trim()) return;

    playPopSound(1.2);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tracks/${track.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          content: commentInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setCommentInput('');
      }
    } catch {
      // Error
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Back Navigation & Add to Playlist */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            playPopSound(1.1);
            onBack();
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F2ECE1] dark:bg-[#2A231E] hover:bg-[#EADDCB] dark:hover:bg-[#382D25] text-[#5A4538] dark:text-[#D5C8B8] border border-[#E2D7C8] dark:border-[#3D332C] font-bold text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Rack</span>
        </button>

        <button
          onClick={() => {
            playPopSound(1.2);
            onOpenPlaylistModal(track.id);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EADDCB] dark:bg-[#382D25] hover:bg-[#E2D2BC] dark:hover:bg-[#47392E] text-[#4A3B32] dark:text-[#F3EDE2] border border-[#D5C2AB] dark:border-[#4E3F35] font-bold text-sm shadow-sm transition-all"
        >
          <ListPlus className="w-4 h-4 text-[#B5734C]" />
          <span>Add to Playlist</span>
        </button>
      </div>

      {/* Main Tape Deck Player Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#F5EFE6] dark:bg-[#261F1B] border-2 border-[#E2D7C8] dark:border-[#3D332C] shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left Column: Visual Cassette Deck */}
          <div className="flex flex-col items-center justify-center">
            <CassetteSvg
              title={track.title}
              artist={track.authorName}
              isPlaying={isCurrentTrackPlaying}
              className="w-full max-w-sm drop-shadow-xl"
            />
          </div>

          {/* Right Column: Player Controls & Scrubbing */}
          <div className="flex flex-col justify-between h-full space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#8C7564] dark:text-[#A8988A] mb-1">
                <span>Side A · Stereo Hi-Fi</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(track.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#3E2F26] dark:text-[#F3EDE2] tracking-tight">
                {track.title}
              </h1>

              {/* Author clickable link */}
              <button
                onClick={() => {
                  playPopSound();
                  onSelectUser(track.userId);
                }}
                className="flex items-center gap-2 mt-2 hover:opacity-80 transition-opacity"
              >
                <img
                  src={track.authorAvatar}
                  alt={track.authorName}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-[#B5734C]"
                />
                <span className="text-sm font-bold text-[#B5734C]">
                  {track.authorName}
                </span>
                <span className="text-xs text-[#8C7564] dark:text-[#A8988A]">
                  (@{track.authorUsername})
                </span>
              </button>
            </div>

            {/* Scrubber Progress Bar */}
            <div className="space-y-1.5">
              <div
                onClick={(e) => {
                  if (duration <= 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  seekTo(pos * duration);
                }}
                className="relative w-full h-3 bg-[#E2D7C8] dark:bg-[#3D332C] rounded-full cursor-pointer overflow-hidden"
              >
                <div
                  className="h-full bg-[#B5734C] transition-all duration-100 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-[#8C7564] dark:text-[#A8988A]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration || track.duration)}</span>
              </div>
            </div>

            {/* Transport Mechanical Buttons: Rewind, Play/Pause, Fast Forward, Loop */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {/* Rewind 10s */}
              <button
                onClick={() => rewind(10)}
                className="p-3 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] hover:bg-[#EADDCB] dark:hover:bg-[#382D25] text-[#5A4538] dark:text-[#D5C8B8] border border-[#E2D7C8] dark:border-[#3D332C] shadow-sm transform active:scale-95 transition-all"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Main Play / Pause Button */}
              <button
                onClick={handlePlayToggle}
                className="flex-1 max-w-[140px] flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#B5734C] hover:bg-[#9E603B] text-white font-bold shadow-md transform active:scale-95 transition-all"
                title={isCurrentTrackPlaying ? 'Pause' : 'Play'}
              >
                {isCurrentTrackPlaying ? (
                  <>
                    <Pause className="w-6 h-6 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                    <span>Play</span>
                  </>
                )}
              </button>

              {/* Fast Forward 10s */}
              <button
                onClick={() => fastForward(10)}
                className="p-3 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] hover:bg-[#EADDCB] dark:hover:bg-[#382D25] text-[#5A4538] dark:text-[#D5C8B8] border border-[#E2D7C8] dark:border-[#3D332C] shadow-sm transform active:scale-95 transition-all"
                title="Fast-forward 10 seconds"
              >
                <RotateCw className="w-5 h-5" />
              </button>

              {/* Loop Toggle */}
              <button
                onClick={toggleLoop}
                className={`p-3 rounded-2xl border transition-all ${
                  isLooping
                    ? 'bg-[#B5734C] text-white border-[#B5734C] shadow-inner'
                    : 'bg-[#F2ECE1] dark:bg-[#2A231E] hover:bg-[#EADDCB] dark:hover:bg-[#382D25] text-[#5A4538] dark:text-[#D5C8B8] border-[#E2D7C8] dark:border-[#3D332C]'
                }`}
                title={isLooping ? 'Looping enabled' : 'Loop disabled'}
              >
                <Repeat className="w-5 h-5" />
              </button>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                className="text-[#8C7564] dark:text-[#A8988A] hover:text-[#B5734C]"
              >
                {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-[#B5734C] cursor-pointer"
              />
              <span className="text-xs font-mono text-[#8C7564] dark:text-[#A8988A] w-8 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Links & Cover Artwork Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Artwork Card */}
        <div className="p-5 rounded-3xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C]">
          <h3 className="text-sm font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-3">
            Tape J-Card Artwork
          </h3>
          <div className="rounded-2xl overflow-hidden aspect-square bg-[#E2D7C8]">
            <img
              src={track.thumbnailUrl}
              alt={track.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Story & Liner Notes */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#3E2F26] dark:text-[#F3EDE2] mb-2">
              About This Tape
            </h3>
            <p className="text-sm text-[#6D5A4D] dark:text-[#C4B4A4] whitespace-pre-wrap leading-relaxed">
              {track.description}
            </p>
          </div>

          {/* External Links */}
          {track.links && track.links.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[#E2D7C8] dark:border-[#3D332C]">
              <span className="text-xs font-bold text-[#8C7564] dark:text-[#A8988A] block mb-2">
                External Links & Bandcamp:
              </span>
              <div className="flex flex-wrap gap-2">
                {track.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.startsWith('http') ? link : `https://${link}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#EADDCB] dark:bg-[#382D25] text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] hover:text-[#B5734C] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{link.replace(/^https?:\/\/(www\.)?/, '').slice(0, 30)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Comments Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C]">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle className="w-5 h-5 text-[#B5734C]" />
          <h3 className="text-xl font-bold text-[#3E2F26] dark:text-[#F3EDE2]">
            Cabin Comments ({comments.length})
          </h3>
        </div>

        {/* Comment input form */}
        {currentUser ? (
          <form onSubmit={handleCommentSubmit} className="mb-8">
            <div className="flex items-start gap-3">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border border-[#B5734C]"
              />
              <div className="flex-1">
                <textarea
                  rows={2}
                  placeholder="Leave a cozy note on this tape..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-[#FFFDF9] dark:bg-[#1E1916] border border-[#E2D7C8] dark:border-[#3D332C] text-[#4A3B32] dark:text-[#EAE0D5] placeholder-[#9C8675] text-sm focus:outline-none focus:ring-2 focus:ring-[#B5734C]/50 transition-all resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !commentInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B5734C] hover:bg-[#9E603B] disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post Comment</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-4 rounded-2xl bg-[#EADDCB]/60 dark:bg-[#382D25]/60 text-center">
            <p className="text-sm text-[#7D6656] dark:text-[#BFAF9F] mb-3">
              Sign in with your Google email to leave a comment on this song.
            </p>
            <button
              onClick={() => {
                playPopSound();
                onRequireAuth();
              }}
              className="px-4 py-1.5 rounded-xl bg-[#B5734C] text-white text-xs font-bold shadow-sm"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-center text-[#8C7564] dark:text-[#A8988A] py-6">
              No comments yet. Be the first to share your thoughts on this tape!
            </p>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#1E1916] border border-[#E2D7C8] dark:border-[#3D332C] flex items-start gap-3"
              >
                <button
                  onClick={() => {
                    playPopSound();
                    onSelectUser(c.userId);
                  }}
                >
                  <img
                    src={c.authorAvatar}
                    alt={c.authorName}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-[#B5734C]/40"
                  />
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        playPopSound();
                        onSelectUser(c.userId);
                      }}
                      className="text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] hover:text-[#B5734C]"
                    >
                      {c.authorName}
                    </button>
                    <span className="text-[11px] text-[#9C8675] dark:text-[#8C7A6D]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-[#6D5A4D] dark:text-[#C4B4A4] mt-1 whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
