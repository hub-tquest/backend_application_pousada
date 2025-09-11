// src/booking/payment/mercadopago.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MercadoPagoService } from 'src/booking/payment/mercadopago.service';

describe('MercadoPagoService', () => {
  let service: MercadoPagoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MercadoPagoService],
    }).compile();

    service = module.get<MercadoPagoService>(MercadoPagoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
