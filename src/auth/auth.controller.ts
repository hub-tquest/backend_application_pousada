// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Request,
  UseGuards,
  HttpCode,
  Patch,
  Headers, // Import correto
  BadRequestException, // ← ADICIONAR ESTA LINHA
  InternalServerErrorException, // <---
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service'; // Adicionar AuthResponse aqui
import { GoogleLoginDto } from './dto/google-login.dto';
import type { AuthResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LogoutDto } from './dto/logout.dto'; // ← Esta linha é crucial
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimit } from './decorators/rate-limit.decorator';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { response } from 'express';
import { auth } from 'firebase-admin/lib/auth/auth-namespace';
import * as jwt from 'jsonwebtoken'; // Adicione esta importação
import { Logger } from '@nestjs/common'; // Para o logger da classe

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Health check successful' })
  @Get('test')
  getTest() {
    return this.authService.getTest();
  }

  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @RateLimit(5, 60000)
  @UseGuards(RateLimitGuard)
  @Post('register')
  @HttpCode(201)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials',
  })
  @RateLimit(10, 60000)
  @UseGuards(RateLimitGuard)
  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset instructions sent' })
  @RateLimit(3, 300000)
  @UseGuards(RateLimitGuard)
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @ApiOperation({ summary: 'Update user profile' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req, @Body() updateData: any) {
    return { message: 'Profile update endpoint ready for implementation' };
  }

  @ApiOperation({ summary: 'Logout user' })
  @ApiBearerAuth()
  @ApiBody({ type: LogoutDto })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  async logout(@Request() req) {
    return this.authService.logout(req.user.userId);
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid refresh token',
  })
  @Post('refresh')
  @HttpCode(200)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid token' })
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    // Validar DTO manualmente para melhor debugging
    if (!resetPasswordDto.token || !resetPasswordDto.newPassword) {
      throw new BadRequestException('Token and newPassword are required');
    }

    if (resetPasswordDto.newPassword.length < 6) {
      throw new BadRequestException(
        'Password must be at least 6 characters long',
      );
    }

    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('google/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with Google ID token' })
  @ApiBody({ type: GoogleLoginDto })
  @ApiResponse({ status: 200, description: 'Google login successful' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid token' })
  async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.googleLogin(googleLoginDto);
  }
}
