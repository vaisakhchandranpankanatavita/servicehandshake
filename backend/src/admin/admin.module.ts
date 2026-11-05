import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, Injectable, Module, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BookingStatus, OrderStatus, Prisma, Role } from '@prisma/client';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PrismaService } from '../common/prisma.module';
import { AuthUser, CurrentUser, JwtAuthGuard, Roles } from '../common/auth';

const BOOKING_STATUSES = Object.values(BookingStatus);
const ORDER_STATUSES = Object.values(OrderStatus);
const ROLES = Object.values(Role);

class ServiceDto {
  @IsString() @MaxLength(80) name: string;
  @IsString() @MaxLength(300) description: string;
  @IsString() @MaxLength(60) category: string;
  @IsInt() @Min(0) fromPrice: number;
  @IsInt() @Min(5) duration: number;
  @IsOptional() @IsString() @MaxLength(300) terms?: string;
}
class PatchServiceDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsInt() @Min(0) fromPrice?: number;
  @IsOptional() @IsInt() @Min(5) duration?: number;
  @IsOptional() @IsString() @MaxLength(300) terms?: string;
}

class ProviderDto {
  @IsString() @MaxLength(80) name: string;
  @IsInt() @Min(0) @Max(60) years: number;
  @IsString() @MaxLength(60) response: string;
  @IsBoolean() verified: boolean;
  @IsArray() @IsInt({ each: true }) serviceIds: number[];
}
class PatchProviderDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsInt() @Min(0) @Max(60) years?: number;
  @IsOptional() @IsString() @MaxLength(60) response?: string;
  @IsOptional() @IsBoolean() verified?: boolean;
  @IsOptional() @IsArray() @IsInt({ each: true }) serviceIds?: number[];
}

class ProductDto {
  @IsString() @MaxLength(120) name: string;
  @IsString() @MaxLength(80) seller: string;
  @IsInt() @Min(0) price: number;
  @IsInt() @Min(0) oldPrice: number;
  @IsString() @MaxLength(60) category: string;
  @IsString() @MaxLength(300) img: string;
  @IsOptional() @IsString() @MaxLength(500) blurb?: string;
}
class PatchProductDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(80) seller?: string;
  @IsOptional() @IsInt() @Min(0) price?: number;
  @IsOptional() @IsInt() @Min(0) oldPrice?: number;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsString() @MaxLength(300) img?: string;
  @IsOptional() @IsString() @MaxLength(500) blurb?: string;
}

class CouponDto {
  @Matches(/^[A-Z0-9_-]{3,32}$/) code: string;
  @IsInt() @Min(1) @Max(100) percent: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
class PatchCouponDto {
  @IsOptional() @IsInt() @Min(1) @Max(100) percent?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

class BookingAssignDto {
  @IsOptional() @IsInt() providerId: number | null;
}
class BookingStatusDto { @IsIn(BOOKING_STATUSES) status: BookingStatus; }
class OrderStatusDto { @IsIn(ORDER_STATUSES) status: OrderStatus; }
class RoleDto { @IsIn(ROLES) role: Role; }

const page = (skip?: string, take = 50) => ({ skip: Math.max(0, Number(skip) || 0), take });

@Injectable()
class AdminService {
  constructor(private prisma: PrismaService) {}

