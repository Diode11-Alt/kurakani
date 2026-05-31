import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Utility to store messages
export const saveMessage = async (msg: any) => {
  if (!msg.id) msg.id = Date.now().toString(); // Ensure ID exists
  await AsyncStorage.setItem(
    `msg_${msg.conversationId}_${msg.id}`,
    JSON.stringify(msg)
  );
};

export const getMessages = async (conversationId: string) => {
  const allKeys = await AsyncStorage.getAllKeys();
  const prefix = `msg_${conversationId}_`;
  const messageKeys = allKeys.filter(k => k.startsWith(prefix));
  
  if (messageKeys.length === 0) return [];
  
  const results = await AsyncStorage.multiGet(messageKeys);
  const messages = results
    .map(req => req[1] ? JSON.parse(req[1]) : null)
    .filter(Boolean)
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    
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
