import { Global, Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/* Neon's pooled endpoint is PgBouncer: Prisma needs pgbouncer=true there, and one connection per serverless instance. */
function datasourceUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || !/-pooler\./.test(url)) return undefined;
  const u = new URL(url);
  if (!u.searchParams.has('pgbouncer')) u.searchParams.set('pgbouncer', 'true');
  if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', '1');
  return u.toString();
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() { super({ datasourceUrl: datasourceUrl() }); }
  onModuleInit() { return this.$connect(); }
  onModuleDestroy() { return this.$disconnect(); }
}

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