  async stats() {
    const today = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - 30 * 864e5);
    const [users, bookings, orders, openBookings, todayBookings, byStatus, revenue, recentBookings, recentOrders, messages] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.booking.count(),
      this.prisma.order.count(),
      this.prisma.booking.count({ where: { status: { in: ['REQUESTED', 'CONFIRMED', 'ON_THE_WAY', 'IN_PROGRESS'] } } }),
      this.prisma.booking.count({ where: { day: today, status: { not: 'CANCELLED' } } }),
      this.prisma.booking.groupBy({ by: ['status'], _count: true }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: 'CANCELLED' } } }),
      this.prisma.booking.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.order.findMany({ where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } }, select: { createdAt: true, total: true } }),
      this.prisma.contactMessage.count(),
    ]);
    const days: Record<string, { day: string; bookings: number; revenue: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      days[d] = { day: d, bookings: 0, revenue: 0 };
    }
    for (const b of recentBookings) { const d = days[b.createdAt.toISOString().slice(0, 10)]; if (d) d.bookings++; }
    for (const o of recentOrders) { const d = days[o.createdAt.toISOString().slice(0, 10)]; if (d) d.revenue += o.total; }
    return {
      users, bookings, orders, openBookings, todayBookings, messages,
      productRevenue: revenue._sum.total ?? 0,
      bookingsByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      series: Object.values(days),
    };
  }

  /* Bookings */
  listBookings(q: { status?: string; q?: string; skip?: string }) {
    const where: Prisma.BookingWhereInput = {};
    if (q.status && BOOKING_STATUSES.includes(q.status as BookingStatus)) where.status = q.status as BookingStatus;
    if (q.q) where.OR = [{ id: { contains: q.q, mode: 'insensitive' } }, { name: { contains: q.q, mode: 'insensitive' } }, { phone: { contains: q.q } }];
    return this.prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' }, ...page(q.skip), include: { service: true, provider: true } });
  }

  async assign(id: string, providerId: number | null) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException();
    if (providerId !== null && providerId !== undefined) {
      const p = await this.prisma.provider.findFirst({ where: { id: providerId, services: { some: { id: b.serviceId } } } });
      if (!p) throw new BadRequestException('That pro does not offer this service.');
      const clash = await this.prisma.booking.findFirst({ where: { providerId, day: b.day, slot: b.slot, status: { not: 'CANCELLED' }, id: { not: id } } });
      if (clash) throw new ConflictException('That pro already has a job in this slot.');
    }
    return this.prisma.booking.update({ where: { id }, data: { providerId: providerId ?? null }, include: { service: true, provider: true } });
  }

  /* Orders */
  listOrders(q: { status?: string; q?: string; skip?: string }) {
    const where: Prisma.OrderWhereInput = {};
    if (q.status && ORDER_STATUSES.includes(q.status as OrderStatus)) where.status = q.status as OrderStatus;
    if (q.q) where.OR = [{ id: { contains: q.q, mode: 'insensitive' } }, { name: { contains: q.q, mode: 'insensitive' } }, { phone: { contains: q.q } }];
    return this.prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, ...page(q.skip), include: { items: { include: { product: { select: { name: true } } } } } });
  }

  async setOrderStatus(id: string, status: OrderStatus) {
    const o = await this.prisma.order.findUnique({ where: { id } });
    if (!o) throw new NotFoundException();
    if (o.status === 'DELIVERED' || o.status === 'CANCELLED') throw new BadRequestException('Order is already closed.');
    const text = { PLACED: 'is placed', SHIPPED: 'has shipped', DELIVERED: 'was delivered', CANCELLED: 'was cancelled' }[status];
    return this.prisma.$transaction(async (tx) => {
      const out = await tx.order.update({ where: { id }, data: { status } });
      await tx.notification.create({ data: { userId: o.userId, text: `Order #${id} ${text}.`, href: '/orders' } });
      return out;
    });
  }

  /* Users */
  listUsers(q: { q?: string; role?: string; skip?: string }) {
    const where: Prisma.UserWhereInput = {};
    if (q.role && ROLES.includes(q.role as Role)) where.role = q.role as Role;
    if (q.q) where.OR = [{ name: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }, { phone: { contains: q.q } }];
    return this.prisma.user.findMany({
      where, orderBy: { createdAt: 'desc' }, ...page(q.skip),
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true, _count: { select: { bookings: true, orders: true } } },
    });
  }

  async setRole(me: AuthUser, id: string, role: Role) {
    if (me.id === id) throw new BadRequestException('You cannot change your own role.');
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException();
    return this.prisma.user.update({ where: { id }, data: { role }, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } });
  }

  /* Catalog: ids are manually assigned integers, so next id = max + 1 */
  private async nextId(model: 'service' | 'provider' | 'product') {
    const r = await (this.prisma[model] as any).aggregate({ _max: { id: true } });
    return (r._max.id ?? 0) + 1;
  }

  createService(dto: ServiceDto) { return this.nextId('service').then((id) => this.prisma.service.create({ data: { id, ...dto, terms: dto.terms ?? '' } })); }
  async updateService(id: number, dto: PatchServiceDto) { await this.must(this.prisma.service.findUnique({ where: { id } })); return this.prisma.service.update({ where: { id }, data: dto }); }
  async deleteService(id: number) {
    if (await this.prisma.booking.count({ where: { serviceId: id } })) throw new ConflictException('This service has bookings and cannot be deleted.');
    await this.must(this.prisma.service.findUnique({ where: { id } }));
    await this.prisma.service.delete({ where: { id } });
  }

  listProviders() { return this.prisma.provider.findMany({ orderBy: { id: 'asc' }, include: { services: { select: { id: true, name: true } }, _count: { select: { bookings: true } } } }); }
  createProvider({ serviceIds, ...dto }: ProviderDto) {
    return this.nextId('provider').then((id) => this.prisma.provider.create({ data: { id, ...dto, services: { connect: serviceIds.map((s) => ({ id: s })) } } }));
  }
  async updateProvider(id: number, { serviceIds, ...dto }: PatchProviderDto) {
    await this.must(this.prisma.provider.findUnique({ where: { id } }));
    return this.prisma.provider.update({ where: { id }, data: { ...dto, ...(serviceIds ? { services: { set: serviceIds.map((s) => ({ id: s })) } } : {}) } });
  }
  async deleteProvider(id: number) {
    if (await this.prisma.booking.count({ where: { providerId: id, status: { in: ['REQUESTED', 'CONFIRMED', 'ON_THE_WAY', 'IN_PROGRESS'] } } })) {
      throw new ConflictException('This pro has open bookings. Reassign them first.');
    }
    await this.must(this.prisma.provider.findUnique({ where: { id } }));
    await this.prisma.booking.updateMany({ where: { providerId: id }, data: { providerId: null } });
    await this.prisma.provider.delete({ where: { id } });
  }

  createProduct(dto: ProductDto) { return this.nextId('product').then((id) => this.prisma.product.create({ data: { id, ...dto } })); }
  async updateProduct(id: number, dto: PatchProductDto) { await this.must(this.prisma.product.findUnique({ where: { id } })); return this.prisma.product.update({ where: { id }, data: dto }); }
  async deleteProduct(id: number) {
    if (await this.prisma.orderItem.count({ where: { productId: id } })) throw new ConflictException('This product appears in orders and cannot be deleted.');
    await this.must(this.prisma.product.findUnique({ where: { id } }));
    await this.prisma.product.delete({ where: { id } });
  }

  /* Coupons, reviews, messages */
  listCoupons() { return this.prisma.coupon.findMany({ orderBy: { code: 'asc' } }); }
  async createCoupon(dto: CouponDto) {
    if (await this.prisma.coupon.findUnique({ where: { code: dto.code } })) throw new ConflictException('That code already exists.');
    return this.prisma.coupon.create({ data: { code: dto.code, percent: dto.percent, active: dto.active ?? true } });
  }
  async updateCoupon(code: string, dto: PatchCouponDto) { await this.must(this.prisma.coupon.findUnique({ where: { code } })); return this.prisma.coupon.update({ where: { code }, data: dto }); }
  async deleteCoupon(code: string) { await this.must(this.prisma.coupon.findUnique({ where: { code } })); await this.prisma.coupon.delete({ where: { code } }); }

  listReviews(skip?: string) { return this.prisma.review.findMany({ orderBy: { createdAt: 'desc' }, ...page(skip), include: { user: { select: { name: true, email: true } } } }); }
  async deleteReview(id: string) { await this.must(this.prisma.review.findUnique({ where: { id } })); await this.prisma.review.delete({ where: { id } }); }

  listMessages(skip?: string) { return this.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, ...page(skip) }); }
  async deleteMessage(id: string) { await this.must(this.prisma.contactMessage.findUnique({ where: { id } })); await this.prisma.contactMessage.delete({ where: { id } }); }

  private async must<T>(p: Promise<T | null>) { const r = await p; if (!r) throw new NotFoundException(); return r; }
}

