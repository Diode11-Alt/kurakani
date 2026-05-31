import {
  pgTable, uuid, text, varchar, boolean,
  timestamp, integer, jsonb, index, uniqueIndex
} from 'drizzle-orm/pg-core';

// ─── USERS ────────────────────────────────────────────────
export const users = pgTable('users', {
  id:              uuid('id').defaultRandom().primaryKey(),
  email:           varchar('email', { length: 255 }).unique().notNull(),
  passwordHash:    varchar('password_hash', { length: 255 }).notNull(),
  phoneNumber:     varchar('phone_number', { length: 20 }).unique(),
  username:        varchar('username', { length: 50 }).unique(),
  displayName:     varchar('display_name', { length: 100 }),
  avatarUrl:       text('avatar_url'),
  profileKey:      text('profile_key'),          // E2EE profile key (base64)
  registrationId:  integer('registration_id').notNull(),
  createdAt:       timestamp('created_at').defaultNow(),
  lastSeenAt:      timestamp('last_seen_at'),
  isActive:        boolean('is_active').default(true),
}, t => ({
  emailIdx: index('users_email_idx').on(t.email),
  phoneIdx: index('users_phone_idx').on(t.phoneNumber),
}));

// ─── IDENTITY KEYS (Signal Protocol) ──────────────────────
export const identityKeys = pgTable('identity_keys', {
  id:              uuid('id').defaultRandom().primaryKey(),
  userId:          uuid('user_id').references(() => users.id).notNull(),
  deviceId:        integer('device_id').notNull(),
  identityKey:     text('identity_key').notNull(),       // IK public (base64)
  signedPreKey:    jsonb('signed_pre_key').notNull(),    // { keyId, publicKey, signature }
  createdAt:       timestamp('created_at').defaultNow(),
}, t => ({
  userDeviceIdx: uniqueIndex('identity_keys_user_device_idx').on(t.userId, t.deviceId),
}));

// ─── ONE-TIME PREKEYS ──────────────────────────────────────
export const oneTimePreKeys = pgTable('one_time_pre_keys', {
  id:              uuid('id').defaultRandom().primaryKey(),
  userId:          uuid('user_id').references(() => users.id).notNull(),
  deviceId:        integer('device_id').notNull(),
  keyId:           integer('key_id').notNull(),
  publicKey:       text('public_key').notNull(),          // base64
  used:            boolean('used').default(false),
  createdAt:       timestamp('created_at').defaultNow(),
});

// ─── SESSIONS ─────────────────────────────────────────────
export const sessions = pgTable('sessions', {
  id:              uuid('id').defaultRandom().primaryKey(),
  userId:          uuid('user_id').references(() => users.id).notNull(),
  deviceId:        integer('device_id').notNull(),
  token:           text('token').notNull().unique(),
  pushToken:       text('push_token'),
  platform:        varchar('platform', { length: 10 }), // ios | android | web
  expiresAt:       timestamp('expires_at').notNull(),
  createdAt:       timestamp('created_at').defaultNow(),
});

// ─── CONVERSATIONS ─────────────────────────────────────────
export const conversations = pgTable('conversations', {
  id:              uuid('id').defaultRandom().primaryKey(),
  type:            varchar('type', { length: 10 }).notNull(), // direct | group
  name:            varchar('name', { length: 100 }),          // for groups
  avatarUrl:       text('avatar_url'),
  createdBy:       uuid('created_by').references(() => users.id),
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow(),
});

export const conversationMembers = pgTable('conversation_members', {
  conversationId:  uuid('conversation_id').references(() => conversations.id).notNull(),
  userId:          uuid('user_id').references(() => users.id).notNull(),
  role:            varchar('role', { length: 10 }).default('member'), // admin | member
  joinedAt:        timestamp('joined_at').defaultNow(),
  lastReadAt:      timestamp('last_read_at'),
}, t => ({
  pk: uniqueIndex('conv_members_pk').on(t.conversationId, t.userId),
}));

// ─── MESSAGES ─────────────────────────────────────────────
export const messages = pgTable('messages', {
  id:              uuid('id').defaultRandom().primaryKey(),
  conversationId:  uuid('conversation_id').references(() => conversations.id).notNull(),
  senderId:        uuid('sender_id').references(() => users.id).notNull(),
  // Ciphertext only — server NEVER stores plaintext
  ciphertext:      text('ciphertext').notNull(),         // base64 Signal ciphertext
  ciphertextType:  integer('ciphertext_type').notNull(), // 1=PreKey 3=Whisper
  senderKeyDistributionMessage: text('skdm'),            // for groups
  contentType:     varchar('content_type', { length: 20 }).default('text'),
  // Sealed sender envelope
  sealedSender:    text('sealed_sender'),
  expiresAt:       timestamp('expires_at'),
  sentAt:          timestamp('sent_at').defaultNow(),
  deliveredAt:     timestamp('delivered_at'),
  readAt:          timestamp('read_at'),
  isDeleted:       boolean('is_deleted').default(false),
}, t => ({
  convIdx: index('messages_conv_idx').on(t.conversationId, t.sentAt),
}));

// ─── CALL RECORDS ─────────────────────────────────────────
export const callRecords = pgTable('call_records', {
  id:              uuid('id').defaultRandom().primaryKey(),
  conversationId:  uuid('conversation_id').references(() => conversations.id).notNull(),
  initiatorId:     uuid('initiator_id').references(() => users.id).notNull(),
  callType:        varchar('call_type', { length: 10 }).notNull(), // audio | video
  status:          varchar('status', { length: 20 }).notNull(),    // completed | missed | rejected | failed
  startedAt:       timestamp('started_at'),
  endedAt:         timestamp('ended_at'),
  durationSeconds: integer('duration_seconds'),
  createdAt:       timestamp('created_at').defaultNow(),
});

// ─── ATTACHMENTS (metadata only; binary in S3 E2EE) ───────
export const attachments = pgTable('attachments', {
  id:              uuid('id').defaultRandom().primaryKey(),
  messageId:       uuid('message_id').references(() => messages.id).notNull(),
  uploadedBy:      uuid('uploaded_by').references(() => users.id).notNull(),
  s3Key:           text('s3_key').notNull(),
  contentType:     varchar('content_type', { length: 50 }),
  sizeBytes:       integer('size_bytes'),
  // Encryption metadata (client stores decryption key in E2EE message)
  iv:              text('iv').notNull(),
  createdAt:       timestamp('created_at').defaultNow(),
});
