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
  securityPin?: string;
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
    hasSecurityPin: !!u.securityPin,
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

// Clean user registry - no pre-seeded dummy accounts
const users: Map<string, UserRecord> = new Map();

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

// Auth: Register new account with username and password (min 8 chars)
app.post('/api/auth/register', (req, res) => {
  const { username, displayName, password } = req.body;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (cleanUsername.length < 3 || cleanUsername.length > 24) {
    return res.status(400).json({ error: 'Username must be between 3 and 24 characters (letters, numbers, underscore only)' });
  }

  if (Array.from(users.values()).some((u) => u.username.toLowerCase() === cleanUsername)) {
    return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
  }

  if (!password || typeof password !== 'string' || password.trim().length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newUser: UserRecord = {
    id,
    email: `${cleanUsername}@cabin.local`,
    displayName: displayName && displayName.trim() ? displayName.trim().slice(0, 50) : cleanUsername,
    username: cleanUsername,
    lastUsernameChange: 0,
    avatarUrl: DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
    tagline: 'New explorer at Cassette Cabin ☕',
    bio: '',
    theme: 'warm-beige',
    allowMessagingFrom: 'everyone',
    friends: [],
    isOnline: true,
    password: password.trim(),
    createdAt: Date.now(),
  };

  users.set(id, newUser);
  broadcast({ type: 'user_created', user: sanitizeUser(newUser) });
  res.json({ user: sanitizeUser(newUser) });
});

// Auth: Login with existing username & password (min 8 chars)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!password || typeof password !== 'string' || password.trim().length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const clean = username.trim().toLowerCase();
  const user = Array.from(users.values()).find(
    (u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
  );

  if (!user || user.password !== password.trim()) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Check 2-step security PIN
  if (user.securityPin) {
    return res.json({
      requiresPin: true,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
    });
  }

  user.isOnline = true;
  broadcast({ type: 'presence', userId: user.id, isOnline: true });
  res.json({ requiresPin: false, user: sanitizeUser(user) });
});

// Auth: Verify 2-Step Security PIN
app.post('/api/auth/verify-pin', (req, res) => {
  const { userId, pin } = req.body;
  if (!userId || !pin) {
    return res.status(400).json({ error: 'User ID and PIN are required' });
  }

  const user = users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.securityPin) {
    user.isOnline = true;
    broadcast({ type: 'presence', userId: user.id, isOnline: true });
    return res.json({ user: sanitizeUser(user) });
  }

  if (user.securityPin !== String(pin).trim()) {
    return res.status(401).json({ error: 'Incorrect 2-step security PIN. Please try again.' });
  }

  user.isOnline = true;
  broadcast({ type: 'presence', userId: user.id, isOnline: true });
  res.json({ user: sanitizeUser(user) });
});

// Auth: Logout
app.post('/api/auth/logout', (req, res) => {
  const { userId } = req.body;
  if (userId) {
    const user = users.get(userId);
    if (user) {
      user.isOnline = false;
      broadcast({ type: 'presence', userId: user.id, isOnline: false });
    }
  }
  res.json({ success: true });
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

// Update password (enforce minimum 8 characters)
app.put('/api/users/:id/password', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { currentPassword, newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  if (user.password && user.password !== currentPassword) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  user.password = newPassword.trim();
  broadcast({ type: 'user_updated', user: sanitizeUser(user) });

  res.json({ success: true, user: sanitizeUser(user), message: 'Password updated successfully' });
});

// Update or Remove 2-Step Security PIN (4 to 6 numeric digits)
app.put('/api/users/:id/security-pin', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { currentPassword, pin } = req.body;

  // Verify current password first
  if (user.password && user.password !== currentPassword) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  // If pin is empty or null, remove it
  if (!pin || String(pin).trim() === '') {
    delete user.securityPin;
    broadcast({ type: 'user_updated', user: sanitizeUser(user) });
    return res.json({ success: true, user: sanitizeUser(user), message: '2-step security PIN removed' });
  }

  const cleanPin = String(pin).trim();
  if (!/^\d{4,6}$/.test(cleanPin)) {
    return res.status(400).json({ error: 'Security PIN must be 4 to 6 digits (numbers only).' });
  }

  user.securityPin = cleanPin;
  broadcast({ type: 'user_updated', user: sanitizeUser(user) });

  res.json({ success: true, user: sanitizeUser(user), message: '2-step security PIN saved successfully!' });
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

// Get active conversations list for user
app.get('/api/conversations', (req, res) => {
  const { userId } = req.query as { userId: string };
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Find all user IDs involved in conversations with userId, keeping most recent message
  const convoMap = new Map<string, MessageRecord>();
  // Sort messages descending so first match is most recent
  const sortedDesc = [...messages].sort((a, b) => b.timestamp - a.timestamp);
  for (const m of sortedDesc) {
    const otherId = m.senderId === userId ? m.receiverId : m.receiverId === userId ? m.senderId : null;
    if (otherId && !convoMap.has(otherId)) {
      convoMap.set(otherId, m);
    }
  }

  const result = Array.from(convoMap.entries()).map(([otherUserId, lastMessage]) => ({
    otherUserId,
    lastMessage,
  }));

  res.json({ conversations: result });
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
