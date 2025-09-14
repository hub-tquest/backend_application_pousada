import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../shared/firebase/firebase.service';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);
  private readonly collectionName = 'notifications';

  constructor(private readonly firebaseService: FirebaseService) {}

  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    try {
      const notificationWithTimestamp = {
        ...notification,
        createdAt: new Date(),
        read: notification.read || false,
      };

      const docRef = this.firebaseService.db.collection(this.collectionName).doc();
      await docRef.set({
        id: docRef.id,
        ...notificationWithTimestamp,
      });

      const createdNotification: Notification = {
        id: docRef.id,
        ...notificationWithTimestamp,
      };

      this.logger.log(`Notification created: ${docRef.id}`);
      return createdNotification;
    } catch (error) {
      this.logger.error('Error creating notification:', error);
      throw error;
    }
  }

  async findByUserId(userId: string, limit: number = 20): Promise<Notification[]> {
    try {
      const snapshot = await this.firebaseService.db
        .collection(this.collectionName)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Notification),
      }));
    } catch (error) {
      this.logger.error(`Error fetching notifications for user ${userId}:`, error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await this.firebaseService.db
        .collection(this.collectionName)
        .doc(notificationId)
        .update({
          read: true,
          readAt: new Date(),
        });

      this.logger.log(`Notification marked as read: ${notificationId}`);
    } catch (error) {
      this.logger.error(`Error marking notification as read ${notificationId}:`, error);
      throw error;
    }
  }

  async delete(notificationId: string): Promise<void> {
    try {
      await this.firebaseService.db
        .collection(this.collectionName)
        .doc(notificationId)
        .delete();

      this.logger.log(`Notification deleted: ${notificationId}`);
    } catch (error) {
      this.logger.error(`Error deleting notification ${notificationId}:`, error);
      throw error;
    }
  }
}