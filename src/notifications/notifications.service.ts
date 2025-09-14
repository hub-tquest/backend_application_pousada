import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepository } from './repositories/notification.repository';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FirebaseService } from '../shared/firebase/firebase.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly firebaseService: FirebaseService,
  ) {}

  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    try {
      // Garantir que o campo 'read' esteja presente
      const notificationData = {
        ...createNotificationDto,
        read: createNotificationDto.read ?? false,
      };

      const notification =
        await this.notificationRepository.create(notificationData);

      // Tentar enviar notificação push (não bloqueante)
      this.sendPushNotification(notification).catch((error) => {
        this.logger.warn(`Failed to send push notification: ${error.message}`);
      });

      return notification;
    } catch (error) {
      this.logger.error('Error creating notification:', error);
      throw error;
    }
  }

  async getUserNotifications(
    userId: string,
    limit?: number,
  ): Promise<Notification[]> {
    return this.notificationRepository.findByUserId(userId, limit);
  }

  async markAsRead(notificationId: string): Promise<void> {
    return this.notificationRepository.markAsRead(notificationId);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    return this.notificationRepository.delete(notificationId);
  }

  private async sendPushNotification(
    notification: Notification,
  ): Promise<void> {
    try {
      // Verificar se o usuário tem token FCM
      const userDoc = await this.firebaseService.db
        .collection('users')
        .doc(notification.userId)
        .get();

      if (!userDoc.exists) {
        this.logger.warn(
          `User not found for push notification: ${notification.userId}`,
        );
        return;
      }

      const userData = userDoc.data();
      const fcmToken = userData?.fcmToken;

      if (!fcmToken) {
        this.logger.warn(
          `FCM token not found for user: ${notification.userId}`,
        );
        return;
      }

      // Enviar notificação push via FCM usando o método correto
      await this.firebaseService.sendPushNotification(fcmToken, {
        title: notification.title,
        body: notification.body,
        data: {
          notificationId: notification.id,
          type: notification.type,
          ...notification.metadata,
        },
      });

      this.logger.log(`Push notification sent to user: ${notification.userId}`);
    } catch (error) {
      this.logger.error(`Error sending push notification: ${error.message}`);
      throw error;
    }
  }

  async sendBookingNotification(
    userId: string,
    bookingId: string,
    action: 'created' | 'confirmed' | 'cancelled',
  ): Promise<Notification> {
    let title: string;
    let body: string;

    switch (action) {
      case 'created':
        title = 'Nova Reserva';
        body = 'Sua reserva foi criada com sucesso!';
        break;
      case 'confirmed':
        title = 'Reserva Confirmada';
        body = 'Sua reserva foi confirmada!';
        break;
      case 'cancelled':
        title = 'Reserva Cancelada';
        body = 'Sua reserva foi cancelada.';
        break;
      default:
        title = 'Atualização de Reserva';
        body = 'Há uma atualização sobre sua reserva.';
    }

    return this.createNotification({
      userId,
      title,
      body,
      type: 'booking',
      metadata: { bookingId, action },
    });
  }

  async sendPaymentNotification(
    userId: string,
    paymentId: string,
    status: 'approved' | 'rejected' | 'pending',
  ): Promise<Notification> {
    let title: string;
    let body: string;

    switch (status) {
      case 'approved':
        title = 'Pagamento Aprovado';
        body = 'Seu pagamento foi aprovado com sucesso!';
        break;
      case 'rejected':
        title = 'Pagamento Rejeitado';
        body = 'Seu pagamento foi rejeitado.';
        break;
      case 'pending':
        title = 'Pagamento Pendente';
        body = 'Seu pagamento está sendo processado.';
        break;
      default:
        title = 'Atualização de Pagamento';
        body = 'Há uma atualização sobre seu pagamento.';
    }

    return this.createNotification({
      userId,
      title,
      body,
      type: 'payment',
      metadata: { paymentId, status },
    });
  }
}
