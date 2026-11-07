import React, { useState } from 'react';
import { X, Upload, Music, Image as ImageIcon, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Track, User } from '../types.ts';
import { playPopSound } from '../utils/audioEffects.ts';

interface CreateTrackModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onTrackCreated: (track: Track) => void;
}

export const CreateTrackModal: React.FC<CreateTrackModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onTrackCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [audioDataUrl, setAudioDataUrl] = useState('');
  const [audioFileName, setAudioFileName] = useState('');
  const [duration, setDuration] = useState(180);
  const [links, setLinks] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Handle Audio File Upload
  const handleAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFileName(file.name);

    // Compute duration via Audio element
    const audioObj = new Audio();
    const objectUrl = URL.createObjectURL(file);
    audioObj.src = objectUrl;
    audioObj.onloadedmetadata = () => {
      if (audioObj.duration && !isNaN(audioObj.duration)) {
        setDuration(Math.round(audioObj.duration));
      }
      URL.revokeObjectURL(objectUrl);
    };

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAudioDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Thumbnail File Upload
  const handleThumbnailFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setThumbnailUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddLink = () => {
    playPopSound();
    setLinks([...links, '']);
  };

  const handleUpdateLink = (index: number, val: string) => {
    const copy = [...links];
    copy[index] = val;
    setLinks(copy);
  };

  const handleRemoveLink = (index: number) => {
    playPopSound();
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Prompt rule: links are optional, everything else is required!
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!thumbnailUrl) {
      setError('Thumbnail is required (upload an image or enter a URL)');
      return;
    }
    if (!audioDataUrl) {
      setError('Audio file is required');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    setIsSubmitting(true);
    playPopSound(1.2);
    try {
      const filteredLinks = links.filter((l) => l && l.trim());
      const res = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          title: title.trim(),
          description: description.trim(),
          thumbnailUrl,
          audioDataUrl,
          links: filteredLinks,
          duration,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to upload song');
      }

      onTrackCreated(data.track);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error uploading track');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#FBF8F3] dark:bg-[#201A16] border-2 border-[#E2D7C8] dark:border-[#3D332C] shadow-2xl p-6 sm:p-8">
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
          Upload Your Music
        </h2>
        <p className="text-xs text-[#7D6656] dark:text-[#BFAF9F] mb-6">
          Record, render, and share your handmade cassette tape with the cabin.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title (Required) */}
          <div>
            <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
              Song Title <span className="text-amber-700">*required</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Rainy Porch Acoustic Loop"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-sm text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-2 focus:ring-[#B5734C]/50"
              required
            />
          </div>

          {/* Audio File Upload (Required) */}
          <div>
            <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
              Audio File <span className="text-amber-700">*required</span>
            </label>
            <div className="p-4 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border-2 border-dashed border-[#D5C2AB] dark:border-[#4E3F35] text-center">
              <label className="cursor-pointer block">
                <Music className="w-8 h-8 mx-auto mb-2 text-[#B5734C]" />
                <span className="text-xs font-bold text-[#4A3B32] dark:text-[#EAE0D5] block">
                  {audioFileName ? audioFileName : 'Click to select audio file (MP3, WAV, OGG, M4A)'}
                </span>
                <span className="text-[11px] text-[#8C7564] block mt-1">
                  Supports full length audio tracks and snippets
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Thumbnail Image (Required) */}
          <div>
            <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
              Cover Thumbnail <span className="text-amber-700">*required</span>
            </label>
            <div className="flex gap-4 items-center">
              {thumbnailUrl ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-[#B5734C] shrink-0 bg-[#E2D7C8]">
                  <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-dashed border-[#D5C2AB] flex items-center justify-center text-[#8C7564] shrink-0">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  placeholder="Paste image URL..."
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                />
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EADDCB] dark:bg-[#382D25] text-xs font-bold text-[#4A3B32] dark:text-[#EAE0D5]">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Description (Required) */}
          <div>
            <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
              Description & Liner Notes <span className="text-amber-700">*required</span>
            </label>
            <textarea
              rows={3}
              placeholder="Tell listeners how you recorded this, what gear or guitar tuning you used, or the story behind the tune..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-sm text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-2 focus:ring-[#B5734C]/50 resize-y"
              required
            />
          </div>

          {/* Links (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8]">
                External Links <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <button
                type="button"
                onClick={handleAddLink}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#B5734C] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add another link</span>
              </button>
            </div>

            <div className="space-y-2">
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://bandcamp.com/... or soundcloud.com/..."
                    value={link}
                    onChange={(e) => handleUpdateLink(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                  />
                  {links.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(idx)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
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
              className="px-6 py-2.5 rounded-2xl bg-[#B5734C] hover:bg-[#9E603B] disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all"
            >
              Upload Song to Cabin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
