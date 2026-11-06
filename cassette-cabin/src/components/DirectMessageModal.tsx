import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Download,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  Smile,
  ShieldCheck,
  AlertCircle,
  FileText,
  Search,
  Users,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';
import { User, DirectMessage, DecryptedDirectMessage, MediaType } from '../types.ts';
import { encryptMessage, decryptMessage, exportChatHistory } from '../utils/encryption.ts';
import { playPopSound } from '../utils/audioEffects.ts';

interface DirectMessageModalProps {
  currentUser: User;
  recipientUser?: User | null;
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  onSelectUser: (user: User) => void;
}

interface ConversationSummary {
  otherUserId: string;
  lastMessage: DirectMessage;
}

const COZY_GIFS = [
  'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', // cat
  'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif', // coffee
  'https://media.giphy.com/media/3o7TKTDnUxE0g2fSE8/giphy.gif', // rain
  'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', // fireplace
  'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', // vinyl record
];

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  currentUser,
  recipientUser: initialRecipient,
  isOpen,
  onClose,
  allUsers,
  onSelectUser,
}) => {
  const [activeUser, setActiveUser] = useState<User | null>(initialRecipient || null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [messages, setMessages] = useState<DecryptedDirectMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('none');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [privacyBlocked, setPrivacyBlocked] = useState<string | null>(null);

  // Mobile responsiveness: toggle between chat and sidebar
  const [showMobileChat, setShowMobileChat] = useState<boolean>(!!initialRecipient);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync recipient when changed from outside
  useEffect(() => {
    if (initialRecipient) {
      setActiveUser(initialRecipient);
      setShowMobileChat(true);
    }
  }, [initialRecipient]);

  // Load conversations list for left sidebar
  const loadConversations = async () => {
    try {
      const res = await fetch(`/api/conversations?userId=${encodeURIComponent(currentUser.id)}`);
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, currentUser.id]);

  // If no recipient is selected initially, pick the first active conversation or first friend
  useEffect(() => {
    if (isOpen && !activeUser) {
      if (initialRecipient) {
        setActiveUser(initialRecipient);
      } else if (conversations.length > 0) {
        const firstChatUser = allUsers.find((u) => u.id === conversations[0].otherUserId);
        if (firstChatUser) setActiveUser(firstChatUser);
      } else if (currentUser.friends && currentUser.friends.length > 0) {
        const firstFriend = allUsers.find((u) => u.id === currentUser.friends[0]);
        if (firstFriend) setActiveUser(firstFriend);
      } else {
        const other = allUsers.find((u) => u.id !== currentUser.id);
        if (other) setActiveUser(other);
      }
    }
  }, [isOpen, activeUser, initialRecipient, conversations, currentUser.friends, allUsers]);

  // Check privacy permissions of activeUser
  useEffect(() => {
    if (!activeUser) {
      setPrivacyBlocked(null);
      return;
    }

    if (activeUser.allowMessagingFrom === 'nobody') {
      setPrivacyBlocked(`${activeUser.displayName} does not accept direct messages.`);
    } else if (
      activeUser.allowMessagingFrom === 'friends' &&
      !activeUser.friends.includes(currentUser.id)
    ) {
      setPrivacyBlocked(
        `${activeUser.displayName} only accepts direct messages from friends. Add them as a friend first!`
      );
    } else {
      setPrivacyBlocked(null);
    }
  }, [activeUser, currentUser]);

  // Load and decrypt messages for activeUser
  const loadMessages = async () => {
    if (!activeUser) return;
    try {
      const res = await fetch(
        `/api/messages?userId=${encodeURIComponent(currentUser.id)}&otherUserId=${encodeURIComponent(
          activeUser.id
        )}`
      );
      const data = await res.json();
      if (data.messages) {
        const decryptedList = await Promise.all(
          data.messages.map(async (m: DirectMessage) => {
            const text = await decryptMessage(m.encryptedContent, m.senderId, m.receiverId);
            return {
              ...m,
              decryptedText: text,
            };
          })
        );
        setMessages(decryptedList);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (isOpen && activeUser) {
      loadMessages();
    }
  }, [isOpen, activeUser?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  // Handle switching user from the left sidebar
  const handleSelectChatUser = (user: User) => {
    playPopSound(1.1);
    setActiveUser(user);
    setShowMobileChat(true);
    onSelectUser(user);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || (!textInput.trim() && !mediaUrl) || privacyBlocked || isSending) return;

    playPopSound(1.2);
    setIsSending(true);

    try {
      const encrypted = await encryptMessage(textInput.trim(), currentUser.id, activeUser.id);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: activeUser.id,
          encryptedContent: encrypted,
          mediaType: mediaType !== 'none' ? mediaType : 'none',
          mediaUrl: mediaUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        const newDecrypted: DecryptedDirectMessage = {
          ...data.message,
          decryptedText: textInput.trim(),
        };
        setMessages((prev) => [...prev, newDecrypted]);
        setTextInput('');
        setMediaType('none');
        setMediaUrl('');
        setShowMediaPicker(false);
        setShowGifPicker(false);
        loadConversations();
      } else if (data.error) {
        setPrivacyBlocked(data.error);
      }
    } catch {
      // Error handling
    } finally {
      setIsSending(false);
    }
  };

  // Export Chat History Button
  const handleExportChat = () => {
    if (!activeUser) return;
    playPopSound();
    const exportData = messages.map((m) => ({
      senderName: m.senderId === currentUser.id ? currentUser.displayName : activeUser.displayName,
      text: m.decryptedText,
      mediaType: m.mediaType,
      mediaUrl: m.mediaUrl,
      timestamp: m.timestamp,
    }));
    exportChatHistory(activeUser.displayName, exportData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: MediaType) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setMediaUrl(reader.result);
          setMediaType(type);
          setShowMediaPicker(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter users for sidebar
  const query = sidebarSearch.toLowerCase().trim();
  const activeChatUserIds = new Set(conversations.map((c) => c.otherUserId));
  const friendUserIds = new Set(currentUser.friends || []);

  const matchingUsers = allUsers
    .filter((u) => u.id !== currentUser.id)
    .filter(
      (u) =>
        u.displayName.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        u.tagline.toLowerCase().includes(query)
    );

  // Categorize
  const activeChatList = matchingUsers.filter((u) => activeChatUserIds.has(u.id));
  const friendsList = matchingUsers.filter((u) => friendUserIds.has(u.id) && !activeChatUserIds.has(u.id));
  const otherCabinList = matchingUsers.filter((u) => !activeChatUserIds.has(u.id) && !friendUserIds.has(u.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-['Comic_Sans_MS',_'Comic_Sans',_'Comic_Neue',_cursive,_sans-serif]">
      <div className="relative w-full max-w-5xl h-[88vh] flex rounded-3xl bg-[#FBF8F3] dark:bg-[#1E1916] border-2 border-[#E2D7C8] dark:border-[#3D332C] shadow-2xl overflow-hidden">
        {/* ========================================================= */}
        {/* LEFT SIDEBAR: Friends & Active Chats with Search */}
        {/* ========================================================= */}
        <div
          className={`${
            showMobileChat ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 flex-col border-r border-[#E2D7C8] dark:border-[#3D332C] bg-[#F7F2EB] dark:bg-[#231C18] h-full shrink-0`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-[#E2D7C8] dark:border-[#3D332C] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#B5734C]" />
              <h3 className="font-bold text-base text-[#3E2F26] dark:text-[#F3EDE2]">
                Direct Messages
              </h3>
            </div>
            {/* Close button on mobile sidebar */}
            <button
              onClick={() => {
                playPopSound();
                onClose();
              }}
              className="md:hidden p-1.5 rounded-xl bg-[#EADDCB] dark:bg-[#352B23] text-[#7D6656] dark:text-[#D5C8B8]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-[#E2D7C8] dark:border-[#3D332C]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7564]" />
              <input
                type="text"
                placeholder="Search friends & chats..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E1916] border border-[#E2D7C8] dark:border-[#3D332C] text-xs text-[#3E2F26] dark:text-[#F3EDE2] placeholder-[#9C8675] focus:outline-none focus:ring-1 focus:ring-[#B5734C]"
              />
            </div>
          </div>

          {/* User List scrollable area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {/* 1. Active Chats */}
            {activeChatList.length > 0 && (
              <div>
                <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[#8C7564] dark:text-[#A8988A] mb-1">
                  Active Chats ({activeChatList.length})
                </span>
                <div className="space-y-1">
                  {activeChatList.map((user) => {
                    const isSelected = activeUser?.id === user.id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleSelectChatUser(user)}
                        className={`w-full p-2.5 rounded-2xl flex items-center gap-3 text-left transition-all ${
                          isSelected
                            ? 'bg-[#EADDCB] dark:bg-[#3D3128] border border-[#D5C2AB] dark:border-[#524237] shadow-sm'
                            : 'hover:bg-[#EFE7DC] dark:hover:bg-[#2C231E]'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-[#B5734C]"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#231C18] ${
                              user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#3E2F26] dark:text-[#F3EDE2] truncate">
                              {user.displayName}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8C7564] dark:text-[#A8988A] truncate">
                            @{user.username}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Friends */}
            {friendsList.length > 0 && (
              <div>
                <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[#8C7564] dark:text-[#A8988A] mb-1">
                  Friends ({friendsList.length})
                </span>
                <div className="space-y-1">
                  {friendsList.map((user) => {
                    const isSelected = activeUser?.id === user.id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleSelectChatUser(user)}
                        className={`w-full p-2.5 rounded-2xl flex items-center gap-3 text-left transition-all ${
                          isSelected
                            ? 'bg-[#EADDCB] dark:bg-[#3D3128] border border-[#D5C2AB] dark:border-[#524237] shadow-sm'
                            : 'hover:bg-[#EFE7DC] dark:hover:bg-[#2C231E]'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-[#B5734C]"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#231C18] ${
                              user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs text-[#3E2F26] dark:text-[#F3EDE2] truncate block">
                            {user.displayName}
                          </span>
                          <p className="text-[11px] text-[#8C7564] dark:text-[#A8988A] truncate">
                            @{user.username}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. All other Cabin Members */}
            {otherCabinList.length > 0 && (
              <div>
                <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[#8C7564] dark:text-[#A8988A] mb-1">
                  Cabin Members ({otherCabinList.length})
                </span>
                <div className="space-y-1">
                  {otherCabinList.map((user) => {
                    const isSelected = activeUser?.id === user.id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleSelectChatUser(user)}
                        className={`w-full p-2.5 rounded-2xl flex items-center gap-3 text-left transition-all ${
                          isSelected
                            ? 'bg-[#EADDCB] dark:bg-[#3D3128] border border-[#D5C2AB] dark:border-[#524237] shadow-sm'
                            : 'hover:bg-[#EFE7DC] dark:hover:bg-[#2C231E]'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-[#B5734C]"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#231C18] ${
                              user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs text-[#3E2F26] dark:text-[#F3EDE2] truncate block">
                            {user.displayName}
                          </span>
                          <p className="text-[11px] text-[#8C7564] dark:text-[#A8988A] truncate">
                            @{user.username}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {matchingUsers.length === 0 && (
              <div className="text-center py-10 px-4 text-[#8C7564] dark:text-[#A8988A]">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold">No members found</p>
                <p className="text-[11px] mt-1">
                  {sidebarSearch
                    ? 'Try adjusting your search query'
                    : 'Invite friends to register an account in the cabin!'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANE: Active Conversation */}
        {/* ========================================================= */}
        <div
          className={`${
            !showMobileChat ? 'hidden md:flex' : 'flex'
          } flex-1 flex-col h-full bg-[#FBF8F3] dark:bg-[#1E1916]`}
        >
          {activeUser ? (
            <>
              {/* Conversation Header */}
              <div className="p-3 sm:p-4 px-4 sm:px-6 bg-[#F2ECE1] dark:bg-[#2A231E] border-b border-[#E2D7C8] dark:border-[#3D332C] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Back button for mobile */}
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1.5 rounded-xl bg-[#EADDCB] dark:bg-[#352B23] text-[#5A4538] dark:text-[#D5C8B8]"
                    title="Back to conversations"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="relative shrink-0">
                    <img
                      src={activeUser.avatarUrl}
                      alt={activeUser.displayName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#B5734C]"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#F2ECE1] dark:border-[#2A231E] ${
                        activeUser.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm sm:text-base text-[#3E2F26] dark:text-[#F3EDE2]">
                        {activeUser.displayName}
                      </h3>
                      <span className="hidden sm:flex items-center gap-1 text-[10px] text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-950/60 px-2 py-0.5 rounded-full font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        <span>E2E Encrypted</span>
                      </span>
                    </div>
                    <p className="text-xs text-[#8C7564] dark:text-[#A8988A] truncate max-w-[200px] sm:max-w-xs">
                      @{activeUser.username} {activeUser.tagline ? `· ${activeUser.tagline}` : ''}
                    </p>
                  </div>
                </div>

                {/* Right controls: Export Chat + Close */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportChat}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EADDCB] dark:bg-[#382D25] hover:bg-[#E2D2BC] text-[#4A3B32] dark:text-[#EAE0D5] text-xs font-bold transition-colors"
                    title="Download conversation history as a text file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export Chat</span>
                  </button>
                  <button
                    onClick={() => {
                      playPopSound();
                      onClose();
                    }}
                    className="p-1.5 rounded-xl text-[#7D6656] hover:text-[#4A3B32] hover:bg-[#EADDCB]/60"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Message Thread Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FBF8F3]/60 dark:bg-[#1A1412]/60">
                {privacyBlocked && (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{privacyBlocked}</span>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="text-center py-16 text-[#8C7564] dark:text-[#A8988A]">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#F2ECE1] dark:bg-[#2A231E] flex items-center justify-center text-[#B5734C]">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-sm">Quiet tape channel</p>
                    <p className="text-xs mt-1">
                      Say hello to {activeUser.displayName}! Messages are encrypted end-to-end.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.senderId === currentUser.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 sm:p-3.5 shadow-sm text-sm ${
                            isMine
                              ? 'bg-[#B5734C] text-white rounded-br-xs'
                              : 'bg-[#F2ECE1] dark:bg-[#2A231E] text-[#3E2F26] dark:text-[#F3EDE2] border border-[#E2D7C8] dark:border-[#3D332C] rounded-bl-xs'
                          }`}
                        >
                          {/* Media Attachments: GIF, Image, Video, Link */}
                          {m.mediaType === 'image' && m.mediaUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden max-w-sm">
                              <img
                                src={m.mediaUrl}
                                alt="attached"
                                referrerPolicy="no-referrer"
                                className="w-full h-auto max-h-60 object-cover"
                              />
                            </div>
                          )}

                          {m.mediaType === 'gif' && m.mediaUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden max-w-xs">
                              <img
                                src={m.mediaUrl}
                                alt="attached gif"
                                referrerPolicy="no-referrer"
                                className="w-full h-auto max-h-56 object-cover"
                              />
                            </div>
                          )}

                          {m.mediaType === 'video' && m.mediaUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden max-w-sm">
                              <video controls src={m.mediaUrl} className="w-full max-h-60" />
                            </div>
                          )}

                          {m.mediaType === 'link' && m.mediaUrl && (
                            <a
                              href={m.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center gap-1.5 p-2 rounded-xl text-xs font-bold mb-2 underline ${
                                isMine ? 'bg-black/20 text-white' : 'bg-[#EADDCB] text-[#5A4538]'
                              }`}
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                              <span>{m.mediaUrl}</span>
                            </a>
                          )}

                          {/* Text Message */}
                          {m.decryptedText && (
                            <p className="whitespace-pre-wrap leading-relaxed">{m.decryptedText}</p>
                          )}

                          {/* Timestamp */}
                          <div
                            className={`text-[10px] mt-1 text-right font-mono ${
                              isMine ? 'text-white/70' : 'text-[#8C7564] dark:text-[#A8988A]'
                            }`}
                          >
                            {new Date(m.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Media Attachments Picker & GIF Shelf */}
              {showMediaPicker && (
                <div className="p-3 bg-[#EADDCB] dark:bg-[#251E1A] border-t border-[#D5C2AB] dark:border-[#3D332C] flex flex-wrap gap-2 text-xs">
                  {/* Upload Regular Image */}
                  <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E1916] text-[#4A3B32] dark:text-[#EAE0D5] font-bold">
                    <ImageIcon className="w-3.5 h-3.5 text-[#B5734C]" />
                    <span>Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'image')}
                      className="hidden"
                    />
                  </label>

                  {/* Upload Video */}
                  <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E1916] text-[#4A3B32] dark:text-[#EAE0D5] font-bold">
                    <Video className="w-3.5 h-3.5 text-[#B5734C]" />
                    <span>Video</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleFileUpload(e, 'video')}
                      className="hidden"
                    />
                  </label>

                  {/* Attach Link */}
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt('Enter a link or audio URL:');
                      if (url) {
                        setMediaType('link');
                        setMediaUrl(url);
                        setShowMediaPicker(false);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E1916] text-[#4A3B32] dark:text-[#EAE0D5] font-bold"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-[#B5734C]" />
                    <span>Link URL</span>
                  </button>

                  {/* Browse Cozy GIFs */}
                  <button
                    type="button"
                    onClick={() => setShowGifPicker(!showGifPicker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E1916] text-[#4A3B32] dark:text-[#EAE0D5] font-bold"
                  >
                    <Smile className="w-3.5 h-3.5 text-[#B5734C]" />
                    <span>Cozy GIFs</span>
                  </button>
                </div>
              )}

              {/* GIF Picker Strip */}
              {showGifPicker && (
                <div className="p-3 bg-[#F2ECE1] dark:bg-[#201A16] border-t border-[#E2D7C8] dark:border-[#3D332C] flex gap-2 overflow-x-auto">
                  {COZY_GIFS.map((gif, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setMediaType('gif');
                        setMediaUrl(gif);
                        setShowGifPicker(false);
                        setShowMediaPicker(false);
                      }}
                      className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#B5734C] hover:scale-105 transition-transform"
                    >
                      <img src={gif} alt="gif option" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Media Preview Bar */}
              {mediaUrl && (
                <div className="px-4 py-2 bg-[#EADDCB] dark:bg-[#382D25] border-t border-[#D5C2AB] flex items-center justify-between text-xs">
                  <span className="font-bold text-[#4A3B32] dark:text-[#EAE0D5] truncate max-w-sm">
                    Attached {mediaType.toUpperCase()}: {mediaUrl.slice(0, 40)}...
                  </span>
                  <button
                    onClick={() => {
                      setMediaType('none');
                      setMediaUrl('');
                    }}
                    className="text-red-600 hover:underline font-bold"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Message Input Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 bg-[#F2ECE1] dark:bg-[#2A231E] border-t border-[#E2D7C8] dark:border-[#3D332C] flex items-center gap-2"
              >
                {/* Attach button */}
                <button
                  type="button"
                  disabled={!!privacyBlocked}
                  onClick={() => {
                    playPopSound();
                    setShowMediaPicker(!showMediaPicker);
                  }}
                  className="p-2.5 rounded-2xl bg-[#FFFDF9] dark:bg-[#1E1916] text-[#7D6656] hover:text-[#B5734C] border border-[#E2D7C8] dark:border-[#3D332C] transition-colors"
                  title="Attach GIF, video, image, or link"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  disabled={!!privacyBlocked}
                  placeholder={
                    privacyBlocked
                      ? 'Messaging disabled by user preferences'
                      : `Message @${activeUser.username}...`
                  }
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-[#FFFDF9] dark:bg-[#1E1916] border border-[#E2D7C8] dark:border-[#3D332C] text-sm text-[#3E2F26] dark:text-[#F3EDE2] placeholder-[#9C8675] focus:outline-none focus:ring-2 focus:ring-[#B5734C]/50 transition-all disabled:opacity-50"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!!privacyBlocked || isSending || (!textInput.trim() && !mediaUrl)}
                  className="p-2.5 rounded-2xl bg-[#B5734C] hover:bg-[#9E603B] disabled:opacity-40 text-white font-bold transition-all shadow-md active:scale-95"
                  title="Send Message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            /* Empty state when no user is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8C7564] dark:text-[#A8988A]">
              <div className="w-16 h-16 rounded-full bg-[#EADDCB] dark:bg-[#352B23] flex items-center justify-center text-[#B5734C] mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#3E2F26] dark:text-[#F3EDE2] mb-1">
                Your Direct Message Box
              </h3>
              <p className="text-xs max-w-sm mb-4">
                Select a friend or active conversation from the left sidebar to start chatting.
              </p>
              <button
                onClick={() => {
                  playPopSound();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-[#EADDCB] dark:bg-[#382D25] text-xs font-bold text-[#5A4538] dark:text-[#D5C8B8]"
              >
                Close Messages
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
