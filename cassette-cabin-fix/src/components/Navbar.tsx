import React from 'react';
import { Home, PlusCircle, MessageSquare, Settings, LogIn, LogOut, Radio } from 'lucide-react';
import { User } from '../types.ts';
import { playPopSound } from '../utils/audioEffects.ts';

interface NavbarProps {
  currentUser: User | null;
  onNavigateHome: () => void;
  onNavigateProfile: (userId?: string) => void;
  onOpenCreate: () => void;
  onOpenSettings: () => void;
  onOpenDMs: () => void;
  onOpenAuth: () => void;
  onLogout?: () => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onNavigateHome,
  onNavigateProfile,
  onOpenCreate,
  onOpenSettings,
  onOpenDMs,
  onOpenAuth,
  onLogout,
  currentView,
}) => {
  const handleAction = (callback: () => void) => {
    playPopSound(1.1);
    callback();
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#FBF8F3]/90 dark:bg-[#1E1916]/90 border-b border-[#E2D7C8] dark:border-[#3D332C] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Top Left: Home Button & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAction(onNavigateHome)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all duration-150 border text-base font-bold select-none ${
              currentView === 'home'
                ? 'bg-[#EADDCB] dark:bg-[#382D25] text-[#4A3B32] dark:text-[#EAE0D5] border-[#D5C2AB] dark:border-[#4E3F35] shadow-inner'
                : 'bg-[#F2ECE1] dark:bg-[#2A231E] text-[#634E42] dark:text-[#D5C8B8] border-[#E2D7C8] dark:border-[#3D332C] hover:bg-[#EADDCB] dark:hover:bg-[#352B24]'
            }`}
            title="Go to Home"
          >
            <Home className="w-5 h-5 text-[#B5734C]" />
            <span className="hidden sm:inline">Cassette Cabin</span>
            <Radio className="w-4 h-4 text-[#D9822B] animate-pulse hidden md:inline" />
          </button>
        </div>

        {/* Center / Navigation Links */}
        <div className="hidden md:flex items-center gap-4 text-sm text-[#7D6656] dark:text-[#BFAF9F]">
          <span className="italic select-none">Warm tapes · Analog vibes · Community</span>
        </div>

        {/* Top Right: Actions & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser ? (
            <>
              {/* Direct Messages Button */}
              <button
                onClick={() => handleAction(onOpenDMs)}
                className="p-2 rounded-xl bg-[#F2ECE1] dark:bg-[#2A231E] hover:bg-[#EADDCB] dark:hover:bg-[#382D25] text-[#634E42] dark:text-[#D5C8B8] border border-[#E2D7C8] dark:border-[#3D332C] transition-colors relative"
                title="Direct Messages"
              >
                <MessageSquare className="w-5 h-5 text-[#B5734C]" />
              </button>

              {/* Settings Button */}
              <button
                onClick={() => handleAction(onOpenSettings)}
                className="p-2 rounded-xl bg-[#F2ECE1] dark:bg-[#2A231E] hover:bg-[#EADDCB] dark:hover:bg-[#382D25] text-[#634E42] dark:text-[#D5C8B8] border border-[#E2D7C8] dark:border-[#3D332C] transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-[#7D6656] dark:text-[#BFAF9F]" />
              </button>

              {/* + Create Song Button (right next to profile picture icon) */}
              <button
                onClick={() => handleAction(onOpenCreate)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#B5734C] hover:bg-[#9E603B] text-white text-sm font-bold shadow-sm transition-all transform active:scale-95"
                title="Upload Your Own Music"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create</span>
              </button>

              {/* User Profile Picture Icon (with Green online / Gray offline dot) */}
              <div className="relative">
                <button
                  onClick={() => handleAction(() => onNavigateProfile(currentUser.id))}
                  className="relative group p-0.5 rounded-full border-2 border-[#B5734C]/60 hover:border-[#B5734C] transition-all focus:outline-none"
                  title={`View Profile (${currentUser.displayName})`}
                >
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover bg-[#E2D7C8]"
                  />
                  {/* Online / Offline presence dot */}
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#FBF8F3] dark:border-[#1E1916] ${
                      currentUser.isOnline ? 'bg-green-500 shadow-sm' : 'bg-gray-400'
                    }`}
                    title={currentUser.isOnline ? 'Online' : 'Offline'}
                  />
                </button>
              </div>

              {/* Log Out button in Navbar */}
              {onLogout && (
                <button
                  onClick={() => handleAction(onLogout)}
                  className="p-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40 transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            <>
              {/* Settings even when logged out */}
              <button
                onClick={() => handleAction(onOpenSettings)}
                className="p-2 rounded-xl bg-[#F2ECE1] dark:bg-[#2A231E] hover:bg-[#EADDCB] text-[#634E42] border border-[#E2D7C8] dark:border-[#3D332C]"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Log In / Sign Up */}
              <button
                onClick={() => handleAction(onOpenAuth)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#B5734C] hover:bg-[#9E603B] text-white text-sm font-bold shadow-sm transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In / Sign Up</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
