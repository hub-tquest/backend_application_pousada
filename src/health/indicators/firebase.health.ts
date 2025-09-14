import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { FirebaseService } from '../../shared/firebase/firebase.service';

@Injectable()
export class FirebaseHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(FirebaseHealthIndicator.name);

  constructor(private readonly firebaseService: FirebaseService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Testar conexão com Firestore
      await this.firebaseService.db.collection('_health').limit(1).get();

      // Testar conexão com Auth
      await this.firebaseService.auth.listUsers(1);

      this.logger.debug('Firebase health check passed');
      return this.getStatus(key, true);
    } catch (error) {
      this.logger.error('Firebase health check failed:', error);
      return this.getStatus(key, false, { message: error.message });
    }
  }
}
