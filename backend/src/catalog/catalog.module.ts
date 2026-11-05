import { Controller, Get, Module, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common';
import { PrismaService } from '../common/prisma.module';

export const SLOTS = ['09:00', '11:00', '13:00', '15:00', '17:00'];

@Controller()
class CatalogController {
  constructor(private prisma: PrismaService) {}

  @Get('services')
  async services(@Query('category') category?: string) {
    const rows = await this.prisma.service.findMany({ where: category ? { category } : undefined, orderBy: { id: 'asc' } });
    const ratings = await this.prisma.review.groupBy({ by: ['target'], where: { kind: 'service' }, _avg: { rating: true }, _count: true });
    return rows.map((s) => {
      const r = ratings.find((x) => x.target === s.id);
      return { ...s, rating: r?._avg.rating ?? null, reviews: r?._count ?? 0 };
    });
  }

  @Get('services/:id')
  async service(@Param('id', ParseIntPipe) id: number) {
    const s = await this.prisma.service.findUnique({ where: { id }, include: { providers: true } });
    if (!s) throw new NotFoundException();
    return s;
  }

  @Get('services/:id/availability')
  async availability(@Param('id', ParseIntPipe) id: number, @Query('day') day: string, @Query('providerId') providerId?: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) return { day, slots: [] };
    const taken = await this.prisma.booking.findMany({
      where: { day, status: { not: 'CANCELLED' }, ...(providerId ? { providerId: Number(providerId) } : { serviceId: id }) },
      select: { slot: true },
    });
    const busy = new Set(taken.map((b) => b.slot));
    return { day, slots: SLOTS.map((slot) => ({ slot, available: !busy.has(slot) })) };
  }

  @Get('providers')
  providers(@Query('serviceId') serviceId?: string) {
    return this.prisma.provider.findMany({
      where: serviceId ? { services: { some: { id: Number(serviceId) } } } : undefined,
      include: { services: { select: { id: true } } },
    });
  }

  @Get('products')
  products(@Query('category') category?: string) {
    return this.prisma.product.findMany({ where: category ? { category } : undefined, orderBy: { id: 'desc' } });
  }

  @Get('products/:id')
  async product(@Param('id', ParseIntPipe) id: number) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException();
    return p;
  }
}

@Module({ controllers: [CatalogController] })
export class CatalogModule {}
