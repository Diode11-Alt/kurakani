import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric + underscore'),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (E.164)').optional(),
  serverPayload: z.object({
    registrationId: z.number().int().min(0).max(16383),
    identityKey: z.string().min(1),
    signedPreKey: z.object({
      keyId: z.number().int(),
      publicKey: z.string().min(1),
      signature: z.string().min(1),
    }),
    preKeys: z.array(z.object({
      keyId: z.number().int(),
      publicKey: z.string().min(1),
    })).optional(),
    oneTimePreKeys: z.array(z.object({
      keyId: z.number().int(),
      publicKey: z.string().min(1),
    })).optional(),
  }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  serverPayload: z.object({
    registrationId: z.number().int(),
    identityKey: z.string().min(1),
    signedPreKey: z.object({
      keyId: z.number().int(),
      publicKey: z.string().min(1),
      signature: z.string().min(1),
    }),
    preKeys: z.array(z.object({
      keyId: z.number().int(),
      publicKey: z.string().min(1),
    })).optional(),
    oneTimePreKeys: z.array(z.object({
      keyId: z.number().int(),
      publicKey: z.string().min(1),
    })).optional(),
  }),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─── Key Distribution ─────────────────────────────────────

export const keyBundleSchema = z.object({
  identityKey: z.string().min(1),
  signedPreKey: z.object({
    keyId: z.number().int(),
    publicKey: z.string().min(1),
    signature: z.string().min(1),
  }),
  oneTimePreKeys: z.array(z.object({
    keyId: z.number().int(),
    publicKey: z.string().min(1),
  })).min(1).max(100),
});

export const additionalPreKeysSchema = z.object({
  oneTimePreKeys: z.array(z.object({
    keyId: z.number().int(),
    publicKey: z.string().min(1),
  })).min(1).max(100),
});

// ─── Messages ─────────────────────────────────────────────

export const sendMessageSchema = z.object({
  recipientId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  ciphertext: z.string().min(1),
  ciphertextType: z.number().int().min(1).max(3),
  contentType: z.enum(['text', 'attachment', 'call', 'reaction']).default('text'),
  sealedSender: z.string().optional(),
  timestamp: z.number().int().optional(),
  expiresIn: z.number().int().optional(), // In seconds
});

// ─── Settings ─────────────────────────────────────────────

export const privacySettingsSchema = z.object({
  lastSeen: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  readReceipts: z.boolean().optional(),
  profilePhotoVisibility: z.enum(['everyone', 'contacts', 'nobody']).optional(),
});

export const notificationSettingsSchema = z.object({
  pushNotifications: z.boolean().optional(),
  notificationPreview: z.boolean().optional(),
});

// ─── Profile ──────────────────────────────────────────────

export const updateProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
});

// ─── Groups ───────────────────────────────────────────────

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string().uuid()).min(1).max(256),
});
