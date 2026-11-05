import { BadRequestException, Body, Controller, Get, Injectable, Module, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma.module';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/auth';

class ItemDto {
  @IsInt() productId: number;
  @IsInt() @Min(1) @Max(20) qty: number;
}

class PlaceOrderDto {
  @IsString() @MaxLength(80) name: string;
  @Matches(/^[0-9+\s-]{8,15}$/) phone: string;
  @IsString() @MaxLength(300) address: string;
  @IsString() @MaxLength(80) city: string;
  @Matches(/^[0-9]{6}$/) pin: string;
  @IsOptional() @IsString() @MaxLength(32) coupon?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ItemDto) items: ItemDto[];
}

@Injectable()
class OrdersService {
  constructor(private prisma: PrismaService) {}

  async place(user: AuthUser, dto: PlaceOrderDto) {
    const qty = new Map<number, number>();
    for (const i of dto.items) qty.set(i.productId, (qty.get(i.productId) ?? 0) + i.qty);
    const products = await this.prisma.product.findMany({ where: { id: { in: [...qty.keys()] } } });
    if (products.length !== qty.size) throw new BadRequestException('One of the items is no longer available.');

    const subtotal = products.reduce((n, p) => n + p.price * qty.get(p.id)!, 0);
    let discount = 0;
    let coupon: string | null = null;
    if (dto.coupon) {
      const c = await this.prisma.coupon.findUnique({ where: { code: dto.coupon.trim().toUpperCase() } });
      if (!c?.active) throw new BadRequestException('That code isn’t valid.');
      coupon = c.code;
      discount = Math.round(subtotal * (c.percent / 100));
    }
    const id = 'OD' + randomBytes(4).toString('hex').toUpperCase();
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          id, userId: user.id, name: dto.name, phone: dto.phone, address: dto.address, city: dto.city, pin: dto.pin,
          coupon, subtotal, discount, total: subtotal - discount,
          items: { create: products.map((p) => ({ productId: p.id, qty: qty.get(p.id)!, unitPrice: p.price })) },
        },
        include: { items: true },
      });
      await tx.notification.create({ data: { userId: user.id, text: `Order #${id} placed. Pay on delivery.`, href: '/orders' } });
      return order;
    });
  }

  list(user: AuthUser) {
    return this.prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, include: { items: { include: { product: true } } } });
  }

  async get(user: AuthUser, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, userId: user.id }, include: { items: { include: { product: true } } } });
    if (!o) throw new NotFoundException();
    return o;
  }
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
class OrdersController {
  constructor(private svc: OrdersService) {}
  @Post() place(@CurrentUser() u: AuthUser, @Body() dto: PlaceOrderDto) { return this.svc.place(u, dto); }
  @Get() list(@CurrentUser() u: AuthUser) { return this.svc.list(u); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.get(u, id); }
}

@Module({ controllers: [OrdersController], providers: [OrdersService] })
export class OrdersModule {}
