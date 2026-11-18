import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import pg from 'pg';

import { PrismaClient } from './generated/prisma/client';

const MIN_PASSWORD_LENGTH = 12;

async function main() {
   const connectionString = process.env.DATABASE_URL;
   if (!connectionString) {
      throw new Error('DATABASE_URL is required.');
   }
   const password = process.env.SEED_ADMIN_PASSWORD;
   if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
         `SEED_ADMIN_PASSWORD is required (at least ${MIN_PASSWORD_LENGTH} characters).`,
      );
   }
   const target = new URL(connectionString);
   console.log(`Connecting to: ${target.host}${target.pathname}`);
   const pool = new pg.Pool({ connectionString });
   const adapter = new PrismaPg(pool);
   const prisma = new PrismaClient({ adapter });

   const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() || 'admin@example.com';

   const existing = await prisma.user.findUnique({ where: { email } });

   if (existing) {
      console.log(`User ${email} already exists, skipping.`);
      await prisma.$disconnect();
      await pool.end();
      return;
   }

   const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });
   const hashedPassword = await bcrypt.hash(password, 10);

   await prisma.user.create({
      data: {
         email,
         firstName: 'Marek',
         lastName: 'Marek',
         roleId: adminRole.id,
         acceptedInvitationAt: new Date(),
         auth: {
            create: { password: hashedPassword },
         },
      },
   });

   console.log(`Admin user created: ${email}`);
   await prisma.$disconnect();
   await pool.end();
}

main().catch((e) => {
   console.error(e);
   process.exit(1);
});
