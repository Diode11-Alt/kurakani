import {
  StorageType,
  Direction,
  KeyPairType,
  SessionRecordType,
} from '@privacyresearch/libsignal-protocol-typescript';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bufferToBase64, base64ToBuffer } from './utils';

const parseJSON = (str: string) => {
  return JSON.parse(str, (key, value) => {
    if (value && typeof value === 'object' && value.type === 'Buffer' && value.data) {
       return base64ToBuffer(value.data); // Just in case
    }
    if (value && typeof value === 'object' && value.__type === 'ArrayBuffer') {
      return base64ToBuffer(value.data);
    }
    return value;
  });
};

const stringifyJSON = (obj: any) => {
  return JSON.stringify(obj, (key, value) => {
    if (value instanceof ArrayBuffer) {
      return { __type: 'ArrayBuffer', data: bufferToBase64(value) };
    }
    // Also handle Uint8Array or Buffer if they sneak in
    if (value && value.buffer instanceof ArrayBuffer && value.byteLength !== undefined) {
      return { __type: 'ArrayBuffer', data: bufferToBase64(value.buffer) };
    }
    return value;
  });
};

export class SignalProtocolStore implements StorageType {
  
  async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
    const data = await AsyncStorage.getItem('keys:localIdentity');
    if (!data) return undefined;
    return parseJSON(data);
  }

  async getLocalRegistrationId(): Promise<number | undefined> {
    const data = await AsyncStorage.getItem('keys:localRegistrationId');
    if (!data) return undefined;
    return parseInt(data, 10);
  }

  async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer, direction: Direction): Promise<boolean> {
    return Promise.resolve(true);
  }

  async saveIdentity(encodedAddress: string, publicKey: ArrayBuffer, nonblockingApproval?: boolean): Promise<boolean> {
    await AsyncStorage.setItem(`keys:identityKey_${encodedAddress}`, stringifyJSON(publicKey));
    return true;
  }

  async loadPreKey(keyId: string | number): Promise<KeyPairType | undefined> {
    const data = await AsyncStorage.getItem(`keys:preKey_${keyId}`);
    if (!data) return undefined;
    return parseJSON(data);
  }

  async storePreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    await AsyncStorage.setItem(`keys:preKey_${keyId}`, stringifyJSON(keyPair));
  }

  async removePreKey(keyId: string | number): Promise<void> {
    await AsyncStorage.removeItem(`keys:preKey_${keyId}`);
  }

  async loadSignedPreKey(keyId: string | number): Promise<KeyPairType | undefined> {
    const data = await AsyncStorage.getItem(`keys:signedPreKey_${keyId}`);
    if (!data) return undefined;
    return parseJSON(data);
  }

  async storeSignedPreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    await AsyncStorage.setItem(`keys:signedPreKey_${keyId}`, stringifyJSON(keyPair));
  }

  async removeSignedPreKey(keyId: string | number): Promise<void> {
    await AsyncStorage.removeItem(`keys:signedPreKey_${keyId}`);
  }

  async loadSession(encodedAddress: string): Promise<SessionRecordType | undefined> {
    const data = await AsyncStorage.getItem(`sessions:${encodedAddress}`);
    if (!data) return undefined;
    const parsed = parseJSON(data);
    return parsed.record;
  }

  async storeSession(encodedAddress: string, record: SessionRecordType): Promise<void> {
    await AsyncStorage.setItem(`sessions:${encodedAddress}`, stringifyJSON({
      remoteUserId: encodedAddress,
      record: record,
      establishedAt: Date.now()
    }));
  }
}

// Utility to store messages
export const saveMessage = async (msg: any) => {
  const existingStr = await AsyncStorage.getItem(`messages_${msg.conversationId}`);
  const existing = existingStr ? parseJSON(existingStr) : [];
  existing.push(msg);
  await AsyncStorage.setItem(`messages_${msg.conversationId}`, stringifyJSON(existing));
};

export const getMessages = async (conversationId: string) => {
  const existingStr = await AsyncStorage.getItem(`messages_${conversationId}`);
  return existingStr ? parseJSON(existingStr) : [];
};
