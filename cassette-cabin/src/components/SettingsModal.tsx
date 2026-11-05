import React, { useState } from 'react';
import { X, Sun, Moon, Shield, Check, AlertTriangle, Lock, Key, ShieldCheck, AlertCircle } from 'lucide-react';
import { User, MessagingPrivacy } from '../types.ts';
import { playPopSound, playFlashbangSound } from '../utils/audioEffects.ts';

interface SettingsModalProps {
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleTheme: (enableDark: boolean) => void;
  onUpdatePrivacy?: (privacy: MessagingPrivacy) => void;
  onSwitchAccount?: () => void;
  onUpdatePassword?: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  isDarkMode,
  onToggleTheme,
  onUpdatePrivacy,
  onSwitchAccount,
  onUpdatePassword,
}) => {
  const [showFlashbangWarning, setShowFlashbangWarning] = useState(false);
  const [isFlashbanged, setIsFlashbanged] = useState(false);

  // Password Settings state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  if (!isOpen) return null;

  const handleLightModeClick = () => {
    playPopSound(1.2);
    if (isDarkMode) {
      setShowFlashbangWarning(true);
    }
  };

  const handleDarkModeClick = () => {
    playPopSound(0.9);
    onToggleTheme(true);
  };

  const handleConfirmFlashbang = () => {
    playFlashbangSound();
    setIsFlashbanged(true);
    setTimeout(() => {
      onToggleTheme(false);
      setShowFlashbangWarning(false);
      setIsFlashbanged(false);
    }, 450);
  };

  const handleCancelFlashbang = () => {
    playPopSound();
    setShowFlashbangWarning(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!newPassword || newPassword.length < 4) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 4 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    if (!onUpdatePassword) return;

    setIsSavingPassword(true);
    playPopSound(1.2);
    try {
      const result = await onUpdatePassword(currentPassword, newPassword);
      if (result.success) {
        setPasswordStatus({ type: 'success', message: 'Password saved successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setShowPasswordForm(false), 2000);
      } else {
        setPasswordStatus({ type: 'error', message: result.message || 'Failed to update password' });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPasswordStatus({ type: 'error', message: err.message });
      } else {
        setPasswordStatus({ type: 'error', message: 'Failed to update password' });
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[#FBF8F3] dark:bg-[#201A16] border-2 border-[#E2D7C8] dark:border-[#3D332C] shadow-2xl p-6 sm:p-7">
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
            Cabin Settings
          </h2>
          <p className="text-xs text-[#7D6656] dark:text-[#BFAF9F] mb-6">
            Configure your messaging privacy, account password, and theme.
          </p>

          <div className="space-y-6">
            {/* ALLOW MESSAGING FROM: [Everyone], [Friends], [Nobody] */}
            {currentUser && (
              <div>
                <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-2 uppercase tracking-wider">
                  Allow Messaging From:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['everyone', 'friends', 'nobody'] as MessagingPrivacy[]).map((option) => {
                    const isSelected = currentUser.allowMessagingFrom === option;
                    return (
                      <button
                        key={option}
                        onClick={() => {
                          playPopSound();
                          onUpdatePrivacy?.(option);
                        }}
                        className={`py-2 px-3 rounded-2xl text-xs font-bold border transition-all capitalize ${
                          isSelected
                            ? 'bg-[#B5734C] text-white border-[#B5734C] shadow-sm'
                            : 'bg-[#F2ECE1] dark:bg-[#2A231E] text-[#5A4538] dark:text-[#D5C8B8] border-[#E2D7C8] dark:border-[#3D332C] hover:bg-[#EADDCB]'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PASSWORD SETTINGS */}
            {currentUser && onUpdatePassword && (
              <div className="p-4 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] border border-[#E2D7C8] dark:border-[#3D332C]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#B5734C]" />
                    <span className="text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] uppercase tracking-wider">
                      Password & Security
                    </span>
                  </div>

                  <span className="text-[11px] font-bold flex items-center gap-1">
                    {currentUser.hasPassword ? (
                      <span className="text-green-700 dark:text-green-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Protected</span>
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400">
                        No password set
                      </span>
                    )}
                  </span>
                </div>

                <p className="text-xs text-[#7D6656] dark:text-[#BFAF9F] mb-3">
                  {currentUser.hasPassword
                    ? 'Your account has a password enabled for secure sign-ins.'
                    : 'Set a password to protect your account and sign-in securely.'}
                </p>

                {passwordStatus && (
                  <div
                    className={`mb-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      passwordStatus.type === 'success'
                        ? 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-200 border border-green-300'
                        : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 border border-red-300'
                    }`}
                  >
                    {passwordStatus.type === 'success' ? (
                      <Check className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{passwordStatus.message}</span>
                  </div>
                )}

                {!showPasswordForm ? (
                  <button
                    type="button"
                    onClick={() => {
                      playPopSound();
                      setShowPasswordForm(true);
                      setPasswordStatus(null);
                    }}
                    className="w-full py-2 rounded-xl bg-[#EADDCB] dark:bg-[#382D25] hover:bg-[#E2D2BC] text-[#4A3B32] dark:text-[#EAE0D5] font-bold text-xs transition-colors"
                  >
                    {currentUser.hasPassword ? 'Change Password' : 'Set Account Password'}
                  </button>
                ) : (
                  <form onSubmit={handlePasswordSubmit} className="space-y-3 pt-2">
                    {currentUser.hasPassword && (
                      <div>
                        <label className="block text-[11px] font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E1916] border border-[#E2D7C8] dark:border-[#3D332C] text-xs focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
                        New Password (min 4 characters)
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E1916] border border-[#E2D7C8] dark:border-[#3D332C] text-xs focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                        required
                        minLength={4}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full px-3 py-1.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E1916] border border-[#E2D7C8] dark:border-[#3D332C] text-xs focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
                        required
                        minLength={4}
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          playPopSound();
                          setShowPasswordForm(false);
                          setPasswordStatus(null);
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-[#EADDCB] dark:bg-[#382D25] text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingPassword}
                        className="flex-1 py-1.5 rounded-xl bg-[#B5734C] hover:bg-[#9E603B] disabled:opacity-50 text-white font-bold text-xs shadow-sm"
                      >
                        Save Password
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* LIGHT MODE/DARK MODE: [Light] [Dark] */}
            <div>
              <label className="block text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8] mb-2 uppercase tracking-wider">
                Light Mode / Dark Mode:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Light Mode Button */}
                <button
                  onClick={handleLightModeClick}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold border transition-all ${
                    !isDarkMode
                      ? 'bg-[#B5734C] text-white border-[#B5734C] shadow-sm'
                      : 'bg-[#F2ECE1] dark:bg-[#2A231E] text-[#5A4538] dark:text-[#D5C8B8] border-[#E2D7C8] dark:border-[#3D332C] hover:bg-[#EADDCB]'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light</span>
                </button>

                {/* Dark Mode Button */}
                <button
                  onClick={handleDarkModeClick}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold border transition-all ${
                    isDarkMode
                      ? 'bg-[#B5734C] text-white border-[#B5734C] shadow-sm'
                      : 'bg-[#F2ECE1] dark:bg-[#2A231E] text-[#5A4538] dark:text-[#D5C8B8] border-[#E2D7C8] dark:border-[#3D332C] hover:bg-[#EADDCB]'
                  }`}
                >
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* Account Management & Sign Out / Switch */}
            {currentUser && onSwitchAccount && (
              <div className="pt-4 border-t border-[#E2D7C8] dark:border-[#3D332C]">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#4A3B32] dark:text-[#EAE0D5] block">
                      Signed in as {currentUser.displayName}
                    </span>
                    <span className="text-[#8C7564]">{currentUser.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      playPopSound();
                      onSwitchAccount();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#EADDCB] dark:bg-[#382D25] text-[#4A3B32] dark:text-[#EAE0D5] font-bold text-xs hover:bg-[#E2D2BC]"
                  >
                    Switch Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Humorous Flashbang Confirmation Popup Modal */}
      {showFlashbangWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-[#FFFDF9] dark:bg-[#1E1916] border-3 border-[#B5734C] p-6 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-500 animate-bounce">
              <Sun className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-[#3E2F26] dark:text-[#F3EDE2] mb-2">
              Are you sure you want to get flashbanged?
            </h3>
            <p className="text-xs text-[#7D6656] dark:text-[#BFAF9F] mb-6">
              Switching from cozy dark to ultra-bright pastel light mode might illuminate your entire room!
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleConfirmFlashbang}
                className="w-full py-2.5 rounded-2xl bg-[#B5734C] hover:bg-[#9E603B] text-white font-bold text-sm shadow-lg transition-transform active:scale-95"
              >
                *get flashbanged*
              </button>

              <button
                onClick={handleCancelFlashbang}
                className="w-full py-2 rounded-2xl bg-[#EADDCB] dark:bg-[#382D25] text-[#4A3B32] dark:text-[#EAE0D5] font-bold text-xs hover:bg-[#E2D2BC] transition-colors"
              >
                Hmm... I'd rather not.
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blinding Flashbang Screen Effect */}
      {isFlashbanged && (
        <div className="fixed inset-0 z-[70] bg-white pointer-events-none animate-ping duration-300" />
      )}
    </>
  );
};
