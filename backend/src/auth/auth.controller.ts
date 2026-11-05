import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, UpdateProfileDto } from './auth.dto';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';

const COOKIE = 'fixzy_rt';
/* Native apps can't rely on cookies: they send `x-client: mobile` and get the refresh token in the body instead. */
const isMobile = (req: Request) => req.headers['x-client'] === 'mobile';
const setCookie = (res: Response, token: string) =>
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/api/auth', maxAge: 30 * 864e5 });

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register') @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...out } = await this.auth.register(dto);
    if (isMobile(req)) return { ...out, refreshToken };
    setCookie(res, refreshToken);
    return out;
  }

  @Post('login') @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...out } = await this.auth.login(dto);
    if (isMobile(req)) return { ...out, refreshToken };
    setCookie(res, refreshToken);
    return out;
  }

  @Post('refresh') @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const mobile = isMobile(req);
    const { refreshToken, ...out } = await this.auth.refresh(mobile ? req.body?.refreshToken : req.cookies?.[COOKIE]);
    if (mobile) return { ...out, refreshToken };
    setCookie(res, refreshToken);
    return out;
  }

  @Post('logout') @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(isMobile(req) ? req.body?.refreshToken : req.cookies?.[COOKIE]);
    res.clearCookie(COOKIE, { path: '/api/auth' });
  }

  @Get('me') @UseGuards(JwtAuthGuard)
  me(@CurrentUser() u: AuthUser) { return this.auth.me(u.id); }

  @Patch('me') @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() u: AuthUser, @Body() dto: UpdateProfileDto) { return this.auth.updateProfile(u.id, dto); }
}
