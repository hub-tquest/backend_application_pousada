import { Module, Global } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Global() // Usar o decorator @Global() em vez da propriedade global
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
