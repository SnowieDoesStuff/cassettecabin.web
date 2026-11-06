import React, { useState } from 'react';
import { X, Lock, Key, User as UserIcon, Shield, ArrowRight, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { User } from '../types.ts';
import { playPopSound } from '../utils/audioEffects.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, password: string) => Promise<{ requiresPin?: boolean; userId?: string } | void>;
  onRegister: (username: string, displayName: string, password: string) => Promise<void>;
  onVerifyPin: (userId: string, pin: string) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  onVerifyPin,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'pin'>('login');

  // Form states
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 2-Step PIN state
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pin, setPin] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTabSwitch = (newMode: 'login' | 'signup') => {
    playPopSound(1.1);
    setMode(newMode);
    setError(null);
  };

  const resetForm = () => {
    setUsername('');
    setDisplayName('');
    setPassword('');
    setConfirmPassword('');
    setPin('');
    setPendingUserId(null);
    setError(null);
  };

  const handleClose = () => {
    playPopSound();
    resetForm();
    onClose();
  };

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both your username and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    playPopSound(1.2);
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onLogin(username.trim(), password.trim());
      if (result && result.requiresPin && result.userId) {
        setPendingUserId(result.userId);
        setMode('pin');
        setPin('');
      } else {
        resetForm();
        onClose();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invalid username or password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Sign Up submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!cleanUser || cleanUser.length < 3 || cleanUser.length > 24) {
      setError('Username must be between 3 and 24 characters (letters, numbers, underscore only).');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long (no upper limit).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    playPopSound(1.2);
    setIsSubmitting(true);
    setError(null);

    try {
      await onRegister(cleanUser, displayName.trim(), password);
      resetForm();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create account. Username may already be taken.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle PIN verification
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUserId) return;
    if (!/^\d{4,6}$/.test(pin.trim())) {
      setError('Please enter your 4 to 6 digit numeric security PIN.');
      return;
    }

    playPopSound(1.2);
    setIsSubmitting(true);
    setError(null);

    try {
      await onVerifyPin(pendingUserId, pin.trim());
      resetForm();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Incorrect PIN. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-['Comic_Sans_MS',_'Comic_Sans',_'Comic_Neue',_cursive,_sans-serif]">
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-[#FBF8F3] dark:bg-[#201A16] border-2 border-[#E2D7C8] dark:border-[#3D332C] shadow-2xl p-6 sm:p-8">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#F2ECE1] dark:bg-[#2A231E] text-[#7D6656] hover:text-[#4A3B32] transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Brand Header */}
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-[#B5734C]/15 dark:bg-[#B5734C]/30 flex items-center justify-center text-[#B5734C]">
            <Key className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold text-[#3E2F26] dark:text-[#F3EDE2]">
            {mode === 'pin' ? '2-Step Verification' : 'Cassette Cabin'}
          </h2>
        </div>

        <p className="text-xs text-[#7D6656] dark:text-[#BFAF9F] mb-5">
          {mode === 'pin'
            ? 'This cabin account is protected with a 2-step security PIN.'
            : mode === 'login'
            ? 'Sign in to your account with your username & password.'
            : 'Create your cabin creator account (minimum 8-character password).'}
        </p>

        {/* Error notification banner */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs">
            {error}
          </div>
        )}

        {/* 2-Step PIN Screen */}
        {mode === 'pin' ? (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#B5734C]/40 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#B5734C]/15 flex items-center justify-center text-[#B5734C]">
                <Shield className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-[#3E2F26] dark:text-[#F3EDE2] mb-1">
                Enter 4–6 Digit Security PIN
              </p>
              <p className="text-[11px] text-[#8C7564] dark:text-[#A8988A]">
                Check your settings if you forgot your configured PIN
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1.5 uppercase tracking-wider text-center">
                Security PIN (Numeric)
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full text-center text-2xl tracking-[0.4em] py-2.5 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-2 focus:ring-[#B5734C]/60"
                autoFocus
                required
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  playPopSound();
                  setMode('login');
                  setPendingUserId(null);
                  setPin('');
                }}
                className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-2xl bg-[#EADDCB] dark:bg-[#382D25] text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] hover:bg-[#E2D2BC]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting || pin.length < 4}
                className="flex items-center justify-center gap-1.5 flex-[2] py-2.5 rounded-2xl bg-[#B5734C] hover:bg-[#9E603B] disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all"
              >
                <span>Verify & Enter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Mode Tabs: [Log In] vs [Sign Up] */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] mb-5 border border-[#E2D7C8] dark:border-[#3D332C]">
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'login'
                    ? 'bg-[#FFFDF9] dark:bg-[#1E1916] text-[#B5734C] shadow-sm'
                    : 'text-[#7D6656] dark:text-[#A8988A] hover:text-[#4A3B32]'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('signup')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'signup'
                    ? 'bg-[#FFFDF9] dark:bg-[#1E1916] text-[#B5734C] shadow-sm'
                    : 'text-[#7D6656] dark:text-[#A8988A] hover:text-[#4A3B32]'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Log In Tab */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7564]" />
                    <input
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
                    Password <span className="text-amber-700 font-bold">*min 8 characters</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7564]" />
                    <input
                      type="password"
                      placeholder="Enter password (minimum 8 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-2xl bg-[#B5734C] hover:bg-[#9E603B] disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                >
                  <span>Log In to Cabin</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Sign Up Tab */}
            {mode === 'signup' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
                    Choose Username <span className="text-amber-700 font-bold">*required</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7564]" />
                    <input
                      type="text"
                      placeholder="e.g. cozy_collector"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={24}
                      className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-[#8C7564] dark:text-[#A8988A] mt-1">
                    3–24 characters: lowercase letters, numbers, and underscores.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
                    Display Name <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cozy Tape Master"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    className="w-full px-3.5 py-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
                    Password <span className="text-amber-700 font-bold">*minimum 8 characters</span>
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7564]" />
                    <input
                      type="password"
                      placeholder="Minimum 8 characters (as long as you want)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
                    Confirm Password <span className="text-amber-700 font-bold">*required</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7564]" />
                    <input
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={8}
                      className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C] text-xs text-[#3E2F26] dark:text-[#F3EDE2] focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-2xl bg-[#B5734C] hover:bg-[#9E603B] disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create Account & Sign In</span>
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
