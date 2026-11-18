import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../../src/prisma/prisma.service';
import { getApp, getHttpServer } from './init';

export type TestRole = 'admin' | 'editor' | (string & {});

type TestUserOptions = {
   email?: string;
   password?: string;
   role?: TestRole;
   firstName?: string;
   lastName?: string;
};

export const TEST_PASSWORD = 'password123';

export const getRoleId = async (role: TestRole) => {
   const prisma = getApp().get(PrismaService);
   const { id } = await prisma.role.findUniqueOrThrow({ where: { name: role } });
   return id;
};

export const createTestUser = async ({
   email = 'admin@test.com',
   password = TEST_PASSWORD,
   role = 'admin',
   firstName = 'Test',
   lastName = 'User',
}: TestUserOptions = {}) => {
   const prisma = getApp().get(PrismaService);
   const hashedPassword = await bcrypt.hash(password, 10);

   return prisma.user.create({
      data: {
         email,
         firstName,
         lastName,
         role: { connect: { name: role } },
         acceptedInvitationAt: new Date(),
         auth: { create: { password: hashedPassword } },
      },
   });
};

export const loginAs = async (
   email = 'admin@test.com',
   password = TEST_PASSWORD,
): Promise<string> => {
   const response = await getHttpServer().post('/auth/login').send({ email, password });

   if (!response.body.accessToken) {
      throw new Error(`Login as ${email} failed with ${response.status}`);
   }

   return response.body.accessToken;
};

export const createAdminAndLogin = async (options: Omit<TestUserOptions, 'role'> = {}) => {
   const user = await createTestUser({ ...options, role: 'admin' });
   return loginAs(user.email, options.password);
};
