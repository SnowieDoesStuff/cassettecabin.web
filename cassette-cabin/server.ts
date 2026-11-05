import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = 3000;

// Enable large JSON payloads for audio & image uploads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// ==========================================
// In-Memory Database Store
// ==========================================

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  username: string;
  lastUsernameChange: number;
  avatarUrl: string;
  tagline: string;
  bio: string;
  theme: 'warm-beige' | 'espresso-wood' | 'sage-cabin' | 'cozy-peach' | 'lavender-mist';
  allowMessagingFrom: 'everyone' | 'friends' | 'nobody';
  friends: string[];
  isOnline: boolean;
  password?: string;
  createdAt: number;
}

function sanitizeUser(u: UserRecord) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    username: u.username,
    lastUsernameChange: u.lastUsernameChange,
    avatarUrl: u.avatarUrl,
    tagline: u.tagline,
    bio: u.bio,
    theme: u.theme,
    allowMessagingFrom: u.allowMessagingFrom,
    friends: u.friends,
    isOnline: u.isOnline,
    hasPassword: !!u.password,
    createdAt: u.createdAt,
  };
}

export interface TrackRecord {
  id: string;
  userId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  audioUrl: string;
  links: string[];
  duration: number;
  plays: number;
  createdAt: number;
}

export interface CommentRecord {
  id: string;
  trackId: string;
  userId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: number;
}

export interface PlaylistRecord {
  id: string;
  userId: string;
  authorName: string;
  name: string;
  description: string;
  isPublic: boolean;
  tags: string[];
  trackIds: string[];
  createdAt: number;
}

export interface MessageRecord {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedContent: string;
  mediaType: 'none' | 'image' | 'gif' | 'video' | 'link';
  mediaUrl?: string;
  timestamp: number;
}

// Sample avatars using warm aesthetic SVG avatars / gifs
const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
];

// Seed initial users so social features (adding friends, DMs) have friendly creators ready
const users: Map<string, UserRecord> = new Map([
  [
    'user-main',
    {
      id: 'user-main',
      email: 'papaswee1@gmail.com',
      displayName: 'Papa Swee',
      username: 'papaswee',
      lastUsernameChange: 0,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      tagline: 'Curating warm tape loops & cozy melodies ☕📻',
      bio: 'Welcome to my cabin! I make warm acoustic vibes and collect vintage cassettes. Feel free to say hi or share a track.',
      theme: 'warm-beige',
      allowMessagingFrom: 'everyone',
      friends: ['user-hazel'],
      isOnline: true,
      password: 'cabin123',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    },
  ],
  [
    'user-hazel',
    {
      id: 'user-hazel',
      email: 'hazel.finch@cabin.fm',
      displayName: 'Hazel & Finch',
      username: 'hazelfinch',
      lastUsernameChange: 0,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      tagline: 'Analog tape warmth & rainy morning guitar 🌧️🎸',
      bio: 'Living in the misty pine woods, recording tape loops onto 4-track Portastudios. Coffee enthusiast and cat parent.',
      theme: 'sage-cabin',
      allowMessagingFrom: 'everyone',
      friends: ['user-main'],
      isOnline: true,
      password: 'cabin123',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    },
  ],
  [
    'user-hermit',
    {
      id: 'user-hermit',
      email: 'forest.hermit@cabin.fm',
      displayName: 'Forest Hermit',
      username: 'foresthermit',
      lastUsernameChange: 0,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      tagline: 'Field recordings, modular synths & birdsong 🌲🕊️',
      bio: 'Deep in the redwood trees capturing wind in the branches and combining it with warm Rhodes keys and tape saturation.',
      theme: 'espresso-wood',
      allowMessagingFrom: 'everyone',
      friends: [],
      isOnline: false,
      password: 'cabin123',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60,
    },
  ],
]);

// Empty catalog to start as requested in clarifying question!
const tracks: Map<string, TrackRecord> = new Map();
const comments: Map<string, CommentRecord[]> = new Map();
const playlists: Map<string, PlaylistRecord> = new Map();
const messages: MessageRecord[] = [];
const audioBlobs: Map<string, { buffer: Buffer; mimeType: string }> = new Map();

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  try {
    const url = request.url ? new URL(request.url, `http://${request.headers.host || 'localhost'}`) : null;
    if (url && url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
      return;
    }
  } catch {
    // Ignore and pass through to other middleware
  }
});

