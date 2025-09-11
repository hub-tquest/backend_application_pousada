import * as admin from 'firebase-admin';

export interface MessageEntity {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: admin.firestore.Timestamp;
  metadata?: Record<string, any>;
}