@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
class AdminController {
  constructor(private svc: AdminService) {}

  @Get('stats') stats() { return this.svc.stats(); }

  @Get('bookings') bookings(@Query() q: any) { return this.svc.listBookings(q); }
  @Patch('bookings/:id/provider') assign(@Param('id') id: string, @Body() dto: BookingAssignDto) { return this.svc.assign(id, dto.providerId ?? null); }

  @Get('orders') orders(@Query() q: any) { return this.svc.listOrders(q); }
  @Patch('orders/:id/status') orderStatus(@Param('id') id: string, @Body() dto: OrderStatusDto) { return this.svc.setOrderStatus(id, dto.status); }

  @Get('users') users(@Query() q: any) { return this.svc.listUsers(q); }
  @Patch('users/:id/role') role(@CurrentUser() me: AuthUser, @Param('id') id: string, @Body() dto: RoleDto) { return this.svc.setRole(me, id, dto.role); }

  @Post('services') createService(@Body() dto: ServiceDto) { return this.svc.createService(dto); }
  @Patch('services/:id') updateService(@Param('id', ParseIntPipe) id: number, @Body() dto: PatchServiceDto) { return this.svc.updateService(id, dto); }
  @Delete('services/:id') @HttpCode(204) deleteService(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteService(id); }

