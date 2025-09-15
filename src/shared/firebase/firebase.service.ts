import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Buffer } from 'buffer';

// Adicione esta interface no topo do arquivo ou em um arquivo separado
export interface AppUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  disabled: boolean;
}

@Injectable()
export class FirebaseService {
  public auth: admin.auth.Auth;
  public db: admin.firestore.Firestore;
  public messaging: admin.messaging.Messaging; // ✅ Adicionado
  private readonly logger = new Logger(FirebaseService.name);

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      // Verificar se já existe um app Firebase
      if (admin.apps.length > 0) {
        this.setupServices();
        return;
      }

      // Método Base64 (MAIS SEGURO)
      if (process.env.FIREBASE_CREDENTIALS_BASE64) {
        this.logger.log('Using Base64 credentials for Firebase initialization');

        try {
          // Decodificar Base64
          const decodedCredentials = Buffer.from(
            process.env.FIREBASE_CREDENTIALS_BASE64,
            'base64',
          ).toString('utf-8');

          // Parse do JSON
          const serviceAccount = JSON.parse(decodedCredentials);

          // Inicializar Firebase
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId:
              process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
          });

          this.logger.log(
            'Firebase initialized with Base64 credentials successfully',
          );
        } catch (parseError) {
          this.logger.error('Error parsing Base64 credentials:', parseError);
          throw new Error('Invalid Base64 credentials format');
        }
      } else {
        // Fallback para variáveis de ambiente individuais
        this.logger.log(
          'Using environment variables for Firebase initialization',
        );
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }

      this.setupServices();
    } catch (error) {
      this.logger.error('Firebase initialization error:', error);
      throw new Error(`Firebase initialization failed: ${error.message}`);
    }
  }

  private setupServices(): void {
    try {
      this.auth = admin.auth();
      this.db = admin.firestore();
      this.messaging = admin.messaging(); // ✅ Inicializado

      this.db.settings({
        ignoreUndefinedProperties: true,
      });

      this.logger.log('Firebase services initialized successfully');
    } catch (error) {
      this.logger.error('Error setting up Firebase services:', error);
      throw error;
    }
  }

  // Método para enviar mensagens FCM
  async sendPushNotification(token: string, payload: any): Promise<any> {
    try {
      const message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
      };

      const response = await this.messaging.send(message);
      this.logger.log(`Successfully sent message: ${response}`);
      return response;
    } catch (error) {
      this.logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Métodos existentes...
  public getFirestore(): admin.firestore.Firestore {
    return this.db;
  }

  async getUserById(uid: string): Promise<AppUser | null> {
    try {
      if (!this.auth) {
        return await this.getUserFromFirestore(uid);
      }

      this.logger.log(
        `[GET_USER_BY_ID] Attempting to get user by ID from Firebase Auth: ${uid}`,
      );
      const user = await this.auth.getUser(uid);

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
      };
    } catch (authError) {
      if (
        authError.code === 'auth/user-not-found' ||
        authError.code === 'auth/insufficient-permission'
      ) {
        this.logger.warn(
          `[GET_USER_BY_ID] User not found in Firebase Auth or insufficient permissions. Falling back to Firestore lookup for UID: ${uid}`,
        );
        return await this.getUserFromFirestore(uid);
      } else {
        this.logger.error(
          `[GET_USER_BY_ID] Unexpected error fetching user ${uid} from Firebase Auth:`,
          authError,
        );
        throw authError;
      }
    }
  }

  private async getUserFromFirestore(uid: string): Promise<AppUser | null> {
    try {
      const userDoc = await this.db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        this.logger.log(
          `[GET_USER_BY_ID] User found in Firestore: ${userData.uid}`,
        );

        const appUser: AppUser = {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.name || null,
          photoURL: userData.photoURL || null,
          emailVerified: userData.emailVerified || false,
          disabled: false,
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
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<admin.auth.UserRecord | null> {
    try {
      if (!this.auth) {
        this.logger.warn('Firebase Auth not available for getUserByEmail');
        return null;
      }

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

      const tokenData = tokenDoc.data() as any;

      if (tokenData.revoked) {
        return { valid: false };
      }

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
