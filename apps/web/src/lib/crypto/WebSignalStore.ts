// @ts-nocheck
import { openDB, IDBPDatabase } from 'idb';
import {
  SignalProtocolStore,
  IdentityKeyPair,
  PreKeyRecordType,
  SignedPreKeyRecordType,
  SessionRecordType,
  Direction
} from '@privacyresearch/libsignal-protocol-typescript';

export class WebSignalStore implements SignalProtocolStore {
  private dbName = 'signal_store';
  private dbVersion = 1;
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(this.dbName, this.dbVersion, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('identityKey')) db.createObjectStore('identityKey');
        if (!db.objectStoreNames.contains('registrationId')) db.createObjectStore('registrationId');
        if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions');
        if (!db.objectStoreNames.contains('preKeys')) db.createObjectStore('preKeys');
        if (!db.objectStoreNames.contains('signedPreKeys')) db.createObjectStore('signedPreKeys');
        if (!db.objectStoreNames.contains('identityKeys')) db.createObjectStore('identityKeys'); // Stores trusted keys of others
      }
    });
  }

  // --- Identity ---
  async getIdentityKeyPair(): Promise<IdentityKeyPair | undefined> {
    const db = await this.dbPromise;
    return db.get('identityKey', 'keyPair');
  }

  async getLocalRegistrationId(): Promise<number | undefined> {
    const db = await this.dbPromise;
    return db.get('registrationId', 'id');
  }

  async saveIdentityKeyPair(keyPair: IdentityKeyPair): Promise<void> {
    const db = await this.dbPromise;
    await db.put('identityKey', keyPair, 'keyPair');
  }

  async saveLocalRegistrationId(id: number): Promise<void> {
    const db = await this.dbPromise;
    await db.put('registrationId', id, 'id');
  }

  // --- Trusted Identity (TOFU) ---
  async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer, direction: Direction): Promise<boolean> {
    const db = await this.dbPromise;
    const trusted = await db.get('identityKeys', identifier);
    if (!trusted) return true; // Trust on first use
    
    // Compare bytes
    const trustedBytes = new Uint8Array(trusted as ArrayBuffer);
    const newBytes = new Uint8Array(identityKey);
    if (trustedBytes.length !== newBytes.length) return false;
    for (let i = 0; i < trustedBytes.length; i++) {
      if (trustedBytes[i] !== newBytes[i]) return false;
    }
    return true;
  }

  async loadIdentityKey(identifier: string): Promise<ArrayBuffer | undefined> {
    const db = await this.dbPromise;
    return db.get('identityKeys', identifier);
  }

  async saveIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean> {
    const db = await this.dbPromise;
    const existing = await db.get('identityKeys', identifier);
    if (existing) {
      // Compare arrays
      const existingBytes = new Uint8Array(existing as ArrayBuffer);
      const newBytes = new Uint8Array(identityKey);
      let match = existingBytes.length === newBytes.length;
      if (match) {
        for (let i = 0; i < existingBytes.length; i++) {
          if (existingBytes[i] !== newBytes[i]) match = false;
        }
      }
      if (match) return false; // Already trusted and matches
    }
    await db.put('identityKeys', identityKey, identifier);
    return true;
  }

  // --- PreKeys ---
  async loadPreKey(keyId: number | string): Promise<PreKeyRecordType | undefined> {
    const db = await this.dbPromise;
    const res = await db.get('preKeys', keyId);
    if (res) return res as PreKeyRecordType;
    return undefined;
  }

  async storePreKey(keyId: number | string, keyRecord: PreKeyRecordType): Promise<void> {
    const db = await this.dbPromise;
    await db.put('preKeys', keyRecord, keyId);
  }

  async removePreKey(keyId: number | string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('preKeys', keyId);
  }

  // --- Signed PreKeys ---
  async loadSignedPreKey(keyId: number | string): Promise<SignedPreKeyRecordType | undefined> {
    const db = await this.dbPromise;
    const res = await db.get('signedPreKeys', keyId);
    if (res) return res as SignedPreKeyRecordType;
    return undefined;
  }

  async storeSignedPreKey(keyId: number | string, keyRecord: SignedPreKeyRecordType): Promise<void> {
    const db = await this.dbPromise;
    await db.put('signedPreKeys', keyRecord, keyId);
  }

  async removeSignedPreKey(keyId: number | string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('signedPreKeys', keyId);
  }

  // --- Sessions ---
  async loadSession(identifier: string): Promise<SessionRecordType | undefined> {
    const db = await this.dbPromise;
    const res = await db.get('sessions', identifier);
    if (res) return res as SessionRecordType;
    return undefined;
  }

  async storeSession(identifier: string, record: SessionRecordType): Promise<void> {
    const db = await this.dbPromise;
    await db.put('sessions', record, identifier);
  }

  async removeSession(identifier: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('sessions', identifier);
  }

  async removeAllSessions(identifier: string): Promise<void> {
    const db = await this.dbPromise;
    const keys = await db.getAllKeys('sessions');
    const tx = db.transaction('sessions', 'readwrite');
    for (const key of keys) {
      if ((key as string).startsWith(identifier)) {
        tx.store.delete(key);
      }
    }
    await tx.done;
  }

  // Utility to check if store is populated
  async isInitialized(): Promise<boolean> {
    const id = await this.getLocalRegistrationId();
    return id !== undefined;
  }
}
