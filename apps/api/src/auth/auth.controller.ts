import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ClientIp } from '@/common/decorators/client-ip.decorator';

import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseEntity } from './entity/auth-response.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
   constructor(private authService: AuthService) {}

   @Post('login')
   @ApiOperation({ summary: 'Login with email and password' })
   @ApiResponse({
      status: 201,
      description: 'Returns access and refresh tokens',
      type: AuthResponseEntity,
   })
   @ApiResponse({ status: 401, description: 'Invalid credentials' })
   @ApiResponse({ status: 429, description: 'Too many login attempts' })
   @ApiResponse({ status: 503, description: 'Login attempts cannot be counted right now' })
   signIn(@Body() dto: AuthLoginDto, @ClientIp() ipAddress: string) {
      return this.authService.signIn(dto, ipAddress);
   }

   @Post('refresh')
   @ApiOperation({ summary: 'Refresh access token' })
   @ApiResponse({
      status: 201,
      description: 'Returns new access and refresh tokens',
      type: AuthResponseEntity,
   })
   @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
   refresh(@Body() dto: RefreshTokenDto) {
      return this.authService.refreshTokens(dto.refreshToken);
   }

   @Post('logout')
   @ApiOperation({ summary: 'Logout: revoke the session of the refresh token' })
   @ApiResponse({
      status: 201,
      description: 'Session revoked (the same answer for an unknown or revoked token)',
   })
   logout(@Body() dto: RefreshTokenDto) {
      return this.authService.logout(dto.refreshToken);
   }

   @Post('forgot-password')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'Request password reset email' })
   @ApiResponse({
      status: 200,
      description: 'Email sent (always returns 200 to prevent email enumeration)',
   })
   @ApiResponse({ status: 429, description: 'Too many requests from this address' })
   @ApiResponse({ status: 503, description: 'Requests cannot be counted right now' })
   forgotPassword(@Body() dto: ForgotPasswordDto, @ClientIp() ipAddress: string) {
      return this.authService.forgotPassword(dto.email, ipAddress);
   }

   @Post('reset-password')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'Reset password with token from email' })
   @ApiResponse({ status: 200, description: 'Password updated' })
   @ApiResponse({ status: 400, description: 'Invalid or expired token' })
   resetPassword(@Body() dto: ResetPasswordDto) {
      return this.authService.resetPassword(dto.token, dto.newPassword);
   }
}
