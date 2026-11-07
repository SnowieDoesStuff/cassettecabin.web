import React, { useState } from 'react';
import { X, ListPlus, Check, Globe, Lock, AlertCircle } from 'lucide-react';
import { Playlist, User } from '../types.ts';
import { playPopSound } from '../utils/audioEffects.ts';

interface PlaylistModalProps {
  trackId: string | null;
  currentUser: User | null;
  playlists: Playlist[];
  isOpen: boolean;
  onClose: () => void;
  onPlaylistCreated: (playlist: Playlist) => void;
  onUpdatePlaylist: (playlistId: string, trackId: string, action: 'add' | 'remove') => void;
  onRequireAuth: () => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  trackId,
  currentUser,
  playlists,
  isOpen,
  onClose,
  onPlaylistCreated,
  onUpdatePlaylist,
  onRequireAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'pick' | 'create'>('pick');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [tagsInput, setTagsInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-md rounded-3xl bg-[#FBF8F3] dark:bg-[#201A16] border-2 border-[#E2D7C8] dark:border-[#3D332C] p-6 text-center shadow-xl">
          <button
            onClick={() => {
              playPopSound();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-xl text-[#7D6656]"
          >
            <X className="w-5 h-5" />
          </button>
          <ListPlus className="w-10 h-10 mx-auto mb-3 text-[#B5734C]" />
          <h3 className="text-xl font-bold text-[#3E2F26] dark:text-[#F3EDE2] mb-2">
            Sign In to Make Playlists
          </h3>
          <p className="text-xs text-[#7D6656] dark:text-[#BFAF9F] mb-6">
            Log in with your Google email to curate custom cassette mixtapes.
          </p>
          <button
            onClick={() => {
              playPopSound();
              onClose();
              onRequireAuth();
            }}
            className="px-5 py-2.5 rounded-2xl bg-[#B5734C] text-white font-bold text-sm shadow-md"
          >
            Sign In Now
          </button>
        </div>
      </div>
    );
  }

  const userPlaylists = playlists.filter((p) => p.userId === currentUser.id);

  // If user has zero playlists, automatically default to the 'create' tab
  const showCreateFirst = userPlaylists.length === 0 || activeTab === 'create';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Playlist name is required');
      return;
    }
    if (description.length > 300) {
      setError('Description cannot exceed 300 characters');
      return;
    }

    setIsSubmitting(true);
    playPopSound(1.2);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          name: name.trim(),
          description: description.trim(),
          isPublic,
          tags: parsedTags,
          trackIds: trackId ? [trackId] : [],
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create playlist');
      }

      onPlaylistCreated(data.playlist);
      setName('');
      setDescription('');
      setTagsInput('');
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error creating playlist');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[#FBF8F3] dark:bg-[#201A16] border-2 border-[#E2D7C8] dark:border-[#3D332C] shadow-2xl p-6">
        <button
          onClick={() => {
            playPopSound();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#F2ECE1] dark:bg-[#2A231E] text-[#7D6656] hover:text-[#4A3B32] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-[#3E2F26] dark:text-[#F3EDE2] mb-1">
          {userPlaylists.length === 0 ? 'Create Your First Playlist' : 'Add to Playlist'}
        </h3>
        <p className="text-xs text-[#7D6656] dark:text-[#BFAF9F] mb-4">
          Curate tape collections to share on your profile or keep in private reserves.
        </p>

        {userPlaylists.length > 0 && (
          <div className="flex gap-2 mb-4 p-1 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E]">
            <button
              onClick={() => {
                playPopSound();
                setActiveTab('pick');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !showCreateFirst
                  ? 'bg-[#B5734C] text-white shadow-sm'
                  : 'text-[#6D5A4D] dark:text-[#C4B4A4]'
              }`}
            >
              Choose Existing
            </button>
            <button
              onClick={() => {
                playPopSound();
                setActiveTab('create');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                showCreateFirst
                  ? 'bg-[#B5734C] text-white shadow-sm'
                  : 'text-[#6D5A4D] dark:text-[#C4B4A4]'
              }`}
            >
              + Create New
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* View 1: Pick Existing Playlists */}
        {!showCreateFirst ? (
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1">
            {userPlaylists.map((pl) => {
              const containsTrack = trackId ? pl.trackIds.includes(trackId) : false;
              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    if (trackId) {
                      playPopSound();
                      onUpdatePlaylist(pl.id, trackId, containsTrack ? 'remove' : 'add');
                    }
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    containsTrack
                      ? 'bg-[#EADDCB] dark:bg-[#382D25] border-[#B5734C]'
                      : 'bg-[#F2ECE1] dark:bg-[#2A231E] border-[#E2D7C8] dark:border-[#3D332C] hover:border-[#B5734C]/50'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-[#3E2F26] dark:text-[#F3EDE2]">
                      {pl.name}
                    </h4>
                    <span className="text-[11px] text-[#7D6656] dark:text-[#BFAF9F]">
                      {pl.trackIds.length} tracks · {pl.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                      containsTrack
                        ? 'bg-[#B5734C] border-[#B5734C] text-white'
                        : 'border-[#9C8675]'
                    }`}
                  >
                    {containsTrack && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* View 2: Create New Playlist */
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
                Playlist Name
              </label>
              <input
                type="text"
                placeholder="e.g. Midnight Campfire Loops"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-sm text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-2 focus:ring-[#B5734C]/50"
                required
              />
            </div>

            {/* Visibility toggle: Public or Private */}
            <div>
              <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
                Visibility
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    isPublic
                      ? 'bg-[#B5734C] text-white border-[#B5734C]'
                      : 'bg-[#F2ECE1] dark:bg-[#2A231E] text-[#5A4538] dark:text-[#D5C8B8] border-[#E2D7C8] dark:border-[#3D332C]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public (Shown on Profile)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    !isPublic
                      ? 'bg-[#B5734C] text-white border-[#B5734C]'
                      : 'bg-[#F2ECE1] dark:bg-[#2A231E] text-[#5A4538] dark:text-[#D5C8B8] border-[#E2D7C8] dark:border-[#3D332C]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private</span>
                </button>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
                Tags <span className="text-gray-400 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="lofi, acoustic, rainy, sleep"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
              />
            </div>

            {/* Description (300 characters maximum) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8]">
                  Description
                </label>
                <span className="text-[11px] font-mono text-[#8C7564]">
                  {description.length} / 300
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={300}
                placeholder="Describe the mood, instruments, or theme of this mixtape..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-1 focus:ring-[#B5734C] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onClose()}
                className="px-4 py-2 rounded-xl bg-[#EADDCB] dark:bg-[#382D25] text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8]"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#B5734C] hover:bg-[#9E603B] disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all"
              >
                Create Playlist
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