wss.on('error', (err) => {
  console.error('WebSocketServer error:', err);
});
const clientSockets: Map<string, Set<WebSocket>> = new Map();

function broadcast(data: object, excludeUserId?: string) {
  const payload = JSON.stringify(data);
  for (const [userId, sockets] of clientSockets.entries()) {
    if (excludeUserId && userId === excludeUserId) continue;
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  }
}

function sendToUser(userId: string, data: object) {
  const sockets = clientSockets.get(userId);
  if (!sockets) return;
  const payload = JSON.stringify(data);
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  let authenticatedUserId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type === 'auth') {
        authenticatedUserId = message.userId;
        if (!authenticatedUserId) return;

        if (!clientSockets.has(authenticatedUserId)) {
          clientSockets.set(authenticatedUserId, new Set());
        }
        clientSockets.get(authenticatedUserId)!.add(ws);

        // Update online status
        const user = users.get(authenticatedUserId);
        if (user) {
          user.isOnline = true;
          broadcast({ type: 'presence', userId: authenticatedUserId, isOnline: true });
        }
      } else if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      // Invalid message format
    }
  });

  ws.on('close', () => {
    if (authenticatedUserId) {
      const userSockets = clientSockets.get(authenticatedUserId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          clientSockets.delete(authenticatedUserId);
          const user = users.get(authenticatedUserId);
          if (user) {
            user.isOnline = false;
            broadcast({ type: 'presence', userId: authenticatedUserId, isOnline: false });
          }
        }
      }
    }
  });
});

// ==========================================
// API REST Endpoints
// ==========================================

// Auth / User lookup or creation
app.post('/api/auth/google', (req, res) => {
  const { email, displayName, avatarUrl, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!password || typeof password !== 'string' || password.trim().length < 4) {
    return res.status(400).json({ error: 'Account password is required (minimum 4 characters).' });
  }

  // Find existing by email
  let user = Array.from(users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (user) {
    if (user.password && user.password !== password.trim()) {
      return res.status(401).json({ error: 'Incorrect password for this account.' });
    }
    if (!user.password) {
      user.password = password.trim();
    }
  } else {
    const rawUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = rawUsername || 'cabinmate';
    // Ensure uniqueness
    let counter = 1;
    while (Array.from(users.values()).some((u) => u.username === username)) {
      username = `${rawUsername}${counter++}`;
    }

    const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    user = {
      id,
      email,
      displayName: displayName || email.split('@')[0],
      username,
      lastUsernameChange: 0,
      avatarUrl:
        avatarUrl ||
        DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
      tagline: 'New explorer at Cassette Cabin ☕',
      bio: '',
      theme: 'warm-beige',
      allowMessagingFrom: 'everyone',
      friends: [],
      isOnline: true,
      password: password.trim(),
      createdAt: Date.now(),
    };
    users.set(id, user);
  }

  user.isOnline = true;
  res.json({ user: sanitizeUser(user) });
});

// List all known users (for directory/social)
app.get('/api/users', (_req, res) => {
  res.json({ users: Array.from(users.values()).map(sanitizeUser) });
});

// Get user profile
app.get('/api/users/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: sanitizeUser(user) });
});

// Update profile with 3-day cooldown on username
app.put('/api/users/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { displayName, username, avatarUrl, tagline, bio, theme, allowMessagingFrom } = req.body;

  // Handle username update with 3-day cooldown
  if (username && username.trim().toLowerCase() !== user.username.toLowerCase()) {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3 || cleanUsername.length > 24) {
      return res.status(400).json({ error: 'Username must be between 3 and 24 characters' });
    }

    // Check if taken
    const isTaken = Array.from(users.values()).some(
      (u) => u.id !== user.id && u.username.toLowerCase() === cleanUsername
    );
    if (isTaken) {
      return res.status(400).json({ error: 'Username is already taken by another cabin member' });
    }

    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (user.lastUsernameChange && now - user.lastUsernameChange < THREE_DAYS_MS) {
      const remainingDays = Math.ceil((THREE_DAYS_MS - (now - user.lastUsernameChange)) / (24 * 60 * 60 * 1000));
      return res.status(400).json({
        error: `Username can only be changed once every 3 days. Try again in ${remainingDays} day(s).`,
      });
    }

    user.username = cleanUsername;
    user.lastUsernameChange = now;
  }

  if (displayName) user.displayName = displayName.trim().slice(0, 50);
  if (avatarUrl) user.avatarUrl = avatarUrl;
  if (tagline !== undefined) user.tagline = tagline.slice(0, 120);
  if (bio !== undefined) user.bio = bio.slice(0, 5000);
  if (theme) user.theme = theme;
  if (allowMessagingFrom) user.allowMessagingFrom = allowMessagingFrom;

  // Broadcast user update
  broadcast({ type: 'user_updated', user: sanitizeUser(user) });

  res.json({ user: sanitizeUser(user) });
});

