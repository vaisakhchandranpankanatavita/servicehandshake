import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, Module, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PrismaService } from '../common/prisma.module';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';

class ReviewDto {
  @IsIn(['service', 'product']) kind: 'service' | 'product';
  @IsInt() target: number;
  @IsOptional() @IsString() bookingId?: string;
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(1000) text?: string;
}

class ContactDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(10) @MaxLength(2000) message: string;
}

@Controller()
class AccountController {
  constructor(private prisma: PrismaService) {}

  @Get('notifications') @UseGuards(JwtAuthGuard)
  notifications(@CurrentUser() u: AuthUser) {
    return this.prisma.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  @Post('notifications/read-all') @HttpCode(204) @UseGuards(JwtAuthGuard)
  async readAll(@CurrentUser() u: AuthUser) {
    await this.prisma.notification.updateMany({ where: { userId: u.id, read: false }, data: { read: true } });
  }

  @Get('wishlist') @UseGuards(JwtAuthGuard)
  async wishlist(@CurrentUser() u: AuthUser) {
    const rows = await this.prisma.wishlistItem.findMany({ where: { userId: u.id }, include: { product: true } });
    return rows.map((r) => r.product);
  }

  @Put('wishlist/:productId') @HttpCode(204) @UseGuards(JwtAuthGuard)
  async addWish(@CurrentUser() u: AuthUser, @Param('productId', ParseIntPipe) productId: number) {
    if (!(await this.prisma.product.findUnique({ where: { id: productId } }))) throw new BadRequestException('Unknown product.');
    await this.prisma.wishlistItem.upsert({ where: { userId_productId: { userId: u.id, productId } }, create: { userId: u.id, productId }, update: {} });
  }

  @Delete('wishlist/:productId') @HttpCode(204) @UseGuards(JwtAuthGuard)
  async removeWish(@CurrentUser() u: AuthUser, @Param('productId', ParseIntPipe) productId: number) {
    await this.prisma.wishlistItem.deleteMany({ where: { userId: u.id, productId } });
  }

  @Get('reviews')
  reviews(@Query('kind') kind: string, @Query('target', ParseIntPipe) target: number) {
    return this.prisma.review.findMany({
      where: { kind, target }, orderBy: { createdAt: 'desc' }, take: 50,
      select: { id: true, rating: true, text: true, createdAt: true, user: { select: { name: true } } },
    });
  }

  @Post('reviews') @UseGuards(JwtAuthGuard)
  async addReview(@CurrentUser() u: AuthUser, @Body() dto: ReviewDto) {
    if (dto.kind === 'service') {
      if (!dto.bookingId) throw new BadRequestException('A completed booking is required.');
      const b = await this.prisma.booking.findFirst({ where: { id: dto.bookingId, userId: u.id, serviceId: dto.target, status: 'DONE' } });
      if (!b) throw new BadRequestException('You can only review a completed booking.');
      if (await this.prisma.review.findUnique({ where: { bookingId: b.id } })) throw new ConflictException('You already reviewed this booking.');
    } else {
      const bought = await this.prisma.orderItem.findFirst({ where: { productId: dto.target, order: { userId: u.id, status: { not: 'CANCELLED' } } } });
      if (!bought) throw new BadRequestException('You can only review products you ordered.');
    }
    return this.prisma.review.create({
      data: { userId: u.id, kind: dto.kind, target: dto.target, bookingId: dto.bookingId ?? null, rating: dto.rating, text: dto.text?.trim() ?? '' },
    });
  }

  @Post('contact') @HttpCode(201) @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async contact(@Body() dto: ContactDto) {
    await this.prisma.contactMessage.create({ data: dto });
    return { ok: true };
  }
}

@Module({ controllers: [AccountController] })
export class AccountModule {}
