// src/booking/repositories/booking.repository.ts
import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../shared/firebase/firebase.service';
import { Booking } from '../entities/booking.entity';
import { Logger } from '@nestjs/common';

@Injectable()
export class BookingRepository {
  private readonly collectionName = 'bookings';

  constructor(private readonly firebaseService: FirebaseService) {}

  async create(booking: Booking): Promise<Booking> {
    // Preparar dados para Firestore (converter datas)
    const bookingData = {
      ...booking,
      checkIn: booking.checkIn.toISOString(),
      checkOut: booking.checkOut.toISOString(),
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };

    const docRef = await this.firebaseService
      .getFirestore()
      .collection(this.collectionName)
      .add(bookingData);

    return { ...booking, id: docRef.id };
  }

  async findById(id: string): Promise<Booking | null> {
    const doc = await this.firebaseService
      .getFirestore()
      .collection(this.collectionName)
      .doc(id)
      .get();

    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Booking;
  }

  async findByUserId(userId: string): Promise<Booking[]> {
    try {
      const snapshot = await this.firebaseService
        .getFirestore()
        .collection(this.collectionName)
        .where('userId', '==', userId) // Corrigido: garantir que userId não seja undefined
        .get();

      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...(doc.data() as any),
          }) as Booking,
      );
    } catch (error) {
      throw new Error(`Failed to fetch bookings: ${error.message}`);
    }
  }

  async findByRoomIdAndStatus(
    roomId: string,
    status: string,
  ): Promise<Booking[]> {
    const snapshot = await this.firebaseService
      .getFirestore()
      .collection(this.collectionName)
      .where('roomId', '==', roomId)
      .where('status', '==', status)
      .get();

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Booking,
    );
  }

  async update(id: string, data: Partial<Booking>): Promise<Booking> {
    await this.firebaseService
      .getFirestore()
      .collection(this.collectionName)
      .doc(id)
      .update(data);

    const updated = await this.findById(id);
    return updated;
  }

  async findByPaymentId(paymentId: string): Promise<Booking | null> {
    try {
      const snapshot = await this.firebaseService
        .getFirestore()
        .collection(this.collectionName)
        .where('paymentId', '==', paymentId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...(doc.data() as any),
      } as Booking;
    } catch (error) {
      Logger.error(`Error finding booking by payment ID ${paymentId}:`, error);
      throw new Error(`Failed to find booking by payment ID: ${error.message}`);
    }
  }
}
