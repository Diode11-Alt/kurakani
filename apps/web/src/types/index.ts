export interface User {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
}

export interface Post {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  users?: User | null;
  likes?: { count: number }[];
  comments?: { count: number }[];
  post_shares?: { count: number }[];
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
  content_type?: string;
  ciphertext?: string;
  ciphertext_type?: number;
  nonce?: string;
  reply_to_id?: string | null;
  forwarded_from_id?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  has_reaction?: boolean;
}

export interface Notification {
  id: string;
  type: string;
  actor: User;
  is_read: boolean;
  created_at: string;
  payload?: Record<string, unknown>;
}

export interface CallDetails {
  conversationId: string;
  callType: 'audio' | 'video';
  otherUser: User | { username: string };
  incomingOfferPayload?: Record<string, unknown>;
}

export interface Session {
  user: {
    id: string;
    email?: string;
    phone?: string;
  };
  access_token: string;
  refresh_token: string;
}
