import React, { useState, useEffect } from 'react';
import { X, Sparkles, Image, Check, AlertCircle, Clock } from 'lucide-react';
import { User, ProfileTheme } from '../types.ts';
import { playPopSound } from '../utils/audioEffects.ts';

interface EditProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<User>) => Promise<void>;
}

const THEME_OPTIONS: { id: ProfileTheme; label: string; bg: string }[] = [
  { id: 'warm-beige', label: 'Warm Oatmeal', bg: 'bg-[#F2ECE1] border-[#B5734C]' },
  { id: 'espresso-wood', label: 'Cedar Espresso', bg: 'bg-[#2A231E] text-white border-[#8C5D3D]' },
  { id: 'sage-cabin', label: 'Pine Forest Sage', bg: 'bg-[#E3EBE3] border-[#557A55]' },
  { id: 'cozy-peach', label: 'Sunset Amber', bg: 'bg-[#FDEEE4] border-[#E07A5F]' },
  { id: 'lavender-mist', label: 'Misty Lavender', bg: 'bg-[#ECE8F5] border-[#7E6B9E]' },
];

const PRESET_GIFS = [
  'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', // cozy cat
  'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif', // coffee tape
  'https://media.giphy.com/media/3o7TKTDnUxE0g2fSE8/giphy.gif', // lofi rain
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [tagline, setTagline] = useState(user.tagline);
  const [bio, setBio] = useState(user.bio);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [theme, setTheme] = useState<ProfileTheme>(user.theme);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize state whenever user or isOpen changes so different accounts never show stale data
  useEffect(() => {
    if (isOpen) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setTagline(user.tagline || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || '');
      setTheme(user.theme || 'warm-beige');
      setError(null);
    }
  }, [user.id, user.displayName, user.username, user.tagline, user.bio, user.avatarUrl, user.theme, isOpen]);

  if (!isOpen) return null;

  // Calculate cooldown for username
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const timeSinceChange = Date.now() - (user.lastUsernameChange || 0);
  const isUsernameLocked = user.lastUsernameChange > 0 && timeSinceChange < THREE_DAYS_MS;
  const daysLeft = Math.ceil((THREE_DAYS_MS - timeSinceChange) / (24 * 60 * 60 * 1000));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (username.trim().toLowerCase() !== user.username.toLowerCase() && isUsernameLocked) {
      setError(`Username can only be changed once every 3 days. Available in ${daysLeft} day(s).`);
      return;
    }

    setIsSubmitting(true);
    playPopSound(1.2);
    try {
      await onSave({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        tagline: tagline.trim(),
        bio: bio.trim(),
        avatarUrl,
        theme,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update profile');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#FBF8F3] dark:bg-[#201A16] border-2 border-[#E2D7C8] dark:border-[#3D332C] shadow-2xl p-6 sm:p-8">
        {/* Close Button */}
        <button
          onClick={() => {
            playPopSound();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#F2ECE1] dark:bg-[#2A231E] text-[#7D6656] hover:text-[#4A3B32] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-[#3E2F26] dark:text-[#F3EDE2] mb-1">
          Edit Your Profile
        </h2>
        <p className="text-xs text-[#7D6656] dark:text-[#BFAF9F] mb-6">
          Personalize your cozy identity in the cabin. GIF avatars are warmly supported!
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Picture (with GIF presets and file upload) */}
          <div>
            <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-2">
              Profile Picture (GIFs Included)
            </label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#B5734C] bg-[#E2D7C8]"
                />
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Paste image or GIF URL..."
                  className="w-full px-3 py-1.5 rounded-xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                />
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#EADDCB] dark:bg-[#382D25] text-xs font-bold text-[#4A3B32] dark:text-[#EAE0D5] hover:opacity-90">
                    <Image className="w-3.5 h-3.5" />
                    <span>Upload File / GIF</span>
                    <input
                      type="file"
                      accept="image/*,.gif"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Preset Cozy GIFs */}
                  <span className="text-[11px] text-[#8C7564]">or pick:</span>
                  {PRESET_GIFS.map((gif, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(gif)}
                      className="w-6 h-6 rounded-full overflow-hidden border border-[#B5734C]/40 hover:scale-110 transition-transform"
                    >
                      <img src={gif} alt="gif preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
              Display Name <span className="text-gray-400 font-normal">(changeable anytime)</span>
            </label>
            <input
              type="text"
              value={displayName}
              maxLength={50}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-sm text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-2 focus:ring-[#B5734C]/50"
              required
            />
          </div>

          {/* Username (once per 3 days rule) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8]">
                Username (@handle)
              </label>
              {isUsernameLocked ? (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-bold">
                  <Clock className="w-3 h-3" />
                  Locked for {daysLeft} more day(s)
                </span>
              ) : (
                <span className="text-[11px] text-[#8C7564] dark:text-[#A8988A]">
                  Can be changed once every 3 days
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#8C7564]">@</span>
              <input
                type="text"
                value={username}
                disabled={isUsernameLocked}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className={`w-full pl-8 pr-4 py-2 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#B5734C]/50 ${
                  isUsernameLocked
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-300 dark:border-gray-700 cursor-not-allowed'
                    : 'bg-[#F2ECE1] dark:bg-[#2A231E] border-[#E2D7C8] dark:border-[#3D332C] text-[#3E2F26] dark:text-[#F3EDE2]'
                }`}
                required
              />
            </div>
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
              Tagline Under Your Name
            </label>
            <input
              type="text"
              value={tagline}
              maxLength={120}
              placeholder="e.g. Curating warm tape loops & cozy beats ☕📻"
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-4 py-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-sm text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-2 focus:ring-[#B5734C]/50"
            />
          </div>

          {/* Profile Bio (5000 characters maximum) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8]">
                Profile Bio
              </label>
              <span className="text-[11px] font-mono text-[#8C7564] dark:text-[#A8988A]">
                {bio.length} / 5000
              </span>
            </div>
            <textarea
              rows={4}
              value={bio}
              maxLength={5000}
              placeholder="Tell the cabin community about your favorite instruments, tape deck setups, or musical journey..."
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-sm text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-2 focus:ring-[#B5734C]/50 resize-y"
            />
          </div>

          {/* Custom Profile Theme */}
          <div>
            <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-2">
              Custom Profile Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${t.bg} ${
                    theme === t.id ? 'ring-2 ring-[#B5734C]' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <span>{t.label}</span>
                  {theme === t.id && <Check className="w-3.5 h-3.5 text-[#B5734C]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2D7C8] dark:border-[#3D332C]">
            <button
              type="button"
              onClick={() => {
                playPopSound();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-[#EADDCB] dark:bg-[#382D25] text-[#5A4538] dark:text-[#D5C8B8] font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#B5734C] hover:bg-[#9E603B] disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
