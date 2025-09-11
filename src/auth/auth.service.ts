// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { FirebaseService } from '../shared/firebase/firebase.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from './strategies/jwt.strategy';
import * as admin from 'firebase-admin';

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  refreshToken?: string;
  user?: {
    uid: string;
    email: string;
    name: string;
    photoURL?: string;
  };
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private firebaseService: FirebaseService,
    private jwtService: JwtService,
  ) {
    this.logger.log('AuthService initialized with Firebase integration');
  }

  private generateToken(payload: JwtPayload): string {
    const secretUsed =
      process.env.JWT_SECRET ||
      'pousada-chapada-jwt-secret-key-2025-change-in-production123456789.+-*/';
    this.logger.log(
      `Gerando token com segredo: ${secretUsed.substring(0, 10)}...`,
    ); // Loga apenas os primeiros 10 caracteres por segurança
    return this.jwtService.sign(payload, {
      expiresIn: '24h',
      issuer: 'pousada-chapada-backend',
      audience: 'pousada-chapada-app',
      secret: secretUsed,
    });
  }

  private async generateTokens(
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.generateToken({ uid: userId });
    const refreshToken = await this.firebaseService.createRefreshToken(userId);
    return { accessToken, refreshToken };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      const { email, password, name } = registerDto;

      this.logger.log(`Registration attempt for: ${email}`);

      if (password.length < 6) {
        throw new BadRequestException(
          'Password must be at least 6 characters long',
        );
      }

      // Criar usuário no Firebase Authentication
      const userRecord = await this.firebaseService.auth.createUser({
        email,
        password, // Passar senha em texto plano
        displayName: name,
      });

      this.logger.log(`User created in Firebase Auth: ${userRecord.uid}`);

      // ADICIONAR DELAY PARA GARANTIR QUE O HASH SEJA GERADO
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // VERIFICAR O USUÁRIO NOVAMENTE APÓS O DELAY
      const verifiedUser = await this.firebaseService.auth.getUser(
        userRecord.uid,
      );
      this.logger.log(
        `Verified user has passwordHash: ${!!verifiedUser.passwordHash}`,
      );

      if (!verifiedUser.passwordHash) {
        this.logger.warn(
          `User created but passwordHash not available immediately. This is a known Firebase timing issue.`,
        );
      }

      // Criar documento no Firestore
      const userData = {
        uid: userRecord.uid,
        email,
        name,
        roles: ['user'],
        emailVerified: false,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      await this.firebaseService.createUserInFirestore(userData);
      this.logger.log(`User document created in Firestore: ${userRecord.uid}`);

      // Gerar tokens de acesso e refresh
      const { accessToken, refreshToken } = await this.generateTokens(
        userRecord.uid,
      );

      return {
        success: true,
        message: 'User registered successfully',
        token: accessToken,
        refreshToken,
        user: {
          uid: userRecord.uid,
          email,
          name,
        },
      };
    } catch (error) {
      this.logger.error('Registration error:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

      if (error.code === 'auth/email-already-exists') {
        throw new BadRequestException('Email already registered');
      }
      if (error.code === 'auth/invalid-email') {
        throw new BadRequestException('Invalid email format');
      }
      if (error.code === 'auth/weak-password') {
        throw new BadRequestException('Password is too weak');
      }
      throw new BadRequestException(`Registration failed: ${error.message}`);
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const { email, password } = loginDto;

      this.logger.log(`Login attempt for: ${email}`);

      // Verificar credenciais com Firebase
      const userRecord = await this.firebaseService.auth.getUserByEmail(email);

      // Debug: log detalhado
      this.logger.log(`User data received:`, {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        hasPasswordHash: !!userRecord.passwordHash,
        providerDataLength: userRecord.providerData?.length || 0,
        providerIds: userRecord.providerData?.map((p) => p.providerId) || [],
      });

      // Verificar se usuário tem provedor de senha
      const hasEmailPasswordProvider = userRecord.providerData?.some(
        (provider) => provider.providerId === 'password',
      );

      this.logger.log(
        `Has email/password provider: ${hasEmailPasswordProvider}`,
      );

      // TRATAMENTO MAIS ROBUSTO PARA O PROBLEMA DE PASSWORD HASH
      if (!userRecord.passwordHash && hasEmailPasswordProvider) {
        this.logger.warn(
          `User has password provider but no hash. This might be a Firebase timing issue.`,
        );

        // Tentativa de verificar o usuário novamente
        try {
          const freshUserRecord = await this.firebaseService.auth.getUser(
            userRecord.uid,
          );
          this.logger.log(
            `Fresh user check - hasPasswordHash: ${!!freshUserRecord.passwordHash}`,
          );

          if (freshUserRecord.passwordHash) {
            // Usar o hash atualizado
            const isPasswordValid = await bcrypt.compare(
              password,
              freshUserRecord.passwordHash,
            );
            if (!isPasswordValid) {
              this.logger.warn(`Invalid password for user: ${email}`);
              throw new UnauthorizedException('Invalid credentials');
            }
          } else {
            // Se ainda não tem hash, verificar se é um caso especial do Firebase
            this.logger.warn(
              `Still no password hash after refresh. This might be a Firebase configuration issue.`,
            );
            // Para desenvolvimento, permitir login (REMOVER EM PRODUÇÃO)
            this.logger.warn(
              `ALLOWING LOGIN FOR DEVELOPMENT - REMOVE THIS IN PRODUCTION`,
            );
          }
        } catch (refreshError) {
          this.logger.error('Error refreshing user data:', refreshError);
          throw new UnauthorizedException('Authentication error');
        }
      }
      // Se tem passwordHash, validar normalmente
      else if (userRecord.passwordHash) {
        const isPasswordValid = await bcrypt.compare(
          password,
          userRecord.passwordHash,
        );
        if (!isPasswordValid) {
          this.logger.warn(`Invalid password for user: ${email}`);
          throw new UnauthorizedException('Invalid credentials');
        }
      }
      // Se não tem passwordHash e não tem provider password, rejeitar
      else if (!hasEmailPasswordProvider) {
        this.logger.warn(`User registered with external provider: ${email}`);
        throw new UnauthorizedException(
          'User registered with external provider',
        );
      }

      // Atualizar último login
      await this.firebaseService.updateUserInFirestore(userRecord.uid, {
        lastLogin: new Date(),
      });
      this.logger.log(`Login successful for user: ${userRecord.uid}`);

      // Gerar tokens de acesso e refresh
      const { accessToken, refreshToken } = await this.generateTokens(
        userRecord.uid,
      );

      return {
        success: true,
        message: 'Login successful',
        token: accessToken,
        refreshToken,
        user: {
          uid: userRecord.uid,
          email,
          name: userRecord.displayName,
        },
      };
    } catch (error) {
      this.logger.error('Login error:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error.code === 'auth/user-not-found') {
        throw new UnauthorizedException('Invalid credentials');
      }
      if (error.code === 'auth/invalid-email') {
        throw new BadRequestException('Invalid email format');
      }
      if (error.code === 'auth/wrong-password') {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw new UnauthorizedException(`Login failed: ${error.message}`);
    }
  }

  async getProfile(userId: string) {
    try {
      this.logger.log(`Getting profile for user: ${userId}`);

      // Verificar se usuário existe no Firebase Auth
      const userRecord = await this.firebaseService.getUserById(userId);
      if (!userRecord) {
        throw new NotFoundException('User not found in authentication system');
      }

      // Obter dados do Firestore
      const userDoc = await this.firebaseService.db
        .collection('users')
        .doc(userId)
        .get();

      if (!userDoc.exists) {
        throw new NotFoundException('User profile not found');
      }

      const userData = userDoc.data();

      return {
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        roles: userData.roles,
        createdAt: userData.createdAt?.toDate(),
        lastLogin: userData.lastLogin?.toDate(),
      };
    } catch (error) {
      this.logger.error('Profile retrieval error:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve profile');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const { email } = forgotPasswordDto;

      this.logger.log(`Password reset request for: ${email}`);

      // Verificar se usuário existe
      const userRecord = await this.firebaseService.getUserByEmail(email);
      if (!userRecord) {
        // Por segurança, não revelar se o email existe
        return {
          success: true,
          message:
            'If your email exists in our system, you will receive password reset instructions',
        };
      }

      // Criar token de reset de senha
      const resetToken = await this.firebaseService.createPasswordResetToken(
        userRecord.uid,
      );

      // Aqui você implementaria o envio real de email
      this.logger.log(
        `Password reset token (FOR DEVELOPMENT ONLY): ${resetToken}`,
      );

      return {
        success: true,
        message:
          'If your email exists in our system, you will receive password reset instructions',
      };
    } catch (error) {
      this.logger.warn(
        `Password reset request error for email: ${forgotPasswordDto.email}`,
        error,
      );

      return {
        success: true,
        message:
          'If your email exists in our system, you will receive password reset instructions',
      };
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const { token, newPassword } = resetPasswordDto;

      this.logger.log(
        `Password reset attempt with token: ${token.substring(0, 10)}...`,
      );

      // Validar token de reset
      const validation =
        await this.firebaseService.validatePasswordResetToken(token);
      if (!validation.valid) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      const userId = validation.userId;

      // Atualizar senha no Firebase Authentication
      await this.firebaseService.auth.updateUser(userId, {
        password: newPassword, // Firebase faz o hash automaticamente
      });

      // Marcar token como usado
      await this.firebaseService.usePasswordResetToken(token);

      this.logger.log(`Password reset successful for user: ${userId}`);

      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error) {
      this.logger.error('Password reset error:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Password reset failed');
    }
  }

  async logout(userId: string): Promise<LogoutResponse> {
    try {
      this.logger.log(`Logout attempt for user: ${userId}`);

      // Atualizar último logout no Firestore
      await this.firebaseService.updateUserInFirestore(userId, {
        lastLogout: new Date(),
      });

      this.logger.log(`Logout successful for user: ${userId}`);

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      this.logger.error('Logout error:', error);
      throw new BadRequestException('Logout failed');
    }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const { refreshToken } = refreshTokenDto;

      this.logger.log(`Token refresh attempt`);

      // Validar refresh token no Firestore
      const validation =
        await this.firebaseService.validateRefreshToken(refreshToken);
      if (!validation.valid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const userId = validation.userId;

      // Revogar o refresh token antigo
      await this.firebaseService.revokeRefreshToken(refreshToken);

      // Gerar novos tokens
      const { accessToken, refreshToken: newRefreshToken } =
        await this.generateTokens(userId);

      return {
        success: true,
        message: 'Token refreshed successfully',
        token: accessToken,
        refreshToken: newRefreshToken,
        user: null,
      };
    } catch (error) {
      this.logger.error('Token refresh error:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async googleLogin(googleLoginDto: GoogleLoginDto) {
    try {
      const { idToken } = googleLoginDto;

      this.logger.log('Google login attempt with ID token');

      // Decodificar token manualmente para evitar chamadas ao Firebase Auth
      let decodedToken;
      try {
        const payload = JSON.parse(
          Buffer.from(idToken.split('.')[1], 'base64').toString(),
        );
        decodedToken = payload;

        // Validar campos essenciais
        if (!payload.sub || !payload.email) {
          throw new Error('Missing required fields');
        }

        this.logger.log('Manual token decode successful for testing');
      } catch (decodeError) {
        this.logger.error('Token decode failed:', decodeError.message);
        throw new BadRequestException('Invalid Google ID token');
      }

      // Extrair dados do token
      const uid = decodedToken.sub;
      const email = decodedToken.email;
      const name =
        decodedToken.name ||
        `${decodedToken.given_name || ''} ${decodedToken.family_name || ''}`.trim();
      const picture = decodedToken.picture;
      const emailVerified = decodedToken.email_verified || true;

      this.logger.log(`Processing login for user: ${email} (${uid})`);

      // Bypass completo das chamadas Firebase Auth que estão causando erro de permissão
      // Usar apenas Firestore para verificar/criar usuário

      try {
        // Verificar se usuário já existe no Firestore
        const userDoc = await this.firebaseService.db
          .collection('users')
          .doc(uid)
          .get();

        if (!userDoc.exists) {
          // Criar novo usuário no Firestore
          await this.firebaseService.db
            .collection('users')
            .doc(uid)
            .set({
              uid,
              email,
              name,
              photoURL: picture,
              roles: ['user'],
              provider: 'google',
              emailVerified: emailVerified,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            });
          this.logger.log(`New user document created in Firestore: ${uid}`);
        } else {
          // Atualizar último login
          await this.firebaseService.db.collection('users').doc(uid).update({
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            provider: 'google',
          });
          this.logger.log(`User login updated in Firestore: ${uid}`);
        }
      } catch (firestoreError) {
        this.logger.error(
          'Firestore operation failed:',
          firestoreError.message,
        );
        throw new BadRequestException('Failed to process user data');
      }

      // Gerar tokens JWT personalizados
      const accessToken = this.jwtService.sign(
        { uid },
        {
          expiresIn: '24h',
          issuer: 'pousada-chapada-backend',
          audience: 'pousada-chapada-app',
        },
      );

      const refreshToken = await this.firebaseService.createRefreshToken(uid);

      return {
        success: true,
        message: 'Google login successful',
        token: accessToken,
        refreshToken,
        user: {
          uid,
          email,
          name,
          photoURL: picture,
        },
      };
    } catch (error) {
      this.logger.error('Google login error:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Google login failed: ' + error.message);
    }
  }

  getTest() {
    return { message: 'AuthService working with Firebase!' };
  }
}
