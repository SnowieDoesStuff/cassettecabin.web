import React, { useState, useEffect, useRef } from 'react';
import { User, Track, Playlist, MessagingPrivacy } from './types.ts';
import { AudioProvider, useAudio } from './context/AudioContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HomeView } from './components/HomeView.tsx';
import { SongPage } from './components/SongPage.tsx';
import { ProfilePage } from './components/ProfilePage.tsx';
import { CreateTrackModal } from './components/CreateTrackModal.tsx';
import { EditProfileModal } from './components/EditProfileModal.tsx';
import { PlaylistModal } from './components/PlaylistModal.tsx';
import { DirectMessageModal } from './components/DirectMessageModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { GoogleAuthModal } from './components/GoogleAuthModal.tsx';
import { BottomPlayerBar } from './components/BottomPlayerBar.tsx';
import { playPopSound, playNotificationSound } from './utils/audioEffects.ts';

function CabinApp() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  // Navigation state
  const [currentView, setCurrentView] = useState<'home' | 'song' | 'profile'>('home');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [playlistModalTrackId, setPlaylistModalTrackId] = useState<string | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [dmRecipient, setDmRecipient] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Theme state: default to Light Mode as confirmed in clarifying answers
  const [isDarkMode, setIsDarkMode] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  // Initialize theme on mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Global click listener for satisfying soft pop sounds on interactive elements
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest('button') ||
          target.closest('a') ||
          target.closest('input[type="checkbox"]') ||
          target.closest('input[type="radio"]'))
      ) {
        playPopSound();
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Fetch initial data
  useEffect(() => {
    // 1. Fetch Users
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          setAllUsers(data.users);
          // Check localStorage for saved account session
          const savedId = localStorage.getItem('cassette_cabin_active_user_id');
          let active: User | undefined;
          if (savedId) {
            active = data.users.find((u: User) => u.id === savedId);
          }
          if (!active) {
            active = data.users.find((u: User) => u.email === 'papaswee1@gmail.com') || data.users[0];
          }
          if (active) {
            setCurrentUser(active);
            localStorage.setItem('cassette_cabin_active_user_id', active.id);
          }
        }
      })
      .catch(() => {});

    // 2. Fetch Tracks
    fetch('/api/tracks')
      .then((res) => res.json())
      .then((data) => {
        if (data.tracks) setTracks(data.tracks);
      })
      .catch(() => {});

    // 3. Fetch Playlists
    fetch('/api/playlists')
      .then((res) => res.json())
      .then((data) => {
        if (data.playlists) setPlaylists(data.playlists);
      })
      .catch(() => {});
  }, []);

  // Real-Time WebSocket Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onerror = () => {
      // Gracefully handle or ignore WebSocket errors without console breaks
    };

    ws.onopen = () => {
      if (currentUser) {
        ws.send(JSON.stringify({ type: 'auth', userId: currentUser.id }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'presence') {
          // Update online status in allUsers & currentUser
          setAllUsers((prev) =>
            prev.map((u) => (u.id === payload.userId ? { ...u, isOnline: payload.isOnline } : u))
          );
          setCurrentUser((prev) =>
            prev && prev.id === payload.userId ? { ...prev, isOnline: payload.isOnline } : prev
          );
        } else if (payload.type === 'track_created') {
          setTracks((prev) => [payload.track, ...prev.filter((t) => t.id !== payload.track.id)]);
        } else if (payload.type === 'playlist_created') {
          setPlaylists((prev) => [...prev, payload.playlist]);
        } else if (payload.type === 'playlist_updated') {
          setPlaylists((prev) =>
            prev.map((p) => (p.id === payload.playlist.id ? payload.playlist : p))
          );
        } else if (payload.type === 'user_updated') {
          setAllUsers((prev) =>
            prev.map((u) => (u.id === payload.user.id ? payload.user : u))
          );
          if (currentUser?.id === payload.user.id) {
            setCurrentUser(payload.user);
          }
        } else if (payload.type === 'friend_status') {
          if (payload.user1 && currentUser?.id === payload.user1.id) {
            setCurrentUser(payload.user1);
          } else if (payload.user2 && currentUser?.id === payload.user2.id) {
            setCurrentUser(payload.user2);
          }
          setAllUsers((prev) =>
            prev.map((u) => {
              if (u.id === payload.user1?.id) return payload.user1;
              if (u.id === payload.user2?.id) return payload.user2;
              return u;
            })
          );
        } else if (payload.type === 'new_message') {
          playNotificationSound();
        }
      } catch {
        // Ignore malformed message
      }
    };

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [currentUser?.id]);

  // Auth actions
  const handleLogin = async (email: string, displayName?: string, password?: string) => {
       const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || (window as any)._env_?.SUPABASE_URL || '';
    const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (window as any)._env_?.SUPABASE_ANON_KEY || '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    let authData;
    let authError;

    if (password) {
      const signInRes = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInRes.error && signInRes.error.message.includes('Invalid login credentials')) {
        const signUpRes = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split('@')[0] } }
        });
        authData = signUpRes.data;
        authError = signUpRes.error;
      } else {
        authData = signInRes.data;
        authError = signInRes.error;
      }
    } else {
      throw new Error("Password is required for profile creation.");
    }

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Authentication failed');
    }

    const formattedUser: User = {
      id: authData.user.id,
      email: authData.user.email || email,
      displayName: authData.user.user_metadata?.display_name || displayName || email.split('@')[0],
      avatarUrl: '', 
      bio: '',
      friends: [],
      allowMessagingFrom: 'everyone',
      isOnline: true
    };

    setCurrentUser(formattedUser);
    localStorage.setItem('cassette_cabin_active_user_id', formattedUser.id);
    
    if (currentView === 'profile') {
      setSelectedUserId(formattedUser.id);
    }

    setAllUsers((prev) => {
      const exists = prev.some((u) => u.id === formattedUser.id);
      return exists ? prev.map((u) => (u.id === formattedUser.id ? formattedUser : u)) : [...prev, formattedUser];
    });

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'auth', userId: formattedUser.id }));
    }
  };

  // Password update action
  const handleUpdatePassword = async (currentPassword: string, newPassword: string) => {
    if (!currentUser) return { success: false, message: 'You must be signed in' };
    const res = await fetch(`/api/users/${currentUser.id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, message: data.error || 'Failed to update password' };
    }
    if (data.user) {
      setCurrentUser(data.user);
      setAllUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
    }
    return { success: true, message: data.message || 'Password saved successfully!' };
  };

  // Profile update action
  const handleSaveProfile = async (updated: Partial<User>) => {
    if (!currentUser) return;
    const res = await fetch(`/api/users/${currentUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to update profile');
    }
    setCurrentUser(data.user);
    setAllUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
  };

  // Toggle friend action
  const handleToggleFriend = async (targetUserId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    const isFriend = currentUser.friends.includes(targetUserId);
    const action = isFriend ? 'remove' : 'add';
    const res = await fetch('/api/friends/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        targetUserId,
        action,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setCurrentUser((prev) => (prev ? { ...prev, friends: data.friends } : null));
    }
  };

  // Playlist track update
  const handleUpdatePlaylist = async (playlistId: string, trackId: string, action: 'add' | 'remove') => {
    const res = await fetch(`/api/playlists/${playlistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, action }),
    });
    const data = await res.json();
    if (data.playlist) {
      setPlaylists((prev) => prev.map((p) => (p.id === data.playlist.id ? data.playlist : p)));
    }
  };

  // Navigation handlers
  const navigateToHome = () => {
    setCurrentView('home');
    setSelectedTrack(null);
    setSelectedUserId(null);
  };

  const navigateToTrack = (track: Track) => {
    setSelectedTrack(track);
    setCurrentView('song');
  };

  const navigateToProfile = (userId?: string) => {
    const target = userId || currentUser?.id;
    if (target) {
      setSelectedUserId(target);
      setCurrentView('profile');
    } else {
      setIsAuthOpen(true);
    }
  };

  // Determine active profile to display
  const activeProfileUser = allUsers.find((u) => u.id === selectedUserId) || currentUser;

  return (
    <div className="min-h-screen bg-[#FBF8F3] dark:bg-[#1A1411] text-[#3E2F26] dark:text-[#F3EDE2] transition-colors duration-200 flex flex-col font-['Comic_Sans_MS',_'Comic_Sans',_'Comic_Neue',_cursive,_sans-serif]">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onNavigateHome={navigateToHome}
        onNavigateProfile={navigateToProfile}
        onOpenCreate={() => {
          if (!currentUser) setIsAuthOpen(true);
          else setIsCreateOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDMs={() => {
          if (!currentUser) {
            setIsAuthOpen(true);
            return;
          }
          // Pick the first other friend or user to DM
          const other = allUsers.find((u) => u.id !== currentUser.id) || allUsers[0];
          if (other) {
            setDmRecipient(other);
          }
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        currentView={currentView}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-24">
        {currentView === 'home' && (
          <HomeView
            tracks={tracks}
            onSelectTrack={navigateToTrack}
            onOpenCreate={() => {
              if (!currentUser) setIsAuthOpen(true);
              else setIsCreateOpen(true);
            }}
            onSelectUser={navigateToProfile}
          />
        )}

        {currentView === 'song' && selectedTrack && (
          <SongPage
            track={selectedTrack}
            currentUser={currentUser}
            onBack={navigateToHome}
            onOpenPlaylistModal={(trackId) => {
              setPlaylistModalTrackId(trackId);
              setIsPlaylistModalOpen(true);
            }}
            onSelectUser={navigateToProfile}
            onRequireAuth={() => setIsAuthOpen(true)}
          />
        )}

        {currentView === 'profile' && activeProfileUser && (
          <ProfilePage
            user={activeProfileUser}
            currentUser={currentUser}
            tracks={tracks}
            playlists={playlists}
            onEditProfile={() => setIsEditProfileOpen(true)}
            onSelectTrack={navigateToTrack}
            onOpenMessage={(targetUser) => setDmRecipient(targetUser)}
            onToggleFriend={handleToggleFriend}
            onSelectPlaylist={() => {}}
          />
        )}
      </main>

      {/* Global Bottom Audio Player Bar */}
      <BottomPlayerBar
        onOpenSongPage={() => {
          if (selectedTrack) setCurrentView('song');
        }}
        currentView={currentView}
      />

      {/* Modals */}
      {currentUser && (
        <>
          <CreateTrackModal
            currentUser={currentUser}
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onTrackCreated={(track) => {
              setTracks((prev) => [track, ...prev]);
              navigateToTrack(track);
            }}
          />

          <EditProfileModal
            key={currentUser.id}
            user={currentUser}
            isOpen={isEditProfileOpen}
            onClose={() => setIsEditProfileOpen(false)}
            onSave={handleSaveProfile}
          />
        </>
      )}

      <PlaylistModal
        trackId={playlistModalTrackId}
        currentUser={currentUser}
        playlists={playlists}
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        onPlaylistCreated={(playlist) => {
          setPlaylists((prev) => [...prev, playlist]);
        }}
        onUpdatePlaylist={handleUpdatePlaylist}
        onRequireAuth={() => setIsAuthOpen(true)}
      />

      {currentUser && dmRecipient && (
        <DirectMessageModal
          currentUser={currentUser}
          recipientUser={dmRecipient}
          isOpen={!!dmRecipient}
          onClose={() => setDmRecipient(null)}
          allUsers={allUsers}
          onSelectUser={(u) => setDmRecipient(u)}
        />
      )}

      <SettingsModal
        currentUser={currentUser}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDarkMode={isDarkMode}
        onToggleTheme={(enableDark) => setIsDarkMode(enableDark)}
        onUpdatePrivacy={(privacy) => {
          if (currentUser) {
            handleSaveProfile({ allowMessagingFrom: privacy });
          }
        }}
        onUpdatePassword={handleUpdatePassword}
        onSwitchAccount={() => {
          setIsSettingsOpen(false);
          setIsAuthOpen(true);
        }}
      />

      <GoogleAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        existingUsers={allUsers}
      />
    </div>
  );
}

export default function App() {
  return (
    <AudioProvider>
      <CabinApp />
    </AudioProvider>
  );
}
