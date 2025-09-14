export interface INotification {
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

// Interface para criação (read é opcional pois tem valor padrão)
export interface CreateNotificationDto {
  userId: string;
  title: string;
  body: string;
  type: 'booking' | 'payment' | 'reminder' | 'general';
  read?: boolean;
  metadata?: Record<string, any>;
}
