import Dexie, { type EntityTable } from 'dexie';

export interface LocalConversation {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  avatarUrl: string | null;
  updatedAt: Date;
  unreadCount: number;
  otherUser?: any;
  lastMessage?: any;
}

export interface LocalMessage {
  id: string;
  conversationId: string;
  senderId: string;
  plaintext: string;
  mediaUrl: string | null;
  contentType: 'text' | 'media' | 'attachment';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'error';
  sentAt: Date;
  readAt?: Date | null;
  created_at?: string;
}

export interface LocalContact {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isTrusted: boolean;
}

const db = new Dexie('KurakaniLocalDB') as Dexie & {
  local_conversations: EntityTable<LocalConversation, 'id'>;
  local_messages: EntityTable<LocalMessage, 'id'>;
  local_contacts: EntityTable<LocalContact, 'id'>;
};

// Schema declaration
db.version(1).stores({
  local_conversations: 'id, type, updatedAt',
  local_messages: 'id, conversationId, senderId, status, sentAt',
  local_contacts: 'id, username, isTrusted'
});

export { db };
