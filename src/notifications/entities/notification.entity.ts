export interface Notification {
  id?: string;
  userId: string;
  title: string;
  body: string;
  type: 'booking' | 'payment' | 'reminder' | 'general';
  read: boolean;
  createdAt: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
}