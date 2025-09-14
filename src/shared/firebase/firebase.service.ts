import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import { Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging'; // Importe getMessaging e Messaging

export interface AppUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  disabled: boolean;
  // Adicione outros campos conforme necessário, por exemplo:
  // phoneNumber?: string | null;
  // creationTime?: string;
  // lastSignInTime?: string;
}

@Injectable()
export class FirebaseService {
  public auth: admin.auth.Auth;
  public db: admin.firestore.Firestore;
  public storage: admin.storage.Storage;
  public messaging: Messaging; // Declare a propriedade messaging com o tipo correto
  private readonly logger = new Logger(FirebaseService.name);
  private static isInitialized = false;

  constructor() {
    this.logger.log('Initializing Firebase Service');
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      if (FirebaseService.isInitialized) {
        this.logger.log(
          'Firebase already initialized, using existing instance',
        );
        this.setupServices();
        return;
      }

      if (admin.apps.length > 0) {
        this.logger.log('Using existing Firebase app');
        this.setupServices();
        FirebaseService.isInitialized = true;
        return;
      }

      const serviceAccountPath = path.resolve(
        __dirname,
        '../../../firebase-service-account.json',
      );

      if (fs.existsSync(serviceAccountPath)) {
        try {
          const serviceAccount = require(serviceAccountPath);

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'pousada-chapada',
          });

          this.logger.log(
            'Firebase initialized with service account and explicit project ID',
          );
        } catch (error) {
          this.logger.error('Error loading service account:', error);
          admin.initializeApp({
            projectId: 'pousada-chapada',
          });
        }
      } else {
        this.logger.warn(
          'Service account file not found, using project ID config',
        );
        admin.initializeApp({
          projectId: 'pousada-chapada',
        });
      }

      this.setupServices();
      FirebaseService.isInitialized = true;
    } catch (error) {
      this.logger.error('Firebase initialization error:', error);
      throw new Error(`Firebase initialization failed: ${error.message}`);
    }
  }

  private setupServices(): void {
    try {
      this.auth = admin.auth();
      this.db = admin.firestore();
      this.storage = admin.storage();
      this.messaging = getMessaging(); // <-- Esta é a linha correta

      // Só chamar settings() se o Firestore ainda não foi configurado
      try {
        this.db.settings({
          ignoreUndefinedProperties: true,
        });
        this.logger.log('Firestore settings applied');
      } catch (settingsError) {
        this.logger.log('Firestore settings already applied, skipping');
      }

      this.logger.log('Firebase services initialized successfully');
    } catch (error) {
      this.logger.error('Error setting up Firebase services:', error);
      throw error;
    }
  }

  async sendMessage(message: admin.messaging.Message): Promise<string> {
    try {
      const response = await this.messaging.send(message);
      this.logger.log(`Successfully sent message: ${response}`);
      return response;
    } catch (error) {
      this.logger.error('Error sending FCM message:', error);
      throw new Error(`Failed to send FCM message: ${error.message}`);
    }
  }

  // Método para se inscrever em tópicos (opcional)
  async subscribeToTopic(
    tokens: string[],
    topic: string,
  ): Promise<admin.messaging.MessagingTopicManagementResponse> {
    try {
      const response = await this.messaging.subscribeToTopic(tokens, topic);
      this.logger.log(`Successfully subscribed to topic ${topic}`);
      return response;
    } catch (error) {
      this.logger.error(`Error subscribing to topic ${topic}:`, error);
      throw new Error(`Failed to subscribe to topic: ${error.message}`);
    }
  }

  // Método para se desinscrever de tópicos (opcional)
  async unsubscribeFromTopic(
    tokens: string[],
    topic: string,
  ): Promise<admin.messaging.MessagingTopicManagementResponse> {
    try {
      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      this.logger.log(`Successfully unsubscribed from topic ${topic}`);
      return response;
    } catch (error) {
      this.logger.error(`Error unsubscribing from topic ${topic}:`, error);
      throw new Error(`Failed to unsubscribe from topic: ${error.message}`);
    }
  }

  // Método adicionado para compatibilidade com Firestore
  public getFirestore(): Firestore {
    return this.db;
  }

  async getUserById(uid: string): Promise<AppUser | null> {
    try {
      this.logger.log(
        `[GET_USER_BY_ID] Attempting to get user by ID from Firebase Auth: ${uid}`,
      );
      // Tenta buscar no Firebase Authentication primeiro (caminho padrão)
      const user = await this.auth.getUser(uid);
      this.logger.log(
        `[GET_USER_BY_ID] User found in Firebase Auth: ${user.uid}`,
      );

      // Converter admin.auth.UserRecord para AppUser
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        // phoneNumber: user.phoneNumber || null, // Se existir no UserRecord
      };
    } catch (authError) {
      // Se falhar por permissões ou usuário não encontrado no Auth, tenta no Firestore
      if (
        authError.code === 'auth/user-not-found' ||
        authError.code === 'auth/insufficient-permission'
      ) {
        this.logger.warn(
          `[GET_USER_BY_ID] User not found in Firebase Auth or insufficient permissions. Falling back to Firestore lookup for UID: ${uid}`,
        );

        try {
          const userDoc = await this.db.collection('users').doc(uid).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            this.logger.log(
              `[GET_USER_BY_ID] User found in Firestore: ${userData.uid}`,
            );

            // Criar um objeto AppUser a partir dos dados do Firestore
            const appUser: AppUser = {
              uid: userData.uid,
              email: userData.email,
              displayName: userData.name || null,
              photoURL: userData.photoURL || null,
              emailVerified: userData.emailVerified || false,
              disabled: false, // Usuários do Firestore são considerados ativos por padrão
            };

            return appUser;
          } else {
            this.logger.warn(
              `[GET_USER_BY_ID] User not found in Firestore either: ${uid}`,
            );
            return null;
          }
        } catch (firestoreError) {
          this.logger.error(
            `[GET_USER_BY_ID] Error fetching user from Firestore ${uid}:`,
            firestoreError,
          );
          // Em caso de erro no Firestore, retornamos null
          // pois o usuário não pôde ser encontrado nem no Auth nem no Firestore
          return null;
        }
      } else {
        // Se for outro erro (rede, etc), relança
        this.logger.error(
          `[GET_USER_BY_ID] Unexpected error fetching user ${uid} from Firebase Auth:`,
          authError,
        );
        throw authError;
      }
    }
  }

  async getUserByEmail(email: string): Promise<admin.auth.UserRecord | null> {
    try {
      return await this.auth.getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      throw error;
    }
  }

  async createUserInFirestore(userData: any): Promise<void> {
    await this.db
      .collection('users')
      .doc(userData.uid)
      .set({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }

  async updateUserInFirestore(uid: string, userData: any): Promise<void> {
    await this.db
      .collection('users')
      .doc(uid)
      .update({
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }

  async createRefreshToken(
    userId: string,
    expiresIn: number = 7 * 24 * 60 * 60 * 1000,
  ): Promise<string> {
    try {
      const tokenId = this.db.collection('_').doc().id;
      const expiresAt = new Date(Date.now() + expiresIn);

      const refreshTokenData = {
        id: tokenId,
        userId,
        token: tokenId,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        createdAt: admin.firestore.Timestamp.fromDate(new Date()),
        revoked: false,
      };

      await this.db
        .collection('refresh_tokens')
        .doc(tokenId)
        .set(refreshTokenData);

      this.logger.log(`Refresh token created: ${tokenId} for user: ${userId}`);
      return tokenId;
    } catch (error) {
      this.logger.error('Failed to create refresh token:', error);
      throw new Error(`Failed to create refresh token: ${error.message}`);
    }
  }

  async validateRefreshToken(
    tokenId: string,
  ): Promise<{ valid: boolean; userId?: string }> {
    try {
      const tokenDoc = await this.db
        .collection('refresh_tokens')
        .doc(tokenId)
        .get();

      if (!tokenDoc.exists) {
        return { valid: false };
      }

      const tokenData = tokenDoc.data() as any; // ou tipar corretamente se tiver a interface

      // Verificar se o token foi revogado
      if (tokenData.revoked) {
        return { valid: false };
      }

      // Verificar se o token expirou
      if (tokenData.expiresAt.toDate() < new Date()) {
        return { valid: false };
      }

      return { valid: true, userId: tokenData.userId };
    } catch (error) {
      return { valid: false };
    }
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    try {
      await this.db
        .collection('refresh_tokens')
        .doc(tokenId)
        .update({
          revoked: true,
          revokedAt: admin.firestore.Timestamp.fromDate(new Date()),
        });
    } catch (error) {
      throw new Error(`Failed to revoke refresh token: ${error.message}`);
    }
  }

  async createPasswordResetToken(userId: string): Promise<string> {
    try {
      const tokenId = this.db.collection('_').doc().id;
      const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

      const resetData = {
        id: tokenId,
        userId,
        token: tokenId,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        createdAt: admin.firestore.Timestamp.fromDate(new Date()),
        used: false,
      };

      await this.db.collection('password_resets').doc(tokenId).set(resetData);

      this.logger.log(
        `Password reset token created: ${tokenId} for user: ${userId}`,
      );
      return tokenId;
    } catch (error) {
      this.logger.error('Failed to create password reset token:', error);
      throw new Error(
        `Failed to create password reset token: ${error.message}`,
      );
    }
  }

  async validatePasswordResetToken(
    tokenId: string,
  ): Promise<{ valid: boolean; userId?: string }> {
    try {
      this.logger.log(`Validating password reset token: ${tokenId}`);

      if (!tokenId) {
        this.logger.warn('Password reset token is null or empty');
        return { valid: false };
      }

      const tokenDoc = await this.db
        .collection('password_resets')
        .doc(tokenId)
        .get();

      if (!tokenDoc.exists) {
        this.logger.warn(`Password reset token not found: ${tokenId}`);
        return { valid: false };
      }

      const tokenData: any = tokenDoc.data();

      if (tokenData.used === true) {
        this.logger.warn(`Password reset token already used: ${tokenId}`);
        return { valid: false };
      }

      let expiresAt;
      if (tokenData.expiresAt && tokenData.expiresAt.toDate) {
        expiresAt = tokenData.expiresAt.toDate();
      } else if (tokenData.expiresAt instanceof Date) {
        expiresAt = tokenData.expiresAt;
      } else {
        this.logger.error('Invalid expiresAt format:', tokenData.expiresAt);
        return { valid: false };
      }

      const now = new Date();
      if (expiresAt < now) {
        this.logger.warn(`Password reset token expired: ${tokenId}`);
        return { valid: false };
      }

      this.logger.log(
        `Password reset token valid for user: ${tokenData.userId}`,
      );
      return { valid: true, userId: tokenData.userId };
    } catch (error) {
      this.logger.error('Failed to validate password reset token:', error);
      return { valid: false };
    }
  }

  async usePasswordResetToken(tokenId: string): Promise<void> {
    try {
      this.logger.log(`Marking password reset token as used: ${tokenId}`);

      await this.db
        .collection('password_resets')
        .doc(tokenId)
        .update({
          used: true,
          usedAt: admin.firestore.Timestamp.fromDate(new Date()),
        });

      this.logger.log(`Password reset token marked as used: ${tokenId}`);
    } catch (error) {
      this.logger.error('Failed to use password reset token:', error);
      throw new Error(`Failed to use password reset token: ${error.message}`);
    }
  }
}