  @Get('providers') providers() { return this.svc.listProviders(); }
  @Post('providers') createProvider(@Body() dto: ProviderDto) { return this.svc.createProvider(dto); }
  @Patch('providers/:id') updateProvider(@Param('id', ParseIntPipe) id: number, @Body() dto: PatchProviderDto) { return this.svc.updateProvider(id, dto); }
  @Delete('providers/:id') @HttpCode(204) deleteProvider(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteProvider(id); }

  @Post('products') createProduct(@Body() dto: ProductDto) { return this.svc.createProduct(dto); }
  @Patch('products/:id') updateProduct(@Param('id', ParseIntPipe) id: number, @Body() dto: PatchProductDto) { return this.svc.updateProduct(id, dto); }
  @Delete('products/:id') @HttpCode(204) deleteProduct(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteProduct(id); }

  @Get('coupons') coupons() { return this.svc.listCoupons(); }
  @Post('coupons') createCoupon(@Body() dto: CouponDto) { return this.svc.createCoupon(dto); }
  @Patch('coupons/:code') updateCoupon(@Param('code') code: string, @Body() dto: PatchCouponDto) { return this.svc.updateCoupon(code, dto); }
  @Delete('coupons/:code') @HttpCode(204) deleteCoupon(@Param('code') code: string) { return this.svc.deleteCoupon(code); }

  @Get('reviews') reviews(@Query('skip') skip?: string) { return this.svc.listReviews(skip); }
  @Delete('reviews/:id') @HttpCode(204) deleteReview(@Param('id') id: string) { return this.svc.deleteReview(id); }

  @Get('messages') messages(@Query('skip') skip?: string) { return this.svc.listMessages(skip); }
  @Delete('messages/:id') @HttpCode(204) deleteMessage(@Param('id') id: string) { return this.svc.deleteMessage(id); }
}

@Module({ controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
