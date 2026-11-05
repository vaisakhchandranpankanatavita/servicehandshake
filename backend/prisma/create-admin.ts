/* Create or promote an admin: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD=... npm run admin:create */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/password';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ chars).');
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    console.log(`Promoted ${email} to ADMIN (password unchanged).`);
  } else {
    await prisma.user.create({ data: { email, name: process.env.ADMIN_NAME ?? 'Admin', phone: process.env.ADMIN_PHONE ?? '0000000000', passwordHash: await hashPassword(password), role: 'ADMIN' } });
    console.log(`Created admin ${email}.`);
  }
}

main().finally(() => prisma.$disconnect());
