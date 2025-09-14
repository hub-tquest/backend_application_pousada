import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { FirebaseService } from '../../shared/firebase/firebase.service';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(private readonly firebaseService: FirebaseService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Testar conexão com Firestore
      const testDoc = await this.firebaseService.db
        .collection('_health_check')
        .doc('test')
        .set({ timestamp: new Date() }, { merge: true });

      // Verificar se podemos ler dados
      await this.firebaseService.db
        .collection('_health_check')
        .doc('test')
        .get();

      this.logger.debug('Database health check passed');
      return this.getStatus(key, true);
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return this.getStatus(key, false, { message: error.message });
    }
  }
}
