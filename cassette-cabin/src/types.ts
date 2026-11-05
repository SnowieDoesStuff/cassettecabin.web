export type MessagingPrivacy = 'everyone' | 'friends' | 'nobody';

export type ProfileTheme = 'warm-beige' | 'espresso-wood' | 'sage-cabin' | 'cozy-peach' | 'lavender-mist';

export interface User {
  id: string;
  email: string;
  displayName: string;
  username: string;
  lastUsernameChange: number; // timestamp ms
  avatarUrl: string;
  tagline: string;
  bio: string;
  theme: ProfileTheme;
  allowMessagingFrom: MessagingPrivacy;
  friends: string[]; // user IDs
  isOnline: boolean;
  hasPassword?: boolean;
  createdAt: number;
}

export interface Track {
  id: string;
  userId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  audioUrl: string;
  links?: string[];
  duration: number; // in seconds
  plays: number;
  createdAt: number;
}

export interface Comment {
  id: string;
  trackId: string;
  userId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: number;
}

export interface Playlist {
  id: string;
  userId: string;
  authorName: string;
  name: string;
  description: string; // max 300 chars
  isPublic: boolean;
  tags: string[];
  trackIds: string[];
  createdAt: number;
}

export type MediaType = 'none' | 'image' | 'gif' | 'video' | 'link';

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedContent: string;
  mediaType: MediaType;
  mediaUrl?: string;
  timestamp: number;
}

export interface DecryptedDirectMessage extends DirectMessage {
  decryptedText: string;
}
