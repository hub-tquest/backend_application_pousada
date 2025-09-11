// src/booking/interfaces/payment.interface.ts
export interface IPaymentService {
  createPaymentPreference(
    items: any[],
    bookingId: string,
    userId: string,
  ): Promise<any>;
  verifyPayment(paymentId: string): Promise<boolean>;
}
