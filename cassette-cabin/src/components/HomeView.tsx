import React, { useState } from 'react';
import { Search, Disc3, Sparkles, PlusCircle, Volume2, Clock, User as UserIcon } from 'lucide-react';
import { Track } from '../types.ts';
import { useAudio } from '../context/AudioContext.tsx';
import { playPopSound } from '../utils/audioEffects.ts';

interface HomeViewProps {
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
  onOpenCreate: () => void;
  onSelectUser: (userId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  tracks,
  onSelectTrack,
  onOpenCreate,
  onSelectUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { startPreview, stopPreview, previewTrackId, activeTrack, isPlaying } = useAudio();

  const filteredTracks = tracks.filter((track) => {
    const q = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(q) ||
      track.authorName.toLowerCase().includes(q) ||
      track.description.toLowerCase().includes(q)
    );
  });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero Welcome Banner */}
      <div className="relative mb-10 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#F5EFE6] via-[#EFE6DA] to-[#F5EFE6] dark:from-[#2B231D] dark:via-[#362C24] dark:to-[#2B231D] border border-[#E2D7C8] dark:border-[#3D332C] shadow-sm overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8DCcb] dark:bg-[#42362C] text-[#8C5D3D] dark:text-[#E8C4A2] text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cozy Tape Haven</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#3E2F26] dark:text-[#F3EDE2] tracking-tight mb-2">
            Welcome to Cassette Cabin
          </h1>
          <p className="text-[#6D5A4D] dark:text-[#C4B4A4] text-base sm:text-lg mb-6">
            A quiet sanctuary for handmade music, warm tape saturation, and gentle conversations.
            Hover over any cassette to preview its song, or click to enter the listening room.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                playPopSound(1.2);
                onOpenCreate();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#B5734C] hover:bg-[#9E603B] text-white font-bold text-sm shadow-md transition-all transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Upload Your Music</span>
            </button>
          </div>
        </div>

        {/* Decorative Tape Reel Background Motif */}
        <div className="absolute -right-8 -bottom-10 opacity-15 pointer-events-none hidden sm:block">
          <Disc3 className="w-64 h-64 text-[#8C5D3D] animate-spin-tape" />
        </div>
      </div>

      {/* Search Bar & Filter Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#3E2F26] dark:text-[#F3EDE2]">
            Community Tape Rack
          </h2>
          <p className="text-sm text-[#7D6656] dark:text-[#BFAF9F]">
            {tracks.length} {tracks.length === 1 ? 'song' : 'songs'} in the cabin collection
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C8675] dark:text-[#8C7A6D]" />
          <input
            type="text"
            placeholder="Search by title, artist, or vibe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-[#4A3B32] dark:text-[#EAE0D5] placeholder-[#9C8675] text-sm focus:outline-none focus:ring-2 focus:ring-[#B5734C]/50 transition-all"
          />
        </div>
      </div>

      {/* Songs Grid / Empty State */}
      {filteredTracks.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-[#F7F2EB] dark:bg-[#241E1A] border-2 border-dashed border-[#E2D7C8] dark:border-[#3D332C]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#EADDCB] dark:bg-[#382D25] flex items-center justify-center text-[#B5734C]">
            <Disc3 className="w-8 h-8 animate-spin-tape" />
          </div>
          <h3 className="text-xl font-bold text-[#3E2F26] dark:text-[#F3EDE2] mb-2">
            {tracks.length === 0 ? 'The Tape Rack is Empty!' : 'No Matching Songs Found'}
          </h3>
          <p className="max-w-md mx-auto text-sm text-[#7D6656] dark:text-[#BFAF9F] mb-6">
            {tracks.length === 0
              ? 'Be the first cabin creator to press Create and upload a song with custom artwork and audio.'
              : 'Try searching for something else or clear your search query.'}
          </p>
          {tracks.length === 0 ? (
            <button
              onClick={() => {
                playPopSound(1.2);
                onOpenCreate();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#B5734C] hover:bg-[#9E603B] text-white font-bold text-sm shadow-md transition-all transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Upload Your First Song</span>
            </button>
          ) : (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-[#EADDCB] dark:bg-[#382D25] text-[#4A3B32] dark:text-[#EAE0D5] font-bold text-sm"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTracks.map((track) => {
            const isHoverPreviewing = previewTrackId === track.id;
            const isCurrentPlaying = activeTrack?.id === track.id && isPlaying;

            return (
              <div
                key={track.id}
                onMouseEnter={() => startPreview(track)}
                onMouseLeave={stopPreview}
                onClick={() => {
                  playPopSound(1.1);
                  onSelectTrack(track);
                }}
                className={`group relative flex flex-col rounded-3xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] hover:border-[#B5734C]/50 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden transform hover:-translate-y-1 ${
                  isHoverPreviewing ? 'ring-2 ring-[#B5734C]/40' : ''
                }`}
              >
                {/* Thumbnail Header with Cassette Reel overlay */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#E2D7C8] dark:bg-[#1E1916]">
                  <img
                    src={track.thumbnailUrl}
                    alt={track.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Tape Spool Badge on Hover or Play */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1E1916]/80 backdrop-blur-sm text-white text-xs font-bold">
                    <Disc3
                      className={`w-4 h-4 text-[#D9822B] ${
                        isHoverPreviewing || isCurrentPlaying ? 'animate-spin-tape-fast' : ''
                      }`}
                    />
                    <span>
                      {isHoverPreviewing ? 'Previewing' : isCurrentPlaying ? 'Playing' : 'Hover to hear'}
                    </span>
                  </div>

                  {/* Duration Pill */}
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-black/60 text-white text-xs font-mono">
                    {formatDuration(track.duration)}
                  </div>
                </div>

                {/* Track Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#3E2F26] dark:text-[#F3EDE2] group-hover:text-[#B5734C] transition-colors truncate">
                      {track.title}
                    </h3>
                    <p className="text-sm text-[#7D6656] dark:text-[#BFAF9F] line-clamp-2 mt-1 mb-4">
                      {track.description}
                    </p>
                  </div>

                  {/* Author Row */}
                  <div className="pt-3 border-t border-[#E2D7C8]/70 dark:border-[#3D332C]/70 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playPopSound();
                        onSelectUser(track.userId);
                      }}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={track.authorAvatar}
                        alt={track.authorName}
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full object-cover border border-[#B5734C]/40"
                      />
                      <span className="text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8]">
                        {track.authorName}
                      </span>
                    </button>

                    <div className="flex items-center gap-1.5 text-xs text-[#8C7564] dark:text-[#A8988A]">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{track.plays} plays</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
