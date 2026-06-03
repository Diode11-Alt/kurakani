import EncryptedStorage from 'react-native-encrypted-storage';

export const saveMessage = async (msg: any) => {
  if (!msg.id) msg.id = Date.now().toString(); // Ensure ID exists
  const key = `msg_${msg.conversationId}_${msg.id}`;
  await EncryptedStorage.setItem(key, JSON.stringify(msg));

  const indexKey = `msg_index_${msg.conversationId}`;
  const indexStr = await EncryptedStorage.getItem(indexKey);
  const messageKeys: string[] = indexStr ? JSON.parse(indexStr) : [];
  if (!messageKeys.includes(key)) {
    messageKeys.push(key);
    await EncryptedStorage.setItem(indexKey, JSON.stringify(messageKeys));
  }
};

export const getMessages = async (conversationId: string) => {
  // EncryptedStorage doesn't have getAllKeys natively, we can use AsyncStorage for indexing
  // Wait, EncryptedStorage does not support getAllKeys or multiGet.
  // We need to store an index of messages per conversation in EncryptedStorage.
  const indexStr = await EncryptedStorage.getItem(`msg_index_${conversationId}`);
  const messageKeys: string[] = indexStr ? JSON.parse(indexStr) : [];
  
  if (messageKeys.length === 0) return [];
  
  const messages = [];
  for (const key of messageKeys) {
    const val = await EncryptedStorage.getItem(key);
    if (val) messages.push(JSON.parse(val));
  }
  
  messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  return messages;
};

export class CryptoStore {
  // Store the shared secret per conversation as a base64 string
  static async saveSharedSecret(userId: string, secretBase64: string): Promise<void> {
    await EncryptedStorage.setItem(`shared_secret_${userId}`, secretBase64);
  }

  static async getSharedSecret(userId: string): Promise<string | null> {
    return EncryptedStorage.getItem(`shared_secret_${userId}`);
  }

  static async clearSharedSecret(userId: string): Promise<void> {
    await EncryptedStorage.removeItem(`shared_secret_${userId}`);
  }
}