// Update password
app.put('/api/users/:id/password', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { currentPassword, newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long' });
  }

  if (user.password && user.password !== currentPassword) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  user.password = newPassword.trim();
  broadcast({ type: 'user_updated', user: sanitizeUser(user) });

  res.json({ success: true, user: sanitizeUser(user), message: 'Password updated successfully' });
});

// Audio streaming / download endpoint
app.get('/api/audio/:id', (req, res) => {
  const blob = audioBlobs.get(req.params.id);
  if (!blob) {
    return res.status(404).send('Audio not found');
  }
  res.setHeader('Content-Type', blob.mimeType);
  res.setHeader('Content-Length', blob.buffer.length);
  res.send(blob.buffer);
});

// Upload Track
app.post('/api/tracks', (req, res) => {
  const { userId, title, description, thumbnailUrl, audioDataUrl, audioUrl, links, duration } = req.body;
  const user = users.get(userId);
  if (!user) return res.status(401).json({ error: 'User must be signed in' });

  if (!title || !description || !thumbnailUrl) {
    return res.status(400).json({ error: 'Title, description, and thumbnail are required' });
  }

  let finalAudioUrl = audioUrl;

  // If client uploaded a raw data URL / base64, save in audioBlobs
  if (audioDataUrl && audioDataUrl.startsWith('data:')) {
    const matches = audioDataUrl.match(/^data:([A-Za-z0-9-+/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const audioId = `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      audioBlobs.set(audioId, { buffer, mimeType });
      finalAudioUrl = `/api/audio/${audioId}`;
    }
  }

  if (!finalAudioUrl) {
    return res.status(400).json({ error: 'Audio file is required' });
  }

  const trackId = `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newTrack: TrackRecord = {
    id: trackId,
    userId: user.id,
    authorName: user.displayName,
    authorUsername: user.username,
    authorAvatar: user.avatarUrl,
    title: title.trim(),
    description: description.trim(),
    thumbnailUrl,
    audioUrl: finalAudioUrl,
    links: Array.isArray(links) ? links.filter((l: string) => typeof l === 'string' && l.trim()) : [],
    duration: duration || 180,
    plays: 0,
    createdAt: Date.now(),
  };

  tracks.set(trackId, newTrack);
  broadcast({ type: 'track_created', track: newTrack });

  res.json({ track: newTrack });
});

// Get all tracks
app.get('/api/tracks', (_req, res) => {
  res.json({ tracks: Array.from(tracks.values()).sort((a, b) => b.createdAt - a.createdAt) });
});

// Get track by ID
app.get('/api/tracks/:id', (req, res) => {
  const track = tracks.get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  track.plays += 1;
  res.json({ track });
});

// Track comments
app.get('/api/tracks/:id/comments', (req, res) => {
  const trackComments = comments.get(req.params.id) || [];
  res.json({ comments: trackComments.sort((a, b) => a.createdAt - b.createdAt) });
});

app.post('/api/tracks/:id/comments', (req, res) => {
  const { userId, content } = req.body;
  const user = users.get(userId);
  if (!user) return res.status(401).json({ error: 'You must be signed in to comment' });
  if (!content || !content.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

  const comment: CommentRecord = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    trackId: req.params.id,
    userId: user.id,
    authorName: user.displayName,
    authorAvatar: user.avatarUrl,
    content: content.trim().slice(0, 1000),
    createdAt: Date.now(),
  };

  if (!comments.has(req.params.id)) {
    comments.set(req.params.id, []);
  }
  comments.get(req.params.id)!.push(comment);

  broadcast({ type: 'comment_created', comment });
  res.json({ comment });
});

// Playlists
app.get('/api/playlists', (req, res) => {
  const userId = req.query.userId as string | undefined;
  const all = Array.from(playlists.values());
  const visible = all.filter((p) => p.isPublic || (userId && p.userId === userId));
  res.json({ playlists: visible });
});

app.post('/api/playlists', (req, res) => {
  const { userId, name, description, isPublic, tags, trackIds } = req.body;
  const user = users.get(userId);
  if (!user) return res.status(401).json({ error: 'You must be signed in to create a playlist' });
  if (!name || !name.trim()) return res.status(400).json({ error: 'Playlist name is required' });

  const playlistId = `pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newPlaylist: PlaylistRecord = {
    id: playlistId,
    userId: user.id,
    authorName: user.displayName,
    name: name.trim().slice(0, 80),
    description: (description || '').trim().slice(0, 300),
    isPublic: isPublic !== false,
    tags: Array.isArray(tags) ? tags : [],
    trackIds: Array.isArray(trackIds) ? trackIds : [],
    createdAt: Date.now(),
  };

  playlists.set(playlistId, newPlaylist);
  broadcast({ type: 'playlist_created', playlist: newPlaylist });
  res.json({ playlist: newPlaylist });
});

app.put('/api/playlists/:id', (req, res) => {
  const playlist = playlists.get(req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  const { trackId, action, name, description, isPublic, tags } = req.body;
  if (action === 'add' && trackId && !playlist.trackIds.includes(trackId)) {
    playlist.trackIds.push(trackId);
  } else if (action === 'remove' && trackId) {
    playlist.trackIds = playlist.trackIds.filter((id) => id !== trackId);
  }

  if (name) playlist.name = name.trim().slice(0, 80);
  if (description !== undefined) playlist.description = description.trim().slice(0, 300);
  if (isPublic !== undefined) playlist.isPublic = !!isPublic;
  if (Array.isArray(tags)) playlist.tags = tags;

  broadcast({ type: 'playlist_updated', playlist });
  res.json({ playlist });
});

// Friends list management
app.post('/api/friends/action', (req, res) => {
  const { userId, targetUserId, action } = req.body;
  const user = users.get(userId);
  const targetUser = users.get(targetUserId);

  if (!user || !targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (action === 'add') {
    if (!user.friends.includes(targetUserId)) {
      user.friends.push(targetUserId);
    }
    if (!targetUser.friends.includes(userId)) {
      targetUser.friends.push(userId);
    }
  } else if (action === 'remove') {
    user.friends = user.friends.filter((id) => id !== targetUserId);
    targetUser.friends = targetUser.friends.filter((id) => id !== userId);
  }

  broadcast({ type: 'friend_status', user1: user, user2: targetUser });
  res.json({ success: true, friends: user.friends });
});

// Direct Messages
app.get('/api/messages', (req, res) => {
  const { userId, otherUserId } = req.query as { userId: string; otherUserId: string };
  if (!userId || !otherUserId) {
    return res.status(400).json({ error: 'userId and otherUserId are required' });
  }

  const convo = messages.filter(
    (m) =>
      (m.senderId === userId && m.receiverId === otherUserId) ||
      (m.senderId === otherUserId && m.receiverId === userId)
  );

  res.json({ messages: convo.sort((a, b) => a.timestamp - b.timestamp) });
});

app.post('/api/messages', (req, res) => {
  const { senderId, receiverId, encryptedContent, mediaType, mediaUrl } = req.body;
  const sender = users.get(senderId);
  const receiver = users.get(receiverId);

  if (!sender || !receiver) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check messaging privacy settings
  if (receiver.allowMessagingFrom === 'nobody') {
    return res.status(403).json({ error: `${receiver.displayName} does not accept direct messages.` });
  }
  if (receiver.allowMessagingFrom === 'friends' && !receiver.friends.includes(senderId)) {
    return res.status(403).json({ error: `${receiver.displayName} only accepts direct messages from friends.` });
  }

  const messageRecord: MessageRecord = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    senderId,
    receiverId,
    encryptedContent: encryptedContent || '',
    mediaType: mediaType || 'none',
    mediaUrl: mediaUrl || '',
    timestamp: Date.now(),
  };

  messages.push(messageRecord);

  // Real-time delivery to both sender and receiver
  sendToUser(receiverId, { type: 'new_message', message: messageRecord, sender });
  sendToUser(senderId, { type: 'new_message', message: messageRecord, sender });

  res.json({ message: messageRecord });
});

// ==========================================
// Vite / Static Files Mounting
// ==========================================

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Cassette Cabin server running on http://0.0.0.0:${port}`);
  });
}

start();
