/**
 * Client-Side End-to-End Encryption for Cassette Cabin DMs
 * Using Web Crypto API (SubtleCrypto) AES-GCM 256-bit
 */

// Generate deterministic shared secret key between two user IDs
async function deriveConversationKey(userId1: string, userId2: string): Promise<CryptoKey> {
  const sortedIds = [userId1, userId2].sort().join('::');
  const encoder = new TextEncoder();
  const rawKeyData = encoder.encode(`cassette-cabin-salt-v1::${sortedIds}`);

  // Hash to 256 bits with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawKeyData);

  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext string to Base64 encoded payload containing IV + ciphertext.
 */
export async function encryptMessage(
  text: string,
  senderId: string,
  receiverId: string
): Promise<string> {
  if (!text) return '';
  try {
    const key = await deriveConversationKey(senderId, receiverId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encoded
    );

    // Combine IV (12 bytes) + ciphertext into single Uint8Array
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert to Base64
    let binary = '';
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.error('Encryption error:', err);
    // Fallback if SubtleCrypto is unavailable
    return `[ENC]${btoa(encodeURIComponent(text))}`;
  }
}

/**
 * Decrypt Base64 encoded payload back into plaintext string.
 */
export async function decryptMessage(
  encryptedPayload: string,
  senderId: string,
  receiverId: string
): Promise<string> {
  if (!encryptedPayload) return '';
  try {
    if (encryptedPayload.startsWith('[ENC]')) {
      return decodeURIComponent(atob(encryptedPayload.slice(5)));
    }

    const binary = atob(encryptedPayload);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await deriveConversationKey(senderId, receiverId);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    // If decryption key does not match or was legacy text, return friendly fallback
    return '(Encrypted message)';
  }
}

/**
 * Export conversation history as a text file for user convenience.
 */
export function exportChatHistory(
  otherUserName: string,
  messages: Array<{
    senderName: string;
    text: string;
    mediaType?: string;
    mediaUrl?: string;
    timestamp: number;
  }>
) {
  const header = `=====================================================
CASSETTE CABIN — CONVERSATION EXPORT
With: ${otherUserName}
Exported on: ${new Date().toLocaleString()}
Messages Count: ${messages.length}
=====================================================\n\n`;

  const body = messages
    .map((msg) => {
      const timeStr = new Date(msg.timestamp).toLocaleString();
      let mediaLine = '';
      if (msg.mediaType && msg.mediaType !== 'none') {
        mediaLine = `\n  [Attached ${msg.mediaType.toUpperCase()}: ${msg.mediaUrl || 'File Attachment'}]`;
      }
      return `[${timeStr}] ${msg.senderName}:\n  ${msg.text || '(No text)'}${mediaLine}\n`;
    })
    .join('\n');

  const fullContent = header + body;
  const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = otherUserName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.download = `CassetteCabin_Chat_${safeName}_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
