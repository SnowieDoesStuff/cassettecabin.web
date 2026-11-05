import React, { useState } from 'react';
import { X, Mail, Check, LogIn, ArrowRight, Lock, Key } from 'lucide-react';
import { User } from '../types.ts';
import { playPopSound } from '../utils/audioEffects.ts';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, displayName?: string, password?: string) => Promise<void>;
  existingUsers: User[];
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  existingUsers,
}) => {
  const [customEmail, setCustomEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedQuickUser, setSelectedQuickUser] = useState<User | null>(null);
  const [quickPassword, setQuickPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Always require password when switching to an account
  const handleQuickLogin = (user: User) => {
    playPopSound(1.1);
    setSelectedQuickUser(user);
    setQuickPassword('');
    setError(null);
  };

  const handleQuickPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuickUser) return;
    if (!quickPassword.trim()) {
      setError('Password is required');
      return;
    }

    playPopSound(1.2);
    setIsSubmitting(true);
    setError(null);
    try {
      await onLogin(selectedQuickUser.email, selectedQuickUser.displayName, quickPassword.trim());
      setSelectedQuickUser(null);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Incorrect password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;

    if (!customEmail.includes('@')) {
      setError('Please enter a valid Google email address');
      return;
    }

    // Enforce required password
    if (!password.trim() || password.trim().length < 4) {
      setError('Account password is required (minimum 4 characters)');
      return;
    }

    playPopSound(1.2);
    setIsSubmitting(true);
    setError(null);

    try {
      await onLogin(customEmail.trim(), displayName.trim() || undefined, password.trim());
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create or sign in to account');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[#FBF8F3] dark:bg-[#201A16] border-2 border-[#E2D7C8] dark:border-[#3D332C] shadow-2xl p-6 sm:p-8">
        <button
          onClick={() => {
            playPopSound();
            setSelectedQuickUser(null);
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#F2ECE1] dark:bg-[#2A231E] text-[#7D6656] hover:text-[#4A3B32] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Google G Logo & Header */}
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-7 h-7" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <h2 className="text-xl font-bold text-[#3E2F26] dark:text-[#F3EDE2]">
            Sign In with Google
          </h2>
        </div>

        <p className="text-xs text-[#7D6656] dark:text-[#BFAF9F] mb-6">
          Connect your Google email and account password to access your cabin profile.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-100 dark:bg-red-950/50 border border-red-300 text-red-800 dark:text-red-200 text-xs">
            {error}
          </div>
        )}

        {/* Password Prompt View for Account Switching */}
        {selectedQuickUser ? (
          <form onSubmit={handleQuickPasswordSubmit} className="space-y-4 mb-4 p-4 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#B5734C]">
            <div className="flex items-center gap-3">
              <img
                src={selectedQuickUser.avatarUrl}
                alt={selectedQuickUser.displayName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border-2 border-[#B5734C]"
              />
              <div>
                <h4 className="text-sm font-bold text-[#3E2F26] dark:text-[#F3EDE2]">
                  {selectedQuickUser.displayName}
                </h4>
                <p className="text-xs text-[#8C7564]">{selectedQuickUser.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
                Account Password <span className="text-amber-700">*required</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7564]" />
                <input
                  type="password"
                  placeholder="Enter account password"
                  value={quickPassword}
                  onChange={(e) => setQuickPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFFDF9] dark:bg-[#1E1916] border border-[#E2D7C8] dark:border-[#3D332C] text-xs focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-[#8C7564] mt-1 italic">
                Demo accounts password: <span className="font-mono font-bold text-[#B5734C]">cabin123</span>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedQuickUser(null)}
                className="flex-1 py-1.5 rounded-xl bg-[#EADDCB] dark:bg-[#382D25] text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8]"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-1.5 rounded-xl bg-[#B5734C] hover:bg-[#9E603B] text-white text-xs font-bold shadow-sm"
              >
                Sign In
              </button>
            </div>
          </form>
        ) : (
          /* Account Switcher list */
          existingUsers.length > 0 && (
            <div className="mb-6">
              <span className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-2 uppercase tracking-wider">
                Switch to Existing Account:
              </span>
              <div className="space-y-2">
                {existingUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleQuickLogin(u)}
                    className="w-full p-2.5 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] hover:bg-[#EADDCB] dark:hover:bg-[#382D25] border border-[#E2D7C8] dark:border-[#3D332C] flex items-center justify-between text-left transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.avatarUrl}
                        alt={u.displayName}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border border-[#B5734C]"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-[#3E2F26] dark:text-[#F3EDE2]">
                            {u.displayName}
                          </h4>
                          <span title="Password required">
                            <Lock className="w-3 h-3 text-[#B5734C]" />
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8C7564] dark:text-[#A8988A]">
                          {u.email}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#B5734C]" />
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        {/* Or enter custom Google email and required password */}
        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-[#E2D7C8] dark:border-[#3D332C]"></div>
          <span className="flex-shrink mx-3 text-xs text-[#8C7564] uppercase font-bold">
            Or create / log in with email
          </span>
          <div className="flex-grow border-t border-[#E2D7C8] dark:border-[#3D332C]"></div>
        </div>

        <form onSubmit={handleCustomSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
              Google Email Address <span className="text-amber-700 font-bold">*required</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7564]" />
              <input
                type="email"
                placeholder="yourname@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
              Display Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Cozy Tape Collector"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
              Account Password <span className="text-amber-700 font-bold">*required (min 4 characters)</span>
            </label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7564]" />
              <input
                type="password"
                placeholder="Enter account password (required)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-2xl bg-[#B5734C] hover:bg-[#9E603B] disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Continue with Google & Password</span>
          </button>
        </form>
      </div>
    </div>
  );
};
