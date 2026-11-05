import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BookingStatus, Prisma, Role } from '@prisma/client';
import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma.module';
import { AuthUser, CurrentUser, JwtAuthGuard, Roles } from '../common/auth';
import { SLOTS } from '../catalog/catalog.module';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS_AHEAD = 60;
const FLOW: BookingStatus[] = ['REQUESTED', 'CONFIRMED', 'ON_THE_WAY', 'IN_PROGRESS', 'DONE'];
const STATUS_TEXT: Record<BookingStatus, string> = {
  REQUESTED: 'Your booking was received.',
  CONFIRMED: 'Your booking is confirmed.',
  ON_THE_WAY: 'Your pro is on the way.',
  IN_PROGRESS: 'Work has started.',
  DONE: 'Your job is complete. How did it go?',
  CANCELLED: 'Your booking was cancelled.',
};

class CreateBookingDto {
  @IsInt() serviceId: number;
  @IsOptional() @IsInt() providerId?: number;
  @Matches(DAY) day: string;
  @IsIn(SLOTS) slot: string;
  @IsString() @MaxLength(80) name: string;
  @Matches(/^[0-9+\s-]{8,15}$/) phone: string;
  @IsString() @MaxLength(300) address: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

class UpdateBookingDto {
  @IsOptional() @Matches(DAY) day?: string;
  @IsOptional() @IsIn(SLOTS) slot?: string;
  @IsOptional() @IsIn(['CANCELLED']) status?: 'CANCELLED';
}

class SetStatusDto {
  @IsIn(Object.keys(STATUS_TEXT)) status: BookingStatus;
}

const isoToday = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const newId = () => 'FX' + randomBytes(4).toString('hex').toUpperCase();

@Injectable()
class BookingsService {
  constructor(private prisma: PrismaService) {}

  private assertWindow(day: string) {
    if (day <= isoToday() || day > addDays(MAX_DAYS_AHEAD)) throw new BadRequestException('Pick a day within the next 60 days.');
  }

  private async assertFree(tx: Prisma.TransactionClient, where: { providerId?: number | null; serviceId: number }, day: string, slot: string, ignoreId?: string) {
    const clash = await tx.booking.findFirst({
      where: { day, slot, status: { not: 'CANCELLED' }, id: ignoreId ? { not: ignoreId } : undefined, ...(where.providerId ? { providerId: where.providerId } : { serviceId: where.serviceId, providerId: null }) },
    });
    if (clash) throw new ConflictException('That slot was just taken. Please pick another.');
  }

  async create(user: AuthUser, dto: CreateBookingDto) {
    this.assertWindow(dto.day);
    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId }, include: { providers: { select: { id: true } } } });
    if (!service) throw new NotFoundException('Service not found.');
    if (dto.providerId && !service.providers.some((p) => p.id === dto.providerId)) throw new BadRequestException('That pro does not offer this service.');
    const id = newId();
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.assertFree(tx, { providerId: dto.providerId, serviceId: dto.serviceId }, dto.day, dto.slot);
        const booking = await tx.booking.create({
          data: { id, userId: user.id, serviceId: dto.serviceId, providerId: dto.providerId ?? null, day: dto.day, slot: dto.slot, name: dto.name, phone: dto.phone, address: dto.address, notes: dto.notes ?? '', estimate: service.fromPrice },
        });
        await tx.notification.create({ data: { userId: user.id, text: `Booking #${id} received. We'll confirm shortly.`, href: '/orders' } });
        return booking;
      }, { isolationLevel: 'Serializable' });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2002' || e.code === 'P2034')) {
        throw new ConflictException('That slot was just taken. Please pick another.');
      }
      throw e;
    }
  }

  list(user: AuthUser) {
    return this.prisma.booking.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, include: { service: true, provider: true, review: true } });
  }

  async get(user: AuthUser, id: string) {
    const b = await this.prisma.booking.findUnique({ where: { id }, include: { service: true, provider: true, review: true } });
    if (!b || (b.userId !== user.id && user.role === 'CUSTOMER')) throw new NotFoundException();
    return b;
  }

  async update(user: AuthUser, id: string, dto: UpdateBookingDto) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b || b.userId !== user.id) throw new NotFoundException();
    if (b.status === 'DONE' || b.status === 'CANCELLED') throw new BadRequestException('This booking can no longer be changed.');
    if (dto.status === 'CANCELLED') {
      return this.prisma.$transaction(async (tx) => {
        const out = await tx.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
        await tx.notification.create({ data: { userId: user.id, text: `#${id}: ${STATUS_TEXT.CANCELLED}`, href: '/orders' } });
        return out;
      });
    }
    const day = dto.day ?? b.day;
    const slot = dto.slot ?? b.slot;
    if (day === b.day && slot === b.slot) return b;
    if (b.status !== 'REQUESTED' && b.status !== 'CONFIRMED') throw new BadRequestException('Too late to reschedule.');
    this.assertWindow(day);
    return this.prisma.$transaction(async (tx) => {
      await this.assertFree(tx, { providerId: b.providerId, serviceId: b.serviceId }, day, slot, id);
      return tx.booking.update({ where: { id }, data: { day, slot } });
    }, { isolationLevel: 'Serializable' });
  }

  async setStatus(id: string, status: BookingStatus) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException();
    if (b.status === 'DONE' || b.status === 'CANCELLED') throw new BadRequestException('Booking is already closed.');
    if (status !== 'CANCELLED' && FLOW.indexOf(status) !== FLOW.indexOf(b.status) + 1) {
      throw new BadRequestException(`Status must move from ${b.status} to ${FLOW[FLOW.indexOf(b.status) + 1]}.`);
    }
    return this.prisma.$transaction(async (tx) => {
      const out = await tx.booking.update({ where: { id }, data: { status } });
      await tx.notification.create({ data: { userId: b.userId, text: `#${id}: ${STATUS_TEXT[status]}`, href: '/orders' } });
      return out;
    });
  }
}

@Controller('bookings')
@UseGuards(JwtAuthGuard)
class BookingsController {
  constructor(private svc: BookingsService) {}
  @Post() create(@CurrentUser() u: AuthUser, @Body() dto: CreateBookingDto) { return this.svc.create(u, dto); }
  @Get() list(@CurrentUser() u: AuthUser) { return this.svc.list(u); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.get(u, id); }
  @Patch(':id') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateBookingDto) { return this.svc.update(u, id, dto); }
  @Patch(':id/status') @Roles(Role.PROVIDER, Role.ADMIN)
  setStatus(@Param('id') id: string, @Body() dto: SetStatusDto) { return this.svc.setStatus(id, dto.status); }
}

@Module({ controllers: [BookingsController], providers: [BookingsService] })
export class BookingsModule {}
