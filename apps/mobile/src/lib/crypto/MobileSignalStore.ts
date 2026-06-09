import EncryptedStorage from 'react-native-encrypted-storage';
type SignalProtocolStore = any;
type IdentityKeyPair = any;
type PreKeyRecordType = any;
type SignedPreKeyRecordType = any;
type SessionRecordType = any;
type Direction = number;

export class MobileSignalStore implements SignalProtocolStore {
  // Helper to convert objects with ArrayBuffers to base64 JSON for storage
  private async setItem(key: string, value: unknown): Promise<void> {
    const jsonValue = JSON.stringify(value, (k, v) => {
      if (v instanceof ArrayBuffer) {
        return { type: 'Buffer', data: Array.from(new Uint8Array(v)) };
      }
      return v;
    });
    await EncryptedStorage.setItem(key, jsonValue);
  }

  private async getItem<T>(key: string): Promise<T | undefined> {
    const jsonValue = await EncryptedStorage.getItem(key);
    if (!jsonValue) return undefined;
    
    return JSON.parse(jsonValue, (k, v) => {
      if (v && v.type === 'Buffer' && Array.isArray(v.data)) {
        return new Uint8Array(v.data).buffer;
      }
      return v;
    });
  }

  private async removeItem(key: string): Promise<void> {
    await EncryptedStorage.removeItem(key);
  }

  // --- Identity ---
  async getIdentityKeyPair(): Promise<IdentityKeyPair | undefined> {
    return this.getItem<IdentityKeyPair>('identityKey');
  }

  async getLocalRegistrationId(): Promise<number | undefined> {
    return this.getItem<number>('registrationId');
  }

  async saveIdentityKeyPair(keyPair: IdentityKeyPair): Promise<void> {
    await this.setItem('identityKey', keyPair);
  }

  async saveLocalRegistrationId(id: number): Promise<void> {
    await this.setItem('registrationId', id);
  }

  // --- Trusted Identity (TOFU) ---
  async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer, direction: Direction): Promise<boolean> {
    const trusted = await this.getItem<ArrayBuffer>(`identityKeys_${identifier}`);
    if (!trusted) return true; // Trust on first use
    
    const trustedBytes = new Uint8Array(trusted);
    const newBytes = new Uint8Array(identityKey);
    if (trustedBytes.length !== newBytes.length) return false;
    for (let i = 0; i < trustedBytes.length; i++) {
      if (trustedBytes[i] !== newBytes[i]) return false;
    }
    return true;
  }

  async loadIdentityKey(identifier: string): Promise<ArrayBuffer | undefined> {
    return this.getItem<ArrayBuffer>(`identityKeys_${identifier}`);
  }

  async saveIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean> {
    const existing = await this.getItem<ArrayBuffer>(`identityKeys_${identifier}`);
    if (existing) {
      const existingBytes = new Uint8Array(existing);
      const newBytes = new Uint8Array(identityKey);
      let match = existingBytes.length === newBytes.length;
      if (match) {
        for (let i = 0; i < existingBytes.length; i++) {
          if (existingBytes[i] !== newBytes[i]) match = false;
        }
      }
      if (match) return false;
    }
    await this.setItem(`identityKeys_${identifier}`, identityKey);
    return true;
  }

  // --- PreKeys ---
  async loadPreKey(keyId: number | string): Promise<PreKeyRecordType | undefined> {
    return this.getItem<PreKeyRecordType>(`preKey_${keyId}`);
  }

  async storePreKey(keyId: number | string, keyRecord: PreKeyRecordType): Promise<void> {
    await this.setItem(`preKey_${keyId}`, keyRecord);
  }

  async removePreKey(keyId: number | string): Promise<void> {
    await this.removeItem(`preKey_${keyId}`);
  }

  // --- Signed PreKeys ---
  async loadSignedPreKey(keyId: number | string): Promise<SignedPreKeyRecordType | undefined> {
    return this.getItem<SignedPreKeyRecordType>(`signedPreKey_${keyId}`);
  }

  async storeSignedPreKey(keyId: number | string, keyRecord: SignedPreKeyRecordType): Promise<void> {
    await this.setItem(`signedPreKey_${keyId}`, keyRecord);
  }

  async removeSignedPreKey(keyId: number | string): Promise<void> {
    await this.removeItem(`signedPreKey_${keyId}`);
  }

  // --- Sessions ---
  async loadSession(identifier: string): Promise<SessionRecordType | undefined> {
    return this.getItem<SessionRecordType>(`session_${identifier}`);
  }

  async storeSession(identifier: string, record: SessionRecordType): Promise<void> {
    await this.setItem(`session_${identifier}`, record);
  }

  async removeSession(identifier: string): Promise<void> {
    await this.removeItem(`session_${identifier}`);
  }

  async removeAllSessions(identifier: string): Promise<void> {
    // EncryptedStorage doesn't easily let us query all keys, but we usually know the identifier.
    // Real implementation would manage a list of active session identifiers.
    await this.removeItem(`session_${identifier}`);
  }

  async isInitialized(): Promise<boolean> {
    const id = await this.getLocalRegistrationId();
    return id !== undefined;
  }
}
