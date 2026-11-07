import React, { useState } from 'react';
import {
  Edit3,
  UserPlus,
  UserMinus,
  MessageSquare,
  Music,
  ListMusic,
  Disc3,
  Calendar,
  Lock,
  Globe,
  Sparkles,
} from 'lucide-react';
import { User, Track, Playlist } from '../types.ts';
import { playPopSound } from '../utils/audioEffects.ts';

interface ProfilePageProps {
  user: User;
  currentUser: User | null;
  tracks: Track[];
  playlists: Playlist[];
  onEditProfile: () => void;
  onSelectTrack: (track: Track) => void;
  onOpenMessage: (user: User) => void;
  onToggleFriend: (targetUserId: string) => void;
  onSelectPlaylist?: (playlist: Playlist) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  currentUser,
  tracks,
  playlists,
  onEditProfile,
  onSelectTrack,
  onOpenMessage,
  onToggleFriend,
  onSelectPlaylist,
}) => {
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists'>('tracks');

  const isOwnProfile = currentUser?.id === user.id;
  const isFriend = currentUser?.friends?.includes(user.id) || false;

  const userTracks = tracks.filter((t) => t.userId === user.id);
  // Show all playlists if own profile, or only public ones if viewing someone else
  const userPlaylists = playlists.filter(
    (p) => p.userId === user.id && (isOwnProfile || p.isPublic)
  );

  // Theme accents
  const getThemeClass = (t: string) => {
    switch (t) {
      case 'espresso-wood':
        return 'border-[#5A3E2D] bg-[#2A231E]/40';
      case 'sage-cabin':
        return 'border-[#557A55]/40 bg-[#E8EFE8]/40 dark:bg-[#202B20]/40';
      case 'cozy-peach':
        return 'border-[#E07A5F]/40 bg-[#FDF0E9]/40 dark:bg-[#33221C]/40';
      case 'lavender-mist':
        return 'border-[#7E6B9E]/40 bg-[#F2EFF8]/40 dark:bg-[#282236]/40';
      case 'warm-beige':
      default:
        return 'border-[#E2D7C8] bg-[#F2ECE1]/40 dark:bg-[#261F1B]/40';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile Header Card */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border-2 backdrop-blur-sm shadow-md transition-all mb-8 ${getThemeClass(
          user.theme
        )}`}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Online/Offline Dot */}
          <div className="relative shrink-0">
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              referrerPolicy="no-referrer"
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-[#FFFDF9] dark:border-[#1E1916] shadow-md bg-[#E2D7C8]"
            />
            {/* Green online dot / Gray offline dot */}
            <span
              className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-3 border-[#FFFDF9] dark:border-[#1E1916] ${
                user.isOnline ? 'bg-green-500 shadow-md' : 'bg-gray-400'
              }`}
              title={user.isOnline ? 'Online in cabin' : 'Offline'}
            />
          </div>

          {/* User Details & Action Buttons */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#3E2F26] dark:text-[#F3EDE2]">
                  {user.displayName}
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-[#8C7564] dark:text-[#A8988A]">
                  <span className="font-bold text-[#B5734C]">@{user.username}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Tagline right under name */}
                {user.tagline && (
                  <p className="mt-2 text-sm font-medium text-[#5A4538] dark:text-[#D5C8B8]">
                    {user.tagline}
                  </p>
                )}
              </div>

              {/* Action Buttons: Edit Profile OR (Add Friend + Message) */}
              <div className="flex items-center justify-center sm:justify-end gap-2.5">
                {isOwnProfile ? (
                  <button
                    onClick={() => {
                      playPopSound(1.2);
                      onEditProfile();
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#B5734C] hover:bg-[#9E603B] text-white font-bold text-xs sm:text-sm shadow-md transition-all transform active:scale-95"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <>
                    {/* Add Friend button */}
                    <button
                      onClick={() => {
                        playPopSound();
                        onToggleFriend(user.id);
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold border transition-all ${
                        isFriend
                          ? 'bg-[#EADDCB] dark:bg-[#382D25] text-[#5A4538] dark:text-[#D5C8B8] border-[#D5C2AB]'
                          : 'bg-[#B5734C] hover:bg-[#9E603B] text-white border-[#B5734C] shadow-sm'
                      }`}
                    >
                      {isFriend ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          <span>Friends</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Add Friend</span>
                        </>
                      )}
                    </button>

                    {/* Message button right next to it */}
                    <button
                      onClick={() => {
                        playPopSound(1.2);
                        onOpenMessage(user);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] hover:bg-[#EADDCB] dark:hover:bg-[#382D25] text-[#5A4538] dark:text-[#D5C8B8] border border-[#E2D7C8] dark:border-[#3D332C] text-xs sm:text-sm font-bold transition-all"
                    >
                      <MessageSquare className="w-4 h-4 text-[#B5734C]" />
                      <span>Message</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Profile Bio (up to 5000 characters maximum) */}
            {user.bio ? (
              <div className="mt-4 pt-4 border-t border-[#E2D7C8] dark:border-[#3D332C]/60 text-sm text-[#6D5A4D] dark:text-[#C4B4A4] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                {user.bio}
              </div>
            ) : (
              <p className="mt-4 text-xs italic text-[#9C8675]">
                {isOwnProfile
                  ? 'Your bio is currently empty. Press "Edit Profile" to share your story.'
                  : 'This cabin member has not written a bio yet.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs: Uploaded Music vs Playlists */}
      <div className="flex items-center gap-3 mb-6 border-b border-[#E2D7C8] dark:border-[#3D332C] pb-3">
        <button
          onClick={() => {
            playPopSound();
            setActiveTab('tracks');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'tracks'
              ? 'bg-[#B5734C] text-white shadow-sm'
              : 'text-[#6D5A4D] dark:text-[#C4B4A4] hover:bg-[#F2ECE1] dark:hover:bg-[#2A231E]'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Uploaded Music ({userTracks.length})</span>
        </button>

        <button
          onClick={() => {
            playPopSound();
            setActiveTab('playlists');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'playlists'
              ? 'bg-[#B5734C] text-white shadow-sm'
              : 'text-[#6D5A4D] dark:text-[#C4B4A4] hover:bg-[#F2ECE1] dark:hover:bg-[#2A231E]'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          <span>Public Playlists ({userPlaylists.length})</span>
        </button>
      </div>

      {/* Tab 1: Uploaded Music */}
      {activeTab === 'tracks' && (
        <div>
          {userTracks.length === 0 ? (
            <div className="text-center py-12 rounded-3xl bg-[#F7F2EB] dark:bg-[#241E1A] border-2 border-dashed border-[#E2D7C8] dark:border-[#3D332C]">
              <Disc3 className="w-10 h-10 mx-auto mb-2 text-[#B5734C] opacity-60" />
              <p className="text-sm font-bold text-[#5A4538] dark:text-[#D5C8B8]">
                {isOwnProfile
                  ? "You haven't uploaded any songs yet."
                  : `${user.displayName} has not uploaded any songs yet.`}
              </p>
              {isOwnProfile && (
                <p className="text-xs text-[#8C7564] mt-1">
                  Click the "+ Create" button at the top right to share your first song!
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => {
                    playPopSound();
                    onSelectTrack(track);
                  }}
                  className="group rounded-3xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] hover:border-[#B5734C]/50 hover:shadow-md cursor-pointer overflow-hidden transition-all"
                >
                  <div className="relative aspect-video bg-[#E2D7C8]">
                    <img
                      src={track.thumbnailUrl}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-base text-[#3E2F26] dark:text-[#F3EDE2] truncate group-hover:text-[#B5734C]">
                      {track.title}
                    </h3>
                    <p className="text-xs text-[#7D6656] dark:text-[#BFAF9F] line-clamp-1 mt-1">
                      {track.description}
                    </p>
                    <div className="mt-3 pt-2 border-t border-[#E2D7C8]/70 dark:border-[#3D332C]/70 text-[11px] text-[#8C7564] flex items-center justify-between">
                      <span>{new Date(track.createdAt).toLocaleDateString()}</span>
                      <span>{track.plays} plays</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Public Playlists */}
      {activeTab === 'playlists' && (
        <div>
          {userPlaylists.length === 0 ? (
            <div className="text-center py-12 rounded-3xl bg-[#F7F2EB] dark:bg-[#241E1A] border-2 border-dashed border-[#E2D7C8] dark:border-[#3D332C]">
              <ListMusic className="w-10 h-10 mx-auto mb-2 text-[#B5734C] opacity-60" />
              <p className="text-sm font-bold text-[#5A4538] dark:text-[#D5C8B8]">
                No public playlists yet.
              </p>
              <p className="text-xs text-[#8C7564] mt-1">
                Go to any song and press "Add to playlist" to curate your first mix!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userPlaylists.map((playlist) => (
                <div
                  key={playlist.id}
                  onClick={() => onSelectPlaylist?.(playlist)}
                  className="p-5 rounded-3xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] hover:border-[#B5734C]/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-base text-[#3E2F26] dark:text-[#F3EDE2]">
                      {playlist.name}
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#EADDCB] dark:bg-[#382D25] text-[#5A4538] dark:text-[#D5C8B8] flex items-center gap-1 font-bold">
                      {playlist.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span>{playlist.isPublic ? 'Public' : 'Private'}</span>
                    </span>
                  </div>
                  <p className="text-xs text-[#6D5A4D] dark:text-[#C4B4A4] mb-3 line-clamp-2">
                    {playlist.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center justify-between text-xs text-[#8C7564] dark:text-[#A8988A]">
                    <span>{playlist.trackIds.length} tracks</span>
                    {playlist.tags && playlist.tags.length > 0 && (
                      <span className="italic truncate max-w-[180px]">
                        #{playlist.tags.join(' #')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
